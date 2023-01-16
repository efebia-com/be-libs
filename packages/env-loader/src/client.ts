import { ConvertToCamelCase, EnvSchema, EnvValues, convertToCamelCase } from './utils';

export type EnvironmentClientOptions = {
    storage: object;
    syncKeyLoaders?: (() => Record<string, unknown>)[];
    asyncKeyLoaders?: (() => Promise<Record<string, unknown>>)[];
    loadSyncKeysAtStartup?: boolean;
}

export default class EnvironmentClient {
    storage: EnvironmentClientOptions['storage'];
    syncKeyLoaders: EnvironmentClientOptions['syncKeyLoaders'];
    asyncKeyLoaders: EnvironmentClientOptions['asyncKeyLoaders'];

    constructor(opts?: Partial<EnvironmentClientOptions>) {
        const options = Object.assign({
            storage: {},
            syncKeyLoaders: [],
            asyncKeyLoaders: [],
            loadSyncKeysAtStartup: true
        }, opts);
        this.storage = options.storage;
        this.syncKeyLoaders = options.syncKeyLoaders;
        this.asyncKeyLoaders = options.asyncKeyLoaders;
        if (options.loadSyncKeysAtStartup) {
            this.loadSyncKeys();
        }
    }

    async loadAsyncKeys() {
        if (!this.asyncKeyLoaders) return;
        const loadedKeys = await Promise.all(this.asyncKeyLoaders.map(keyLoader => keyLoader()));
        const keysObject = loadedKeys.reduce((acc, curr) => ({
            ...acc,
            ...curr
        }), {});
        Object.entries(keysObject).forEach(([key, value]) => this.setEnv(key, value))
    }

    loadSyncKeys() {
        if (!this.syncKeyLoaders) return;
        const loadedKeys = this.syncKeyLoaders.map(keyLoader => keyLoader());
        const keysObject = loadedKeys.reduce((acc, curr) => ({
            ...acc,
            ...curr
        }), {});
        Object.entries(keysObject).forEach(([key, value]) => this.setEnv(key, value))
    }

    async loadKeys() {
        await this.loadAsyncKeys();
        this.loadSyncKeys();
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

    getOptionalEnv<Key extends keyof EnvSchema, Keys extends Key[] = Key[]>(...listKeys: Keys): Partial<EnvValues<Keys>> {
        let values: Partial<
            EnvSchema & {
                [key in keyof EnvSchema as key extends `${string}_${string}`
                    ? ConvertToCamelCase<key>
                    : never]: EnvSchema[key];
            }
        > = {};
        for (const key of listKeys) {
            try {
                const value = this.getKey(key)
                values = {
                    ...values,
                    [key]: value,
                    [convertToCamelCase(key)]: value
                }
            } catch {}
        }
        return values as any;
    };

    getKey<Key extends keyof EnvSchema>(key: Key) {
        if (!Object.hasOwn(this.storage, key)) throw Error(`@efebia/env-loader: Missing environment key ${key}`);
        return (this.storage as any)[key];
    }
}