"use client";

import { useEffect } from "react";
import { AlertTriangleIcon, RotateCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Surfaced in the server logs by the framework; this keeps the digest visible in the browser too.
    console.error("Application error", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="bg-destructive/10 text-destructive flex size-12 items-center justify-center rounded-full">
        <AlertTriangleIcon className="size-6" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="text-muted-foreground max-w-md text-sm">
        The error has been recorded. You can retry, and nothing was submitted to Upwork.
      </p>
      {error.digest ? <p className="text-muted-foreground font-mono text-xs">Reference: {error.digest}</p> : null}
      <Button onClick={reset}>
        <RotateCwIcon className="size-4" />
        Try again
      </Button>
    </div>
  );
}
