import { z } from "zod";

const experienceLevel = z.enum(["ENTRY", "INTERMEDIATE", "EXPERT", "ANY"]);

const stringList = z
  .array(z.string().trim().min(1).max(80))
  .max(40)
  .default([]);

export const searchProfileSchema = z.object({
  name: z.string().trim().min(2, "Name your search profile").max(60),
  isActive: z.boolean().default(true),
  keywords: stringList,
  includeKeywords: stringList,
  excludeKeywords: stringList,
  skills: stringList,
  minFixedBudget: z.number().min(0).max(1_000_000).nullable().default(null),
  minHourlyRate: z.number().min(0).max(1_000).nullable().default(null),
  maxHourlyRate: z.number().min(0).max(1_000).nullable().default(null),
  maxJobAgeHours: z.number().int().min(1).max(720).nullable().default(72),
  minClientHireRate: z.number().int().min(0).max(100).nullable().default(null),
  minClientSpend: z.number().min(0).max(100_000_000).nullable().default(null),
  paymentVerifiedOnly: z.boolean().default(true),
  minClientRating: z.number().min(0).max(5).nullable().default(null),
  maxProposals: z.number().int().min(0).max(500).nullable().default(null),
  countries: stringList,
  excludedCountries: stringList,
  experienceLevels: z.array(experienceLevel).max(4).default([]),
  projectType: z.enum(["FIXED", "HOURLY", "UNKNOWN"]).default("UNKNOWN"),
  durations: stringList,
  resultLimit: z.number().int().min(1).max(100).default(50),
});

export const searchProfileUpdateSchema = searchProfileSchema.partial();

export type SearchProfileInput = z.infer<typeof searchProfileSchema>;
