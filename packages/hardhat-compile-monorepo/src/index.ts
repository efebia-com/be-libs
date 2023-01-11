import { extendConfig } from 'hardhat/config';

import { name } from '../package.json';

import './task';
import './types';

extendConfig((config, userConfig) => {
    config.compileMonorepo = Object.assign({
        paths: [] as string[],
        path: `./${name}`,
        keep: false
    }, userConfig.compileMonorepo);
});