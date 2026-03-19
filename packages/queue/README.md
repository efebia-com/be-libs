# @efebia/queue

Abstract base class for building message queue consumers, with a built-in in-memory implementation.

## Install

```bash
npm install @efebia/queue
```

## Usage

### Extending `Queue`

Implement the three abstract methods to connect any queue backend:

```ts
import { Queue, QueueCallback, SentMessage } from '@efebia/queue';

type MyMessage = { userId: string; action: string };

class MyQueue extends Queue<RawSQSMessage, MyMessage> {
  async readMessages() {
    // fetch messages from your backend, return [] or undefined if none
    return await fetchFromBackend();
  }

  async processMessage(raw: RawSQSMessage, callback?: QueueCallback<MyMessage>) {
    const parsed = parse(raw);
    const state = { del: true };
    await callback?.(parsed.name, parsed.params, state);
    if (state.del) await deleteFromBackend(raw);
  }

  async sendMessage(body: SentMessage<MyMessage>) {
    await sendToBackend(JSON.stringify(body));
  }
}

const queue = new MyQueue({ sleepTimeout: 3000 });

// Start the polling loop
queue.start(async (name, params, state) => {
  console.log(name, params);
  // set state.del = false to prevent deletion
});
```

### Using `MemoryQueue`

A ready-to-use in-memory queue for testing or simple use cases:

```ts
import { MemoryQueue } from '@efebia/queue';

type Job = { task: string };

const queue = new MemoryQueue<Job>({});

// Send a message
await queue.send({ name: 'doWork', params: { task: 'hello' } });

// Start consuming
queue.start(async (name, params, state) => {
  console.log(`Processing ${name}:`, params);
});

// Stop the loop
queue.stop();
```

## API

### `Queue<TReceivedMessage, TMessage>` (abstract)

**Constructor options (`QueueOptions`):**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `sleepTimeout` | `number` | `5000` | Milliseconds to wait after an error before retrying |
| `errorCallback` | `(error) => void` | `console.error` | Called on uncaught errors in the polling loop |

**Abstract methods to implement:**

| Method | Description |
|--------|-------------|
| `readMessages()` | Fetch the next batch of messages. Return `undefined` to skip the current iteration. |
| `processMessage(message, callback?)` | Process a single message and invoke the callback. |
| `sendMessage(body)` | Deliver a message to the underlying queue backend. |

**Methods:**

- `start(callback, canThrow?)` — begins the infinite polling loop
- `stop()` — signals the loop to exit after the current iteration
- `resume(callback)` — restarts a stopped queue
- `isRunning()` — returns `true` if the loop is active
- `send(message)` — sends a message, automatically adding `createdAt` to params

**Callback signature:**

```ts
(name: string, params: TMessage, state: { del: boolean }) => void | Promise<void>
```

Set `state.del = false` inside the callback to prevent the message from being deleted after processing.

### `MemoryQueue<TMessage>`

Extends `Queue` with an in-memory message array. Useful for tests and local development.

### Types

- `Message<TParams>` — `{ name: string; params: TParams }`
- `SentMessage<TParams>` — `Message` with `params.createdAt: Date` added

## License

MIT
