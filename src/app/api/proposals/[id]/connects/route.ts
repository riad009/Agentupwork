import type { NextRequest } from "next/server";
import { apiHandler, jsonOk } from "@/lib/api";
import { requireApiUser } from "@/lib/session";
import { getConnectsPreview } from "@/features/proposals/submit";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

/** Powers the confirmation dialog. Reading Connects never spends them. */
export const GET = apiHandler<Context>(async (_request: NextRequest, context) => {
  const user = await requireApiUser();
  const { id } = await context.params;
  const preview = await getConnectsPreview(user.id, id);
  return jsonOk(preview);
});
