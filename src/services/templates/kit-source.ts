/**
 * Source of the shared component kit that every generated demo imports from
 * `@/components/kit`. Keeping it as a constant means the generator ships a
 * known-good, type-checked component surface instead of asking the model to
 * invent one, which is what keeps demo builds cheap and reliable.
 */
export const KIT_SOURCE = String.raw`import type { ReactNode } from "react";

function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cx(
        "rounded-xl border border-[var(--line)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("space-y-1 px-5 pt-5", className)}>{children}</div>;
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={cx("text-sm font-semibold text-[var(--ink)]", className)}>{children}</h3>;
}

export function CardDescription({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx("text-sm text-[var(--ink-muted)]", className)}>{children}</p>;
}

export function CardContent({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("px-5 py-5", className)}>{children}</div>;
}

export type Tone = "neutral" | "positive" | "warning" | "critical" | "info";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  positive: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warning: "bg-amber-50 text-amber-700 ring-amber-200",
  critical: "bg-rose-50 text-rose-700 ring-rose-200",
  info: "bg-[var(--brand-soft)] text-[var(--brand)] ring-[var(--brand-ring)]",
};

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        TONE_CLASSES[tone],
      )}
    >
      {children}
    </span>
  );
}

export function PageIntro({ title, description }: { title: string; description?: string }) {
  return (
    <header className="mb-6 space-y-1.5">
      <h1 className="text-2xl font-semibold tracking-tight text-[var(--ink)]">{title}</h1>
      {description ? <p className="max-w-2xl text-sm text-[var(--ink-muted)]">{description}</p> : null}
    </header>
  );
}

export function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-[var(--ink)]">{title}</h2>
        {description ? <p className="text-sm text-[var(--ink-muted)]">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function StatTile({
  label,
  value,
  delta,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: string | number;
  delta?: string;
  tone?: "positive" | "negative" | "neutral";
  icon?: ReactNode;
}) {
  const deltaClass =
    tone === "positive" ? "text-emerald-600" : tone === "negative" ? "text-rose-600" : "text-slate-500";

  return (
    <div className="rounded-xl border border-[var(--line)] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium tracking-wide text-[var(--ink-muted)] uppercase">{label}</p>
        {icon ? (
          <span className="flex size-8 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand)]">
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums text-[var(--ink)]">{value}</p>
      {delta ? <p className={cx("mt-1 text-xs font-medium", deltaClass)}>{delta}</p> : null}
    </div>
  );
}

export interface Column {
  key: string;
  header: string;
  align?: "left" | "right";
}

export type Row = Record<string, ReactNode>;

export function DataTable({ columns, rows }: { columns: Column[]; rows: Row[] }) {
  if (rows.length === 0) {
    return <EmptyState title="Nothing to show yet" description="Records will appear here once data is added." />;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-white">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--line)] bg-[var(--surface)]">
            {columns.map((column) => (
              <th
                key={column.key}
                className={cx(
                  "px-4 py-3 text-xs font-semibold tracking-wide text-[var(--ink-muted)] uppercase",
                  column.align === "right" ? "text-right" : "text-left",
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--surface)]">
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cx(
                    "px-4 py-3 text-[var(--ink)]",
                    column.align === "right" ? "text-right tabular-nums" : "text-left",
                  )}
                >
                  {row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Progress({ value, label }: { value: number; label?: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="space-y-1.5">
      {label ? (
        <div className="flex items-center justify-between text-xs text-[var(--ink-muted)]">
          <span>{label}</span>
          <span className="tabular-nums">{clamped}%</span>
        </div>
      ) : null}
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-[var(--brand)]" style={{ width: clamped + "%" }} />
      </div>
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--line)] bg-white px-6 py-12 text-center">
      <p className="text-sm font-medium text-[var(--ink)]">{title}</p>
      {description ? <p className="mt-1 text-sm text-[var(--ink-muted)]">{description}</p> : null}
    </div>
  );
}

export interface TimelineItem {
  title: string;
  meta?: string;
  description?: string;
}

export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="relative space-y-5 border-l border-[var(--line)] pl-6">
      {items.map((item, index) => (
        <li key={index} className="relative">
          <span className="absolute -left-[27px] top-1.5 size-2.5 rounded-full bg-[var(--brand)] ring-4 ring-white" />
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-medium text-[var(--ink)]">{item.title}</p>
            {item.meta ? <span className="text-xs text-[var(--ink-muted)]">{item.meta}</span> : null}
          </div>
          {item.description ? (
            <p className="mt-1 text-sm text-[var(--ink-muted)]">{item.description}</p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
`;
