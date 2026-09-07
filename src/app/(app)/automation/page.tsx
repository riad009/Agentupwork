import type { Metadata } from "next";
import Link from "next/link";
import { WorkflowIcon } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RunAutomationButton } from "@/components/automation/run-button";
import { requireSessionUser } from "@/lib/session";
import { listAutomationRuns } from "@/features/automation/queries";
import { getOrCreatePreferences } from "@/features/pipeline/context";
import { formatDateTime, formatDuration, formatRelativeTime } from "@/lib/format";

export const metadata: Metadata = { title: "Automation runs" };
export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "success" | "warning" | "destructive" | "muted" | "secondary"> = {
  COMPLETED: "success",
  PARTIAL: "warning",
  FAILED: "destructive",
  RUNNING: "secondary",
  QUEUED: "muted",
  CANCELLED: "muted",
};

const FREQUENCY_LABEL: Record<string, string> = {
  MANUAL: "Manual only",
  HOURLY: "Every hour",
  EVERY_3_HOURS: "Every 3 hours",
  EVERY_6_HOURS: "Every 6 hours",
  DAILY: "Once daily",
};

export default async function AutomationPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await requireSessionUser();
  const params = await searchParams;
  const page = Number(params.page ?? 1);

  const [runs, preference] = await Promise.all([
    listAutomationRuns(user.id, page, 20),
    getOrCreatePreferences(user.id),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Automation runs"
        description={`${preference.automationEnabled ? "Enabled" : "Disabled"} · ${FREQUENCY_LABEL[preference.scheduleFrequency] ?? preference.scheduleFrequency} · up to ${preference.maxJobsPerRun} jobs per run, top ${preference.topJobsCount} selected.`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/settings/automation">Automation settings</Link>
            </Button>
            <RunAutomationButton />
          </>
        }
      />

      {runs.items.length === 0 ? (
        <EmptyState
          icon={WorkflowIcon}
          title="No runs yet"
          description="A run discovers jobs, scores them, shortlists the best and prepares proposals for your approval."
          action={<RunAutomationButton size="sm" />}
        />
      ) : (
        <Card>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Started</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-24">Duration</TableHead>
                  <TableHead className="w-20">Fetched</TableHead>
                  <TableHead className="w-20">Analyzed</TableHead>
                  <TableHead className="w-20">Selected</TableHead>
                  <TableHead className="w-24">Proposals</TableHead>
                  <TableHead className="w-20">Demos</TableHead>
                  <TableHead className="w-20">Errors</TableHead>
                  <TableHead className="w-20 text-right">Logs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.items.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell>
                      <div className="text-sm font-medium">{formatDateTime(run.startedAt)}</div>
                      <div className="text-muted-foreground text-xs">
                        {run.trigger.toLowerCase()} · {formatRelativeTime(run.startedAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_TONE[run.status] ?? "muted"}>{run.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {run.finishedAt
                        ? formatDuration(run.finishedAt.getTime() - run.startedAt.getTime())
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">{run.jobsFetched}</TableCell>
                    <TableCell className="text-sm tabular-nums">{run.jobsAnalyzed}</TableCell>
                    <TableCell className="text-sm tabular-nums">{run.topJobsSelected}</TableCell>
                    <TableCell className="text-sm tabular-nums">{run.proposalsGenerated}</TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {run.demosGenerated}
                      {run.demosAttempted > run.demosGenerated ? (
                        <span className="text-muted-foreground">/{run.demosAttempted}</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {run.errorCount > 0 ? (
                        <span className="text-destructive">{run.errorCount}</span>
                      ) : (
                        run.errorCount
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/automation/${run.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
