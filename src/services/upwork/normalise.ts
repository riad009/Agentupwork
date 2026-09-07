import type { NormalisedUpworkJob } from "@/services/upwork/types";

type Unknown = Record<string, unknown>;

function asRecord(value: unknown): Unknown | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Unknown) : null;
}

export function pickString(source: Unknown | null, ...keys: string[]): string | null {
  if (!source) return null;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim().length > 0) return value;
  }
  return null;
}

export function pickNumber(source: Unknown | null, ...keys: string[]): number | null {
  if (!source) return null;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
      return Number(value);
    }
    const nested = asRecord(value);
    if (nested) {
      const amount = nested.rawValue ?? nested.amount ?? nested.value;
      if (typeof amount === "number" && Number.isFinite(amount)) return amount;
      if (typeof amount === "string" && Number.isFinite(Number(amount))) return Number(amount);
    }
  }
  return null;
}

export function pickBoolean(source: Unknown | null, ...keys: string[]): boolean {
  if (!source) return false;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "boolean") return value;
    if (value === "true") return true;
    if (value === "false") return false;
  }
  return false;
}

export function pickDate(source: Unknown | null, ...keys: string[]): Date | null {
  const raw = pickString(source, ...keys);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function pickStringArray(source: Unknown | null, ...keys: string[]): string[] {
  if (!source) return [];
  for (const key of keys) {
    const value = source[key];
    if (Array.isArray(value)) {
      return value
        .map((entry) => {
          if (typeof entry === "string") return entry;
          const record = asRecord(entry);
          return pickString(record, "name", "prettyName", "label", "skill") ?? null;
        })
        .filter((entry): entry is string => Boolean(entry));
    }
  }
  return [];
}

function normaliseProjectType(value: string | null): NormalisedUpworkJob["projectType"] {
  if (!value) return "UNKNOWN";
  const upper = value.toUpperCase();
  if (upper.includes("HOUR")) return "HOURLY";
  if (upper.includes("FIX") || upper.includes("BUDGET")) return "FIXED";
  return "UNKNOWN";
}

function normaliseExperience(value: string | null): NormalisedUpworkJob["experienceLevel"] {
  if (!value) return "ANY";
  const upper = value.toUpperCase();
  if (upper.includes("ENTRY") || upper.includes("BEGIN")) return "ENTRY";
  if (upper.includes("INTERMEDIATE") || upper.includes("MID")) return "INTERMEDIATE";
  if (upper.includes("EXPERT") || upper.includes("SENIOR")) return "EXPERT";
  return "ANY";
}

/**
 * Maps a marketplace job posting from the official Upwork GraphQL API onto the
 * internal shape. Upwork's response fields differ between API versions, so each
 * value is resolved defensively from a list of known aliases.
 */
export function normaliseJobPosting(node: unknown): NormalisedUpworkJob | null {
  const job = asRecord(node);
  if (!job) return null;

  const upworkJobId =
    pickString(job, "id", "ciphertext", "uid", "jobId") ?? pickString(asRecord(job.job), "id");
  if (!upworkJobId) return null;

  const client = asRecord(job.client) ?? asRecord(job.buyer) ?? asRecord(job.clientProfile);
  const clientStats = asRecord(client?.stats) ?? asRecord(client?.statistics) ?? client;
  const location = asRecord(client?.location) ?? asRecord(job.clientLocation);
  const amount = asRecord(job.amount) ?? asRecord(job.budget);
  const hourlyRange = asRecord(job.hourlyBudget) ?? asRecord(job.hourlyBudgetRange);
  const activity = asRecord(job.activityStat) ?? asRecord(job.activity) ?? job;

  const ciphertext = pickString(job, "ciphertext", "cipherText");
  const url =
    pickString(job, "url", "jobUrl") ??
    `https://www.upwork.com/jobs/${ciphertext ?? upworkJobId}`;

  const postedAt =
    pickDate(job, "createdDateTime", "postedOn", "publishedOn", "createdOn", "createdAt") ?? new Date();

  return {
    upworkJobId,
    title: pickString(job, "title", "name") ?? "Untitled job",
    description: pickString(job, "description", "content", "snippet") ?? "",
    url,
    category: pickString(asRecord(job.category) ?? asRecord(job.classification), "name", "prettyName"),
    subcategory: pickString(asRecord(job.subcategory) ?? asRecord(job.subCategory), "name", "prettyName"),
    skills: pickStringArray(job, "skills", "requiredSkills", "attrs"),
    projectType: normaliseProjectType(pickString(job, "type", "jobType", "engagementType")),
    experienceLevel: normaliseExperience(pickString(job, "experienceLevel", "contractorTier", "tier")),
    budgetAmount: pickNumber(job, "amount", "budget") ?? pickNumber(amount, "rawValue", "amount", "value"),
    hourlyMin: pickNumber(hourlyRange, "min", "rawValue", "minimum"),
    hourlyMax: pickNumber(hourlyRange, "max", "maximum"),
    currency: pickString(amount, "currency", "currencyCode") ?? "USD",
    estimatedDuration: pickString(job, "duration", "durationLabel", "engagementDuration"),
    workload: pickString(job, "workload", "engagement"),
    connectsRequired: pickNumber(job, "connectsRequired", "connects", "requiredConnects"),
    clientCountry: pickString(location, "country", "countryName", "countryCode"),
    clientCity: pickString(location, "city", "cityName"),
    clientRating: pickNumber(clientStats, "score", "feedbackScore", "totalFeedback", "rating"),
    clientHireRate: pickNumber(clientStats, "hireRate", "hiringRate"),
    clientTotalSpent: pickNumber(clientStats, "totalCharges", "totalSpent", "totalSpend"),
    clientJobsPosted: pickNumber(clientStats, "totalPostedJobs", "jobsPosted", "totalJobsPosted"),
    clientTotalHires: pickNumber(clientStats, "totalHires", "hires", "totalAssignments"),
    clientOpenJobs: pickNumber(clientStats, "activeAssignmentsCount", "openJobs"),
    clientPaymentVerified: pickBoolean(client, "paymentVerificationStatus", "isPaymentMethodVerified", "verified"),
    clientMemberSince: pickDate(client, "memberSince", "registrationDate", "creationDate"),
    proposalsCount: pickNumber(activity, "totalApplicants", "applicants", "proposalsCount"),
    proposalsRange: pickString(activity, "applicationsBucket", "proposalsTier", "totalApplicantsRange"),
    interviewCount: pickNumber(activity, "totalInvitedToInterview", "interviewing", "invitedToInterview"),
    invitesSent: pickNumber(activity, "invitationsSent", "totalInvitedToInterview", "invites"),
    unansweredInvites: pickNumber(activity, "unansweredInvites", "invitationsUnanswered"),
    postedAt,
    raw: node,
  };
}
