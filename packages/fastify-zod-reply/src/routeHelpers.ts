import { FastifyBaseLogger, FastifyReply } from "fastify";
import { Readable } from "node:stream";
import { z } from "zod/v4";
import { FastifyZodReplyError } from "./error.js";
import { RouteV4Options } from "./routeV4.js";
import { SSEReplyShape, SSERouteV4Options } from "./sseRouteV4.js";

export const parse = async (
  schema: z.ZodTypeAny,
  payload: any,
  tag: string
) => {
  const result = await schema.safeParseAsync(payload);
  return {
    ...result,
    tag,
  };
};

export const strictifySchema = (schema: z.ZodType, strict: boolean) => {
  if (!strict) return schema;
  return "strict" in schema && typeof schema["strict"] === "function"
    ? schema.strict()
    : schema;
};

export const parseStrict = (
  tag: keyof Exclude<NonNullable<RouteV4Options["strict"]>, boolean>,
  value: NonNullable<RouteV4Options["strict"]>
) => {
  if (typeof value === "boolean") return value;
  return value[tag];
};

export const findStatusCode = (
  statusCode: number,
  availableStatusCodes: [string | number, any][]
) => {
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

// SSE helpers
export async function sendSseStream<T extends SSEReplyShape>({
	reply,
	stream,
	schema,
	options = {},
}: {
	reply: FastifyReply;
	stream: AsyncGenerator<T>;
	schema: z.ZodType<T>;
	options?: SSERouteV4Options['sse'];
}) {
	reply.headers({
		'Content-Type': 'text/event-stream',
		'Cache-Control': 'no-cache, no-transform',
		Connection: 'keep-alive',
		Vary: 'Origin',
		'X-Accel-Buffering': 'no',
	});

	const sseStream = Readable.from(
		createSSEStream({
			stream,
			schema,
			logger: reply.log,
			validate: options.validateStream ?? true, // Default to true if not provided
			intervalMs: options.keepAliveInterval,
			onError: options.onError,
		})
	);

	return reply.send(sseStream);
}

/**
 * Creates an SSE stream that conditionally validates each item against a Zod schema.
 */
async function* createSSEStream<T extends SSEReplyShape>({
	stream,
	schema,
	logger,
	validate,
	onError,
	intervalMs = 30_000,
}: {
	stream: AsyncGenerator<T>;
	schema: z.ZodType<T>;
	logger: FastifyBaseLogger;
	validate: boolean;
	onError?: (error: unknown) => void;
	intervalMs?: number;
}): AsyncGenerator<string> {
	const streamIterator = stream[Symbol.asyncIterator]();
	let keepAliveTimeout: NodeJS.Timeout | null = null;

	const scheduleKeepAlive = () =>
		new Promise<{ isKeepAlive: true }>((resolve) => {
			if (keepAliveTimeout) clearTimeout(keepAliveTimeout);
			keepAliveTimeout = setTimeout(() => resolve({ isKeepAlive: true }), intervalMs);
		});

	let nextChunkPromise = streamIterator.next();

	try {
		while (true) {
			const keepAlivePromise = scheduleKeepAlive();
			const result = await Promise.race([nextChunkPromise, keepAlivePromise]);

			if ('isKeepAlive' in result && result.isKeepAlive) {
				yield ': keep-alive\n\n';
				continue;
			}

			if ('done' in result) {
				if (keepAliveTimeout) clearTimeout(keepAliveTimeout);
				if (result.done) break;

				let itemToSend: SSEReplyShape;

				if (validate) {
					const validation = schema.safeParse(result.value);
					if (!validation.success) {
						const errorMessage = mapZodError(validation.error, 'stream-item');
						logger.error(`SSE Stream validation error: ${errorMessage}`);

						if (onError) onError(new FastifyZodReplyError(errorMessage, 500));
						yield formatSSEMessage({ event: 'error', data: errorMessage });

						// Move to the next iteration after sending the error
						nextChunkPromise = streamIterator.next();
						continue;
					}
					itemToSend = validation.data;
				} else {
					// If not validating, trust the input type and use the value directly
					itemToSend = result.value;
				}

				yield formatSSEMessage(itemToSend);
				nextChunkPromise = streamIterator.next();
			}
		}
	} catch (error) {
		if (onError) onError(error);
		logger.error(error);

		if (error instanceof Error && error.name !== 'AbortError') {
			yield formatSSEMessage({ event: 'error', data: error.message });
		}
	} finally {
		if (keepAliveTimeout) clearTimeout(keepAliveTimeout);
	}
}

function formatSSEMessage(message: SSEReplyShape): string {
  let output = "";

  if (message.id !== undefined) {
    output += `id: ${String(message.id)}\n`;
  }
  if (message.retry !== undefined) {
    output += `retry: ${message.retry}\n`;
  }

  if (message.event) {
    output += `event: ${message.event}\n`;
  }
  output += `data: ${JSON.stringify(message.data)}\n\n`

  return output;
}
