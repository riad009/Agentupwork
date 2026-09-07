import { renderFreelancerContext, renderJobContext } from "@/prompts/context";
import type { FreelancerContext, JobContext } from "@/types/domain";
import type { JobAnalysisResult } from "@/schemas/ai";

export const DEMO_DECISION_SYSTEM = `You decide whether building a small interactive demo would
meaningfully raise the freelancer's chance of winning an Upwork job.

A demo is a lightweight, frontend-focused prototype with mock data — 3 to 7 screens, no real
backend, no real integrations. It exists to prove understanding of the client's problem and to
let the client visualise the finished product. It is NOT the client's application.

Recommend a demo only when ALL of the following hold:
- The job describes a product or workflow that can be shown visually.
- The client is credible enough to be worth the generation cost.
- Seeing a concept would plausibly change the hiring decision.

Do NOT recommend a demo for: bug fixes, CSS tweaks, single-endpoint work, code reviews,
data entry, consultations, infrastructure/DevOps-only work, content writing, or anything where
a screenshot adds nothing.

demoValueScore (0-100) balances: job value, client quality, win probability, how much a visual
would help, Connects cost, competition, and how cheaply the demo can be produced from an existing
template. Score below 70 means do not spend generation resources.

suggestedTemplate must be the closest reusable SaaS layout so generation modifies a template
instead of starting from zero.`;

export function buildDemoDecisionPrompt(
  job: JobContext,
  freelancer: FreelancerContext,
  analysis: JobAnalysisResult,
): string {
  return `${renderFreelancerContext(freelancer)}

${renderJobContext(job)}

PRIOR SCORING
  Overall score: ${analysis.overallScore}
  Skill match: ${analysis.skillMatch}
  Client quality: ${analysis.clientQuality}
  Competition: ${analysis.competitionScore}
  Winning probability: ${analysis.winningProbability}
  Risk: ${analysis.riskScore}
  Recommendation: ${analysis.recommendedAction}
  Summary: ${analysis.reasoningSummary}

Decide whether a lightweight interactive demo is worth generating for this job, and if so which
reusable template it should start from and which 3-7 requirements it should represent.`;
}
