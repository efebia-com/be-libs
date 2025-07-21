# @efebia/one-env

Type-safe environment configuration management for Node.js applications with runtime validation and CLI tools.

## Features

- 🔒 **Type-safe** environment variables with full TypeScript support
- ✅ **Runtime validation** using Zod schemas
- 🛠️ **CLI tools** for generating, validating, and managing environment files
- 🌍 **Multiple sources**: Load from YAML files or JSON environment variables
- 🚀 **Production ready**: Validate AWS Secrets Manager configurations
- 📤 **Push & Pull**: Sync secrets with AWS Secrets Manager
- 💡 **Developer friendly**: Autocomplete for all environment variables

## Installation

```bash
# Using npm
npm install @efebia/one-env zod

# Using yarn
yarn add @efebia/one-env zod

# Using pnpm
pnpm add @efebia/one-env zod
```

Note: Zod (^4.0.0) is a peer dependency and must be installed separately.

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
// env.ts
import { createEnvWithInit } from '@efebia/one-env';
import EnvSchema from './env-schema.js';

// Create env instance (singleton pattern)
const env = createEnvWithInit(EnvSchema);
export default env;

// app.ts
import env from './env.js';

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

**Note**: Using `createEnvWithInit` as a singleton helps with concurrency and prevents errors from calling `env.get()` before initialization due to import order issues.

### 3. Alternative: Immediate initialization

```typescript
import { createEnv } from '@efebia/one-env';
import EnvSchema from './env-schema.js';

// Initialize immediately
const env = createEnv({ 
  schema: EnvSchema, 
  file: './env.local.yml' 
});

// Use directly
const port = env.get('port');
```

## CLI Tools

@efebia/one-env includes powerful CLI tools for managing your environment configuration:

### Generate environment file

Create a new environment file with default values from your schema:

```bash
# Generate env.local.yml with defaults
one-env generate -s ./env-schema.js

# Generate with custom output
one-env generate -s ./env-schema.js -o env.prod.yml

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

### Pull from AWS Secrets Manager

Pull your environment configuration from AWS Secrets Manager to a local file:

```bash
# Pull from AWS to local file
one-env pull -s ./env-schema.js --secret-name dev-envs

# Pull with custom output file
one-env pull -s ./env-schema.js --secret-name prod-envs --output env.prod.yml

# Force overwrite existing file
one-env pull -s ./env-schema.js --secret-name dev-envs --force

# With specific AWS profile and region
one-env pull -s ./env-schema.js --secret-name dev-envs --profile development --region us-east-1
```

### Push to AWS Secrets Manager

Push your local environment configuration to AWS Secrets Manager:

```bash
# Push to AWS (with confirmation prompt)
one-env push -s ./env-schema.js --file env.prod.yml --secret-name prod-envs

# Push with environment tag
one-env push -s ./env-schema.js --file env.prod.yml --secret-name prod-envs --environment production

# Dry-run to preview what will be pushed
one-env push -s ./env-schema.js --file env.prod.yml --secret-name prod-envs --dry-run

# Skip confirmation prompt (for CI/CD)
one-env push -s ./env-schema.js --file env.prod.yml --secret-name prod-envs --force

# With specific AWS profile and region
one-env push -s ./env-schema.js --file env.prod.yml --secret-name prod-envs --profile production --region us-east-1
```

### Typical Workflow

Update a single value in development:

```bash
# 1. Pull current configuration
one-env pull -s ./env-schema.js --secret-name dev-envs

# 2. Edit the file locally
vim env.pulled.yml  # Change databaseUrl or any other value

# 3. Push changes back
one-env push -s ./env-schema.js --file env.pulled.yml --secret-name dev-envs
```

**Security Note**: Never commit files containing actual secrets. Use `.gitignore` to exclude environment files with sensitive data.

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

The schema auto-generates environment files with defaults:

```
env.local.yml      # Local development (gitignored)
```

Use the `generate` command to create new environment files from your schema, eliminating the need for example files.

### 3. Singleton Pattern

Create a singleton instance to avoid initialization issues:

```typescript
// env.ts
import { createEnvWithInit } from '@efebia/one-env';
import EnvSchema from '../../env-schema.js';

const env = createEnvWithInit(EnvSchema);
export default env;
```

This pattern:
- Prevents race conditions during initialization
- Handles import order dependencies gracefully
- Ensures consistent state across your application
- Avoids errors from calling `env.get()` before `env.init()`

## Error Handling

@efebia/one-env provides clear error messages for configuration issues:

```
Environment validation failed:
  - port: Expected number, received string
  - databaseUrl: Invalid URL
  - apiKey: String must contain at least 32 characters
```

## Requirements

- Node.js >= 20.0.0
- Zod (^4.0.0 peer dependency)

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For bugs and feature requests, please [create an issue](https://github.com/efebia/be-libs/issues).