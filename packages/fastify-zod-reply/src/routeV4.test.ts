import assert from "assert";
import fastify from "fastify";
import { describe, it } from "node:test";
import z from "zod/v4";
import responsesPlugin from "./index";
import { createRouteV4, routeV4 } from "./routeV4";

describe("routeV4", () => {
  it("should be able to return a 204 without any content", async () => {
    const app = fastify();
    await app.register(responsesPlugin, { statusCodes: { noContent: { payload: undefined, statusCode: 204 } } });
    app.get(
      "/",
      routeV4({ Reply: z.object({ 204: z.undefined() }) }, async (req, reply) => {
        return reply.noContent();
      })
    );
    const response = await app.inject({
      method: "GET",
      url: "/",
    });

    assert.equal(response.body, "");
    assert.equal(response.headers["content-type"], undefined);
  });
  it("should fail if you send a 204 with content", async () => {
    const app = fastify();
    await app.register(responsesPlugin, { statusCodes: { noContent: { payload: undefined, statusCode: 204 } } });

    app.get(
      "/",
      //@ts-ignore
      routeV4({ Reply: z.object({ 204: z.undefined() }) }, async (_req, reply) => {
        return reply.noContent({ test: "test" });
      })
    );
    const response = await app.inject({
      method: "GET",
      url: "/",
    });

    assert.equal(response.statusCode, 500);
  });
  it("should be able to return a 200 with content", async () => {
    const app = fastify();
    await app.register(responsesPlugin, { statusCodes: { noContent: { payload: undefined, statusCode: 204 } } });
    app.get(
      "/",
      routeV4({ Reply: z.object({ 200: z.object({ id: z.string() }) }) }, async (req, reply) => {
        return reply.ok({ id: "test" });
      })
    );
    const response = await app.inject({
      method: "GET",
      url: "/",
    });

    assert.equal(response.body, JSON.stringify({ id: "test" }));
    assert.deepStrictEqual(response.json(), { id: "test" });
    assert.equal(response.headers["content-type"], "application/json; charset=utf-8");
  });
  it("should throw an error if returning 200 but it is not in response schema", async () => {
    const app = fastify();
    await app.register(responsesPlugin, { statusCodes: { noContent: { payload: undefined, statusCode: 204 } } });
    app.get(
      "/",
      routeV4({ Reply: z.object({ 200: z.object({ id: z.string() }) }) }, async (req, reply) => {
        return reply.created({ id: "test" });
      })
    );
    const response = await app.inject({
      method: "GET",
      url: "/",
    });

    assert.deepStrictEqual(response.json(), {
      statusCode: 500,
      error: "Internal Server Error",
      message: "Reply schema of: / does not have the specified status code: 201.",
    });
    assert.equal(response.headers["content-type"], "application/json; charset=utf-8");
  });
  it("should not throw an error if returning 400 but it is not in response schema and return as-is", async () => {
    const app = fastify();
    await app.register(responsesPlugin, { statusCodes: { noContent: { payload: undefined, statusCode: 204 } } });
    app.get(
      "/",
      routeV4({ Reply: z.object({ 200: z.object({ id: z.string() }) }) }, async (req, reply) => {
        return reply.badRequest({ id: "test" });
      })
    );
    const response = await app.inject({
      method: "GET",
      url: "/",
    });

    assert.deepStrictEqual(response.json(), { id: "test" });
    assert.equal(response.headers["content-type"], "application/json; charset=utf-8");
  });
  describe("strict", () => {
    const exampleSchema = z.object({ id: z.string() });
    it("strict true local mode should add additionalProperties: false", () => {
      const value = routeV4(
        {
          Reply: z.object({ 200: exampleSchema }),
          Body: exampleSchema,
          Params: exampleSchema,
          Query: exampleSchema,
        },
        async (req, reply) => {
          return reply.ok({ id: "test" });
        },
        { strict: true }
      );
      assert.equal((value.schema?.body as any).additionalProperties, false);
      assert.equal((value.schema?.params as any).additionalProperties, false);
      assert.equal((value.schema?.querystring as any).additionalProperties, false);
    });
    it("strict false local mode should not add additionalProperties", () => {
      const value = routeV4(
        {
          Reply: z.object({ 200: exampleSchema }),
          Body: exampleSchema,
          Params: exampleSchema,
          Query: exampleSchema,
        },
        async (req, reply) => {
          return reply.ok({ id: "test" });
        },
        { strict: false }
      );
      assert.equal((value.schema?.body as any).additionalProperties, undefined);
      assert.equal((value.schema?.params as any).additionalProperties, undefined);
      assert.equal((value.schema?.querystring as any).additionalProperties, undefined);
    });
    for (const t of ["body", "params", "query"]) {
      const allFields = ["body", "params", "querystring"];
      it(`strict true for ${t} local mode should add additionalProperties only to ${t}`, () => {
        const value = routeV4(
          {
            Reply: z.object({ 200: exampleSchema }),
            Body: exampleSchema,
            Params: exampleSchema,
            Query: exampleSchema,
          },
          async (req, reply) => {
            return reply.ok({ id: "test" });
          },
          { strict: { body: false, headers: false, params: false, query: false, [t]: true } }
        );
        const field = t === "query" ? "querystring" : t;
        assert.equal((value.schema?.[field] as any).additionalProperties, false);
        allFields
          .filter((u) => u !== field)
          .forEach((f) => assert.equal((value.schema?.[f] as any).additionalProperties, undefined));
      });
    }
    for (const t of [true, false]) {
      it(`local option should overcome global options (global: ${t}, local: ${!t})`, () => {
        const newRoute = createRouteV4({ strict: t });
        const value = newRoute(
          {
            Reply: z.object({ 200: exampleSchema }),
            Body: exampleSchema,
            Params: exampleSchema,
            Query: exampleSchema,
          },
          async (req, reply) => {
            return reply.ok({ id: "test" });
          },
          { strict: !t }
        );
        assert.equal((value.schema?.body as any).additionalProperties, t ? undefined : false);
        assert.equal((value.schema?.params as any).additionalProperties, t ? undefined : false);
        assert.equal((value.schema?.querystring as any).additionalProperties, t ? undefined : false);
      });
    }
  });
});
