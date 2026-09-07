import type {
  NormalisedUpworkJob,
  SubmitProposalInput,
  SubmitProposalResult,
  UpworkCapabilities,
  UpworkJobSearchParams,
  UpworkProfile,
  UpworkProvider,
} from "@/services/upwork/types";

interface Seed {
  title: string;
  description: string;
  skills: string[];
  projectType: "FIXED" | "HOURLY";
  budget: number | null;
  hourly: [number, number] | null;
  country: string;
  hireRate: number;
  spent: number;
  rating: number;
  proposals: number;
  verified: boolean;
  connects: number;
  duration: string;
}

/**
 * Deterministic sample marketplace used for local development, demos and tests.
 *
 * This is generated fixture data — it never touches Upwork. It exists so the
 * pipeline can be exercised end to end without live API credentials.
 */
const SEEDS: Seed[] = [
  {
    title: "Senior Next.js Developer for AI-Powered SaaS Dashboard",
    description:
      "We are building an AI workflow platform for operations teams. The marketing site and auth are done; we need the product dashboard: workspace switching, usage analytics, a job queue view and billing. Stack is Next.js App Router, TypeScript, Tailwind, Prisma + Postgres, and the Claude API for the assistant panel. Roughly 6-8 weeks of work with a possible extension. Please tell us how you would structure the streaming assistant responses.",
    skills: ["Next.js", "React", "TypeScript", "Prisma", "PostgreSQL", "Claude", "Tailwind CSS"],
    projectType: "HOURLY",
    budget: null,
    hourly: [55, 90],
    country: "United States",
    hireRate: 92,
    spent: 184_000,
    rating: 4.94,
    proposals: 7,
    verified: true,
    connects: 16,
    duration: "3 to 6 months",
  },
  {
    title: "Stripe Subscription Checkout + Customer Portal (Next.js)",
    description:
      "Our SaaS needs subscription billing. Three plans, monthly and annual, a 14 day trial, proration on upgrades, and a customer portal for invoices and payment method updates. We need webhooks handled reliably with idempotency, and entitlements synced to our Postgres users table. Existing app is Next.js 15 with Prisma. Looking for someone who has shipped this before, not someone learning Stripe on our budget.",
    skills: ["Stripe", "Next.js", "TypeScript", "Node.js", "PostgreSQL", "Webhooks"],
    projectType: "FIXED",
    budget: 3_500,
    hourly: null,
    country: "United Kingdom",
    hireRate: 88,
    spent: 96_500,
    rating: 4.88,
    proposals: 12,
    verified: true,
    connects: 12,
    duration: "1 to 3 months",
  },
  {
    title: "Twilio Voice IVR with ElevenLabs Voice Responses",
    description:
      "We run a home services business and want an automated phone assistant. Inbound calls should be answered, the caller's intent captured, appointments booked into our calendar, and callbacks scheduled when a human is needed. We want natural sounding speech, so ElevenLabs rather than the standard TTS. Node backend preferred. Please describe your approach to call state and interruption handling.",
    skills: ["Twilio", "ElevenLabs", "Node.js", "TypeScript", "Voice AI"],
    projectType: "FIXED",
    budget: 4_200,
    hourly: null,
    country: "Canada",
    hireRate: 76,
    spent: 41_200,
    rating: 4.7,
    proposals: 9,
    verified: true,
    connects: 16,
    duration: "1 to 3 months",
  },
  {
    title: "Healthcare Appointment Management Portal (MVP)",
    description:
      "Small clinic group. We need a portal where front desk staff manage appointments, patient profiles, and clinician availability, with different permissions for admin, clinician and reception. HIPAA considerations matter but we are not storing clinical notes in v1. We would like to see how the interface would look before committing to the full build.",
    skills: ["React", "Next.js", "TypeScript", "PostgreSQL", "Healthcare"],
    projectType: "FIXED",
    budget: 7_500,
    hourly: null,
    country: "Australia",
    hireRate: 95,
    spent: 212_000,
    rating: 5,
    proposals: 5,
    verified: true,
    connects: 16,
    duration: "3 to 6 months",
  },
  {
    title: "Fix CSS alignment issue on pricing page",
    description:
      "One column on our pricing page is misaligned on mobile Safari. Should be a quick fix for someone who knows flexbox. Tailwind project.",
    skills: ["CSS", "Tailwind CSS", "HTML"],
    projectType: "FIXED",
    budget: 45,
    hourly: null,
    country: "India",
    hireRate: 33,
    spent: 780,
    rating: 4.1,
    proposals: 38,
    verified: false,
    connects: 4,
    duration: "Less than 1 month",
  },
  {
    title: "Build complete Uber clone with driver and rider apps in 2 weeks",
    description:
      "Need full marketplace: iOS, Android, web admin, real time tracking, payments, chat, ratings, surge pricing, dispatch algorithm. Budget is firm. Must start immediately. Send previous similar work and your best price. Long term relationship for the right person.",
    skills: ["React Native", "Node.js", "MongoDB", "Payments"],
    projectType: "FIXED",
    budget: 900,
    hourly: null,
    country: "United Arab Emirates",
    hireRate: 12,
    spent: 2_300,
    rating: 3.4,
    proposals: 46,
    verified: false,
    connects: 8,
    duration: "1 to 3 months",
  },
  {
    title: "Analytics Dashboard for E-commerce Brand (Shopify data)",
    description:
      "We want a clean internal dashboard pulling Shopify orders into a warehouse view: revenue by channel, cohort retention, product margin, and inventory risk. Charts must be readable by non-technical staff. Next.js + TypeScript preferred. Show us something visual in your application if you can.",
    skills: ["Next.js", "TypeScript", "Shopify", "Data Visualization", "PostgreSQL"],
    projectType: "HOURLY",
    budget: null,
    hourly: [45, 75],
    country: "Germany",
    hireRate: 81,
    spent: 68_400,
    rating: 4.79,
    proposals: 14,
    verified: true,
    connects: 12,
    duration: "1 to 3 months",
  },
  {
    title: "Node.js/Express API for Project Management SaaS",
    description:
      "Backend only. Multi-tenant workspaces, projects, tasks, comments, file attachments, role based access, and a webhook system for integrations. Postgres with Prisma. We have an OpenAPI sketch. Need clean, tested code and sensible migrations.",
    skills: ["Node.js", "Express", "TypeScript", "Prisma", "PostgreSQL", "REST API"],
    projectType: "HOURLY",
    budget: null,
    hourly: [50, 80],
    country: "Netherlands",
    hireRate: 87,
    spent: 132_000,
    rating: 4.91,
    proposals: 11,
    verified: true,
    connects: 12,
    duration: "3 to 6 months",
  },
  {
    title: "AI Assistant Interface for Internal Knowledge Base",
    description:
      "We have 4,000 internal documents. We want a chat interface where staff ask questions and get answers with citations. Retrieval quality matters more than chat features. Claude or OpenAI, your recommendation. Next.js frontend. Tell us how you would evaluate answer quality.",
    skills: ["OpenAI", "Claude", "Next.js", "TypeScript", "RAG", "Vector Database"],
    projectType: "FIXED",
    budget: 9_000,
    hourly: null,
    country: "United States",
    hireRate: 90,
    spent: 305_000,
    rating: 4.96,
    proposals: 6,
    verified: true,
    connects: 16,
    duration: "1 to 3 months",
  },
  {
    title: "WordPress plugin maintenance, ongoing",
    description:
      "Looking for someone to maintain three legacy WordPress plugins. Occasional bug fixes and compatibility updates. Low volume, ongoing.",
    skills: ["WordPress", "PHP", "MySQL"],
    projectType: "HOURLY",
    budget: null,
    hourly: [15, 25],
    country: "United States",
    hireRate: 64,
    spent: 18_900,
    rating: 4.5,
    proposals: 22,
    verified: true,
    connects: 8,
    duration: "More than 6 months",
  },
];

