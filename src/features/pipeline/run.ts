import "server-only";
import type { AutomationRun, AutomationTrigger, Job, JobSearchProfile, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { captureException } from "@/lib/monitoring";
import { toErrorMessage } from "@/lib/errors";
import { decimalToNumber } from "@/lib/format";
import { getUpworkProvider } from "@/services/upwork";
import type { NormalisedUpworkJob, UpworkJobSearchParams } from "@/services/upwork/types";
import { analyzeJob, decideDemo, extractRequirements } from "@/services/claude";
import { automationFailedEmail, proposalsReadyEmail, sendNotificationEmail } from "@/services/email";
import { buildDemo } from "@/features/demo/builder";
import { generateProposalForJob } from "@/features/proposals/generate";
import {
  computeDemoValueScore,
  computeRankedScore,
  rankJobs,
  selectTopJobs,
  type RankedResult,
} from "@/features/jobs/ranking";
import {
  getOrCreatePreferences,
  loadFreelancerContext,
  toJobContext,
  toThresholds,
  toWeights,
} from "@/features/pipeline/context";
import type { JobAnalysisResult } from "@/schemas/ai";
import type { PipelineSummary } from "@/types/domain";

export interface RunOptions {
  userId: string;
  trigger: AutomationTrigger;
  searchProfileIds?: string[];
  /** Skips demo generation regardless of scores; used by "analyze only" runs. */
  skipDemos?: boolean;
}

const ANALYSIS_CONCURRENCY = 4;

async function logStep(
  runId: string,
  step: string,
  message: string,
  level: "DEBUG" | "INFO" | "WARN" | "ERROR" = "INFO",
  data?: Record<string, unknown>,
): Promise<void> {
  await prisma.automationRunLog
    .create({ data: { runId, step, message, level, data: (data ?? {}) as never } })
    .catch((error) => logger.warn({ err: error, runId }, "Failed to write run log"));
}

function toSearchParams(profile: JobSearchProfile, limit: number): UpworkJobSearchParams {
  return {
    keywords: [...profile.keywords, ...profile.includeKeywords],
    excludeKeywords: profile.excludeKeywords,
    skills: profile.skills,
    minFixedBudget: decimalToNumber(profile.minFixedBudget),
    minHourlyRate: decimalToNumber(profile.minHourlyRate),
    maxHourlyRate: decimalToNumber(profile.maxHourlyRate),
    maxJobAgeHours: profile.maxJobAgeHours,
    paymentVerifiedOnly: profile.paymentVerifiedOnly,
    countries: profile.countries,
    excludedCountries: profile.excludedCountries,
    experienceLevels: profile.experienceLevels,
    projectType: profile.projectType,
    durations: profile.durations,
    limit: Math.min(profile.resultLimit, limit),
  };
}

/** Client-side filters that the marketplace query cannot always express. */
function passesProfileFilters(job: NormalisedUpworkJob, profile: JobSearchProfile): boolean {
  const haystack = `${job.title} ${job.description} ${job.skills.join(" ")}`.toLowerCase();

  if (profile.excludeKeywords.some((keyword) => haystack.includes(keyword.toLowerCase()))) return false;

  if (profile.includeKeywords.length > 0) {
    const hasAll = profile.includeKeywords.every((keyword) => haystack.includes(keyword.toLowerCase()));
    if (!hasAll) return false;
  }

  if (profile.paymentVerifiedOnly && !job.clientPaymentVerified) return false;

  const minHireRate = profile.minClientHireRate;
  if (minHireRate !== null && job.clientHireRate !== null && job.clientHireRate < minHireRate) return false;

  const minSpend = decimalToNumber(profile.minClientSpend);
  if (minSpend !== null && job.clientTotalSpent !== null && job.clientTotalSpent < minSpend) return false;

  const minRating = decimalToNumber(profile.minClientRating);
  if (minRating !== null && job.clientRating !== null && job.clientRating < minRating) return false;

  if (profile.maxProposals !== null && job.proposalsCount !== null && job.proposalsCount > profile.maxProposals) {
    return false;
  }

  if (profile.maxJobAgeHours !== null) {
    const ageHours = (Date.now() - job.postedAt.getTime()) / 3_600_000;
    if (ageHours > profile.maxJobAgeHours) return false;
  }

  if (profile.excludedCountries.length > 0 && job.clientCountry) {
    if (profile.excludedCountries.some((country) => country.toLowerCase() === job.clientCountry!.toLowerCase())) {
      return false;
    }
  }

  const minFixed = decimalToNumber(profile.minFixedBudget);
  if (minFixed !== null && job.projectType === "FIXED" && (job.budgetAmount ?? 0) < minFixed) return false;

  const minHourly = decimalToNumber(profile.minHourlyRate);
  if (minHourly !== null && job.projectType === "HOURLY") {
    const ceiling = job.hourlyMax ?? job.hourlyMin ?? 0;
    if (ceiling < minHourly) return false;
  }

  return true;
}

function toJobCreateData(
  job: NormalisedUpworkJob,
  userId: string,
  searchProfileId: string,
): Prisma.JobCreateManyInput {
  return {
    userId,
    searchProfileId,
    upworkJobId: job.upworkJobId,
    title: job.title,
    description: job.description,
    url: job.url,
    category: job.category,
    subcategory: job.subcategory,
    skills: job.skills,
    projectType: job.projectType,
    experienceLevel: job.experienceLevel,
    budgetAmount: job.budgetAmount ?? undefined,
    hourlyMin: job.hourlyMin ?? undefined,
    hourlyMax: job.hourlyMax ?? undefined,
    currency: job.currency,
    estimatedDuration: job.estimatedDuration,
    workload: job.workload,
    connectsRequired: job.connectsRequired,
    clientCountry: job.clientCountry,
    clientCity: job.clientCity,
    clientRating: job.clientRating ?? undefined,
    clientHireRate: job.clientHireRate,
    clientTotalSpent: job.clientTotalSpent ?? undefined,
    clientJobsPosted: job.clientJobsPosted,
    clientTotalHires: job.clientTotalHires,
    clientOpenJobs: job.clientOpenJobs,
    clientPaymentVerified: job.clientPaymentVerified,
    clientMemberSince: job.clientMemberSince,
    proposalsCount: job.proposalsCount,
    proposalsRange: job.proposalsRange,
    interviewCount: job.interviewCount,
    invitesSent: job.invitesSent,
    unansweredInvites: job.unansweredInvites,
    postedAt: job.postedAt,
    raw: job.raw as never,
  };
}

/** Bounded-concurrency map so a 100-job run does not open 100 API calls at once. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index]!, index);
    }
  });

  await Promise.all(runners);
  return results;
}

/**
 * The end-to-end automation run.
 *
 * Discover → analyze → rank → select → (optionally) build and deploy a demo →
 * generate a proposal → save as pending approval → notify. Nothing in this
 * pipeline submits anything to Upwork or spends Connects.
 */
export async function runAutomationPipeline(options: RunOptions): Promise<PipelineSummary> {
  const preference = await getOrCreatePreferences(options.userId);
  const thresholds = toThresholds(preference);
  const weights = toWeights(preference);

  const profiles = await prisma.jobSearchProfile.findMany({
    where: {
      userId: options.userId,
      isActive: true,
      ...(options.searchProfileIds?.length ? { id: { in: options.searchProfileIds } } : {}),
    },
    orderBy: { createdAt: "asc" },
  });

  const run = await prisma.automationRun.create({
    data: {
      userId: options.userId,
      status: "RUNNING",
      trigger: options.trigger,
      searchProfileIds: profiles.map((profile) => profile.id),
    },
  });

  const summary: PipelineSummary = {
    runId: run.id,
    jobsFetched: 0,
    jobsNew: 0,
    jobsAnalyzed: 0,
    topJobsSelected: 0,
    proposalsGenerated: 0,
    demosAttempted: 0,
    demosGenerated: 0,
    documentsGenerated: 0,
    estimatedConnects: 0,
    errors: [],
  };

  const usage = { inputTokens: 0, outputTokens: 0 };

  try {
    if (profiles.length === 0) {
      await logStep(run.id, "discovery", "No active job search profiles. Nothing to do.", "WARN");
      return finish(run, summary, usage, "COMPLETED");
    }

    // 1 — discover ----------------------------------------------------------
    const provider = await getUpworkProvider(options.userId);
    await logStep(run.id, "discovery", `Searching Upwork via ${provider.name}`, "INFO", {
      profiles: profiles.length,
    });

    const seen = new Set<string>();
    const discovered: { job: NormalisedUpworkJob; profileId: string }[] = [];

    for (const profile of profiles) {
      const remaining = preference.maxJobsPerRun - discovered.length;
      if (remaining <= 0) break;

      try {
        const results = await provider.searchJobs(toSearchParams(profile, remaining));
        summary.jobsFetched += results.length;

        for (const job of results) {
          if (seen.has(job.upworkJobId)) continue;
          if (!passesProfileFilters(job, profile)) continue;
          seen.add(job.upworkJobId);
          discovered.push({ job, profileId: profile.id });
          if (discovered.length >= preference.maxJobsPerRun) break;
        }

        await logStep(run.id, "discovery", `Profile "${profile.name}" returned ${results.length} jobs`, "INFO");
      } catch (error) {
        const message = `Search failed for profile "${profile.name}": ${toErrorMessage(error)}`;
        summary.errors.push(message);
        await logStep(run.id, "discovery", message, "ERROR");
      }
    }

    // 2 — persist, skipping jobs already stored for this user -----------------
    const existing = await prisma.job.findMany({
      where: { userId: options.userId, upworkJobId: { in: [...seen] } },
      select: { upworkJobId: true },
    });
    const existingIds = new Set(existing.map((job) => job.upworkJobId));

    const fresh = discovered.filter((entry) => !existingIds.has(entry.job.upworkJobId));

    if (fresh.length > 0) {
      await prisma.job.createMany({
        data: fresh.map((entry) => toJobCreateData(entry.job, options.userId, entry.profileId)),
        skipDuplicates: true,
      });
    }

    const storedJobs = await prisma.job.findMany({
      where: { userId: options.userId, upworkJobId: { in: fresh.map((entry) => entry.job.upworkJobId) } },
    });

    summary.jobsNew = storedJobs.length;

    await prisma.automationRunJob.createMany({
      data: storedJobs.map((job) => ({ runId: run.id, jobId: job.id })),
      skipDuplicates: true,
    });

    await logStep(
      run.id,
      "discovery",
      `${summary.jobsFetched} jobs fetched, ${summary.jobsNew} new after de-duplication`,
      "INFO",
    );

    if (storedJobs.length === 0) {
      await logStep(run.id, "analysis", "No new jobs to analyze.", "INFO");
      return finish(run, summary, usage, "COMPLETED");
    }

    // 3 — analyze -----------------------------------------------------------
    const freelancer = await loadFreelancerContext(options.userId);

    const analysed = await mapWithConcurrency(storedJobs, ANALYSIS_CONCURRENCY, async (job: Job) => {
      const context = toJobContext(job);
      try {
        const result = await analyzeJob(context, freelancer, {
          userId: options.userId,
          jobId: job.id,
          runId: run.id,
        });

        usage.inputTokens += result.usage.inputTokens;
        usage.outputTokens += result.usage.outputTokens;

        const ranked = computeRankedScore({ job: context, analysis: result.data }, weights);

        await prisma.jobAnalysis.upsert({
          where: { jobId: job.id },
          create: {
            jobId: job.id,
            userId: options.userId,
            overallScore: result.data.overallScore,
            skillMatch: result.data.skillMatch,
            clientQuality: result.data.clientQuality,
            competitionScore: result.data.competitionScore,
            budgetScore: result.data.budgetScore,
            winningProbability: result.data.winningProbability,
            riskScore: result.data.riskScore,
            rankedScore: ranked.rankedScore,
            recommendedAction: result.data.recommendedAction,
            reasoningSummary: result.data.reasoningSummary,
            strengths: result.data.strengths,
            risks: result.data.risks,
            technicalOpportunity: result.data.technicalOpportunity,
            model: result.model,
            inputTokens: result.usage.inputTokens,
            outputTokens: result.usage.outputTokens,
          },
          update: {
            overallScore: result.data.overallScore,
            skillMatch: result.data.skillMatch,
            clientQuality: result.data.clientQuality,
            competitionScore: result.data.competitionScore,
            budgetScore: result.data.budgetScore,
            winningProbability: result.data.winningProbability,
            riskScore: result.data.riskScore,
            rankedScore: ranked.rankedScore,
            recommendedAction: result.data.recommendedAction,
            reasoningSummary: result.data.reasoningSummary,
            strengths: result.data.strengths,
            risks: result.data.risks,
            technicalOpportunity: result.data.technicalOpportunity,
            model: result.model,
          },
        });

        await prisma.job.update({ where: { id: job.id }, data: { status: "ANALYZED" } });

        return { job: context, analysis: result.data };
      } catch (error) {
        const message = `Analysis failed for "${job.title.slice(0, 60)}": ${toErrorMessage(error)}`;
        summary.errors.push(message);
        await logStep(run.id, "analysis", message, "ERROR");
        return null;
      }
    });

    const successful = analysed.filter(
      (entry): entry is { job: ReturnType<typeof toJobContext>; analysis: JobAnalysisResult } => entry !== null,
    );
    summary.jobsAnalyzed = successful.length;

    await logStep(run.id, "analysis", `Analyzed ${successful.length} of ${storedJobs.length} jobs`, "INFO");

    // 4 — rank and select ----------------------------------------------------
    const ranked = rankJobs(successful, weights);
    const selected = selectTopJobs(ranked, preference.topJobsCount);
    summary.topJobsSelected = selected.length;

    await Promise.all(
      selected.map((entry, index) =>
        prisma.automationRunJob.updateMany({
          where: { runId: run.id, jobId: entry.job.id },
          data: { selected: true, rank: index + 1 },
        }),
      ),
    );

    await Promise.all(
      selected.map((entry) =>
        prisma.job.update({ where: { id: entry.job.id }, data: { status: "SHORTLISTED" } }),
      ),
    );

    await logStep(
      run.id,
      "ranking",
      `Selected the top ${selected.length} opportunities out of ${ranked.length} ranked jobs`,
      "INFO",
      { topScores: selected.slice(0, 5).map((entry) => entry.rankedScore) },
    );

    // 5 — generate proposals (and demos for exceptional jobs) -----------------
    let demosBuilt = 0;
    const emailJobs: { title: string; score: number; budget: string; winProbability: number }[] = [];

    for (const entry of selected) {
      try {
        const outcome = await processSelectedJob({
          entry,
          run,
          options,
          preference,
          thresholds,
          freelancer,
          demosBuiltSoFar: demosBuilt,
          usage,
        });

        if (outcome.demoBuilt) demosBuilt += 1;
        if (outcome.demoAttempted) summary.demosAttempted += 1;
        if (outcome.proposalId) {
          summary.proposalsGenerated += 1;
          summary.estimatedConnects += entry.job.connectsRequired ?? 0;
          await prisma.automationRunProposal.create({
            data: { runId: run.id, proposalId: outcome.proposalId },
          });
          emailJobs.push({
            title: entry.job.title,
            score: entry.analysis.overallScore,
            budget:
              entry.job.projectType === "HOURLY"
                ? `$${entry.job.hourlyMin ?? "?"}–$${entry.job.hourlyMax ?? "?"}/hr`
                : entry.job.budgetAmount
                  ? `$${entry.job.budgetAmount.toLocaleString("en-US")} fixed`
                  : "Budget not stated",
            winProbability: entry.analysis.winningProbability,
          });
        }
        if (outcome.documentGenerated) summary.documentsGenerated += 1;
      } catch (error) {
        const message = `Proposal preparation failed for "${entry.job.title.slice(0, 60)}": ${toErrorMessage(error)}`;
        summary.errors.push(message);
        await logStep(run.id, "proposal", message, "ERROR");
      }
    }

    summary.demosGenerated = demosBuilt;

    // 6 — notify -------------------------------------------------------------
    if (summary.proposalsGenerated > 0 && preference.emailNotifications && preference.notifyOnProposalsReady) {
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: options.userId },
        select: { email: true },
      });

      const email = proposalsReadyEmail({
        jobsAnalyzed: summary.jobsAnalyzed,
        highQualityMatches: summary.topJobsSelected,
        proposalsPrepared: summary.proposalsGenerated,
        demosCreated: summary.demosGenerated,
        estimatedConnects: summary.estimatedConnects,
        topJobs: emailJobs.slice(0, 5),
      });

      await sendNotificationEmail({
        userId: options.userId,
        to: user.email,
        type: "PROPOSALS_READY",
        subject: email.subject,
        html: email.html,
        text: email.text,
        data: { runId: run.id },
      });

      await logStep(run.id, "notification", "Sent the proposals-ready email", "INFO");
    }

    return finish(run, summary, usage, summary.errors.length > 0 ? "PARTIAL" : "COMPLETED");
  } catch (error) {
    captureException(error, { userId: options.userId, operation: "automation_run", extra: { runId: run.id } });
    const message = toErrorMessage(error);
    summary.errors.push(message);
    await logStep(run.id, "run", `Run failed: ${message}`, "ERROR");

    const preferences = await getOrCreatePreferences(options.userId);
    if (preferences.emailNotifications && preferences.notifyOnAutomationError) {
      const user = await prisma.user.findUnique({
        where: { id: options.userId },
        select: { email: true },
      });
      if (user) {
        const email = automationFailedEmail(run.id, message);
        await sendNotificationEmail({
          userId: options.userId,
          to: user.email,
          type: "AUTOMATION_FAILED",
          subject: email.subject,
          html: email.html,
          text: email.text,
          data: { runId: run.id },
        }).catch(() => undefined);
      }
    }

    return finish(run, summary, usage, "FAILED", message);
  }
}

