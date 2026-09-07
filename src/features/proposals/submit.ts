import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { AppError, ConflictError, ForbiddenError, NotFoundError, toErrorMessage } from "@/lib/errors";
import { recordAudit } from "@/lib/audit";
import { decimalToNumber } from "@/lib/format";
import { getUpworkProvider } from "@/services/upwork";
import { sendNotificationEmail, submissionResultEmail } from "@/services/email";
import { getOrCreatePreferences } from "@/features/pipeline/context";

export interface SubmitResult {
  status: "SUCCESS" | "FAILED";
  submissionId: string;
  offerId: string | null;
  connectsSpent: number | null;
  connectsRemaining: number | null;
  message?: string;
  /** True when the official API cannot submit; the manual workflow applies. */
  manualSubmissionRequired?: boolean;
}

export interface ConnectsPreview {
  connectsRequired: number | null;
  connectsAvailable: number | null;
  connectsRemaining: number | null;
  canSubmitViaApi: boolean;
  providerNotes: string;
  jobTitle: string;
  jobUrl: string;
}

/** Data for the pre-submission confirmation dialog. Never spends Connects. */
export async function getConnectsPreview(userId: string, proposalId: string): Promise<ConnectsPreview> {
  const proposal = await prisma.proposal.findFirst({
    where: { id: proposalId, userId },
    include: { job: true },
  });

  if (!proposal) throw new NotFoundError("Proposal not found.");

  const provider = await getUpworkProvider(userId);
  const capabilities = provider.capabilities();

  const connection = await prisma.upworkConnection.findUnique({ where: { userId } });
  let connectsAvailable = connection?.connectsBalance ?? null;

  if (capabilities.canReadConnects) {
    const live = await provider.getConnectsBalance().catch(() => null);
    if (live !== null) {
      connectsAvailable = live;
      if (connection) {
        await prisma.upworkConnection.update({
          where: { userId },
          data: { connectsBalance: live, connectsUpdatedAt: new Date() },
        });
      }
    }
  }

  const connectsRequired = proposal.connectsRequired ?? proposal.job.connectsRequired ?? null;

  return {
    connectsRequired,
    connectsAvailable,
    connectsRemaining:
      connectsAvailable !== null && connectsRequired !== null ? connectsAvailable - connectsRequired : null,
    canSubmitViaApi: capabilities.canSubmitProposals,
    providerNotes: capabilities.notes,
    jobTitle: proposal.job.title,
    jobUrl: proposal.job.url,
  };
}

/**
 * Submits an approved proposal through the official Upwork API.
 *
 * This is the only place in the system that can spend Connects, and it is only
 * ever reached from an explicit, confirmed user action. Submission is
 * idempotent: the proposal's stable key is the Submission primary key, so a
 * double click or a retried request can never produce two submissions.
 */
