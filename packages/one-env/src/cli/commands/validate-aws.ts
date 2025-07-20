/**
 * Validate AWS command implementation
 * Validates AWS Secrets Manager secrets against the schema
 */

import chalk from 'chalk';
import { ValidateAwsOptions } from '../types.js';
import { createSecretsManagerClient, getSecretValue } from '../utils/aws.js';
import { validateEnvData } from '../utils/validation.js';
import { printValidationResults, formatJsonOutput, formatJsonError, printStatus } from '../utils/formatting.js';
import { loadSchema, formatSchemaSource } from '../utils/schema-loader.js';

/**
 * Handles the validate-aws command
 * @param options - Command options
 */
export async function handleValidateAwsCommand(options: ValidateAwsOptions): Promise<void> {
    // Configure AWS client
    const client = createSecretsManagerClient(options.region, options.profile);
    
    try {
        // Load schema dynamically
        if (!options.json) {
            printStatus(`Loading schema from ${formatSchemaSource(options.schema)}...`, 'info');
        }
        
        const schema = await loadSchema(options.schema);
        
        // Fetch secret from AWS
        if (!options.json) {
            printStatus(`Fetching secret '${options.secretName}' from AWS Secrets Manager...`, 'info');
        }
        
        const secretData = await getSecretValue(client, options.secretName);
        
        // Validate against schema
        const results = validateEnvData(secretData, schema, options.secretName, options.region);
        
        if (options.json) {
            // JSON output for automation
            const jsonOutput = formatJsonOutput(results);
            console.log(JSON.stringify(jsonOutput, null, 2));
        } else {
            // Human-readable output
            printValidationResults(results);
        }
        
        // Exit with appropriate code
        process.exit(results.success ? 0 : 1);
        
    } catch (error: any) {
        if (options.json) {
            const jsonError = formatJsonError(error, 'aws_error', options.secretName, options.region);
            console.log(JSON.stringify(jsonError, null, 2));
        } else {
            const tips: string[] = [];
            
            if (error.message.includes('not found')) {
                tips.push('Check that the secret name and region are correct.');
                tips.push('Ensure you have AWS credentials configured.');
            } else if (error.message.includes('credentials')) {
                tips.push("Configure AWS credentials using 'aws configure' or environment variables.");
            }
            
            console.error(`\n${chalk.red.bold('Error:')} ${error.message}\n`);
            tips.forEach(tip => {
                console.log(`${chalk.yellow('Tip:')} ${tip}`);
            });
        }
        
        process.exit(1);
    }
}