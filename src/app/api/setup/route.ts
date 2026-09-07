import { z } from "zod";
import type { NextRequest } from "next/server";
import { apiHandler, clientIdentifier, enforceRateLimit, jsonOk, parseJsonBody } from "@/lib/api";
import { AppError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { safeEqual } from "@/lib/crypto";
import { recordAudit } from "@/lib/audit";
import { ensureIndexes } from "@/features/setup/indexes";
import { seedWorkspace } from "@/features/setup/seed";
import { passwordSchema } from "@/schemas/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  name: z.string().trim().min(2).max(80),
});

/**
 * One-time bootstrap for a fresh deployment: creates the MongoDB indexes that
 * back the schema's unique constraints, then seeds the first administrator.
 *
 * Guarded by SETUP_SECRET, which must be supplied in the x-setup-secret header.
 * When that variable is absent the route does not exist at all, so a deployed
 * instance cannot be bootstrapped by anyone who has not been given the secret.
 * Remove SETUP_SECRET once you have signed in.
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const secret = process.env.SETUP_SECRET;
  if (!secret) throw new NotFoundError("Not found.");

  await enforceRateLimit(request, { namespace: "setup", limit: 5, windowSeconds: 600 });

  const provided = request.headers.get("x-setup-secret");
  if (!provided || !safeEqual(provided, secret)) {
    await recordAudit({
      action: "setup.rejected",
      success: false,
      ip: clientIdentifier(request),
      userAgent: request.headers.get("user-agent"),
    }).catch(() => undefined);
    throw new ForbiddenError("Invalid setup secret.");
  }

  const body = await parseJsonBody(request, bodySchema);

  // Bootstrap failures are reported verbatim. The caller already proved they
  // hold the setup secret, and a connection or permission error is unusable
  // as a diagnostic if it is flattened to "something went wrong".
  let indexes;
  let seeded;
  try {
    indexes = await ensureIndexes();
    seeded = await seedWorkspace(body);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new AppError(`Bootstrap failed: ${detail.slice(0, 1_500)}`, {
      statusCode: 500,
      code: "SETUP_FAILED",
      expose: true,
    });
  }

  await recordAudit({
    userId: seeded.userId,
    action: "setup.completed",
    resource: "user",
    resourceId: seeded.userId,
    ip: clientIdentifier(request),
    metadata: { indexesCreated: indexes.created, created: seeded.created },
  }).catch(() => undefined);

  return jsonOk({
    indexes: { created: indexes.created, alreadyPresent: indexes.alreadyPresent, failed: indexes.failed },
    account: {
      email: seeded.email,
      role: seeded.role,
      created: seeded.created,
      searchProfiles: seeded.searchProfiles,
      portfolioProjects: seeded.portfolioProjects,
    },
  });
});
