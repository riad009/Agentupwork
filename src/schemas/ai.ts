import { z } from "zod";

const score = z.number().int().min(0).max(100);

export const jobAnalysisSchema = z.object({
  overallScore: score,
  skillMatch: score,
  clientQuality: score,
  competitionScore: score,
  budgetScore: score,
  winningProbability: score,
  riskScore: score,
  recommendedAction: z.enum(["HIGH_PRIORITY", "APPLY", "WATCH", "SKIP"]),
  reasoningSummary: z.string().min(1).max(1200),
  strengths: z.array(z.string().max(240)).max(6),
  risks: z.array(z.string().max(240)).max(6),
  technicalOpportunity: z.string().max(600),
});

export type JobAnalysisResult = z.infer<typeof jobAnalysisSchema>;

export const demoDecisionSchema = z.object({
  demoRecommended: z.boolean(),
  demoReason: z.string().min(1).max(600),
  demoComplexity: z.enum(["NONE", "SMALL", "MEDIUM", "LARGE"]),
  estimatedFiles: z.number().int().min(0).max(60),
  demoRequirements: z.array(z.string().max(180)).max(10),
  demoValueScore: score,
  suggestedTemplate: z.enum([
    "admin-dashboard",
    "crm",
    "healthcare",
    "booking",
    "analytics",
    "ai-saas",
    "marketplace",
    "fintech",
    "ecommerce",
    "project-management",
  ]),
  industry: z.string().max(80),
});

export type DemoDecisionResult = z.infer<typeof demoDecisionSchema>;

export const requirementExtractionSchema = z.object({
  clientProblem: z.string().max(900),
  businessGoal: z.string().max(900),
  targetUsers: z.array(z.string().max(120)).max(8),
  requestedFeatures: z.array(z.string().max(180)).max(20),
  mostImportantFeatures: z.array(z.string().max(180)).max(8),
  demoFeatures: z.array(z.string().max(180)).max(7),
  futureFeatures: z.array(z.string().max(180)).max(8),
  recommendedSolution: z.string().max(1200),
  assumptions: z.array(z.string().max(240)).max(6),
});

export type RequirementExtraction = z.infer<typeof requirementExtractionSchema>;

export const proposalSchema = z.object({
  content: z.string().min(80).max(4000),
  questions: z.array(z.string().max(280)).max(2),
  suggestedBidAmount: z.number().min(0).max(1_000_000).nullable(),
  suggestedHourlyRate: z.number().min(0).max(1000).nullable(),
  toneNotes: z.string().max(400),
});

export type ProposalResult = z.infer<typeof proposalSchema>;

export const demoPlanPageSchema = z.object({
  route: z.string().max(60),
  name: z.string().max(60),
  purpose: z.string().max(300),
  sections: z.array(z.string().max(160)).max(8),
});

export const demoPlanSchema = z.object({
  projectTitle: z.string().max(90),
  tagline: z.string().max(160),
  industry: z.string().max(60),
  designDirection: z.string().max(600),
  primaryColor: z.string().max(30),
  pages: z.array(demoPlanPageSchema).min(1).max(7),
  coverage: z
    .array(
      z.object({
        requirement: z.string().max(180),
        demoSolution: z.string().max(300),
      }),
    )
    .max(10),
  productionScope: z.array(z.string().max(180)).max(14),
  futureEnhancements: z.array(z.string().max(180)).max(8),
  mockDataNotes: z.string().max(600),
});

export type DemoPlan = z.infer<typeof demoPlanSchema>;

export const demoFileSchema = z.object({
  path: z.string().max(160),
  contents: z.string(),
});

export const demoCodeSchema = z.object({
  files: z.array(demoFileSchema).min(1).max(40),
  notes: z.string().max(600),
});

export type DemoCodeResult = z.infer<typeof demoCodeSchema>;

export const projectBriefSchema = z.object({
  projectTitle: z.string().max(120),
  category: z.string().max(80),
  summary: z.string().max(700),
  currentProblem: z.string().max(900),
  projectGoal: z.string().max(900),
  users: z.array(z.string().max(120)).max(8),
  assumptions: z.array(z.string().max(240)).max(6),
  proposedSolution: z.object({
    approach: z.string().max(900),
    workflows: z.array(z.string().max(200)).max(6),
    modules: z.array(z.string().max(120)).max(8),
    technicalDirection: z.string().max(700),
  }),
  demoCoverage: z
    .array(z.object({ requirement: z.string().max(180), representation: z.string().max(300) }))
    .max(8),
  businessOutcomes: z
    .array(z.object({ title: z.string().max(120), outcome: z.string().max(400) }))
    .max(8),
  deliverables: z.array(z.string().max(160)).max(14),
  futureEnhancements: z.array(z.string().max(160)).max(8),
  phases: z.array(z.object({ name: z.string().max(80), detail: z.string().max(300) })).max(6),
  closingNote: z.string().max(700),
});

export type ProjectBrief = z.infer<typeof projectBriefSchema>;
