import "server-only";
import { prisma } from "@/lib/prisma";
import { isRedisAvailable } from "@/lib/redis";
import { env } from "@/lib/env";

export interface AdminOverview {
  users: { total: number; active: number; admins: number; newThisWeek: number };
  upworkConnections: number;
  jobs: { total: number; analyzed: number };
  proposals: { total: number; submitted: number; failed: number };
  demos: { total: number; ready: number; failed: number };
  ai: { calls: number; inputTokens: number; outputTokens: number; costUsd: number; failures: number };
  errors: { total: number; recent: { action: string; createdAt: Date; resource: string | null }[] };
  health: { database: boolean; redis: boolean; upworkProvider: string; emailProvider: string };
}

/** Aggregate platform metrics. Never returns user secrets or token values. */
export async function getAdminOverview(): Promise<AdminOverview> {
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);

  const [
    totalUsers,
    activeUsers,
    admins,
    newThisWeek,
    upworkConnections,
    totalJobs,
    analyzedJobs,
    totalProposals,
    submittedProposals,
    failedProposals,
    totalDemos,
    readyDemos,
    failedDemos,
    aiAggregate,
    aiFailures,
    errorCount,
    recentErrors,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.upworkConnection.count({ where: { isActive: true } }),
    prisma.job.count(),
    prisma.jobAnalysis.count(),
    prisma.proposal.count(),
    prisma.proposal.count({ where: { status: "SUBMITTED" } }),
    prisma.proposal.count({ where: { status: "FAILED" } }),
    prisma.demoProject.count(),
    prisma.demoProject.count({ where: { status: "READY" } }),
    prisma.demoProject.count({ where: { status: "FAILED" } }),
    prisma.aiUsageRecord.aggregate({
      _count: { _all: true },
      _sum: { inputTokens: true, outputTokens: true, costUsd: true },
    }),
    prisma.aiUsageRecord.count({ where: { success: false } }),
    prisma.auditLog.count({ where: { success: false } }),
    prisma.auditLog.findMany({
      where: { success: false },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { action: true, createdAt: true, resource: true },
    }),
  ]);

  let database = true;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = false;
  }

  return {
    users: { total: totalUsers, active: activeUsers, admins, newThisWeek },
    upworkConnections,
    jobs: { total: totalJobs, analyzed: analyzedJobs },
    proposals: { total: totalProposals, submitted: submittedProposals, failed: failedProposals },
    demos: { total: totalDemos, ready: readyDemos, failed: failedDemos },
    ai: {
      calls: aiAggregate._count._all,
      inputTokens: aiAggregate._sum.inputTokens ?? 0,
      outputTokens: aiAggregate._sum.outputTokens ?? 0,
      costUsd: Number(aiAggregate._sum.costUsd ?? 0),
      failures: aiFailures,
    },
    errors: { total: errorCount, recent: recentErrors },
    health: {
      database,
      redis: await isRedisAvailable(),
      upworkProvider: env.UPWORK_PROVIDER,
      emailProvider: env.EMAIL_PROVIDER,
    },
  };
}

export async function listUsersForAdmin(page = 1, pageSize = 25) {
  const [total, items] = await Promise.all([
    prisma.user.count(),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        upworkConnection: { select: { isActive: true, profileName: true, connectsBalance: true } },
        _count: { select: { jobs: true, proposals: true, demos: true } },
      },
    }),
  ]);

  return { total, page, pageSize, items };
}

export async function getAiUsageByOperation() {
  const grouped = await prisma.aiUsageRecord.groupBy({
    by: ["operation"],
    _count: { _all: true },
    _sum: { inputTokens: true, outputTokens: true, costUsd: true },
  });

  return grouped
    .map((entry) => ({
      operation: entry.operation,
      calls: entry._count._all,
      inputTokens: entry._sum.inputTokens ?? 0,
      outputTokens: entry._sum.outputTokens ?? 0,
      costUsd: Number(entry._sum.costUsd ?? 0),
    }))
    .sort((a, b) => b.costUsd - a.costUsd);
}
