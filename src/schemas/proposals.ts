import { z } from "zod";

export const proposalUpdateSchema = z.object({
  editedContent: z.string().trim().min(40, "A proposal needs some content").max(8_000).optional(),
  bidAmount: z.number().min(0).max(1_000_000).nullable().optional(),
  bidHourlyRate: z.number().min(0).max(1_000).nullable().optional(),
  reviewNotes: z.string().trim().max(2_000).nullable().optional(),
});

export const proposalActionSchema = z.object({
  action: z.enum(["REJECT", "SAVE_FOR_LATER", "REOPEN"]),
  reason: z.string().trim().max(500).optional(),
});

export const submitConfirmationSchema = z.object({
  /** The client must echo back the Connects it displayed, proving the user saw the cost. */
  confirmedConnects: z.number().int().min(0).max(1_000).nullable(),
  acknowledged: z.literal(true, { message: "You must confirm before Connects can be spent." }),
});

export const jobListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(25),
  search: z.string().trim().max(120).optional(),
  action: z.enum(["HIGH_PRIORITY", "APPLY", "WATCH", "SKIP"]).optional(),
  status: z.enum(["NEW", "ANALYZED", "SHORTLISTED", "PROPOSAL_READY", "SUBMITTED", "ARCHIVED", "SKIPPED"]).optional(),
  projectType: z.enum(["FIXED", "HOURLY"]).optional(),
  paymentVerified: z.coerce.boolean().optional(),
  demoRecommended: z.coerce.boolean().optional(),
  minScore: z.coerce.number().int().min(0).max(100).optional(),
  sort: z.enum(["score", "recent", "budget", "proposals"]).default("score"),
});

export type JobListQuery = z.infer<typeof jobListQuerySchema>;
