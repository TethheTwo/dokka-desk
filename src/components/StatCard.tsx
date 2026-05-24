import type { LucideIcon } from "lucide-react";

export interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: "blue" | "green" | "amber" | "red" | "violet" | "teal" | "slate";
}

const TONES: Record<NonNullable<StatCardProps["tone"]>, { bg: string; fg: string }> = {
  blue: { bg: "#dbeafe", fg: "#1d4ed8" },
  green: { bg: "#d1fae5", fg: "#047857" },
  amber: { bg: "#fef3c7", fg: "#b45309" },
  red: { bg: "#fee2e2", fg: "#b91c1c" },
  violet: { bg: "#ede9fe", fg: "#6d28d9" },
  teal: { bg: "#cffafe", fg: "#0e7490" },
  slate: { bg: "#e2e8f0", fg: "#334155" },
};

export function StatCard({ label, value, icon: Icon, tone = "blue" }: StatCardProps) {
  const t = TONES[tone];
  return (
    <div className="bg-card border border-border rounded-xl shadow-sm p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span
          className="inline-flex items-center justify-center h-9 w-9 rounded-full shrink-0"
          style={{ backgroundColor: t.bg, color: t.fg }}
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={2.25} />
        </span>
      </div>
      <div className="mt-3 text-2xl font-bold tracking-tight text-foreground tabular-nums">
        {value}
      </div>
    </div>
  );
}
