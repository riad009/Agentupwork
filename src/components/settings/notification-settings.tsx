"use client";

import { useMemo, useState } from "react";
import {
  SaveBar,
  SettingsSection,
  ToggleRow,
  useSavePreferences,
} from "@/components/settings/preference-controls";

export type NotificationSettingsValues = {
  emailNotifications: boolean;
  notifyOnProposalsReady: boolean;
  notifyOnAutomationError: boolean;
  notifyOnSubmission: boolean;
  digestOnly: boolean;
};

export function NotificationSettings({ initial }: { initial: NotificationSettingsValues }) {
  const [values, setValues] = useState(initial);
  const { save, saving } = useSavePreferences();

  const dirty = useMemo(() => JSON.stringify(values) !== JSON.stringify(initial), [values, initial]);

  function set<K extends keyof NotificationSettingsValues>(key: K, value: NotificationSettingsValues[K]) {
    setValues((previous) => ({ ...previous, [key]: value }));
  }

  return (
    <div className="max-w-2xl space-y-6">
      <SettingsSection title="Email notifications" description="Delivery uses whatever you configured under Email.">
        <ToggleRow
          label="Email notifications"
          hint="Master switch. When off, nothing is emailed except password resets."
          checked={values.emailNotifications}
          onChange={(value) => set("emailNotifications", value)}
        />
        <ToggleRow
          label="Proposals ready for review"
          hint="Sent at the end of a run that prepared at least one proposal."
          checked={values.notifyOnProposalsReady}
          onChange={(value) => set("notifyOnProposalsReady", value)}
        />
        <ToggleRow
          label="Automation failures"
          hint="Sent when a run fails. No Connects are ever spent by a failed run."
          checked={values.notifyOnAutomationError}
          onChange={(value) => set("notifyOnAutomationError", value)}
        />
        <ToggleRow
          label="Submission results"
          hint="Confirms what was submitted and how many Connects it cost."
          checked={values.notifyOnSubmission}
          onChange={(value) => set("notifyOnSubmission", value)}
        />
        <ToggleRow
          label="Digest only"
          hint="Group run results into a single summary rather than individual alerts."
          checked={values.digestOnly}
          onChange={(value) => set("digestOnly", value)}
        />
      </SettingsSection>

      <SaveBar saving={saving} dirty={dirty} onSave={() => save(values, "Notification preferences saved")} />
    </div>
  );
}
