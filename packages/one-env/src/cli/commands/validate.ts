/**
 * Validate command implementation
 * Validates existing environment files against the schema
 */
import chalk from 'chalk';
import { ValidateOptions } from '../types.js';
import { resolvePath, loadYamlFile } from '../utils/file.js';
import { validateEnvData } from '../utils/validation.js';
import { printValidationResults, formatJsonOutput, formatJsonError, printStatus } from '../utils/formatting.js';
import { loadSchema, formatSchemaSource } from '../utils/schema-loader.js';

/**
 * Handles the validate command
 * @param options - Command options
 */
export async function handleValidateCommand(options: ValidateOptions): Promise<void> {
    try {
        // Load schema dynamically
        if (!options.json) {
            printStatus(`Loading schema from ${formatSchemaSource(options.schema)}...`, 'info');
        }
        
        const schema = await loadSchema(options.schema);
        
        // Load YAML file
        if (!options.json) {
            printStatus(`Loading environment file '${options.file}'...`, 'info');
        }
        
        const filePath = resolvePath(options.file);
        const envData = loadYamlFile(filePath);
        
        // Validate against schema
        const results = validateEnvData(envData, schema, options.file);
        
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
            const jsonError = formatJsonError(error, 'file_error', options.file);
            console.log(JSON.stringify(jsonError, null, 2));
        } else {
            const tips: string[] = [];
            
            if (error.message.includes('not found')) {
                tips.push("Make sure you're running this from the backend directory.");
                tips.push(`Current directory: ${process.cwd()}`);
            }
            
            console.error(`\n${chalk.red.bold('Error:')} ${error.message}\n`);
            tips.forEach(tip => {
                console.log(`${chalk.yellow('Tip:')} ${tip}`);
            });
        }
        
        process.exit(1);
    }
}
