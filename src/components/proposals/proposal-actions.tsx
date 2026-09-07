"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BookmarkIcon,
  FileTextIcon,
  Loader2Icon,
  RefreshCwIcon,
  RotateCcwIcon,
  SaveIcon,
  XCircleIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { SubmitProposalDialog } from "@/components/proposals/submit-dialog";

interface ProposalActionsProps {
  proposalId: string;
  status: string;
  initialContent: string;
  hasDemo: boolean;
}

const EDITABLE_STATUSES = new Set(["GENERATED", "NEEDS_REVIEW", "SAVED_FOR_LATER", "REJECTED", "FAILED"]);

export function ProposalEditor({ proposalId, status, initialContent, hasDemo }: ProposalActionsProps) {
  const router = useRouter();
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const editable = EDITABLE_STATUSES.has(status);
  const dirty = content !== initialContent;
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  async function save() {
    setSaving(true);
    try {
      const response = await fetch(`/api/proposals/${proposalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editedContent: content }),
      });
      const payload = await response.json();

      if (!response.ok) {
        toast.error(payload?.error?.message ?? "Could not save your edits.");
        return;
      }

      toast.success("Edits saved");
      startTransition(() => router.refresh());
    } catch {
      toast.error("Could not save your edits.");
    } finally {
      setSaving(false);
    }
  }

  async function act(action: "REJECT" | "SAVE_FOR_LATER" | "REOPEN") {
    setBusy(action);
    try {
      const response = await fetch(`/api/proposals/${proposalId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = await response.json();

      if (!response.ok) {
        toast.error(payload?.error?.message ?? "That action failed.");
        return;
      }

      toast.success(
        action === "REJECT" ? "Proposal rejected" : action === "REOPEN" ? "Reopened for review" : "Saved for later",
      );
      startTransition(() => router.refresh());
    } catch {
      toast.error("That action failed.");
    } finally {
      setBusy(null);
    }
  }

  async function regenerate(target: "PROPOSAL" | "BRIEF") {
    setBusy(target);
    try {
      const response = await fetch(`/api/proposals/${proposalId}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target }),
      });
      const payload = await response.json();

      if (!response.ok) {
        toast.error(payload?.data?.message ?? payload?.error?.message ?? "Regeneration failed.");
        return;
      }

      if (target === "PROPOSAL" && payload?.data?.content) {
        setContent(payload.data.content);
      }
      toast.success(target === "PROPOSAL" ? "Proposal regenerated" : "Project brief regenerated");
      startTransition(() => router.refresh());
    } catch {
      toast.error("Regeneration failed.");
    } finally {
      setBusy(null);
    }
  }

  async function rebuildDemo() {
    setBusy("DEMO");
    toast.info("Rebuilding the demo. This can take several minutes.");
    try {
      const response = await fetch(`/api/proposals/${proposalId}/rebuild-demo`, { method: "POST" });
      const payload = await response.json();

      if (!response.ok || !payload?.data?.ok) {
        toast.error(payload?.data?.message ?? payload?.error?.message ?? "The demo could not be rebuilt.");
        return;
      }

      toast.success("Demo rebuilt and deployed");
      startTransition(() => router.refresh());
    } catch {
      toast.error("The demo could not be rebuilt.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <Textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        disabled={!editable}
        rows={16}
        className="font-[system-ui] text-sm leading-relaxed"
      />

      <div className="text-muted-foreground flex items-center justify-between text-xs">
        <span>{wordCount} words</span>
        {dirty ? <span className="text-warning-foreground">Unsaved edits</span> : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {editable ? (
          <Button variant="outline" onClick={save} disabled={saving || !dirty}>
            {saving ? <Loader2Icon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}
            Save edits
          </Button>
        ) : null}

        <Button variant="outline" onClick={() => regenerate("PROPOSAL")} disabled={!editable || busy !== null}>
          {busy === "PROPOSAL" ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <RefreshCwIcon className="size-4" />
          )}
          Regenerate proposal
        </Button>

        <Button variant="outline" onClick={() => regenerate("BRIEF")} disabled={busy !== null}>
          {busy === "BRIEF" ? <Loader2Icon className="size-4 animate-spin" /> : <FileTextIcon className="size-4" />}
          Regenerate PDF
        </Button>

        <Button variant="outline" onClick={rebuildDemo} disabled={!editable || busy !== null}>
          {busy === "DEMO" ? <Loader2Icon className="size-4 animate-spin" /> : <RotateCcwIcon className="size-4" />}
          {hasDemo ? "Rebuild demo" : "Build demo"}
        </Button>

        {editable ? (
          <Button variant="outline" onClick={() => act("SAVE_FOR_LATER")} disabled={busy !== null}>
            <BookmarkIcon className="size-4" />
            Save for later
          </Button>
        ) : null}

        {status === "REJECTED" ? (
          <Button variant="outline" onClick={() => act("REOPEN")} disabled={busy !== null}>
            <RotateCcwIcon className="size-4" />
            Reopen
          </Button>
        ) : null}

        {editable ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="text-destructive hover:text-destructive">
                <XCircleIcon className="size-4" />
                Reject
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reject this proposal?</AlertDialogTitle>
                <AlertDialogDescription>
                  The job will be marked as skipped. No Connects are involved, and you can reopen it later.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => act("REJECT")}>Reject proposal</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}

        <div className="ml-auto">
          <SubmitProposalDialog proposalId={proposalId} disabled={!editable || busy !== null || dirty} />
        </div>
      </div>

      {dirty ? (
        <p className="text-muted-foreground text-xs">Save your edits before submitting.</p>
      ) : null}
    </div>
  );
}
