import type {
  DemoComplexity,
  DemoStatus,
  ExperienceLevel,
  ProjectType,
  ProposalStatus,
  RecommendedAction,
} from "@prisma/client";

export interface FreelancerContext {
  name: string;
  professionalTitle: string | null;
  yearsOfExperience: number | null;
  hourlyRate: number | null;
  minimumBudget: number | null;
  preferredProjectSize: string | null;
  preferredTechnologies: string[];
  industries: string[];
  availability: string | null;
  preferredTone: string | null;
  proposalLength: string;
  countriesToAvoid: string[];
  bio: string | null;
  portfolio: PortfolioEntry[];
  proposalMaxWords: number;
  includeQuestions: boolean;
  signatureName: string | null;
  portfolioUrl: string | null;
}

export interface PortfolioEntry {
  title: string;
  description: string;
  technologies: string[];
  url: string | null;
  githubUrl: string | null;
  clientIndustry: string | null;
  projectType: string | null;
  achievements: string[];
}

export interface JobContext {
  id: string;
  upworkJobId: string;
  title: string;
  description: string;
  url: string;
  skills: string[];
  projectType: ProjectType;
  experienceLevel: ExperienceLevel;
  budgetAmount: number | null;
  hourlyMin: number | null;
  hourlyMax: number | null;
  estimatedDuration: string | null;
  connectsRequired: number | null;
  clientCountry: string | null;
  clientRating: number | null;
  clientHireRate: number | null;
  clientTotalSpent: number | null;
  clientJobsPosted: number | null;
  clientTotalHires: number | null;
  clientPaymentVerified: boolean;
  proposalsCount: number | null;
  proposalsRange: string | null;
  interviewCount: number | null;
  invitesSent: number | null;
  unansweredInvites: number | null;
  postedAt: Date;
}

export interface RankedJob {
  jobId: string;
  rankedScore: number;
  overallScore: number;
  recommendedAction: RecommendedAction;
}

export interface ScoringWeights {
  skillMatch: number;
  clientQuality: number;
  budget: number;
  competition: number;
  winningProbability: number;
  recency: number;
}

export interface DemoThresholds {
  autoBuild: number;
  suggest: number;
  proposalOnly: number;
  demoValueMinimum: number;
  maxDemosPerRun: number;
  maxPages: number;
  maxIterations: number;
  maxBuildFixAttempts: number;
  maxScreenshots: number;
  generatePdf: boolean;
  demoGenerationEnabled: boolean;
}

export interface PipelineSummary {
  runId: string;
  jobsFetched: number;
  jobsNew: number;
  jobsAnalyzed: number;
  topJobsSelected: number;
  proposalsGenerated: number;
  demosAttempted: number;
  demosGenerated: number;
  documentsGenerated: number;
  estimatedConnects: number;
  errors: string[];
}

export type { DemoComplexity, DemoStatus, ProposalStatus, RecommendedAction, ProjectType, ExperienceLevel };
