import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler, jsonOk, parseJsonBody } from "@/lib/api";
import { requireApiUser } from "@/lib/session";
import { portfolioSchema } from "@/schemas/portfolio";

export const runtime = "nodejs";

export const GET = apiHandler(async () => {
  const user = await requireApiUser();
  const projects = await prisma.portfolioProject.findMany({
    where: { userId: user.id },
    orderBy: [{ highlighted: "desc" }, { createdAt: "desc" }],
  });
  return jsonOk({ projects });
});

export const POST = apiHandler(async (request: NextRequest) => {
  const user = await requireApiUser();
  const body = await parseJsonBody(request, portfolioSchema);

  const project = await prisma.portfolioProject.create({
    data: {
      userId: user.id,
      title: body.title,
      description: body.description,
      technologies: body.technologies,
      url: body.url || null,
      githubUrl: body.githubUrl || null,
      clientIndustry: body.clientIndustry || null,
      projectType: body.projectType || null,
      achievements: body.achievements,
      highlighted: body.highlighted,
      completedAt: body.completedAt ? new Date(body.completedAt) : null,
    },
  });

  return jsonOk({ project }, { status: 201 });
});
