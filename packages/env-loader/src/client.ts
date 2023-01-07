import { ConvertToCamelCase, EnvSchema, EnvValues, convertToCamelCase } from './utils';

export type EnvironmentClientOptions = {
    storage: object;
    keyLoaders: (() => Record<string, unknown> | Promise<Record<string, unknown>>)[];
}

export default class EnvironmentClient {
    storage: EnvironmentClientOptions['storage'];
    keyLoaders: EnvironmentClientOptions['keyLoaders'];

    constructor(opts?: Partial<EnvironmentClientOptions>) {
        const options = Object.assign({
            storage: {},
            keyLoaders: []
        }, opts);
        this.storage = options.storage;
        this.keyLoaders = options.keyLoaders;
    }

    async loadKeys() {
        const loadedKeys = await Promise.all(this.keyLoaders.map(keyLoader => keyLoader()));
        const keysObject = loadedKeys.reduce((acc, curr) => ({
            ...acc,
            ...curr
        }), {});
        Object.entries(keysObject).forEach(([key, value]) => this.setEnv(key, value))
    }

    setEnv(key: string, value: unknown) {
        this.storage[key] = value;
    }

    getEnv<Key extends keyof EnvSchema, Keys extends Key[] = Key[]>(...listKeys: Keys): EnvValues<Keys> {
        let values: Partial<
            EnvSchema & {
                [key in keyof EnvSchema as key extends `${string}_${string}`
                    ? ConvertToCamelCase<key>
                    : never]: EnvSchema[key];
            }
        > = {};
        for (const key of listKeys) {
            const value = this.getKey(key)
            values = {
                ...values,
                [key]: value,
                [convertToCamelCase(key)]: value
            }
        }
        return values as any;
    };

    getKey<Key extends keyof EnvSchema>(key: Key) {
        if (!Object.hasOwn(this.storage, key)) throw Error(`@efebia/env-loader: Missing environment key ${key}`);
        return (this.storage as any)[key];
    }
}