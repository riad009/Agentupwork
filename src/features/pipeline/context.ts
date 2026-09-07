import "server-only";
import type { Job, UserPreference } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/format";
import type { DemoThresholds, FreelancerContext, JobContext, ScoringWeights } from "@/types/domain";

export const DEFAULT_PREFERENCES = {
  automationEnabled: false,
  scheduleFrequency: "MANUAL" as const,
  maxJobsPerRun: 100,
  topJobsCount: 10,
  demoAutoThreshold: 90,
  demoSuggestThreshold: 80,
  proposalOnlyThreshold: 70,
  demoValueScoreMinimum: 80,
  maxDemosPerRun: 3,
  maxDemoPages: 7,
  maxDemoIterations: 3,
  maxBuildFixAttempts: 3,
  maxScreenshots: 6,
  generatePdf: true,
  demoGenerationEnabled: true,
};

/** Creates the preference row on first access so every user has defaults. */
export async function getOrCreatePreferences(userId: string): Promise<UserPreference> {
  const existing = await prisma.userPreference.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.userPreference.create({ data: { userId } });
}

export function toJobContext(job: Job): JobContext {
  return {
    id: job.id,
    upworkJobId: job.upworkJobId,
    title: job.title,
    description: job.description,
    url: job.url,
    skills: job.skills,
    projectType: job.projectType,
    experienceLevel: job.experienceLevel,
    budgetAmount: decimalToNumber(job.budgetAmount),
    hourlyMin: decimalToNumber(job.hourlyMin),
    hourlyMax: decimalToNumber(job.hourlyMax),
    estimatedDuration: job.estimatedDuration,
    connectsRequired: job.connectsRequired,
    clientCountry: job.clientCountry,
    clientRating: decimalToNumber(job.clientRating),
    clientHireRate: job.clientHireRate,
    clientTotalSpent: decimalToNumber(job.clientTotalSpent),
    clientJobsPosted: job.clientJobsPosted,
    clientTotalHires: job.clientTotalHires,
    clientPaymentVerified: job.clientPaymentVerified,
    proposalsCount: job.proposalsCount,
    proposalsRange: job.proposalsRange,
    interviewCount: job.interviewCount,
    invitesSent: job.invitesSent,
    unansweredInvites: job.unansweredInvites,
    postedAt: job.postedAt,
  };
}

/**
 * Assembles everything Claude is allowed to know about the freelancer. The
 * portfolio is the only source of claimable experience — prompts forbid
 * inventing anything beyond it.
 */
export async function loadFreelancerContext(userId: string): Promise<FreelancerContext> {
  const [user, aiProfile, preference, portfolio] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, email: true } }),
    prisma.aiProfile.findUnique({ where: { userId } }),
    getOrCreatePreferences(userId),
    prisma.portfolioProject.findMany({
      where: { userId },
      orderBy: [{ highlighted: "desc" }, { completedAt: "desc" }, { createdAt: "desc" }],
      take: 12,
    }),
  ]);

  return {
    name: user.name ?? user.email.split("@")[0]!,
    professionalTitle: aiProfile?.professionalTitle ?? null,
    yearsOfExperience: aiProfile?.yearsOfExperience ?? null,
    hourlyRate: decimalToNumber(aiProfile?.hourlyRate),
    minimumBudget: decimalToNumber(aiProfile?.minimumBudget),
    preferredProjectSize: aiProfile?.preferredProjectSize ?? null,
    preferredTechnologies: aiProfile?.preferredTechnologies ?? [],
    industries: aiProfile?.industries ?? [],
    availability: aiProfile?.availability ?? null,
    preferredTone: aiProfile?.preferredTone ?? preference.proposalTone,
    proposalLength: aiProfile?.proposalLength ?? "SHORT",
    countriesToAvoid: aiProfile?.countriesToAvoid ?? [],
    bio: aiProfile?.bio ?? null,
    proposalMaxWords: preference.proposalMaxWords,
    includeQuestions: preference.includeQuestions,
    signatureName: preference.signatureName ?? user.name ?? null,
    portfolioUrl: preference.portfolioUrl ?? null,
    portfolio: portfolio.map((project) => ({
      title: project.title,
      description: project.description,
      technologies: project.technologies,
      url: project.url,
      githubUrl: project.githubUrl,
      clientIndustry: project.clientIndustry,
      projectType: project.projectType,
      achievements: project.achievements,
    })),
  };
}

export function toThresholds(preference: UserPreference): DemoThresholds {
  return {
    autoBuild: preference.demoAutoThreshold,
    suggest: preference.demoSuggestThreshold,
    proposalOnly: preference.proposalOnlyThreshold,
    demoValueMinimum: preference.demoValueScoreMinimum,
    maxDemosPerRun: preference.maxDemosPerRun,
    maxPages: preference.maxDemoPages,
    maxIterations: preference.maxDemoIterations,
    maxBuildFixAttempts: preference.maxBuildFixAttempts,
    maxScreenshots: preference.maxScreenshots,
    generatePdf: preference.generatePdf,
    demoGenerationEnabled: preference.demoGenerationEnabled,
  };
}

export function toWeights(preference: UserPreference): ScoringWeights {
  return {
    skillMatch: preference.weightSkillMatch,
    clientQuality: preference.weightClientQuality,
    budget: preference.weightBudget,
    competition: preference.weightCompetition,
    winningProbability: preference.weightWinProb,
    recency: preference.weightRecency,
  };
}
