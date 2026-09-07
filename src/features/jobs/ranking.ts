import type { JobAnalysisResult } from "@/schemas/ai";
import type { JobContext, ScoringWeights } from "@/types/domain";

export const DEFAULT_WEIGHTS: ScoringWeights = {
  skillMatch: 25,
  clientQuality: 15,
  budget: 15,
  competition: 15,
  winningProbability: 20,
  recency: 10,
};

export interface RankingInput {
  job: JobContext;
  analysis: JobAnalysisResult;
}

export interface RankedResult extends RankingInput {
  rankedScore: number;
  components: Record<string, number>;
}

/** Fresh posts win: full marks under 6 hours, decaying to zero at 96 hours. */
export function recencyScore(postedAt: Date, now = Date.now()): number {
  const ageHours = (now - postedAt.getTime()) / 3_600_000;
  if (ageHours <= 6) return 100;
  if (ageHours >= 96) return 0;
  return Math.round(100 * (1 - (ageHours - 6) / 90));
}

/**
 * Client credibility from real marketplace signals rather than the model's
 * opinion alone, so a persuasive job post cannot mask a weak client.
 */
export function clientSignalScore(job: JobContext): number {
  let score = 40;

  if (job.clientPaymentVerified) score += 15;
  if (job.clientHireRate !== null) score += Math.round((job.clientHireRate / 100) * 20);
  if (job.clientTotalSpent !== null) {
    if (job.clientTotalSpent >= 100_000) score += 15;
    else if (job.clientTotalSpent >= 25_000) score += 11;
    else if (job.clientTotalSpent >= 5_000) score += 7;
    else if (job.clientTotalSpent >= 500) score += 3;
  }
  if (job.clientRating !== null) score += Math.round(((job.clientRating - 3) / 2) * 10);
  if (job.clientTotalHires !== null && job.clientTotalHires >= 5) score += 5;

  return Math.max(0, Math.min(100, score));
}

/** Competition pressure derived from proposals, invites and interviews. */
export function competitionSignalScore(job: JobContext): number {
  const proposals = job.proposalsCount ?? parseProposalRange(job.proposalsRange);
  let score = 100;

  if (proposals !== null) {
    if (proposals <= 5) score = 95;
    else if (proposals <= 10) score = 85;
    else if (proposals <= 20) score = 65;
    else if (proposals <= 35) score = 45;
    else if (proposals <= 50) score = 28;
    else score = 15;
  } else {
    score = 70;
  }

  if (job.interviewCount !== null && job.interviewCount > 0) score -= Math.min(25, job.interviewCount * 8);
  if (job.unansweredInvites !== null && job.unansweredInvites > 3) score -= 5;

  return Math.max(0, Math.min(100, score));
}

function parseProposalRange(range: string | null): number | null {
  if (!range) return null;
  const numbers = range.match(/\d+/g);
  if (!numbers || numbers.length === 0) return null;
  const values = numbers.map(Number);
  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
}

function normaliseWeights(weights: ScoringWeights): ScoringWeights {
  const total =
    weights.skillMatch +
    weights.clientQuality +
    weights.budget +
    weights.competition +
    weights.winningProbability +
    weights.recency;

  if (total <= 0) return DEFAULT_WEIGHTS;

  return {
    skillMatch: (weights.skillMatch / total) * 100,
    clientQuality: (weights.clientQuality / total) * 100,
    budget: (weights.budget / total) * 100,
    competition: (weights.competition / total) * 100,
    winningProbability: (weights.winningProbability / total) * 100,
    recency: (weights.recency / total) * 100,
  };
}

/**
 * Blends the model's scores with marketplace signals. Ranking deliberately does
 * not key off proposal count alone — a crowded job with an excellent client can
 * still outrank a quiet job with a weak one.
 */
export function computeRankedScore(input: RankingInput, weights: ScoringWeights = DEFAULT_WEIGHTS): RankedResult {
  const normalised = normaliseWeights(weights);
  const { job, analysis } = input;

  const components = {
    skillMatch: analysis.skillMatch,
    // The model's read of the client is averaged with hard marketplace signals.
    clientQuality: Math.round((analysis.clientQuality + clientSignalScore(job)) / 2),
    budget: analysis.budgetScore,
    competition: Math.round((analysis.competitionScore + competitionSignalScore(job)) / 2),
    winningProbability: analysis.winningProbability,
    recency: recencyScore(job.postedAt),
  };

  const weighted =
    (components.skillMatch * normalised.skillMatch +
      components.clientQuality * normalised.clientQuality +
      components.budget * normalised.budget +
      components.competition * normalised.competition +
      components.winningProbability * normalised.winningProbability +
      components.recency * normalised.recency) /
    100;

  // Risk is a direct deduction so scam-shaped posts cannot rank high.
  const riskPenalty = (analysis.riskScore / 100) * 25;
  const rankedScore = Math.max(0, Math.min(100, weighted - riskPenalty));

  return { ...input, rankedScore: Number(rankedScore.toFixed(2)), components };
}

export function rankJobs(inputs: RankingInput[], weights: ScoringWeights = DEFAULT_WEIGHTS): RankedResult[] {
  return inputs
    .map((input) => computeRankedScore(input, weights))
    .sort((a, b) => b.rankedScore - a.rankedScore);
}

/**
 * Selects the top opportunities, skipping anything the analysis explicitly
 * rejected so Connects are never spent on a SKIP.
 */
export function selectTopJobs(ranked: RankedResult[], count: number): RankedResult[] {
  return ranked.filter((entry) => entry.analysis.recommendedAction !== "SKIP").slice(0, count);
}

/**
 * Demo value gate. Combines the model's own estimate with the ranked score and
 * job value so generation resources are only spent where they can change the
 * hiring decision.
 */
export function computeDemoValueScore(params: {
  rankedScore: number;
  overallScore: number;
  winningProbability: number;
  modelDemoValue: number;
  demoRecommended: boolean;
  budgetAmount: number | null;
  hourlyMax: number | null;
  connectsRequired: number | null;
}): number {
  if (!params.demoRecommended) return 0;

  const jobValue = params.budgetAmount ?? (params.hourlyMax !== null ? params.hourlyMax * 80 : null);
  let valueBonus = 0;
  if (jobValue !== null) {
    if (jobValue >= 8_000) valueBonus = 10;
    else if (jobValue >= 3_000) valueBonus = 7;
    else if (jobValue >= 1_000) valueBonus = 3;
    else valueBonus = -10;
  }

  const connectsPenalty = params.connectsRequired && params.connectsRequired > 16 ? -3 : 0;

  const blended =
    params.modelDemoValue * 0.45 +
    params.rankedScore * 0.25 +
    params.overallScore * 0.15 +
    params.winningProbability * 0.15;

  return Math.max(0, Math.min(100, Math.round(blended + valueBonus + connectsPenalty)));
}
