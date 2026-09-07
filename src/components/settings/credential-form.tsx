"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2Icon, Loader2Icon, ShieldCheckIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateTime } from "@/lib/format";

export type CredentialProvider = "CLAUDE" | "GITHUB" | "VERCEL" | "EMAIL";

export interface CredentialFormProps {
  provider: CredentialProvider;
  title: string;
  description: string;
  secretLabel: string;
  secretPlaceholder: string;
  helpText: string;
  configured: boolean;
  label: string | null;
  lastVerifiedAt: Date | null;
  metadata: Record<string, unknown> | null;
  platformFallback: boolean;
}

export function CredentialForm(props: CredentialFormProps) {
  const router = useRouter();
  const metadata = props.metadata ?? {};

  const [secret, setSecret] = useState("");
  const [owner, setOwner] = useState(String(metadata.owner ?? ""));
  const [teamId, setTeamId] = useState(String(metadata.teamId ?? ""));
  const [transport, setTransport] = useState<"resend" | "smtp">(
    (metadata.provider as "resend" | "smtp") ?? "resend",
  );
  const [from, setFrom] = useState(String(metadata.from ?? ""));
  const [host, setHost] = useState(String(metadata.host ?? ""));
  const [port, setPort] = useState(String(metadata.port ?? "587"));
  const [smtpUser, setSmtpUser] = useState(String(metadata.user ?? ""));
  const [secure, setSecure] = useState(Boolean(metadata.secure));
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  function payload(): Record<string, unknown> {
    switch (props.provider) {
      case "CLAUDE":
        return { provider: "CLAUDE", apiKey: secret };
      case "GITHUB":
        return { provider: "GITHUB", token: secret, owner: owner || null };
      case "VERCEL":
        return { provider: "VERCEL", token: secret, teamId: teamId || null };
      case "EMAIL":
        return {
          provider: "EMAIL",
          transport,
          secret,
          from,
          host: transport === "smtp" ? host : null,
          port: transport === "smtp" ? Number(port) : null,
          user: transport === "smtp" ? smtpUser : null,
          secure: transport === "smtp" ? secure : false,
        };
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    try {
      const response = await fetch("/api/integrations/credentials", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload()),
      });
      const result = await response.json();

      if (!response.ok) {
        toast.error(result?.error?.message ?? "Those credentials were not accepted.");
        return;
      }

      toast.success(
        result?.data?.detail ? `Verified — connected as ${result.data.detail}` : "Credentials saved and verified",
      );
      setSecret("");
      router.refresh();
    } catch {
      toast.error("Those credentials could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setRemoving(true);
    try {
      const response = await fetch(`/api/integrations/credentials?provider=${props.provider}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        toast.error("Could not remove these credentials.");
        return;
      }
      toast.success("Credentials removed");
      router.refresh();
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>{props.title}</CardTitle>
              <CardDescription>{props.description}</CardDescription>
            </div>
            <Badge variant={props.configured ? "success" : props.platformFallback ? "secondary" : "muted"}>
              {props.configured ? "Configured" : props.platformFallback ? "Using platform key" : "Not configured"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {props.configured ? (
            <Alert variant="success">
              <CheckCircle2Icon />
              <AlertDescription>
                {props.label ? `Connected as ${props.label}. ` : ""}
                {props.lastVerifiedAt ? `Last verified ${formatDateTime(props.lastVerifiedAt)}.` : ""}
              </AlertDescription>
            </Alert>
          ) : null}

          <form className="space-y-4" onSubmit={submit}>
            {props.provider === "EMAIL" ? (
              <div className="space-y-2">
                <Label htmlFor="transport">Transport</Label>
                <Select value={transport} onValueChange={(value) => setTransport(value as "resend" | "smtp")}>
                  <SelectTrigger id="transport">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resend">Resend</SelectItem>
                    <SelectItem value="smtp">SMTP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="secret">{props.secretLabel}</Label>
              <Input
                id="secret"
                type="password"
                autoComplete="off"
                placeholder={props.configured ? "Enter a new value to replace the stored one" : props.secretPlaceholder}
                value={secret}
                onChange={(event) => setSecret(event.target.value)}
                required
              />
              <p className="text-muted-foreground text-xs">{props.helpText}</p>
            </div>

            {props.provider === "GITHUB" ? (
              <div className="space-y-2">
                <Label htmlFor="owner">Organisation or user (optional)</Label>
                <Input
                  id="owner"
                  value={owner}
                  onChange={(event) => setOwner(event.target.value)}
                  placeholder="Leave blank to use your personal account"
                />
              </div>
            ) : null}

            {props.provider === "VERCEL" ? (
              <div className="space-y-2">
                <Label htmlFor="teamId">Team ID (optional)</Label>
                <Input
                  id="teamId"
                  value={teamId}
                  onChange={(event) => setTeamId(event.target.value)}
                  placeholder="team_xxxxxxxx"
                />
              </div>
            ) : null}

            {props.provider === "EMAIL" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="from">From address</Label>
                  <Input
                    id="from"
                    value={from}
                    onChange={(event) => setFrom(event.target.value)}
                    placeholder="Job Hunter <alerts@yourdomain.com>"
                    required
                  />
                </div>

                {transport === "smtp" ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="host">SMTP host</Label>
                      <Input id="host" value={host} onChange={(event) => setHost(event.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="port">Port</Label>
                      <Input
                        id="port"
                        type="number"
                        value={port}
                        onChange={(event) => setPort(event.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtpUser">Username</Label>
                      <Input id="smtpUser" value={smtpUser} onChange={(event) => setSmtpUser(event.target.value)} />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <Label htmlFor="secure">TLS on connect</Label>
                      <Switch id="secure" checked={secure} onCheckedChange={setSecure} />
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving || secret.length === 0}>
                {saving ? <Loader2Icon className="size-4 animate-spin" /> : <ShieldCheckIcon className="size-4" />}
                {saving ? "Verifying…" : "Save and verify"}
              </Button>

              {props.configured ? (
                <Button type="button" variant="ghost" onClick={remove} disabled={removing}>
                  <Trash2Icon className="size-4" />
                  Remove
                </Button>
              ) : null}
            </div>
          </form>

          <p className="text-muted-foreground border-t pt-4 text-xs leading-relaxed">
            Secrets are encrypted with AES-256-GCM before they touch the database and are never returned to the
            browser. Only the server decrypts them, at the moment of use.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
