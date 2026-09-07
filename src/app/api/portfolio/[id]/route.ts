import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler, jsonOk, parseJsonBody } from "@/lib/api";
import { requireApiUser } from "@/lib/session";
import { NotFoundError } from "@/lib/errors";
import { portfolioUpdateSchema } from "@/schemas/portfolio";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

async function assertOwned(userId: string, id: string): Promise<void> {
  const found = await prisma.portfolioProject.findFirst({ where: { id, userId }, select: { id: true } });
  if (!found) throw new NotFoundError("Portfolio project not found.");
}

export const PATCH = apiHandler<Context>(async (request: NextRequest, context) => {
  const user = await requireApiUser();
  const { id } = await context.params;
  await assertOwned(user.id, id);

  const body = await parseJsonBody(request, portfolioUpdateSchema);

  const project = await prisma.portfolioProject.update({
    where: { id },
    data: {
      ...body,
      url: body.url === "" ? null : body.url,
      githubUrl: body.githubUrl === "" ? null : body.githubUrl,
      completedAt: body.completedAt ? new Date(body.completedAt) : body.completedAt === "" ? null : undefined,
    },
  });

  return jsonOk({ project });
});

export const DELETE = apiHandler<Context>(async (_request: NextRequest, context) => {
  const user = await requireApiUser();
  const { id } = await context.params;
  await assertOwned(user.id, id);

  await prisma.portfolioProject.delete({ where: { id } });
  return jsonOk({ deleted: true });
});
