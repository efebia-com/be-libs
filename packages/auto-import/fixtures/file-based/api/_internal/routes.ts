import type { FastifyPluginAsync } from 'fastify';

const routes: FastifyPluginAsync = async (app) => {
  app.get('/', async () => ({ internal: true }));
};

export default routes;
