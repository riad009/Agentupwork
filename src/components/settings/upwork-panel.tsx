"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangleIcon, CheckCircle2Icon, Loader2Icon, PlugIcon, RefreshCwIcon, UnplugIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { formatDateTime } from "@/lib/format";

export interface UpworkPanelProps {
  configured: boolean;
  connected: boolean;
  providerName: string;
  capabilities: {
    canSearchJobs: boolean;
    canSubmitProposals: boolean;
    canAttachDocuments: boolean;
    canReadConnects: boolean;
    notes: string;
  };
  connection: {
    connectedAt: Date;
    lastSyncedAt: Date | null;
    expiresAt: Date | null;
    scope: string | null;
    upworkUserId: string | null;
    profileName: string | null;
    profileTitle: string | null;
    countryCode: string | null;
    connectsBalance: number | null;
    connectsUpdatedAt: Date | null;
  } | null;
  statusMessage?: string | null;
  statusKind?: string | null;
}

export function UpworkPanel(props: UpworkPanelProps) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  async function sync() {
    setSyncing(true);
    try {
      const response = await fetch("/api/integrations/upwork/sync", { method: "POST" });
      const payload = await response.json();

      if (!response.ok) {
        toast.error(payload?.error?.message ?? "Could not refresh your Upwork profile.");
        return;
      }

      toast.success("Upwork profile refreshed");
      router.refresh();
    } catch {
      toast.error("Could not refresh your Upwork profile.");
    } finally {
      setSyncing(false);
    }
  }

  async function disconnect() {
    setDisconnecting(true);
    try {
      const response = await fetch("/api/integrations/upwork", { method: "DELETE" });
      if (!response.ok) {
        toast.error("Could not disconnect.");
        return;
      }
      toast.success("Upwork account disconnected");
      router.refresh();
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      {props.statusKind === "connected" ? (
        <Alert variant="success">
          <CheckCircle2Icon />
          <AlertTitle>Upwork connected</AlertTitle>
          <AlertDescription>Job discovery will use the official API from your next run.</AlertDescription>
        </Alert>
      ) : null}

      {props.statusKind === "error" && props.statusMessage ? (
        <Alert variant="destructive">
          <AlertTriangleIcon />
          <AlertTitle>Connection failed</AlertTitle>
          <AlertDescription>{props.statusMessage}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Upwork connection</CardTitle>
              <CardDescription>
                Authorised through Upwork&apos;s official OAuth2 flow. Tokens are encrypted and never sent to the
                browser.
              </CardDescription>
            </div>
            <Badge variant={props.connected ? "success" : "muted"}>
              {props.connected ? "Connected" : "Not connected"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {!props.configured ? (
            <Alert variant="warning">
              <AlertTriangleIcon />
              <AlertTitle>OAuth is not configured on this instance</AlertTitle>
              <AlertDescription>
                An administrator needs to set UPWORK_CLIENT_ID, UPWORK_CLIENT_SECRET and UPWORK_REDIRECT_URI. Until
                then the pipeline runs against sample data and cannot submit proposals.
              </AlertDescription>
            </Alert>
          ) : null}

          {props.connection ? (
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              {[
                ["Account", props.connection.profileName ?? "—"],
                ["Title", props.connection.profileTitle ?? "—"],
                ["Upwork user ID", props.connection.upworkUserId ?? "—"],
                ["Country", props.connection.countryCode ?? "—"],
                [
                  "Connects",
                  props.connection.connectsBalance !== null ? String(props.connection.connectsBalance) : "Unknown",
                ],
                ["Connected", formatDateTime(props.connection.connectedAt)],
                ["Last synced", props.connection.lastSyncedAt ? formatDateTime(props.connection.lastSyncedAt) : "—"],
                ["Token expires", props.connection.expiresAt ? formatDateTime(props.connection.expiresAt) : "—"],
                ["Scope", props.connection.scope ?? "—"],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <dt className="text-muted-foreground text-xs">{label}</dt>
                  <dd className="mt-0.5 font-medium">{String(value)}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-muted-foreground text-sm">
              Connect your Upwork account to search real marketplace jobs and submit approved proposals.
            </p>
          )}

          <div className="flex flex-wrap gap-2 border-t pt-4">
            {props.connected ? (
              <>
                <Button variant="outline" onClick={sync} disabled={syncing}>
                  {syncing ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <RefreshCwIcon className="size-4" />
                  )}
                  Refresh profile
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" className="text-destructive hover:text-destructive">
                      <UnplugIcon className="size-4" />
                      Disconnect
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Disconnect Upwork?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Stored tokens are deleted immediately. Discovery falls back to sample data and proposals can no
                        longer be submitted until you reconnect.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={disconnect} disabled={disconnecting}>
                        Disconnect
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            ) : (
              <Button asChild disabled={!props.configured}>
                <a href="/api/integrations/upwork/connect">
                  <PlugIcon className="size-4" />
                  Connect Upwork account
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What this integration can do</CardTitle>
          <CardDescription>Active provider: {props.providerName}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            ["Search marketplace jobs", props.capabilities.canSearchJobs],
            ["Read your Connects balance", props.capabilities.canReadConnects],
            ["Submit proposals", props.capabilities.canSubmitProposals],
            ["Attach documents to a proposal", props.capabilities.canAttachDocuments],
          ].map(([label, enabled]) => (
            <div key={String(label)} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{String(label)}</span>
              <Badge variant={enabled ? "success" : "muted"}>{enabled ? "Supported" : "Not available"}</Badge>
            </div>
          ))}

          <p className="text-muted-foreground border-t pt-4 text-xs leading-relaxed">{props.capabilities.notes}</p>
        </CardContent>
      </Card>

      <Alert variant="info">
        <AlertTriangleIcon />
        <AlertTitle>How this product treats Upwork</AlertTitle>
        <AlertDescription>
          Only the official, authorised API is used. There is no scraping, no browser automation against Upwork, no
          bypassing of platform limits, and no automatic proposal submission. Connects are spent only after you confirm
          an individual proposal.
        </AlertDescription>
      </Alert>
    </div>
  );
}
