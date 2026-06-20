import { type FunnelStage } from "@/lib/mock-data";
import { formatNumber, cn } from "@/lib/utils";

export function FunnelChart({ stages }: { stages: FunnelStage[] }) {
  const top = stages[0]?.count ?? 1;

  return (
    <div className="flex flex-col gap-3">
      {stages.map((stage) => {
        const pct = (stage.count / top) * 100;
        return (
          <div key={stage.label} className="group">
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span className="font-medium text-fg">{stage.label}</span>
              <span className="flex items-center gap-2">
                <span className="tnum font-mono text-fg">
                  {formatNumber(stage.count)}
                </span>
                {stage.conversion !== null && (
                  <span
                    className={cn(
                      "tnum rounded px-1.5 py-0.5 text-xs font-medium",
                      stage.bottleneck
                        ? "bg-warning-soft text-warning"
                        : "bg-surface-2 text-muted"
                    )}
                  >
                    {stage.conversion}%
                  </span>
                )}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  stage.bottleneck ? "bg-warning" : "bg-brand"
                )}
                style={{ width: `${Math.max(pct, 3)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
