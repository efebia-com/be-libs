# @efebia/env-loader

Type-safe environment variable loading and validation from YAML files or JSON environment variables.

## Install

```bash
npm install @efebia/env-loader
```

## Usage

### Declaring your schema

Extend the `EnvSchema` interface via module augmentation to get type-safe key access:

```ts
// env.d.ts
import '@efebia/env-loader';

declare module '@efebia/env-loader' {
  interface EnvSchema {
    DB_HOST: string;
    DB_PORT: number;
    API_KEY: string;
  }
}
```

### Loading from a YAML file

```ts
import { EnvironmentClient, yamlFileKeyLoader } from '@efebia/env-loader';
import { readFileSync } from 'node:fs';

const yamlContent = readFileSync('./config.yaml', 'utf-8');

const env = new EnvironmentClient({
  syncKeyLoaders: [yamlFileKeyLoader(yamlContent)],
});

await env.loadKeys();

const dbHost = env.getEnv('DB_HOST'); // string
```

### Loading from a JSON environment variable

```ts
import { EnvironmentClient, jsonProcessEnvKeyLoader } from '@efebia/env-loader';

// Expects process.env.APP_CONFIG to contain a JSON string
const env = new EnvironmentClient({
  asyncKeyLoaders: [jsonProcessEnvKeyLoader('APP_CONFIG')],
});

await env.loadKeys();
```

### Using `process.env` as storage

`ProcessEnvStorageEnvironmentClient` reads directly from `process.env`, auto-parsing numbers, booleans, and JSON strings:

```ts
import { ProcessEnvStorageEnvironmentClient } from '@efebia/env-loader';

const env = new ProcessEnvStorageEnvironmentClient();

const port = env.getEnv('DB_PORT'); // auto-parsed to number
```

## API

### `EnvironmentClient`

```ts
new EnvironmentClient(opts?: Partial<EnvironmentClientOptions>)
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `storage` | `object` | `{}` | Object used as the key/value store |
| `syncKeyLoaders` | `(() => Record<string, unknown>)[]` | `[]` | Loaders executed synchronously at construction |
| `asyncKeyLoaders` | `(() => Promise<Record<string, unknown>>)[]` | `[]` | Loaders executed when `loadKeys()` is called |
| `loadSyncKeysAtStartup` | `boolean` | `true` | Run sync loaders in the constructor |

**Methods:**

- `loadKeys()` — runs all async and sync loaders
- `getEnv(...keys)` — returns value(s) for the given key(s); throws if a key is missing
- `getOptionalEnv(...keys)` — like `getEnv` but silently skips missing keys
- `setEnv(key, value)` — sets a key in the storage

Keys accessed via `getEnv` / `getOptionalEnv` are also available in camelCase (e.g. `DB_HOST` → `dbHost`).

### `ProcessEnvStorageEnvironmentClient`

Extends `EnvironmentClient` with `process.env` as storage. Automatically parses string values to their native types (number, boolean, JSON object/array).

### `yamlFileKeyLoader(yamlContent: string)`

Returns a sync key loader that parses a YAML string.

### `jsonProcessEnvKeyLoader(key: string)`

Returns an async key loader that reads and JSON-parses `process.env[key]`.

### `EnvSchema`

Empty interface — extend it via module augmentation to declare your environment keys and their types.

## License

MIT
