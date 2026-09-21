import fp from 'fastify-plugin';
import { Globber, globFiles, resolvePluginsDirectory } from './globber.js';
import { registerRoutes, scanRoutes } from './router.js';

const plugin = fp<Globber>(async (fastify, opts) => {
    if (opts.fileBasedRouting) {
        const directory = opts.directory ?? 'src/plugins';
        const { packageType, pluginsDirectory } = await resolvePluginsDirectory({ ...opts, directory });
        const routes = await scanRoutes(pluginsDirectory, {
            routeFile: opts.routeFile ?? 'routes',
            packageType,
            excludedDirectories: opts.excludedDirectories ?? [],
            log: opts.log || fastify.log,
        });
        await registerRoutes(fastify, routes);
        return;
    }

    const globbedFiles = await globFiles({
        ...opts,
        routeFile: opts.routeFile ?? 'routes',
        directory: opts.directory ?? 'src/plugins',
        log: opts.log || fastify.log,
        excludedDirectories: opts.excludedDirectories ?? [],
        recursive: opts.recursive ?? false
    });

    await Promise.all(globbedFiles.map(async (globbedFile) => {
        await fastify.register(globbedFile);
    }));
}, {
    name: '@efebia/fastify-auto-import',
    fastify: '5.x'
});

export default plugin;
