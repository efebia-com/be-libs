import type { FastifyPluginAsync } from 'fastify';

const routes: FastifyPluginAsync = async (app) => {
  app.get('/', async () => ({ users: [] }));
  app.post('/', async (_request, reply) => reply.status(201).send({ created: true }));
};

export default routes;
