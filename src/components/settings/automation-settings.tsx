"use client";

import { useMemo, useState } from "react";
import { AlertTriangleIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  NumberRow,
  SaveBar,
  SettingRow,
  SettingsSection,
  ToggleRow,
  useSavePreferences,
} from "@/components/settings/preference-controls";

export type AutomationSettingsValues = {
  automationEnabled: boolean;
  scheduleFrequency: "MANUAL" | "HOURLY" | "EVERY_3_HOURS" | "EVERY_6_HOURS" | "DAILY";
  maxJobsPerRun: number;
  topJobsCount: number;
  demoGenerationEnabled: boolean;
  demoAutoThreshold: number;
  demoSuggestThreshold: number;
  proposalOnlyThreshold: number;
  demoValueScoreMinimum: number;
  maxDemosPerRun: number;
  maxDemoPages: number;
  maxDemoIterations: number;
  maxBuildFixAttempts: number;
  maxScreenshots: number;
  generatePdf: boolean;
  weightSkillMatch: number;
  weightClientQuality: number;
  weightBudget: number;
  weightCompetition: number;
  weightWinProb: number;
  weightRecency: number;
};

const FREQUENCIES = [
  { value: "MANUAL", label: "Manual only" },
  { value: "HOURLY", label: "Every hour" },
  { value: "EVERY_3_HOURS", label: "Every 3 hours" },
  { value: "EVERY_6_HOURS", label: "Every 6 hours" },
  { value: "DAILY", label: "Once daily" },
] as const;

