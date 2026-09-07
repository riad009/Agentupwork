export interface UpworkJobSearchParams {
  keywords: string[];
  excludeKeywords: string[];
  skills: string[];
  minFixedBudget?: number | null;
  minHourlyRate?: number | null;
  maxHourlyRate?: number | null;
  maxJobAgeHours?: number | null;
  paymentVerifiedOnly?: boolean;
  countries?: string[];
  excludedCountries?: string[];
  experienceLevels?: string[];
  projectType?: "FIXED" | "HOURLY" | "UNKNOWN";
  durations?: string[];
  limit: number;
}

export interface NormalisedUpworkJob {
  upworkJobId: string;
  title: string;
  description: string;
  url: string;
  category: string | null;
  subcategory: string | null;
  skills: string[];
  projectType: "FIXED" | "HOURLY" | "UNKNOWN";
  experienceLevel: "ENTRY" | "INTERMEDIATE" | "EXPERT" | "ANY";
  budgetAmount: number | null;
  hourlyMin: number | null;
  hourlyMax: number | null;
  currency: string;
  estimatedDuration: string | null;
  workload: string | null;
  connectsRequired: number | null;
  clientCountry: string | null;
  clientCity: string | null;
  clientRating: number | null;
  clientHireRate: number | null;
  clientTotalSpent: number | null;
  clientJobsPosted: number | null;
  clientTotalHires: number | null;
  clientOpenJobs: number | null;
  clientPaymentVerified: boolean;
  clientMemberSince: Date | null;
  proposalsCount: number | null;
  proposalsRange: string | null;
  interviewCount: number | null;
  invitesSent: number | null;
  unansweredInvites: number | null;
  postedAt: Date;
  raw: unknown;
}

export interface UpworkProfile {
  upworkUserId: string | null;
  organizationId: string | null;
  name: string | null;
  title: string | null;
  pictureUrl: string | null;
  countryCode: string | null;
  connectsBalance: number | null;
  raw: unknown;
}

export interface SubmitProposalInput {
  upworkJobId: string;
  coverLetter: string;
  bidAmount?: number | null;
  hourlyRate?: number | null;
  estimatedDurationLabel?: string | null;
  idempotencyKey: string;
}

export interface SubmitProposalResult {
  ok: boolean;
  offerId: string | null;
  connectsSpent: number | null;
  raw: unknown;
  errorMessage?: string;
  /** True when the failure is "the official API does not expose this", not a transient fault. */
  unsupported?: boolean;
}

export interface UpworkCapabilities {
  /** Job search through the official marketplace API. */
  canSearchJobs: boolean;
  /** Programmatic proposal submission through the official API. */
  canSubmitProposals: boolean;
  /** Attaching generated documents to a submitted proposal. */
  canAttachDocuments: boolean;
  /** Reading the freelancer's remaining Connects. */
  canReadConnects: boolean;
  notes: string;
}

export interface UpworkProvider {
  readonly name: string;
  capabilities(): UpworkCapabilities;
  searchJobs(params: UpworkJobSearchParams): Promise<NormalisedUpworkJob[]>;
  getProfile(): Promise<UpworkProfile>;
  getConnectsBalance(): Promise<number | null>;
  submitProposal(input: SubmitProposalInput): Promise<SubmitProposalResult>;
}
