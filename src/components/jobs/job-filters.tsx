"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SearchIcon, XIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const QUICK_FILTERS = [
  { key: "action", value: "HIGH_PRIORITY", label: "High priority" },
  { key: "action", value: "APPLY", label: "Apply" },
  { key: "action", value: "WATCH", label: "Watch" },
  { key: "action", value: "SKIP", label: "Skip" },
  { key: "demoRecommended", value: "true", label: "Demo recommended" },
  { key: "projectType", value: "FIXED", label: "Fixed" },
  { key: "projectType", value: "HOURLY", label: "Hourly" },
  { key: "paymentVerified", value: "true", label: "Payment verified" },
] as const;

export function JobFilters({ total }: { total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const apply = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") next.delete(key);
        else next.set(key, value);
      }
      next.delete("page");
      startTransition(() => router.push(`${pathname}?${next.toString()}`));
    },
    [params, pathname, router],
  );

  const activeCount = QUICK_FILTERS.filter((filter) => params.get(filter.key) === filter.value).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search job titles, descriptions and skills"
            className="pl-9"
            defaultValue={params.get("search") ?? ""}
            onKeyDown={(event) => {
              if (event.key === "Enter") apply({ search: event.currentTarget.value });
            }}
          />
        </div>

        <Select
          defaultValue={params.get("sort") ?? "score"}
          onValueChange={(value) => apply({ sort: value })}
        >
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="score">Best ranked</SelectItem>
            <SelectItem value="recent">Most recent</SelectItem>
            <SelectItem value="budget">Highest budget</SelectItem>
            <SelectItem value="proposals">Fewest proposals</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {QUICK_FILTERS.map((filter) => {
          const active = params.get(filter.key) === filter.value;
          return (
            <button
              key={`${filter.key}-${filter.value}`}
              type="button"
              onClick={() => apply({ [filter.key]: active ? null : filter.value })}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {filter.label}
            </button>
          );
        })}

        {activeCount > 0 || params.get("search") ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              apply({
                action: null,
                demoRecommended: null,
                projectType: null,
                paymentVerified: null,
                search: null,
              })
            }
          >
            <XIcon className="size-3.5" />
            Clear
          </Button>
        ) : null}

        <Badge variant="muted" className="ml-auto">
          {pending ? "Loading…" : `${total} jobs`}
        </Badge>
      </div>
    </div>
  );
}
