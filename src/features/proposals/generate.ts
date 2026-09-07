import "server-only";
import type { Proposal } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { toErrorMessage } from "@/lib/errors";
import { generateProjectBrief, generateProposal } from "@/services/claude";
import { renderProjectBriefPdf, toDataUri } from "@/services/pdf";
import type { DemoPlan, JobAnalysisResult, RequirementExtraction } from "@/schemas/ai";
import type { FreelancerContext, JobContext } from "@/types/domain";

export interface ProposalGenerationInput {
  userId: string;
  job: JobContext;
  freelancer: FreelancerContext;
  analysis: JobAnalysisResult;
  requirements: RequirementExtraction | null;
  demo: {
    id: string;
    url: string;
    email: string | null;
    password: string | null;
    covered: string[];
    plan: DemoPlan | null;
    screenshots: { label: string; path: string }[];
  } | null;
  generatePdf: boolean;
  companyName: string | null;
  portfolioUrl: string | null;
  runId?: string;
}

export interface ProposalGenerationOutcome {
  proposal: Proposal;
  usage: { inputTokens: number; outputTokens: number };
  documentGenerated: boolean;
}

/**
 * Generates the proposal text, optionally renders the client project brief PDF,
 * and stores everything as PENDING approval. Nothing here submits to Upwork.
 */
export async function generateProposalForJob(
  input: ProposalGenerationInput,
): Promise<ProposalGenerationOutcome> {
  const usage = { inputTokens: 0, outputTokens: 0 };
  const meta = { userId: input.userId, jobId: input.job.id, runId: input.runId };

  const hasBrief = input.generatePdf && input.requirements !== null;

  const proposalResult = await generateProposal(
    {
      job: input.job,
      freelancer: input.freelancer,
      analysis: input.analysis,
      requirements: input.requirements,
      demo: input.demo
        ? {
            url: input.demo.url,
            email: input.demo.email,
            password: input.demo.password,
            covered: input.demo.covered,
          }
        : null,
      hasBrief,
      maxWords: input.freelancer.proposalMaxWords,
      tone: input.freelancer.preferredTone ?? "direct, warm and technically specific",
      includeQuestions: input.freelancer.includeQuestions,
      signatureName: input.freelancer.signatureName ?? input.freelancer.name,
    },
    meta,
  );

  usage.inputTokens += proposalResult.usage.inputTokens;
  usage.outputTokens += proposalResult.usage.outputTokens;

  const proposal = await prisma.proposal.create({
    data: {
      userId: input.userId,
      jobId: input.job.id,
      status: "NEEDS_REVIEW",
      content: proposalResult.data.content,
      questions: proposalResult.data.questions,
      bidAmount: proposalResult.data.suggestedBidAmount ?? undefined,
      bidHourlyRate: proposalResult.data.suggestedHourlyRate ?? undefined,
      connectsRequired: input.job.connectsRequired ?? undefined,
      demoUrlIncluded: Boolean(input.demo),
      model: proposalResult.model,
      inputTokens: proposalResult.usage.inputTokens,
      outputTokens: proposalResult.usage.outputTokens,
    },
  });

  if (input.demo) {
    await prisma.demoProject.update({
      where: { id: input.demo.id },
      data: { proposalId: proposal.id },
    });
  }

  await prisma.job.update({ where: { id: input.job.id }, data: { status: "PROPOSAL_READY" } });

  let documentGenerated = false;

  if (hasBrief && input.requirements) {
    documentGenerated = await generateBriefDocument(proposal.id, input, usage).catch((error) => {
      logger.warn({ err: error, proposalId: proposal.id }, "Project brief generation failed");
      return false;
    });
  }

  return { proposal, usage, documentGenerated };
}

async function generateBriefDocument(
  proposalId: string,
  input: ProposalGenerationInput,
  usage: { inputTokens: number; outputTokens: number },
): Promise<boolean> {
  if (!input.requirements) return false;

  const document = await prisma.proposalDocument.create({
    data: {
      proposalId,
      status: "GENERATING",
      title: `Project brief — ${input.job.title.slice(0, 90)}`,
    },
  });

  try {
    const briefResult = await generateProjectBrief(
      input.job,
      input.requirements,
      input.demo?.plan ?? null,
      input.freelancer.name,
      { userId: input.userId, jobId: input.job.id, runId: input.runId },
    );

    usage.inputTokens += briefResult.usage.inputTokens;
    usage.outputTokens += briefResult.usage.outputTokens;

    const screenshots = (
      await Promise.all(
        (input.demo?.screenshots ?? []).map((shot) => toDataUri(shot.path, shot.label)),
      )
    ).filter((shot): shot is NonNullable<typeof shot> => shot !== null);

    const rendered = await renderProjectBriefPdf(
      {
        brief: briefResult.data,
        preparedBy: input.freelancer.name,
        preparedFor: input.job.title,
        demoUrl: input.demo?.url ?? null,
        demoEmail: input.demo?.email ?? null,
        demoPassword: input.demo?.password ?? null,
        screenshots,
        companyName: input.companyName,
        portfolioUrl: input.portfolioUrl,
        generatedOn: new Date(),
      },
      proposalId,
    );

    if (!rendered) {
      await prisma.proposalDocument.update({
        where: { id: document.id },
        data: {
          status: "FAILED",
          content: briefResult.data as never,
          errorMessage: "PDF rendering is unavailable in this environment (no Chromium binary).",
        },
      });
      return false;
    }

    await prisma.proposalDocument.update({
      where: { id: document.id },
      data: {
        status: "READY",
        filePath: rendered.filePath,
        pageCount: rendered.pageCount,
        content: briefResult.data as never,
      },
    });

    return true;
  } catch (error) {
    await prisma.proposalDocument.update({
      where: { id: document.id },
      data: { status: "FAILED", errorMessage: toErrorMessage(error).slice(0, 1_000) },
    });
    return false;
  }
}
