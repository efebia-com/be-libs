# @efebia/pino-mongodb

Pino transport that writes logs to MongoDB, with support for batched bulk inserts.

## Install

```bash
npm install @efebia/pino-mongodb
```

## Usage

### Batched mode (default)

Logs are queued and flushed to MongoDB in bulk at a configurable interval or when the batch size is reached.

```ts
import pino from 'pino';

const logger = pino({
  transport: {
    target: '@efebia/pino-mongodb',
    options: {
      uri: 'mongodb://localhost:27017/mydb',
      collection: 'logs',
      queueOptions: {
        interval: 2000,   // flush every 2 seconds
        maxMessages: 50,  // or when 50 messages have accumulated
      },
    },
  },
});

logger.info('Hello MongoDB');
```

### Immediate mode

Each log entry is inserted individually as it arrives.

```ts
const logger = pino({
  transport: {
    target: '@efebia/pino-mongodb',
    options: {
      uri: 'mongodb://localhost:27017/mydb',
      collection: 'logs',
      immediate: true,
    },
  },
});
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `uri` | `string` | `'mongodb://localhost:27017/logs'` | MongoDB connection URI |
| `database` | `string` | _(from URI)_ | Database name (overrides the one in the URI) |
| `collection` | `string` | `'logs'` | Collection name |
| `immediate` | `true` | — | Enable immediate (non-batched) mode |
| `clientOptions` | `MongoClientOptions` | — | Options forwarded to the `MongoClient` constructor |
| `onError` | `(messages, error) => void` | — | Called when a bulk write fails (batched mode only) |
| `queueOptions.interval` | `number` | `1000` | Flush interval in milliseconds (batched mode) |
| `queueOptions.maxMessages` | `number` | `10` | Flush when this many messages have queued (batched mode) |
| `queueOptions.cache` | `unknown[]` | `[]` | Initial cache (rarely needed) |

`immediate` and `queueOptions` are mutually exclusive — use one or the other.

## License

MIT
