import type { Metadata } from "next";
import { AutomationSettings } from "@/components/settings/automation-settings";
import { requireSessionUser } from "@/lib/session";
import { getOrCreatePreferences } from "@/features/pipeline/context";

export const metadata: Metadata = { title: "Automation settings" };
export const dynamic = "force-dynamic";

export default async function AutomationSettingsPage() {
  const user = await requireSessionUser();
  const preference = await getOrCreatePreferences(user.id);

  return (
    <AutomationSettings
      initial={{
        automationEnabled: preference.automationEnabled,
        scheduleFrequency: preference.scheduleFrequency,
        maxJobsPerRun: preference.maxJobsPerRun,
        topJobsCount: preference.topJobsCount,
        demoGenerationEnabled: preference.demoGenerationEnabled,
        demoAutoThreshold: preference.demoAutoThreshold,
        demoSuggestThreshold: preference.demoSuggestThreshold,
        proposalOnlyThreshold: preference.proposalOnlyThreshold,
        demoValueScoreMinimum: preference.demoValueScoreMinimum,
        maxDemosPerRun: preference.maxDemosPerRun,
        maxDemoPages: preference.maxDemoPages,
        maxDemoIterations: preference.maxDemoIterations,
        maxBuildFixAttempts: preference.maxBuildFixAttempts,
        maxScreenshots: preference.maxScreenshots,
        generatePdf: preference.generatePdf,
        weightSkillMatch: preference.weightSkillMatch,
        weightClientQuality: preference.weightClientQuality,
        weightBudget: preference.weightBudget,
        weightCompetition: preference.weightCompetition,
        weightWinProb: preference.weightWinProb,
        weightRecency: preference.weightRecency,
      }}
    />
  );
}