interface ProcessJobInput {
  entry: RankedResult;
  run: AutomationRun;
  options: RunOptions;
  preference: Awaited<ReturnType<typeof getOrCreatePreferences>>;
  thresholds: ReturnType<typeof toThresholds>;
  freelancer: Awaited<ReturnType<typeof loadFreelancerContext>>;
  demosBuiltSoFar: number;
  usage: { inputTokens: number; outputTokens: number };
}

interface ProcessJobOutcome {
  proposalId: string | null;
  demoAttempted: boolean;
  demoBuilt: boolean;
  documentGenerated: boolean;
}

/**
 * Prepares one selected opportunity: requirements → demo gate → demo →
 * proposal → brief. Every stage is independently recoverable.
 */
async function processSelectedJob(input: ProcessJobInput): Promise<ProcessJobOutcome> {
  const { entry, run, options, preference, thresholds, freelancer } = input;
  const meta = { userId: options.userId, jobId: entry.job.id, runId: run.id };

  const outcome: ProcessJobOutcome = {
    proposalId: null,
    demoAttempted: false,
    demoBuilt: false,
    documentGenerated: false,
  };

  // Requirements power both the demo and the client brief.
  let requirements = null as Awaited<ReturnType<typeof extractRequirements>>["data"] | null;
  try {
    const result = await extractRequirements(entry.job, meta);
    input.usage.inputTokens += result.usage.inputTokens;
    input.usage.outputTokens += result.usage.outputTokens;
    requirements = result.data;

    await prisma.jobAnalysis.update({
      where: { jobId: entry.job.id },
      data: { requirementsExtract: result.data as never },
    });
  } catch (error) {
    await logStep(run.id, "requirements", `Requirement extraction failed: ${toErrorMessage(error)}`, "WARN");
  }

  // Demo gate ---------------------------------------------------------------
  let demoContext: Parameters<typeof generateProposalForJob>[0]["demo"] = null;

  const belowProposalThreshold = entry.analysis.overallScore < thresholds.proposalOnly;
  if (belowProposalThreshold) {
    await logStep(
      run.id,
      "demo",
      `Skipping generation resources for "${entry.job.title.slice(0, 60)}" (score ${entry.analysis.overallScore} below ${thresholds.proposalOnly})`,
      "INFO",
    );
  }

  const canConsiderDemo =
    !options.skipDemos &&
    thresholds.demoGenerationEnabled &&
    requirements !== null &&
    !belowProposalThreshold &&
    entry.analysis.overallScore >= thresholds.suggest &&
    input.demosBuiltSoFar < thresholds.maxDemosPerRun;

  if (canConsiderDemo && requirements) {
    try {
      const decision = await decideDemo(entry.job, freelancer, entry.analysis, meta);
      input.usage.inputTokens += decision.usage.inputTokens;
      input.usage.outputTokens += decision.usage.outputTokens;

      const demoValueScore = computeDemoValueScore({
        rankedScore: entry.rankedScore,
        overallScore: entry.analysis.overallScore,
        winningProbability: entry.analysis.winningProbability,
        modelDemoValue: decision.data.demoValueScore,
        demoRecommended: decision.data.demoRecommended,
        budgetAmount: entry.job.budgetAmount,
        hourlyMax: entry.job.hourlyMax,
        connectsRequired: entry.job.connectsRequired,
      });

      await prisma.jobAnalysis.update({
        where: { jobId: entry.job.id },
        data: {
          demoRecommended: decision.data.demoRecommended,
          demoReason: decision.data.demoReason,
          demoComplexity: decision.data.demoComplexity,
          estimatedFiles: decision.data.estimatedFiles,
          demoRequirements: decision.data.demoRequirements,
          demoValueScore,
        },
      });

      const meetsAutoThreshold = entry.analysis.overallScore >= thresholds.autoBuild;
      const meetsValueGate = demoValueScore >= thresholds.demoValueMinimum;
      const shouldBuild = decision.data.demoRecommended && meetsValueGate && meetsAutoThreshold;

      await logStep(
        run.id,
        "demo",
        shouldBuild
          ? `Building a demo for "${entry.job.title.slice(0, 60)}" (demo value ${demoValueScore})`
          : `No demo for "${entry.job.title.slice(0, 60)}" (recommended: ${decision.data.demoRecommended}, value ${demoValueScore}, threshold ${thresholds.demoValueMinimum})`,
        "INFO",
      );

      if (shouldBuild) {
        outcome.demoAttempted = true;

        const built = await buildDemo({
          userId: options.userId,
          job: entry.job,
          requirements,
          decision: decision.data,
          thresholds,
          preparedBy: freelancer.signatureName ?? freelancer.name,
          runId: run.id,
        });

        input.usage.inputTokens += built.usage.inputTokens;
        input.usage.outputTokens += built.usage.outputTokens;

        if (built.liveUrl && built.demo.status === "READY") {
          outcome.demoBuilt = true;
          demoContext = {
            id: built.demo.id,
            url: built.liveUrl,
            email: built.demo.demoEmail,
            password: built.demo.demoPassword,
            covered: decision.data.demoRequirements,
            plan: built.plan,
            screenshots: built.screenshots.map((shot) => ({ label: shot.label, path: shot.path })),
          };
        } else {
          await logStep(
            run.id,
            "demo",
            `Demo unavailable for "${entry.job.title.slice(0, 60)}": ${built.failureReason ?? "unknown reason"}. The proposal will be prepared without it.`,
            "WARN",
          );
        }
      }
    } catch (error) {
      await logStep(run.id, "demo", `Demo stage failed: ${toErrorMessage(error)}`, "WARN");
    }
  }

  // Proposal ----------------------------------------------------------------
  const generated = await generateProposalForJob({
    userId: options.userId,
    job: entry.job,
    freelancer,
    analysis: entry.analysis,
    requirements,
    demo: demoContext,
    generatePdf: thresholds.generatePdf && !belowProposalThreshold,
    companyName: preference.companyName,
    portfolioUrl: preference.portfolioUrl,
    runId: run.id,
  });

  input.usage.inputTokens += generated.usage.inputTokens;
  input.usage.outputTokens += generated.usage.outputTokens;

  outcome.proposalId = generated.proposal.id;
  outcome.documentGenerated = generated.documentGenerated;

  await logStep(run.id, "proposal", `Prepared a proposal for "${entry.job.title.slice(0, 60)}"`, "INFO", {
    proposalId: generated.proposal.id,
    demoIncluded: Boolean(demoContext),
  });

  return outcome;
}

async function finish(
  run: AutomationRun,
  summary: PipelineSummary,
  usage: { inputTokens: number; outputTokens: number },
  status: "COMPLETED" | "PARTIAL" | "FAILED",
  errorMessage?: string,
): Promise<PipelineSummary> {
  await prisma.automationRun.update({
    where: { id: run.id },
    data: {
      status,
      finishedAt: new Date(),
      jobsFetched: summary.jobsFetched,
      jobsNew: summary.jobsNew,
      jobsAnalyzed: summary.jobsAnalyzed,
      topJobsSelected: summary.topJobsSelected,
      proposalsGenerated: summary.proposalsGenerated,
      demosAttempted: summary.demosAttempted,
      demosGenerated: summary.demosGenerated,
      documentsGenerated: summary.documentsGenerated,
      estimatedConnects: summary.estimatedConnects,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      errorCount: summary.errors.length,
      errorMessage: errorMessage?.slice(0, 2_000),
    },
  });

  logger.info({ ...summary, status }, "Automation run finished");
  return summary;
}
