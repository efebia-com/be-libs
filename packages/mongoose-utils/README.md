# @efebia/mongoose-utils

Mongoose utilities for cursor-based (keyset) pagination.

## Install

```bash
npm install @efebia/mongoose-utils
```

## Usage

### `createPaginationAndSortingQuery`

Returns both the Mongoose filter query and the sort object for a paginated request. This is the primary helper for most use cases.

```ts
import { createPaginationAndSortingQuery } from '@efebia/mongoose-utils';

const { page, sort } = createPaginationAndSortingQuery(
  lastElement?.createdAt,  // field value of the last seen element
  lastElement?._id,        // _id of the last seen element
  { field: 'createdAt', direction: 'asc' },
  { status: 'active' }     // base filter query
);

const results = await MyModel.find(page).sort(sort).limit(20);
```

On the first page, pass `undefined` / `null` for both `lastElementFieldValue` and `lastElementId` — the function returns an unmodified base query.

### `createPaginationQuery`

Returns only the filter query, without the sort object.

```ts
import { createPaginationQuery } from '@efebia/mongoose-utils';

const query = createPaginationQuery(
  lastElement?.score,
  lastElement?._id,
  { field: 'score', direction: 'desc' },
  {}
);

const results = await MyModel.find(query).sort({ score: -1, _id: -1 }).limit(20);
```

## API

### `createPaginationAndSortingQuery(lastElementFieldValue, lastElementId, options, filterQuery)`

| Parameter | Type | Description |
|-----------|------|-------------|
| `lastElementFieldValue` | `any` | Value of the sort field from the last seen document |
| `lastElementId` | `string \| ObjectId` | `_id` of the last seen document |
| `options.field` | `string` | The field to sort and paginate by |
| `options.direction` | `'asc' \| 'desc'` | Sort direction (default: `'asc'`) |
| `filterQuery` | `FilterQuery<any>` | Base Mongoose filter to extend |

Returns `{ page: FilterQuery, sort: Record<string, 1 \| -1> }`.

### `createPaginationQuery(lastElementFieldValue, lastElementId, options, filterQuery)`

Same parameters as above. Returns a `FilterQuery` (or `undefined` when `lastElementFieldValue` is falsy, meaning first page).

**How it works:**

When both a field value and an `_id` are provided, the query uses an `$or` condition to correctly handle ties on the sort field:
- Documents where the sort field is strictly greater/less than the cursor value, **or**
- Documents where the sort field equals the cursor value but `_id` is greater/less than the cursor `_id`

## License

MIT
