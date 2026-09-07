import type { Metadata } from "next";
import { InfoIcon } from "lucide-react";
import { SearchProfileManager } from "@/components/settings/search-profiles";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { decimalToNumber } from "@/lib/format";

export const metadata: Metadata = { title: "Job preferences" };
export const dynamic = "force-dynamic";

export default async function JobPreferencesPage() {
  const user = await requireSessionUser();

  const profiles = await prisma.jobSearchProfile.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { jobs: true } } },
  });

  return (
    <div className="space-y-6">
      <Alert variant="info">
        <InfoIcon />
        <AlertTitle>Multiple profiles, one run</AlertTitle>
        <AlertDescription>
          Every active profile is searched on each run and the results are de-duplicated before scoring, so overlapping
          niches never produce duplicate jobs.
        </AlertDescription>
      </Alert>

      <SearchProfileManager
        profiles={profiles.map((profile) => ({
          id: profile.id,
          name: profile.name,
          isActive: profile.isActive,
          keywords: profile.keywords,
          includeKeywords: profile.includeKeywords,
          excludeKeywords: profile.excludeKeywords,
          skills: profile.skills,
          minFixedBudget: decimalToNumber(profile.minFixedBudget),
          minHourlyRate: decimalToNumber(profile.minHourlyRate),
          maxHourlyRate: decimalToNumber(profile.maxHourlyRate),
          maxJobAgeHours: profile.maxJobAgeHours,
          minClientHireRate: profile.minClientHireRate,
          minClientSpend: decimalToNumber(profile.minClientSpend),
          paymentVerifiedOnly: profile.paymentVerifiedOnly,
          minClientRating: decimalToNumber(profile.minClientRating),
          maxProposals: profile.maxProposals,
          countries: profile.countries,
          excludedCountries: profile.excludedCountries,
          experienceLevels: profile.experienceLevels,
          projectType: profile.projectType,
          durations: profile.durations,
          resultLimit: profile.resultLimit,
          jobCount: profile._count.jobs,
        }))}
      />
    </div>
  );
}
