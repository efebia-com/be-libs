import path from "node:path";
import { readdir } from "node:fs/promises";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import type pino from "pino";
import { importPlugin } from "./globber.js";

export type RouteEntry = { prefix: string; plugin: FastifyPluginAsync };

export const segmentToPrefix = (name: string): string => {
  if (name.startsWith("_") || /^\(.*\)$/.test(name)) return "";
  const param = name.match(/^\[(.+)\]$/);
  if (param) return `/:${param[1]}`;
  return `/${name}`;
};

type ScanOptions = {
  routeFile: string;
  packageType: string;
  excludedDirectories: string[];
  log?: pino.BaseLogger;
};

export const scanRoutes = async (
  dir: string,
  opts: ScanOptions,
  prefix = ""
): Promise<RouteEntry[]> => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = entries.filter((e) => e.isFile()).map((e) => e.name);
  const plugin = await importPlugin(dir, opts.routeFile, opts.packageType, files, opts.log);
  const nested = await Promise.all(
    entries
      .filter((e) => e.isDirectory() && !opts.excludedDirectories.includes(e.name))
      .map((e) => scanRoutes(path.join(dir, e.name), opts, prefix + segmentToPrefix(e.name)))
  );
  return [...(plugin ? [{ prefix, plugin }] : []), ...nested.flat()];
};

export const registerRoutes = async (fastify: FastifyInstance, routes: RouteEntry[]) => {
  for (const { prefix, plugin } of routes) {
    await fastify.register(plugin, prefix ? { prefix } : {});
  }
};
