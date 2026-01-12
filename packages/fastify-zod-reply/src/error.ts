export class FastifyZodReplyError extends Error {
  statusCode: number;
  constructor(message?: string, statusCode?: number) {
    super(message);
    this.statusCode = statusCode ?? -1;
  }
}

export const createError =
  (statusCode: number) =>
  (message: string | { message: string }) => {
    const customError = new FastifyZodReplyError("", statusCode);
    if (typeof message === "string") customError.message = message;
    else customError.message = message.message;

    return customError;
};

type FastifyZodReplyErrorObjectItem = { statusCode: number; payload: string | { message: string } };

const DEFAULT_OBJECT = {
  badRequest: { statusCode: 400, payload: { message: "badRequest" } },
  unauthorized: { statusCode: 401, payload: { message: "unauthorized" } },
  forbidden: { statusCode: 403, payload: { message: "forbidden" } },
  notFound: { statusCode: 404, payload: { message: "notFound" } },
  notAcceptable: { statusCode: 406, payload: { message: "notAcceptable" } },
  conflict: { statusCode: 409, payload: { message: "conflict" } },
  internalServerError: {
    statusCode: 500,
    payload: { message: "internalServerError" },
  },
} as const satisfies Record<string, FastifyZodReplyErrorObjectItem>;

type ReverseFastifyZodReplyErrorObjectItem<TOverrides extends Record<string, FastifyZodReplyErrorObjectItem>> = {
    [key in keyof TOverrides as TOverrides[key]['statusCode']]: {
        label: key
        payload: TOverrides[key]['payload']
    }
}

type Deduplicate<TOverrides extends Record<string, FastifyZodReplyErrorObjectItem>> = {
    [key in keyof typeof DEFAULT_OBJECT as typeof DEFAULT_OBJECT[key]['statusCode'] extends keyof ReverseFastifyZodReplyErrorObjectItem<TOverrides> ? never : key]: typeof DEFAULT_OBJECT[key]
} & TOverrides

type FastifyZodReplyErrorObject<TOverrides extends Record<string, FastifyZodReplyErrorObjectItem>> = {
    [key in keyof Deduplicate<TOverrides>]: (arg?: string | { message: string }) => FastifyZodReplyError
}

export const buildHTTPErrorObject = <const TRecord extends Record<string, FastifyZodReplyErrorObjectItem>>(
  overrides?: TRecord
): FastifyZodReplyErrorObject<TRecord> => {
  return Object.fromEntries(
    [...Object.entries(overrides ?? {})
      .concat(Object.entries(DEFAULT_OBJECT))
      .reduce((acc, [label, value]) => {
        if (acc.get(value.statusCode)) return acc;
        acc.set(value.statusCode, { label, obj: value });
        return acc;
      }, new Map<number, { label: string; obj: FastifyZodReplyErrorObjectItem }>())
      .entries()].map(([statusCode, value]) => {

        const baseErrorFn = createError(statusCode)

        return [value.label, (arg?: string | { message: string }) => baseErrorFn(arg ?? value.obj.payload)]
      })
  ) as any;
};
