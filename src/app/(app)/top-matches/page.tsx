import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLinkIcon, MonitorPlayIcon, SparklesIcon } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ScoreRing } from "@/components/shared/score-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RunAutomationButton } from "@/components/automation/run-button";
import { requireSessionUser } from "@/lib/session";
import { getTopMatches } from "@/features/jobs/queries";
import { getOrCreatePreferences } from "@/features/pipeline/context";
import { decimalToNumber, formatCompactCurrency, formatRelativeTime } from "@/lib/format";

export const metadata: Metadata = { title: "Top matches" };
export const dynamic = "force-dynamic";

const ACTION_TONE = {
  HIGH_PRIORITY: "success",
  APPLY: "default",
  WATCH: "warning",
  SKIP: "muted",
} as const;

export default async function TopMatchesPage() {
  const user = await requireSessionUser();
  const preference = await getOrCreatePreferences(user.id);
  const matches = await getTopMatches(user.id, preference.topJobsCount);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Top matches"
        description={`Your ${preference.topJobsCount} strongest opportunities, ranked by weighted score rather than proposal count alone.`}
        actions={<RunAutomationButton variant="outline" label="Refresh matches" />}
      />

      {matches.length === 0 ? (
        <EmptyState
          icon={SparklesIcon}
          title="Nothing shortlisted yet"
          description="Run the automation to discover, score and rank jobs. The strongest opportunities land here."
          action={<RunAutomationButton size="sm" />}
        />
      ) : (
        <div className="grid gap-4">
          {matches.map((job, index) => {
            const analysis = job.analysis;
            const demo = job.demos[0];
            const proposal = job.proposals[0];

            return (
              <Card key={job.id}>
                <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-start">
                  <div className="flex flex-row items-center gap-4 sm:flex-col sm:gap-2">
                    <span className="text-muted-foreground text-xs font-semibold">#{index + 1}</span>
                    <ScoreRing score={analysis?.overallScore ?? 0} size={64} />
                  </div>

                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="space-y-1">
                      <Link href={`/jobs/${job.id}`} className="text-base font-semibold hover:underline">
                        {job.title}
                      </Link>
                      <p className="text-muted-foreground text-xs">
                        {job.clientCountry ?? "Unknown"} ·{" "}
                        {job.projectType === "HOURLY"
                          ? `$${decimalToNumber(job.hourlyMin) ?? "?"}–$${decimalToNumber(job.hourlyMax) ?? "?"}/hr`
                          : formatCompactCurrency(decimalToNumber(job.budgetAmount))}{" "}
                        · {job.clientHireRate !== null ? `${job.clientHireRate}% hire rate` : "hire rate unknown"} ·{" "}
                        {formatCompactCurrency(decimalToNumber(job.clientTotalSpent))} spent · posted{" "}
                        {formatRelativeTime(job.postedAt)}
                      </p>
                    </div>

                    {analysis ? (
                      <p className="text-muted-foreground line-clamp-2 text-sm">{analysis.reasoningSummary}</p>
                    ) : null}

                    <div className="flex flex-wrap items-center gap-2">
                      {analysis ? (
                        <Badge variant={ACTION_TONE[analysis.recommendedAction]}>
                          {analysis.recommendedAction.replace("_", " ")}
                        </Badge>
                      ) : null}
                      {analysis ? (
                        <Badge variant="outline">{analysis.winningProbability}% win probability</Badge>
                      ) : null}
                      <Badge variant="muted">{job.proposalsCount ?? job.proposalsRange ?? "?"} proposals</Badge>
                      <Badge variant="muted">{job.connectsRequired ?? "?"} Connects</Badge>
                      {demo?.status === "READY" ? (
                        <Badge variant="success">
                          <MonitorPlayIcon className="size-3" />
                          Demo live
                        </Badge>
                      ) : analysis?.demoRecommended ? (
                        <Badge variant="warning">Demo recommended</Badge>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button asChild size="sm" variant="ghost">
                      <a href={job.url} target="_blank" rel="noreferrer noopener">
                        <ExternalLinkIcon className="size-3.5" />
                        Upwork
                      </a>
                    </Button>
                    {proposal ? (
                      <Button asChild size="sm">
                        <Link href={`/proposals/${proposal.id}`}>Review proposal</Link>
                      </Button>
                    ) : (
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/jobs/${job.id}`}>View job</Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
