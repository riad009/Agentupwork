import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangleIcon,
  CheckIcon,
  DownloadIcon,
  ExternalLinkIcon,
  EyeIcon,
  FolderGit2Icon,
  MonitorPlayIcon,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ScoreRing } from "@/components/shared/score-badge";
import { ProposalEditor } from "@/components/proposals/proposal-actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { requireSessionUser } from "@/lib/session";
import { getProposal, summariseCoverage } from "@/features/proposals/queries";
import { decimalToNumber, formatCompactCurrency, formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Proposal review" };
export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "default" | "success" | "warning" | "destructive" | "muted" | "secondary"> = {
  GENERATED: "secondary",
  NEEDS_REVIEW: "default",
  APPROVED: "warning",
  SAVED_FOR_LATER: "muted",
  REJECTED: "muted",
  SUBMITTED: "success",
  FAILED: "destructive",
};

export default async function ProposalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireSessionUser();
  const { id } = await params;
  const proposal = await getProposal(user.id, id);

  if (!proposal) notFound();

  const job = proposal.job;
  const analysis = job.analysis;
  const demo = proposal.demo;
  const document = proposal.document;
  const coverage = summariseCoverage(proposal);
  const lastSubmission = proposal.submissions[0] ?? null;

  const demoCoverage = (demo?.coverage ?? []) as { requirement: string; demoSolution: string }[];

  return (
    <div className="space-y-6">
      <PageHeader
        title={job.title}
        description={`Prepared ${formatDateTime(proposal.createdAt)} · version ${proposal.version}`}
        actions={
          <>
            <Badge variant={STATUS_TONE[proposal.status] ?? "muted"} className="h-8 px-3">
              {proposal.status.replace(/_/g, " ")}
            </Badge>
            <Button asChild variant="outline">
              <a href={job.url} target="_blank" rel="noreferrer noopener">
                <ExternalLinkIcon className="size-4" />
                Upwork job
              </a>
            </Button>
          </>
        }
      />

      {proposal.status === "SUBMITTED" ? (
        <Alert variant="success">
          <CheckIcon />
          <AlertTitle>Submitted through the official Upwork API</AlertTitle>
          <AlertDescription>
            {lastSubmission?.submittedAt ? formatDateTime(lastSubmission.submittedAt) : "Submitted"}
            {lastSubmission?.connectsSpent ? ` · ${lastSubmission.connectsSpent} Connects spent` : ""}
          </AlertDescription>
        </Alert>
      ) : null}

      {proposal.status === "FAILED" && proposal.failureReason ? (
        <Alert variant="destructive">
          <AlertTriangleIcon />
          <AlertTitle>Submission failed — no Connects were spent</AlertTitle>
          <AlertDescription>{proposal.failureReason}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generated proposal</CardTitle>
              <CardDescription>
                Edit anything before approving. The text below is exactly what would be sent.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProposalEditor
                proposalId={proposal.id}
                status={proposal.status}
                initialContent={proposal.editedContent ?? proposal.content}
                hasDemo={Boolean(demo)}
              />
            </CardContent>
          </Card>

          {proposal.questions.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Questions included</CardTitle>
                <CardDescription>Project-specific questions the proposal asks the client.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {proposal.questions.map((question) => (
                    <li key={question} className="text-muted-foreground text-sm">
                      • {question}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Requirement coverage</CardTitle>
              <CardDescription>
                The demo is intentionally lightweight. This is exactly how much of the client&apos;s scope it represents.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/40 rounded-lg border p-4 text-center">
                  <p className="text-2xl font-semibold tabular-nums">{coverage.clientRequirements}</p>
                  <p className="text-muted-foreground mt-1 text-xs">Client requirements</p>
                </div>
                <div className="bg-muted/40 rounded-lg border p-4 text-center">
                  <p className="text-2xl font-semibold tabular-nums">{coverage.representedInDemo}</p>
                  <p className="text-muted-foreground mt-1 text-xs">Represented in demo</p>
                </div>
                <div className="bg-muted/40 rounded-lg border p-4 text-center">
                  <p className="text-2xl font-semibold tabular-nums">{coverage.productionScope}</p>
                  <p className="text-muted-foreground mt-1 text-xs">Production scope</p>
                </div>
              </div>

              {demoCoverage.length > 0 ? (
                <div className="space-y-3">
                  <Separator />
                  {demoCoverage.map((item) => (
                    <div key={item.requirement} className="flex gap-3">
                      <span className="bg-success/15 text-success mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full">
                        <CheckIcon className="size-3" />
                      </span>
                      <div>
                        <p className="text-sm font-medium">{item.requirement}</p>
                        <p className="text-muted-foreground mt-0.5 text-sm">{item.demoSolution}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>

          {demo && demo.screenshots.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Demo screenshots</CardTitle>
                <CardDescription>Captured from the live deployment.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                {demo.screenshots.map((shot) => (
                  <figure key={shot.id} className="overflow-hidden rounded-lg border">
                    <Image
                      src={`/api/demos/${demo.id}/screenshots/${shot.id}`}
                      alt={shot.label}
                      width={shot.width}
                      height={shot.height}
                      className="h-auto w-full"
                      unoptimized
                    />
                    <figcaption className="bg-muted/40 text-muted-foreground border-t px-3 py-2 text-xs">
                      {shot.label}
                    </figcaption>
                  </figure>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          {analysis ? (
            <Card>
              <CardHeader className="flex-row items-start justify-between">
                <div>
                  <CardTitle>Opportunity</CardTitle>
                  <CardDescription>{analysis.recommendedAction.replace("_", " ")}</CardDescription>
                </div>
                <ScoreRing score={analysis.overallScore} />
              </CardHeader>
              <CardContent className="space-y-2.5 text-sm">
                {[
                  ["Winning probability", `${analysis.winningProbability}%`],
                  ["Client quality", `${analysis.clientQuality}/100`],
                  ["Competition", `${analysis.competitionScore}/100`],
                  ["Budget score", `${analysis.budgetScore}/100`],
                  ["Client risk", `${analysis.riskScore}/100`],
                  ["Hire rate", job.clientHireRate !== null ? `${job.clientHireRate}%` : "—"],
                  ["Client spending", formatCompactCurrency(decimalToNumber(job.clientTotalSpent))],
                  ["Proposals", job.proposalsCount ?? job.proposalsRange ?? "—"],
                  ["Connects required", proposal.connectsRequired ?? job.connectsRequired ?? "—"],
                  [
                    "Budget",
                    job.projectType === "HOURLY"
                      ? `$${decimalToNumber(job.hourlyMin) ?? "?"}–$${decimalToNumber(job.hourlyMax) ?? "?"}/hr`
                      : formatCompactCurrency(decimalToNumber(job.budgetAmount)),
                  ],
                ].map(([label, value]) => (
                  <div key={String(label)} className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium tabular-nums">{String(value)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MonitorPlayIcon className="size-4" />
                Demo
              </CardTitle>
              <CardDescription>
                {!demo
                  ? "NOT_REQUIRED — no demo was generated for this job."
                  : demo.status === "READY"
                    ? "READY — deployed and verified."
                    : `${demo.status} — ${demo.errorMessage ?? "in progress"}`}
              </CardDescription>
            </CardHeader>
            {demo ? (
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {demo.liveUrl && demo.status === "READY" ? (
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
                        Open GitHub
                      </a>
                    </Button>
                  ) : null}
                </div>

                {demo.demoEmail && demo.status === "READY" ? (
                  <div className="bg-muted/40 rounded-lg border p-3 text-xs">
                    <p className="font-medium">Demo credentials</p>
                    <p className="text-muted-foreground mt-1">Email: {demo.demoEmail}</p>
                    <p className="text-muted-foreground">Password: {demo.demoPassword}</p>
                    <p className="text-muted-foreground mt-2">
                      These belong only to the isolated demo application.
                    </p>
                  </div>
                ) : null}
              </CardContent>
            ) : null}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Project brief PDF</CardTitle>
              <CardDescription>
                {document?.status === "READY"
                  ? `${document.pageCount ?? "—"} pages, prepared for this client.`
                  : document?.status === "FAILED"
                    ? (document.errorMessage ?? "Generation failed.")
                    : "Not generated for this proposal."}
              </CardDescription>
            </CardHeader>
            {document?.status === "READY" ? (
              <CardContent className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <a href={`/api/proposals/${proposal.id}/document`} target="_blank" rel="noreferrer noopener">
                    <EyeIcon className="size-3.5" />
                    Preview PDF
                  </a>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a href={`/api/proposals/${proposal.id}/document?download=1`}>
                    <DownloadIcon className="size-3.5" />
                    Download PDF
                  </a>
                </Button>
              </CardContent>
            ) : null}
          </Card>

          <Alert variant="info">
            <AlertTriangleIcon />
            <AlertTitle>Attachments require a manual step</AlertTitle>
            <AlertDescription>
              The public Upwork API does not accept file attachments on a proposal. Download the brief and attach it
              in Upwork if you want the client to receive it — this product never automates around that limit.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>Submission history</CardTitle>
            </CardHeader>
            <CardContent>
              {proposal.submissions.length === 0 ? (
                <p className="text-muted-foreground text-sm">No submission attempts yet.</p>
              ) : (
                <ul className="space-y-3">
                  {proposal.submissions.map((submission) => (
                    <li key={submission.id} className="text-sm">
                      <div className="flex items-center justify-between">
                        <Badge variant={submission.status === "SUCCESS" ? "success" : "destructive"}>
                          {submission.status}
                        </Badge>
                        <span className="text-muted-foreground text-xs">
                          {formatDateTime(submission.submittedAt ?? submission.createdAt)}
                        </span>
                      </div>
                      {submission.errorMessage ? (
                        <p className="text-muted-foreground mt-1 text-xs">{submission.errorMessage}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <p className="text-muted-foreground text-xs leading-relaxed">
            <Link href="/jobs" className="hover:underline">
              Back to the job feed
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
