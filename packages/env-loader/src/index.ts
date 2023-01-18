import yaml from 'js-yaml';
import EnvironmentClient from "./client";
import ProcessEnvStorageEnvironmentClient from "./processEnv";
import { EnvSchema } from "./utils";

const jsonProcessEnvKeyLoader = (key: string) => () => JSON.parse(process.env[key]!)

const yamlFileKeyLoader = (yamlContent: string) => () => yaml.load(yamlContent)

export {
    EnvironmentClient,
    ProcessEnvStorageEnvironmentClient,
    EnvSchema,
    jsonProcessEnvKeyLoader,
    yamlFileKeyLoader
};
