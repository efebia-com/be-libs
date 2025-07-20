import { z } from 'zod/v4';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import yaml from 'js-yaml';

/**
 * Modern Environment Loader with fluent API and full type safety
 * 
 * Usage:
 * ```typescript
 * import { createEnv } from '@root/libs/env';
 * import MySchema from './schema';
 * 
 * // Create typed env instance
 * const env = createEnv({ schema: MySchema, file: "env.local.yml" });
 * 
 * // OR with JSON from process.env
 * const env = createEnv({ schema: MySchema, env: "envs" });
 * 
 * // Use with full type safety and autocomplete
 * const port = env.get("port"); // Typed!
 * const { optional_key } = env.getOptional("optional_key");
 * ```
 */
export class EnvLoader<TSchema extends z.ZodSchema<any>> {
    private envData: Record<string, any> = {};
    private schema: TSchema | null = null;
    private validatedEnv: z.infer<TSchema> | null = null;
    private initialized: boolean = false;

    /**
     * Initialize the environment loader
     * @param options Either { schema, file } for YAML or { schema, env } for JSON
     */
    init(
        options: { schema: TSchema; file: string } | { schema: TSchema; env: string }
    ): void {
        if (this.initialized) {
            // Already initialized, skip re-initialization
            return;
        }

        this.schema = options.schema;

        // Load environment data based on options
        this.loadEnvironmentData(options);

        // Validate immediately
        this.validateEnvironment();
        this.initialized = true;
    }

    /**
     * Load environment data from file or process.env
     */
    private loadEnvironmentData(
        options: { schema: TSchema; file: string } | { schema: TSchema; env: string }
    ): void {
        if ('file' in options) {
            // For file mode, read YAML directly and parse
            try {
                const envContent = readFileSync(options.file, { encoding: 'utf-8' });
                this.envData = yaml.load(envContent) as Record<string, any>;
            } catch (error) {
                const absolutePath = resolve(options.file);
                const errorMessage = [
                    'Failed to read environment file:',
                    `  Provided path: '${options.file}'`,
                    `  Resolved to: '${absolutePath}'`,
                    `  Current directory: '${process.cwd()}'`,
                    `  Error: ${error}`
                ].join('\n');
                throw new Error(errorMessage);
            }
        } else {
            // For env mode, read from process.env with JSON parsing
            const envVar = process.env[options.env];
            if (envVar) {
                try {
                    this.envData = JSON.parse(envVar);
                } catch (error) {
                    throw new Error(`Failed to parse environment JSON from '${options.env}': ${error}`);
                }
            } else {
                throw new Error(`Environment variable '${options.env}' not found`);
            }
        }
    }


    /**
     * Validate environment variables against the schema
     */
    private validateEnvironment(): void {
        if (!this.schema) {
            throw new Error('Environment not initialized. Call env.init() first.');
        }

        try {
            // Validate against schema
            this.validatedEnv = this.schema.parse(this.envData);
        } catch (error) {
            if (error instanceof z.ZodError) {
                console.error('Environment validation failed:');
                error.issues.forEach((err: z.ZodIssue) => {
                    console.error(`  - ${err.path.join('.')}: ${err.message}`);
                });
                throw new Error('Invalid environment configuration. See errors above.');
            }
            throw error;
        }
    }

    /**
     * Get required environment variable(s) with type safety
     */
    get<K extends keyof z.infer<TSchema>>(key: K): z.infer<TSchema>[K];
    get<K extends keyof z.infer<TSchema>>(...keys: K[]): Pick<z.infer<TSchema>, K>;
    get<K extends keyof z.infer<TSchema>>(...keys: K[]): any {
        if (!this.initialized || !this.validatedEnv) {
            throw new Error('Environment not initialized. Call env.init() first.');
        }

        // Single key case
        if (keys.length === 1) {
            return this.validatedEnv[keys[0] as string];
        }

        // Multiple keys case - return object
        const result: any = {};
        for (const key of keys) {
            result[key] = this.validatedEnv[key as string];
        }
        return result;
    }

