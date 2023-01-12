import { extendConfig } from 'hardhat/config';

import { packageName } from './constants';
import './task';
import './types';

extendConfig((config, userConfig) => {
    config.compileMonorepo = Object.assign({
        paths: [] as string[],
        path: `./${packageName}`,
        keep: false
    }, userConfig.compileMonorepo);
});