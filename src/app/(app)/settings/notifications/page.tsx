import type { Metadata } from "next";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { requireSessionUser } from "@/lib/session";
import { getOrCreatePreferences } from "@/features/pipeline/context";

export const metadata: Metadata = { title: "Notification settings" };
export const dynamic = "force-dynamic";

export default async function NotificationSettingsPage() {
  const user = await requireSessionUser();
  const preference = await getOrCreatePreferences(user.id);

  return (
    <NotificationSettings
      initial={{
        emailNotifications: preference.emailNotifications,
        notifyOnProposalsReady: preference.notifyOnProposalsReady,
        notifyOnAutomationError: preference.notifyOnAutomationError,
        notifyOnSubmission: preference.notifyOnSubmission,
        digestOnly: preference.digestOnly,
      }}
    />
  );
}