    /**
     * Get optional environment variable(s) with type safety
     */
    getOptional<K extends keyof z.infer<TSchema>>(key: K): z.infer<TSchema>[K] | undefined;
    getOptional<K extends keyof z.infer<TSchema>>(...keys: K[]): { [P in K]: z.infer<TSchema>[P] | undefined };
    getOptional<K extends keyof z.infer<TSchema>>(...keys: K[]): any {
        if (!this.initialized || !this.validatedEnv) {
            throw new Error('Environment not initialized. Call env.init() first.');
        }

        // Single key case
        if (keys.length === 1) {
            return this.validatedEnv[keys[0] as string];
        }

        // Multiple keys case - return object
        const result: any = {};
        for (const key of keys) {
            result[key] = this.validatedEnv[key as string];
        }
        return result;
    }

    /**
     * Get all validated environment variables
     */
    getAll(): z.infer<TSchema> {
        if (!this.validatedEnv) {
            throw new Error('Environment not initialized. Call env.init() first.');
        }
        return this.validatedEnv;
    }

}

// Global instance storage for singleton behavior
let globalInstance: EnvLoader<any> | null = null;

/**
 * Creates a typed environment loader instance
 * @param options Configuration options with schema and file/env source
 * @returns Typed EnvLoader instance with full type safety and autocomplete
 */
export function createEnv<TSchema extends z.ZodSchema<any>>(
    options: { schema: TSchema; file: string } | { schema: TSchema; env: string }
): EnvLoader<TSchema> {
    // Use existing instance if available (singleton pattern)
    if (globalInstance) {
        return globalInstance as EnvLoader<TSchema>;
    }
    
    // Create new instance
    const loader = new EnvLoader<TSchema>();
    loader.init(options);
    
    // Store as global singleton
    globalInstance = loader;
    
    return loader;
}


/**
 * Interface for the enhanced env object with init method
 */
export interface EnvWithInit<TSchema extends z.ZodSchema<any>> {
    init(options: { file: string } | { env: string }): void;
    get<K extends keyof z.infer<TSchema>>(key: K): z.infer<TSchema>[K];
    get<K extends keyof z.infer<TSchema>>(...keys: K[]): Pick<z.infer<TSchema>, K>;
    getOptional<K extends keyof z.infer<TSchema>>(key: K): z.infer<TSchema>[K] | undefined;
    getOptional<K extends keyof z.infer<TSchema>>(...keys: K[]): Partial<Pick<z.infer<TSchema>, K>>;
    getAll(): z.infer<TSchema>;
}

/**
 * Creates an enhanced environment loader with init() method
 * This provides a cleaner API: env.init({ file: './env.yml' }) followed by env.get('key')
 * 
 * @param schema The Zod schema for environment validation
 * @returns Enhanced env object with init, get, getOptional, and getAll methods
 */
export function createEnvWithInit<TSchema extends z.ZodSchema<any>>(
    schema: TSchema
): EnvWithInit<TSchema> {
    let instance: EnvLoader<TSchema> | null = null;
    
    return {
        init(options: { file: string } | { env: string }): void {
            if (!instance) {
                instance = createEnv({ schema, ...options });
            }
        },
        
        get(...keys: any[]): any {
            if (!instance) {
                throw new Error('Environment not initialized. Call env.init() first.');
            }
            return instance.get(...keys);
        },
        
        getOptional(...keys: any[]): any {
            if (!instance) {
                throw new Error('Environment not initialized. Call env.init() first.');
            }
            return instance.getOptional(...keys);
        },
        
        getAll(): z.infer<TSchema> {
            if (!instance) {
                throw new Error('Environment not initialized. Call env.init() first.');
            }
            return instance.getAll();
        }
    };
}