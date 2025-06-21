/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod';
import { zodToJsonSchema, type JsonSchema7ObjectType } from 'zod-to-json-schema';
import { FastifyZodReplyError } from './error.js';
import { APIHandler, APIOptions, RouteSecurity, RouteTag } from './types.js';

const mapZodError = (zodError: z.ZodError, prefix: string) => {
    return zodError.issues.map(issue => {
        const pathStr = `Error at ${prefix}->${issue.path.join('->')}`;
        return issue.message ? `${pathStr}->${issue.message}` : pathStr;
    }).join('\n');
};

export type BaseZodSchema = {
    Body?: z.ZodTypeAny;
    Params?: z.ZodTypeAny;
    Query?: z.ZodTypeAny;
    Headers?: z.ZodTypeAny;
    Reply: z.AnyZodObject;
    Security?: (RouteSecurity[keyof RouteSecurity])[];
    Tags?: (keyof RouteTag)[];
};
export type FastifyZodSchema<TZodSchema extends BaseZodSchema> = {
    Body: TZodSchema['Body'] extends z.ZodTypeAny ? z.output<TZodSchema['Body']> : undefined;
    Params: TZodSchema['Params'] extends z.ZodTypeAny ? z.output<TZodSchema['Params']> : undefined;
    Querystring: TZodSchema['Query'] extends z.ZodTypeAny ? z.output<TZodSchema['Query']> : undefined;
    Reply: TZodSchema['Reply'] extends z.ZodTypeAny
        ? z.input<TZodSchema['Reply']>[keyof z.infer<TZodSchema['Reply']>]
        : undefined;
};

const parse = async (schema: z.ZodTypeAny, payload: any, tag: string) => {
    const result = await schema.safeParseAsync(payload);
    return {
        ...result,
        tag,
    };
};

const findStatusCode = (statusCode: number, availableStatusCodes: ([(string | number), any])[]) => {
    return availableStatusCodes.find(([key]) => {
        if (!['number','string'].includes(typeof key)) return false;
        if (typeof key === 'number') return statusCode === key;
        if (/^[0-9]{3}$/.test(key)) return statusCode === parseInt(key)
        if (/^[0-9]xx$/i.test(key)) return statusCode.toString()[0] === key[0]
    })
}

export type RouteOptions = {
    /**
     * Set strict mode.
     * If true, it applies to body, query, params and headers.
     * If an object is passed, you can make it more granular
     */
    strict?: boolean | { body: boolean; query: boolean; params: boolean; headers: boolean }
}

const strictifySchema = (schema: z.ZodType, strict: boolean) => {
    if (!strict) return schema
    return 'strict' in schema && typeof schema['strict'] === 'function' ? schema.strict() : schema
}


const parseStrict = (tag: keyof Exclude<NonNullable<RouteOptions['strict']>, boolean>, value: NonNullable<RouteOptions['strict']>) => {
    if (typeof value === 'boolean') return value
    return value[tag]
}

export const createRoute = ({ strict: globalStrict = false }: RouteOptions = {}) => <
    TSchema extends BaseZodSchema,
    FastifySchema extends FastifyZodSchema<TSchema> = FastifyZodSchema<TSchema>,
>(
    schema: TSchema,
    handler: APIHandler<FastifySchema>,
    /**
     * If set, these options will override the global route options
     */
    options?: RouteOptions
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
        ...(schema.Body && { body: zodToJsonSchema(strictifySchema(schema.Body, parseStrict('body', strict)), { $refStrategy: 'none', removeAdditionalStrategy: 'strict', allowedAdditionalProperties: undefined }) }),
        ...(schema.Params && { params: zodToJsonSchema(strictifySchema(schema.Params, parseStrict('params', strict)), { $refStrategy: 'none', removeAdditionalStrategy: 'strict', allowedAdditionalProperties: undefined }) }),
        ...(schema.Query && { querystring: zodToJsonSchema(strictifySchema(schema.Query, parseStrict('query', strict)), { $refStrategy: 'none', removeAdditionalStrategy: 'strict', allowedAdditionalProperties: undefined }) }),
        ...(schema.Headers && { headers: zodToJsonSchema(strictifySchema(schema.Headers, parseStrict('headers', strict)), { $refStrategy: 'none', removeAdditionalStrategy: 'strict', allowedAdditionalProperties: undefined }) }),
        response: (
            zodToJsonSchema(schema.Reply.partial(), {
                $refStrategy: 'none',
                strictUnions: true,
            }) as JsonSchema7ObjectType
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
            const foundLocalSchema = findStatusCode(reply.statusCode, Object.entries(schema.Reply.shape))
            const foundGlobalSchema = reply[`SCHEMA_${reply.statusCode}`]
const foundSchema = foundLocalSchema?.[1] ?? foundGlobalSchema
            if (!foundSchema) {
                request.log.error(`[@efebia/fastify-zod-reply]: Reply schema of: ${request.routeOptions.url} does not have the specified status code: ${reply.statusCode} nor there is a global schema for this status code.`)
                reply.code(500 as any)
                return done(new FastifyZodReplyError(`Reply schema of: ${request.routeOptions.url} does not have the specified status code: ${reply.statusCode} nor there is a global schema for this status code.`, 500));
            }
            const serialized = (foundSchema as z.ZodType).safeParse(payload);
            if (serialized.success) {
                return done(null, serialized.data);
            }
            reply.code(500 as any)
            return done(new FastifyZodReplyError(mapZodError(serialized.error, 'reply'), 500));
        },
    };
}

export const route = createRoute({ strict: false })
