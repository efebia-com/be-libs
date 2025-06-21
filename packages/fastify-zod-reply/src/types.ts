import {
    type RawReplyDefaultExpression,
    type RawRequestDefaultExpression,
    type RawServerDefault,
    type RouteGenericInterface,
    type RouteHandlerMethod,
    type RouteShorthandOptions,
} from 'fastify';

export type APIOptions<RouteInterface extends RouteGenericInterface = RouteGenericInterface> = RouteShorthandOptions<
    RawServerDefault,
    RawRequestDefaultExpression<RawServerDefault>,
    RawReplyDefaultExpression<RawServerDefault>,
    RouteInterface
>;

export type APIHandler<RouteInterface extends RouteGenericInterface = RouteGenericInterface> = RouteHandlerMethod<
    RawServerDefault,
    RawRequestDefaultExpression<RawServerDefault>,
    RawReplyDefaultExpression<RawServerDefault>,
    RouteInterface
>;

export interface RouteTag {}
export interface RouteSecurity {}

export type StatusCodeKey = 'ok' | 'created' | 'accepted' | 'noContent' | 'badRequest' | 'unauthorized' | 'forbidden' | 'notFound' | 'notAcceptable' | 'conflict' | 'internalServerError'
