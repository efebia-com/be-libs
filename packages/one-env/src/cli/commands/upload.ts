/**
 * Upload command implementation
 * Uploads environment configuration to AWS Secrets Manager
 */

import chalk from 'chalk';
import { UploadOptions } from '../types.js';
import { createSecretsManagerClient, createOrUpdateSecret, getSecretValue } from '../utils/aws.js';
import { resolvePath, loadYamlFile } from '../utils/file.js';
import { validateEnvData } from '../utils/validation.js';
import { printValidationResults, printStatus } from '../utils/formatting.js';
import { loadSchema, formatSchemaSource } from '../utils/schema-loader.js';
import readline from 'node:readline/promises';

/**
 * Handles the upload command
 * @param options - Command options
 */
export async function handleUploadCommand(options: UploadOptions): Promise<void> {
    // Configure AWS client
    const client = createSecretsManagerClient(options.region, options.profile);
    
    try {
        // Load schema dynamically
        printStatus(`Loading schema from ${formatSchemaSource(options.schema)}...`, 'info');
        const schema = await loadSchema(options.schema);
        
        // Load environment file
        printStatus(`Loading environment file '${options.file}'...`, 'info');
        const filePath = resolvePath(options.file);
        const envData = loadYamlFile(filePath);
        
        // Validate against schema first
        printStatus('Validating configuration against schema...', 'info');
        const validationResults = validateEnvData(envData, schema, options.file);
        
        if (!validationResults.success) {
            console.error(`\n${chalk.red.bold('Error:')} Configuration validation failed\n`);
            printValidationResults(validationResults);
            process.exit(1);
        }
        
        printStatus('Configuration is valid!', 'success');
        
        // Check if secret exists (for dry-run info)
        let secretExists = false;
        try {
            await getSecretValue(client, options.secretName);
            secretExists = true;
        } catch (error: any) {
            if (!error.message.includes('not found')) {
                throw error; // Re-throw if it's not a "not found" error
            }
        }
        
        // Dry-run mode
        if (options.dryRun) {
            console.log(`\n${chalk.blue.bold('DRY-RUN MODE:')} No changes will be made\n`);
            console.log(chalk.cyan('Secret Details:'));
            console.log(`  Name: ${options.secretName}`);
            console.log(`  Region: ${options.region}`);
            console.log(`  Environment: ${options.environment || 'Not specified'}`);
            console.log(`  Status: ${secretExists ? 'UPDATE existing secret' : 'CREATE new secret'}`);
            
            if (secretExists) {
                console.log(`\n${chalk.yellow('Note:')} Secret already exists and will be updated`);
            }
            
            console.log(`\n${chalk.cyan('Configuration to upload:')}`);
            console.log(JSON.stringify(envData, null, 2));
            
            return;
        }
        
        // Confirmation prompt (unless --force)
        if (!options.force) {
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            
            console.log(`\n${chalk.yellow.bold('Warning:')} You are about to ${secretExists ? 'UPDATE' : 'CREATE'} a secret in AWS Secrets Manager`);
            console.log(`  Secret: ${options.secretName}`);
            console.log(`  Region: ${options.region}`);
            if (options.environment) {
                console.log(`  Environment: ${options.environment}`);
            }
            
            const answer = await rl.question(`\nDo you want to continue? (yes/no): `);
            rl.close();
            
            if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
                console.log('\n' + chalk.yellow('Upload cancelled'));
                process.exit(0);
            }
        }
        
        // Upload to AWS
        printStatus(`${secretExists ? 'Updating' : 'Creating'} secret '${options.secretName}' in AWS Secrets Manager...`, 'info');
        
        const tags = options.environment ? [
            { Key: 'Environment', Value: options.environment },
            { Key: 'ManagedBy', Value: 'one-env' }
        ] : [
            { Key: 'ManagedBy', Value: 'one-env' }
        ];
        
        await createOrUpdateSecret(client, options.secretName, envData, tags);
        
        printStatus(`Secret '${options.secretName}' ${secretExists ? 'updated' : 'created'} successfully!`, 'success');
        
        console.log(`\n${chalk.green.bold('Success!')} Environment configuration has been uploaded`);
        console.log(`\nYou can validate it with:`);
        console.log(chalk.cyan(`  one-env validate-aws --schema ${options.schema} --secret-name ${options.secretName} --region ${options.region}`));
        
    } catch (error: any) {
        const tips: string[] = [];
        
        if (error.message.includes('credentials')) {
            tips.push("Configure AWS credentials using 'aws configure' or environment variables.");
        } else if (error.message.includes('AccessDenied')) {
            tips.push('Ensure your AWS credentials have permission to create/update secrets.');
            tips.push('Required permissions: secretsmanager:CreateSecret, secretsmanager:UpdateSecret, secretsmanager:TagResource');
        }
        
        console.error(`\n${chalk.red.bold('Error:')} ${error.message}\n`);
        tips.forEach(tip => {
            console.log(`${chalk.yellow('Tip:')} ${tip}`);
        });
        
        process.exit(1);
    }
}