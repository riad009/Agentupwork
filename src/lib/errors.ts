export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;
  readonly expose: boolean;

  constructor(
    message: string,
    options: { statusCode?: number; code?: string; details?: unknown; expose?: boolean } = {},
  ) {
    super(message);
    this.name = new.target.name;
    this.statusCode = options.statusCode ?? 500;
    this.code = options.code ?? "INTERNAL_ERROR";
    this.details = options.details;
    this.expose = options.expose ?? this.statusCode < 500;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "You must be signed in to do that.") {
    super(message, { statusCode: 401, code: "UNAUTHORIZED" });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have access to this resource.") {
    super(message, { statusCode: 403, code: "FORBIDDEN" });
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found.") {
    super(message, { statusCode: 404, code: "NOT_FOUND" });
  }
}

export class ValidationError extends AppError {
  constructor(message = "Invalid request.", details?: unknown) {
    super(message, { statusCode: 422, code: "VALIDATION_ERROR", details });
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource already exists.") {
    super(message, { statusCode: 409, code: "CONFLICT" });
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Too many requests. Please slow down.") {
    super(message, { statusCode: 429, code: "RATE_LIMITED" });
  }
}

export class IntegrationError extends AppError {
  readonly provider: string;

  constructor(provider: string, message: string, details?: unknown) {
    super(message, { statusCode: 502, code: `${provider.toUpperCase()}_ERROR`, details, expose: true });
    this.provider = provider;
  }
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
}
