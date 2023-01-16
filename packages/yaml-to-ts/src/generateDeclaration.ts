import { writeFile } from 'fs/promises';
import * as prettier from 'prettier';

export type Declaration =
    | string
    | { type: 'array'; value: Declaration }
    | { [key: string]: any };

/**
 * Generate the declaration object based on a JS object
 * @param currentValue value
 * @returns declaration object
 */
export const generateDeclaration = (currentValue: any): Declaration => {
    if (typeof currentValue !== 'object') return typeof currentValue;

    // If the value is an array, then generate an object containing the definitions
    // of the first element
    if (Array.isArray(currentValue)) {
        return {
            type: 'array',
            value: generateDeclaration(currentValue[0]),
        };
    }

    // If the value is an object, then reduce it to an object
    return Object.entries(currentValue).reduce((acc, [key, value]) => {
        acc[key] = generateDeclaration(value);
        return acc;
    }, {});
};

export type StringifyKeyValue = {
    /** Key, can be undefined */
    k?: string;
    /** Value that is always a string */
    v: string;
};

export type StringifyOptions = {
    /** Add curly brackets around the value */
    bracketsAround?: boolean;
};

/**
 *
 * @param keyValue Object containing key and value
 * @param opts Options
 * @returns
 */
const stringify = (
    keyValue: StringifyKeyValue,
    opts: StringifyOptions = { bracketsAround: true }
) => {
    if (keyValue.k) {
        if (opts.bracketsAround) return `${keyValue.k}: {\n${keyValue.v}\n}`;
        return `${keyValue.k}: ${keyValue.v}`;
    }

    if (opts.bracketsAround) return `{\n${keyValue.v}\n}`;
    return keyValue.v;
};

/**
 * Generate a complete string declaration, created with {@link generateDeclaration}
 * @param value value
 * @param key key
 * @returns a complete string declaration of a JS Object, created with {@link generateDeclaration}
 */
const generateStringDeclaration = (value: string | object, key?: string) => {
    if (typeof value !== 'object')
        return stringify(
            { k: key, v: value.replace("'", '') },
            { bracketsAround: false }
        );

    // The value created is an array
    if (Object.hasOwn(value, 'type') && value['type'] === 'array') {
        return stringify(
            { v: `${generateStringDeclaration(value['value'])}[]`, k: key },
            { bracketsAround: false }
        );
    }

    const insideKeys = Object.entries(value)
        .map(([k, v]) => generateStringDeclaration(v, k))
        .join(';\n');

    return stringify({ k: key, v: insideKeys });
};

type BuildConfig = {
    prettierConfig: prettier.Config;
    outFile: string;
    interfaceName: string;
    dryRun: boolean;
};

/**
 * Build the declaration file
 */
export const build = async (jsonObj: object, configs: BuildConfig) => {
    const objectInterfaceDeclaration = generateDeclaration(jsonObj);

    const stringDeclaration = generateStringDeclaration(
        objectInterfaceDeclaration
    );

    const typescriptDeclaration = `export interface ${configs.interfaceName} ${stringDeclaration}`;

    const formatted = prettier.format(
        typescriptDeclaration,
        configs.prettierConfig
    );

    if (configs.dryRun) {
        console.log(formatted);
        return;
    }
    await writeFile(
        configs.outFile,
        prettier.format(typescriptDeclaration, configs.prettierConfig),
        {
            encoding: 'utf-8',
        }
    );
};