function matchesFilters(seed: Seed, params: UpworkJobSearchParams): boolean {
  const haystack = `${seed.title} ${seed.description} ${seed.skills.join(" ")}`.toLowerCase();

  if (params.excludeKeywords.some((keyword) => haystack.includes(keyword.toLowerCase()))) return false;

  const terms = [...params.keywords, ...params.skills].map((term) => term.toLowerCase()).filter(Boolean);
  if (terms.length > 0 && !terms.some((term) => haystack.includes(term))) return false;

  if (params.paymentVerifiedOnly && !seed.verified) return false;
  if (params.projectType && params.projectType !== "UNKNOWN" && seed.projectType !== params.projectType) return false;
  if (typeof params.minFixedBudget === "number" && seed.projectType === "FIXED") {
    if ((seed.budget ?? 0) < params.minFixedBudget) return false;
  }
  if (typeof params.minHourlyRate === "number" && seed.projectType === "HOURLY") {
    if ((seed.hourly?.[1] ?? 0) < params.minHourlyRate) return false;
  }
  if (params.excludedCountries?.length && params.excludedCountries.includes(seed.country)) return false;

  return true;
}

export class UpworkMockProvider implements UpworkProvider {
  readonly name = "upwork-mock";

  capabilities(): UpworkCapabilities {
    return {
      canSearchJobs: true,
      canReadConnects: true,
      canSubmitProposals: false,
      canAttachDocuments: false,
      notes:
        "Sample data provider for local development. It returns fixture jobs and never contacts Upwork. Proposal submission is intentionally disabled so no Connects can be spent.",
    };
  }

