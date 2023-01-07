import EnvironmentClient, { EnvironmentClientOptions } from "./client";
import { EnvSchema } from "./utils";

const tryParseJSON = (value: string) => {
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
}

const tryParseInt = (value: string) => {
    if (/^\d+$/.test(value)) return parseInt(value);
    return null;
}

const tryParseFloat = (value: string) => {
    try {
        return parseFloat(value);
    } catch {
        return null;
    }
}

const tryParseBoolean = (value: string) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return null
}

const tryParseDate = (value: string) => {
    const parsed = Date.parse(value);
    if (isNaN(parsed)) return null;
    return new Date(parsed);
}

const parseValue = (value: string) => {
    let parsed = tryParseJSON(value);
    if (parsed !== null) return parsed;
    parsed = tryParseInt(value);
    if (parsed !== null) return parsed;
    parsed = tryParseFloat(value);
    if (parsed !== null) return parsed;
    parsed = tryParseBoolean(value);
    if (parsed !== null) return parsed;
    parsed = tryParseDate(value);
    if (parsed !== null) return parsed;
    return value;
}

export default class ProcessEnvStorageEnvironmentClient extends EnvironmentClient {
    constructor(opts?: Partial<Omit<EnvironmentClientOptions, 'storage'>>) {
        super({
            ...opts,
            storage: process.env
        })
    }

    setEnv(key: string, value: unknown) {
        this.storage[key] = typeof value === 'object' ? JSON.stringify(value) : value
    }

    getKey<Key extends keyof EnvSchema>(key: Key) {
        const anyStorage: any = this.storage;
        if (!Object.hasOwn(this.storage, key)) throw new Error(`@efebia/env-loader: Missing environment key ${key}`);
        if (anyStorage[key].trim() === '') throw new Error(`@efebia/env-loader: ${key} is empty`)
        return parseValue(anyStorage[key])
    }
}