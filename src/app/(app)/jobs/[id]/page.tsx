import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ExternalLinkIcon,
  FolderGit2Icon,
  MonitorPlayIcon,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ScoreRing } from "@/components/shared/score-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { requireSessionUser } from "@/lib/session";
import { getJobDetail } from "@/features/jobs/queries";
import { decimalToNumber, formatCompactCurrency, formatDateTime, formatRelativeTime } from "@/lib/format";

export const metadata: Metadata = { title: "Job detail" };
export const dynamic = "force-dynamic";

const ACTION_TONE = {
  HIGH_PRIORITY: "success",
  APPLY: "default",
  WATCH: "warning",
  SKIP: "muted",
} as const;

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireSessionUser();
  const { id } = await params;
  const job = await getJobDetail(user.id, id);

  if (!job) notFound();

  const analysis = job.analysis;
  const proposal = job.proposals[0] ?? null;
  const demo = job.demos.find((entry) => entry.status === "READY") ?? job.demos[0] ?? null;

  const scoreBars = analysis
    ? [
        { label: "Skill match", value: analysis.skillMatch },
        { label: "Client quality", value: analysis.clientQuality },
        { label: "Competition", value: analysis.competitionScore },
        { label: "Budget", value: analysis.budgetScore },
        { label: "Winning probability", value: analysis.winningProbability },
      ]
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={job.title}
        description={`Posted ${formatRelativeTime(job.postedAt)} · discovered ${formatRelativeTime(job.fetchedAt)}${
          job.searchProfile ? ` via "${job.searchProfile.name}"` : ""
        }`}
        actions={
          <>
            <Button asChild variant="outline">
              <a href={job.url} target="_blank" rel="noreferrer noopener">
                <ExternalLinkIcon className="size-4" />
                Open on Upwork
              </a>
            </Button>
            {proposal ? (
              <Button asChild>
                <Link href={`/proposals/${proposal.id}`}>Review proposal</Link>
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Job description</CardTitle>
              <CardDescription>As published by the client.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
                {job.description}
              </p>
              {job.skills.length > 0 ? (
                <>
                  <Separator className="my-5" />
                  <div className="flex flex-wrap gap-1.5">
                    {job.skills.map((skill) => (
                      <Badge key={skill} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>

          {analysis ? (
            <Card>
              <CardHeader>
                <CardTitle>AI assessment</CardTitle>
                <CardDescription>{analysis.reasoningSummary}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  {analysis.strengths.length > 0 ? (
                    <div>
                      <p className="text-success mb-2 flex items-center gap-1.5 text-sm font-medium">
                        <CheckCircle2Icon className="size-4" />
                        Strengths
                      </p>
                      <ul className="space-y-1.5">
                        {analysis.strengths.map((item) => (
                          <li key={item} className="text-muted-foreground text-sm">
                            • {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {analysis.risks.length > 0 ? (
                    <div>
                      <p className="text-warning-foreground mb-2 flex items-center gap-1.5 text-sm font-medium">
                        <AlertTriangleIcon className="size-4" />
                        Risks
                      </p>
                      <ul className="space-y-1.5">
                        {analysis.risks.map((item) => (
                          <li key={item} className="text-muted-foreground text-sm">
                            • {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>

                {analysis.technicalOpportunity ? (
                  <div className="bg-muted/50 rounded-lg border p-4">
                    <p className="mb-1 text-sm font-medium">Technical opportunity</p>
                    <p className="text-muted-foreground text-sm">{analysis.technicalOpportunity}</p>
                  </div>
                ) : null}

                <div className="space-y-3">
                  {scoreBars.map((bar) => (
                    <div key={bar.label} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{bar.label}</span>
                        <span className="font-medium tabular-nums">{bar.value}</span>
                      </div>
                      <Progress value={bar.value} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-muted-foreground py-10 text-center text-sm">
                This job has not been analyzed yet.
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {analysis ? (
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle>Opportunity score</CardTitle>
                  <CardDescription>Ranked {analysis.rankedScore.toFixed(1)} after weighting</CardDescription>
                </div>
                <ScoreRing score={analysis.overallScore} />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Recommendation</span>
                  <Badge variant={ACTION_TONE[analysis.recommendedAction]}>
                    {analysis.recommendedAction.replace("_", " ")}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Risk score</span>
                  <span className="text-sm font-medium tabular-nums">{analysis.riskScore}/100</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Demo recommended</span>
                  <span className="text-sm font-medium">{analysis.demoRecommended ? "Yes" : "No"}</span>
                </div>
                {analysis.demoRecommended ? (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">Demo value score</span>
                    <span className="text-sm font-medium tabular-nums">{analysis.demoValueScore}/100</span>
                  </div>
                ) : null}
                {analysis.demoReason ? (
                  <p className="text-muted-foreground border-t pt-3 text-xs leading-relaxed">
                    {analysis.demoReason}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Client and competition</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-sm">
              {[
                ["Country", job.clientCountry ?? "Unknown"],
                ["Payment verified", job.clientPaymentVerified ? "Yes" : "No"],
                ["Rating", decimalToNumber(job.clientRating)?.toFixed(2) ?? "—"],
                ["Hire rate", job.clientHireRate !== null ? `${job.clientHireRate}%` : "—"],
                ["Total spent", formatCompactCurrency(decimalToNumber(job.clientTotalSpent))],
                ["Jobs posted", job.clientJobsPosted ?? "—"],
                ["Total hires", job.clientTotalHires ?? "—"],
                ["Member since", job.clientMemberSince ? formatDateTime(job.clientMemberSince) : "—"],
                ["Proposals", job.proposalsCount ?? job.proposalsRange ?? "—"],
                ["Interviews", job.interviewCount ?? "—"],
                ["Invites sent", job.invitesSent ?? "—"],
                ["Connects required", job.connectsRequired ?? "—"],
                [
                  "Budget",
                  job.projectType === "HOURLY"
                    ? `$${decimalToNumber(job.hourlyMin) ?? "?"}–$${decimalToNumber(job.hourlyMax) ?? "?"}/hr`
                    : formatCompactCurrency(decimalToNumber(job.budgetAmount)),
                ],
                ["Duration", job.estimatedDuration ?? "—"],
                ["Experience level", job.experienceLevel],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="text-right font-medium">{String(value)}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {demo ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MonitorPlayIcon className="size-4" />
                  Concept demo
                </CardTitle>
                <CardDescription>
                  {demo.status === "READY"
                    ? "Deployed and verified."
                    : `Status: ${demo.status.replace(/_/g, " ").toLowerCase()}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {demo.errorMessage ? (
                  <p className="text-destructive text-xs">{demo.errorMessage}</p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {demo.liveUrl ? (
                    <Button asChild size="sm" variant="outline">
                      <a href={demo.liveUrl} target="_blank" rel="noreferrer noopener">
                        <ExternalLinkIcon className="size-3.5" />
                        Open demo
                      </a>
                    </Button>
                  ) : null}
                  {demo.githubRepoUrl ? (
                    <Button asChild size="sm" variant="outline">
                      <a href={demo.githubRepoUrl} target="_blank" rel="noreferrer noopener">
                        <FolderGit2Icon className="size-3.5" />
                        Repository
                      </a>
                    </Button>
                  ) : null}
                </div>
                {demo.demoEmail ? (
                  <div className="bg-muted/50 rounded-lg border p-3 text-xs">
                    <p className="font-medium">Demo credentials</p>
                    <p className="text-muted-foreground mt-1">Email: {demo.demoEmail}</p>
                    <p className="text-muted-foreground">Password: {demo.demoPassword}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
