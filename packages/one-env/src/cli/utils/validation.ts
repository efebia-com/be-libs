/**
 * Core validation utilities for the environment CLI tool
 */

import { z } from 'zod/v4';
import { ValidationResult, ValidationStatistics, FormattedIssue } from '../types.js';

/**
 * Validates environment data against the schema
 * @param envData - Environment data to validate
 * @param schema - Zod schema to validate against
 * @param source - Source identifier (filename or secret name)
 * @param location - Optional location (e.g., AWS region)
 * @returns Validation result with statistics
 */
export function validateEnvData(
    envData: any,
    schema: z.ZodSchema<any>,
    source: string,
    location?: string
): ValidationResult {
    const validationResult = schema.safeParse(envData);
    const statistics = calculateValidationStatistics(envData, schema, validationResult);
    
    return {
        success: validationResult.success,
        source,
        location,
        validFields: statistics.validFields,
        invalidFields: statistics.invalidFields,
        missingFields: statistics.missingFields,
        allMissingFields: statistics.allMissingFields,
        data: validationResult.success ? validationResult.data : null,
        error: validationResult.success ? undefined : {
            formattedIssues: formatZodError(validationResult.error, envData)
        },
    };
}

/**
 * Calculates validation statistics
 * @param envData - Environment data being validated
 * @param schema - Zod schema being used
 * @param validationResult - Result from Zod validation
 * @returns Validation statistics
 */
export function calculateValidationStatistics(
    envData: any,
    schema: z.ZodSchema<any>,
    validationResult: { success: boolean; error?: z.ZodError }
): ValidationStatistics {
    const schemaShape = (schema as any).shape;
    const totalFields = Object.keys(schemaShape).length;
    const providedFields = Object.keys(envData || {}).length;
    
    // Find all missing REQUIRED fields (not provided at all)
    const requiredFields = Object.keys(schemaShape).filter(fieldName => {
        const fieldSchema = schemaShape[fieldName];
        const def = fieldSchema?._def;
        // Check if field is optional, nullable, or has a default value
        const isOptional = def?.typeName === 'ZodOptional' || def?.typeName === 'ZodNullable';
        const hasDefault = def?.defaultValue !== undefined;
        return !(isOptional || hasDefault);
    });
    const providedFieldNames = Object.keys(envData || {});
    const allMissingFields = requiredFields.filter(field => !providedFieldNames.includes(field));
    const missingFields = allMissingFields.length;
    
    // Count validation errors that are NOT due to missing fields
    const invalidButPresentFields = validationResult.success || !validationResult.error ? 0 : 
        validationResult.error.issues.filter((issue: any) => {
            const fieldName = issue.path[0];
            return fieldName && providedFieldNames.includes(String(fieldName));
        }).length;
    
    const validFieldsCount = validationResult.success ? totalFields : providedFields - invalidButPresentFields;
    
    return {
        totalFields,
        providedFields,
        validFields: validFieldsCount,
        invalidFields: invalidButPresentFields,
        missingFields,
        allMissingFields,
    };
}

/**
 * Formats Zod validation errors
 * @param zodError - Zod error object
 * @param envData - Original environment data
 * @returns Formatted issues array
 */
export function formatZodError(zodError: z.ZodError, envData: any): FormattedIssue[] {
    return zodError.issues.map(issue => {
        const field = issue.path.join('.');
        const actualValue = field && envData ? getNestedValue(envData, field) : undefined;
        
        return {
            path: field || 'root',
            message: issue.message,
            code: issue.code,
            actualValue: actualValue !== undefined ? formatValue(actualValue) : undefined,
            expectedType: (issue as any).expected,
        };
    });
}

/**
 * Gets a nested value from an object using dot notation
 * @param obj - Object to get value from
 * @param path - Dot-separated path
 * @returns Value at path or undefined
 */
function getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Formats a value for display, with sensitive field masking
 * @param path - Field path
 * @param value - Value to format
 * @returns Formatted string
 */
export function formatValue(value: any): string {

    
    // Format different value types
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return `"${value}"`;
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'boolean') return value.toString();
    return String(value);
}

