/**
 * Generate command implementation
 * Creates new environment files with default values from schema
 */

import chalk from 'chalk';
import { GenerateOptions } from '../types.js';
import { resolvePath, fileExists, writeFile, createYamlContent } from '../utils/file.js';
import { printSuccess, printError, printStatus } from '../utils/formatting.js';
import { loadSchema, extractSchemaDefaults, formatSchemaSource } from '../utils/schema-loader.js';

/**
 * Handles the generate command
 * @param options - Command options
 */
export async function handleGenerateCommand(options: GenerateOptions): Promise<void> {
    const outputPath = resolvePath(options.output);
    
    try {
        // Check if file exists and prompt for confirmation
        if (fileExists(outputPath) && !options.force) {
            console.log(chalk.yellow('Warning:') + ` File '${options.output}' already exists.`);
            console.log('Use --force to overwrite, or specify a different output file.');
            process.exit(1);
        }
        
        // Load schema dynamically
        printStatus(`Loading schema from ${formatSchemaSource(options.schema)}...`, 'info');
        const schema = await loadSchema(options.schema);
        
        printStatus('Generating environment file from schema defaults...', 'info');
        
        // Generate default values from schema
        const envData = extractSchemaDefaults(schema);
        
        // Create YAML content with proper formatting and comments
        const yamlContent = createYamlContent(envData);
        
        // Write to file
        writeFile(outputPath, yamlContent);
        
        // Show success message with details
        const fieldCount = Object.keys(envData).length;
        printSuccess('generated', {
            'File': options.output,
            'Location': outputPath,
            'Fields generated': fieldCount,
        });
        
        // Show next steps
        console.log(`\n${chalk.yellow('Next steps:')}`);
        console.log(`1. Review and customize the generated values`);
        console.log(`2. Update sensitive fields like API keys and secrets`);
        console.log(`3. Validate with: ${chalk.cyan('yarn env:validate')}`);
        
    } catch (error: any) {
        const tips: string[] = [];
        
        if (error.code === 'ENOENT') {
            tips.push("Make sure you're running this from the backend directory.");
        } else if (error.message.includes('permission')) {
            tips.push('Check file permissions for the output directory.');
        }
        
        printError(error, tips);
        process.exit(1);
    }
}