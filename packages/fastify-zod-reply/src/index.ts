import { StatusCodeKey } from './types.js';


export type DecoratedReply = {
  [key in StatusCodeKey]: <T>(val?: T) => T
}

declare module 'fastify' {
  interface FastifyReply extends DecoratedReply {}
}

export * from './error.js';
export * from './plugin.js';
export * from './pluginV4.js';
export * from './route.js';
export * from './routeV4.js';
export * from './types.js';

