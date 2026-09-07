import type { Metadata } from "next";
import Link from "next/link";
import { FileTextIcon, MonitorPlayIcon } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ScoreRing } from "@/components/shared/score-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RunAutomationButton } from "@/components/automation/run-button";
import { requireSessionUser } from "@/lib/session";
import { listProposals } from "@/features/proposals/queries";
import { decimalToNumber, formatCompactCurrency, formatRelativeTime, truncate } from "@/lib/format";
import type { ProposalStatus } from "@prisma/client";

export const metadata: Metadata = { title: "Proposals" };
export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "default" | "success" | "warning" | "destructive" | "muted" | "secondary"> = {
  GENERATED: "secondary",
  NEEDS_REVIEW: "default",
  APPROVED: "warning",
  SAVED_FOR_LATER: "muted",
  REJECTED: "muted",
  SUBMITTED: "success",
  FAILED: "destructive",
};

const TABS: { value: string; label: string; status?: ProposalStatus }[] = [
  { value: "all", label: "All" },
  { value: "NEEDS_REVIEW", label: "Pending review", status: "NEEDS_REVIEW" },
  { value: "SAVED_FOR_LATER", label: "Saved", status: "SAVED_FOR_LATER" },
  { value: "SUBMITTED", label: "Submitted", status: "SUBMITTED" },
  { value: "FAILED", label: "Failed", status: "FAILED" },
];

export default async function ProposalsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const user = await requireSessionUser();
  const params = await searchParams;

  const tab = TABS.find((entry) => entry.value === params.status) ?? TABS[0]!;
  const page = Number(params.page ?? 1);

  const result = await listProposals(user.id, { status: tab.status, page, pageSize: 20 });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Proposal review"
        description="Nothing here has been sent. Review each proposal and approve it to submit through the official Upwork API."
        actions={<RunAutomationButton variant="outline" label="Prepare more" />}
      />

      <Tabs value={tab.value}>
        <TabsList>
          {TABS.map((entry) => (
            <TabsTrigger key={entry.value} value={entry.value} asChild>
              <Link href={entry.value === "all" ? "/proposals" : `/proposals?status=${entry.value}`}>
                {entry.label}
              </Link>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {result.items.length === 0 ? (
        <EmptyState
          icon={FileTextIcon}
          title="No proposals here yet"
          description="Run the automation to analyze jobs and prepare proposals for the strongest opportunities."
          action={<RunAutomationButton size="sm" />}
        />
      ) : (
        <div className="grid gap-4">
          {result.items.map((proposal) => {
            const job = proposal.job;
            const analysis = job.analysis;
            const demoReady = proposal.demo?.status === "READY";

            return (
              <Card key={proposal.id}>
                <CardContent className="flex flex-col gap-5 lg:flex-row">
                  <div className="flex items-start gap-4">
                    <ScoreRing score={analysis?.overallScore ?? 0} size={62} />
                  </div>

                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <Link href={`/proposals/${proposal.id}`} className="font-semibold hover:underline">
                          {job.title}
                        </Link>
                        <p className="text-muted-foreground text-xs">
                          {job.clientCountry ?? "Unknown"} ·{" "}
                          {job.projectType === "HOURLY"
                            ? `$${decimalToNumber(job.hourlyMin) ?? "?"}–$${decimalToNumber(job.hourlyMax) ?? "?"}/hr`
                            : formatCompactCurrency(decimalToNumber(job.budgetAmount))}{" "}
                          · {job.clientHireRate !== null ? `${job.clientHireRate}% hire rate` : "hire rate unknown"} ·{" "}
                          {formatCompactCurrency(decimalToNumber(job.clientTotalSpent))} spent ·{" "}
                          {job.proposalsCount ?? job.proposalsRange ?? "?"} proposals · prepared{" "}
                          {formatRelativeTime(proposal.createdAt)}
                        </p>
                      </div>
                      <Badge variant={STATUS_TONE[proposal.status] ?? "muted"}>
                        {proposal.status.replace(/_/g, " ")}
                      </Badge>
                    </div>

                    <p className="text-muted-foreground line-clamp-2 text-sm">
                      {truncate(proposal.editedContent ?? proposal.content, 240)}
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      {analysis ? (
                        <Badge variant="outline">{analysis.winningProbability}% win probability</Badge>
                      ) : null}
                      <Badge variant="muted">{proposal.connectsRequired ?? job.connectsRequired ?? "?"} Connects</Badge>
                      {demoReady ? (
                        <Badge variant="success">
                          <MonitorPlayIcon className="size-3" />
                          Demo live
                        </Badge>
                      ) : proposal.demo ? (
                        <Badge variant="warning">Demo {proposal.demo.status.toLowerCase()}</Badge>
                      ) : null}
                      {proposal.document?.status === "READY" ? <Badge variant="outline">Brief PDF</Badge> : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-start">
                    <Button asChild size="sm">
                      <Link href={`/proposals/${proposal.id}`}>Review</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {result.total > result.pageSize ? (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {result.page} of {Math.ceil(result.total / result.pageSize)}
          </span>
          <div className="flex gap-2">
            {result.page > 1 ? (
              <Button asChild variant="outline" size="sm">
                <Link
                  href={`/proposals?${new URLSearchParams({
                    ...(tab.status ? { status: tab.value } : {}),
                    page: String(result.page - 1),
                  })}`}
                >
                  Previous
                </Link>
              </Button>
            ) : null}
            {result.page * result.pageSize < result.total ? (
              <Button asChild variant="outline" size="sm">
                <Link
                  href={`/proposals?${new URLSearchParams({
                    ...(tab.status ? { status: tab.value } : {}),
                    page: String(result.page + 1),
                  })}`}
                >
                  Next
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
