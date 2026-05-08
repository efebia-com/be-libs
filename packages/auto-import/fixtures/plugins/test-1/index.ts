import fp from 'fastify-plugin';

export default fp(async (fastify) => {
    await fastify.register(async (fastify) => {
        fastify.get('/', (_, reply) => reply.status(200).send({ message: 'ok' }))
    }, { prefix: '/test-1-index' })
})