"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, PencilIcon, PlusIcon, SearchIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { searchProfileSchema } from "@/schemas/search-profile";

export interface SearchProfileView {
  id: string;
  name: string;
  isActive: boolean;
  keywords: string[];
  includeKeywords: string[];
  excludeKeywords: string[];
  skills: string[];
  minFixedBudget: number | null;
  minHourlyRate: number | null;
  maxHourlyRate: number | null;
  maxJobAgeHours: number | null;
  minClientHireRate: number | null;
  minClientSpend: number | null;
  paymentVerifiedOnly: boolean;
  minClientRating: number | null;
  maxProposals: number | null;
  countries: string[];
  excludedCountries: string[];
  experienceLevels: string[];
  projectType: "FIXED" | "HOURLY" | "UNKNOWN";
  durations: string[];
  resultLimit: number;
  jobCount: number;
}

const EMPTY = {
  name: "",
  isActive: true,
  keywords: "",
  includeKeywords: "",
  excludeKeywords: "",
  skills: "",
  minFixedBudget: "",
  minHourlyRate: "",
  maxHourlyRate: "",
  maxJobAgeHours: "72",
  minClientHireRate: "",
  minClientSpend: "",
  paymentVerifiedOnly: true,
  minClientRating: "",
  maxProposals: "",
  countries: "",
  excludedCountries: "",
  experienceLevels: "ANY",
  projectType: "UNKNOWN" as "FIXED" | "HOURLY" | "UNKNOWN",
  durations: "",
  resultLimit: "50",
};

type FormState = typeof EMPTY;

