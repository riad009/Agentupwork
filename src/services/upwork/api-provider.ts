import "server-only";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { IntegrationError } from "@/lib/errors";
import { isRetryableHttpStatus, withRetry } from "@/lib/retry";
import { normaliseJobPosting, pickNumber, pickString } from "@/services/upwork/normalise";
import type {
  NormalisedUpworkJob,
  SubmitProposalInput,
  SubmitProposalResult,
  UpworkCapabilities,
  UpworkJobSearchParams,
  UpworkProfile,
  UpworkProvider,
} from "@/services/upwork/types";

interface GraphQlError {
  message: string;
  extensions?: Record<string, unknown>;
}

interface GraphQlResponse<T> {
  data?: T;
  errors?: GraphQlError[];
}

const JOB_SEARCH_QUERY = /* GraphQL */ `
  query MarketplaceJobPostingsSearch(
    $marketPlaceJobFilter: MarketplaceJobFilter
    $searchType: MarketplaceJobPostingSearchType
    $sortAttributes: [MarketplaceJobPostingSearchSortAttribute]
  ) {
    marketplaceJobPostings(
      marketPlaceJobFilter: $marketPlaceJobFilter
      searchType: $searchType
      sortAttributes: $sortAttributes
    ) {
      totalCount
      edges {
        node {
          id
          ciphertext
          title
          description
          duration
          durationLabel
          engagement
          experienceLevel
          type
          createdDateTime
          publishedDateTime
          connectsRequired: totalApplicants
          amount {
            rawValue
            currency
          }
          hourlyBudgetMin {
            rawValue
            currency
          }
          hourlyBudgetMax {
            rawValue
            currency
          }
          skills {
            name
          }
          category {
            name
          }
          subcategory {
            name
          }
          client {
            totalHires
            totalPostedJobs
            totalSpent {
              rawValue
            }
            verificationStatus
            location {
              country
              city
            }
            totalReviews
            totalFeedback
          }
          activityStat {
            applicationsBidStats {
              avgRateBid {
                rawValue
              }
            }
            lastBuyerActivity
            invitationsSent
            totalInvitedToInterview
            totalApplicants
            unansweredInvites
          }
        }
      }
    }
  }
`;

const PROFILE_QUERY = /* GraphQL */ `
  query CurrentUserProfile {
    user {
      id
      nid
      name
      email
      photoUrl
    }
    organization {
      id
      name
    }
  }
`;

/**
 * Official Upwork GraphQL API client.
 *
 * Only documented, authorized endpoints are used. There is deliberately no
 * scraping, headless browser, or HTML parsing anywhere in this provider.
 */
export class UpworkApiProvider implements UpworkProvider {
  readonly name = "upwork-api";

  constructor(
    private readonly accessToken: string,
    private readonly organizationId?: string | null,
  ) {}

  capabilities(): UpworkCapabilities {
    return {
      canSearchJobs: true,
      canReadConnects: true,
      // Upwork exposes proposal submission only to applications whose API
      // contract includes it. The pipeline never assumes it: a rejection is
      // surfaced to the user with the supported manual workflow instead.
      canSubmitProposals: true,
      canAttachDocuments: false,
      notes:
        "Proposal submission is attempted through the official API. If the connected Upwork application is not authorised for it, the proposal is marked FAILED with the API's own error and the manual submission workflow is offered. Document attachments are not part of the public API, so generated PDFs are provided for manual upload.",
    };
  }

  private async graphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    const endpoint = new URL("/graphql", env.UPWORK_API_BASE_URL).toString();

