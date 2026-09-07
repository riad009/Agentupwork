import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler, jsonOk, parseJsonBody } from "@/lib/api";
import { requireApiUser } from "@/lib/session";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { proposalActionSchema } from "@/schemas/proposals";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

/** Reject, shelve, or reopen a proposal. None of these touch Upwork. */
export const POST = apiHandler<Context>(async (request: NextRequest, context) => {
  const user = await requireApiUser();
  const { id } = await context.params;
  const body = await parseJsonBody(request, proposalActionSchema);

  const existing = await prisma.proposal.findFirst({
    where: { id, userId: user.id },
    select: { id: true, status: true, jobId: true },
  });
  if (!existing) throw new NotFoundError("Proposal not found.");
  if (existing.status === "SUBMITTED") {
    throw new ValidationError("A submitted proposal cannot be changed.");
  }

  const data =
    body.action === "REJECT"
      ? { status: "REJECTED" as const, rejectedAt: new Date(), reviewNotes: body.reason ?? null }
      : body.action === "SAVE_FOR_LATER"
        ? { status: "SAVED_FOR_LATER" as const, reviewNotes: body.reason ?? null }
        : { status: "NEEDS_REVIEW" as const, rejectedAt: null };

  const proposal = await prisma.proposal.update({ where: { id }, data });

  if (body.action === "REJECT") {
    await prisma.job.update({ where: { id: existing.jobId }, data: { status: "SKIPPED" } });
  }

  await recordAudit({
    userId: user.id,
    action: `proposal.${body.action.toLowerCase()}`,
    resource: "proposal",
    resourceId: id,
  });

  return jsonOk({ proposal });
});
