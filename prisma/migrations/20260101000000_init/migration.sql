-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ScheduleFrequency" AS ENUM ('MANUAL', 'HOURLY', 'EVERY_3_HOURS', 'EVERY_6_HOURS', 'DAILY');

-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('FIXED', 'HOURLY', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ExperienceLevel" AS ENUM ('ENTRY', 'INTERMEDIATE', 'EXPERT', 'ANY');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('NEW', 'ANALYZED', 'SHORTLISTED', 'PROPOSAL_READY', 'SUBMITTED', 'ARCHIVED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "RecommendedAction" AS ENUM ('HIGH_PRIORITY', 'APPLY', 'WATCH', 'SKIP');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('GENERATED', 'NEEDS_REVIEW', 'APPROVED', 'REJECTED', 'SAVED_FOR_LATER', 'SUBMITTED', 'FAILED');

-- CreateEnum
CREATE TYPE "DemoComplexity" AS ENUM ('NONE', 'SMALL', 'MEDIUM', 'LARGE');

-- CreateEnum
CREATE TYPE "DemoStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'PLANNING', 'GENERATING', 'VALIDATING', 'REPO_CREATED', 'DEPLOYING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "DeploymentStatus" AS ENUM ('QUEUED', 'BUILDING', 'READY', 'ERROR', 'CANCELED');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'GENERATING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "AutomationRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'PARTIAL', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AutomationTrigger" AS ENUM ('SCHEDULED', 'MANUAL', 'BACKFILL');

-- CreateEnum
CREATE TYPE "RunLogLevel" AS ENUM ('DEBUG', 'INFO', 'WARN', 'ERROR');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('PROPOSALS_READY', 'AUTOMATION_FAILED', 'DEMO_READY', 'SUBMISSION_RESULT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'READ');

-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('UPWORK', 'CLAUDE', 'GITHUB', 'VERCEL', 'EMAIL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "passwordHash" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "emailVerified" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UpworkConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "upworkUserId" TEXT,
    "upworkOrgId" TEXT,
    "accessTokenCiphertext" TEXT NOT NULL,
    "refreshTokenCiphertext" TEXT,
    "scope" TEXT,
    "tokenType" TEXT NOT NULL DEFAULT 'Bearer',
    "expiresAt" TIMESTAMP(3),
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncedAt" TIMESTAMP(3),
    "lastRefreshedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "profileTitle" TEXT,
    "profileName" TEXT,
    "profilePictureUrl" TEXT,
    "countryCode" TEXT,
    "connectsBalance" INTEGER,
    "connectsUpdatedAt" TIMESTAMP(3),
    "rawProfile" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UpworkConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "label" TEXT,
    "secretCiphertext" TEXT NOT NULL,
    "metadata" JSONB,
    "lastVerifiedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "automationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "scheduleFrequency" "ScheduleFrequency" NOT NULL DEFAULT 'MANUAL',
    "maxJobsPerRun" INTEGER NOT NULL DEFAULT 100,
    "topJobsCount" INTEGER NOT NULL DEFAULT 10,
    "demoAutoThreshold" INTEGER NOT NULL DEFAULT 90,
    "demoSuggestThreshold" INTEGER NOT NULL DEFAULT 80,
    "proposalOnlyThreshold" INTEGER NOT NULL DEFAULT 70,
    "demoValueScoreMinimum" INTEGER NOT NULL DEFAULT 80,
    "maxDemosPerRun" INTEGER NOT NULL DEFAULT 3,
    "maxDemoPages" INTEGER NOT NULL DEFAULT 7,
    "maxDemoIterations" INTEGER NOT NULL DEFAULT 3,
    "maxBuildFixAttempts" INTEGER NOT NULL DEFAULT 3,
    "maxScreenshots" INTEGER NOT NULL DEFAULT 6,
    "generatePdf" BOOLEAN NOT NULL DEFAULT true,
    "demoGenerationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "weightSkillMatch" INTEGER NOT NULL DEFAULT 25,
    "weightClientQuality" INTEGER NOT NULL DEFAULT 15,
    "weightBudget" INTEGER NOT NULL DEFAULT 15,
    "weightCompetition" INTEGER NOT NULL DEFAULT 15,
    "weightWinProb" INTEGER NOT NULL DEFAULT 20,
    "weightRecency" INTEGER NOT NULL DEFAULT 10,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnProposalsReady" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnAutomationError" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnSubmission" BOOLEAN NOT NULL DEFAULT true,
    "digestOnly" BOOLEAN NOT NULL DEFAULT false,
    "proposalTone" TEXT NOT NULL DEFAULT 'direct, warm, technically specific',
    "proposalMaxWords" INTEGER NOT NULL DEFAULT 220,
    "includeQuestions" BOOLEAN NOT NULL DEFAULT true,
    "signatureName" TEXT,
    "portfolioUrl" TEXT,
    "companyName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "professionalTitle" TEXT,
    "yearsOfExperience" INTEGER,
    "hourlyRate" DECIMAL(10,2),
    "minimumBudget" DECIMAL(12,2),
    "preferredProjectSize" TEXT,
    "preferredTechnologies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "industries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "availability" TEXT,
    "preferredTone" TEXT,
    "proposalLength" TEXT NOT NULL DEFAULT 'SHORT',
    "countriesToAvoid" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobSearchProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "includeKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "excludeKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "categoryIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "minFixedBudget" DECIMAL(12,2),
    "minHourlyRate" DECIMAL(10,2),
    "maxHourlyRate" DECIMAL(10,2),
    "maxJobAgeHours" INTEGER DEFAULT 72,
    "minClientHireRate" INTEGER,
    "minClientSpend" DECIMAL(14,2),
    "paymentVerifiedOnly" BOOLEAN NOT NULL DEFAULT true,
    "minClientRating" DECIMAL(3,2),
    "maxProposals" INTEGER,
    "countries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "excludedCountries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "experienceLevels" "ExperienceLevel"[] DEFAULT ARRAY[]::"ExperienceLevel"[],
    "projectType" "ProjectType" NOT NULL DEFAULT 'UNKNOWN',
    "durations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "resultLimit" INTEGER NOT NULL DEFAULT 50,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobSearchProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "searchProfileId" TEXT,
    "upworkJobId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "category" TEXT,
    "subcategory" TEXT,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "projectType" "ProjectType" NOT NULL DEFAULT 'UNKNOWN',
    "experienceLevel" "ExperienceLevel" NOT NULL DEFAULT 'ANY',
    "budgetAmount" DECIMAL(12,2),
    "hourlyMin" DECIMAL(10,2),
    "hourlyMax" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "estimatedDuration" TEXT,
    "workload" TEXT,
    "connectsRequired" INTEGER,
    "clientCountry" TEXT,
    "clientCity" TEXT,
    "clientRating" DECIMAL(3,2),
    "clientHireRate" INTEGER,
    "clientTotalSpent" DECIMAL(14,2),
    "clientJobsPosted" INTEGER,
    "clientTotalHires" INTEGER,
    "clientOpenJobs" INTEGER,
    "clientPaymentVerified" BOOLEAN NOT NULL DEFAULT false,
    "clientMemberSince" TIMESTAMP(3),
    "proposalsCount" INTEGER,
    "proposalsRange" TEXT,
    "interviewCount" INTEGER,
    "invitesSent" INTEGER,
    "unansweredInvites" INTEGER,
    "postedAt" TIMESTAMP(3) NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "JobStatus" NOT NULL DEFAULT 'NEW',
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobAnalysis" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "skillMatch" INTEGER NOT NULL,
    "clientQuality" INTEGER NOT NULL,
    "competitionScore" INTEGER NOT NULL,
    "budgetScore" INTEGER NOT NULL,
    "winningProbability" INTEGER NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "rankedScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "recommendedAction" "RecommendedAction" NOT NULL,
    "reasoningSummary" TEXT NOT NULL,
    "strengths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "risks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "technicalOpportunity" TEXT,
    "demoRecommended" BOOLEAN NOT NULL DEFAULT false,
    "demoReason" TEXT,
    "demoComplexity" "DemoComplexity" NOT NULL DEFAULT 'NONE',
    "estimatedFiles" INTEGER,
    "demoRequirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "demoValueScore" INTEGER NOT NULL DEFAULT 0,
    "requirementsExtract" JSONB,
    "model" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "analysisVersion" TEXT NOT NULL DEFAULT '1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "status" "ProposalStatus" NOT NULL DEFAULT 'GENERATED',
    "content" TEXT NOT NULL,
    "editedContent" TEXT,
    "questions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bidAmount" DECIMAL(12,2),
    "bidHourlyRate" DECIMAL(10,2),
    "connectsRequired" INTEGER,
    "demoUrlIncluded" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "model" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "failureReason" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemoProject" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "proposalId" TEXT,
    "status" "DemoStatus" NOT NULL DEFAULT 'PENDING',
    "complexity" "DemoComplexity" NOT NULL DEFAULT 'SMALL',
    "templateKey" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "industry" TEXT,
    "plan" JSONB,
    "coverage" JSONB,
    "requirements" JSONB,
    "demoEmail" TEXT,
    "demoPassword" TEXT,
    "pageCount" INTEGER NOT NULL DEFAULT 0,
    "fileCount" INTEGER NOT NULL DEFAULT 0,
    "iterations" INTEGER NOT NULL DEFAULT 0,
    "buildAttempts" INTEGER NOT NULL DEFAULT 0,
    "githubRepoUrl" TEXT,
    "githubRepoName" TEXT,
    "githubOwner" TEXT,
    "vercelProjectId" TEXT,
    "liveUrl" TEXT,
    "buildStatus" TEXT,
    "buildLog" TEXT,
    "errorMessage" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemoProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deployment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "demoId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'vercel',
    "deploymentId" TEXT,
    "status" "DeploymentStatus" NOT NULL DEFAULT 'QUEUED',
    "url" TEXT,
    "inspectorUrl" TEXT,
    "target" TEXT NOT NULL DEFAULT 'production',
    "readyAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "logs" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deployment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemoScreenshot" (
    "id" TEXT NOT NULL,
    "demoId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "routePath" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "viewport" TEXT NOT NULL DEFAULT 'desktop',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemoScreenshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalDocument" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "filePath" TEXT,
    "pageCount" INTEGER,
    "content" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProposalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioProject" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "technologies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "url" TEXT,
    "githubUrl" TEXT,
    "clientIndustry" TEXT,
    "projectType" TEXT,
    "achievements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "highlighted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "AutomationRunStatus" NOT NULL DEFAULT 'QUEUED',
    "trigger" "AutomationTrigger" NOT NULL DEFAULT 'MANUAL',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "jobsFetched" INTEGER NOT NULL DEFAULT 0,
    "jobsNew" INTEGER NOT NULL DEFAULT 0,
    "jobsAnalyzed" INTEGER NOT NULL DEFAULT 0,
    "topJobsSelected" INTEGER NOT NULL DEFAULT 0,
    "proposalsGenerated" INTEGER NOT NULL DEFAULT 0,
    "demosAttempted" INTEGER NOT NULL DEFAULT 0,
    "demosGenerated" INTEGER NOT NULL DEFAULT 0,
    "documentsGenerated" INTEGER NOT NULL DEFAULT 0,
    "estimatedConnects" INTEGER NOT NULL DEFAULT 0,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "searchProfileIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationRunLog" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "level" "RunLogLevel" NOT NULL DEFAULT 'INFO',
    "step" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationRunLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationRunJob" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "selected" BOOLEAN NOT NULL DEFAULT false,
    "rank" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationRunJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationRunProposal" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationRunProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "connectsSpent" INTEGER,
    "connectsBefore" INTEGER,
    "connectsAfter" INTEGER,
    "upworkOfferId" TEXT,
    "upworkResponse" JSONB,
    "errorMessage" TEXT,
    "approvedByUserId" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "channel" TEXT NOT NULL DEFAULT 'email',
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "sentAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiUsageRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "operation" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "costUsd" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "durationMs" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "jobId" TEXT,
    "runId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT,
    "resourceId" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "statusCode" INTEGER,
    "ip" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "UpworkConnection_userId_key" ON "UpworkConnection"("userId");

-- CreateIndex
CREATE INDEX "UpworkConnection_isActive_idx" ON "UpworkConnection"("isActive");

-- CreateIndex
CREATE INDEX "IntegrationCredential_provider_idx" ON "IntegrationCredential"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationCredential_userId_provider_key" ON "IntegrationCredential"("userId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AiProfile_userId_key" ON "AiProfile"("userId");

-- CreateIndex
CREATE INDEX "JobSearchProfile_userId_isActive_idx" ON "JobSearchProfile"("userId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "JobSearchProfile_userId_name_key" ON "JobSearchProfile"("userId", "name");

-- CreateIndex
CREATE INDEX "Job_userId_status_idx" ON "Job"("userId", "status");

-- CreateIndex
CREATE INDEX "Job_userId_postedAt_idx" ON "Job"("userId", "postedAt");

-- CreateIndex
CREATE INDEX "Job_userId_fetchedAt_idx" ON "Job"("userId", "fetchedAt");

-- CreateIndex
CREATE INDEX "Job_searchProfileId_idx" ON "Job"("searchProfileId");

-- CreateIndex
CREATE INDEX "Job_upworkJobId_idx" ON "Job"("upworkJobId");

-- CreateIndex
CREATE UNIQUE INDEX "Job_userId_upworkJobId_key" ON "Job"("userId", "upworkJobId");

-- CreateIndex
CREATE UNIQUE INDEX "JobAnalysis_jobId_key" ON "JobAnalysis"("jobId");

-- CreateIndex
CREATE INDEX "JobAnalysis_userId_overallScore_idx" ON "JobAnalysis"("userId", "overallScore");

-- CreateIndex
CREATE INDEX "JobAnalysis_userId_recommendedAction_idx" ON "JobAnalysis"("userId", "recommendedAction");

-- CreateIndex
CREATE INDEX "JobAnalysis_userId_rankedScore_idx" ON "JobAnalysis"("userId", "rankedScore");

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_idempotencyKey_key" ON "Proposal"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Proposal_userId_status_idx" ON "Proposal"("userId", "status");

-- CreateIndex
CREATE INDEX "Proposal_jobId_idx" ON "Proposal"("jobId");

-- CreateIndex
CREATE INDEX "Proposal_userId_createdAt_idx" ON "Proposal"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DemoProject_proposalId_key" ON "DemoProject"("proposalId");

-- CreateIndex
CREATE INDEX "DemoProject_userId_status_idx" ON "DemoProject"("userId", "status");

-- CreateIndex
CREATE INDEX "DemoProject_jobId_idx" ON "DemoProject"("jobId");

-- CreateIndex
CREATE INDEX "Deployment_demoId_idx" ON "Deployment"("demoId");

-- CreateIndex
CREATE INDEX "Deployment_userId_status_idx" ON "Deployment"("userId", "status");

-- CreateIndex
CREATE INDEX "DemoScreenshot_demoId_order_idx" ON "DemoScreenshot"("demoId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "ProposalDocument_proposalId_key" ON "ProposalDocument"("proposalId");

-- CreateIndex
CREATE INDEX "PortfolioProject_userId_highlighted_idx" ON "PortfolioProject"("userId", "highlighted");

-- CreateIndex
CREATE INDEX "AutomationRun_userId_startedAt_idx" ON "AutomationRun"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "AutomationRun_status_idx" ON "AutomationRun"("status");

-- CreateIndex
CREATE INDEX "AutomationRunLog_runId_createdAt_idx" ON "AutomationRunLog"("runId", "createdAt");

-- CreateIndex
CREATE INDEX "AutomationRunJob_runId_selected_idx" ON "AutomationRunJob"("runId", "selected");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationRunJob_runId_jobId_key" ON "AutomationRunJob"("runId", "jobId");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationRunProposal_runId_proposalId_key" ON "AutomationRunProposal"("runId", "proposalId");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_idempotencyKey_key" ON "Submission"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Submission_userId_status_idx" ON "Submission"("userId", "status");

-- CreateIndex
CREATE INDEX "Submission_proposalId_idx" ON "Submission"("proposalId");

-- CreateIndex
CREATE INDEX "Notification_userId_status_idx" ON "Notification"("userId", "status");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AiUsageRecord_userId_createdAt_idx" ON "AiUsageRecord"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AiUsageRecord_operation_idx" ON "AiUsageRecord"("operation");

-- CreateIndex
CREATE INDEX "AiUsageRecord_createdAt_idx" ON "AiUsageRecord"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpworkConnection" ADD CONSTRAINT "UpworkConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationCredential" ADD CONSTRAINT "IntegrationCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiProfile" ADD CONSTRAINT "AiProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobSearchProfile" ADD CONSTRAINT "JobSearchProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_searchProfileId_fkey" FOREIGN KEY ("searchProfileId") REFERENCES "JobSearchProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobAnalysis" ADD CONSTRAINT "JobAnalysis_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobAnalysis" ADD CONSTRAINT "JobAnalysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemoProject" ADD CONSTRAINT "DemoProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemoProject" ADD CONSTRAINT "DemoProject_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemoProject" ADD CONSTRAINT "DemoProject_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_demoId_fkey" FOREIGN KEY ("demoId") REFERENCES "DemoProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemoScreenshot" ADD CONSTRAINT "DemoScreenshot_demoId_fkey" FOREIGN KEY ("demoId") REFERENCES "DemoProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalDocument" ADD CONSTRAINT "ProposalDocument_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioProject" ADD CONSTRAINT "PortfolioProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRun" ADD CONSTRAINT "AutomationRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRunLog" ADD CONSTRAINT "AutomationRunLog_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AutomationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRunJob" ADD CONSTRAINT "AutomationRunJob_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AutomationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRunJob" ADD CONSTRAINT "AutomationRunJob_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRunProposal" ADD CONSTRAINT "AutomationRunProposal_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AutomationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRunProposal" ADD CONSTRAINT "AutomationRunProposal_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsageRecord" ADD CONSTRAINT "AiUsageRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

