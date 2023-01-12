import { extendConfig } from 'hardhat/config';
const name = '@efebia/hardhat-compile-monorepo'

import './task';
import './types';

extendConfig((config, userConfig) => {
    config.compileMonorepo = Object.assign({
        paths: [] as string[],
        path: `./${name}`,
        keep: false
    }, userConfig.compileMonorepo);
});