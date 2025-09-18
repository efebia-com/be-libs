import fp from "fastify-plugin";
import { createReply } from "./reply.js";
import { SSEReplyShape } from "./sseRouteV4.js";
import { mergeDeep } from "./utils.js";

export type StatusCode<TCode> = {
  statusCode: TCode;
  payload: any;
};

export interface FastifyStatusCode {
  ok: StatusCode<200>;
  created: StatusCode<201>;
  accepted: StatusCode<202>;
  noContent: StatusCode<204>;
  badRequest: StatusCode<400>;
  unauthorized: StatusCode<401>;
  forbidden: StatusCode<403>;
  notFound: StatusCode<404>;
  notAcceptable: StatusCode<406>;
  conflict: StatusCode<409>;
  internalServerError: StatusCode<500>;
}

export type FastifyReplyPluginOptions = {
  statusCodes?: {
    [key in keyof FastifyStatusCode]?: FastifyStatusCode[key];
  };
};

export type DecoratedReply = {
  [key in keyof FastifyStatusCode]: <T>(val?: T) => T;
};

declare module "fastify" {
  export interface FastifyRequest {
    abortController?: AbortController;
  }

  export interface FastifyReply extends DecoratedReply {
    sse?<T extends SSEReplyShape>(options: {
      stream: AsyncGenerator<T>;
      onError?: (error: unknown) => void;
    }): Promise<T>;
  }
}

const defaultOptions: FastifyReplyPluginOptions = {
  statusCodes: {
    ok: { statusCode: 200, payload: { message: "ok" } },
    created: { statusCode: 201, payload: { message: "created" } },
    accepted: { statusCode: 202, payload: { message: "accepted" } },
    noContent: { statusCode: 204, payload: null },
    badRequest: { statusCode: 400, payload: { message: "badRequest" } },
    unauthorized: { statusCode: 401, payload: { message: "unauthorized" } },
    forbidden: { statusCode: 403, payload: { message: "forbidden" } },
    notFound: { statusCode: 404, payload: { message: "notFound" } },
    notAcceptable: { statusCode: 406, payload: { message: "notAcceptable" } },
    conflict: { statusCode: 409, payload: { message: "conflict" } },
    internalServerError: { statusCode: 500, payload: { message: "internalServerError" } },
  },
};

export default fp<FastifyReplyPluginOptions>(
  async (fastify, opts) => {
    const finalOptions = mergeDeep(defaultOptions, opts);
    Object.entries(finalOptions.statusCodes!).forEach(([key, value]) => {
      fastify.decorateReply(key, createReply(value.statusCode, value.payload));
    });

    fastify.decorateRequest("abortController");
    fastify.decorateReply("sse");
  },
  {
    fastify: "5.x",
    name: "@efebia/fastify-zod-reply",
  }
);

export * from "./error.js";
export * from "./routeV4.js";
export * from "./sseRouteV4.js";
export * from "./types.js";

