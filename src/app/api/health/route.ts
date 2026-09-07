import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isRedisAvailable } from "@/lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Liveness and dependency probe. Exposes no configuration values. */
export async function GET() {
  const checks = { database: false, redis: false };

  try {
    await prisma.$runCommandRaw({ ping: 1 });
    checks.database = true;
  } catch {
    checks.database = false;
  }

  checks.redis = await isRedisAvailable();

  const healthy = checks.database;

  return NextResponse.json(
    { status: healthy ? "ok" : "degraded", checks, timestamp: new Date().toISOString() },
    { status: healthy ? 200 : 503 },
  );
}
