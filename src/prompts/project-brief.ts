import { renderJobContext } from "@/prompts/context";
import type { JobContext } from "@/types/domain";
import type { DemoPlan, RequirementExtraction } from "@/schemas/ai";

export const PROJECT_BRIEF_SYSTEM = `You write a short, premium client-facing project brief that
accompanies an Upwork proposal. It is prepared specifically for one client's project.

Rules:
- Ground everything in what the client actually wrote. Where you must infer, list it under
  assumptions rather than stating it as fact.
- Translate technical work into business outcomes. "Build a PostgreSQL database" becomes
  "centralised, structured records that stay searchable as the platform grows".
- Be explicit that the demo is intentionally lightweight and that production work would add the
  backend, integrations, security, testing and deployment. Never imply the prototype is finished
  software.
- Keep future ideas clearly separated from the requested scope.
- No marketing fluff, no company boilerplate, no invented credentials or metrics.
- Every string is rendered into a designed PDF, so write clean prose without markdown.`;

export function buildProjectBriefPrompt(
  job: JobContext,
  requirements: RequirementExtraction,
  plan: DemoPlan | null,
  freelancerName: string,
): string {
  const demoBlock = plan
    ? `DEMO THAT WAS BUILT
  Title: ${plan.projectTitle}
  Tagline: ${plan.tagline}
  Screens: ${plan.pages.map((page) => page.name).join(", ")}
  Coverage: ${plan.coverage.map((item) => `${item.requirement} → ${item.demoSolution}`).join("; ")}
  Production scope noted during planning: ${plan.productionScope.join("; ")}`
    : "DEMO THAT WAS BUILT\n  (no demo was generated — do not reference one)";

  return `${renderJobContext(job)}

EXTRACTED REQUIREMENTS
  Client problem: ${requirements.clientProblem}
  Business goal: ${requirements.businessGoal}
  Target users: ${requirements.targetUsers.join(", ") || "not stated"}
  Requested features: ${requirements.requestedFeatures.join("; ") || "not stated"}
  Most important features: ${requirements.mostImportantFeatures.join("; ") || "not stated"}
  Future scope candidates: ${requirements.futureFeatures.join("; ") || "not stated"}
  Recommended solution: ${requirements.recommendedSolution}
  Assumptions already noted: ${requirements.assumptions.join("; ") || "none"}

${demoBlock}

PREPARED BY: ${freelancerName}

Write the brief. Target five to ten rendered pages of content — concise beats exhaustive.`;
}
