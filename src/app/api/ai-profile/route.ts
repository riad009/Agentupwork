import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler, jsonOk, parseJsonBody } from "@/lib/api";
import { requireApiUser } from "@/lib/session";
import { aiProfileSchema } from "@/schemas/preferences";

export const runtime = "nodejs";

export const GET = apiHandler(async () => {
  const user = await requireApiUser();
  const profile = await prisma.aiProfile.findUnique({ where: { userId: user.id } });
  return jsonOk({ profile });
});

export const PUT = apiHandler(async (request: NextRequest) => {
  const user = await requireApiUser();
  const body = await parseJsonBody(request, aiProfileSchema);

  const profile = await prisma.aiProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...body },
    update: body,
  });

  return jsonOk({ profile });
});
