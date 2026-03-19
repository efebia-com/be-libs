# @efebia/fastify-zod-reply

Fastify 5 plugin providing type-safe HTTP reply helpers and Zod v4 schema validation for routes, with auto-generated OpenAPI schemas and SSE support.

## Install

```bash
npm install @efebia/fastify-zod-reply
```

## Usage

### 1. Register the plugin

```ts
import Fastify from 'fastify';
import fastifyZodReply from '@efebia/fastify-zod-reply';

const fastify = Fastify();
await fastify.register(fastifyZodReply);
```

### 2. Define a route with `routeV4`

```ts
import { z } from 'zod';
import { routeV4 } from '@efebia/fastify-zod-reply';

fastify.get('/users/:id', routeV4(
  {
    Params: z.object({ id: z.string() }),
    Reply: z.object({
      200: z.object({ id: z.string(), name: z.string() }),
      404: z.object({ message: z.string() }),
    }),
  },
  async (request, reply) => {
    const user = await findUser(request.params.id);
    if (!user) return reply.notFound('User not found');
    return reply.ok(user);
  }
));
```

`routeV4` automatically:
- Validates `Body`, `Params`, `Query`, and `Headers` via Zod before the handler runs
- Validates and serializes the response against the `Reply` schema
- Generates the JSON Schema for Fastify's OpenAPI integration

### 3. Reply helpers

The plugin decorates `FastifyReply` with semantic methods:

```ts
reply.ok({ id: '1', name: 'Alice' })   // 200
reply.created({ id: '2' })              // 201
reply.accepted()                        // 202
reply.noContent()                       // 204

reply.badRequest('Validation failed')   // 400 — throws FastifyError
reply.unauthorized()                    // 401
reply.forbidden()                       // 403
reply.notFound('User not found')        // 404
reply.notAcceptable()                   // 406
reply.conflict()                        // 409
reply.internalServerError()             // 500
```

Passing a string to error methods throws a `FastifyError` with that message. Passing an object sends it as JSON.

## SSE (Server-Sent Events)

Use `sseRouteV4` for streaming endpoints:

```ts
import { sseRouteV4 } from '@efebia/fastify-zod-reply';

fastify.get('/events', sseRouteV4(
  {
    Reply: z.object({
      SSE: z.object({ data: z.object({ count: z.number() }) }),
    }),
  },
  async (request, reply) => {
    async function* generate() {
      for (let i = 0; i < 10; i++) {
        yield { data: { count: i } };
      }
    }
    return reply.sse({ stream: generate() });
  }
));
```

The `SSE` key in the `Reply` schema maps to the `200` status code with `text/event-stream` content type. `request.abortController` is automatically wired to the socket `close` event.

## API

### `routeV4(schema, handler, options?)`

Pre-built route factory with `strict: false`.

### `createRouteV4(options?)`

Factory for creating a custom `routeV4` with shared defaults.

```ts
import { createRouteV4 } from '@efebia/fastify-zod-reply';

const routeV4 = createRouteV4({ strict: true });
```

**Options (`RouteV4Options`):**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `strict` | `boolean \| { body, query, params, headers }` | `false` | Strip unknown fields from request inputs |

**Schema fields (`BaseZodV4Schema`):**

| Field | Type | Description |
|-------|------|-------------|
| `Body` | `z.ZodTypeAny` | Request body schema |
| `Params` | `z.ZodTypeAny` | Route params schema |
| `Query` | `z.ZodTypeAny` | Query string schema |
| `Headers` | `z.ZodTypeAny` | Headers schema |
| `Reply` | `z.ZodObject` | Response schema keyed by HTTP status code |
| `Tags` | `(keyof RouteTag)[]` | OpenAPI tags |
| `Security` | `RouteSecurity[]` | OpenAPI security schemes |
| `Summary` | `string` | OpenAPI summary |
| `Description` | `string` | OpenAPI description |
| `Notes` | `string` | Additional notes |

### `sseRouteV4(schema, handler, options?)`

Pre-built SSE route factory. The `Reply` schema must include an `SSE` key.

### `createSSERouteV4(options?)`

Factory for creating a custom `sseRouteV4`. Accepts `SSERouteV4Options`:

| Option | Type | Description |
|--------|------|-------------|
| `strict` | `boolean \| object` | Same as `routeV4` |
| `sse.keepAliveInterval` | `number` | Interval (ms) for keep-alive pings |
| `sse.onError` | `(error) => void` | Global error handler for the stream |
| `sse.validateStream` | `boolean` | Validate each SSE event against the schema |

### `buildHTTPErrorObject(statusCode, message)`

Builds a plain HTTP error object.

### `FastifyZodReplyError`

Error class thrown when response serialization fails.

### `RouteTag` / `RouteSecurity`

Empty interfaces — extend via module augmentation to add your own OpenAPI tags and security schemes:

```ts
declare module '@efebia/fastify-zod-reply' {
  interface RouteTag {
    users: never;
    orders: never;
  }
  interface RouteSecurity {
    bearerAuth: never;
  }
}
```

## License

MIT
