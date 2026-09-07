import type { NextRequest } from "next/server";
import { apiHandler, clientIdentifier, enforceRateLimit, jsonOk, parseJsonBody } from "@/lib/api";
import { requireApiUser } from "@/lib/session";
import { submitConfirmationSchema } from "@/schemas/proposals";
import { getConnectsPreview, submitProposal } from "@/features/proposals/submit";
import { ValidationError } from "@/lib/errors";

export const runtime = "nodejs";
export const maxDuration = 120;

type Context = { params: Promise<{ id: string }> };

/**
 * The single entry point that can spend Connects.
 *
 * It requires an explicit acknowledgement and the Connects figure the user was
 * shown, so a stale dialog can never authorise an unexpected cost.
 */
export const POST = apiHandler<Context>(async (request: NextRequest, context) => {
  const user = await requireApiUser();
  const { id } = await context.params;

  await enforceRateLimit(request, {
    namespace: "proposal-submit",
    identifier: user.id,
    limit: 20,
    windowSeconds: 3_600,
  });

  const body = await parseJsonBody(request, submitConfirmationSchema);
  const preview = await getConnectsPreview(user.id, id);

  if (
    preview.connectsRequired !== null &&
    body.confirmedConnects !== null &&
    preview.connectsRequired !== body.confirmedConnects
  ) {
    throw new ValidationError(
      `The Connects cost changed from ${body.confirmedConnects} to ${preview.connectsRequired}. Review it again before submitting.`,
    );
  }

  if (
    preview.connectsRequired !== null &&
    preview.connectsAvailable !== null &&
    preview.connectsAvailable < preview.connectsRequired
  ) {
    throw new ValidationError(
      `You have ${preview.connectsAvailable} Connects but this proposal needs ${preview.connectsRequired}.`,
    );
  }

  const result = await submitProposal(user.id, id, {
    ip: clientIdentifier(request),
    userAgent: request.headers.get("user-agent"),
  });

  return jsonOk(result, { status: result.status === "SUCCESS" ? 200 : 409 });
});
