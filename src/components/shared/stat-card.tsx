import type { LucideIcon } from "lucide-react";
import { ArrowDownRightIcon, ArrowUpRightIcon, MinusIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  hint?: string;
  trend?: { value: number; label?: string } | null;
  accent?: "default" | "primary" | "success" | "warning" | "destructive";
}

const accentClasses: Record<NonNullable<StatCardProps["accent"]>, string> = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary",
  success: "bg-success/15 text-success",
  warning: "bg-warning/20 text-warning-foreground",
  destructive: "bg-destructive/10 text-destructive",
};

export function StatCard({ label, value, icon: Icon, hint, trend, accent = "default" }: StatCardProps) {
  const TrendIcon = !trend ? MinusIcon : trend.value > 0 ? ArrowUpRightIcon : trend.value < 0 ? ArrowDownRightIcon : MinusIcon;
  const trendColor = !trend
    ? "text-muted-foreground"
    : trend.value > 0
      ? "text-success"
      : trend.value < 0
        ? "text-destructive"
        : "text-muted-foreground";

  return (
    <Card className="gap-0 py-5">
      <CardContent className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</p>
          <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
          {trend ? (
            <p className={cn("flex items-center gap-1 text-xs font-medium", trendColor)}>
              <TrendIcon className="size-3.5" />
              {Math.abs(trend.value)}%{trend.label ? <span className="text-muted-foreground font-normal">{trend.label}</span> : null}
            </p>
          ) : hint ? (
            <p className="text-muted-foreground text-xs">{hint}</p>
          ) : null}
        </div>
        {Icon ? (
          <div className={cn("flex size-9 items-center justify-center rounded-lg", accentClasses[accent])}>
            <Icon className="size-4.5" />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
