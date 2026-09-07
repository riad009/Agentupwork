import { renderFreelancerContext, renderJobContext } from "@/prompts/context";
import type { FreelancerContext, JobContext } from "@/types/domain";
import type { JobAnalysisResult, RequirementExtraction } from "@/schemas/ai";

export const PROPOSAL_SYSTEM = `You write Upwork proposals that get replies.

Hard rules:
- Open by naming the client's actual problem in their own vocabulary. No greetings addressed to
  "Hiring Manager", no "I hope this finds you well", no restating the job title back at them.
- Never claim experience that is not in the verified portfolio. If the portfolio has nothing
  directly relevant, say what IS relevant honestly rather than inventing a project.
- Be concrete: name the approach, the key technical decision, or the risk you would handle first.
  One sentence of real insight beats a paragraph of enthusiasm.
- Reference at most one past project, and only when it genuinely maps to this job.
- No superlatives, no "I am the perfect fit", no bullet lists of buzzwords, no pricing negotiation.
- Plain text only. Short paragraphs. No markdown headings, no bold, no emoji.
- End with the freelancer's name on its own line.

If a live demo URL is supplied, introduce it naturally as something you built for THIS brief and
say in one clause what it shows. Never mention a demo that was not supplied.

If demo credentials are supplied, include them on their own lines directly after the demo URL.

If a project brief PDF was prepared, mention in one sentence that a short brief is attached
covering the understanding of requirements, proposed solution and production approach.

Questions: at most two, each genuinely useful for scoping and unanswerable from the post.`;

export interface ProposalPromptInput {
  job: JobContext;
  freelancer: FreelancerContext;
  analysis: JobAnalysisResult;
  requirements: RequirementExtraction | null;
  demo: { url: string; email: string | null; password: string | null; covered: string[] } | null;
  hasBrief: boolean;
  maxWords: number;
  tone: string;
  includeQuestions: boolean;
  signatureName: string;
}

export function buildProposalPrompt(input: ProposalPromptInput): string {
  const requirementsBlock = input.requirements
    ? `EXTRACTED REQUIREMENTS
  Client problem: ${input.requirements.clientProblem}
  Business goal: ${input.requirements.businessGoal}
  Target users: ${input.requirements.targetUsers.join(", ") || "not stated"}
  Most important features: ${input.requirements.mostImportantFeatures.join("; ") || "not stated"}
  Recommended solution: ${input.requirements.recommendedSolution}`
    : "EXTRACTED REQUIREMENTS\n  (not available — work directly from the job description)";

  const demoBlock = input.demo
    ? `LIVE DEMO PREPARED FOR THIS JOB
  URL: ${input.demo.url}
  Demo email: ${input.demo.email ?? "(no login required)"}
  Demo password: ${input.demo.password ?? "(no login required)"}
  Represented in the demo: ${input.demo.covered.join("; ") || "core workflow"}
  The demo is an intentionally lightweight prototype with mock data.`
    : "LIVE DEMO PREPARED FOR THIS JOB\n  (none — do not mention or imply a demo)";

  return `${renderFreelancerContext(input.freelancer)}

${renderJobContext(input.job)}

${requirementsBlock}

SCORING CONTEXT
  Strengths to lean on: ${input.analysis.strengths.join("; ") || "not specified"}
  Risks to acknowledge only if useful: ${input.analysis.risks.join("; ") || "none"}
  Technical opportunity: ${input.analysis.technicalOpportunity}

${demoBlock}

PROJECT BRIEF PDF: ${input.hasBrief ? "prepared and available to attach" : "not prepared"}

WRITING CONSTRAINTS
  Maximum length: ${input.maxWords} words.
  Tone: ${input.tone}.
  Questions: ${input.includeQuestions ? "include one or two" : "do not include questions"}.
  Sign off with: ${input.signatureName}

Write the proposal now.`;
}
