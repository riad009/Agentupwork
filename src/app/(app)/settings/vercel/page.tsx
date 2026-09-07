import type { Metadata } from "next";
import { CredentialSettings } from "@/components/settings/credential-page";
import { requireSessionUser } from "@/lib/session";

export const metadata: Metadata = { title: "Vercel" };
export const dynamic = "force-dynamic";

export default async function VERCELSettingsPage() {
  const user = await requireSessionUser();

  return (
    <CredentialSettings
      userId={user.id}
      provider="VERCEL"
      title="Vercel"
      description="Used to deploy generated demos and read their build status."
      secretLabel="Vercel access token"
      secretPlaceholder="Vercel token"
      helpText="Create a token in Vercel account settings. Without it, demos are generated but never deployed."
      platformFallback={Boolean(process.env.VERCEL_TOKEN)}
    />
  );
}
