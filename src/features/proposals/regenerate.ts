import "server-only";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { NotFoundError, ValidationError, toErrorMessage } from "@/lib/errors";
import { extractRequirements, generateProjectBrief, generateProposal } from "@/services/claude";
import { renderProjectBriefPdf, toDataUri } from "@/services/pdf";
import { buildDemo } from "@/features/demo/builder";
import { loadFreelancerContext, getOrCreatePreferences, toJobContext, toThresholds } from "@/features/pipeline/context";
import type { DemoPlan, JobAnalysisResult, RequirementExtraction } from "@/schemas/ai";

const REGENERATABLE = new Set(["GENERATED", "NEEDS_REVIEW", "SAVED_FOR_LATER", "REJECTED", "FAILED"]);

function toAnalysisResult(analysis: {
  overallScore: number;
  skillMatch: number;
  clientQuality: number;
  competitionScore: number;
  budgetScore: number;
  winningProbability: number;
  riskScore: number;
  recommendedAction: string;
  reasoningSummary: string;
  strengths: string[];
  risks: string[];
  technicalOpportunity: string | null;
}): JobAnalysisResult {
  return {
    overallScore: analysis.overallScore,
    skillMatch: analysis.skillMatch,
    clientQuality: analysis.clientQuality,
    competitionScore: analysis.competitionScore,
    budgetScore: analysis.budgetScore,
    winningProbability: analysis.winningProbability,
    riskScore: analysis.riskScore,
    recommendedAction: analysis.recommendedAction as JobAnalysisResult["recommendedAction"],
    reasoningSummary: analysis.reasoningSummary,
    strengths: analysis.strengths,
    risks: analysis.risks,
    technicalOpportunity: analysis.technicalOpportunity ?? "",
  };
}

/**
 * Rewrites the proposal in place using the existing analysis, requirements and
 * demo. A regenerated proposal always returns to NEEDS_REVIEW — it can never
 * inherit an earlier approval.
 */
export async function regenerateProposal(userId: string, proposalId: string): Promise<{ content: string }> {
  const proposal = await prisma.proposal.findFirst({
    where: { id: proposalId, userId },
    include: {
      job: { include: { analysis: true } },
      demo: { include: { screenshots: true } },
      document: true,
    },
  });

  if (!proposal) throw new NotFoundError("Proposal not found.");
  if (!REGENERATABLE.has(proposal.status)) {
    throw new ValidationError("A submitted proposal cannot be regenerated.");
  }
  if (!proposal.job.analysis) {
    throw new ValidationError("This job has not been analyzed yet, so a proposal cannot be written.");
  }

  const job = toJobContext(proposal.job);
  const freelancer = await loadFreelancerContext(userId);
  const analysis = toAnalysisResult(proposal.job.analysis);
  const requirements = (proposal.job.analysis.requirementsExtract as RequirementExtraction | null) ?? null;

  const demoReady = proposal.demo?.status === "READY" && proposal.demo.liveUrl;

  const result = await generateProposal(
    {
      job,
      freelancer,
      analysis,
      requirements,
      demo: demoReady
        ? {
            url: proposal.demo!.liveUrl!,
            email: proposal.demo!.demoEmail,
            password: proposal.demo!.demoPassword,
            covered: ((proposal.demo!.coverage ?? []) as { requirement: string }[]).map(
              (item) => item.requirement,
            ),
          }
        : null,
      hasBrief: proposal.document?.status === "READY",
      maxWords: freelancer.proposalMaxWords,
      tone: freelancer.preferredTone ?? "direct, warm and technically specific",
      includeQuestions: freelancer.includeQuestions,
      signatureName: freelancer.signatureName ?? freelancer.name,
    },
    { userId, jobId: job.id },
  );

  await prisma.proposal.update({
    where: { id: proposal.id },
    data: {
      content: result.data.content,
      editedContent: null,
      questions: result.data.questions,
      bidAmount: result.data.suggestedBidAmount ?? undefined,
      bidHourlyRate: result.data.suggestedHourlyRate ?? undefined,
      status: "NEEDS_REVIEW",
      version: { increment: 1 },
      demoUrlIncluded: Boolean(demoReady),
      model: result.model,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      approvedAt: null,
      rejectedAt: null,
      failureReason: null,
    },
  });

  logger.info({ userId, proposalId }, "Regenerated proposal");
  return { content: result.data.content };
}

