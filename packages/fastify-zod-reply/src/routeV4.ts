/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod/v4';
import { APIHandler, APIOptions, RouteSecurity, RouteTag } from './types';


const mapZodError = (zodError: z.ZodError, prefix: string) =>
    zodError.issues.map(issue => `Error at ${prefix}->${issue.path.join('->')}`).join(';\n');

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

export const routeV4 = <
    TSchema extends BaseZodV4Schema,
    FastifySchema extends FastifyZodV4Schema<TSchema> = FastifyZodV4Schema<TSchema>,
>(
    schema: TSchema,
    handler: APIHandler<FastifySchema>
): APIOptions<FastifySchema> & { handler: APIHandler<FastifySchema> } => {

    const finalResult: {
        body?: Record<string, unknown>;
        params?: Record<string, unknown>;
        querystring?: Record<string, unknown>;
        headers?: Record<string, unknown>;
        response?: Record<number, unknown>;
        security?: any;
    } = {
        ...(schema.Body && { body: z.toJSONSchema(schema.Body) }),
        ...(schema.Params && { params: z.toJSONSchema(schema.Params) }),
        ...(schema.Query && { querystring: z.toJSONSchema(schema.Query) }),
        ...(schema.Headers && { headers: z.toJSONSchema(schema.Headers) }),
        response: (
            z.toJSONSchema(schema.Reply.partial()) as { properties: Record<number, unknown>}
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
                request.log.warn(`[@efebia/fastify-zod-reply]: Reply schema of: ${request.routeOptions.url} does not have the specified status code: ${reply.statusCode}`)
                return done(null, payload);
            }
            const serialized = (foundSchema[1] as z.ZodObject).safeParse(payload);
            if (serialized.success) {
                return done(null, serialized.data);
            }
            return done(new Error(mapZodError(serialized.error, 'reply')));
        },
    };
};
