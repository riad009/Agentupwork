import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function scoreTone(score: number): "success" | "default" | "warning" | "muted" {
  if (score >= 85) return "success";
  if (score >= 70) return "default";
  if (score >= 50) return "warning";
  return "muted";
}

export function ScoreBadge({ score, className }: { score: number | null | undefined; className?: string }) {
  if (score === null || score === undefined) {
    return (
      <Badge variant="muted" className={className}>
        —
      </Badge>
    );
  }

  return (
    <Badge variant={scoreTone(score)} className={cn("tabular-nums", className)}>
      {score}
    </Badge>
  );
}

export function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const tone = scoreTone(clamped);
  const strokeColor =
    tone === "success"
      ? "var(--color-success)"
      : tone === "default"
        ? "var(--color-primary)"
        : tone === "warning"
          ? "var(--color-warning)"
          : "var(--color-muted-foreground)";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-muted)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute text-sm font-semibold tabular-nums">{clamped}</span>
    </div>
  );
}
