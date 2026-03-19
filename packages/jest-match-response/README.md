# @efebia/jest-match-response

Jest custom matchers for testing HTTP responses and JSON schemas with AJV.

## Install

```bash
npm install --save-dev @efebia/jest-match-response
```

Requires Node.js >= 18 and Jest >= 28.

## Setup

Register the matchers in your Jest setup file:

```ts
// jest.setup.ts
import Ajv from 'ajv';
import { expect } from '@jest/globals';
import { buildToMatchJson, toMatchResponse } from '@efebia/jest-match-response';

const ajv = new Ajv();

expect.extend({
  toMatchJson: buildToMatchJson({ ajv }),
  toMatchResponse,
});
```

```js
// jest.config.js
module.exports = {
  setupFilesAfterFramework: ['./jest.setup.ts'],
};
```

## Usage

### `toMatchResponse(statusCode, jsonSchema)`

Asserts that a response object has the expected status code **and** that its JSON body matches the given JSON Schema.

The received value must expose:
- `.status` or `.statusCode` — the HTTP status code
- `.json()` — a synchronous method returning the parsed response body

```ts
const response = await app.inject({ method: 'GET', url: '/users/1' });

// passes if status is 200 and body matches the schema
expect(response).toMatchResponse(200, {
  type: 'object',
  required: ['id', 'name'],
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
  },
});

// negative assertion
expect(response).not.toMatchResponse(404, {});
```

### `toMatchJson(jsonSchema)`

Asserts that a value matches a JSON Schema directly.

```ts
expect({ id: '1', name: 'Alice' }).toMatchJson({
  type: 'object',
  required: ['id', 'name'],
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
  },
});
```

### `buildToMatchJson(options)`

Factory for creating a `toMatchJson` matcher with a custom AJV instance.

```ts
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv();
addFormats(ajv);

expect.extend({ toMatchJson: buildToMatchJson({ ajv }) });
```

| Option | Type | Description |
|--------|------|-------------|
| `ajv` | `Ajv` | The AJV instance used to compile and validate schemas |

## License

MIT
