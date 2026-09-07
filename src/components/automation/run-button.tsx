"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, PlayIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface RunAutomationButtonProps {
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg";
  label?: string;
  skipDemos?: boolean;
}

export function RunAutomationButton({
  variant = "default",
  size = "default",
  label = "Run now",
  skipDemos = false,
}: RunAutomationButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function trigger() {
    setPending(true);
    try {
      const response = await fetch("/api/automation/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skipDemos }),
      });
      const payload = await response.json();

      if (!response.ok) {
        toast.error(payload?.error?.message ?? "The run could not be started.");
        return;
      }

      toast.success(
        payload.data.mode === "queue"
          ? "Run queued. Results will appear as jobs are analyzed."
          : "Run started in this process. Refresh in a minute to see results.",
      );
      router.refresh();
    } catch {
      toast.error("The run could not be started.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button variant={variant} size={size} onClick={trigger} disabled={pending}>
      {pending ? <Loader2Icon className="size-4 animate-spin" /> : <PlayIcon className="size-4" />}
      {pending ? "Starting…" : label}
    </Button>
  );
}
