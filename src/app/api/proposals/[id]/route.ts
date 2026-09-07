import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler, jsonOk, parseJsonBody } from "@/lib/api";
import { requireApiUser } from "@/lib/session";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { proposalUpdateSchema } from "@/schemas/proposals";
import { getProposal } from "@/features/proposals/queries";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export const GET = apiHandler<Context>(async (_request: NextRequest, context) => {
  const user = await requireApiUser();
  const { id } = await context.params;

  const proposal = await getProposal(user.id, id);
  if (!proposal) throw new NotFoundError("Proposal not found.");

  return jsonOk({ proposal });
});

/** Saves manual edits. A submitted proposal is immutable. */
export const PATCH = apiHandler<Context>(async (request: NextRequest, context) => {
  const user = await requireApiUser();
  const { id } = await context.params;

  const existing = await prisma.proposal.findFirst({
    where: { id, userId: user.id },
    select: { id: true, status: true },
  });
  if (!existing) throw new NotFoundError("Proposal not found.");
  if (existing.status === "SUBMITTED") {
    throw new ValidationError("A submitted proposal can no longer be edited.");
  }

  const body = await parseJsonBody(request, proposalUpdateSchema);

  const proposal = await prisma.proposal.update({
    where: { id },
    data: {
      editedContent: body.editedContent,
      bidAmount: body.bidAmount ?? undefined,
      bidHourlyRate: body.bidHourlyRate ?? undefined,
      reviewNotes: body.reviewNotes ?? undefined,
      status: existing.status === "REJECTED" ? "NEEDS_REVIEW" : existing.status,
    },
  });

  return jsonOk({ proposal });
});
