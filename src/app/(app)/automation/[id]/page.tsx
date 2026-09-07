import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { ScoreBadge } from "@/components/shared/score-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { requireSessionUser } from "@/lib/session";
import { getAutomationRun } from "@/features/automation/queries";
import { formatDateTime, formatDuration, formatNumber } from "@/lib/format";

export const metadata: Metadata = { title: "Run detail" };
export const dynamic = "force-dynamic";

const LEVEL_TONE: Record<string, "muted" | "secondary" | "warning" | "destructive"> = {
  DEBUG: "muted",
  INFO: "secondary",
  WARN: "warning",
  ERROR: "destructive",
};

export default async function AutomationRunPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireSessionUser();
  const { id } = await params;
  const run = await getAutomationRun(user.id, id);

  if (!run) notFound();

  const duration = run.finishedAt ? run.finishedAt.getTime() - run.startedAt.getTime() : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Run ${run.id.slice(-8)}`}
        description={`${run.trigger.toLowerCase()} run started ${formatDateTime(run.startedAt)}${
          run.finishedAt ? ` · finished ${formatDateTime(run.finishedAt)}` : " · still running"
        }`}
        actions={<Badge className="h-8 px-3">{run.status}</Badge>}
      />

      {run.errorMessage ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-4">
            <p className="text-destructive text-sm font-medium">Run failed</p>
            <p className="text-muted-foreground mt-1 text-sm">{run.errorMessage}</p>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Jobs fetched" value={formatNumber(run.jobsFetched)} hint={`${run.jobsNew} new`} />
        <StatCard label="Jobs analyzed" value={formatNumber(run.jobsAnalyzed)} />
        <StatCard label="Top jobs selected" value={formatNumber(run.topJobsSelected)} />
        <StatCard label="Proposals generated" value={formatNumber(run.proposalsGenerated)} accent="primary" />
        <StatCard
          label="Demos generated"
          value={`${run.demosGenerated}/${run.demosAttempted}`}
          hint="Built vs attempted"
        />
        <StatCard label="Briefs generated" value={formatNumber(run.documentsGenerated)} />
        <StatCard label="Estimated Connects" value={formatNumber(run.estimatedConnects)} hint="If all are approved" />
        <StatCard
          label="Tokens used"
          value={formatNumber(run.inputTokens + run.outputTokens)}
          hint={`${formatNumber(run.inputTokens)} in / ${formatNumber(run.outputTokens)} out`}
        />
      </section>

      {duration !== null ? (
        <p className="text-muted-foreground text-sm">Total duration: {formatDuration(duration)}</p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Detailed log</CardTitle>
            <CardDescription>Every step this run took, in order.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[520px] pr-3">
              <ul className="space-y-2.5">
                {run.logs.map((log) => (
                  <li key={log.id} className="flex gap-3 text-sm">
                    <span className="text-muted-foreground w-16 shrink-0 text-xs tabular-nums">
                      {log.createdAt.toLocaleTimeString("en-US", { hour12: false })}
                    </span>
                    <Badge variant={LEVEL_TONE[log.level] ?? "muted"} className="h-5 shrink-0 text-[10px]">
                      {log.step}
                    </Badge>
                    <span className={log.level === "ERROR" ? "text-destructive" : "text-muted-foreground"}>
                      {log.message}
                    </span>
                  </li>
                ))}
                {run.logs.length === 0 ? (
                  <li className="text-muted-foreground text-sm">No log entries recorded.</li>
                ) : null}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Selected opportunities</CardTitle>
              <CardDescription>Jobs this run shortlisted, in rank order.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {run.runJobs
                  .filter((entry) => entry.selected)
                  .map((entry) => (
                    <li key={entry.id} className="flex items-center gap-3">
                      <span className="text-muted-foreground w-6 text-xs tabular-nums">#{entry.rank ?? "—"}</span>
                      <ScoreBadge score={entry.job.analysis?.overallScore ?? null} />
                      <Link href={`/jobs/${entry.job.id}`} className="line-clamp-1 flex-1 text-sm hover:underline">
                        {entry.job.title}
                      </Link>
                    </li>
                  ))}
                {run.runJobs.filter((entry) => entry.selected).length === 0 ? (
                  <li className="text-muted-foreground text-sm">No jobs were shortlisted in this run.</li>
                ) : null}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Proposals prepared</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {run.proposals.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-3">
                    <Link
                      href={`/proposals/${entry.proposal.id}`}
                      className="line-clamp-1 text-sm hover:underline"
                    >
                      {entry.proposal.job.title}
                    </Link>
                    <Badge variant="muted" className="shrink-0 text-[10px]">
                      {entry.proposal.status.replace(/_/g, " ")}
                    </Badge>
                  </li>
                ))}
                {run.proposals.length === 0 ? (
                  <li className="text-muted-foreground text-sm">No proposals were prepared in this run.</li>
                ) : null}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
