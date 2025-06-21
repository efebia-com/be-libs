import pluginV4, { type FastifyReplyV4PluginOptions, type StatusCodeV4, type StatusCodeV4Builder } from './pluginV4.js';
import { StatusCodeKey } from './types.js';


export type DecoratedReply = {
  [key in StatusCodeKey]: <T>(val?: T) => T
}

declare module 'fastify' {
  interface FastifyReply extends DecoratedReply {}
}

export * from './error.js';
export * from './plugin.js';
export * from './route.js';
export * from './routeV4.js';
export * from './types.js';
export { FastifyReplyV4PluginOptions, pluginV4, StatusCodeV4, StatusCodeV4Builder };

