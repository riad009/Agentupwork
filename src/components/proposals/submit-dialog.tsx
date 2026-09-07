"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangleIcon, CoinsIcon, Loader2Icon, SendIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

interface ConnectsPreview {
  connectsRequired: number | null;
  connectsAvailable: number | null;
  connectsRemaining: number | null;
  canSubmitViaApi: boolean;
  providerNotes: string;
  jobTitle: string;
  jobUrl: string;
}

interface SubmitDialogProps {
  proposalId: string;
  disabled?: boolean;
}

/**
 * The Connects confirmation gate. Nothing is sent to Upwork until the user
 * confirms the exact cost shown here.
 */
export function SubmitProposalDialog({ proposalId, disabled }: SubmitDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<ConnectsPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openDialog() {
    setOpen(true);
    setPreview(null);
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`/api/proposals/${proposalId}/connects`);
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error?.message ?? "Could not read your Connects balance.");
        return;
      }
      setPreview(payload.data as ConnectsPreview);
    } catch {
      setError("Could not read your Connects balance.");
    } finally {
      setLoading(false);
    }
  }

  async function confirm() {
    if (!preview) return;
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/proposals/${proposalId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmedConnects: preview.connectsRequired, acknowledged: true }),
      });
      const payload = await response.json();

      if (!response.ok || payload?.data?.status !== "SUCCESS") {
        const message =
          payload?.data?.message ?? payload?.error?.message ?? "The submission did not go through.";
        setError(message);
        toast.error("Submission failed. No Connects were spent.");
        router.refresh();
        return;
      }

      toast.success(
        payload.data.connectsSpent
          ? `Submitted. ${payload.data.connectsSpent} Connects spent.`
          : "Proposal submitted through the official Upwork API.",
      );
      setOpen(false);
      router.refresh();
    } catch {
      setError("The submission did not go through.");
    } finally {
      setSubmitting(false);
    }
  }

  const insufficient =
    preview?.connectsRequired !== null &&
    preview?.connectsAvailable !== null &&
    preview !== null &&
    (preview.connectsAvailable ?? 0) < (preview.connectsRequired ?? 0);

  return (
    <>
      <Button onClick={openDialog} disabled={disabled}>
        <SendIcon className="size-4" />
        Approve &amp; submit
      </Button>

      <Dialog open={open} onOpenChange={(next) => (submitting ? undefined : setOpen(next))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit proposal?</DialogTitle>
            <DialogDescription>
              This is the only action that spends Connects. Nothing is sent until you confirm.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : preview ? (
            <div className="space-y-4">
              <div>
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Job</p>
                <p className="mt-1 text-sm font-medium">{preview.jobTitle}</p>
              </div>

              <div className="bg-muted/40 divide-y rounded-lg border">
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-muted-foreground text-sm">Connects required</span>
                  <span className="text-sm font-semibold tabular-nums">
                    {preview.connectsRequired ?? "Unknown"}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-muted-foreground text-sm">Current Connects</span>
                  <span className="text-sm font-semibold tabular-nums">
                    {preview.connectsAvailable ?? "Unknown"}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-muted-foreground text-sm">Remaining after submission</span>
                  <span className="text-sm font-semibold tabular-nums">
                    {preview.connectsRemaining ?? "Unknown"}
                  </span>
                </div>
              </div>

              {insufficient ? (
                <Alert variant="destructive">
                  <AlertTriangleIcon />
                  <AlertTitle>Not enough Connects</AlertTitle>
                  <AlertDescription>
                    You need {preview.connectsRequired} but have {preview.connectsAvailable}.
                  </AlertDescription>
                </Alert>
              ) : null}

              {!preview.canSubmitViaApi ? (
                <Alert variant="warning">
                  <AlertTriangleIcon />
                  <AlertTitle>Submission through the API is unavailable</AlertTitle>
                  <AlertDescription>{preview.providerNotes}</AlertDescription>
                </Alert>
              ) : null}

              {error ? (
                <Alert variant="destructive">
                  <AlertTriangleIcon />
                  <AlertTitle>Submission failed</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertTriangleIcon />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={confirm} disabled={submitting || loading || !preview || insufficient}>
              {submitting ? <Loader2Icon className="size-4 animate-spin" /> : <CoinsIcon className="size-4" />}
              {submitting ? "Submitting…" : "Confirm & submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
