import type { FastifyReply, FastifyRequest } from "fastify";
import type { z } from "zod/v4";
import { mapZodIssues } from "./routeHelpers.js";

export type ValidationSource = "body" | "query" | "params" | "headers";

export type ValidationIssue = z.core.$ZodIssue;

export type ValidationErrorResult = {
  /** Defaults to 400 */
  statusCode?: number;
  /** Strings are sent verbatim, anything else is sent as JSON */
  body: unknown;
};

export type ValidationErrorFormatter = (issues: ValidationIssue[], source: ValidationSource) => ValidationErrorResult;

export const defaultValidationErrorFormatter: ValidationErrorFormatter = (issues, source) => ({
  statusCode: 400,
  body: { message: mapZodIssues(issues, source) },
});

export const VALIDATION_FORMATTER_DECORATOR = "zodReplyValidationErrorFormatter";

export const sendValidationError = (
  request: FastifyRequest,
  reply: FastifyReply,
  issues: ValidationIssue[],
  source: ValidationSource,
  routeFormatter: ValidationErrorFormatter | undefined,
) => {
  const formatter: ValidationErrorFormatter =
    routeFormatter ??
    ((request.server as unknown as Record<string, ValidationErrorFormatter | undefined>)[VALIDATION_FORMATTER_DECORATOR]) ??
    defaultValidationErrorFormatter;
  const { statusCode = 400, body } = formatter(issues, source);
  return reply
    .code(statusCode as any)
    .type("application/json")
    .send(
      // Custom bodies go out pre-serialized so a route's 400 reply schema can't strip or reject them;
      // the default stays an object to keep 1.5.x output untouched.
      (formatter === defaultValidationErrorFormatter || typeof body === "string" ? body : JSON.stringify(body)) as any,
    );
};
