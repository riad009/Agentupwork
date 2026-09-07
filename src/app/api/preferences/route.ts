import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler, jsonOk, parseJsonBody } from "@/lib/api";
import { requireApiUser } from "@/lib/session";
import { preferencesSchema } from "@/schemas/preferences";
import { getOrCreatePreferences } from "@/features/pipeline/context";

export const runtime = "nodejs";

export const GET = apiHandler(async () => {
  const user = await requireApiUser();
  const preference = await getOrCreatePreferences(user.id);
  return jsonOk({ preference });
});

export const PATCH = apiHandler(async (request: NextRequest) => {
  const user = await requireApiUser();
  const body = await parseJsonBody(request, preferencesSchema);
  await getOrCreatePreferences(user.id);

  const data = { ...body };
  if (data.portfolioUrl === "") data.portfolioUrl = null;

  const preference = await prisma.userPreference.update({
    where: { userId: user.id },
    data,
  });

  return jsonOk({ preference });
});
