import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export interface AuditEntry {
  userId?: string | null;
  action: string;
  resource?: string;
  resourceId?: string;
  success?: boolean;
  statusCode?: number;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

const SENSITIVE_KEYS = /token|secret|password|apikey|api_key|authorization/i;

function scrub(metadata: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!metadata) return undefined;
  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => [
      key,
      SENSITIVE_KEYS.test(key) ? "[redacted]" : value,
    ]),
  );
}

/** Fire-and-forget audit trail. Never blocks the caller's happy path. */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId ?? null,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId,
        success: entry.success ?? true,
        statusCode: entry.statusCode,
        ip: entry.ip ?? null,
        userAgent: entry.userAgent ?? null,
        metadata: scrub(entry.metadata) as never,
      },
    });
  } catch (error) {
    logger.warn({ err: error, action: entry.action }, "Failed to write audit log");
  }
}
