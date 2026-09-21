import type { FastifyPluginAsync } from 'fastify';

const routes: FastifyPluginAsync = async (app) => {
  app.get('/', async () => ({ things: [] }));
};

export default routes;
