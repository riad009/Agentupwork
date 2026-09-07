import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/format";
import type { JobListQuery } from "@/schemas/proposals";

export interface JobListItem {
  id: string;
  upworkJobId: string;
  title: string;
  url: string;
  status: string;
  projectType: string;
  budgetAmount: number | null;
  hourlyMin: number | null;
  hourlyMax: number | null;
  connectsRequired: number | null;
  proposalsCount: number | null;
  proposalsRange: string | null;
  clientCountry: string | null;
  clientHireRate: number | null;
  clientTotalSpent: number | null;
  clientPaymentVerified: boolean;
  postedAt: Date;
  score: number | null;
  rankedScore: number | null;
  recommendedAction: string | null;
  winningProbability: number | null;
  demoRecommended: boolean;
  hasProposal: boolean;
}

export interface JobListResult {
  items: JobListItem[];
  total: number;
  page: number;
  pageSize: number;
}

function buildWhere(userId: string, query: JobListQuery): Prisma.JobWhereInput {
  const where: Prisma.JobWhereInput = { userId };

  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: "insensitive" } },
      { description: { contains: query.search, mode: "insensitive" } },
      { skills: { has: query.search } },
    ];
  }

  if (query.status) where.status = query.status;
  if (query.projectType) where.projectType = query.projectType;
  if (query.paymentVerified !== undefined) where.clientPaymentVerified = query.paymentVerified;

  const analysisFilter: Prisma.JobAnalysisWhereInput = {};
  if (query.action) analysisFilter.recommendedAction = query.action;
  if (query.demoRecommended !== undefined) analysisFilter.demoRecommended = query.demoRecommended;
  if (query.minScore !== undefined) analysisFilter.overallScore = { gte: query.minScore };

  if (Object.keys(analysisFilter).length > 0) {
    where.analysis = { is: analysisFilter };
  }

  return where;
}

function buildOrderBy(sort: JobListQuery["sort"]): Prisma.JobOrderByWithRelationInput[] {
  switch (sort) {
    case "recent":
      return [{ postedAt: "desc" }];
    case "budget":
      return [{ budgetAmount: "desc" }, { hourlyMax: "desc" }];
    case "proposals":
      return [{ proposalsCount: "asc" }];
    case "score":
    default:
      return [{ analysis: { rankedScore: "desc" } }, { postedAt: "desc" }];
  }
}

export async function listJobs(userId: string, query: JobListQuery): Promise<JobListResult> {
  const where = buildWhere(userId, query);

  const [total, jobs] = await Promise.all([
    prisma.job.count({ where }),
    prisma.job.findMany({
      where,
      orderBy: buildOrderBy(query.sort),
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        analysis: {
          select: {
            overallScore: true,
            rankedScore: true,
            recommendedAction: true,
            winningProbability: true,
            demoRecommended: true,
          },
        },
        proposals: { select: { id: true }, take: 1 },
      },
    }),
  ]);

  return {
    total,
    page: query.page,
    pageSize: query.pageSize,
    items: jobs.map((job) => ({
      id: job.id,
      upworkJobId: job.upworkJobId,
      title: job.title,
      url: job.url,
      status: job.status,
      projectType: job.projectType,
      budgetAmount: decimalToNumber(job.budgetAmount),
      hourlyMin: decimalToNumber(job.hourlyMin),
      hourlyMax: decimalToNumber(job.hourlyMax),
      connectsRequired: job.connectsRequired,
      proposalsCount: job.proposalsCount,
      proposalsRange: job.proposalsRange,
      clientCountry: job.clientCountry,
      clientHireRate: job.clientHireRate,
      clientTotalSpent: decimalToNumber(job.clientTotalSpent),
      clientPaymentVerified: job.clientPaymentVerified,
      postedAt: job.postedAt,
      score: job.analysis?.overallScore ?? null,
      rankedScore: job.analysis?.rankedScore ?? null,
      recommendedAction: job.analysis?.recommendedAction ?? null,
      winningProbability: job.analysis?.winningProbability ?? null,
      demoRecommended: job.analysis?.demoRecommended ?? false,
      hasProposal: job.proposals.length > 0,
    })),
  };
}

export async function getJobDetail(userId: string, jobId: string) {
  return prisma.job.findFirst({
    where: { id: jobId, userId },
    include: {
      analysis: true,
      searchProfile: { select: { id: true, name: true } },
      proposals: {
        orderBy: { createdAt: "desc" },
        include: { demo: true, document: true },
      },
      demos: { orderBy: { createdAt: "desc" }, include: { screenshots: true, deployments: true } },
    },
  });
}

export async function getTopMatches(userId: string, take = 10) {
  return prisma.job.findMany({
    where: {
      userId,
      analysis: { is: { recommendedAction: { in: ["HIGH_PRIORITY", "APPLY"] } } },
    },
    orderBy: [{ analysis: { rankedScore: "desc" } }],
    take,
    include: {
      analysis: true,
      proposals: { select: { id: true, status: true }, take: 1, orderBy: { createdAt: "desc" } },
      demos: { select: { id: true, status: true, liveUrl: true }, take: 1, orderBy: { createdAt: "desc" } },
    },
  });
}
