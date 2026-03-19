# @efebia/sqs-queue-v3

AWS SQS queue consumer built on `@efebia/queue`, using the modern modular AWS SDK v3 (`@aws-sdk/client-sqs`).

## Install

```bash
npm install @efebia/sqs-queue-v3
```

## Usage

```ts
import { SQSClient } from '@aws-sdk/client-sqs';
import { Queue } from '@efebia/sqs-queue-v3';

type MyMessage = { userId: string; action: string };

const client = new SQSClient({ region: 'eu-west-1' });

const queue = new Queue<MyMessage>({
  client,
  receiveOptions: {
    QueueUrl: 'https://sqs.eu-west-1.amazonaws.com/123456789/my-queue',
    WaitTimeSeconds: 20,
    MaxNumberOfMessages: 1,
  },
  sleepTimeout: 5000,
  logger: (obj, msg) => console.log(msg, obj),
});

// Start consuming
queue.start(async (name, params, state) => {
  console.log(`Received "${name}":`, params);
  // set state.del = false to leave the message in the queue
});

// Send a message
await queue.send({ name: 'doWork', params: { userId: '42', action: 'sync' } });

// Stop the loop
queue.stop();
```

## API

### `new Queue<TMessage>(options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `client` | `SQSClient` | — | **Required.** Configured `@aws-sdk/client-sqs` client instance |
| `receiveOptions` | `ReceiveMessageCommandInput` | — | **Required.** Passed to `ReceiveMessageCommand`. Must include `QueueUrl`. |
| `receiveOptions.WaitTimeSeconds` | `number` | `20` | Long-polling wait time |
| `receiveOptions.MaxNumberOfMessages` | `number` | `1` | Max messages per receive call |
| `canRead` | `() => boolean \| Promise<boolean>` | `() => true` | Called before each receive; returning `false` skips the iteration |
| `logger` | `(obj, msg?) => void` | no-op | Logging function for errors and warnings |
| `sleepTimeout` | `number` | `5000` | Ms to wait after an error before retrying |
| `errorCallback` | `(error) => void` | `console.error` | Called on uncaught errors in the loop |

### Inherited from `@efebia/queue`

- `start(callback, canThrow?)` — starts the polling loop
- `stop()` — signals the loop to stop
- `resume(callback)` — restarts a stopped queue
- `isRunning()` — returns `true` if the loop is active
- `send(message)` — sends a message (adds `createdAt` automatically)

**Callback signature:**

```ts
(name: string, params: TMessage, state: { del: boolean }) => void | Promise<void>
```

After the callback resolves, the message is deleted from SQS unless `state.del` is set to `false`.

## License

MIT
