import { z } from "zod";

export const preferencesSchema = z.object({
  automationEnabled: z.boolean().optional(),
  scheduleFrequency: z.enum(["MANUAL", "HOURLY", "EVERY_3_HOURS", "EVERY_6_HOURS", "DAILY"]).optional(),
  maxJobsPerRun: z.number().int().min(1).max(100).optional(),
  topJobsCount: z.number().int().min(1).max(20).optional(),

  demoAutoThreshold: z.number().int().min(0).max(100).optional(),
  demoSuggestThreshold: z.number().int().min(0).max(100).optional(),
  proposalOnlyThreshold: z.number().int().min(0).max(100).optional(),
  demoValueScoreMinimum: z.number().int().min(0).max(100).optional(),
  maxDemosPerRun: z.number().int().min(0).max(10).optional(),
  maxDemoPages: z.number().int().min(1).max(7).optional(),
  maxDemoIterations: z.number().int().min(1).max(5).optional(),
  maxBuildFixAttempts: z.number().int().min(1).max(5).optional(),
  maxScreenshots: z.number().int().min(1).max(6).optional(),
  generatePdf: z.boolean().optional(),
  demoGenerationEnabled: z.boolean().optional(),

  weightSkillMatch: z.number().int().min(0).max(100).optional(),
  weightClientQuality: z.number().int().min(0).max(100).optional(),
  weightBudget: z.number().int().min(0).max(100).optional(),
  weightCompetition: z.number().int().min(0).max(100).optional(),
  weightWinProb: z.number().int().min(0).max(100).optional(),
  weightRecency: z.number().int().min(0).max(100).optional(),

  emailNotifications: z.boolean().optional(),
  notifyOnProposalsReady: z.boolean().optional(),
  notifyOnAutomationError: z.boolean().optional(),
  notifyOnSubmission: z.boolean().optional(),
  digestOnly: z.boolean().optional(),

  proposalTone: z.string().trim().max(160).optional(),
  proposalMaxWords: z.number().int().min(80).max(600).optional(),
  includeQuestions: z.boolean().optional(),
  signatureName: z.string().trim().max(80).nullable().optional(),
  portfolioUrl: z.string().url().max(300).nullable().optional().or(z.literal("")),
  companyName: z.string().trim().max(120).nullable().optional(),
});

export const aiProfileSchema = z.object({
  professionalTitle: z.string().trim().max(120).nullable().optional(),
  yearsOfExperience: z.number().int().min(0).max(60).nullable().optional(),
  hourlyRate: z.number().min(0).max(1_000).nullable().optional(),
  minimumBudget: z.number().min(0).max(1_000_000).nullable().optional(),
  preferredProjectSize: z.string().trim().max(80).nullable().optional(),
  preferredTechnologies: z.array(z.string().trim().min(1).max(60)).max(40).optional(),
  industries: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  availability: z.string().trim().max(120).nullable().optional(),
  preferredTone: z.string().trim().max(160).nullable().optional(),
  proposalLength: z.enum(["SHORT", "MEDIUM", "LONG"]).optional(),
  countriesToAvoid: z.array(z.string().trim().min(1).max(60)).max(40).optional(),
  bio: z.string().trim().max(4_000).nullable().optional(),
});

export type PreferencesInput = z.infer<typeof preferencesSchema>;
export type AiProfileInput = z.infer<typeof aiProfileSchema>;
