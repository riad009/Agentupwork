import type { Metadata } from "next";
import { CredentialSettings } from "@/components/settings/credential-page";
import { requireSessionUser } from "@/lib/session";

export const metadata: Metadata = { title: "Claude AI" };
export const dynamic = "force-dynamic";

export default async function CLAUDESettingsPage() {
  const user = await requireSessionUser();

  return (
    <CredentialSettings
      userId={user.id}
      provider="CLAUDE"
      title="Claude AI"
      description="Used for job scoring, proposal writing, demo planning and the client brief."
      secretLabel="Anthropic API key"
      secretPlaceholder="sk-ant-…"
      helpText="Create a key at console.anthropic.com. Without one, the platform key is used if an administrator configured it."
      platformFallback={Boolean(process.env.ANTHROPIC_API_KEY)}
    />
  );
}
