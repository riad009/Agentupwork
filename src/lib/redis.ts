import IORedis, { type Redis } from "ioredis";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

const globalForRedis = globalThis as unknown as { redis?: Redis };

/**
 * Shared Redis connection. BullMQ requires `maxRetriesPerRequest: null`, so the
 * same options are used everywhere to avoid two divergent clients.
 */
export function getRedis(): Redis {
  if (globalForRedis.redis) return globalForRedis.redis;

  const client = new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: false,
    retryStrategy: (times) => Math.min(times * 250, 5_000),
  });

  client.on("error", (error) => {
    logger.error({ err: error }, "Redis connection error");
  });

  globalForRedis.redis = client;
  return client;
}

export async function isRedisAvailable(): Promise<boolean> {
  try {
    const pong = await getRedis().ping();
    return pong === "PONG";
  } catch {
    return false;
  }
}
