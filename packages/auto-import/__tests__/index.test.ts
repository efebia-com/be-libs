import Fastify from 'fastify';
import fastifyAutoImport from '../src';


test('It should be able to get the routes correctly with default routes file', async () => {
    const fastify = Fastify();

    const routes: object[] = [];

    fastify.addHook('onRoute', (o) => {
        routes.push(o);
    })

    await fastify.register(fastifyAutoImport, {
        startingDirectory: __dirname,
        directory: 'fixtures/plugins'
    })


    expect(routes.length).toEqual(3);
    expect(routes).toEqual(expect.arrayContaining([expect.objectContaining({
        method: expect.stringMatching('GET'),
        path: expect.stringMatching('/test-1-routes')
    })]))
    expect(routes).toEqual(expect.arrayContaining([expect.objectContaining({
        method: expect.stringMatching('HEAD'),
        path: expect.stringMatching('/test-1-routes')
    })]))
    expect(routes).toEqual(expect.arrayContaining([expect.objectContaining({
        method: expect.stringMatching('HEAD'),
        path: expect.stringMatching('/test-1-routes/')
    })]))
})

test('It should be able to get the routes correctly with custom routes file', async () => {
    const fastify = Fastify();

    const routes: object[] = [];

    fastify.addHook('onRoute', (o) => {
        routes.push(o);
    })

    await fastify.register(fastifyAutoImport, {
        startingDirectory: __dirname,
        directory: 'fixtures/plugins',
        routeFile: 'index'
    })


    expect(routes.length).toEqual(3);
    expect(routes).toEqual(expect.arrayContaining([expect.objectContaining({
        method: expect.stringMatching('GET'),
        path: expect.stringMatching('/test-1-index')
    })]))
    expect(routes).toEqual(expect.arrayContaining([expect.objectContaining({
        method: expect.stringMatching('HEAD'),
        path: expect.stringMatching('/test-1-index')
    })]))
    expect(routes).toEqual(expect.arrayContaining([expect.objectContaining({
        method: expect.stringMatching('HEAD'),
        path: expect.stringMatching('/test-1-index/')
    })]))
})

test('Plugin can be encapsulated', async () => {
    const fastify = Fastify();

    const routes: object[] = [];

    fastify.addHook('onRoute', (o) => {
        routes.push(o);
    })

    await fastify.register(async (fastify, opts) => {
        await fastify.register(fastifyAutoImport, {
            startingDirectory: __dirname,
            directory: 'fixtures/plugins'
        })
    }, { prefix: '/test'})
    


    expect(routes.length).toEqual(3);
    expect(routes).toEqual(expect.arrayContaining([expect.objectContaining({
        method: expect.stringMatching('GET'),
        path: expect.stringMatching('/test/test-1-routes')
    })]))
    expect(routes).toEqual(expect.arrayContaining([expect.objectContaining({
        method: expect.stringMatching('HEAD'),
        path: expect.stringMatching('/test/test-1-routes')
    })]))
    expect(routes).toEqual(expect.arrayContaining([expect.objectContaining({
        method: expect.stringMatching('HEAD'),
        path: expect.stringMatching('/test/test-1-routes/')
    })]))
})