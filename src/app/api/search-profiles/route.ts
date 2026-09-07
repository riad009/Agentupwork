import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiHandler, jsonOk, parseJsonBody } from "@/lib/api";
import { requireApiUser } from "@/lib/session";
import { ConflictError } from "@/lib/errors";
import { searchProfileSchema } from "@/schemas/search-profile";

export const runtime = "nodejs";

export const GET = apiHandler(async () => {
  const user = await requireApiUser();
  const profiles = await prisma.jobSearchProfile.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { jobs: true } } },
  });
  return jsonOk({ profiles });
});

export const POST = apiHandler(async (request: NextRequest) => {
  const user = await requireApiUser();
  const body = await parseJsonBody(request, searchProfileSchema);

  try {
    const profile = await prisma.jobSearchProfile.create({
      data: { ...body, userId: user.id },
    });
    return jsonOk({ profile }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ConflictError("You already have a search profile with that name.");
    }
    throw error;
  }
});
