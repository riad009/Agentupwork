import { logger } from "@/lib/logger";

export interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  factor?: number;
  jitter?: boolean;
  label?: string;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Exponential backoff with jitter. Used for every outbound integration call so
 * a transient 5xx never kills a pipeline run.
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const {
    attempts = 3,
    baseDelayMs = 500,
    maxDelayMs = 15_000,
    factor = 2,
    jitter = true,
    label = "operation",
    shouldRetry = () => true,
    onRetry,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt >= attempts || !shouldRetry(error, attempt)) break;

      const exponential = Math.min(baseDelayMs * factor ** (attempt - 1), maxDelayMs);
      const delay = jitter ? Math.round(exponential * (0.5 + Math.random() * 0.5)) : exponential;

      logger.warn({ label, attempt, delay, err: error }, "Retrying after failure");
      onRetry?.(error, attempt, delay);
      await sleep(delay);
    }
  }

  throw lastError;
}

export function isRetryableHttpStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}
