import {
  DeleteMessageCommand,
  Message,
  ReceiveMessageCommand,
  ReceiveMessageCommandInput,
  SQSClient,
  SendMessageCommand,
} from "@aws-sdk/client-sqs";
import { Queue as BaseQueue, QueueOptions, SentMessage } from "@efebia/queue";
const packageName = "@efebia/sqs-queue-v3";

export type QueueConstructorOptions = {
  client: SQSClient;
  receiveOptions: ReceiveMessageCommandInput;
  canRead?: () => boolean | Promise<boolean>;
  logger?: (obj: unknown, msg?: string) => void;
} & Partial<QueueOptions>;

export type QueueCallback<TMessage extends object> = (
  name: string,
  params: TMessage,
  state: { del: boolean }
) => void | Promise<void>;

export class Queue<TMessage extends object> extends BaseQueue<
  Message,
  TMessage
> {
  receiveOptions: QueueConstructorOptions["receiveOptions"];
  client: QueueConstructorOptions["client"];
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
    this.receiveOptions = options;
    this.client = client;
    this.canRead = canRead ?? (() => Promise.resolve(true));
    this.logger = logger || (() => {});
  }

  async readMessages() {
    const readable = await this.canRead();
    if (!readable) return undefined;

    const { Messages } = await this.client.send(
      new ReceiveMessageCommand(this.receiveOptions)
    );
    return Messages;
  }

  async sendMessage(body: SentMessage<TMessage>) {
    await this.client.send(
      new SendMessageCommand({
        QueueUrl: this.receiveOptions.QueueUrl,
        MessageBody: JSON.stringify(body),
      })
    );
  }

  async processMessage<TMessage extends object>(
    message: Message,
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
    return this.client.send(
      new DeleteMessageCommand({
        QueueUrl: this.receiveOptions.QueueUrl,
        ReceiptHandle,
      })
    );
  }
}
