import { FastifyReply } from "fastify";
import { FastifyZodReplyError } from "./error";

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
    this.type("application/json");
    this.code(statusCode);
    return finalPayload
  };
};

export const createError =
  (statusCode: number) =>
  (message: string | { message: string }) => {
    const customError = new FastifyZodReplyError("", statusCode);
    if (typeof message === "string") customError.message = message;
    else customError.message = message.message;

    return customError;
};