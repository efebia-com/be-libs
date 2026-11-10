import assert from "assert";
import fastify from "fastify";
import { describe, it } from "node:test";
import z from "zod/v4";
import responsesPlugin from "./index";
import { routeV4 } from "./routeV4";

const build = async (route: any, method: "post" | "get" = "post", url = "/") => {
  const app = fastify();
  await app.register(responsesPlugin);
  (app as any)[method](url, route);
  await app.ready();
  return app;
};

const reply200 = z.object({ 200: z.object({ ok: z.boolean() }) });
const handler = async (_req: any, reply: any) => reply.ok({ ok: true });

describe("default validation error output (1.5.x compatible)", () => {
  it("body", async () => {
    const app = await build(
      routeV4({ Body: z.object({ a: z.string().refine(() => false, "bad a") }), Reply: reply200 }, handler),
    );
    const res = await app.inject({ method: "POST", url: "/", payload: { a: "x" } });
    assert.equal(res.statusCode, 400);
    assert.equal(res.headers["content-type"], "application/json; charset=utf-8");
    assert.equal(res.body, JSON.stringify({ message: "Error at body->a->bad a" }));
  });
  it("query", async () => {
    const app = await build(
      routeV4({ Query: z.object({ q: z.string().refine(() => false, "bad q") }), Reply: reply200 }, handler),
      "get",
    );
    const res = await app.inject({ method: "GET", url: "/?q=x" });
    assert.equal(res.statusCode, 400);
    assert.equal(res.body, JSON.stringify({ message: "Error at query->q->bad q" }));
  });
  it("params", async () => {
    const app = await build(
      routeV4({ Params: z.object({ id: z.string().refine(() => false, "bad id") }), Reply: reply200 }, handler),
      "get",
      "/:id",
    );
    const res = await app.inject({ method: "GET", url: "/1" });
    assert.equal(res.statusCode, 400);
    assert.equal(res.body, JSON.stringify({ message: "Error at params->id->bad id" }));
  });
  it("nested paths, multiple issues, empty path", async () => {
    const app = await build(
      routeV4(
        {
          Body: z
            .object({
              a: z.object({ b: z.array(z.object({ c: z.string().refine(() => false, "bad c") })) }),
              d: z.string().refine(() => false, "bad d"),
            })
            .superRefine((_v, ctx) => ctx.addIssue({ code: "custom", message: "root bad", path: [] })),
          Reply: reply200,
        },
        handler,
      ),
    );
    const res = await app.inject({ method: "POST", url: "/", payload: { a: { b: [{ c: "x" }] }, d: "y" } });
    assert.equal(res.statusCode, 400);
    assert.equal(
      JSON.parse(res.body).message,
      "Error at body->a->b->0->c->bad c\nError at body->d->bad d\nError at body->->root bad",
    );
  });
});

import { createRouteV4 } from "./routeV4";
import { createSSERouteV4 } from "./sseRouteV4";
import { defaultValidationErrorFormatter, type ValidationErrorFormatter } from "./index";

const sseReply = z.object({ SSE: z.object({ data: z.string() }) });
const sseHandler = async (_req: any, reply: any) =>
  reply.sse({
    stream: (async function* () {
      yield { data: "x" };
    })(),
  });

const kinds = [
  {
    name: "routeV4",
    make: (opts: any, factory: any, bodySchema: z.ZodTypeAny, routeOpts?: any, reply: z.ZodTypeAny = reply200) =>
      createRouteV4(factory)({ Body: bodySchema, Reply: reply as any }, handler, routeOpts),
  },
  {
    name: "sseRouteV4",
    make: (opts: any, factory: any, bodySchema: z.ZodTypeAny, routeOpts?: any) =>
      createSSERouteV4(factory)({ Body: bodySchema, Reply: sseReply }, sseHandler, routeOpts),
  },
];

const body = z.object({ user: z.object({ name: z.string().refine(() => false, "bad name") }), n: z.number().refine(() => false, "bad n") });
const payload = { user: { name: "x" }, n: 1 };
const asJson: ValidationErrorFormatter = (issues, source) => ({
  statusCode: 422,
  body: {
    code: "VALIDATION_ERROR",
    errors: issues.map((i) => ({ source, path: i.path.join("."), code: i.code, message: i.message })),
  },
});