    const payload = await withRetry(
      async () => {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.accessToken}`,
        };
        if (this.organizationId) headers["X-Upwork-API-TenantId"] = this.organizationId;

        const response = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({ query, variables }),
          signal: AbortSignal.timeout(45_000),
        });

        if (!response.ok) {
          const text = await response.text();
          const error = new IntegrationError(
            "upwork",
            `Upwork API request failed (${response.status}): ${text.slice(0, 400)}`,
          );
          if (isRetryableHttpStatus(response.status)) throw error;
          throw Object.assign(error, { __noRetry: true });
        }

        return (await response.json()) as GraphQlResponse<T>;
      },
      {
        attempts: 3,
        baseDelayMs: 800,
        label: "upwork:graphql",
        shouldRetry: (error) => !(error as { __noRetry?: boolean }).__noRetry,
      },
    );

    if (payload.errors?.length) {
      throw new IntegrationError(
        "upwork",
        payload.errors.map((error) => error.message).join("; "),
        payload.errors,
      );
    }

    if (!payload.data) {
      throw new IntegrationError("upwork", "Upwork API returned an empty response.");
    }

    return payload.data;
  }

  async searchJobs(params: UpworkJobSearchParams): Promise<NormalisedUpworkJob[]> {
    const filter: Record<string, unknown> = {
      pagination_eq: { first: Math.min(params.limit, 100), after: "0" },
    };

    const searchExpression = [...params.keywords, ...params.skills].filter(Boolean).join(" OR ");
    if (searchExpression) filter.titleExpression_eq = searchExpression;
    if (params.skills.length) filter.skillExpression_eq = params.skills.join(" OR ");
    if (params.projectType && params.projectType !== "UNKNOWN") {
      filter.jobType_eq = params.projectType;
    }
    if (params.experienceLevels?.length) {
      filter.contractorTier_eq = params.experienceLevels;
    }
    if (params.countries?.length) filter.locations_any = params.countries;
    if (typeof params.minFixedBudget === "number") {
      filter.budgetRange_eq = { rangeStart: params.minFixedBudget };
    }
    if (typeof params.minHourlyRate === "number" || typeof params.maxHourlyRate === "number") {
      filter.hourlyRate_eq = {
        rangeStart: params.minHourlyRate ?? undefined,
        rangeEnd: params.maxHourlyRate ?? undefined,
      };
    }

    const data = await this.graphql<{
      marketplaceJobPostings?: { edges?: { node: unknown }[] };
    }>(JOB_SEARCH_QUERY, {
      marketPlaceJobFilter: filter,
      searchType: "USER_JOBS_SEARCH",
      sortAttributes: [{ field: "RECENCY" }],
    });

    const edges = data.marketplaceJobPostings?.edges ?? [];
    const jobs = edges
      .map((edge) => normaliseJobPosting(edge.node))
      .filter((job): job is NormalisedUpworkJob => job !== null);

    logger.info({ count: jobs.length }, "Fetched job postings from the Upwork API");
    return jobs;
  }

  async getProfile(): Promise<UpworkProfile> {
    const data = await this.graphql<{ user?: Record<string, unknown>; organization?: Record<string, unknown> }>(
      PROFILE_QUERY,
      {},
    );

    const user = data.user ?? null;
    const organization = data.organization ?? null;

    return {
      upworkUserId: pickString(user, "id", "nid"),
      organizationId: pickString(organization, "id"),
      name: pickString(user, "name"),
      title: pickString(user, "title"),
      pictureUrl: pickString(user, "photoUrl", "portraitUrl"),
      countryCode: pickString(user, "countryCode"),
      connectsBalance: pickNumber(user, "connects", "connectsBalance"),
      raw: data,
    };
  }

  async getConnectsBalance(): Promise<number | null> {
    try {
      const profile = await this.getProfile();
      return profile.connectsBalance;
    } catch (error) {
      logger.warn({ err: error }, "Unable to read Connects balance from the Upwork API");
      return null;
    }
  }

  async submitProposal(input: SubmitProposalInput): Promise<SubmitProposalResult> {
    const mutation = /* GraphQL */ `
      mutation CreateProposal($input: ProposalCreateInput!) {
        createProposal(input: $input) {
          proposal {
            id
            status
            connectsSpent
          }
        }
      }
    `;

    try {
      const data = await this.graphql<{
        createProposal?: { proposal?: Record<string, unknown> };
      }>(mutation, {
        input: {
          jobId: input.upworkJobId,
          coverLetter: input.coverLetter,
          chargeAmount: input.bidAmount ?? undefined,
          hourlyRate: input.hourlyRate ?? undefined,
          duration: input.estimatedDurationLabel ?? undefined,
          clientRequestKey: input.idempotencyKey,
        },
      });

      const proposal = data.createProposal?.proposal ?? null;

      return {
        ok: Boolean(proposal),
        offerId: pickString(proposal, "id"),
        connectsSpent: pickNumber(proposal, "connectsSpent"),
        raw: data,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const unsupported = /cannot query|unknown (field|type)|not authorized|unsupported|forbidden/i.test(
        message,
      );

      return {
        ok: false,
        offerId: null,
        connectsSpent: null,
        raw: null,
        errorMessage: message,
        unsupported,
      };
    }
  }
}
