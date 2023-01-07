import yaml from 'js-yaml';
import EnvironmentClient from "./client";
import ProcessEnvStorageEnvironmentClient from "./processEnv";
import { EnvSchema } from "./utils";

const jsonProcessEnvKeyLoader = (key: string) => () => JSON.parse(process.env[key]!)

const yamlFileKeyLoader = (filePath: string) => () => yaml.load(filePath)

export {
    EnvironmentClient,
    ProcessEnvStorageEnvironmentClient,
    EnvSchema,
    jsonProcessEnvKeyLoader,
    yamlFileKeyLoader
};
