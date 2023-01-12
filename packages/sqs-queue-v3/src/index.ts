import { DeleteMessageCommand, Message, ReceiveMessageCommand, ReceiveMessageCommandInput, SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import EventEmitter from "events";
const packageName = '@efebia/sqs-queue-v3';

export type QueueOptions = {
    sleepTimeout: number;
};

export type QueueConstructorOptions = {
    client: SQSClient;
    receiveOptions: ReceiveMessageCommandInput;
} & Partial<QueueOptions>;

export type QueueCallback<TMessage extends object> = (
  name: string,
  params: TMessage,
  state: { del: boolean }
) => void | Promise<void>;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))


export class Queue extends EventEmitter {
  receiveOptions: QueueConstructorOptions['receiveOptions'];
  client: QueueConstructorOptions['client'];
  forever: boolean;
  options: Omit<QueueOptions, "client" | "receiveOptions">;

  constructor({ receiveOptions, client, ...otherOptions }: QueueConstructorOptions) {
    super();
    const options: ReceiveMessageCommandInput = Object.assign<
      Partial<ReceiveMessageCommandInput>,
      ReceiveMessageCommandInput
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
      },
      otherOptions
    );
  }

  async start<TMessage extends object>(
    callback: QueueCallback<TMessage>,
    errorCallback: (error: any) => void | Promise<void>,
    canThrow = false
  ) {
    while (this.forever) {
      try {
        const { Messages } = await this.client
          .send(new ReceiveMessageCommand(this.receiveOptions));
        if (Messages == undefined) continue;

        for (const message of Messages) {
            await this.processMessage(message, callback);
        }
      } catch (error) {
        if (canThrow) throw error;
        await errorCallback(error);
        await sleep(this.options.sleepTimeout);
      }
    }
  }

  async processMessage<TMessage extends object>(
    message: Message,
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
      .send(new DeleteMessageCommand({
        QueueUrl: this.receiveOptions.QueueUrl,
        ReceiptHandle
      }));
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
    return this.client.send(new SendMessageCommand({ QueueUrl: this.receiveOptions.QueueUrl, MessageBody }));
  }
}
