import { z } from "zod";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler, enforceRateLimit, jsonOk, parseJsonBody } from "@/lib/api";
import { requireApiUser } from "@/lib/session";
import { ConflictError, ValidationError } from "@/lib/errors";
import { enqueueAutomationRun } from "@/workers/enqueue";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  searchProfileIds: z.array(z.string().min(1)).max(20).optional(),
  skipDemos: z.boolean().optional(),
});

/** Starts a manual automation run. Never submits anything to Upwork. */
export const POST = apiHandler(async (request: NextRequest) => {
  const user = await requireApiUser();
  await enforceRateLimit(request, { namespace: "automation-run", identifier: user.id, limit: 6, windowSeconds: 3_600 });

  const body = await parseJsonBody(request, bodySchema);

  const inFlight = await prisma.automationRun.findFirst({
    where: { userId: user.id, status: { in: ["QUEUED", "RUNNING"] } },
    select: { id: true },
  });
  if (inFlight) {
    throw new ConflictError("An automation run is already in progress.");
  }

  const activeProfiles = await prisma.jobSearchProfile.count({
    where: { userId: user.id, isActive: true },
  });
  if (activeProfiles === 0) {
    throw new ValidationError("Create at least one active job search profile before running the automation.");
  }

  const result = await enqueueAutomationRun({
    userId: user.id,
    trigger: "MANUAL",
    searchProfileIds: body.searchProfileIds,
    skipDemos: body.skipDemos,
  });

  await recordAudit({ userId: user.id, action: "automation.run.triggered", metadata: { mode: result.mode } });

  return jsonOk({ started: true, mode: result.mode, jobId: result.jobId ?? null }, { status: 202 });
});
