import assert from "assert";
import fastify from "fastify";
import { describe, it } from "node:test";
import z from "zod";
import responsesPlugin from "./index";
import { createSSERouteV4, sseRouteV4 } from "./sseRouteV4";
import { sleep } from "./utils";

describe("SSERouteV4 Functionality", () => {
  it("should stream multiple events correctly", async () => {
    const app = fastify();
    await app.register(responsesPlugin);

    app.get(
      "/",
      sseRouteV4(
        {
          Reply: z.object({
            SSE: z.object({
              data: z.object({ id: z.number() }),
              event: z.string().optional(),
            }),
          }),
        },
        async (_req, reply) => {
          return reply.sse({
            stream: (async function* () {
              yield { event: "first", data: { id: 1 } };
              yield { event: "second", data: { id: 2 } };
            })(),
          });
        }
      )
    );

    const response = await app.inject({ method: "GET", url: "/" });

    assert.equal(response.statusCode, 200);
    assert.equal(response.headers["content-type"], "text/event-stream");
    const expectedBody =
      'event: first\ndata: {"id":1}\n\n' + 'event: second\ndata: {"id":2}\n\n';
    assert.equal(response.body, expectedBody);
  });

  it("should send an error event if stream validation fails", async () => {
    const app = fastify();
    await app.register(responsesPlugin);

    const newSseRoute = createSSERouteV4({
      sse: { validateStream: true },
    });

    app.get(
      "/",
      newSseRoute(
        {
          Reply: z.object({
            SSE: z.object({ data: z.object({ valid: z.boolean() }) }),
          }),
        },
        //@ts-expect-error
        async (_req, reply) => {
          return reply.sse({
            stream: (async function* () {
              yield { data: { valid: true } };
              // This data is intentionally invalid to trigger the error
              yield { data: { invalid: "data" } };
              yield { data: { valid: false } };
            })(),
          });
        }
      )
    );

    const response = await app.inject({ method: "GET", url: "/" });
    const parts = response.body.trim().split("\n\n");

    assert.equal(
      parts.length,
      3,
      "Should have sent one valid and one error event"
    );
    assert.equal(parts[0], 'data: {"valid":true}');
    assert.match(
      parts[1],
      /event: error\ndata: "Error at stream-item->/,
      "The second event should be a validation error"
    );
  });

  it("should send invalid data if stream validation is disabled", async () => {
    const app = fastify();
    await app.register(responsesPlugin);

    const newSseRoute = createSSERouteV4({ sse: { validateStream: false } });

    app.get(
      "/",
      newSseRoute(
        {
          Reply: z.object({
            SSE: z.object({ data: z.object({ valid: z.boolean() }) }),
          }),
        },
        //@ts-expect-error
        async (_req, reply) => {
          return reply.sse({
            stream: (async function* () {
              yield { data: { invalid: "data" } };
            })(),
          });
        }
      )
    );

    const response = await app.inject({ method: "GET", url: "/" });
    assert.equal(response.body.trim(), 'data: {"invalid":"data"}');
  });

  it("should handle errors from the stream generator", async () => {
    const app = fastify();
    await app.register(responsesPlugin);

    app.get(
      "/",
      sseRouteV4(
        {
          Reply: z.object({ SSE: z.object({ data: z.string() }) }),
        },
        async (_req, reply) => {
          return reply.sse({
            stream: (async function* () {
              yield { data: "first message" };
              throw new Error("Stream exploded!");
            })(),
          });
        }
      )
    );

    const response = await app.inject({ method: "GET", url: "/" });
    const parts = response.body.trim().split("\n\n");

    assert.equal(parts.length, 2);
    assert.equal(parts[0], 'data: "first message"');
    assert.equal(
      parts[1],
      'event: error\ndata: "Stream exploded!"',
      "Should send an error event when the generator throws"
    );
  });

  it("should format SSE messages with id, event, and retry fields", async () => {
    const app = fastify();
    await app.register(responsesPlugin);

    app.get(
      "/",
      sseRouteV4(
        {
          Reply: z.object({
            SSE: z.object({
              data: z.any(),
              id: z.union([z.string(), z.number()]).optional(),
              event: z.string().optional(),
              retry: z.number().optional(),
            }),
          }),
        },
        async (_req, reply) => {
          return reply.sse({
            stream: (async function* () {
              yield {
                id: "abc-123",
                event: "custom-event",
                retry: 5000,
                data: { message: "hello" },
              };
            })(),
          });
        }
      )
    );

    const response = await app.inject({ method: "GET", url: "/" });
    const expectedBody =
      "id: abc-123\n" +
      "retry: 5000\n" +
      "event: custom-event\n" +
      'data: {"message":"hello"}\n\n';

    assert.equal(response.body, expectedBody);
  });

  it("should terminate the stream generator when the client disconnects", async () => {
    let isGeneratorFinished = false;
    const app = fastify();
    await app.register(responsesPlugin);

    app.get(
      "/",
      sseRouteV4(
        { Reply: z.object({ SSE: z.object({ data: z.number() }) }) },
        async (req, reply) => {
          return reply.sse({
            stream: (async function* () {
              try {
                let i = 0;
                while (true) {
                  if (req.abortController?.signal.aborted) {
                    break;
                  }
                  yield { data: i++ };
                  await sleep(50);
                }
              } finally {
                isGeneratorFinished = true;
              }
            })(),
          });
        }
      )
    );

    await app.listen({ port: 0 });
    const address = app.server.address();
    const port = typeof address === "object" ? address?.port : 0;

    const controller = new AbortController();
    const fetchPromise = fetch(`http://127.0.0.1:${port}/`, {
      signal: controller.signal,
    });

    await sleep(120);
    controller.abort();

    await sleep(50);
    assert.strictEqual(
      isGeneratorFinished,
      true,
      "Generator's finally block was not executed"
    );

    await fetchPromise.catch((err) => {
      assert.equal(err.name, "AbortError");
    });
    await app.close();
  });

  it("should still handle regular non-SSE error responses", async () => {
    const app = fastify();
    await app.register(responsesPlugin);
    app.get(
      "/",
      sseRouteV4(
        {
          Reply: z.object({
            SSE: z.object({ data: z.object({ id: z.string() }) }),
            400: z.object({ reason: z.string() }),
          }),
        },
        async (req, reply) => {
          return reply.badRequest({ reason: "invalid input" });
        }
      )
    );

    const response = await app.inject({ method: "GET", url: "/" });
    assert.equal(response.statusCode, 400);
    assert.deepStrictEqual(response.json(), { reason: "invalid input" });
    assert.equal(
      response.headers["content-type"],
      "application/json; charset=utf-8"
    );
  });
});
