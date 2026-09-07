import "server-only";
import { env } from "@/lib/env";
import { completeStructured, type ClaudeUsage } from "@/services/claude/client";
import {
  demoCodeSchema,
  demoDecisionSchema,
  demoPlanSchema,
  jobAnalysisSchema,
  projectBriefSchema,
  proposalSchema,
  requirementExtractionSchema,
  type DemoCodeResult,
  type DemoDecisionResult,
  type DemoPlan,
  type JobAnalysisResult,
  type ProjectBrief,
  type ProposalResult,
  type RequirementExtraction,
} from "@/schemas/ai";
import { JOB_ANALYSIS_SYSTEM, buildJobAnalysisPrompt } from "@/prompts/job-analysis";
import { DEMO_DECISION_SYSTEM, buildDemoDecisionPrompt } from "@/prompts/demo-decision";
import { REQUIREMENTS_SYSTEM, buildRequirementsPrompt } from "@/prompts/requirements";
import { PROPOSAL_SYSTEM, buildProposalPrompt, type ProposalPromptInput } from "@/prompts/proposal";
import { DEMO_PLAN_SYSTEM, buildDemoPlanPrompt } from "@/prompts/demo-plan";
import {
  DEMO_CODE_SYSTEM,
  DEMO_FIX_SYSTEM,
  buildDemoCodePrompt,
  buildDemoFixPrompt,
} from "@/prompts/demo-code";
import { PROJECT_BRIEF_SYSTEM, buildProjectBriefPrompt } from "@/prompts/project-brief";
import type { FreelancerContext, JobContext } from "@/types/domain";

export interface AiCallMeta {
  userId: string;
  jobId?: string;
  runId?: string;
}

export interface AiResult<T> {
  data: T;
  usage: ClaudeUsage;
  model: string;
}

export async function analyzeJob(
  job: JobContext,
  freelancer: FreelancerContext,
  meta: AiCallMeta,
): Promise<AiResult<JobAnalysisResult>> {
  return completeStructured({
    operation: "job_analysis",
    system: JOB_ANALYSIS_SYSTEM,
    prompt: buildJobAnalysisPrompt(job, freelancer),
    schema: jobAnalysisSchema,
    toolName: "submit_job_analysis",
    toolDescription: "Submit the structured scoring of one Upwork job for this freelancer.",
    model: env.ANTHROPIC_ANALYSIS_MODEL,
    maxTokens: 2_000,
    temperature: 0.2,
    userId: meta.userId,
    jobId: meta.jobId,
    runId: meta.runId,
  });
}

export async function decideDemo(
  job: JobContext,
  freelancer: FreelancerContext,
  analysis: JobAnalysisResult,
  meta: AiCallMeta,
): Promise<AiResult<DemoDecisionResult>> {
  return completeStructured({
    operation: "demo_decision",
    system: DEMO_DECISION_SYSTEM,
    prompt: buildDemoDecisionPrompt(job, freelancer, analysis),
    schema: demoDecisionSchema,
    toolName: "submit_demo_decision",
    toolDescription: "Decide whether a lightweight demo should be generated for this job.",
    model: env.ANTHROPIC_ANALYSIS_MODEL,
    maxTokens: 1_200,
    temperature: 0.2,
    userId: meta.userId,
    jobId: meta.jobId,
    runId: meta.runId,
  });
}

export async function extractRequirements(
  job: JobContext,
  meta: AiCallMeta,
): Promise<AiResult<RequirementExtraction>> {
  return completeStructured({
    operation: "requirements_extraction",
    system: REQUIREMENTS_SYSTEM,
    prompt: buildRequirementsPrompt(job),
    schema: requirementExtractionSchema,
    toolName: "submit_requirements",
    toolDescription: "Submit the structured requirements extracted from the job description.",
    model: env.ANTHROPIC_ANALYSIS_MODEL,
    maxTokens: 2_000,
    temperature: 0.2,
    userId: meta.userId,
    jobId: meta.jobId,
    runId: meta.runId,
  });
}

export async function generateProposal(
  input: ProposalPromptInput,
  meta: AiCallMeta,
): Promise<AiResult<ProposalResult>> {
  return completeStructured({
    operation: "proposal_generation",
    system: PROPOSAL_SYSTEM,
    prompt: buildProposalPrompt(input),
    schema: proposalSchema,
    toolName: "submit_proposal",
    toolDescription: "Submit the finished Upwork proposal text and optional clarifying questions.",
    model: env.ANTHROPIC_MODEL,
    maxTokens: 2_000,
    temperature: 0.6,
    userId: meta.userId,
    jobId: meta.jobId,
    runId: meta.runId,
  });
}

export async function planDemo(
  job: JobContext,
  requirements: RequirementExtraction,
  options: { maxPages: number; templateKey: string; industry: string },
  meta: AiCallMeta,
): Promise<AiResult<DemoPlan>> {
  return completeStructured({
    operation: "demo_plan",
    system: DEMO_PLAN_SYSTEM,
    prompt: buildDemoPlanPrompt(job, requirements, options.maxPages, options.templateKey, options.industry),
    schema: demoPlanSchema,
    toolName: "submit_demo_plan",
    toolDescription: "Submit the plan for a lightweight demo prototype.",
    model: env.ANTHROPIC_DEMO_MODEL,
    maxTokens: 3_000,
    temperature: 0.5,
    userId: meta.userId,
    jobId: meta.jobId,
    runId: meta.runId,
  });
}

export async function generateDemoCode(
  plan: DemoPlan,
  routes: string[],
  meta: AiCallMeta,
): Promise<AiResult<DemoCodeResult>> {
  return completeStructured({
    operation: "demo_code",
    system: DEMO_CODE_SYSTEM,
    prompt: buildDemoCodePrompt(plan, routes),
    schema: demoCodeSchema,
    toolName: "submit_demo_files",
    toolDescription: "Submit the generated demo screen files.",
    model: env.ANTHROPIC_DEMO_MODEL,
    maxTokens: 16_000,
    temperature: 0.4,
    userId: meta.userId,
    jobId: meta.jobId,
    runId: meta.runId,
  });
}

export async function repairDemoCode(
  errors: string,
  files: { path: string; contents: string }[],
  meta: AiCallMeta,
): Promise<AiResult<DemoCodeResult>> {
  return completeStructured({
    operation: "demo_code_repair",
    system: DEMO_FIX_SYSTEM,
    prompt: buildDemoFixPrompt(errors, files),
    schema: demoCodeSchema,
    toolName: "submit_fixed_files",
    toolDescription: "Submit corrected demo files.",
    model: env.ANTHROPIC_DEMO_MODEL,
    maxTokens: 12_000,
    temperature: 0.1,
    userId: meta.userId,
    jobId: meta.jobId,
    runId: meta.runId,
  });
}

export async function generateProjectBrief(
  job: JobContext,
  requirements: RequirementExtraction,
  plan: DemoPlan | null,
  freelancerName: string,
  meta: AiCallMeta,
): Promise<AiResult<ProjectBrief>> {
  return completeStructured({
    operation: "project_brief",
    system: PROJECT_BRIEF_SYSTEM,
    prompt: buildProjectBriefPrompt(job, requirements, plan, freelancerName),
    schema: projectBriefSchema,
    toolName: "submit_project_brief",
    toolDescription: "Submit the structured client-facing project brief.",
    model: env.ANTHROPIC_MODEL,
    maxTokens: 4_000,
    temperature: 0.4,
    userId: meta.userId,
    jobId: meta.jobId,
    runId: meta.runId,
  });
}

export { verifyClaudeKey } from "@/services/claude/client";
