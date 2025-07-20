/**
 * Output formatting utilities for the environment CLI tool
 */

import chalk from 'chalk';
import { ValidationResult, JsonValidationOutput, JsonErrorOutput } from '../types.js';

/**
 * Prints validation results in human-readable format
 * @param results - Validation results to print
 */
export function printValidationResults(results: ValidationResult): void {
    const { success, source, location, validFields, invalidFields, missingFields, allMissingFields, error } = results;
    
    // Header
    console.log('\n' + chalk.bold('='.repeat(60)));
    
    if (success) {
        console.log(chalk.green.bold('✓ VALID'));
        console.log(`All environment variables are valid!`);
        console.log(`${chalk.bold('Source:')} ${source}`);
        if (location) {
            console.log(`${chalk.bold('Location:')} ${location}`);
        }
        console.log(`${chalk.bold('Total fields validated:')} ${validFields}`);
    } else {
        console.log(chalk.red.bold('✗ INVALID'));
        console.log(`Environment validation failed for '${source}'${location ? ` in ${location}` : ''}`);
        console.log(`\n${chalk.bold('Summary:')}`);
        console.log(`  ${chalk.green('✓ Valid fields:')} ${validFields}`);
        console.log(`  ${chalk.red('✗ Invalid fields:')} ${invalidFields}`);
        console.log(`  ${chalk.yellow('⚠ Missing fields:')} ${missingFields}`);
        
        if (error && error.formattedIssues) {
            // Filter out issues for missing fields (they'll be shown in the Missing Fields section)
            const nonMissingIssues = error.formattedIssues.filter(issue => 
                !allMissingFields.includes(issue.path)
            );
            
            if (nonMissingIssues.length > 0) {
                console.log(`\n${chalk.bold('Validation Errors:')}`);
                nonMissingIssues.forEach(issue => {
                    const field = issue.path || 'root';
                    console.log(`  ${chalk.red('✗')} ${chalk.cyan(field)}: ${issue.message}`);
                    if (issue.actualValue !== undefined) {
                        console.log(`    ${chalk.yellow('Actual value:')} ${issue.actualValue}`);
                    }
                });
            }
        }
        
        if (allMissingFields && allMissingFields.length > 0) {
            console.log(`\n${chalk.bold('Missing Required Fields:')}`);
            allMissingFields.forEach(field => {
                console.log(`  ${chalk.yellow('⚠')} ${chalk.cyan(field)}`);
            });
        }
    }
    
    console.log('\n' + chalk.bold('='.repeat(60)) + '\n');
}

/**
 * Formats validation results as JSON
 * @param results - Validation results
 * @returns JSON output object
 */
export function formatJsonOutput(results: ValidationResult): JsonValidationOutput {
    return {
        success: results.success,
        source: results.source,
        location: results.location,
        statistics: {
            totalFields: results.validFields + results.invalidFields + results.missingFields,
            validFields: results.validFields,
            invalidFields: results.invalidFields,
            missingFields: results.missingFields,
        },
        errors: results.error ? results.error.formattedIssues : [],
        missingFields: results.allMissingFields,
    };
}

/**
 * Formats an error as JSON
 * @param error - Error object
 * @param type - Type of error
 * @param source - Optional source identifier
 * @param location - Optional location
 * @returns JSON error output
 */
export function formatJsonError(
    error: Error,
    type: 'file_error' | 'aws_error' | 'validation_error',
    source?: string,
    location?: string
): JsonErrorOutput {
    return {
        success: false,
        error: error.message,
        type,
        source,
        location,
    };
}

/**
 * Prints a status message with color
 * @param message - Message to print
 * @param type - Type of message (info, success, warning, error)
 */
export function printStatus(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    const colors = {
        info: chalk.cyan,
        success: chalk.green,
        warning: chalk.yellow,
        error: chalk.red,
    };
    
    console.log(colors[type](message));
}

/**
 * Prints an error message with formatting
 * @param error - Error object
 * @param tips - Optional tips to help resolve the error
 */
export function printError(error: Error, tips?: string[]): void {
    console.error(`\n${chalk.red.bold('Error:')} ${error.message}\n`);
    
    if (tips && tips.length > 0) {
        tips.forEach(tip => {
            console.log(`${chalk.yellow('Tip:')} ${tip}`);
        });
    }
}

/**
 * Prints success message with additional info
 * @param action - Action that succeeded
 * @param details - Additional details to show
 */
export function printSuccess(action: string, details: Record<string, string | number>): void {
    console.log(`\n${chalk.green('✓ Successfully ' + action)}`);
    
    Object.entries(details).forEach(([key, value]) => {
        console.log(`${chalk.bold(key + ':')} ${value}`);
    });
}

/**
 * Formats field count for display
 * @param count - Number to format
 * @param label - Label for the count
 * @returns Formatted string
 */
export function formatFieldCount(count: number, label: string): string {
    return `${chalk.bold(label + ':')} ${count}`;
}