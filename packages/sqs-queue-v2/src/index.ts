import { Queue as BaseQueue, Message, QueueOptions } from "@efebia/queue";
import AWS from "aws-sdk";
const packageName = "@efebia/sqs-queue-v2";

export type QueueConstructorOptions = {
  client: AWS.SQS;
  receiveOptions: AWS.SQS.ReceiveMessageRequest;
  canRead?: () => boolean | Promise<boolean>;
  logger?: (obj: unknown, msg?: string) => void;
} & Partial<QueueOptions>;

export type QueueCallback<TMessage extends object> = (
  name: string,
  params: TMessage,
  state: { del: boolean }
) => void | Promise<void>;

export class Queue<TMessage extends object> extends BaseQueue<
  AWS.SQS.Message,
  TMessage
> {
  receiveOptions: AWS.SQS.ReceiveMessageRequest;
  client: AWS.SQS;
  canRead: () => boolean | Promise<boolean>;
  logger: NonNullable<QueueConstructorOptions['logger']>;

  constructor({
    receiveOptions,
    client,
    canRead,
    logger,
    ...otherOptions
  }: QueueConstructorOptions) {
    super(otherOptions);
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
    this.receiveOptions = options;
    this.client = client;
    this.canRead = canRead ?? (() => Promise.resolve(true));
    this.logger = logger || (() => {});
  }

  async readMessages() {
    const readable = await this.canRead();
    if (!readable) return undefined;
    
    const { Messages } = await this.client
      .receiveMessage(this.receiveOptions)
      .promise();
    return Messages;
  }

  async processMessage<TMessage extends object>(
    message: AWS.SQS.Message,
    callback?: QueueCallback<TMessage>
  ) {
    const { ReceiptHandle, Body: stringifiedBody } = message;

    if (!ReceiptHandle) {
      this.logger({ message }, `${packageName}: NO_RECEIPT_HANDLE`);
      throw new Error(`${packageName}: NO_RECEIPT_HANDLE`);
    }

    if (!stringifiedBody) {
      this.logger({ message, receipt: ReceiptHandle }, `${packageName}: EMPTY_BODY`);
      await this.delete(ReceiptHandle);
      throw new Error(`${packageName}: EMPTY_BODY`);
    }

    const parsedBody = JSON.parse(stringifiedBody);
    if (Object.keys(parsedBody).length == 0) {
      this.logger({ message, body: stringifiedBody, receipt: ReceiptHandle, parsed: parsedBody }, `${packageName}: BODY_NO_KEYS`);
      await this.delete(ReceiptHandle);
      return;
    }

    const { name, params } = parsedBody;

    const state = { del: true };
    if (!callback) return;

    await callback(name, params, state);
    if (state.del) {
      await this.delete(ReceiptHandle);
    }
  }

  delete(ReceiptHandle: string) {
    return this.client
      .deleteMessage({ QueueUrl: this.receiveOptions.QueueUrl, ReceiptHandle })
      .promise();
  }

  async sendMessage(body: Message<TMessage>) {
    await this.client
      .sendMessage({
        QueueUrl: this.receiveOptions.QueueUrl,
        MessageBody: JSON.stringify(body),
      })
      .promise();
  }
}
