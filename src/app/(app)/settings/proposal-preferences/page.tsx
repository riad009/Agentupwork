import type { Metadata } from "next";
import { ProposalSettings } from "@/components/settings/proposal-settings";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { getOrCreatePreferences } from "@/features/pipeline/context";
import { decimalToNumber } from "@/lib/format";

export const metadata: Metadata = { title: "Proposal preferences" };
export const dynamic = "force-dynamic";

export default async function ProposalPreferencesPage() {
  const user = await requireSessionUser();

  const [preference, profile] = await Promise.all([
    getOrCreatePreferences(user.id),
    prisma.aiProfile.findUnique({ where: { userId: user.id } }),
  ]);

  return (
    <ProposalSettings
      initialPreferences={{
        proposalTone: preference.proposalTone,
        proposalMaxWords: preference.proposalMaxWords,
        includeQuestions: preference.includeQuestions,
        signatureName: preference.signatureName ?? user.name ?? "",
        portfolioUrl: preference.portfolioUrl ?? "",
        companyName: preference.companyName ?? "",
      }}
      initialProfile={{
        professionalTitle: profile?.professionalTitle ?? "",
        yearsOfExperience: profile?.yearsOfExperience !== null && profile?.yearsOfExperience !== undefined
          ? String(profile.yearsOfExperience)
          : "",
        hourlyRate: decimalToNumber(profile?.hourlyRate)?.toString() ?? "",
        minimumBudget: decimalToNumber(profile?.minimumBudget)?.toString() ?? "",
        preferredProjectSize: profile?.preferredProjectSize ?? "",
        preferredTechnologies: (profile?.preferredTechnologies ?? []).join(", "),
        industries: (profile?.industries ?? []).join(", "),
        availability: profile?.availability ?? "",
        preferredTone: profile?.preferredTone ?? "",
        proposalLength: (profile?.proposalLength as "SHORT" | "MEDIUM" | "LONG") ?? "SHORT",
        countriesToAvoid: (profile?.countriesToAvoid ?? []).join(", "),
        bio: profile?.bio ?? "",
      }}
    />
  );
}
