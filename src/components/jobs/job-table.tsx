"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ExternalLinkIcon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScoreBadge } from "@/components/shared/score-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { formatCompactCurrency, formatRelativeTime } from "@/lib/format";
import type { JobListItem } from "@/features/jobs/queries";

const ACTION_TONE: Record<string, "success" | "default" | "warning" | "muted"> = {
  HIGH_PRIORITY: "success",
  APPLY: "default",
  WATCH: "warning",
  SKIP: "muted",
};

const STATUS_LABEL: Record<string, string> = {
  NEW: "New",
  ANALYZED: "Analyzed",
  SHORTLISTED: "Shortlisted",
  PROPOSAL_READY: "Proposal ready",
  SUBMITTED: "Submitted",
  ARCHIVED: "Archived",
  SKIPPED: "Skipped",
};

interface JobTableProps {
  items: JobListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export function JobTable({ items, total, page, pageSize }: JobTableProps) {
  const router = useRouter();
  const params = useSearchParams();

  if (items.length === 0) {
    return (
      <EmptyState
        title="No jobs match these filters"
        description="Try clearing a filter, or run the automation to discover new opportunities."
      />
    );
  }

  function budgetLabel(job: JobListItem): string {
    if (job.projectType === "HOURLY") {
      if (job.hourlyMin === null && job.hourlyMax === null) return "Hourly";
      return `$${job.hourlyMin ?? "?"}–$${job.hourlyMax ?? "?"}/hr`;
    }
    return formatCompactCurrency(job.budgetAmount);
  }

  return (
    <div className="space-y-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Score</TableHead>
            <TableHead>Job</TableHead>
            <TableHead className="w-40">Client</TableHead>
            <TableHead className="w-28">Budget</TableHead>
            <TableHead className="w-24">Hire rate</TableHead>
            <TableHead className="w-24">Proposals</TableHead>
            <TableHead className="w-20">Connects</TableHead>
            <TableHead className="w-24">Posted</TableHead>
            <TableHead className="w-32">Status</TableHead>
            <TableHead className="w-24 text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((job) => (
            <TableRow key={job.id}>
              <TableCell>
                <ScoreBadge score={job.score} />
              </TableCell>
              <TableCell className="max-w-sm">
                <Link href={`/jobs/${job.id}`} className="line-clamp-1 font-medium hover:underline">
                  {job.title}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {job.recommendedAction ? (
                    <Badge variant={ACTION_TONE[job.recommendedAction] ?? "muted"} className="text-[10px]">
                      {job.recommendedAction.replace("_", " ")}
                    </Badge>
                  ) : null}
                  {job.demoRecommended ? (
                    <Badge variant="outline" className="text-[10px]">
                      Demo recommended
                    </Badge>
                  ) : null}
                  {job.winningProbability !== null ? (
                    <span className="text-muted-foreground text-[11px]">{job.winningProbability}% win</span>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="text-sm">
                <div className="line-clamp-1">{job.clientCountry ?? "Unknown"}</div>
                <div className="text-muted-foreground text-xs">
                  {job.clientPaymentVerified ? "Verified" : "Unverified"} ·{" "}
                  {formatCompactCurrency(job.clientTotalSpent)}
                </div>
              </TableCell>
              <TableCell className="text-sm tabular-nums">{budgetLabel(job)}</TableCell>
              <TableCell className="text-sm tabular-nums">
                {job.clientHireRate !== null ? `${job.clientHireRate}%` : "—"}
              </TableCell>
              <TableCell className="text-sm tabular-nums">
                {job.proposalsCount ?? job.proposalsRange ?? "—"}
              </TableCell>
              <TableCell className="text-sm tabular-nums">{job.connectsRequired ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground text-xs">{formatRelativeTime(job.postedAt)}</TableCell>
              <TableCell>
                <Badge variant="muted" className="text-[10px]">
                  {STATUS_LABEL[job.status] ?? job.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button asChild size="icon-sm" variant="ghost" title="Open on Upwork">
                    <a href={job.url} target="_blank" rel="noreferrer noopener">
                      <ExternalLinkIcon className="size-3.5" />
                    </a>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/jobs/${job.id}`}>Open</Link>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={(next) => {
          const search = new URLSearchParams(params.toString());
          search.set("page", String(next));
          router.push(`/jobs?${search.toString()}`);
        }}
      />
    </div>
  );
}
