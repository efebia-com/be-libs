import { toJSONSchema, z } from "zod/v4";
import { RouteV4Options } from "./routeV4.js";

export const parse = async (schema: z.ZodTypeAny, payload: any, tag: string) => {
  const result = await schema.safeParseAsync(payload);
  return {
    ...result,
    tag,
  };
};

export const strictifySchema = (schema: z.ZodType, strict: boolean) => {
  if (!strict) return schema;
  return "strict" in schema && typeof schema["strict"] === "function" ? schema.strict() : schema;
};

export const parseStrict = (
  tag: keyof Exclude<NonNullable<RouteV4Options["strict"]>, boolean>,
  value: NonNullable<RouteV4Options["strict"]>,
) => {
  if (typeof value === "boolean") return value;
  return value[tag];
};

export const findStatusCode = (statusCode: number, availableStatusCodes: [string | number, any][]) => {
  return availableStatusCodes.find(([key]) => {
    if (!["number", "string"].includes(typeof key)) return false;
    if (typeof key === "number") return statusCode === key;
    if (/^[0-9]{3}$/.test(key)) return statusCode === parseInt(key);
    if (/^[0-9]xx$/i.test(key)) return statusCode.toString()[0] === key[0];
  });
};

export const mapZodError = (zodError: z.ZodError, prefix: string) => {
  return zodError.issues
    .map((issue) => {
      const pathStr = `Error at ${prefix}->${issue.path.join("->")}`;
      return issue.message ? `${pathStr}->${issue.message}` : pathStr;
    })
    .join("\n");
};

export const buildZodJsonSchemaParams = (io: "input" | "output") => {
  return {
    io,
    reused: "inline",
    target: "draft-7",
    unrepresentable: "any",
    override(ctx) {
      const def = ctx.zodSchema._zod.def;
      if (def.type === "date") {
        ctx.jsonSchema.type = "string";
        // This is commented right now since you'd need to have AJV with custom formats to not throw an error from the Fastify app
        // ctx.jsonSchema.format = "date-time";
      }
    },
  } satisfies Parameters<typeof toJSONSchema>[1];
};
