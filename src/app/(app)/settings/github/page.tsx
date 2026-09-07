import type { Metadata } from "next";
import { CredentialSettings } from "@/components/settings/credential-page";
import { requireSessionUser } from "@/lib/session";

export const metadata: Metadata = { title: "GitHub" };
export const dynamic = "force-dynamic";

export default async function GITHUBSettingsPage() {
  const user = await requireSessionUser();

  return (
    <CredentialSettings
      userId={user.id}
      provider="GITHUB"
      title="GitHub"
      description="Used to publish each generated demo to its own repository."
      secretLabel="Personal access token"
      secretPlaceholder="ghp_… or github_pat_…"
      helpText="Needs the repo scope so a public repository can be created and pushed."
      platformFallback={Boolean(process.env.GITHUB_TOKEN)}
    />
  );
}
