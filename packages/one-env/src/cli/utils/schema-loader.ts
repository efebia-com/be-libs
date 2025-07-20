/**
 * Dynamic schema loader utility
 * Loads Zod schemas from TypeScript or JavaScript files at runtime
 */

import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { z } from 'zod/v4';
import { existsSync } from 'node:fs';
import chalk from 'chalk';

/**
 * Dynamically loads a Zod schema from a file
 * @param schemaPath - Path to the schema file
 * @returns The loaded Zod schema
 */
export async function loadSchema(schemaPath: string): Promise<z.ZodSchema<any>> {
    const absolutePath = resolve(process.cwd(), schemaPath);
    
    if (!existsSync(absolutePath)) {
        throw new Error(`Schema file not found: ${schemaPath}`);
    }
    
    try {
        // Convert to file URL for proper ESM import
        const fileUrl = pathToFileURL(absolutePath).href;
        
        // Dynamically import the schema file
        const schemaModule = await import(fileUrl);
        
        // Always use default export
        const schema = schemaModule.default;
        
        if (!schema) {
            throw new Error(
                `No default export found in ${schemaPath}.\n` +
                `The schema file must export the schema as default: export default EnvSchema`
            );
        }
        
        // Verify it's a Zod schema
        if (!isZodSchema(schema)) {
            throw new Error(`Default export is not a valid Zod schema`);
        }
        
        return schema;
    } catch (error: any) {
        if (error.code === 'ERR_MODULE_NOT_FOUND' || error.code === 'MODULE_NOT_FOUND') {
            throw new Error(
                `Failed to load schema from ${schemaPath}.\n` +
                `Make sure the file is compiled if it's TypeScript.\n` +
                `Error: ${error.message}`
            );
        }
        throw error;
    }
}

/**
 * Checks if an object is a Zod schema
 * @param obj - Object to check
 * @returns True if it's a Zod schema
 */
function isZodSchema(obj: any): obj is z.ZodSchema<any> {
    return obj && typeof obj === 'object' && '_def' in obj && typeof obj.parse === 'function';
}

/**
 * Extracts field information from a Zod schema
 * @param schema - Zod schema to analyze
 * @returns Object with field metadata
 */
export function analyzeSchema(schema: z.ZodSchema<any>): {
    fields: Record<string, {
        optional: boolean;
        hasDefault: boolean;
        defaultValue?: any;
        description?: string;
    }>;
    totalFields: number;
    requiredFields: string[];
    optionalFields: string[];
} {
    const shape = (schema as any).shape || {};
    const fields: Record<string, any> = {};
    const requiredFields: string[] = [];
    const optionalFields: string[] = [];
    
    for (const [key, fieldSchema] of Object.entries(shape)) {
        const def = (fieldSchema as any)._def;
        const isOptional = def?.typeName === 'ZodOptional' || def?.typeName === 'ZodNullable';
        const hasDefault = def?.defaultValue !== undefined;
        const description = def?.description;
        
        fields[key] = {
            optional: isOptional,
            hasDefault,
            defaultValue: hasDefault ? def.defaultValue : undefined,
            description
        };
        
        if (isOptional) {
            optionalFields.push(key);
        } else {
            requiredFields.push(key);
        }
    }
    
    return {
        fields,
        totalFields: Object.keys(fields).length,
        requiredFields,
        optionalFields
    };
}

/**
 * Generates default values from a Zod schema
 * @param schema - Zod schema with defaults
 * @returns Object with default values
 */
export function extractSchemaDefaults(schema: z.ZodSchema<any>): Record<string, any> {
    const analysis = analyzeSchema(schema);
    const defaults: Record<string, any> = {};
    
    // Try to parse an empty object to get defaults
    try {
        const parsed = schema.parse({});
        return parsed;
    } catch {
        // If that fails, extract defaults manually
        for (const [key, fieldInfo] of Object.entries(analysis.fields)) {
            if (fieldInfo.hasDefault) {
                defaults[key] = fieldInfo.defaultValue;
            }
        }
        return defaults;
    }
}

/**
 * Formats schema path for display
 * @param schemaPath - Path to schema file
 * @returns Formatted string
 */
export function formatSchemaSource(schemaPath: string): string {
    return chalk.cyan(schemaPath);
}