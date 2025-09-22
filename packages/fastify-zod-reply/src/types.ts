import {
  ContextConfigDefault,
  FastifyBaseLogger,
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  FastifySchema,
  FastifyTypeProviderDefault,
  type RawReplyDefaultExpression,
  type RawRequestDefaultExpression,
  type RawServerDefault,
  type RouteGenericInterface,
  type RouteShorthandOptions,
} from "fastify";
import { ResolveFastifyReplyReturnType } from "fastify/types/type-provider.js";


export type APIOptions<
  RouteInterface extends RouteGenericInterface = RouteGenericInterface
> = RouteShorthandOptions<
  RawServerDefault,
  RawRequestDefaultExpression<RawServerDefault>,
  RawReplyDefaultExpression<RawServerDefault>,
  RouteInterface
>;

export type APIHandler<RouteInterface extends RouteGenericInterface = RouteGenericInterface, RequestAugmentation extends object = {}, ReplyAugmentation extends object = {}> = (
  this: FastifyInstance<
    RawServerDefault,
    RawRequestDefaultExpression<RawServerDefault>,
    RawReplyDefaultExpression<RawServerDefault>,
    FastifyBaseLogger,
    FastifyTypeProviderDefault
  >,
  request: FastifyRequest<
    RouteInterface,
    RawServerDefault,
    RawRequestDefaultExpression<RawServerDefault>,
    FastifySchema,
    FastifyTypeProviderDefault,
    ContextConfigDefault,
    FastifyBaseLogger
  > & RequestAugmentation,
  reply: FastifyReply<
    RouteInterface,
    RawServerDefault,
    RawRequestDefaultExpression<RawServerDefault>,
    RawReplyDefaultExpression<RawServerDefault>,
    ContextConfigDefault,
    FastifySchema,
    FastifyTypeProviderDefault
  > & ReplyAugmentation
  // This return type used to be a generic type argument. Due to TypeScript's inference of return types, this rendered returns unchecked.
) => ResolveFastifyReplyReturnType<FastifyTypeProviderDefault, FastifySchema, RouteInterface>;

export interface RouteTag { }
export interface RouteSecurity {}
