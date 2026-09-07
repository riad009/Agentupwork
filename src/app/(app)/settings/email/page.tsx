import type { Metadata } from "next";
import { CredentialSettings } from "@/components/settings/credential-page";
import { requireSessionUser } from "@/lib/session";

export const metadata: Metadata = { title: "Email delivery" };
export const dynamic = "force-dynamic";

export default async function EMAILSettingsPage() {
  const user = await requireSessionUser();

  return (
    <CredentialSettings
      userId={user.id}
      provider="EMAIL"
      title="Email delivery"
      description="Used for proposal-ready alerts, automation failures and password resets."
      secretLabel="API key or SMTP password"
      secretPlaceholder="Resend API key or SMTP password"
      helpText="Choose Resend for the simplest setup, or SMTP if you already run a mail server."
      platformFallback={Boolean(process.env.RESEND_API_KEY)}
    />
  );
}
