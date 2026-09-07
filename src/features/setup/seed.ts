import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export interface SeedOptions {
  email: string;
  password: string;
  name: string;
}

export interface SeedResult {
  userId: string;
  email: string;
  role: string;
  created: boolean;
  searchProfiles: number;
  portfolioProjects: number;
}

const SEARCH_PROFILES = [
  {
    name: "AI SaaS",
    keywords: ["AI SaaS", "Claude", "OpenAI", "LLM", "RAG", "AI assistant", "Next.js"],
    skills: ["Next.js", "TypeScript", "OpenAI", "Claude", "Vector Database"],
    excludeKeywords: ["WordPress", "Wix", "data entry", "unpaid", "equity only"],
    minFixedBudget: 2_000,
    minHourlyRate: 45,
    minClientHireRate: 60,
    minClientSpend: 5_000,
    resultLimit: 40,
  },
  {
    name: "Stripe Development",
    keywords: ["Stripe", "subscription billing", "checkout", "payments", "webhooks"],
    skills: ["Stripe", "Node.js", "TypeScript", "PostgreSQL"],
    excludeKeywords: ["crypto", "gambling", "casino"],
    minFixedBudget: 1_500,
    minHourlyRate: 45,
    minClientHireRate: 55,
    minClientSpend: 3_000,
    resultLimit: 30,
  },
  {
    name: "Next.js Full Stack",
    keywords: ["Next.js", "React", "TypeScript", "Node.js", "Express", "Prisma", "PostgreSQL", "SaaS"],
    skills: ["Next.js", "React", "TypeScript", "Prisma", "PostgreSQL"],
    excludeKeywords: ["WordPress", "Shopify theme", "Squarespace"],
    minFixedBudget: 2_500,
    minHourlyRate: 50,
    minClientHireRate: 60,
    minClientSpend: 10_000,
    resultLimit: 40,
  },
  {
    name: "Twilio / ElevenLabs",
    keywords: ["Twilio", "ElevenLabs", "voice AI", "IVR", "SMS", "call automation"],
    skills: ["Twilio", "ElevenLabs", "Node.js", "TypeScript"],
    excludeKeywords: ["cold calling", "robocall", "spam"],
    minFixedBudget: 1_500,
    minHourlyRate: 45,
    minClientHireRate: 50,
    minClientSpend: 2_000,
    resultLimit: 25,
  },
];

const PORTFOLIO = [
  {
    title: "Subscription billing for a B2B analytics platform",
    description:
      "Replaced a hand-rolled billing flow with Stripe Checkout and the customer portal: three plans, annual and monthly, proration on plan changes, and idempotent webhook handling that syncs entitlements into the database. Included a reconciliation job that catches any webhook the app missed.",
    technologies: ["Next.js", "TypeScript", "Stripe", "Prisma", "PostgreSQL"],
    clientIndustry: "B2B SaaS",
    projectType: "Payments integration",
    achievements: [
      "Cut failed-payment churn by handling dunning through Stripe rather than custom email logic",
      "Reduced billing support tickets by moving invoices and card updates into the customer portal",
    ],
    highlighted: true,
  },
  {
    title: "Operations dashboard for a multi-clinic healthcare group",
    description:
      "Built the internal portal front desk staff use daily: appointment scheduling across clinicians, patient profiles, role-aware navigation for admin, clinician and reception, and a utilisation view. Focused on accessibility and fast keyboard workflows because staff use it continuously.",
    technologies: ["Next.js", "React", "TypeScript", "PostgreSQL", "Tailwind CSS"],
    clientIndustry: "Healthcare",
    projectType: "Internal operations tool",
    achievements: ["Replaced a spreadsheet workflow used across four clinic locations"],
    highlighted: true,
  },
  {
    title: "Retrieval-augmented assistant over an internal knowledge base",
    description:
      "Shipped a chat interface answering staff questions over roughly 4,000 internal documents, with inline citations back to the source. Spent most of the effort on retrieval quality and an evaluation harness rather than chat features, since answer accuracy was the actual requirement.",
    technologies: ["Next.js", "TypeScript", "Claude", "Vector Database", "Node.js"],
    clientIndustry: "Professional services",
    projectType: "AI application",
    achievements: ["Built an evaluation set so retrieval changes could be measured rather than guessed at"],
    highlighted: false,
  },
];

/**
 * Creates the first administrator plus a realistic starting configuration.
 * Idempotent: re-running updates the account rather than duplicating anything.
 */
export async function seedWorkspace(options: SeedOptions): Promise<SeedResult> {
  const email = options.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  const passwordHash = await bcrypt.hash(options.password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: options.name,
      passwordHash,
      role: "ADMIN",
      emailVerified: new Date(),
    },
    update: { name: options.name, role: "ADMIN", passwordHash },
  });

  await prisma.userPreference.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      automationEnabled: false,
      scheduleFrequency: "EVERY_6_HOURS",
      maxJobsPerRun: 100,
      topJobsCount: 10,
      signatureName: options.name,
    },
    update: {},
  });

  await prisma.aiProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      professionalTitle: "Full Stack SaaS Developer",
      yearsOfExperience: 7,
      hourlyRate: 65,
      minimumBudget: 1_500,
      preferredProjectSize: "$3k–$20k, 4–12 weeks",
      preferredTechnologies: [
        "Next.js",
        "React",
        "TypeScript",
        "Node.js",
        "Express",
        "Prisma",
        "PostgreSQL",
        "Stripe",
        "Claude",
        "OpenAI",
        "Twilio",
        "ElevenLabs",
      ],
      industries: ["AI SaaS", "FinTech", "Healthcare", "E-commerce"],
      availability: "30 hours per week, able to start within a few days",
      preferredTone: "direct, warm and technically specific",
      proposalLength: "SHORT",
      countriesToAvoid: [],
      bio: "I build production SaaS products end to end: Next.js front ends, typed Node APIs, database schemas, payments and AI features that hold up under real usage.",
    },
    update: {},
  });

  for (const profile of SEARCH_PROFILES) {
    const found = await prisma.jobSearchProfile.findFirst({
      where: { userId: user.id, name: profile.name },
      select: { id: true },
    });
    if (found) continue;

    await prisma.jobSearchProfile.create({
      data: {
        userId: user.id,
        name: profile.name,
        keywords: profile.keywords,
        skills: profile.skills,
        excludeKeywords: profile.excludeKeywords,
        minFixedBudget: profile.minFixedBudget,
        minHourlyRate: profile.minHourlyRate,
        minClientHireRate: profile.minClientHireRate,
        minClientSpend: profile.minClientSpend,
        maxJobAgeHours: 72,
        paymentVerifiedOnly: true,
        resultLimit: profile.resultLimit,
        isActive: true,
      },
    });
  }

  for (const project of PORTFOLIO) {
    const found = await prisma.portfolioProject.findFirst({
      where: { userId: user.id, title: project.title },
      select: { id: true },
    });
    if (found) continue;

    await prisma.portfolioProject.create({ data: { userId: user.id, ...project } });
  }

  const [searchProfiles, portfolioProjects] = await Promise.all([
    prisma.jobSearchProfile.count({ where: { userId: user.id } }),
    prisma.portfolioProject.count({ where: { userId: user.id } }),
  ]);

  return {
    userId: user.id,
    email: user.email,
    role: user.role,
    created: existing === null,
    searchProfiles,
    portfolioProjects,
  };
}
