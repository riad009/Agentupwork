import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler, jsonOk, parseJsonBody } from "@/lib/api";
import { requireApiUser } from "@/lib/session";
import { NotFoundError } from "@/lib/errors";
import { searchProfileUpdateSchema } from "@/schemas/search-profile";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

async function assertOwned(userId: string, id: string): Promise<void> {
  const found = await prisma.jobSearchProfile.findFirst({ where: { id, userId }, select: { id: true } });
  if (!found) throw new NotFoundError("Search profile not found.");
}

export const PATCH = apiHandler<Context>(async (request: NextRequest, context) => {
  const user = await requireApiUser();
  const { id } = await context.params;
  await assertOwned(user.id, id);

  const body = await parseJsonBody(request, searchProfileUpdateSchema);
  const profile = await prisma.jobSearchProfile.update({ where: { id }, data: body });

  return jsonOk({ profile });
});

export const DELETE = apiHandler<Context>(async (_request: NextRequest, context) => {
  const user = await requireApiUser();
  const { id } = await context.params;
  await assertOwned(user.id, id);

  await prisma.jobSearchProfile.delete({ where: { id } });
  return jsonOk({ deleted: true });
});
