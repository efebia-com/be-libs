import assert from "assert";
import Fastify from "fastify";
import { describe, it } from "node:test";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import fastifyAutoImport from "./index.js";

const hasRoute = (routes: any[], method: string, path: string) =>
  routes.some((r) => r.method === method && r.path === path);

const startingDirectory = pathToFileURL(path.join(fileURLToPath(import.meta.url), '../')).href

describe("Single routes (use exclusion)", () => {
  it("should get routes correctly with default routes file", async () => {
    const fastify = Fastify();
    const routes: any[] = [];
    fastify.addHook("onRoute", (o) => { routes.push(o); });

    await fastify.register(fastifyAutoImport, {
      startingDirectory,
      directory: "fixtures/plugins",
      excludedDirectories: ["test-2", "test-nested"],
    });

    await fastify.ready();

    assert.strictEqual(routes.length, 3);
    assert.ok(hasRoute(routes, "GET", "/test-1-routes/"));
    assert.ok(hasRoute(routes, "HEAD", "/test-1-routes"));
    assert.ok(hasRoute(routes, "HEAD", "/test-1-routes/"));
  });

  it("should get routes correctly with custom routes file", async () => {
    const fastify = Fastify();
    const routes: any[] = [];
    fastify.addHook("onRoute", (o) => { routes.push(o); });

    await fastify.register(fastifyAutoImport, {
      startingDirectory,
      directory: "fixtures/plugins",
      routeFile: "index",
      excludedDirectories: ["test-2", "test-nested"],
    });

    await fastify.ready();

    assert.strictEqual(routes.length, 3);
    assert.ok(hasRoute(routes, "GET", "/test-1-index/"));
    assert.ok(hasRoute(routes, "HEAD", "/test-1-index"));
    assert.ok(hasRoute(routes, "HEAD", "/test-1-index/"));
  });

  it("plugin can be encapsulated", async () => {
    const fastify = Fastify();
    const routes: any[] = [];
    fastify.addHook("onRoute", (o) => { routes.push(o); });

    await fastify.register(
      async (fastify) => {
        await fastify.register(fastifyAutoImport, {
          startingDirectory,
          directory: "fixtures/plugins",
          excludedDirectories: ["test-2", "test-nested"],
        });
      },
      { prefix: "/test" }
    );

    await fastify.ready();

    assert.strictEqual(routes.length, 3);
    assert.ok(hasRoute(routes, "GET", "/test/test-1-routes/"));
    assert.ok(hasRoute(routes, "HEAD", "/test/test-1-routes"));
    assert.ok(hasRoute(routes, "HEAD", "/test/test-1-routes/"));
  });
});

describe("Multiple routes", () => {
  it("should get routes correctly with default routes file", async () => {
    const fastify = Fastify();
    const routes: any[] = [];
    fastify.addHook("onRoute", (o) => { routes.push(o); });

    await fastify.register(fastifyAutoImport, {
      startingDirectory,
      directory: "fixtures/plugins",
      excludedDirectories: ["test-nested"],
    });

    await fastify.ready();

    assert.strictEqual(routes.length, 7);
    assert.ok(hasRoute(routes, "GET", "/test-1-routes/"));
    assert.ok(hasRoute(routes, "GET", "/test-2-routes/"));
    assert.ok(hasRoute(routes, "POST", "/test-2-routes/"));
  });
});

describe("Recursive routes", () => {
  it("should register plugins in nested directories that have the routeFile", async () => {
    const fastify = Fastify();
    const routes: any[] = [];
    fastify.addHook("onRoute", (o) => { routes.push(o); });

    await fastify.register(fastifyAutoImport, {
      startingDirectory,
      directory: "fixtures/plugins",
      recursive: true,
    });

    await fastify.ready();

    // test-1/routes.ts: GET/ + HEAD + HEAD/ = 3
    // test-2/routes.ts: GET/ + POST/ + HEAD + HEAD/ = 4
    // test-nested/has-routes/routes.ts: GET/ + HEAD + HEAD/ = 3
    // test-nested/no-routes/ skipped (has index.ts, not routes.ts)
    assert.strictEqual(routes.length, 10);
    assert.ok(hasRoute(routes, "GET", "/test-1-routes/"));
    assert.ok(hasRoute(routes, "GET", "/test-2-routes/"));
    assert.ok(hasRoute(routes, "POST", "/test-2-routes/"));
    assert.ok(hasRoute(routes, "GET", "/test-nested-has-routes/"));
  });

  it("should not register plugins in directories without the routeFile", async () => {
    const fastify = Fastify();
    const routes: any[] = [];
    fastify.addHook("onRoute", (o) => { routes.push(o); });

    await fastify.register(fastifyAutoImport, {
      startingDirectory,
      directory: "fixtures/plugins",
      recursive: true,
    });

    await fastify.ready();

    const paths = routes.map((r) => r.path);
    assert.ok(!paths.some((p) => p.includes("no-routes")));
  });

  it("should respect excludedDirectories in recursive mode", async () => {
    const fastify = Fastify();
    const routes: any[] = [];
    fastify.addHook("onRoute", (o) => { routes.push(o); });

    await fastify.register(fastifyAutoImport, {
      startingDirectory,
      directory: "fixtures/plugins",
      recursive: true,
      excludedDirectories: ["test-2", "test-nested"],
    });

    await fastify.ready();

    assert.strictEqual(routes.length, 3);
    const paths = routes.map((r) => r.path);
    assert.ok(!paths.some((p) => p.includes("test-2")));
    assert.ok(!paths.some((p) => p.includes("test-nested")));
  });
});
