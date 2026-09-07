import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { verifyWebhookSignature } from "@/lib/webhook";
import { env } from "@/lib/env";

export const runtime = "nodejs";

interface VercelWebhookPayload {
  type?: string;
  payload?: {
    deployment?: { id?: string; url?: string };
    url?: string;
  };
}

/**
 * Receives Vercel deployment events and keeps deployment rows current.
 *
 * The signature is verified against VERCEL_WEBHOOK_SECRET (falls back to the
 * Upwork webhook secret slot only when explicitly configured); unsigned
 * requests are rejected.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.VERCEL_WEBHOOK_SECRET;
  const rawBody = await request.text();
  const signature = request.headers.get("x-vercel-signature");

  if (!secret) {
    logger.warn("Rejected a Vercel webhook: no VERCEL_WEBHOOK_SECRET is configured");
    return NextResponse.json({ ok: false, error: "Webhooks are not configured." }, { status: 503 });
  }

  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    logger.warn("Rejected a Vercel webhook with an invalid signature");
    return NextResponse.json({ ok: false, error: "Invalid signature." }, { status: 401 });
  }

  let payload: VercelWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as VercelWebhookPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed payload." }, { status: 400 });
  }

  const deploymentId = payload.payload?.deployment?.id;
  if (!deploymentId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const status =
    payload.type === "deployment.succeeded" || payload.type === "deployment.ready"
      ? "READY"
      : payload.type === "deployment.error"
        ? "ERROR"
        : payload.type === "deployment.canceled"
          ? "CANCELED"
          : "BUILDING";

  const updated = await prisma.deployment.updateMany({
    where: { deploymentId },
    data: {
      status,
      readyAt: status === "READY" ? new Date() : undefined,
      errorMessage: status === "ERROR" ? "Vercel reported a failed deployment." : undefined,
    },
  });

  logger.info({ deploymentId, status, matched: updated.count, env: env.NODE_ENV }, "Processed Vercel webhook");

  return NextResponse.json({ ok: true, updated: updated.count });
}
