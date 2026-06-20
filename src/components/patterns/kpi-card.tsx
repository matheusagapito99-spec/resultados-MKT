import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { type Kpi } from "@/lib/mock-data";
import { Sparkline } from "@/components/charts/sparkline";
import { cn } from "@/lib/utils";

export function KpiCard({ kpi }: { kpi: Kpi }) {
  // Um delta é "positivo" (verde) quando a métrica melhorou.
  const improved = kpi.goodWhenDown ? kpi.trend === "down" : kpi.trend === "up";
  const Arrow = kpi.trend === "up" ? ArrowUpRight : ArrowDownRight;
  const sparkColor = improved ? "var(--success)" : "var(--danger)";

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-sm)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-muted">{kpi.label}</p>
        <span
          className={cn(
            "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold",
            improved ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
          )}
        >
          <Arrow className="h-3.5 w-3.5" />
          <span className="tnum">{kpi.delta}</span>
        </span>
      </div>

      <p className="tnum mt-2 text-[28px] font-semibold leading-none tracking-tight text-fg">
        {kpi.value}
      </p>

      <div className="mt-4 h-8">
        <Sparkline data={kpi.spark} stroke={sparkColor} />
      </div>

      <span className="mt-2 block text-xs text-faint">vs. período anterior</span>
    </div>
  );
}
