// sseRouteV4.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { RouteGenericInterface } from "fastify";
import { z } from "zod/v4";
import {
  mapZodError,
  parse,
  parseStrict,
  sendSseStream,
  strictifySchema,
} from "./routeHelpers.js";
import { APIHandler, APIOptions, RouteSecurity, RouteTag } from "./types.js";

export type SSEReplyShape = {
  /**
   * The data payload for the event. This is the only compulsory field.
   */
  data: unknown;
  /**
   * The event type. If not specified, "message" will be used.
   */
  event?: string | undefined;
  /**
   * A unique identifier for the event.
   */
  id?: string | number | undefined;
  /**
   * The reconnection time in milliseconds for the client.
   */
  retry?: number | undefined;
};

export type SSEBaseZodV4Schema = {
  Body?: z.ZodTypeAny;
  Params?: z.ZodTypeAny;
  Query?: z.ZodTypeAny;
  Headers?: z.ZodTypeAny;
  Reply: z.ZodObject<{
    SSE: z.ZodType<SSEReplyShape>; // The SSE defaults to 200
    [key: string | number]: z.ZodTypeAny;
  }>;
  Security?: RouteSecurity[keyof RouteSecurity][];
  Tags?: (keyof RouteTag)[];
};

type TransformSSETo200<T> = {
  [K in keyof T as K extends "SSE" ? 200 : K]: T[K];
};

export type FastifySSEZodV4Schema<TZodSchema extends SSEBaseZodV4Schema> = {
  Body: TZodSchema["Body"] extends z.ZodTypeAny
    ? z.output<TZodSchema["Body"]>
    : undefined;
  Params: TZodSchema["Params"] extends z.ZodTypeAny
    ? z.output<TZodSchema["Params"]>
    : undefined;
  Querystring: TZodSchema["Query"] extends z.ZodTypeAny
    ? z.output<TZodSchema["Query"]>
    : undefined;
  Reply: TZodSchema["Reply"] extends z.ZodTypeAny
    ? TransformSSETo200<z.input<TZodSchema["Reply"]>>
    : undefined;
};

export type SSERouteV4Options = {
  strict?:
    | boolean
    | { body: boolean; query: boolean; params: boolean; headers: boolean };
  sse?: {
    keepAliveInterval?: number;
    onError?: undefined | ((error: unknown) => void);
    validateStream?: boolean;
  };
};

// default augmentations for SSE handlers
export type SSEAugmentedAPIHandler<
  FastifySchema extends RouteGenericInterface,
  RequestAugmentation extends object = {},
  ReplyAugmentation extends object = {}
> = APIHandler<
  FastifySchema,
  RequestAugmentation & { abortController: AbortController },
  ReplyAugmentation & {
    sse<T extends SSEReplyShape>(options: {
      stream: AsyncGenerator<T>;
      onError?: (error: unknown) => void;
    }): Promise<T>;
  }
>;

export function createSSERouteV4<
  RequestAugmentation extends object = {},
  ReplyAugmentation extends object = {}
>(globalOptions: SSERouteV4Options = {}) {
  return <
    TSchema extends SSEBaseZodV4Schema,
    FastifySchema extends FastifySSEZodV4Schema<TSchema> = FastifySSEZodV4Schema<TSchema>
  >(
    schema: TSchema,
    handler: NoInfer<
      SSEAugmentedAPIHandler<
        FastifySchema,
        RequestAugmentation,
        ReplyAugmentation
      >
    >,
    options?: SSERouteV4Options
  ): APIOptions<FastifySchema> & {
    handler: APIHandler<FastifySchema>;
  } => {
    const strict =
      typeof options?.strict !== "undefined"
        ? options?.strict
        : typeof globalOptions.strict !== "undefined"
        ? globalOptions.strict
        : false;

    const sseOptions = { ...globalOptions.sse, ...options?.sse };

    const responseJsonSchema = (
      z.toJSONSchema(schema.Reply, {
        reused: "inline",
        target: "draft-7",
      }) as { properties: Record<number | string, unknown> }
    )["properties"];

    const responseSSESchema = responseJsonSchema["SSE"];

    if (!responseJsonSchema || responseSSESchema === undefined) {
      throw new Error(
        "An SSE endpoint must define a schema for the 200 status code."
      );
    }
    delete responseJsonSchema["SSE"];

    const finalResult: {
      body?: Record<string, unknown>;
      params?: Record<string, unknown>;
      querystring?: Record<string, unknown>;
      headers?: Record<string, unknown>;
      response?: Record<string, unknown>;
      security?: any;
    } = {
      ...(schema.Body && {
        body: z.toJSONSchema(
          strictifySchema(schema.Body, parseStrict("body", strict)),
          {
            reused: "inline",
            target: "draft-7",
            io: "input",
          }
        ),
      }),
      ...(schema.Params && {
        params: z.toJSONSchema(
          strictifySchema(schema.Params, parseStrict("params", strict)),
          {
            reused: "inline",
            target: "draft-7",
            io: "input",
          }
        ),
      }),
      ...(schema.Query && {
        querystring: z.toJSONSchema(
          strictifySchema(schema.Query, parseStrict("query", strict)),
          {
            reused: "inline",
            target: "draft-7",
            io: "input",
          }
        ),
      }),
      ...(schema.Headers && {
        headers: z.toJSONSchema(
          strictifySchema(schema.Headers, parseStrict("headers", strict)),
          {
            reused: "inline",
            target: "draft-7",
            io: "input",
          }
        ),
      }),
      response: {
        ...responseJsonSchema,
        200: {
          content: {
            "text/event-stream": {
              schema: responseSSESchema,
            },
          },
        },
      },
      ...(schema.Security && { security: schema.Security }),
      ...(schema.Tags && { tags: schema.Tags }),
    };

    return {
      schema: finalResult,
      handler,
      preHandler: async (request, reply) => {
        const results = await Promise.all([
          ...(schema.Body ? [parse(schema.Body, request.body, "body")] : []),
          ...(schema.Params
            ? [parse(schema.Params, request.params, "params")]
            : []),
          ...(schema.Query
            ? [parse(schema.Query, request.query, "query")]
            : []),
        ]);

        for (const result of results) {
          if (!result.success) {
            return reply
              .code(400 as any)
              .type("application/json")
              .send({
                message: mapZodError(result.error, result.tag),
              } as any);
          }
        }

        request.body =
          (results.find((r) => r.tag === "body") as any)?.data || {};
        request.params =
          (results.find((r) => r.tag === "params") as any)?.data || {};
        request.query =
          (results.find((r) => r.tag === "query") as any)?.data || {};

        // Set up SSE-specific functionality
        const abortController = new AbortController();
        request.socket.on("close", () => abortController.abort());
        (request as any).abortController = abortController;

        (reply as any).sse = async <T extends SSEReplyShape>(options: {
          stream: AsyncGenerator<T>;
          onError?: (error: unknown) => void;
        }): Promise<T> =>
          sendSseStream({
            reply,
            stream: options.stream,
            schema: schema.Reply.shape["SSE"],
            options: sseOptions,
          });
      },
    };
  };
}

export const sseRouteV4 = createSSERouteV4({ strict: false });