  async searchJobs(params: UpworkJobSearchParams): Promise<NormalisedUpworkJob[]> {
    const now = Date.now();

    return SEEDS.filter((seed) => matchesFilters(seed, params))
      .slice(0, params.limit)
      .map((seed, index) => {
        const postedAt = new Date(now - (index + 1) * 3.5 * 3_600_000);
        const slug = seed.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 60);
        const id = `~sample${(index + 1).toString().padStart(3, "0")}${slug.slice(0, 12)}`;

        return {
          upworkJobId: id,
          title: seed.title,
          description: seed.description,
          url: `https://www.upwork.com/jobs/${slug}_${id}`,
          category: "Web, Mobile & Software Dev",
          subcategory: "Full Stack Development",
          skills: seed.skills,
          projectType: seed.projectType,
          experienceLevel: seed.budget !== null && seed.budget < 500 ? "ENTRY" : "EXPERT",
          budgetAmount: seed.budget,
          hourlyMin: seed.hourly?.[0] ?? null,
          hourlyMax: seed.hourly?.[1] ?? null,
          currency: "USD",
          estimatedDuration: seed.duration,
          workload: "Full time",
          connectsRequired: seed.connects,
          clientCountry: seed.country,
          clientCity: null,
          clientRating: seed.rating,
          clientHireRate: seed.hireRate,
          clientTotalSpent: seed.spent,
          clientJobsPosted: Math.round(seed.spent / 3_400) + 4,
          clientTotalHires: Math.round(seed.spent / 5_200) + 2,
          clientOpenJobs: (index % 3) + 1,
          clientPaymentVerified: seed.verified,
          clientMemberSince: new Date(now - (index + 3) * 220 * 86_400_000),
          proposalsCount: seed.proposals,
          proposalsRange: seed.proposals < 5 ? "Less than 5" : `${seed.proposals - 3} to ${seed.proposals + 3}`,
          interviewCount: Math.max(0, Math.round(seed.proposals / 6)),
          invitesSent: Math.max(0, Math.round(seed.proposals / 8)),
          unansweredInvites: 0,
          postedAt,
          raw: { source: "sample-data", seedIndex: index },
        } satisfies NormalisedUpworkJob;
      });
  }

  async getProfile(): Promise<UpworkProfile> {
    return {
      upworkUserId: "sample-user",
      organizationId: "sample-org",
      name: "Sample Upwork Account",
      title: "Full Stack Developer (sample data)",
      pictureUrl: null,
      countryCode: "US",
      connectsBalance: 124,
      raw: { source: "sample-data" },
    };
  }

  async getConnectsBalance(): Promise<number | null> {
    return 124;
  }

  async submitProposal(_input: SubmitProposalInput): Promise<SubmitProposalResult> {
    return {
      ok: false,
      offerId: null,
      connectsSpent: null,
      raw: null,
      unsupported: true,
      errorMessage:
        "Sample data mode cannot submit proposals. Connect a real Upwork account in Settings → Upwork to submit through the official API.",
    };
  }
}
