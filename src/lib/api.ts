import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodType } from "zod";
import { AppError, RateLimitError, ValidationError, toErrorMessage } from "@/lib/errors";
import { captureException } from "@/lib/monitoring";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiFailure {
  ok: false;
  error: { message: string; code: string; details?: unknown };
}

export function jsonOk<T>(data: T, init?: ResponseInit): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ ok: true, data }, init);
}

export function jsonError(
  message: string,
  options: { status?: number; code?: string; details?: unknown } = {},
): NextResponse<ApiFailure> {
  return NextResponse.json(
    {
      ok: false,
      error: { message, code: options.code ?? "ERROR", details: options.details },
    },
    { status: options.status ?? 400 },
  );
}

function normaliseError(error: unknown): NextResponse<ApiFailure> {
  if (error instanceof ZodError) {
    return jsonError("The submitted data is invalid.", {
      status: 422,
      code: "VALIDATION_ERROR",
      details: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  if (error instanceof AppError) {
    if (!error.expose) {
      captureException(error, { operation: "api" });
      return jsonError("Something went wrong on our side.", {
        status: error.statusCode,
        code: error.code,
      });
    }
    return jsonError(error.message, {
      status: error.statusCode,
      code: error.code,
      details: error.details,
    });
  }

  captureException(error, { operation: "api" });
  return jsonError("Something went wrong on our side.", { status: 500, code: "INTERNAL_ERROR" });
}

type RouteContext = { params: Promise<Record<string, string>> };

/**
 * Wraps a route handler with structured logging, typed error mapping and a
 * consistent JSON envelope.
 */
export function apiHandler<C extends RouteContext | undefined = undefined>(
  handler: (request: NextRequest, context: C) => Promise<NextResponse> | NextResponse,
) {
  return async (request: NextRequest, context: C): Promise<NextResponse> => {
    const startedAt = Date.now();
    try {
      const response = await handler(request, context);
      logger.debug(
        {
          method: request.method,
          path: new URL(request.url).pathname,
          status: response.status,
          durationMs: Date.now() - startedAt,
        },
        "api request",
      );
      return response;
    } catch (error) {
      const response = normaliseError(error);
      logger.warn(
        {
          method: request.method,
          path: new URL(request.url).pathname,
          status: response.status,
          durationMs: Date.now() - startedAt,
          message: toErrorMessage(error),
        },
        "api request failed",
      );
      return response;
    }
  };
}

export async function parseJsonBody<T>(request: NextRequest, schema: ZodType<T>): Promise<T> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    throw new ValidationError("Request body must be valid JSON.");
  }
  return schema.parse(payload);
}

export function parseSearchParams<T>(request: NextRequest, schema: ZodType<T>): T {
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  return schema.parse(params);
}

export function clientIdentifier(request: NextRequest, fallback = "anonymous"): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? fallback;
}

export async function enforceRateLimit(
  request: NextRequest,
  options: { namespace: string; limit?: number; windowSeconds?: number; identifier?: string },
): Promise<void> {
  const identifier = options.identifier ?? clientIdentifier(request);
  const result = await rateLimit(identifier, {
    namespace: options.namespace,
    limit: options.limit,
    windowSeconds: options.windowSeconds,
  });

  if (!result.success) {
    throw new RateLimitError(
      `Rate limit reached. Try again in ${Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000))}s.`,
    );
  }
}
