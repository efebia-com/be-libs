import type { FastifyPluginAsync } from 'fastify';

const routes: FastifyPluginAsync = async (app) => {
  app.get('/', async () => ({ reports: [] }));
  app.get('/extra', async () => ({ extra: true }));
};

export default routes;
