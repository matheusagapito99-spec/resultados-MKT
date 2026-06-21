import { formatNumber } from "@/lib/utils";

export interface BarItem {
  label: string;
  value: number;
  /** texto opcional à direita (ex.: R$). Se ausente, usa formatNumber(value). */
  display?: string;
}

export function BarList({ items }: { items: BarItem[] }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length)
    return <p className="py-6 text-center text-sm text-muted">Sem dados.</p>;
  return (
    <div className="flex flex-col gap-3">
      {items.map((i) => (
        <div key={i.label}>
          <div className="mb-1 flex items-baseline justify-between text-sm">
            <span className="truncate pr-2 font-medium text-fg">{i.label}</span>
            <span className="tnum shrink-0 font-mono text-muted">
              {i.display ?? formatNumber(i.value)}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${Math.max((i.value / max) * 100, 3)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
