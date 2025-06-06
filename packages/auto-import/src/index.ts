import fp from 'fastify-plugin';
import { Globber, globFiles } from './globber.js';

const plugin = fp<Globber>(async (fastify, opts) => {
    const globbedFiles = await globFiles({
        ...opts,
        routeFile: opts.routeFile ?? 'routes',
        directory: opts.directory ?? 'src/plugins',
        log: opts.log || fastify.log,
        excludedDirectories: opts.excludedDirectories ?? []
    });

    await Promise.all(globbedFiles.map(async (globbedFile) => {
        await fastify.register(globbedFile);
    }));
}, {
    name: '@efebia/fastify-auto-import',
    fastify: '5.x'
});

export default plugin;
