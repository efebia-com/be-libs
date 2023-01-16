#!/usr/bin/env node
import { readFile } from 'fs/promises';
import * as yaml from 'js-yaml';
import * as path from 'path';
import prettier from 'prettier';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { build } from './generateDeclaration.js';

const parsedArgs = hideBin(process.argv);

yargs(parsedArgs)
    .command(
        '$0 <input-file> [--prettier-file prettier-file-URI] [--out-file out-file-URI] [--dry-run] [--interface-name name]',
        'Build TS interface from YAML file',
        (args) => {
            return args
                .positional('input-file', {
                    alias: 'i',
                    type: 'string',
                    description: 'YAML Input file',
                    demandOption: true
                })
                .option('prettier-file', {
                    alias: 'p',
                    type: 'string',
                    description: 'Prettier configuration file',
                })
                .option('out-file', {
                    alias: 'o',
                    type: 'string',
                    description: 'Output file',
                    default: path.join(process.cwd(), 'declaration.d.ts'),
                })
                .option('dry-run', {
                    alias: 'd',
                    type: 'boolean',
                    description: 'Perform a dry run',
                    default: false,
                })
                .option('interface-name', {
                    alias: 'int',
                    type: 'string',
                    description: 'Define interface name',
                    default: 'Declaration',
                })
                .strict();
        },
        async (argv) => {
            const fileVal = await readFile(argv.inputFile, {
                encoding: 'utf-8',
            });
            const parsedYaml = yaml.load(fileVal);

            let prettierConfig: Partial<prettier.Config> = {
                printWidth: 80,
                tabWidth: 4,
                semi: true,
                singleQuote: true,
                endOfLine: 'lf',
                trailingComma: 'es5',
                bracketSpacing: true,
                arrowParens: 'always',
                parser: 'typescript',
            };
            if (argv.prettierFile) {
                const resolvedConfig = await prettier.resolveConfig(
                    argv.prettierFile
                );
                if (resolvedConfig) {
                    prettierConfig = resolvedConfig;
                }
            }

            await build(parsedYaml as object, {
                interfaceName: argv.interfaceName,
                outFile: argv.outFile,
                prettierConfig,
                dryRun: argv.dryRun,
            });
        }
    )
    .parse();
