import { getUtilityRedis } from "@/lib/redis";
import { logger } from "@/lib/logger";

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const memoryBuckets = new Map<string, Bucket>();

function memoryLimit(key: string, limit: number, windowSeconds: number): RateLimitResult {
  const now = Date.now();
  const existing = memoryBuckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowSeconds * 1000;
    memoryBuckets.set(key, { count: 1, resetAt });
    return { success: true, limit, remaining: limit - 1, resetAt };
  }

  existing.count += 1;
  const remaining = Math.max(0, limit - existing.count);
  return { success: existing.count <= limit, limit, remaining, resetAt: existing.resetAt };
}

/**
 * Fixed-window rate limiter. Uses Redis when reachable so limits hold across
 * instances, and transparently falls back to an in-process window otherwise.
 */
export async function rateLimit(
  identifier: string,
  options: { limit?: number; windowSeconds?: number; namespace?: string } = {},
): Promise<RateLimitResult> {
  const limit = options.limit ?? Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? 120);
  const windowSeconds = options.windowSeconds ?? Number(process.env.RATE_LIMIT_WINDOW_SECONDS ?? 60);
  const namespace = options.namespace ?? "default";
  const window = Math.floor(Date.now() / (windowSeconds * 1000));
  const key = `ratelimit:${namespace}:${identifier}:${window}`;

  const redis = getUtilityRedis();
  if (!redis) return memoryLimit(key, limit, windowSeconds);

  try {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSeconds);

    const resetAt = (window + 1) * windowSeconds * 1000;
    return { success: count <= limit, limit, remaining: Math.max(0, limit - count), resetAt };
  } catch (error) {
    logger.debug({ err: error }, "Rate limiter falling back to in-memory window");
    return memoryLimit(key, limit, windowSeconds);
  }
}

/** Clears in-memory buckets; used by tests and long-lived worker processes. */
export function resetMemoryRateLimits(): void {
  memoryBuckets.clear();
}
