import { z } from "zod";

export const portfolioSchema = z.object({
  title: z.string().trim().min(2, "Give the project a title").max(120),
  description: z.string().trim().min(20, "Describe what you actually built").max(4_000),
  technologies: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
  url: z.string().url("Enter a valid URL").max(300).nullable().optional().or(z.literal("")),
  githubUrl: z.string().url("Enter a valid URL").max(300).nullable().optional().or(z.literal("")),
  clientIndustry: z.string().trim().max(80).nullable().optional(),
  projectType: z.string().trim().max(80).nullable().optional(),
  achievements: z.array(z.string().trim().min(1).max(240)).max(10).default([]),
  highlighted: z.boolean().default(false),
  completedAt: z.string().datetime().nullable().optional().or(z.literal("")),
});

export const portfolioUpdateSchema = portfolioSchema.partial();

export type PortfolioInput = z.infer<typeof portfolioSchema>;
