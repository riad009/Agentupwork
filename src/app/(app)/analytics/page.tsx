import type { Metadata } from "next";
import { BarChart3Icon } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaTrend } from "@/components/charts/area-trend";
import { BarBreakdown } from "@/components/charts/bar-breakdown";
import { requireSessionUser } from "@/lib/session";
import {
  getActionBreakdown,
  getDailySeries,
  getDashboardStats,
  getProposalFunnel,
} from "@/features/analytics/queries";
import { formatNumber } from "@/lib/format";

export const metadata: Metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

const ACTION_LABEL: Record<string, string> = {
  HIGH_PRIORITY: "High priority",
  APPLY: "Apply",
  WATCH: "Watch",
  SKIP: "Skip",
};

const STATUS_LABEL: Record<string, string> = {
  GENERATED: "Generated",
  NEEDS_REVIEW: "Pending",
  APPROVED: "Approved",
  SAVED_FOR_LATER: "Saved",
  REJECTED: "Rejected",
  SUBMITTED: "Submitted",
  FAILED: "Failed",
};

export default async function AnalyticsPage() {
  const user = await requireSessionUser();

  const [stats, series, actions, funnel] = await Promise.all([
    getDashboardStats(user.id),
    getDailySeries(user.id, 60),
    getActionBreakdown(user.id),
    getProposalFunnel(user.id),
  ]);

  const hasData = series.some((point) => point.jobsDiscovered > 0) || stats.proposalsPrepared > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="How your pipeline is performing over the last 60 days."
      />

      {!hasData ? (
        <EmptyState
          icon={BarChart3Icon}
          title="Not enough data yet"
          description="Once a few automation runs have completed, this page will show discovery, submission and quality trends."
        />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Average opportunity score" value={stats.averageScore} />
            <StatCard label="Proposals prepared" value={formatNumber(stats.proposalsPrepared)} />
            <StatCard label="Proposals submitted" value={formatNumber(stats.proposalsSubmitted)} accent="success" />
            <StatCard label="Win rate" value={`${stats.winRate}%`} accent="primary" />
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Jobs discovered and proposals submitted</CardTitle>
              <CardDescription>Daily totals across all search profiles.</CardDescription>
            </CardHeader>
            <CardContent>
              <AreaTrend
                data={series}
                height={300}
                series={[
                  { key: "jobsDiscovered", label: "Jobs discovered", color: "var(--color-chart-1)" },
                  { key: "proposalsSubmitted", label: "Proposals submitted", color: "var(--color-chart-3)" },
                ]}
              />
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Average opportunity score</CardTitle>
                <CardDescription>How good the jobs reaching you actually are.</CardDescription>
              </CardHeader>
              <CardContent>
                <AreaTrend
                  data={series}
                  height={260}
                  valueSuffix="/100"
                  series={[{ key: "averageScore", label: "Average score", color: "var(--color-chart-2)" }]}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recommendation mix</CardTitle>
                <CardDescription>What the scoring engine advised across all analyzed jobs.</CardDescription>
              </CardHeader>
              <CardContent>
                <BarBreakdown
                  data={actions.map((entry) => ({
                    label: ACTION_LABEL[entry.action] ?? entry.action,
                    value: entry.count,
                  }))}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Proposal funnel</CardTitle>
              <CardDescription>Where your prepared proposals currently sit.</CardDescription>
            </CardHeader>
            <CardContent>
              <BarBreakdown
                data={funnel.map((entry) => ({
                  label: STATUS_LABEL[entry.status] ?? entry.status,
                  value: entry.count,
                }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Connects economics</CardTitle>
              <CardDescription>What the filtering saved you.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div className="bg-muted/40 rounded-lg border p-4">
                <p className="text-2xl font-semibold tabular-nums">{formatNumber(stats.connectsUsed)}</p>
                <p className="text-muted-foreground mt-1 text-xs">Connects spent on submissions</p>
              </div>
              <div className="bg-muted/40 rounded-lg border p-4">
                <p className="text-success text-2xl font-semibold tabular-nums">
                  {formatNumber(stats.connectsSaved)}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">Connects not spent on jobs scored SKIP</p>
              </div>
              <div className="bg-muted/40 rounded-lg border p-4">
                <p className="text-2xl font-semibold tabular-nums">{formatNumber(stats.demosReady)}</p>
                <p className="text-muted-foreground mt-1 text-xs">Demos deployed and verified</p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
