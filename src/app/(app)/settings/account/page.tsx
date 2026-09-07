import type { Metadata } from "next";
import { PasswordForm, ProfileForm } from "@/components/settings/account-forms";
import { requireSessionUser } from "@/lib/session";

export const metadata: Metadata = { title: "Account settings" };

export default async function AccountSettingsPage() {
  const user = await requireSessionUser();

  return (
    <div className="max-w-2xl space-y-6">
      <ProfileForm name={user.name ?? ""} email={user.email} role={user.role} />
      <PasswordForm />
    </div>
  );
}
