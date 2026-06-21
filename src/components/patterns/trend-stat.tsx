import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export function TrendStat({
  label,
  value,
  delta,
  unit = "%",
  goodWhenDown = false,
  caption = "vs. período anterior",
}: {
  label: string;
  value: string;
  delta: number | null;
  unit?: string;
  goodWhenDown?: boolean;
  caption?: string;
}) {
  const has = delta !== null && delta !== undefined;
  const flat = has && Math.abs(delta) < 0.05;
  const improved = has && (goodWhenDown ? delta < 0 : delta > 0);
  const Arrow = !has || flat ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  const deltaStr = has
    ? `${delta > 0 ? "+" : delta < 0 ? "−" : ""}${Math.abs(delta).toLocaleString("pt-BR", {
        maximumFractionDigits: unit === "dias" ? 0 : 1,
      })}${unit === "dias" ? " dias" : unit}`
    : "—";

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-sm)]">
      <p className="text-sm font-medium text-muted">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className="tnum text-[26px] font-semibold leading-none tracking-tight text-fg">{value}</p>
        <span
          className={cn(
            "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold",
            !has || flat ? "bg-surface-2 text-muted" : improved ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
          )}
        >
          <Arrow className="h-3.5 w-3.5" />
          <span className="tnum">{deltaStr}</span>
        </span>
      </div>
      <span className="mt-2 block text-xs text-faint">{caption}</span>
    </div>
  );
}
