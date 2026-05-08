# @efebia/fastify-auto-import

Fastify plugin that automatically discovers and registers route plugins from a directory.

## Install

```bash
npm install @efebia/fastify-auto-import
```

## Usage

```ts
import Fastify from 'fastify';
import autoImport from '@efebia/fastify-auto-import';

const fastify = Fastify();

await fastify.register(autoImport, {
  // Required: the starting directory (use import.meta.url in ESM)
  startingDirectory: import.meta.url,
  // Directory to scan, relative to startingDirectory (default: 'src/plugins')
  directory: 'src/plugins',
  // File name to import from each subdirectory (default: 'routes')
  routeFile: 'routes',
  // Subdirectories to skip (default: [])
  excludedDirectories: ['_shared'],
});
```

Given the following structure:

```
src/plugins/
  users/
    routes.ts
  orders/
    routes.ts
  _shared/
    utils.ts   ← skipped
```

The plugin will register `users/routes.ts` and `orders/routes.ts` as Fastify plugins.

Each route file must export a default Fastify plugin:

```ts
// src/plugins/users/routes.ts
import type { FastifyPluginAsync } from 'fastify';

const plugin: FastifyPluginAsync = async (fastify) => {
  fastify.get('/users', async () => ({ users: [] }));
};

export default plugin;
```

## API

### `autoImport` (default export)

A `fastify-plugin` compatible plugin. Register it with `fastify.register()`.

**Options** (`Globber`):

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `startingDirectory` | `string` | — | **Required.** Base directory. Pass `import.meta.url` (ESM) or `__dirname` (CJS). |
| `directory` | `string` | `'src/plugins'` | Directory to scan for route subdirectories, relative to `startingDirectory`. |
| `routeFile` | `string` | `'routes'` | File name (without extension) to import from each subdirectory. |
| `excludedDirectories` | `string[]` | `[]` | Subdirectory names to skip. |
| `recursive` | `boolean` | `false` | Scan nested subdirectories for route files, not just direct children. |
| `log` | `pino.BaseLogger` | Fastify logger | Logger instance for import errors. |

## Recursive mode

By default the plugin only looks at **direct subdirectories** of `directory`. Set `recursive: true` to walk the entire tree and register every subdirectory that contains a route file, at any depth.

```ts
await fastify.register(autoImport, {
  startingDirectory: import.meta.url,
  directory: 'src/plugins',
  recursive: true,
});
```

Given this structure:

```
src/plugins/
  users/
    routes.ts          ← registered
    profile/
      routes.ts        ← registered (nested)
  orders/
    routes.ts          ← registered
    items/
      routes.ts        ← registered (nested)
  _shared/
    utils.ts           ← skipped (no routes file)
```

Without `recursive`, only `users/routes.ts` and `orders/routes.ts` would be registered. With `recursive: true`, `users/profile/routes.ts` and `orders/items/routes.ts` are picked up as well.

`excludedDirectories` still applies at every depth — a matching directory name is skipped along with all its descendants.

## License

MIT