function list(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function numberOrNull(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toForm(profile: SearchProfileView): FormState {
  return {
    name: profile.name,
    isActive: profile.isActive,
    keywords: profile.keywords.join(", "),
    includeKeywords: profile.includeKeywords.join(", "),
    excludeKeywords: profile.excludeKeywords.join(", "),
    skills: profile.skills.join(", "),
    minFixedBudget: profile.minFixedBudget?.toString() ?? "",
    minHourlyRate: profile.minHourlyRate?.toString() ?? "",
    maxHourlyRate: profile.maxHourlyRate?.toString() ?? "",
    maxJobAgeHours: profile.maxJobAgeHours?.toString() ?? "",
    minClientHireRate: profile.minClientHireRate?.toString() ?? "",
    minClientSpend: profile.minClientSpend?.toString() ?? "",
    paymentVerifiedOnly: profile.paymentVerifiedOnly,
    minClientRating: profile.minClientRating?.toString() ?? "",
    maxProposals: profile.maxProposals?.toString() ?? "",
    countries: profile.countries.join(", "),
    excludedCountries: profile.excludedCountries.join(", "),
    experienceLevels: profile.experienceLevels[0] ?? "ANY",
    projectType: profile.projectType,
    durations: profile.durations.join(", "),
    resultLimit: profile.resultLimit.toString(),
  };
}

export function SearchProfileManager({ profiles }: { profiles: SearchProfileView[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SearchProfileView | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function startCreate() {
    setEditing(null);
    setForm(EMPTY);
    setError(null);
    setOpen(true);
  }

  function startEdit(profile: SearchProfileView) {
    setEditing(profile);
    setForm(toForm(profile));
    setError(null);
    setOpen(true);
  }

  async function save() {
    setError(null);

    const payload = {
      name: form.name,
      isActive: form.isActive,
      keywords: list(form.keywords),
      includeKeywords: list(form.includeKeywords),
      excludeKeywords: list(form.excludeKeywords),
      skills: list(form.skills),
      minFixedBudget: numberOrNull(form.minFixedBudget),
      minHourlyRate: numberOrNull(form.minHourlyRate),
      maxHourlyRate: numberOrNull(form.maxHourlyRate),
      maxJobAgeHours: numberOrNull(form.maxJobAgeHours),
      minClientHireRate: numberOrNull(form.minClientHireRate),
      minClientSpend: numberOrNull(form.minClientSpend),
      paymentVerifiedOnly: form.paymentVerifiedOnly,
      minClientRating: numberOrNull(form.minClientRating),
      maxProposals: numberOrNull(form.maxProposals),
      countries: list(form.countries),
      excludedCountries: list(form.excludedCountries),
      experienceLevels: form.experienceLevels === "ANY" ? [] : [form.experienceLevels],
      projectType: form.projectType,
      durations: list(form.durations),
      resultLimit: Number(form.resultLimit) || 50,
    };

    const parsed = searchProfileSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the form and try again.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(editing ? `/api/search-profiles/${editing.id}` : "/api/search-profiles", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result?.error?.message ?? "Could not save this search profile.");
        return;
      }

      toast.success(editing ? "Search profile updated" : "Search profile created");
      setOpen(false);
      router.refresh();
    } catch {
      setError("Could not save this search profile.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    const response = await fetch(`/api/search-profiles/${id}`, { method: "DELETE" });
    if (!response.ok) {
      toast.error("Could not delete this search profile.");
      return;
    }
    toast.success("Search profile deleted");
    router.refresh();
  }

  async function toggleActive(profile: SearchProfileView, isActive: boolean) {
    const response = await fetch(`/api/search-profiles/${profile.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    if (!response.ok) {
      toast.error("Could not update this search profile.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button onClick={startCreate}>
          <PlusIcon className="size-4" />
          New search profile
        </Button>
      </div>

      {profiles.length === 0 ? (
        <EmptyState
          icon={SearchIcon}
          title="No search profiles yet"
          description="A search profile defines what the pipeline looks for. Create separate profiles for distinct niches, for example AI SaaS, Stripe work and Next.js full stack."
          action={
            <Button size="sm" onClick={startCreate}>
              Create your first profile
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4">
          {profiles.map((profile) => (
            <Card key={profile.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      {profile.name}
                      <Badge variant={profile.isActive ? "success" : "muted"}>
                        {profile.isActive ? "Active" : "Paused"}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {profile.jobCount} jobs discovered · fetches up to {profile.resultLimit} per run
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={profile.isActive}
                      onCheckedChange={(checked) => toggleActive(profile, checked)}
                    />
                    <Button size="icon-sm" variant="ghost" onClick={() => startEdit(profile)}>
                      <PencilIcon className="size-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon-sm" variant="ghost" className="text-destructive">
                          <Trash2Icon className="size-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete &ldquo;{profile.name}&rdquo;?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Jobs already discovered through it are kept; they simply lose their profile link.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove(profile.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {profile.keywords.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {profile.keywords.map((keyword) => (
                      <Badge key={keyword} variant="secondary" className="text-[10px]">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                ) : null}

                <dl className="text-muted-foreground grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    ["Minimum fixed budget", profile.minFixedBudget ? `$${profile.minFixedBudget}` : "any"],
                    ["Minimum hourly rate", profile.minHourlyRate ? `$${profile.minHourlyRate}/hr` : "any"],
                    ["Maximum job age", profile.maxJobAgeHours ? `${profile.maxJobAgeHours}h` : "any"],
                    [
                      "Minimum hire rate",
                      profile.minClientHireRate !== null ? `${profile.minClientHireRate}%` : "any",
                    ],
                    ["Minimum client spend", profile.minClientSpend ? `$${profile.minClientSpend}` : "any"],
                    ["Payment verified", profile.paymentVerifiedOnly ? "required" : "not required"],
                    ["Minimum rating", profile.minClientRating ? `${profile.minClientRating}★` : "any"],
                    ["Maximum proposals", profile.maxProposals ?? "any"],
                    ["Project type", profile.projectType === "UNKNOWN" ? "any" : profile.projectType],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="flex justify-between gap-2">
                      <dt>{label}</dt>
                      <dd className="text-foreground font-medium">{String(value)}</dd>
                    </div>
                  ))}
                </dl>

                {profile.excludeKeywords.length > 0 ? (
                  <p className="text-muted-foreground text-xs">
                    Excluding: {profile.excludeKeywords.join(", ")}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit search profile" : "New search profile"}</DialogTitle>
            <DialogDescription>
              Filters are applied both in the Upwork query and again locally, so results always respect them.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {error ? <p className="text-destructive text-sm">{error}</p> : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Profile name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(event) => set("name", event.target.value)}
                  placeholder="Full Stack SaaS Jobs"
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border px-3">
                <Label htmlFor="isActive">Active</Label>
                <Switch id="isActive" checked={form.isActive} onCheckedChange={(v) => set("isActive", v)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="keywords">Keywords (comma separated)</Label>
              <Input
                id="keywords"
                value={form.keywords}
                onChange={(event) => set("keywords", event.target.value)}
                placeholder="Next.js, React, TypeScript, SaaS, Stripe, Prisma, Claude"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="skills">Skills</Label>
                <Input
                  id="skills"
                  value={form.skills}
                  onChange={(event) => set("skills", event.target.value)}
                  placeholder="Node.js, PostgreSQL"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="includeKeywords">Must include all of</Label>
                <Input
                  id="includeKeywords"
                  value={form.includeKeywords}
                  onChange={(event) => set("includeKeywords", event.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="excludeKeywords">Exclude if any appear</Label>
                <Input
                  id="excludeKeywords"
                  value={form.excludeKeywords}
                  onChange={(event) => set("excludeKeywords", event.target.value)}
                  placeholder="WordPress, Wix, data entry"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="minFixedBudget">Minimum fixed budget ($)</Label>
                <Input
                  id="minFixedBudget"
                  type="number"
                  value={form.minFixedBudget}
                  onChange={(event) => set("minFixedBudget", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minHourlyRate">Minimum hourly ($)</Label>
                <Input
                  id="minHourlyRate"
                  type="number"
                  value={form.minHourlyRate}
                  onChange={(event) => set("minHourlyRate", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxHourlyRate">Maximum hourly ($)</Label>
                <Input
                  id="maxHourlyRate"
                  type="number"
                  value={form.maxHourlyRate}
                  onChange={(event) => set("maxHourlyRate", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxJobAgeHours">Maximum job age (hours)</Label>
                <Input
                  id="maxJobAgeHours"
                  type="number"
                  value={form.maxJobAgeHours}
                  onChange={(event) => set("maxJobAgeHours", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minClientHireRate">Minimum hire rate (%)</Label>
                <Input
                  id="minClientHireRate"
                  type="number"
                  value={form.minClientHireRate}
                  onChange={(event) => set("minClientHireRate", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minClientSpend">Minimum client spend ($)</Label>
                <Input
                  id="minClientSpend"
                  type="number"
                  value={form.minClientSpend}
                  onChange={(event) => set("minClientSpend", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minClientRating">Minimum rating (0–5)</Label>
                <Input
                  id="minClientRating"
                  type="number"
                  step="0.1"
                  value={form.minClientRating}
                  onChange={(event) => set("minClientRating", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxProposals">Maximum proposals</Label>
                <Input
                  id="maxProposals"
                  type="number"
                  value={form.maxProposals}
                  onChange={(event) => set("maxProposals", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="resultLimit">Results per run</Label>
                <Input
                  id="resultLimit"
                  type="number"
                  value={form.resultLimit}
                  onChange={(event) => set("resultLimit", event.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="projectType">Project type</Label>
                <Select
                  value={form.projectType}
                  onValueChange={(value) => set("projectType", value as FormState["projectType"])}
                >
                  <SelectTrigger id="projectType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNKNOWN">Any</SelectItem>
                    <SelectItem value="FIXED">Fixed price</SelectItem>
                    <SelectItem value="HOURLY">Hourly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="experienceLevels">Experience level</Label>
                <Select
                  value={form.experienceLevels}
                  onValueChange={(value) => set("experienceLevels", value)}
                >
                  <SelectTrigger id="experienceLevels">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ANY">Any</SelectItem>
                    <SelectItem value="ENTRY">Entry</SelectItem>
                    <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                    <SelectItem value="EXPERT">Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-lg border px-3">
                <Label htmlFor="paymentVerifiedOnly">Payment verified only</Label>
                <Switch
                  id="paymentVerifiedOnly"
                  checked={form.paymentVerifiedOnly}
                  onCheckedChange={(value) => set("paymentVerifiedOnly", value)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="countries">Client countries</Label>
                <Input
                  id="countries"
                  value={form.countries}
                  onChange={(event) => set("countries", event.target.value)}
                  placeholder="United States, United Kingdom"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="excludedCountries">Excluded countries</Label>
                <Input
                  id="excludedCountries"
                  value={form.excludedCountries}
                  onChange={(event) => set("excludedCountries", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="durations">Project durations</Label>
                <Input
                  id="durations"
                  value={form.durations}
                  onChange={(event) => set("durations", event.target.value)}
                  placeholder="1 to 3 months, 3 to 6 months"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2Icon className="size-4 animate-spin" /> : null}
              {editing ? "Save changes" : "Create profile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
