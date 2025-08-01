#!/usr/bin/env node

/**
 * Environment Tool - Unified TypeScript CLI for Environment Management
 *
 * This unified tool provides comprehensive environment management capabilities:
 * - generate: Creates new environment files with default values from schema
 * - validate: Validates existing environment files against the schema
 * - validate-aws: Validates AWS Secrets Manager secrets against the schema
 * - pull: Pulls environment configuration from AWS Secrets Manager
 * - push: Pushes environment configuration to AWS Secrets Manager
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { handleGenerateCommand } from './commands/generate.js';
import { handleValidateCommand } from './commands/validate.js';
import { handleValidateAwsCommand } from './commands/validate-aws.js';
import { handlePushCommand } from './commands/push.js';
import { handlePullCommand } from './commands/pull.js';

// ============================================================================
// MAIN CLI SETUP
// ============================================================================

const program = new Command();

program
    .name('env-tool')
    .description('Unified CLI for Environment Management')
    .version('1.0.0');

// Generate command
program
    .command('generate')
    .description('Generate new environment file with default values from schema')
    .requiredOption('-s, --schema <path>', 'Path to schema file (TypeScript or JavaScript)')
    .option('-o, --output <file>', 'Output file name', 'env.local.yml')
    .option('-f, --force', 'Overwrite existing file without confirmation', false)
    .action(handleGenerateCommand);

// Validate command
program
    .command('validate')
    .description('Validate existing environment file against schema')
    .requiredOption('-s, --schema <path>', 'Path to schema file (TypeScript or JavaScript)')
    .option('--file <filename>', 'Path to the environment file', 'env.local.yml')
    .option('--json', 'Output results in JSON format', false)
    .action(handleValidateCommand);

// Validate AWS command
program
    .command('validate-aws')
    .description('Validate AWS Secrets Manager secrets against schema')
    .requiredOption('-s, --schema <path>', 'Path to schema file (TypeScript or JavaScript)')
    .option('--secret-name <name>', 'Name of the secret in AWS Secrets Manager', 'envs')
    .option('--region <region>', 'AWS region', process.env['AWS_REGION'] || 'eu-west-1')
    .option('--profile <profile>', 'AWS profile to use (optional)')
    .option('--json', 'Output results in JSON format', false)
    .action(handleValidateAwsCommand);

// Pull command
program
    .command('pull')
    .description('Pull environment configuration from AWS Secrets Manager')
    .requiredOption('-s, --schema <path>', 'Path to schema file (TypeScript or JavaScript)')
    .option('--secret-name <name>', 'Name of the secret in AWS Secrets Manager', 'envs')
    .option('--output <file>', 'Output file name', 'env.pulled.yml')
    .option('--region <region>', 'AWS region', process.env['AWS_REGION'] || 'eu-west-1')
    .option('--profile <profile>', 'AWS profile to use (optional)')
    .option('--force', 'Overwrite existing file without confirmation', false)
    .action(handlePullCommand);

// Push command
program
    .command('push')
    .description('Push environment configuration to AWS Secrets Manager')
    .requiredOption('-s, --schema <path>', 'Path to schema file (TypeScript or JavaScript)')
    .requiredOption('--file <path>', 'Path to the environment file to push')
    .option('--secret-name <name>', 'Name of the secret in AWS Secrets Manager', 'envs')
    .option('--region <region>', 'AWS region', process.env['AWS_REGION'] || 'eu-west-1')
    .option('--profile <profile>', 'AWS profile to use (optional)')
    .option('--environment <env>', 'Environment tag (e.g., dev, staging, prod)')
    .option('--dry-run', 'Preview what would be pushed without making changes', false)
    .option('--force', 'Skip confirmation prompts', false)
    .action(handlePushCommand);

// Check dependencies before running
try {
    await import('js-yaml');
} catch (error) {
    console.error(`\n${chalk.red('Error:')} js-yaml package is not installed.`);
    console.error(`Run: ${chalk.cyan('yarn add js-yaml')}\n`);
    process.exit(1);
}

// Run the CLI
program.parse();