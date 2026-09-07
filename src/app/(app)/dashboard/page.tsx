import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRightIcon,
  BriefcaseIcon,
  CheckCircle2Icon,
  CoinsIcon,
  FileTextIcon,
  MonitorPlayIcon,
  SparklesIcon,
  TrendingUpIcon,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { ScoreBadge } from "@/components/shared/score-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AreaTrend } from "@/components/charts/area-trend";
import { RunAutomationButton } from "@/components/automation/run-button";
import { requireSessionUser } from "@/lib/session";
import { getDailySeries, getDashboardStats } from "@/features/analytics/queries";
import { getTopMatches } from "@/features/jobs/queries";
import { getLatestRun } from "@/features/automation/queries";
import { formatCompactCurrency, formatNumber, formatRelativeTime } from "@/lib/format";
import { decimalToNumber } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

const ACTION_TONE = {
  HIGH_PRIORITY: "success",
  APPLY: "default",
  WATCH: "warning",
  SKIP: "muted",
} as const;

export default async function DashboardPage() {
  const user = await requireSessionUser();

  const [stats, series, topMatches, latestRun] = await Promise.all([
    getDashboardStats(user.id),
    getDailySeries(user.id, 30),
    getTopMatches(user.id, 5),
    getLatestRun(user.id),
  ]);

  const hasActivity = stats.jobsMatched > 0 || stats.proposalsPrepared > 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome back${user.name ? `, ${user.name.split(" ")[0]}` : ""}`}
        description={
          latestRun
            ? `Last run ${formatRelativeTime(latestRun.startedAt)} · ${latestRun.jobsAnalyzed} jobs analyzed, ${latestRun.proposalsGenerated} proposals prepared.`
            : "No automation runs yet. Set up a search profile and start your first run."
        }
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/proposals">
                Review proposals
                {stats.pendingReview > 0 ? (
                  <Badge variant="secondary" className="ml-1">
                    {stats.pendingReview}
                  </Badge>
                ) : null}
              </Link>
            </Button>
            <RunAutomationButton />
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Jobs scanned today"
          value={formatNumber(stats.jobsScannedToday)}
          icon={BriefcaseIcon}
          hint="Across all active search profiles"
        />
        <StatCard
          label="Jobs matched"
          value={formatNumber(stats.jobsMatched)}
          icon={SparklesIcon}
          accent="primary"
          hint={`${stats.highPriorityJobs} marked high priority`}
        />
        <StatCard
          label="Proposals prepared"
          value={formatNumber(stats.proposalsPrepared)}
          icon={FileTextIcon}
          accent="primary"
          hint={`${stats.pendingReview} waiting for your review`}
        />
        <StatCard
          label="Proposals submitted"
          value={formatNumber(stats.proposalsSubmitted)}
          icon={CheckCircle2Icon}
          accent="success"
          hint="Only after your explicit approval"
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Connects used" value={formatNumber(stats.connectsUsed)} icon={CoinsIcon} />
        <StatCard
          label="Connects saved"
          value={formatNumber(stats.connectsSaved)}
          icon={CoinsIcon}
          accent="success"
          hint="Not spent on jobs scored SKIP"
        />
        <StatCard
          label="Average opportunity score"
          value={stats.averageScore}
          icon={TrendingUpIcon}
          hint="Across every analyzed job"
        />
        <StatCard
          label="Demos ready"
          value={formatNumber(stats.demosReady)}
          icon={MonitorPlayIcon}
          accent="primary"
          hint="Deployed and verified"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Discovery and submission trend</CardTitle>
            <CardDescription>Jobs discovered and proposals submitted over the last 30 days.</CardDescription>
          </CardHeader>
          <CardContent>
            {hasActivity ? (
              <AreaTrend
                data={series}
                series={[
                  { key: "jobsDiscovered", label: "Jobs discovered", color: "var(--color-chart-1)" },
                  { key: "proposalsSubmitted", label: "Proposals submitted", color: "var(--color-chart-3)" },
                ]}
              />
            ) : (
              <EmptyState
                icon={BriefcaseIcon}
                title="No data yet"
                description="Run the automation once and this chart will fill in."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Interview and win rate</CardTitle>
            <CardDescription>Recorded from Upwork submission responses.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Interviews</p>
                <p className="text-2xl font-semibold tabular-nums">{formatNumber(stats.interviews)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Hires</p>
                <p className="text-2xl font-semibold tabular-nums">{formatNumber(stats.hires)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Win rate</p>
                <p className="text-2xl font-semibold tabular-nums">{stats.winRate}%</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Pending review</p>
                <p className="text-2xl font-semibold tabular-nums">{formatNumber(stats.pendingReview)}</p>
              </div>
            </div>
            <p className="text-muted-foreground border-t pt-4 text-xs leading-relaxed">
              Interview and hire counts populate from what the official Upwork API reports back on your submissions.
              They are never estimated.
            </p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle>Top matches</CardTitle>
            <CardDescription>Your strongest current opportunities, ranked.</CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/top-matches">
              View all
              <ArrowRightIcon className="size-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {topMatches.length === 0 ? (
            <EmptyState
              icon={SparklesIcon}
              title="No shortlisted opportunities yet"
              description="Create a job search profile, then run the automation to populate your shortlist."
              action={
                <Button asChild size="sm">
                  <Link href="/settings/job-preferences">Set up job preferences</Link>
                </Button>
              }
            />
          ) : (
            <ul className="divide-y">
              {topMatches.map((job) => (
                <li key={job.id} className="flex flex-wrap items-center gap-4 py-3.5 first:pt-0 last:pb-0">
                  <ScoreBadge score={job.analysis?.overallScore ?? null} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/jobs/${job.id}`} className="line-clamp-1 font-medium hover:underline">
                      {job.title}
                    </Link>
                    <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">
                      {job.clientCountry ?? "Unknown location"} ·{" "}
                      {job.projectType === "HOURLY"
                        ? `$${decimalToNumber(job.hourlyMin) ?? "?"}–$${decimalToNumber(job.hourlyMax) ?? "?"}/hr`
                        : formatCompactCurrency(decimalToNumber(job.budgetAmount))}{" "}
                      · {job.proposalsCount ?? job.proposalsRange ?? "?"} proposals ·{" "}
                      {job.analysis?.winningProbability ?? "?"}% win probability
                    </p>
                  </div>
                  {job.analysis ? (
                    <Badge variant={ACTION_TONE[job.analysis.recommendedAction]}>
                      {job.analysis.recommendedAction.replace("_", " ")}
                    </Badge>
                  ) : null}
                  {job.demos[0]?.status === "READY" ? <Badge variant="outline">Demo live</Badge> : null}
                  {job.proposals[0] ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/proposals/${job.proposals[0].id}`}>Review</Link>
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
