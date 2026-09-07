import "server-only";
import { prisma } from "@/lib/prisma";

export interface DashboardStats {
  jobsScannedToday: number;
  jobsMatched: number;
  highPriorityJobs: number;
  proposalsPrepared: number;
  proposalsSubmitted: number;
  connectsUsed: number;
  connectsSaved: number;
  interviews: number;
  hires: number;
  winRate: number;
  averageScore: number;
  pendingReview: number;
  demosReady: number;
}

function startOfToday(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const today = startOfToday();

  const [
    jobsScannedToday,
    jobsMatched,
    highPriorityJobs,
    proposalsPrepared,
    proposalsSubmitted,
    pendingReview,
    demosReady,
    skippedJobs,
    submissions,
    scoreAggregate,
  ] = await Promise.all([
    prisma.job.count({ where: { userId, fetchedAt: { gte: today } } }),
    prisma.jobAnalysis.count({ where: { userId, recommendedAction: { in: ["HIGH_PRIORITY", "APPLY"] } } }),
    prisma.jobAnalysis.count({ where: { userId, recommendedAction: "HIGH_PRIORITY" } }),
    prisma.proposal.count({ where: { userId } }),
    prisma.proposal.count({ where: { userId, status: "SUBMITTED" } }),
    prisma.proposal.count({ where: { userId, status: { in: ["GENERATED", "NEEDS_REVIEW", "SAVED_FOR_LATER"] } } }),
    prisma.demoProject.count({ where: { userId, status: "READY" } }),
    prisma.jobAnalysis.findMany({
      where: { userId, recommendedAction: "SKIP" },
      select: { job: { select: { connectsRequired: true } } },
    }),
    prisma.submission.findMany({
      where: { userId, status: "SUCCESS" },
      select: { connectsSpent: true },
    }),
    prisma.jobAnalysis.aggregate({ where: { userId }, _avg: { overallScore: true } }),
  ]);

  const connectsUsed = submissions.reduce((total, entry) => total + (entry.connectsSpent ?? 0), 0);
  const connectsSaved = skippedJobs.reduce((total, entry) => total + (entry.job.connectsRequired ?? 0), 0);

  // Interviews and hires are recorded from Upwork submission responses when the
  // API reports them; until then they stay at zero rather than being guessed.
  const interviews = await prisma.submission.count({
    where: { userId, status: "SUCCESS", interviewing: true },
  });
  const hires = await prisma.submission.count({
    where: { userId, status: "SUCCESS", hired: true },
  });

  return {
    jobsScannedToday,
    jobsMatched,
    highPriorityJobs,
    proposalsPrepared,
    proposalsSubmitted,
    connectsUsed,
    connectsSaved,
    interviews,
    hires,
    winRate: proposalsSubmitted > 0 ? Math.round((hires / proposalsSubmitted) * 100) : 0,
    averageScore: Math.round(scoreAggregate._avg.overallScore ?? 0),
    pendingReview,
    demosReady,
  };
}

export type DailySeriesPoint = {
  date: string;
  jobsDiscovered: number;
  proposalsSubmitted: number;
  averageScore: number;
};

/** Daily series for the dashboard and analytics charts. */
export async function getDailySeries(userId: string, days = 30): Promise<DailySeriesPoint[]> {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  const [jobs, submissions, analyses] = await Promise.all([
    prisma.job.findMany({
      where: { userId, fetchedAt: { gte: since } },
      select: { fetchedAt: true },
    }),
    prisma.submission.findMany({
      where: { userId, status: "SUCCESS", submittedAt: { gte: since } },
      select: { submittedAt: true },
    }),
    prisma.jobAnalysis.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { createdAt: true, overallScore: true },
    }),
  ]);

  const buckets = new Map<string, { jobs: number; submissions: number; scores: number[] }>();

  for (let index = 0; index < days; index += 1) {
    const date = new Date(since);
    date.setDate(since.getDate() + index);
    buckets.set(date.toISOString().slice(0, 10), { jobs: 0, submissions: 0, scores: [] });
  }

  const key = (date: Date) => date.toISOString().slice(0, 10);

  for (const job of jobs) {
    const bucket = buckets.get(key(job.fetchedAt));
    if (bucket) bucket.jobs += 1;
  }
  for (const submission of submissions) {
    if (!submission.submittedAt) continue;
    const bucket = buckets.get(key(submission.submittedAt));
    if (bucket) bucket.submissions += 1;
  }
  for (const analysis of analyses) {
    const bucket = buckets.get(key(analysis.createdAt));
    if (bucket) bucket.scores.push(analysis.overallScore);
  }

  return [...buckets.entries()].map(([date, bucket]) => ({
    date,
    jobsDiscovered: bucket.jobs,
    proposalsSubmitted: bucket.submissions,
    averageScore:
      bucket.scores.length > 0
        ? Math.round(bucket.scores.reduce((total, score) => total + score, 0) / bucket.scores.length)
        : 0,
  }));
}

export interface ActionBreakdown {
  action: string;
  count: number;
}

export async function getActionBreakdown(userId: string): Promise<ActionBreakdown[]> {
  const grouped = await prisma.jobAnalysis.groupBy({
    by: ["recommendedAction"],
    where: { userId },
    _count: { _all: true },
  });

  return grouped.map((entry) => ({ action: entry.recommendedAction, count: entry._count._all }));
}

export async function getProposalFunnel(userId: string) {
  const grouped = await prisma.proposal.groupBy({
    by: ["status"],
    where: { userId },
    _count: { _all: true },
  });

  return grouped.map((entry) => ({ status: entry.status, count: entry._count._all }));
}
