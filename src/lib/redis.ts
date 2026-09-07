import IORedis, { type Redis } from "ioredis";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

const globalForRedis = globalThis as unknown as {
  queueRedis?: Redis;
  utilityRedis?: Redis | null;
};

/**
 * Connection used by BullMQ.
 *
 * BullMQ requires `maxRetriesPerRequest: null`, which makes commands queue
 * indefinitely while the server is unreachable. That is correct for a
 * long-lived worker and wrong for anything serving a request, so this client is
 * kept separate from the one below.
 */
export function getRedis(): Redis {
  if (globalForRedis.queueRedis) return globalForRedis.queueRedis;

  const client = new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: false,
    retryStrategy: (times) => Math.min(times * 250, 5_000),
  });

  client.on("error", (error) => {
    logger.debug({ err: error }, "Queue Redis connection error");
  });

  globalForRedis.queueRedis = client;
  return client;
}

/**
 * Fail-fast connection for request-path use (rate limiting, health checks).
 *
 * `enableOfflineQueue: false` plus a short connect timeout means commands
 * reject immediately when Redis is absent instead of hanging until the platform
 * kills the request — which is what lets those callers fall back cleanly.
 * Returns null when no Redis is configured for this deployment.
 */
export function getUtilityRedis(): Redis | null {
  if (globalForRedis.utilityRedis !== undefined) return globalForRedis.utilityRedis;

  if (!isRedisConfigured()) {
    globalForRedis.utilityRedis = null;
    return null;
  }

  const client = new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    enableReadyCheck: false,
    lazyConnect: true,
    connectTimeout: 1_500,
    commandTimeout: 1_500,
    retryStrategy: (times) => (times > 3 ? null : 500),
  });

  client.on("error", (error) => {
    logger.debug({ err: error }, "Utility Redis connection error");
  });

  globalForRedis.utilityRedis = client;
  return client;
}

/**
 * Whether a usable Redis is configured. A localhost URL in a deployed
 * environment is treated as absent: nothing is listening there, and attempting
 * it only costs the request its connect timeout.
 */
export function isRedisConfigured(): boolean {
  const url = process.env.REDIS_URL;
  if (!url) return false;
  if (process.env.NODE_ENV === "production" && /\/\/(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url)) {
    return false;
  }
  return true;
}

export async function isRedisAvailable(): Promise<boolean> {
  const client = getUtilityRedis();
  if (!client) return false;

  try {
    const pong = await client.ping();
    return pong === "PONG";
  } catch {
    return false;
  }
}
