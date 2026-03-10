import assert from "assert";
import fastify from "fastify";
import { describe, it } from "node:test";
import z from "zod/v4";
import responsesPlugin from "./index";
import { createRouteV4, routeV4 } from "./routeV4";

describe("routeV4", () => {
  it("should be able to return a 204 without any content", async () => {
    const app = fastify();
    await app.register(responsesPlugin);
    app.get(
      "/",
      routeV4({ Reply: z.object({ 204: z.null() }) }, async (req, reply) => {
        return reply.noContent();
      }),
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
    await app.register(responsesPlugin);

    app.get(
      "/",
      routeV4({ Reply: z.object({ 204: z.null() }) }, async (_req, reply) => {
        //@ts-expect-error
        return reply.noContent({ test: "test" });
      }),
    );
    const response = await app.inject({
      method: "GET",
      url: "/",
    });

    assert.equal(response.statusCode, 500);
  });
  it("should throw an error when sending default reply.ok against a 200 schema with content", async () => {
    const app = fastify();
    await app.register(responsesPlugin);
    app.get(
      "/",
      routeV4(
        {
          Reply: z.object({
            200: z.object({ id: z.string() }),
          }),
        },
        async (req, reply) => {
          //@ts-expect-error
          return reply.ok();
        },
      ),
    );
    const response = await app.inject({
      method: "GET",
      url: "/",
    });

    assert.equal(response.statusCode, 500);
  });
  it("should be able to return a 200 with content", async () => {
    const app = fastify();
    await app.register(responsesPlugin);
    app.get(
      "/",
      routeV4(
        {
          Reply: z.object({
            200: z.object({ id: z.string() }),
          }),
        },
        async (req, reply) => {
          return reply.ok({ id: "test" });
        },
      ),
    );
    const response = await app.inject({
      method: "GET",
      url: "/",
    });

    assert.equal(response.body, JSON.stringify({ id: "test" }));
    assert.deepStrictEqual(response.json(), { id: "test" });
    assert.equal(response.headers["content-type"], "application/json; charset=utf-8");
  });

  it("should throw an error if returning 201 but it is not in response schema", async () => {
    const app = fastify();
    await app.register(responsesPlugin);
    app.get(
      "/",
      routeV4(
        { Reply: z.object({ 200: z.object({ id: z.string() }) }) },
        //@ts-expect-error
        async (req, reply) => {
          return reply.created({ id: "test" });
        },
      ),
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
    await app.register(responsesPlugin);
    app.get(
      "/",
      routeV4(
        {
          Reply: z.object({
            200: z.object({ id: z.string() }),
          }),
        },
        async (req, reply) => {
          throw reply.badRequest("quattrocento");
        },
      ),
    );
    const response = await app.inject({
      method: "GET",
      url: "/",
    });

    assert.deepStrictEqual(response.json(), { statusCode: 400, error: "Bad Request", message: "quattrocento" });
    assert.equal(response.headers["content-type"], "application/json; charset=utf-8");
  });

  it("should allow reply.ok() with no args when 200 is not in the schema", async () => {
    const app = fastify();
    await app.register(responsesPlugin);
    app.get(
      "/",
      routeV4({ Reply: z.object({ 204: z.null() }) }, async (_req, reply) => {
        // 200 is not in schema, so ok() without args should be allowed at type level
        // but at runtime routeV4 rejects success codes not in the schema
        return reply.ok();
      }),
    );
    const response = await app.inject({ method: "GET", url: "/" });
    assert.equal(response.statusCode, 500);
  });

  it("should type-error when calling badRequest() with no args and 400 is in the schema", async () => {
    const app = fastify();
    await app.register(responsesPlugin);
    app.get(
      "/",
      routeV4(
        {
          Reply: z.object({
            200: z.object({ id: z.string() }),
            400: z.object({ reason: z.string() }),
          }),
        },
        async (_req, reply) => {
          //@ts-expect-error
          throw reply.badRequest();
        },
      ),
    );
    const response = await app.inject({ method: "GET", url: "/" });
    assert.equal(response.statusCode, 500);
  });

  it("should allow badRequest() with no args when 400 is not in the schema", async () => {
    const app = fastify();
    await app.register(responsesPlugin);
    app.get(
      "/",
      routeV4({ Reply: z.object({ 200: z.object({ id: z.string() }) }) }, async (_req, reply) => {
        throw reply.badRequest();
      }),
    );
    const response = await app.inject({ method: "GET", url: "/" });
    assert.equal(response.statusCode, 400);
    assert.deepStrictEqual(response.json(), { message: "badRequest" });
  });

  it("should validate badRequest payload against 400 schema when defined", async () => {
    const app = fastify();
    await app.register(responsesPlugin);
    app.get(
      "/",
      routeV4(
        {
          Reply: z.object({
            200: z.object({ id: z.string() }),
            400: z.object({ reason: z.string() }),
          }),
        },
        async (_req, reply) => {
          return reply.badRequest({ reason: "invalid input" });
        },
      ),
    );
    const response = await app.inject({ method: "GET", url: "/" });
    assert.equal(response.statusCode, 400);
    assert.deepStrictEqual(response.json(), { reason: "invalid input" });
  });

  it("should type-error when calling created() with wrong payload shape", async () => {
    const app = fastify();
    await app.register(responsesPlugin);
    app.get(
      "/",
      routeV4({ Reply: z.object({ 201: z.object({ name: z.string() }) }) }, async (_req, reply) => {
        //@ts-expect-error - payload does not match 201 schema
        return reply.created({ id: "wrong-field" });
      }),
    );
    const response = await app.inject({ method: "GET", url: "/" });
    assert.equal(response.statusCode, 500);
  });

  it("should return 201 with valid payload matching schema", async () => {
    const app = fastify();
    await app.register(responsesPlugin);
    app.get(
      "/",
      routeV4({ Reply: z.object({ 201: z.object({ name: z.string() }) }) }, async (_req, reply) => {
        return reply.created({ name: "alice" });
      }),
    );
    const response = await app.inject({ method: "GET", url: "/" });
    assert.equal(response.statusCode, 201);
    assert.deepStrictEqual(response.json(), { name: "alice" });
  });

  it("should type-error when calling notFound with wrong message when 404 schema has specific message", async () => {
    const app = fastify();
    await app.register(responsesPlugin);
    app.get(
      "/",
      routeV4(
        {
          Reply: z.object({
            200: z.object({ id: z.string() }),
            404: z.object({ message: z.literal("not found") }),
          }),
        },
        async (_req, reply) => {
          //@ts-expect-error - message must be "not found", not "wrong"
          throw reply.notFound("wrong");
        },
      ),
    );
    const response = await app.inject({ method: "GET", url: "/" });
    assert.equal(response.statusCode, 404);
  });

  it("should allow notFound with correct literal message from 404 schema", async () => {
    const app = fastify();
    await app.register(responsesPlugin);
    app.get(
      "/",
      routeV4(
        {
          Reply: z.object({
            200: z.object({ id: z.string() }),
            404: z.object({ message: z.literal("not found") }),
          }),
        },
        async (_req, reply) => {
          throw reply.notFound("not found");
        },
      ),
    );
    const response = await app.inject({ method: "GET", url: "/" });
    assert.equal(response.statusCode, 404);
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
        { strict: true },
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
        { strict: false },
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
          {
            strict: {
              body: false,
              headers: false,
              params: false,
              query: false,
              [t]: true,
            },
          },
        );
        const field = t === "query" ? "querystring" : t;
        assert.equal(((value.schema as any)?.[field]).additionalProperties, false);
        allFields
          .filter((u) => u !== field)
          .forEach((f) => assert.equal(((value.schema as any)?.[f]).additionalProperties, undefined));
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
          { strict: !t },
        );
        assert.equal((value.schema?.body as any).additionalProperties, t ? undefined : false);
        assert.equal((value.schema?.params as any).additionalProperties, t ? undefined : false);
        assert.equal((value.schema?.querystring as any).additionalProperties, t ? undefined : false);
      });
    }
  });
  describe("schema overrides", () => {
    const exampleSchema = z.object({ id: z.string() });

    it("should be able to generate a route with date in body", async () => {
      const value = routeV4(
        {
          Reply: z.object({ 200: exampleSchema }),
          Body: z.object({ d: z.coerce.date() }),
          Params: exampleSchema,
          Query: exampleSchema,
        },
        async (req, reply) => {
          assert.equal(req.body.d instanceof Date, true);
          return reply.ok({ id: "test" });
        },
      );
      assert.deepStrictEqual((value.schema?.body as any).properties, {
        d: {
          // format: "date-time",
          type: "string",
        },
      });
      const app = fastify();
      await app.register(responsesPlugin);
      app.post("/", value);
      await app.inject({
        method: "POST",
        url: "/",
        body: JSON.stringify({ d: new Date().toISOString() }),
        headers: { "content-type": "application/json" },
      });
    });
    it.only("should be able to generate a route with nullable date in body", async () => {
      const value = routeV4(
        {
          Reply: z.object({ 200: exampleSchema }),
          Body: z.object({ d: z.coerce.date().nullable() }),
        },
        async (req, reply) => {
          if (req.body.d != null) {
            assert.equal(req.body.d instanceof Date, true);
          }
          return reply.ok({ id: "test" });
        },
      );
      assert.deepStrictEqual((value.schema?.body as any).properties, {
        d: {
          anyOf: [
            {
              // format: "date-time",
              type: "string",
            },
            {
              type: "null",
            },
          ],
        },
      });
      const app = fastify();
      await app.register(responsesPlugin);
      app.post("/", value);
      await app.inject({
        method: "POST",
        url: "/",
        body: JSON.stringify({ d: new Date().toISOString() }),
        headers: { "content-type": "application/json" },
      });
      await app.inject({
        method: "POST",
        url: "/",
        body: JSON.stringify({ d: null }),
        headers: { "content-type": "application/json" },
      });
    });
    it("should be able to generate a route with date in reply", async () => {
      const dateV = new Date();
      const value = routeV4(
        {
          Reply: z.object({ 200: z.object({ d: z.date() }) }),
          Body: exampleSchema,
        },
        async (req, reply) => {
          return reply.ok({ d: dateV });
        },
      );
      assert.deepStrictEqual((value.schema?.response as any)["200"].properties, {
        d: {
          // format: "date-time",
          type: "string",
        },
      });

      const app = fastify();
      await app.register(responsesPlugin);
      app.post("/", value);
      const res = await app.inject({
        method: "POST",
        url: "/",
        body: JSON.stringify({ id: "test" }),
        headers: { "content-type": "application/json" },
      });

      assert.deepStrictEqual(await res.json(), { d: dateV.toISOString() });
    });
    it("should be able to generate a route with nullable date in reply", async () => {
      const dateV = new Date();

      const value = routeV4(
        {
          Reply: z.object({ 200: z.object({ d: z.date().nullable() }) }),
          Body: exampleSchema,
        },
        async (req, reply) => {
          return reply.ok({ d: req.body.id === "NULL" ? null : dateV });
        },
      );
      assert.deepStrictEqual((value.schema?.response as any)["200"].properties, {
        d: {
          anyOf: [
            {
              // format: "date-time",
              type: "string",
            },
            {
              type: "null",
            },
          ],
        },
      });
      const app = fastify();
      await app.register(responsesPlugin);
      app.post("/", value);
      const res = await app.inject({
        method: "POST",
        url: "/",
        body: JSON.stringify({ id: "test" }),
        headers: { "content-type": "application/json" },
      });

      assert.deepStrictEqual(await res.json(), { d: dateV.toISOString() });
      const res2 = await app.inject({
        method: "POST",
        url: "/",
        body: JSON.stringify({ id: "NULL" }),
        headers: { "content-type": "application/json" },
      });

      assert.deepStrictEqual(await res2.json(), { d: null });
    });
  });
});
