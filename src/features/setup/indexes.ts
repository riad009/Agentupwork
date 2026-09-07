import "server-only";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

interface IndexSpec {
  collection: string;
  name: string;
  key: Record<string, 1 | -1>;
  unique?: boolean;
}

/**
 * Index definitions mirroring the `@unique`, `@@unique` and `@@index`
 * declarations in the Prisma schema.
 *
 * On MongoDB, Prisma enforces uniqueness through database indexes, which are
 * normally created by `prisma db push`. This applies them at runtime so a
 * deployment can bootstrap itself without CLI access to the cluster.
 */
const INDEXES: IndexSpec[] = [
  // Uniqueness — these are correctness constraints, not optimisations.
  { collection: "User", name: "User_email_key", key: { email: 1 }, unique: true },
  {
    collection: "Account",
    name: "Account_provider_providerAccountId_key",
    key: { provider: 1, providerAccountId: 1 },
    unique: true,
  },
  { collection: "Session", name: "Session_sessionToken_key", key: { sessionToken: 1 }, unique: true },
  { collection: "VerificationToken", name: "VerificationToken_token_key", key: { token: 1 }, unique: true },
  {
    collection: "VerificationToken",
    name: "VerificationToken_identifier_token_key",
    key: { identifier: 1, token: 1 },
    unique: true,
  },
  {
    collection: "PasswordResetToken",
    name: "PasswordResetToken_tokenHash_key",
    key: { tokenHash: 1 },
    unique: true,
  },
  { collection: "UpworkConnection", name: "UpworkConnection_userId_key", key: { userId: 1 }, unique: true },
  {
    collection: "IntegrationCredential",
    name: "IntegrationCredential_userId_provider_key",
    key: { userId: 1, provider: 1 },
    unique: true,
  },
  { collection: "UserPreference", name: "UserPreference_userId_key", key: { userId: 1 }, unique: true },
  { collection: "AiProfile", name: "AiProfile_userId_key", key: { userId: 1 }, unique: true },
  {
    collection: "JobSearchProfile",
    name: "JobSearchProfile_userId_name_key",
    key: { userId: 1, name: 1 },
    unique: true,
  },
  { collection: "Job", name: "Job_userId_upworkJobId_key", key: { userId: 1, upworkJobId: 1 }, unique: true },
  { collection: "JobAnalysis", name: "JobAnalysis_jobId_key", key: { jobId: 1 }, unique: true },
  { collection: "Proposal", name: "Proposal_idempotencyKey_key", key: { idempotencyKey: 1 }, unique: true },
  { collection: "DemoProject", name: "DemoProject_proposalId_key", key: { proposalId: 1 }, unique: true },
  {
    collection: "ProposalDocument",
    name: "ProposalDocument_proposalId_key",
    key: { proposalId: 1 },
    unique: true,
  },
  { collection: "Submission", name: "Submission_idempotencyKey_key", key: { idempotencyKey: 1 }, unique: true },
  {
    collection: "AutomationRunJob",
    name: "AutomationRunJob_runId_jobId_key",
    key: { runId: 1, jobId: 1 },
    unique: true,
  },
  {
    collection: "AutomationRunProposal",
    name: "AutomationRunProposal_runId_proposalId_key",
    key: { runId: 1, proposalId: 1 },
    unique: true,
  },

  // Query paths that the dashboard, job feed and run history rely on.
  { collection: "Job", name: "Job_userId_status_idx", key: { userId: 1, status: 1 } },
  { collection: "Job", name: "Job_userId_postedAt_idx", key: { userId: 1, postedAt: -1 } },
  { collection: "Job", name: "Job_userId_fetchedAt_idx", key: { userId: 1, fetchedAt: -1 } },
  { collection: "JobAnalysis", name: "JobAnalysis_userId_rankedScore_idx", key: { userId: 1, rankedScore: -1 } },
  {
    collection: "JobAnalysis",
    name: "JobAnalysis_userId_recommendedAction_idx",
    key: { userId: 1, recommendedAction: 1 },
  },
  { collection: "Proposal", name: "Proposal_userId_status_idx", key: { userId: 1, status: 1 } },
  { collection: "Proposal", name: "Proposal_userId_createdAt_idx", key: { userId: 1, createdAt: -1 } },
  { collection: "DemoProject", name: "DemoProject_userId_status_idx", key: { userId: 1, status: 1 } },
  { collection: "Submission", name: "Submission_userId_status_idx", key: { userId: 1, status: 1 } },
  { collection: "AutomationRun", name: "AutomationRun_userId_startedAt_idx", key: { userId: 1, startedAt: -1 } },
  { collection: "AutomationRunLog", name: "AutomationRunLog_runId_createdAt_idx", key: { runId: 1, createdAt: 1 } },
  { collection: "AiUsageRecord", name: "AiUsageRecord_userId_createdAt_idx", key: { userId: 1, createdAt: -1 } },
  { collection: "Notification", name: "Notification_userId_status_idx", key: { userId: 1, status: 1 } },
  { collection: "AuditLog", name: "AuditLog_userId_createdAt_idx", key: { userId: 1, createdAt: -1 } },
];

export interface IndexResult {
  created: number;
  alreadyPresent: number;
  failed: { name: string; reason: string }[];
}

export async function ensureIndexes(): Promise<IndexResult> {
  const grouped = new Map<string, IndexSpec[]>();
  for (const spec of INDEXES) {
    const list = grouped.get(spec.collection) ?? [];
    list.push(spec);
    grouped.set(spec.collection, list);
  }

  const result: IndexResult = { created: 0, alreadyPresent: 0, failed: [] };

  for (const [collection, specs] of grouped) {
    try {
      const response = (await prisma.$runCommandRaw({
        createIndexes: collection,
        indexes: specs.map((spec) => ({
          key: spec.key,
          name: spec.name,
          ...(spec.unique ? { unique: true } : {}),
        })),
      })) as { numIndexesBefore?: number; numIndexesAfter?: number; note?: string };

      const before = response.numIndexesBefore ?? 0;
      const after = response.numIndexesAfter ?? before;
      result.created += Math.max(0, after - before);
      result.alreadyPresent += specs.length - Math.max(0, after - before);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      logger.warn({ collection, reason }, "Index creation failed");
      for (const spec of specs) result.failed.push({ name: spec.name, reason: reason.slice(0, 200) });
    }
  }

  logger.info(result, "Ensured MongoDB indexes");
  return result;
}
