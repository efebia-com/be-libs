/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod/v4';
import { FastifyZodReplyError } from './error.js';
import { parse, findStatusCode, mapZodError, parseStrict, strictifySchema } from './routeHelpers.js';
import { APIHandler, APIOptions, RouteSecurity, RouteTag } from './types.js';

export type BaseZodV4Schema = {
    Body?: z.ZodTypeAny;
    Params?: z.ZodTypeAny;
    Query?: z.ZodTypeAny;
    Headers?: z.ZodTypeAny;
    Reply: z.ZodObject;
    Security?: (RouteSecurity[keyof RouteSecurity])[];
    Tags?: (keyof RouteTag)[];
};

export type FastifyZodV4Schema<TZodSchema extends BaseZodV4Schema> = {
    Body: TZodSchema['Body'] extends z.ZodTypeAny ? z.output<TZodSchema['Body']> : undefined;
    Params: TZodSchema['Params'] extends z.ZodTypeAny ? z.output<TZodSchema['Params']> : undefined;
    Querystring: TZodSchema['Query'] extends z.ZodTypeAny ? z.output<TZodSchema['Query']> : undefined;
    Reply: TZodSchema['Reply'] extends z.ZodTypeAny
        ? z.input<TZodSchema['Reply']>[keyof z.input<TZodSchema['Reply']>]
        : undefined;
};

export type RouteV4Options = {
    /**
     * Set strict mode.
     * If true, it applies to body, query, params and headers.
     * If an object is passed, you can make it more granular
     */
    strict?: boolean | { body: boolean; query: boolean; params: boolean; headers: boolean }
}

export const createRouteV4 = ({ strict: globalStrict = false }: RouteV4Options = {}) => <
    TSchema extends BaseZodV4Schema,
    FastifySchema extends FastifyZodV4Schema<TSchema> = FastifyZodV4Schema<TSchema>,
>(
    schema: TSchema,
    handler: APIHandler<FastifySchema>,
    /**
     * If set, these options will override the global route options
     */
    options?: RouteV4Options
): APIOptions<FastifySchema> & { handler: APIHandler<FastifySchema> } => {
    const strict = typeof options?.strict !== 'undefined' ? options?.strict : globalStrict
    const finalResult: {
        body?: Record<string, unknown>;
        params?: Record<string, unknown>;
        querystring?: Record<string, unknown>;
        headers?: Record<string, unknown>;
        response?: Record<number, unknown>;
        security?: any;
    } = {
        ...(schema.Body && { body: z.toJSONSchema(strictifySchema(schema.Body, parseStrict('body', strict)), { reused: 'inline', target: "draft-7", io: 'input' }) }),
        ...(schema.Params && { params: z.toJSONSchema(strictifySchema(schema.Params, parseStrict('params', strict)), { reused: 'inline', target: "draft-7", io: 'input' }) }),
        ...(schema.Query && { querystring: z.toJSONSchema(strictifySchema(schema.Query, parseStrict('query', strict)), { reused: 'inline', target: "draft-7", io: 'input' }) }),
        ...(schema.Headers && { headers: z.toJSONSchema(strictifySchema(schema.Headers, parseStrict('headers', strict)), { reused: 'inline', target: "draft-7", io: 'input' }) }),
        response: (
            z.toJSONSchema(schema.Reply.partial(), { reused: 'inline', target: "draft-7" }) as { properties: Record<number, unknown>}
        )['properties'],
        ...(schema.Security && { security: schema.Security }),
        ...(schema.Tags && { tags: schema.Tags }),
    };

    return {
        schema: finalResult,
        handler,
        preHandler: async (request, reply) => {
            const results = await Promise.all([
                ...(schema.Body ? [parse(schema.Body, request.body, 'body')] : []),
                ...(schema.Params ? [parse(schema.Params, request.params, 'params')] : []),
                ...(schema.Query ? [parse(schema.Query, request.query, 'query')] : []),
            ]);

            for (const result of results) {
                if (!result.success) {
                    return reply
                        .code(400 as any)
                        .type('application/json')
                        .send({
                            message: mapZodError(result.error, result.tag),
                        } as any);
                }
            }

            request.body = (results.find(r => r.tag === 'body') as any)?.data || {};
            request.params = (results.find(r => r.tag === 'params') as any)?.data || {};
            request.query = (results.find(r => r.tag === 'query') as any)?.data || {};
        },
        preSerialization: (request, reply, payload, done) => {
            const foundSchema = findStatusCode(reply.statusCode, Object.entries(schema.Reply.shape))
            if (!foundSchema) {
                if (reply.statusCode >= 400) return done(null, payload)
                request.log.warn(`[@efebia/fastify-zod-reply]: Reply schema of: ${request.routeOptions.url} does not have the specified status code: ${reply.statusCode}.`)
                return done(new FastifyZodReplyError(`Reply schema of: ${request.routeOptions.url} does not have the specified status code: ${reply.statusCode}.`, 500));
            }
            const serialized = (foundSchema[1] as z.ZodType).safeParse(payload);
            if (serialized.success) {
                return done(null, serialized.data);
            }
            return done(new FastifyZodReplyError(mapZodError(serialized.error, 'reply'), 500));
        },
    };
}

export const routeV4 = createRouteV4({ strict: false });
