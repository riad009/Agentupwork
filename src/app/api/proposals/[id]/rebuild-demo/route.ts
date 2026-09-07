import type { NextRequest } from "next/server";
import { apiHandler, enforceRateLimit, jsonOk } from "@/lib/api";
import { requireApiUser } from "@/lib/session";
import { rebuildDemo } from "@/features/proposals/regenerate";

export const runtime = "nodejs";
export const maxDuration = 800;

type Context = { params: Promise<{ id: string }> };

/** Rebuilding a demo costs tokens and build minutes, so it is rate limited. */
export const POST = apiHandler<Context>(async (request: NextRequest, context) => {
  const user = await requireApiUser();
  const { id } = await context.params;

  await enforceRateLimit(request, {
    namespace: "demo-rebuild",
    identifier: user.id,
    limit: 6,
    windowSeconds: 3_600,
  });

  const result = await rebuildDemo(user.id, id);
  return jsonOk(result, { status: result.ok ? 200 : 502 });
});
