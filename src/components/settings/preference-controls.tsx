"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, SaveIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function SettingRow({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-4 py-3", className)}>
      <div className="min-w-0 space-y-0.5">
        <Label className="text-sm font-medium">{label}</Label>
        {hint ? <p className="text-muted-foreground max-w-md text-xs leading-relaxed">{hint}</p> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <SettingRow label={label} hint={hint}>
      <Switch checked={checked} onCheckedChange={onChange} />
    </SettingRow>
  );
}

export function NumberRow({
  label,
  hint,
  value,
  onChange,
  min,
  max,
  suffix,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  return (
    <SettingRow label={label} hint={hint}>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          className="w-24 text-right"
          value={value}
          min={min}
          max={max}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        {suffix ? <span className="text-muted-foreground text-xs">{suffix}</span> : null}
      </div>
    </SettingRow>
  );
}

export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="divide-y">{children}</CardContent>
    </Card>
  );
}

/** Shared save handler for every preference form on the settings pages. */
export function useSavePreferences() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function save(payload: Record<string, unknown>, successMessage = "Settings saved") {
    setSaving(true);
    try {
      const response = await fetch("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok) {
        toast.error(result?.error?.message ?? "Could not save these settings.");
        return false;
      }

      toast.success(successMessage);
      router.refresh();
      return true;
    } catch {
      toast.error("Could not save these settings.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  return { save, saving };
}

export function SaveBar({ saving, onSave, dirty }: { saving: boolean; onSave: () => void; dirty: boolean }) {
  return (
    <div className="flex items-center justify-end gap-3">
      {dirty ? <span className="text-muted-foreground text-xs">Unsaved changes</span> : null}
      <Button onClick={onSave} disabled={saving || !dirty}>
        {saving ? <Loader2Icon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}
        Save changes
      </Button>
    </div>
  );
}