export async function submitProposal(
  userId: string,
  proposalId: string,
  context: { ip?: string | null; userAgent?: string | null } = {},
): Promise<SubmitResult> {
  const proposal = await prisma.proposal.findFirst({
    where: { id: proposalId, userId },
    include: { job: true, demo: true },
  });

  if (!proposal) throw new NotFoundError("Proposal not found.");
  if (proposal.status === "SUBMITTED") {
    throw new ConflictError("This proposal has already been submitted.");
  }
  if (proposal.status === "REJECTED") {
    throw new ForbiddenError("A rejected proposal cannot be submitted. Regenerate it first.");
  }

  const existingSuccess = await prisma.submission.findFirst({
    where: { proposalId: proposal.id, status: "SUCCESS" },
  });
  if (existingSuccess) {
    throw new ConflictError("This proposal has already been submitted.");
  }

  const provider = await getUpworkProvider(userId);
  const capabilities = provider.capabilities();

  const connection = await prisma.upworkConnection.findUnique({ where: { userId } });
  const connectsBefore = capabilities.canReadConnects
    ? await provider.getConnectsBalance().catch(() => connection?.connectsBalance ?? null)
    : (connection?.connectsBalance ?? null);

  // The unique idempotency key makes a duplicate submission impossible even
  // under concurrent requests.
  let submission;
  try {
    submission = await prisma.submission.create({
      data: {
        userId,
        proposalId: proposal.id,
        jobId: proposal.jobId,
        status: "PENDING",
        idempotencyKey: proposal.idempotencyKey,
        connectsBefore,
        approvedByUserId: userId,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ConflictError("A submission for this proposal is already in progress.");
    }
    throw error;
  }

  if (!capabilities.canSubmitProposals) {
    const message = capabilities.notes;
    await prisma.submission.update({
      where: { id: submission.id },
      data: { status: "FAILED", errorMessage: message },
    });
    await prisma.proposal.update({
      where: { id: proposal.id },
      data: { status: "APPROVED", approvedAt: new Date(), failureReason: message },
    });
    await recordAudit({
      userId,
      action: "proposal.submit.unsupported",
      resource: "proposal",
      resourceId: proposal.id,
      success: false,
      ip: context.ip,
      userAgent: context.userAgent,
    });

    return {
      status: "FAILED",
      submissionId: submission.id,
      offerId: null,
      connectsSpent: null,
      connectsRemaining: connectsBefore,
      message,
      manualSubmissionRequired: true,
    };
  }

  const content = proposal.editedContent ?? proposal.content;

  const result = await provider
    .submitProposal({
      upworkJobId: proposal.job.upworkJobId,
      coverLetter: content,
      bidAmount: decimalToNumber(proposal.bidAmount),
      hourlyRate: decimalToNumber(proposal.bidHourlyRate),
      estimatedDurationLabel: proposal.job.estimatedDuration,
      idempotencyKey: proposal.idempotencyKey,
    })
    .catch((error) => ({
      ok: false as const,
      offerId: null,
      connectsSpent: null,
      raw: null,
      errorMessage: toErrorMessage(error),
      unsupported: false,
    }));

  const connectsAfter = capabilities.canReadConnects
    ? await provider.getConnectsBalance().catch(() => null)
    : null;

  const connectsSpent =
    result.connectsSpent ??
    (connectsBefore !== null && connectsAfter !== null ? connectsBefore - connectsAfter : null);

  if (result.ok) {
    await prisma.$transaction([
      prisma.submission.update({
        where: { id: submission.id },
        data: {
          status: "SUCCESS",
          upworkOfferId: result.offerId,
          upworkResponse: (result.raw ?? {}) as never,
          interviewing: readOutcomeFlag(result.raw, "interviewing"),
          hired: readOutcomeFlag(result.raw, "hired"),
          connectsSpent,
          connectsAfter,
          submittedAt: new Date(),
        },
      }),
      prisma.proposal.update({
        where: { id: proposal.id },
        data: {
          status: "SUBMITTED",
          approvedAt: proposal.approvedAt ?? new Date(),
          submittedAt: new Date(),
          failureReason: null,
        },
      }),
      prisma.job.update({ where: { id: proposal.jobId }, data: { status: "SUBMITTED" } }),
    ]);

    if (connectsAfter !== null && connection) {
      await prisma.upworkConnection.update({
        where: { userId },
        data: { connectsBalance: connectsAfter, connectsUpdatedAt: new Date() },
      });
    }
  } else {
    await prisma.$transaction([
      prisma.submission.update({
        where: { id: submission.id },
        data: {
          status: "FAILED",
          errorMessage: (result.errorMessage ?? "Submission failed").slice(0, 2_000),
          connectsAfter,
        },
      }),
      prisma.proposal.update({
        where: { id: proposal.id },
        data: {
          status: "FAILED",
          failureReason: (result.errorMessage ?? "Submission failed").slice(0, 2_000),
        },
      }),
    ]);
  }

  await recordAudit({
    userId,
    action: result.ok ? "proposal.submit.success" : "proposal.submit.failed",
    resource: "proposal",
    resourceId: proposal.id,
    success: result.ok,
    ip: context.ip,
    userAgent: context.userAgent,
    metadata: { connectsSpent, provider: provider.name },
  });

  const preference = await getOrCreatePreferences(userId);
  if (preference.emailNotifications && preference.notifyOnSubmission) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
    const email = submissionResultEmail({
      jobTitle: proposal.job.title,
      success: result.ok,
      connectsSpent,
      error: result.errorMessage,
    });
    await sendNotificationEmail({
      userId,
      to: user.email,
      type: "SUBMISSION_RESULT",
      subject: email.subject,
      html: email.html,
      text: email.text,
      data: { proposalId: proposal.id, success: result.ok },
    }).catch(() => undefined);
  }

  logger.info(
    { userId, proposalId: proposal.id, success: result.ok, connectsSpent },
    "Proposal submission completed",
  );

  if (!result.ok) {
    return {
      status: "FAILED",
      submissionId: submission.id,
      offerId: null,
      connectsSpent: null,
      connectsRemaining: connectsAfter ?? connectsBefore,
      message: result.errorMessage ?? "Submission failed",
      manualSubmissionRequired: Boolean(result.unsupported),
    };
  }

  return {
    status: "SUCCESS",
    submissionId: submission.id,
    offerId: result.offerId,
    connectsSpent,
    connectsRemaining: connectsAfter,
  };
}

/** Guard used by API routes before any state-changing proposal action. */
export async function assertProposalOwnership(userId: string, proposalId: string): Promise<void> {
  const found = await prisma.proposal.findFirst({ where: { id: proposalId, userId }, select: { id: true } });
  if (!found) throw new NotFoundError("Proposal not found.");
}

/** Reads a boolean outcome flag out of the Upwork response, if it reports one. */
function readOutcomeFlag(raw: unknown, key: "interviewing" | "hired"): boolean {
  if (!raw || typeof raw !== "object") return false;
  const value = (raw as Record<string, unknown>)[key];
  return value === true;
}

export class SubmissionBlockedError extends AppError {
  constructor(message: string) {
    super(message, { statusCode: 409, code: "SUBMISSION_BLOCKED" });
  }
}
