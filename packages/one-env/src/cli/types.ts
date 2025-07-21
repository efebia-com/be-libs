/**
 * Shared type definitions for the environment CLI tool
 */

// Command option interfaces
export interface GenerateOptions {
    schema: string;
    output: string;
    force: boolean;
}

export interface ValidateOptions {
    schema: string;
    file: string;
    json: boolean;
}

export interface ValidateAwsOptions {
    schema: string;
    secretName: string;
    region: string;
    profile?: string;
    json: boolean;
}

export interface UploadOptions {
    schema: string;
    file: string;
    secretName: string;
    region: string;
    profile?: string;
    environment?: string;
    dryRun: boolean;
    force: boolean;
}

// Validation result interfaces
export interface ValidationResult {
    success: boolean;
    source: string;           // File name or secret name
    location?: string | undefined;        // Region for AWS, undefined for local
    validFields: number;
    invalidFields: number;
    missingFields: number;
    allMissingFields: string[];
    data?: any;
    error?: ValidationError | undefined;
}

export interface ValidationError {
    formattedIssues: FormattedIssue[];
}

export interface FormattedIssue {
    path: string;
    message: string;
    code: string;
    actualValue?: string | undefined;
    expectedType?: string | undefined;
}

// Statistics for validation
export interface ValidationStatistics {
    totalFields: number;
    providedFields: number;
    validFields: number;
    invalidFields: number;
    missingFields: number;
    allMissingFields: string[];
}

// JSON output formats
export interface JsonValidationOutput {
    success: boolean;
    source: string;
    location?: string | undefined;
    statistics: {
        totalFields: number;
        validFields: number;
        invalidFields: number;
        missingFields: number;
    };
    errors: FormattedIssue[];
    missingFields: string[];
}

export interface JsonErrorOutput {
    success: false;
    error: string;
    type: 'file_error' | 'aws_error' | 'validation_error';
    source?: string | undefined;
    location?: string | undefined;
}