# one-env

Type-safe environment configuration management for Node.js applications with runtime validation and CLI tools.

## Features

- 🔒 **Type-safe** environment variables with full TypeScript support
- ✅ **Runtime validation** using Zod schemas
- 🛠️ **CLI tools** for generating, validating, and managing environment files
- 🌍 **Multiple sources**: Load from YAML files or JSON environment variables
- 🚀 **Production ready**: Validate AWS Secrets Manager configurations
- 💡 **Developer friendly**: Autocomplete for all environment variables

## Installation

```bash
# Using npm
npm install one-env zod

# Using yarn
yarn add one-env zod

# Using pnpm
pnpm add one-env zod
```

Note: `zod` v4 is a peer dependency and must be installed separately.

## Quick Start

### 1. Define your environment schema

```typescript
// env-schema.ts
import { z } from 'zod/v4';

const EnvSchema = z.object({
  // Application
  port: z.coerce.number().positive().default(3000),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  
  // Database
  databaseUrl: z.string().url().describe('PostgreSQL connection URL'),
  
  // API Keys
  apiKey: z.string().min(32).describe('External API key'),
  
  // Feature flags
  enableCache: z.boolean().default(true),
  cacheTimeout: z.coerce.number().positive().optional().default(3600),
});

export default EnvSchema;
```

### 2. Use in your application

```typescript
// config.ts
import { createEnvWithInit } from 'one-env';
import EnvSchema from './env-schema';

// Create env instance
const env = createEnvWithInit(EnvSchema);

// Initialize with YAML file
env.init({ file: './env.local.yml' });

// Or initialize with JSON from environment variable
env.init({ env: 'APP_CONFIG' });

// Use with full type safety
export const config = {
  port: env.get('port'),
  database: env.get('databaseUrl'),
  cache: {
    enabled: env.get('enableCache'),
    timeout: env.get('cacheTimeout'),
  }
};
```

### 3. Alternative: Immediate initialization

```typescript
import { createEnv } from 'one-env';
import EnvSchema from './env-schema';

// Initialize immediately
const env = createEnv({ 
  schema: EnvSchema, 
  file: './env.local.yml' 
});

// Use directly
const port = env.get('port');
```

## CLI Tools

one-env includes powerful CLI tools for managing your environment configuration:

### Generate environment file

Create a new environment file with default values from your schema:

```bash
# Generate env.local.yml with defaults
one-env generate -s ./env-schema.js

# Generate with custom output
one-env generate -s ./env-schema.js -o env.example.yml

# Force overwrite existing file
one-env generate -s ./env-schema.js --force
```

### Validate environment file

Check if your environment file is valid:

```bash
# Validate env.local.yml
one-env validate -s ./env-schema.js

# Validate specific file
one-env validate -s ./env-schema.js --file env.prod.yml

# Output as JSON (for CI/CD)
one-env validate -s ./env-schema.js --json
```

### Validate AWS Secrets

Validate environment variables stored in AWS Secrets Manager:

```bash
# Validate AWS secrets
one-env validate-aws -s ./env-schema.js --secret-name my-app/prod

# With specific AWS profile
one-env validate-aws -s ./env-schema.js --secret-name my-app/prod --profile production

# With specific region
one-env validate-aws -s ./env-schema.js --secret-name my-app/prod --region us-east-1
```

## API Reference

### `createEnv(options)`

Creates and immediately initializes an environment loader.

```typescript
const env = createEnv({
  schema: ZodSchema,
  file: './env.yml'    // or
  env: 'CONFIG_JSON'   // for JSON from environment variable
});
```

### `createEnvWithInit(schema)`

Creates an environment loader with deferred initialization.

```typescript
const env = createEnvWithInit(schema);

// Initialize later
env.init({ file: './env.yml' });
// or
env.init({ env: 'CONFIG_JSON' });
```

### Methods

#### `get(key)` / `get(...keys)`

Get one or multiple environment values with type safety:

```typescript
// Single value
const port = env.get('port'); // number

// Multiple values
const { port, nodeEnv } = env.get('port', 'nodeEnv');
```

#### `getOptional(key)` / `getOptional(...keys)`

Get optional environment values:

```typescript
const timeout = env.getOptional('cacheTimeout'); // number | undefined
```

#### `getAll()`

Get all validated environment variables:

```typescript
const config = env.getAll(); // Fully typed object
```

## Best Practices

### 1. Schema Organization

Keep your schema in a separate file for reusability:

```typescript
// env-schema.ts
export default z.object({
  // Group related variables
  // Database
  dbHost: z.string(),
  dbPort: z.coerce.number(),
  dbName: z.string(),
  
  // Add descriptions for documentation
  apiKey: z.string().describe('API key for external service'),
  
  // Use defaults for development
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});
```

### 2. Environment-specific Files

Use different files for different environments:

```
env.local.yml      # Local development (gitignored)
env.test.yml       # Test environment
env.example.yml    # Example file (committed)
```

### 3. CI/CD Integration

```yaml
# .github/workflows/validate.yml
- name: Validate environment
  run: |
    npx one-env validate -s ./env-schema.js --json
    
- name: Validate production secrets
  run: |
    npx one-env validate-aws \
      -s ./env-schema.js \
      --secret-name prod/myapp \
      --profile production
```

### 4. Type Exports

Export types for use across your application:

```typescript
// config.ts
import { createEnvWithInit } from 'one-env';
import { z } from 'zod/v4';
import EnvSchema from './env-schema';

export type Config = z.infer<typeof EnvSchema>;

const env = createEnvWithInit(EnvSchema);
export default env;
```

## Error Handling

one-env provides clear error messages for configuration issues:

```
Environment validation failed:
  - port: Expected number, received string
  - databaseUrl: Invalid URL
  - apiKey: String must contain at least 32 characters
```

## Requirements

- Node.js >= 18.0.0
- Zod v4 (peer dependency)

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For bugs and feature requests, please [create an issue](https://github.com/yourusername/one-env/issues).