/** Re-renders the client brief PDF for an existing proposal. */
export async function regenerateBrief(userId: string, proposalId: string): Promise<{ ok: boolean; message?: string }> {
  const proposal = await prisma.proposal.findFirst({
    where: { id: proposalId, userId },
    include: {
      job: { include: { analysis: true } },
      demo: { include: { screenshots: { orderBy: { order: "asc" } } } },
      document: true,
    },
  });

  if (!proposal) throw new NotFoundError("Proposal not found.");

  const job = toJobContext(proposal.job);
  const freelancer = await loadFreelancerContext(userId);
  const preference = await getOrCreatePreferences(userId);

  let requirements = (proposal.job.analysis?.requirementsExtract as RequirementExtraction | null) ?? null;

  if (!requirements) {
    const extracted = await extractRequirements(job, { userId, jobId: job.id });
    requirements = extracted.data;
    if (proposal.job.analysis) {
      await prisma.jobAnalysis.update({
        where: { jobId: job.id },
        data: { requirementsExtract: requirements as never },
      });
    }
  }

  const document = proposal.document
    ? await prisma.proposalDocument.update({
        where: { id: proposal.document.id },
        data: { status: "GENERATING", errorMessage: null },
      })
    : await prisma.proposalDocument.create({
        data: {
          proposalId: proposal.id,
          status: "GENERATING",
          title: `Project brief — ${proposal.job.title.slice(0, 90)}`,
        },
      });

  try {
    const brief = await generateProjectBrief(
      job,
      requirements,
      (proposal.demo?.plan as DemoPlan | null) ?? null,
      freelancer.name,
      { userId, jobId: job.id },
    );

    const screenshots = (
      await Promise.all(
        (proposal.demo?.screenshots ?? []).map((shot) => toDataUri(shot.path, shot.label)),
      )
    ).filter((shot): shot is NonNullable<typeof shot> => shot !== null);

    const rendered = await renderProjectBriefPdf(
      {
        brief: brief.data,
        preparedBy: freelancer.name,
        preparedFor: proposal.job.title,
        demoUrl: proposal.demo?.status === "READY" ? proposal.demo.liveUrl : null,
        demoEmail: proposal.demo?.demoEmail ?? null,
        demoPassword: proposal.demo?.demoPassword ?? null,
        screenshots,
        companyName: preference.companyName,
        portfolioUrl: preference.portfolioUrl,
        generatedOn: new Date(),
      },
      proposal.id,
    );

    if (!rendered) {
      await prisma.proposalDocument.update({
        where: { id: document.id },
        data: {
          status: "FAILED",
          content: brief.data as never,
          errorMessage: "PDF rendering is unavailable in this environment (no Chromium binary).",
        },
      });
      return { ok: false, message: "PDF rendering is unavailable in this environment." };
    }

    await prisma.proposalDocument.update({
      where: { id: document.id },
      data: {
        status: "READY",
        filePath: rendered.filePath,
        pageCount: rendered.pageCount,
        content: brief.data as never,
      },
    });

    return { ok: true };
  } catch (error) {
    const message = toErrorMessage(error);
    await prisma.proposalDocument.update({
      where: { id: document.id },
      data: { status: "FAILED", errorMessage: message.slice(0, 1_000) },
    });
    return { ok: false, message };
  }
}

/**
 * Rebuilds the demo for a proposal and re-links it. Any previous demo record is
 * kept for the audit trail; only the newest READY demo is attached.
 */
export async function rebuildDemo(userId: string, proposalId: string): Promise<{ ok: boolean; message?: string }> {
  const proposal = await prisma.proposal.findFirst({
    where: { id: proposalId, userId },
    include: { job: { include: { analysis: true } }, demo: true },
  });

  if (!proposal) throw new NotFoundError("Proposal not found.");
  if (proposal.status === "SUBMITTED") {
    throw new ValidationError("The demo for a submitted proposal cannot be rebuilt.");
  }
  if (!proposal.job.analysis) {
    throw new ValidationError("This job has not been analyzed yet.");
  }

  const job = toJobContext(proposal.job);
  const freelancer = await loadFreelancerContext(userId);
  const preference = await getOrCreatePreferences(userId);
  const thresholds = toThresholds(preference);

  let requirements = (proposal.job.analysis.requirementsExtract as RequirementExtraction | null) ?? null;
  if (!requirements) {
    const extracted = await extractRequirements(job, { userId, jobId: job.id });
    requirements = extracted.data;
    await prisma.jobAnalysis.update({
      where: { jobId: job.id },
      data: { requirementsExtract: requirements as never },
    });
  }

  const analysis = proposal.job.analysis;

  const built = await buildDemo({
    userId,
    job,
    requirements,
    decision: {
      demoRecommended: true,
      demoReason: analysis.demoReason ?? "Requested manually from the review dashboard.",
      demoComplexity: analysis.demoComplexity === "NONE" ? "SMALL" : analysis.demoComplexity,
      estimatedFiles: analysis.estimatedFiles ?? 8,
      demoRequirements: analysis.demoRequirements,
      demoValueScore: analysis.demoValueScore,
      suggestedTemplate: (proposal.demo?.templateKey ?? "admin-dashboard") as never,
      industry: proposal.demo?.industry ?? "General SaaS",
    },
    thresholds,
    preparedBy: freelancer.signatureName ?? freelancer.name,
  });

  if (built.demo.status !== "READY" || !built.liveUrl) {
    return { ok: false, message: built.failureReason ?? "The demo could not be rebuilt." };
  }

  await prisma.demoProject.update({ where: { id: built.demo.id }, data: { proposalId: proposal.id } });
  if (proposal.demo && proposal.demo.id !== built.demo.id) {
    await prisma.demoProject.update({ where: { id: proposal.demo.id }, data: { proposalId: null } });
  }

  return { ok: true };
}
