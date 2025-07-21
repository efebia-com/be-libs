/**
 * Pull command implementation
 * Pulls environment configuration from AWS Secrets Manager to a local file
 */

import chalk from 'chalk';
import { PullOptions } from '../types.js';
import { createSecretsManagerClient, getSecretValue } from '../utils/aws.js';
import { resolvePath, fileExists, writeFile, createYamlContent } from '../utils/file.js';
import { validateEnvData } from '../utils/validation.js';
import { printValidationResults, printStatus } from '../utils/formatting.js';
import { loadSchema, formatSchemaSource } from '../utils/schema-loader.js';
import readline from 'node:readline/promises';

/**
 * Handles the pull command
 * @param options - Command options
 */
export async function handlePullCommand(options: PullOptions): Promise<void> {
    // Configure AWS client
    const client = createSecretsManagerClient(options.region, options.profile);
    
    try {
        // Load schema dynamically
        printStatus(`Loading schema from ${formatSchemaSource(options.schema)}...`, 'info');
        const schema = await loadSchema(options.schema);
        
        // Fetch secret from AWS
        printStatus(`Fetching secret '${options.secretName}' from AWS Secrets Manager...`, 'info');
        const secretData = await getSecretValue(client, options.secretName);
        
        // Validate against schema
        printStatus('Validating pulled configuration against schema...', 'info');
        const validationResults = validateEnvData(secretData, schema, options.secretName, options.region);
        
        if (!validationResults.success) {
            console.error(`\n${chalk.red.bold('Warning:')} Pulled configuration has validation issues\n`);
            printValidationResults(validationResults);
            console.log(`\n${chalk.yellow('Note:')} The configuration will still be saved, but you should fix these issues before pushing.`);
        } else {
            printStatus('Configuration is valid!', 'success');
        }
        
        // Check if output file exists
        const outputPath = resolvePath(options.output);
        
        if (fileExists(outputPath) && !options.force) {
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            
            console.log(`\n${chalk.yellow.bold('Warning:')} File '${options.output}' already exists`);
            const answer = await rl.question(`\nDo you want to overwrite it? (yes/no): `);
            rl.close();
            
            if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
                console.log('\n' + chalk.yellow('Pull cancelled'));
                process.exit(0);
            }
        }
        
        // Create YAML content with header
        const header = `# Environment Configuration File
# Pulled from AWS Secrets Manager
# Secret: ${options.secretName}
# Region: ${options.region}
# Date: ${new Date().toISOString()}
# 
# WARNING: This file contains secrets! Do not commit to version control.
# Add to .gitignore: ${options.output}

`;
        
        const yamlContent = createYamlContent(secretData);
        const fullContent = header + yamlContent.split('\n').slice(3).join('\n'); // Remove default header
        
        // Write to file
        writeFile(outputPath, fullContent);
        
        printStatus(`Configuration saved to '${options.output}'`, 'success');
        
        console.log(`\n${chalk.green.bold('Success!')} Environment configuration has been pulled`);
        console.log(`\n${chalk.yellow.bold('Security reminder:')}`);
        console.log(`  - Do not commit this file to version control`);
        console.log(`  - Add '${options.output}' to your .gitignore file`);
        console.log(`  - Consider adding pattern 'env.*.yml' to .gitignore`);
        
        console.log(`\n${chalk.cyan('Next steps:')}`);
        console.log(`  1. Edit '${options.output}' to make your changes`);
        console.log(`  2. Push changes back:`);
        console.log(chalk.cyan(`     one-env push --schema ${options.schema} --file ${options.output} --secret-name ${options.secretName} --region ${options.region}`));
        
    } catch (error: any) {
        const tips: string[] = [];
        
        if (error.message.includes('not found')) {
            tips.push('Check that the secret name and region are correct.');
            tips.push('Ensure you have AWS credentials configured.');
        } else if (error.message.includes('credentials')) {
            tips.push("Configure AWS credentials using 'aws configure' or environment variables.");
        } else if (error.message.includes('AccessDenied')) {
            tips.push('Ensure your AWS credentials have permission to read secrets.');
            tips.push('Required permission: secretsmanager:GetSecretValue');
        }
        
        console.error(`\n${chalk.red.bold('Error:')} ${error.message}\n`);
        tips.forEach(tip => {
            console.log(`${chalk.yellow('Tip:')} ${tip}`);
        });
        
        process.exit(1);
    }
}