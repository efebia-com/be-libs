import { Queue, QueueCallback, QueueOptions, SentMessage } from "./queue";
import { sleep } from "./utils";

export class MemoryQueue<TMessage extends object> extends Queue<
  SentMessage<TMessage>,
  TMessage
> {
  messages: SentMessage<TMessage>[];

  constructor(opts: Partial<QueueOptions>) {
    super(opts);
    this.messages = [];
  }

  async readMessages() {
    if (this.messages.length === 0) {
      await sleep(100);
      return undefined;
    }
    return [this.messages.at(0)!];
  }

  async processMessage(
    message: SentMessage<TMessage>,
    callback?: QueueCallback<TMessage> | undefined
  ) {
    const { name, params } = message;
    if (!callback) return;
    const state = { del: true };
    await callback(name, params, state);
    if (state.del) {
      this.messages.shift();
    }
  }

  sendMessage(body: SentMessage<TMessage>) {
    this.messages.push(body);
  }
}
