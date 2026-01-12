import { FastifyReply } from "fastify";
import { createError } from "./error.js";

type ReplyFunction<T> = T extends (...args: any[]) => any
  ? (this: FastifyReply, ...args: Parameters<T>) => ReturnType<T>
  : never;

export const createReply = (
  statusCode: number,
  defaultPayload: object
): ReplyFunction<any> => {
  return function (payload: any) {
    const finalPayload = payload ?? defaultPayload;
    if (typeof finalPayload === 'string')
      throw createError(statusCode)(finalPayload);
    if (typeof finalPayload !== 'undefined') this.type("application/json");
    this.code(statusCode);
    return finalPayload
  };
};