import fp from "fastify-plugin";
import { z } from "zod/v4";
import { createReply } from "./reply.js";
import { StatusCodeKey } from "./types.js";
import { statusByText } from "./utils.js";

export type StatusCodeV4<TSchema extends z.ZodType> = {
  statusCode: number;
  payload: z.output<TSchema>;
  schema: TSchema;
};

export class StatusCodeV4Builder<TOpts extends Partial<Record<StatusCodeKey, StatusCodeV4<any>>> = {}> {
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
    return new StatusCodeV4Builder<TOpts & { [key in TKey]: StatusCodeV4<TSchema> }>({
      ...this.obj,
      [key]: { statusCode: statusByText[key], schema, payload },
    } as any);
  }
}

const messageSchema = z.object({ message: z.string() });


export type FastifyReplyV4PluginOptions = {
  statusCodes?: StatusCodeV4Builder;
};

const defaultOptions: FastifyReplyV4PluginOptions = {
  statusCodes: new StatusCodeV4Builder()
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
 *  statusCodes: new StatusCodeV4Builder().set('ok', 200, z.object({ message: z.string(), additionalProp1: z.string() }), { message: 'ok', additionalProp1: 'test' })
 * })
 * This will use the defaults, but sets `ok` with the new schema
 */
export default fp<FastifyReplyV4PluginOptions>(
  async (fastify, opts) => {
    const finalOptions: FastifyReplyV4PluginOptions = {
      statusCodes: new StatusCodeV4Builder({
        ...defaultOptions.statusCodes?.obj,
        ...opts.statusCodes?.obj,
      }),
    };
    Object.entries(finalOptions.statusCodes?.obj || {}).forEach(([key, value]: [key: string, value: StatusCodeV4<any>]) => {
      fastify.decorateReply(key, createReply(value.statusCode, value.payload));
    });
  },
  {
    fastify: "5.x",
    name: "@efebia/fastify-zod-reply",
  }
);

