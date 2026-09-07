"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, SaveIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NumberRow, SettingRow, SettingsSection, ToggleRow } from "@/components/settings/preference-controls";

export type ProposalSettingsValues = {
  proposalTone: string;
  proposalMaxWords: number;
  includeQuestions: boolean;
  signatureName: string;
  portfolioUrl: string;
  companyName: string;
};

export type AiProfileValues = {
  professionalTitle: string;
  yearsOfExperience: string;
  hourlyRate: string;
  minimumBudget: string;
  preferredProjectSize: string;
  preferredTechnologies: string;
  industries: string;
  availability: string;
  preferredTone: string;
  proposalLength: "SHORT" | "MEDIUM" | "LONG";
  countriesToAvoid: string;
  bio: string;
};

function toList(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function toNumberOrNull(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function ProposalSettings({
  initialPreferences,
  initialProfile,
}: {
  initialPreferences: ProposalSettingsValues;
  initialProfile: AiProfileValues;
}) {
  const router = useRouter();
  const [preferences, setPreferences] = useState(initialPreferences);
  const [profile, setProfile] = useState(initialProfile);
  const [saving, setSaving] = useState(false);

  const dirty = useMemo(
    () =>
      JSON.stringify(preferences) !== JSON.stringify(initialPreferences) ||
      JSON.stringify(profile) !== JSON.stringify(initialProfile),
    [preferences, profile, initialPreferences, initialProfile],
  );

  function setPreference<K extends keyof ProposalSettingsValues>(key: K, value: ProposalSettingsValues[K]) {
    setPreferences((previous) => ({ ...previous, [key]: value }));
  }

  function setProfileValue<K extends keyof AiProfileValues>(key: K, value: AiProfileValues[K]) {
    setProfile((previous) => ({ ...previous, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      const [preferenceResponse, profileResponse] = await Promise.all([
        fetch("/api/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            proposalTone: preferences.proposalTone,
            proposalMaxWords: preferences.proposalMaxWords,
            includeQuestions: preferences.includeQuestions,
            signatureName: preferences.signatureName || null,
            portfolioUrl: preferences.portfolioUrl || null,
            companyName: preferences.companyName || null,
          }),
        }),
        fetch("/api/ai-profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            professionalTitle: profile.professionalTitle || null,
            yearsOfExperience: toNumberOrNull(profile.yearsOfExperience),
            hourlyRate: toNumberOrNull(profile.hourlyRate),
            minimumBudget: toNumberOrNull(profile.minimumBudget),
            preferredProjectSize: profile.preferredProjectSize || null,
            preferredTechnologies: toList(profile.preferredTechnologies),
            industries: toList(profile.industries),
            availability: profile.availability || null,
            preferredTone: profile.preferredTone || null,
            proposalLength: profile.proposalLength,
            countriesToAvoid: toList(profile.countriesToAvoid),
            bio: profile.bio || null,
          }),
        }),
      ]);

      if (!preferenceResponse.ok || !profileResponse.ok) {
        const failed = preferenceResponse.ok ? profileResponse : preferenceResponse;
        const payload = await failed.json();
        toast.error(payload?.error?.message ?? "Could not save these settings.");
        return;
      }

      toast.success("Proposal preferences saved");
      router.refresh();
    } catch {
      toast.error("Could not save these settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <SettingsSection title="Proposal style" description="Applied to every generated proposal.">
        <SettingRow label="Tone" hint="Described in plain language, e.g. direct, warm and technically specific.">
          <Input
            className="w-64"
            value={preferences.proposalTone}
            onChange={(event) => setPreference("proposalTone", event.target.value)}
          />
        </SettingRow>
        <NumberRow
          label="Maximum length"
          hint="Short proposals get read. 180–250 words is usually right."
          value={preferences.proposalMaxWords}
          onChange={(value) => setPreference("proposalMaxWords", value)}
          min={80}
          max={600}
          suffix="words"
        />
        <ToggleRow
          label="Include clarifying questions"
          hint="At most two, and only questions the job post does not already answer."
          checked={preferences.includeQuestions}
          onChange={(value) => setPreference("includeQuestions", value)}
        />
        <SettingRow label="Signature name" hint="How proposals sign off.">
          <Input
            className="w-64"
            value={preferences.signatureName}
            onChange={(event) => setPreference("signatureName", event.target.value)}
          />
        </SettingRow>
        <SettingRow label="Company name" hint="Shown on the generated client brief PDF.">
          <Input
            className="w-64"
            value={preferences.companyName}
            onChange={(event) => setPreference("companyName", event.target.value)}
          />
        </SettingRow>
        <SettingRow label="Portfolio URL" hint="Included on the closing page of the brief.">
          <Input
            className="w-64"
            value={preferences.portfolioUrl}
            onChange={(event) => setPreference("portfolioUrl", event.target.value)}
            placeholder="https://"
          />
        </SettingRow>
      </SettingsSection>

      <Card>
        <CardHeader>
          <CardTitle>AI profile context</CardTitle>
          <CardDescription>
            Everything here is injected into the prompt for scoring and proposal writing. Claude may not claim anything
            beyond this and your portfolio.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="professionalTitle">Professional title</Label>
              <Input
                id="professionalTitle"
                value={profile.professionalTitle}
                onChange={(event) => setProfileValue("professionalTitle", event.target.value)}
                placeholder="Full Stack SaaS Developer"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="yearsOfExperience">Years of experience</Label>
              <Input
                id="yearsOfExperience"
                type="number"
                value={profile.yearsOfExperience}
                onChange={(event) => setProfileValue("yearsOfExperience", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hourlyRate">Hourly rate (USD)</Label>
              <Input
                id="hourlyRate"
                type="number"
                value={profile.hourlyRate}
                onChange={(event) => setProfileValue("hourlyRate", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minimumBudget">Minimum budget (USD)</Label>
              <Input
                id="minimumBudget"
                type="number"
                value={profile.minimumBudget}
                onChange={(event) => setProfileValue("minimumBudget", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preferredProjectSize">Preferred project size</Label>
              <Input
                id="preferredProjectSize"
                value={profile.preferredProjectSize}
                onChange={(event) => setProfileValue("preferredProjectSize", event.target.value)}
                placeholder="$3k–$15k, 4–10 weeks"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="availability">Availability</Label>
              <Input
                id="availability"
                value={profile.availability}
                onChange={(event) => setProfileValue("availability", event.target.value)}
                placeholder="30 hours per week, starting immediately"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proposalLength">Proposal length</Label>
              <Select
                value={profile.proposalLength}
                onValueChange={(value) => setProfileValue("proposalLength", value as AiProfileValues["proposalLength"])}
              >
                <SelectTrigger id="proposalLength">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SHORT">Short</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LONG">Long</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="preferredTone">Preferred tone override</Label>
              <Input
                id="preferredTone"
                value={profile.preferredTone}
                onChange={(event) => setProfileValue("preferredTone", event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferredTechnologies">Preferred technologies (comma separated)</Label>
            <Input
              id="preferredTechnologies"
              value={profile.preferredTechnologies}
              onChange={(event) => setProfileValue("preferredTechnologies", event.target.value)}
              placeholder="Next.js, TypeScript, Prisma, Stripe"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="industries">Target industries (comma separated)</Label>
            <Input
              id="industries"
              value={profile.industries}
              onChange={(event) => setProfileValue("industries", event.target.value)}
              placeholder="AI SaaS, FinTech, Healthcare"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="countriesToAvoid">Countries to avoid (comma separated)</Label>
            <Input
              id="countriesToAvoid"
              value={profile.countriesToAvoid}
              onChange={(event) => setProfileValue("countriesToAvoid", event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              rows={4}
              value={profile.bio}
              onChange={(event) => setProfileValue("bio", event.target.value)}
              placeholder="A short, factual summary of what you build and who you build it for."
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        {dirty ? <span className="text-muted-foreground text-xs">Unsaved changes</span> : null}
        <Button onClick={save} disabled={saving || !dirty}>
          {saving ? <Loader2Icon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}
          Save changes
        </Button>
      </div>
    </div>
  );
}
