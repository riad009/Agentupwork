import { renderJobContext } from "@/prompts/context";
import type { JobContext } from "@/types/domain";

export const REQUIREMENTS_SYSTEM = `You extract structured requirements from an Upwork job post.

Only use information the client actually wrote. When something is genuinely unclear, record it in
"assumptions" instead of inventing a fact. Do not add features the client never mentioned to
requestedFeatures — put genuinely adjacent ideas in futureFeatures instead.

demoFeatures must be the 3-7 most convincing features to show in a small, frontend-only prototype
with mock data. Choose the features that prove understanding of the client's problem, not the ones
that are easiest to build.`;

export function buildRequirementsPrompt(job: JobContext): string {
  return `${renderJobContext(job)}

Extract the client's problem, business goal, users, requested features, the subset worth showing in
a lightweight demo, plausible future scope, and a short recommended solution.`;
}
