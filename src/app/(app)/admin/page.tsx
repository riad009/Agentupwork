import type { Metadata } from "next";
import {
  ActivityIcon,
  AlertTriangleIcon,
  BrainCircuitIcon,
  DatabaseIcon,
  MonitorPlayIcon,
  UsersIcon,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdminUser } from "@/lib/session";
import { getAdminOverview, getAiUsageByOperation, listUsersForAdmin } from "@/features/admin/queries";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdminUser();

  const [overview, users, aiUsage] = await Promise.all([
    getAdminOverview(),
    listUsersForAdmin(1, 20),
    getAiUsageByOperation(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administration"
        description="Platform-wide health, usage and cost. No user secrets are ever shown here."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Users"
          value={formatNumber(overview.users.total)}
          icon={UsersIcon}
          hint={`${overview.users.active} active · ${overview.users.newThisWeek} new this week`}
        />
        <StatCard
          label="Upwork accounts connected"
          value={formatNumber(overview.upworkConnections)}
          icon={ActivityIcon}
          accent="primary"
        />
        <StatCard
          label="Jobs analyzed"
          value={formatNumber(overview.jobs.analyzed)}
          icon={DatabaseIcon}
          hint={`${formatNumber(overview.jobs.total)} discovered`}
        />
        <StatCard
          label="Demo deployments"
          value={formatNumber(overview.demos.ready)}
          icon={MonitorPlayIcon}
          accent="success"
          hint={`${overview.demos.failed} failed of ${overview.demos.total}`}
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="AI calls" value={formatNumber(overview.ai.calls)} icon={BrainCircuitIcon} />
        <StatCard
          label="Tokens used"
          value={formatNumber(overview.ai.inputTokens + overview.ai.outputTokens)}
          hint={`${formatNumber(overview.ai.inputTokens)} in / ${formatNumber(overview.ai.outputTokens)} out`}
        />
        <StatCard label="Estimated AI cost" value={formatCurrency(overview.ai.costUsd, true)} accent="warning" />
        <StatCard
          label="API errors"
          value={formatNumber(overview.errors.total)}
          icon={AlertTriangleIcon}
          accent={overview.errors.total > 0 ? "destructive" : "default"}
          hint={`${overview.ai.failures} failed AI calls`}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Application health</CardTitle>
            <CardDescription>Live dependency checks.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              ["Database", overview.health.database ? "Connected" : "Unavailable", overview.health.database],
              ["Redis queue", overview.health.redis ? "Connected" : "Unavailable (running in-process)", overview.health.redis],
              ["Upwork provider", overview.health.upworkProvider, overview.health.upworkProvider === "api"],
              ["Email provider", overview.health.emailProvider, overview.health.emailProvider !== "console"],
            ].map(([label, value, ok]) => (
              <div key={String(label)} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{String(label)}</span>
                <Badge variant={ok ? "success" : "warning"}>{String(value)}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Proposal outcomes</CardTitle>
            <CardDescription>Across every account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              ["Prepared", overview.proposals.total],
              ["Submitted", overview.proposals.submitted],
              ["Failed submissions", overview.proposals.failed],
              ["Administrators", overview.users.admins],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex items-center justify-between">
                <span className="text-muted-foreground">{String(label)}</span>
                <span className="font-medium tabular-nums">{formatNumber(Number(value))}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AI usage by operation</CardTitle>
          <CardDescription>Where tokens are actually being spent.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Operation</TableHead>
                <TableHead className="w-24">Calls</TableHead>
                <TableHead className="w-32">Input tokens</TableHead>
                <TableHead className="w-32">Output tokens</TableHead>
                <TableHead className="w-28 text-right">Est. cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aiUsage.map((entry) => (
                <TableRow key={entry.operation}>
                  <TableCell className="font-medium">{entry.operation.replace(/_/g, " ")}</TableCell>
                  <TableCell className="tabular-nums">{formatNumber(entry.calls)}</TableCell>
                  <TableCell className="tabular-nums">{formatNumber(entry.inputTokens)}</TableCell>
                  <TableCell className="tabular-nums">{formatNumber(entry.outputTokens)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(entry.costUsd, true)}</TableCell>
                </TableRow>
              ))}
              {aiUsage.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                    No AI usage recorded yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Most recent {users.items.length} of {users.total}.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead className="w-24">Role</TableHead>
                <TableHead className="w-32">Upwork</TableHead>
                <TableHead className="w-20">Jobs</TableHead>
                <TableHead className="w-24">Proposals</TableHead>
                <TableHead className="w-20">Demos</TableHead>
                <TableHead className="w-40">Last login</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.items.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <div className="font-medium">{entry.name ?? "—"}</div>
                    <div className="text-muted-foreground text-xs">{entry.email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={entry.role === "ADMIN" ? "default" : "secondary"}>{entry.role}</Badge>
                  </TableCell>
                  <TableCell>
                    {entry.upworkConnection?.isActive ? (
                      <Badge variant="success">
                        {entry.upworkConnection.connectsBalance ?? "—"} Connects
                      </Badge>
                    ) : (
                      <Badge variant="muted">Not connected</Badge>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums">{entry._count.jobs}</TableCell>
                  <TableCell className="tabular-nums">{entry._count.proposals}</TableCell>
                  <TableCell className="tabular-nums">{entry._count.demos}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {entry.lastLoginAt ? formatDateTime(entry.lastLoginAt) : "never"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {overview.errors.recent.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Recent failures</CardTitle>
            <CardDescription>From the audit log. Secret values are never recorded.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {overview.errors.recent.map((entry, index) => (
                <li key={`${entry.action}-${index}`} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{entry.action}</span>
                  <span className="text-muted-foreground text-xs">
                    {entry.resource ?? "—"} · {formatDateTime(entry.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
