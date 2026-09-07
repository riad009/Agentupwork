import { renderJobContext } from "@/prompts/context";
import type { JobContext } from "@/types/domain";
import type { RequirementExtraction } from "@/schemas/ai";

export const DEMO_PLAN_SYSTEM = `You plan a lightweight, frontend-only demo that will be generated
from an existing reusable SaaS template.

Constraints you must respect:
- Maximum 7 screens, and fewer is better. Pick the smallest set that proves understanding.
- Mock data only. No database, no authentication backend, no third-party integrations.
- Every screen must map to something the client actually asked for.
- The visual direction must match the client's industry: healthcare reads clean and trustworthy;
  fintech reads precise and data-dense; AI SaaS reads modern and minimal; construction reads
  structured and information-heavy; e-commerce reads product-first.

Screens are always rendered inside a shell that already provides the sidebar, top bar and page
container. Do not plan a login screen, a settings screen, or a "demo coverage" screen — the
template already supplies those.

Routes must be lowercase kebab-case with no leading slash, e.g. "appointments".
The first page in the list becomes the demo's landing screen.

primaryColor must be a single Tailwind-compatible hex value such as "#2563eb".

coverage maps the client's own requirements to what the demo shows. productionScope lists what the
real build would include beyond the demo. Never present future ideas as included scope.`;

export function buildDemoPlanPrompt(
  job: JobContext,
  requirements: RequirementExtraction,
  maxPages: number,
  templateKey: string,
  industry: string,
): string {
  return `${renderJobContext(job)}

EXTRACTED REQUIREMENTS
  Client problem: ${requirements.clientProblem}
  Business goal: ${requirements.businessGoal}
  Target users: ${requirements.targetUsers.join(", ") || "not stated"}
  Requested features: ${requirements.requestedFeatures.join("; ") || "not stated"}
  Most important features: ${requirements.mostImportantFeatures.join("; ") || "not stated"}
  Suggested demo features: ${requirements.demoFeatures.join("; ") || "not stated"}
  Recommended solution: ${requirements.recommendedSolution}

TEMPLATE BASE: ${templateKey}
INDUSTRY: ${industry}
MAXIMUM SCREENS: ${maxPages}

Plan the demo. Keep it small, relevant and visually impressive.`;
}
