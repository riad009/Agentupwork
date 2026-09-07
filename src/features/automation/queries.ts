import "server-only";
import { prisma } from "@/lib/prisma";

export async function listAutomationRuns(userId: string, page = 1, pageSize = 20) {
  const [total, items] = await Promise.all([
    prisma.automationRun.count({ where: { userId } }),
    prisma.automationRun.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { logs: true, runJobs: true, proposals: true } } },
    }),
  ]);

  return { total, page, pageSize, items };
}

export async function getAutomationRun(userId: string, runId: string) {
  return prisma.automationRun.findFirst({
    where: { id: runId, userId },
    include: {
      logs: { orderBy: { createdAt: "asc" }, take: 500 },
      runJobs: {
        orderBy: [{ selected: "desc" }, { rank: "asc" }],
        include: {
          job: {
            select: {
              id: true,
              title: true,
              url: true,
              analysis: { select: { overallScore: true, recommendedAction: true } },
            },
          },
        },
        take: 200,
      },
      proposals: {
        include: { proposal: { select: { id: true, status: true, job: { select: { title: true } } } } },
      },
    },
  });
}

export async function getLatestRun(userId: string) {
  return prisma.automationRun.findFirst({ where: { userId }, orderBy: { startedAt: "desc" } });
}
