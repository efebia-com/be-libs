import fp from "fastify-plugin";
import { z } from "zod";
import { createReply } from "./reply.js";
import { StatusCodeKey } from "./types.js";
import { statusByText } from "./utils.js";

export type StatusCode<TSchema extends z.ZodType> = {
  statusCode: number;
  payload: z.output<TSchema>;
  schema: TSchema;
};

export class StatusCodeBuilder<TOpts extends Partial<Record<StatusCodeKey, StatusCode<any>>> = {}> {
  constructor(readonly obj: TOpts = {} as any) {}
  /**
   *
   * @param key Key to set (reference {@link statusByText})
   * @param param1 Default schema and payload. These will be used when the response schema doesn't have the specified status code
   * @returns A new builder with the correct properties
   */
  set<
    TKey extends keyof TOpts extends never ? StatusCodeKey : Exclude<StatusCodeKey, keyof TOpts>,
    TSchema extends z.ZodType
  >(key: TKey, { schema, payload }: { schema: TSchema; payload: z.output<TSchema> }) {
    return new StatusCodeBuilder<TOpts & { [key in TKey]: StatusCode<TSchema> }>({
      ...this.obj,
      [key]: { statusCode: statusByText[key], schema, payload },
    } as any);
  }
}

const messageSchema = z.object({ message: z.string() });


export type FastifyReplyPluginOptions = {
  statusCodes?: StatusCodeBuilder;
};

const defaultOptions: FastifyReplyPluginOptions = {
  statusCodes: new StatusCodeBuilder()
    .set("ok", { schema: messageSchema, payload: { message: "ok" } })
    .set("created", { schema: messageSchema, payload: { message: "created" } })
    .set("accepted", { schema: messageSchema, payload: { message: "accepted" } })
    .set("noContent", { schema: z.undefined(), payload: undefined })
    .set("badRequest", { schema: messageSchema, payload: { message: "badRequest" } })
    .set("unauthorized", { schema: messageSchema, payload: { message: "unauthorized" } })
    .set("forbidden", { schema: messageSchema, payload: { message: "forbidden" } })
    .set("notFound", { schema: messageSchema, payload: { message: "notFound" } })
    .set("notAcceptable", { schema: messageSchema, payload: { message: "notAcceptable" } })
    .set("conflict", { schema: messageSchema, payload: { message: "conflict" } })
    .set("internalServerError", { schema: messageSchema, payload: { message: "internalServerError" } })
};

/**
 * Example on how to use it:
 * fastify.register(plugin, {
 *  statusCodes: new StatusCodeBuilder().set('ok', z.object({ message: z.string(), additionalProp1: z.string() }), { message: 'ok', additionalProp1: 'test' })
 * })
 * This will use the defaults, but sets `ok` with the new schema
 */
export default fp<FastifyReplyPluginOptions>(
  async (fastify, opts) => {
    const finalOptions: FastifyReplyPluginOptions = {
      statusCodes: new StatusCodeBuilder({
        ...defaultOptions.statusCodes?.obj,
        ...opts.statusCodes?.obj,
      }),
    };
    Object.entries(finalOptions.statusCodes?.obj || {}).forEach(([key, value]: [key: string, value: StatusCode<any>]) => {
      fastify.decorateReply(key, createReply(value.statusCode, value.payload));
      fastify.decorateReply(`SCHEMA_${value.statusCode}`, {
        getter() {
            return value.schema
        }
      });
    });
  },
  {
    fastify: "5.x",
    name: "@efebia/fastify-zod-reply",
  }
);

