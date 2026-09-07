import "server-only";
import type { Prisma, ProposalStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface ProposalListFilters {
  status?: ProposalStatus;
  page?: number;
  pageSize?: number;
  search?: string;
}

const proposalInclude = {
  job: {
    include: {
      analysis: true,
    },
  },
  demo: {
    include: { screenshots: { orderBy: { order: "asc" } }, deployments: { orderBy: { createdAt: "desc" } } },
  },
  document: true,
  submissions: { orderBy: { createdAt: "desc" } },
} satisfies Prisma.ProposalInclude;

export type ProposalWithRelations = Prisma.ProposalGetPayload<{ include: typeof proposalInclude }>;

export async function listProposals(userId: string, filters: ProposalListFilters = {}) {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;

  const where: Prisma.ProposalWhereInput = { userId };
  if (filters.status) where.status = filters.status;
  if (filters.search) {
    where.job = { is: { title: { contains: filters.search, mode: "insensitive" } } };
  }

  const [total, items] = await Promise.all([
    prisma.proposal.count({ where }),
    prisma.proposal.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: proposalInclude,
    }),
  ]);

  return { total, page, pageSize, items };
}

export async function getProposal(userId: string, proposalId: string): Promise<ProposalWithRelations | null> {
  return prisma.proposal.findFirst({ where: { id: proposalId, userId }, include: proposalInclude });
}

export async function countPendingReview(userId: string): Promise<number> {
  return prisma.proposal.count({
    where: { userId, status: { in: ["GENERATED", "NEEDS_REVIEW", "SAVED_FOR_LATER"] } },
  });
}

/**
 * Requirement coverage summary for the review dashboard, making clear how much
 * of the client's scope the lightweight demo actually represents.
 */
export function summariseCoverage(proposal: ProposalWithRelations): {
  clientRequirements: number;
  representedInDemo: number;
  productionScope: number;
} {
  const extract = proposal.job.analysis?.requirementsExtract as
    | { requestedFeatures?: string[]; demoFeatures?: string[] }
    | null
    | undefined;

  const coverage = (proposal.demo?.coverage ?? []) as { requirement: string }[] | null;

  const clientRequirements = extract?.requestedFeatures?.length ?? 0;
  const representedInDemo = coverage?.length ?? extract?.demoFeatures?.length ?? 0;

  return {
    clientRequirements,
    representedInDemo,
    productionScope: clientRequirements,
  };
}
