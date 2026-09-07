import { logger } from "@/lib/logger";
import { toErrorMessage } from "@/lib/errors";

type Severity = "fatal" | "error" | "warning" | "info";

interface CaptureContext {
  userId?: string;
  operation?: string;
  severity?: Severity;
  extra?: Record<string, unknown>;
}

interface SentryDsnParts {
  protocol: string;
  publicKey: string;
  host: string;
  projectId: string;
}

function parseDsn(dsn: string): SentryDsnParts | null {
  const match = /^(https?):\/\/([^@]+)@([^/]+)\/(.+)$/.exec(dsn.trim());
  if (!match) return null;
  const [, protocol, publicKey, host, projectId] = match;
  return { protocol, publicKey, host, projectId };
}

/**
 * Minimal Sentry envelope transport. Keeping this dependency-free means error
 * monitoring works in the Next server, in workers, and in scripts alike; if no
 * DSN is configured everything degrades to structured logging.
 */
async function sendToSentry(error: unknown, context: CaptureContext): Promise<void> {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  const parts = parseDsn(dsn);
  if (!parts) return;

  const eventId = crypto.randomUUID().replace(/-/g, "");
  const timestamp = new Date().toISOString();
  const endpoint = `${parts.protocol}://${parts.host}/api/${parts.projectId}/envelope/`;

  const event = {
    event_id: eventId,
    timestamp,
    platform: "node",
    level: context.severity ?? "error",
    environment: process.env.NODE_ENV ?? "development",
    server_name: "upwork-ai-job-hunter",
    tags: { operation: context.operation ?? "unknown" },
    user: context.userId ? { id: context.userId } : undefined,
    extra: context.extra,
    exception: {
      values: [
        {
          type: error instanceof Error ? error.name : "Error",
          value: toErrorMessage(error),
          stacktrace:
            error instanceof Error && error.stack
              ? { frames: [{ filename: "app", function: error.stack.split("\n")[1]?.trim() }] }
              : undefined,
        },
      ],
    },
  };

  const body = [
    JSON.stringify({ event_id: eventId, sent_at: timestamp, dsn }),
    JSON.stringify({ type: "event" }),
    JSON.stringify(event),
  ].join("\n");

  try {
    await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-sentry-envelope",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${parts.publicKey}, sentry_client=uajh/1.0`,
      },
      body,
      signal: AbortSignal.timeout(5_000),
    });
  } catch (transportError) {
    logger.debug({ err: transportError }, "Failed to deliver Sentry envelope");
  }
}

export function captureException(error: unknown, context: CaptureContext = {}): void {
  logger.error(
    { err: error, userId: context.userId, operation: context.operation, ...context.extra },
    toErrorMessage(error),
  );
  void sendToSentry(error, context);
}

export function captureMessage(message: string, context: CaptureContext = {}): void {
  logger.warn({ userId: context.userId, operation: context.operation, ...context.extra }, message);
}
