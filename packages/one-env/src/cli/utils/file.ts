/**
 * File operations utilities for the environment CLI tool
 */

import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

/**
 * Resolves a path relative to the current working directory
 * @param relativePath - The path to resolve
 * @returns Absolute path
 */
export function resolvePath(relativePath: string): string {
    if (path.isAbsolute(relativePath)) {
        return relativePath;
    }
    
    // Resolve relative to current working directory
    return path.resolve(process.cwd(), relativePath);
}

/**
 * Loads and parses a YAML file
 * @param filePath - Path to the YAML file
 * @returns Parsed YAML content
 * @throws Error if file not found or invalid YAML
 */
export function loadYamlFile(filePath: string): any {
    try {
        const fileContents = fs.readFileSync(filePath, 'utf8');
        return yaml.load(fileContents);
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            throw new Error(`Environment file '${path.basename(filePath)}' not found`);
        }
        throw new Error(`Failed to read YAML file: ${error.message}`);
    }
}

/**
 * Writes content to a file
 * @param filePath - Path to write to
 * @param content - Content to write
 */
export function writeFile(filePath: string, content: string): void {
    fs.writeFileSync(filePath, content, 'utf8');
}

/**
 * Checks if a file exists
 * @param filePath - Path to check
 * @returns True if file exists
 */
export function fileExists(filePath: string): boolean {
    return fs.existsSync(filePath);
}

/**
 * Creates YAML content for environment configuration
 * @param envData - Environment configuration data
 * @returns Formatted YAML string
 */
export function createYamlContent(envData: Record<string, any>): string {
    // Use js-yaml to properly format the data
    const yamlContent = yaml.dump(envData, {
        indent: 2,
        lineWidth: 120,
        sortKeys: false, // Preserve the order from schema
        quotingType: '"',
        forceQuotes: false,
        noRefs: true
    });
    
    // Add header comment
    const header = '# Environment Configuration File\n# Generated from schema defaults - customize as needed\n\n';
    
    return header + yamlContent;
}