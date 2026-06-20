import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-sm)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p
        className={cn(
          "tnum mt-2 text-[28px] font-semibold leading-none tracking-tight",
          accent ? "text-brand" : "text-fg",
        )}
      >
        {value}
      </p>
      {sub && <span className="mt-2 block text-xs text-faint">{sub}</span>}
    </div>
  );
}
