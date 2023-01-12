import { FastifyReply } from "fastify";
const name = '@efebia/fastify-reply';

type ReplyFunction<T> = T extends (...args: any[]) => any
  ? (this: FastifyReply, ...args: Parameters<T>) => ReturnType<T>
  : never;

export const createReply = (
  statusCode: number,
  defaultPayload: object
): ReplyFunction<any> => {
  return function (payload: any) {
    const finalPayload = payload ?? defaultPayload;
    if (!/^2/u.test(statusCode.toString()))
      throw createError(statusCode)(finalPayload as any);
    this.type("application/json");
    this.code(statusCode);
    const serialized = this.serialize(finalPayload);
    if (serialized == `"[object Object]"`)
      throw new Error(`${name}: Response schema didn't expect an object`);
    this.send(serialized);
  };
};

export const createError =
  (statusCode: number) =>
  (message: string | { statusCode: number; message: string }) => {
    const customError: Error & { statusCode?: number } = new Error();
    if (typeof message === "string") {
      customError.statusCode = statusCode;
      customError.message = message;
      return customError;
    }

    customError.statusCode = message.statusCode;
    customError.message = message.message;

    return customError;
};