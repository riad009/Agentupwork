import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ExternalLinkIcon, FolderGit2Icon, MonitorPlayIcon } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { formatRelativeTime } from "@/lib/format";

export const metadata: Metadata = { title: "Demos" };
export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "success" | "warning" | "destructive" | "muted" | "secondary"> = {
  READY: "success",
  FAILED: "destructive",
  NOT_REQUIRED: "muted",
  PENDING: "secondary",
  PLANNING: "secondary",
  GENERATING: "secondary",
  VALIDATING: "secondary",
  REPO_CREATED: "secondary",
  DEPLOYING: "warning",
};

export default async function DemosPage() {
  const user = await requireSessionUser();

  const demos = await prisma.demoProject.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 60,
    include: {
      job: { select: { id: true, title: true, url: true } },
      proposal: { select: { id: true, status: true } },
      screenshots: { orderBy: { order: "asc" }, take: 1 },
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Concept demos"
        description="Lightweight prototypes built for exceptional opportunities only. Each one is a small, frontend-focused concept — never the client's full product."
      />

      {demos.length === 0 ? (
        <EmptyState
          icon={MonitorPlayIcon}
          title="No demos yet"
          description="Demos are generated only for high-scoring jobs where a visual concept would meaningfully raise your chance of winning."
          action={
            <Button asChild size="sm" variant="outline">
              <Link href="/settings/automation">Review demo thresholds</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {demos.map((demo) => {
            const cover = demo.screenshots[0];
            return (
              <Card key={demo.id} className="overflow-hidden py-0">
                {cover ? (
                  <div className="bg-muted relative aspect-[16/10] w-full overflow-hidden border-b">
                    <Image
                      src={`/api/demos/${demo.id}/screenshots/${cover.id}`}
                      alt={cover.label}
                      fill
                      className="object-cover object-top"
                      unoptimized
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                ) : (
                  <div className="bg-muted/50 text-muted-foreground flex aspect-[16/10] items-center justify-center border-b">
                    <MonitorPlayIcon className="size-8" />
                  </div>
                )}

                <CardHeader className="pt-5">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="line-clamp-1">{demo.title}</CardTitle>
                    <Badge variant={STATUS_TONE[demo.status] ?? "muted"}>{demo.status.replace(/_/g, " ")}</Badge>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {demo.summary ?? demo.job.title}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 pb-5">
                  <p className="text-muted-foreground text-xs">
                    {demo.industry ?? "General"} · {demo.pageCount} screens · built {formatRelativeTime(demo.createdAt)}
                  </p>

                  {demo.errorMessage ? (
                    <p className="text-destructive line-clamp-2 text-xs">{demo.errorMessage}</p>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    {demo.liveUrl && demo.status === "READY" ? (
                      <Button asChild size="sm" variant="outline">
                        <a href={demo.liveUrl} target="_blank" rel="noreferrer noopener">
                          <ExternalLinkIcon className="size-3.5" />
                          Open
                        </a>
                      </Button>
                    ) : null}
                    {demo.githubRepoUrl ? (
                      <Button asChild size="sm" variant="outline">
                        <a href={demo.githubRepoUrl} target="_blank" rel="noreferrer noopener">
                          <FolderGit2Icon className="size-3.5" />
                          Code
                        </a>
                      </Button>
                    ) : null}
                    {demo.proposal ? (
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/proposals/${demo.proposal.id}`}>Proposal</Link>
                      </Button>
                    ) : (
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/jobs/${demo.job.id}`}>Job</Link>
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
