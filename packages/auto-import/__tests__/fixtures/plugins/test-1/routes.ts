export default async function(fastify) {
    await fastify.register(async (fastify) => {
        await fastify.get('/', (_, reply) => reply.status(200).send({ message: 'ok' }))
    }, { prefix: '/test-1-routes' })
}