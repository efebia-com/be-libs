import type { FastifyPluginAsync } from 'fastify';

const routes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { userId: string } }>('/', async (request) => ({ userId: request.params.userId }));
  app.delete('/', async (_request, reply) => reply.status(204).send());
};

export default routes;
