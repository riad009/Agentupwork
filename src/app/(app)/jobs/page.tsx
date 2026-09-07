import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { TableSkeleton } from "@/components/shared/loading";
import { JobFilters } from "@/components/jobs/job-filters";
import { JobTable } from "@/components/jobs/job-table";
import { RunAutomationButton } from "@/components/automation/run-button";
import { requireSessionUser } from "@/lib/session";
import { listJobs } from "@/features/jobs/queries";
import { jobListQuerySchema } from "@/schemas/proposals";

export const metadata: Metadata = { title: "Jobs" };
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function JobFeed({ searchParams }: PageProps) {
  const user = await requireSessionUser();
  const raw = await searchParams;

  const flat = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );
  const parsed = jobListQuerySchema.safeParse(flat);
  const query = parsed.success ? parsed.data : jobListQuerySchema.parse({});

  const result = await listJobs(user.id, query);

  return (
    <Card>
      <CardContent className="space-y-5">
        <JobFilters total={result.total} />
        <JobTable
          items={result.items}
          total={result.total}
          page={result.page}
          pageSize={result.pageSize}
        />
      </CardContent>
    </Card>
  );
}

export default function JobsPage({ searchParams }: PageProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Job feed"
        description="Every job discovered through the official Upwork API, with its analysis."
        actions={<RunAutomationButton variant="outline" label="Discover jobs" />}
      />
      <Suspense fallback={<TableSkeleton rows={8} columns={7} />}>
        <JobFeed searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
