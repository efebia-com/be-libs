import AWS from "aws-sdk";
import EventEmitter from "events";
const packageName = '@efebia/sqs-queue-v2';


export type QueueOptions = {
    sleepTimeout: number;
    errorCallback: (error: any) => void | Promise<void>;
};

export type QueueConstructorOptions = {
    client: AWS.SQS;
    receiveOptions: AWS.SQS.ReceiveMessageRequest;
} & Partial<QueueOptions>;

export type QueueCallback<TMessage extends object> = (
  name: string,
  params: TMessage,
  state: { del: boolean }
) => void | Promise<void>;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))


export class Queue extends EventEmitter {
  receiveOptions: AWS.SQS.ReceiveMessageRequest;
  client: AWS.SQS;
  forever: boolean;
  options: Omit<QueueOptions, "client" | "receiveOptions">;

  constructor({ receiveOptions, client, ...otherOptions }: QueueConstructorOptions) {
    super();
    const options: AWS.SQS.ReceiveMessageRequest = Object.assign<
      Partial<AWS.SQS.ReceiveMessageRequest>,
      AWS.SQS.ReceiveMessageRequest
    >(
      {
        WaitTimeSeconds: 20,
        MaxNumberOfMessages: 1,
      },
      receiveOptions
    );
    this.forever = true;
    this.receiveOptions = options;
    this.client = client;
    this.options = Object.assign(
      {
        sleepTimeout: 5000,
        errorCallback: (e) => console.error(e) 
      },
      otherOptions
    );
  }

  async start<TMessage extends object>(
    callback: QueueCallback<TMessage>,
    canThrow = false
  ) {
    while (this.forever) {
      try {
        const { Messages } = await this.client
          .receiveMessage(this.receiveOptions)
          .promise();
        if (Messages == undefined) continue;

        for (const message of Messages) {
            await this.processMessage(message, callback);
        }
      } catch (error) {
        if (canThrow) throw error;
        await this.options.errorCallback(error);
        await sleep(this.options.sleepTimeout);
      }
    }
  }

  async processMessage<TMessage extends object>(
    message: AWS.SQS.Message,
    callback?: QueueCallback<TMessage>
  ) {
    const { ReceiptHandle, Body: stringifiedBody } = message;

    if (!ReceiptHandle) {
        throw new Error(`${packageName}: NO_RECEIPT_HANDLE`);
    }

    if (!stringifiedBody) {
        await this.delete(ReceiptHandle);
        throw new Error(`${packageName}: EMPTY_BODY`);
    }

    const parsedBody = JSON.parse(stringifiedBody);
    if (Object.keys(parsedBody).length == 0) {
      await this.delete(ReceiptHandle);
      return;
    }

    const { name, params } = parsedBody;

    const state = { del: true };
    if (callback) {
      await callback(name, params, state);
      if (state.del) {
        await this.delete(ReceiptHandle);
      }
    } else {
      this.emit(name, params, ReceiptHandle);
    }
  }

  delete(ReceiptHandle: string) {
    return this.client
      .deleteMessage({ QueueUrl: this.receiveOptions.QueueUrl, ReceiptHandle })
      .promise();
  }

  stop() {
    this.forever = false;
  }

  resume(...args: Parameters<typeof this.start>) {
    this.forever = true;
    return this.start(...args);
  }

  isRunning() {
    return this.forever;
  }

  send(body: { name: string; params: object }) {
    const updatedBody = {
        ...body,
        params: {
            ...body.params,
            createdAt: new Date()
        }
    }
    const MessageBody = JSON.stringify(updatedBody);
    return this.client.sendMessage({ QueueUrl: this.receiveOptions.QueueUrl, MessageBody }).promise();
  }
}