export function AutomationSettings({ initial }: { initial: AutomationSettingsValues }) {
  const [values, setValues] = useState(initial);
  const { save, saving } = useSavePreferences();

  const dirty = useMemo(
    () => JSON.stringify(values) !== JSON.stringify(initial),
    [values, initial],
  );

  const weightTotal =
    values.weightSkillMatch +
    values.weightClientQuality +
    values.weightBudget +
    values.weightCompetition +
    values.weightWinProb +
    values.weightRecency;

  function set<K extends keyof AutomationSettingsValues>(key: K, value: AutomationSettingsValues[K]) {
    setValues((previous) => ({ ...previous, [key]: value }));
  }

  return (
    <div className="max-w-3xl space-y-6">
      <SettingsSection
        title="Schedule"
        description="How often the pipeline discovers, scores and prepares proposals. Submission is never automatic."
      >
        <ToggleRow
          label="Automation enabled"
          hint="When off, runs only happen when you trigger them manually."
          checked={values.automationEnabled}
          onChange={(value) => set("automationEnabled", value)}
        />
        <SettingRow label="Frequency" hint="The scheduler checks every five minutes for users that are due.">
          <Select
            value={values.scheduleFrequency}
            onValueChange={(value) => set("scheduleFrequency", value as AutomationSettingsValues["scheduleFrequency"])}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FREQUENCIES.map((frequency) => (
                <SelectItem key={frequency.value} value={frequency.value}>
                  {frequency.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
        <NumberRow
          label="Jobs fetched per run"
          hint="Upper bound across all active search profiles."
          value={values.maxJobsPerRun}
          onChange={(value) => set("maxJobsPerRun", value)}
          min={1}
          max={100}
        />
        <SettingRow label="Top jobs selected" hint="How many opportunities get a proposal each run.">
          <Select value={String(values.topJobsCount)} onValueChange={(value) => set("topJobsCount", Number(value))}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">Top 5</SelectItem>
              <SelectItem value="10">Top 10</SelectItem>
              <SelectItem value="20">Top 20</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
      </SettingsSection>

      <SettingsSection
        title="Demo generation thresholds"
        description="Demos cost tokens and build minutes, so they are gated on score and value."
      >
        <ToggleRow
          label="Generate demos"
          hint="When off, proposals are still prepared but no prototypes are built."
          checked={values.demoGenerationEnabled}
          onChange={(value) => set("demoGenerationEnabled", value)}
        />
        <NumberRow
          label="Auto-build score"
          hint="A job must score at least this to have a demo built automatically."
          value={values.demoAutoThreshold}
          onChange={(value) => set("demoAutoThreshold", value)}
          min={0}
          max={100}
          suffix="/100"
        />
        <NumberRow
          label="Demo consideration score"
          hint="Below this score a demo is not even considered."
          value={values.demoSuggestThreshold}
          onChange={(value) => set("demoSuggestThreshold", value)}
          min={0}
          max={100}
          suffix="/100"
        />
        <NumberRow
          label="Minimum score for generation spend"
          hint="Below this, no requirements extraction, brief or demo — proposal only."
          value={values.proposalOnlyThreshold}
          onChange={(value) => set("proposalOnlyThreshold", value)}
          min={0}
          max={100}
          suffix="/100"
        />
        <NumberRow
          label="Minimum demo value score"
          hint="The blended value gate that decides whether a demo is worth building."
          value={values.demoValueScoreMinimum}
          onChange={(value) => set("demoValueScoreMinimum", value)}
          min={0}
          max={100}
          suffix="/100"
        />
        <NumberRow
          label="Maximum demos per run"
          value={values.maxDemosPerRun}
          onChange={(value) => set("maxDemosPerRun", value)}
          min={0}
          max={10}
        />
      </SettingsSection>

      <SettingsSection
        title="Demo cost limits"
        description="Hard ceilings that keep every generated demo small and cheap."
      >
        <NumberRow
          label="Maximum screens"
          value={values.maxDemoPages}
          onChange={(value) => set("maxDemoPages", value)}
          min={1}
          max={7}
        />
        <NumberRow
          label="Maximum repair iterations"
          value={values.maxDemoIterations}
          onChange={(value) => set("maxDemoIterations", value)}
          min={1}
          max={5}
        />
        <NumberRow
          label="Maximum build fix attempts"
          value={values.maxBuildFixAttempts}
          onChange={(value) => set("maxBuildFixAttempts", value)}
          min={1}
          max={5}
        />
        <NumberRow
          label="Maximum screenshots"
          value={values.maxScreenshots}
          onChange={(value) => set("maxScreenshots", value)}
          min={1}
          max={6}
        />
        <ToggleRow
          label="Generate the client brief PDF"
          hint="A designed, project-specific brief rendered from the job description and demo."
          checked={values.generatePdf}
          onChange={(value) => set("generatePdf", value)}
        />
      </SettingsSection>

      <SettingsSection
        title="Ranking weights"
        description="Relative importance of each signal. Values are normalised, so only the ratio matters."
      >
        <NumberRow
          label="Skill match"
          value={values.weightSkillMatch}
          onChange={(value) => set("weightSkillMatch", value)}
          min={0}
          max={100}
        />
        <NumberRow
          label="Client quality"
          value={values.weightClientQuality}
          onChange={(value) => set("weightClientQuality", value)}
          min={0}
          max={100}
        />
        <NumberRow
          label="Budget"
          value={values.weightBudget}
          onChange={(value) => set("weightBudget", value)}
          min={0}
          max={100}
        />
        <NumberRow
          label="Competition"
          value={values.weightCompetition}
          onChange={(value) => set("weightCompetition", value)}
          min={0}
          max={100}
        />
        <NumberRow
          label="Winning probability"
          value={values.weightWinProb}
          onChange={(value) => set("weightWinProb", value)}
          min={0}
          max={100}
        />
        <NumberRow
          label="Job recency"
          value={values.weightRecency}
          onChange={(value) => set("weightRecency", value)}
          min={0}
          max={100}
        />
      </SettingsSection>

      {weightTotal === 0 ? (
        <Alert variant="warning">
          <AlertTriangleIcon />
          <AlertTitle>All weights are zero</AlertTitle>
          <AlertDescription>Ranking would fall back to the built-in defaults.</AlertDescription>
        </Alert>
      ) : null}

      <SaveBar saving={saving} dirty={dirty} onSave={() => save(values, "Automation settings saved")} />
    </div>
  );
}