for (const kind of kinds) {
  describe(`custom validationErrorFormatter (${kind.name})`, () => {
    it("receives raw issues with codes and paths, plus the source", async () => {
      let seen: { issues: any[]; source: string } | undefined;
      const app = await build(
        kind.make(null, {}, body, {
          validationErrorFormatter: (issues: any[], source: string) => {
            seen = { issues, source };
            return asJson(issues, source as any);
          },
        }),
      );
      const res = await app.inject({ method: "POST", url: "/", payload });
      assert.equal(res.statusCode, 422);
      assert.equal(seen?.source, "body");
      assert.deepEqual(
        seen?.issues.map((i) => [i.code, i.path]),
        [
          ["custom", ["user", "name"]],
          ["custom", ["n"]],
        ],
      );
      assert.deepEqual(JSON.parse(res.body), {
        code: "VALIDATION_ERROR",
        errors: [
          { source: "body", path: "user.name", code: "custom", message: "bad name" },
          { source: "body", path: "n", code: "custom", message: "bad n" },
        ],
      });
      assert.match(res.headers["content-type"] as string, /application\/json/);
    });

    it("defaults to 400 and sends string bodies verbatim", async () => {
      const app = await build(kind.make(null, {}, body, { validationErrorFormatter: () => ({ body: "nope" }) }));
      const res = await app.inject({ method: "POST", url: "/", payload });
      assert.equal(res.statusCode, 400);
      assert.equal(res.body, "nope");
    });

    it("per-route formatter beats factory formatter, which beats plugin formatter", async () => {
      const mk = (tag: string): ValidationErrorFormatter => () => ({ body: { tag } });
      const run = async (factory: any, routeOpts: any, pluginFormatter?: ValidationErrorFormatter) => {
        const app = fastify();
        await app.register(responsesPlugin, { validationErrorFormatter: pluginFormatter });
        app.post("/", kind.make(null, factory, body, routeOpts));
        await app.ready();
        return JSON.parse((await app.inject({ method: "POST", url: "/", payload })).body);
      };
      assert.deepEqual(await run({}, undefined, mk("plugin")), { tag: "plugin" });
      assert.deepEqual(await run({ validationErrorFormatter: mk("factory") }, undefined, mk("plugin")), { tag: "factory" });
      assert.deepEqual(
        await run({ validationErrorFormatter: mk("factory") }, { validationErrorFormatter: mk("route") }, mk("plugin")),
        { tag: "route" },
      );
    });

    it("falls back to the built-in text when nothing is configured", async () => {
      const app = await build(kind.make(null, {}, body));
      const res = await app.inject({ method: "POST", url: "/", payload });
      assert.equal(res.statusCode, 400);
      assert.equal(
        res.body,
        JSON.stringify({ message: "Error at body->user->name->bad name\nError at body->n->bad n" }),
      );
    });

    it("explicit defaultValidationErrorFormatter matches the built-in output", async () => {
      const a = await build(kind.make(null, {}, body));
      const b = await build(kind.make(null, {}, body, { validationErrorFormatter: defaultValidationErrorFormatter }));
      const [ra, rb] = await Promise.all([a, b].map((app) => app.inject({ method: "POST", url: "/", payload })));
      assert.equal(ra.body, rb.body);
      assert.equal(ra.statusCode, rb.statusCode);
    });
  });
}

describe("custom formatter vs a declared 400 reply schema", () => {
  it("does not strip or reject the custom body", async () => {
    const app = await build(
      createRouteV4({ validationErrorFormatter: asJson })(
        { Body: body, Reply: z.object({ 200: z.object({ ok: z.boolean() }), 400: z.object({ message: z.string() }), 422: z.object({ message: z.string() }) }) },
        handler,
      ),
    );
    const res = await app.inject({ method: "POST", url: "/", payload });
    assert.equal(res.statusCode, 422);
    assert.equal(JSON.parse(res.body).code, "VALIDATION_ERROR");
    assert.equal(JSON.parse(res.body).errors.length, 2);
  });
});
