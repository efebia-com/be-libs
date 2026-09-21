import type { FastifyPluginAsync } from 'fastify';

const routes: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', async (request, reply) => {
    if (request.headers['x-admin'] !== '1') return reply.status(403).send({ error: 'forbidden' });
  });
  app.get('/', async () => ({ admin: true }));
};

export default routes;
