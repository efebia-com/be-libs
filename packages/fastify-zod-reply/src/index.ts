import fp from "fastify-plugin";
import { createReply } from "./reply.js";
import { mergeDeep } from "./utils.js";

// to check against fastify schemas specific to the current route in routeV4
export type CodePayload<TReply, TCode extends number, TFallback = unknown> = TReply extends {
  send(payload?: infer TMap): any;
}
  ? TMap extends Record<TCode, infer T>
    ? T
    : TFallback
  : TFallback;

// to allow for additional props if payload is a plain old object
export type ResponseParam<TReply, TCode extends number> =
  CodePayload<TReply, TCode> extends Record<PropertyKey, unknown>
    ? CodePayload<TReply, TCode> & Record<string, unknown>
    : CodePayload<TReply, TCode>;

export type ValidateResponseParam<TThis, TCode extends number> =
  CodePayload<TThis, TCode, never> extends never
    ? string
    : CodePayload<TThis, TCode, never> extends { message: infer M }
      ? M & string
      : never;

export type ErrorMethodParam<TThis, TCode extends number> =
  | ValidateResponseParam<TThis, TCode>
  | ResponseParam<TThis, TCode>;

export type ErrorCodePayload<TVal> = [TVal] extends [string] ? { message: TVal } : TVal;

type DefaultArgs<TReply, TCode extends number, TParam> =
  CodePayload<TReply, TCode, never> extends never ? [val?: undefined] : [val: TParam];

declare module "fastify" {
  export interface FastifyReply {
    ok(...args: DefaultArgs<this, 200, ResponseParam<this, 200>>): CodePayload<this, 200, { message: "ok" }>;
    ok(val: ResponseParam<this, 200>): CodePayload<this, 200>;
    created(...args: DefaultArgs<this, 201, ResponseParam<this, 201>>): CodePayload<this, 201, { message: "created" }>;
    created(val: ResponseParam<this, 201>): CodePayload<this, 201>;
    accepted(...args: DefaultArgs<this, 202, ResponseParam<this, 202>>): CodePayload<this, 202, { message: "accepted" }>;
    accepted(val: ResponseParam<this, 202>): CodePayload<this, 202>;
    noContent(): CodePayload<this, 204, void>;
    badRequest(...args: DefaultArgs<this, 400, ErrorMethodParam<this, 400>>): CodePayload<this, 400, { message: "badRequest" }>;
    badRequest<TVal extends ErrorMethodParam<this, 400>>(val: TVal): ErrorCodePayload<TVal>;
    unauthorized(...args: DefaultArgs<this, 401, ErrorMethodParam<this, 401>>): CodePayload<this, 401, { message: "unauthorized" }>;
    unauthorized<TVal extends ErrorMethodParam<this, 401>>(val: TVal): ErrorCodePayload<TVal>;
    forbidden(...args: DefaultArgs<this, 403, ErrorMethodParam<this, 403>>): CodePayload<this, 403, { message: "forbidden" }>;
    forbidden<TVal extends ErrorMethodParam<this, 403>>(val: TVal): ErrorCodePayload<TVal>;
    notFound(...args: DefaultArgs<this, 404, ErrorMethodParam<this, 404>>): CodePayload<this, 404, { message: "notFound" }>;
    notFound<TVal extends ErrorMethodParam<this, 404>>(val: TVal): ErrorCodePayload<TVal>;
    notAcceptable(...args: DefaultArgs<this, 406, ErrorMethodParam<this, 406>>): CodePayload<this, 406, { message: "notAcceptable" }>;
    notAcceptable<TVal extends ErrorMethodParam<this, 406>>(val: TVal): ErrorCodePayload<TVal>;
    conflict(...args: DefaultArgs<this, 409, ErrorMethodParam<this, 409>>): CodePayload<this, 409, { message: "conflict" }>;
    conflict<TVal extends ErrorMethodParam<this, 409>>(val: TVal): ErrorCodePayload<TVal>;
    internalServerError(...args: DefaultArgs<this, 500, ErrorMethodParam<this, 500>>): CodePayload<this, 500, { message: "internalServerError" }>;
    internalServerError<TVal extends ErrorMethodParam<this, 500>>(val: TVal): ErrorCodePayload<TVal>;
  }
}

export type StatusCode<TCode extends number> = {
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
  } & Record<string, StatusCode<any>>;
};

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
  },
);

export { buildHTTPErrorObject, FastifyZodReplyError } from "./error.js";
export * from "./routeV4.js";
export * from "./sseRouteV4.js";
export * from "./types.js";
