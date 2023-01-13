import { sleep } from "./utils";

export type QueueOptions = {
    sleepTimeout: number;
    errorCallback: (error: any) => void | Promise<void>;
};

export type QueueCallback<TMessage> = (
  name: string,
  params: TMessage,
  state: { del: boolean }
) => void | Promise<void>;

export type Message<TParams> = {
  name: string;
  params: TParams;
}

export type SentMessage<TParams> = Message<TParams> & {
  params: { createdAt: Date };
};


export abstract class Queue<TReceivedMessage, TMessage extends object = object> {
  forever: boolean;
  options: QueueOptions;

  constructor(opts: Partial<QueueOptions>) {
    this.forever = true;
    this.options = Object.assign(
      {
        sleepTimeout: 5000,
        errorCallback: (e) => console.error(e)
      },
      opts
    );
  }

  abstract readMessages(): TReceivedMessage[] | Promise<TReceivedMessage[] | undefined> | undefined;
  abstract processMessage(message: TReceivedMessage,callback?: QueueCallback<TMessage>): void | Promise<void>;
  abstract sendMessage(body: SentMessage<TMessage>): void | Promise<void>

  async start(
    callback: QueueCallback<TMessage>,
    canThrow = false
  ) {
    while (this.forever) {
      try {
        const messages = await this.readMessages();

        if (messages === undefined) continue;

        for (const message of messages) {
            await this.processMessage(message, callback);
        }
      } catch (error) {
        if (canThrow) throw error;
        await this.options.errorCallback(error);
        await sleep(this.options.sleepTimeout);
      }
    }
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

  send(body: Message<TMessage>) {
    const updatedBody = {
        ...body,
        params: {
            ...body.params,
            createdAt: new Date()
        }
    }
    this.sendMessage(updatedBody);
  }
}
