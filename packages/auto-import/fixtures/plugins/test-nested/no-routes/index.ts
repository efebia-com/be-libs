import fp from "fastify-plugin";

export default fp(async (fastify) => {
  fastify.get("/test-nested-no-routes", async () => {
    return { ok: true };
  });
});
