import { z } from "zod";
import type { NextRequest } from "next/server";
import { apiHandler, enforceRateLimit, jsonOk, parseJsonBody } from "@/lib/api";
import { requireApiUser } from "@/lib/session";
import { regenerateBrief, regenerateProposal } from "@/features/proposals/regenerate";

export const runtime = "nodejs";
export const maxDuration = 300;

type Context = { params: Promise<{ id: string }> };

const bodySchema = z.object({ target: z.enum(["PROPOSAL", "BRIEF"]).default("PROPOSAL") });

export const POST = apiHandler<Context>(async (request: NextRequest, context) => {
  const user = await requireApiUser();
  const { id } = await context.params;

  await enforceRateLimit(request, {
    namespace: "proposal-regenerate",
    identifier: user.id,
    limit: 30,
    windowSeconds: 3_600,
  });

  const body = await parseJsonBody(request, bodySchema);

  if (body.target === "BRIEF") {
    const result = await regenerateBrief(user.id, id);
    return jsonOk(result, { status: result.ok ? 200 : 502 });
  }

  const result = await regenerateProposal(user.id, id);
  return jsonOk({ ok: true, content: result.content });
});
