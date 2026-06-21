"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { CalendarRange, ChevronDown, Check } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { PERIOD_OPTIONS } from "@/lib/filters";
import type { FilterOptions } from "@/lib/filters";
import { cn } from "@/lib/utils";

type OpenKey = "period" | "source" | "pipeline" | "stage" | null;

function periodLabel(period: string, from: string, to: string): string {
  if (period === "custom") {
    if (from && to) return `${from} a ${to}`;
    if (from) return `desde ${from}`;
    return "Personalizado";
  }
  return PERIOD_OPTIONS.find((o) => o.key === period)?.label ?? "Todo o período";
}

export function Topbar({ options }: { options: FilterOptions }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [open, setOpen] = useState<OpenKey>(null);

  const period = sp.get("period") ?? "all";
  const from = sp.get("from") ?? "";
  const to = sp.get("to") ?? "";
  const source = sp.get("source") ?? "";
  const pipeline = sp.get("pipeline") ?? "";
  const stage = sp.get("stage") ?? "";

  const [cFrom, setCFrom] = useState(from);
  const [cTo, setCTo] = useState(to);

  const setParams = useCallback(
    (updates: Record<string, string | null>) => {
      const p = new URLSearchParams(Array.from(sp.entries()));
      for (const [k, v] of Object.entries(updates)) {
        if (v) p.set(k, v);
        else p.delete(k);
      }
      p.delete("page");
      const qs = p.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
      setOpen(null);
    },
    [sp, pathname, router],
  );

  const stagesForPipeline = useMemo(
    () => options.pipelines.find((p) => p.name === pipeline)?.stages ?? [],
    [options.pipelines, pipeline],
  );

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-bg/80 px-4 backdrop-blur-md md:px-6">
      {open && <div className="fixed inset-0 z-10" onClick={() => setOpen(null)} />}

      <div className="relative z-20 flex flex-wrap items-center gap-2">
        {/* Período */}
        <Pill
          label="Período"
          value={periodLabel(period, from, to)}
          icon={<CalendarRange className="h-3.5 w-3.5 text-faint" />}
          active={period !== "all"}
          onClick={() => setOpen(open === "period" ? null : "period")}
        />
        {open === "period" && (
          <Popover className="left-0 top-11 w-[320px]">
            <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-faint">
              Período
            </p>
            <div className="flex flex-col">
              {PERIOD_OPTIONS.filter((o) => o.key !== "custom").map((o) => (
                <OptionRow
                  key={o.key}
                  label={o.label}
                  selected={period === o.key}
                  onClick={() => setParams({ period: o.key, from: null, to: null })}
                />
              ))}
            </div>
            <div className="mt-2 border-t border-border pt-3">
              <p className="px-1 pb-2 text-xs font-medium text-muted">Personalizado</p>
              <div className="flex items-end gap-2 px-1">
                <label className="flex flex-1 flex-col gap-1 text-[11px] text-muted">
                  Início
                  <input
                    type="date"
                    value={cFrom}
                    onChange={(e) => setCFrom(e.target.value)}
                    className="h-9 rounded-lg border border-border bg-surface px-2 text-sm text-fg outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  />
                </label>
                <label className="flex flex-1 flex-col gap-1 text-[11px] text-muted">
                  Término
                  <input
                    type="date"
                    value={cTo}
                    onChange={(e) => setCTo(e.target.value)}
                    className="h-9 rounded-lg border border-border bg-surface px-2 text-sm text-fg outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  />
                </label>
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  disabled={!cFrom || !cTo}
                  onClick={() => setParams({ period: "custom", from: cFrom, to: cTo })}
                  className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-brand-fg transition-colors hover:bg-brand-strong disabled:opacity-40"
                >
                  Aplicar
                </button>
              </div>
            </div>
          </Popover>
        )}

        {/* Canal (UTM source) */}
        <Pill
          label="Canal"
          value={source || "Todos"}
          active={!!source}
          onClick={() => setOpen(open === "source" ? null : "source")}
        />
        {open === "source" && (
          <Popover className="left-0 top-11 w-[240px]">
            <OptionRow label="Todos os canais" selected={!source} onClick={() => setParams({ source: null })} />
            {options.sources.length === 0 && (
              <p className="px-1 py-2 text-xs text-faint">Sem canais com histórico ainda.</p>
            )}
            {options.sources.map((s) => (
              <OptionRow key={s} label={s} selected={source === s} onClick={() => setParams({ source: s })} />
            ))}
          </Popover>
        )}

        {/* Pipeline */}
        <Pill
          label="Pipeline"
          value={pipeline || "Todas"}
          active={!!pipeline}
          onClick={() => setOpen(open === "pipeline" ? null : "pipeline")}
        />
        {open === "pipeline" && (
          <Popover className="left-0 top-11 w-[280px]">
            <OptionRow
              label="Todas as pipelines"
              selected={!pipeline}
              onClick={() => setParams({ pipeline: null, stage: null })}
            />
            {options.pipelines.map((p) => (
              <OptionRow
                key={p.name}
                label={p.name}
                selected={pipeline === p.name}
                onClick={() => setParams({ pipeline: p.name, stage: null })}
              />
            ))}
          </Popover>
        )}

        {/* Etapa (depende da pipeline) */}
        {pipeline && (
          <>
            <Pill
              label="Etapa"
              value={stage || "Todas"}
              active={!!stage}
              onClick={() => setOpen(open === "stage" ? null : "stage")}
            />
            {open === "stage" && (
              <Popover className="left-0 top-11 w-[260px]">
                <OptionRow label="Todas as etapas" selected={!stage} onClick={() => setParams({ stage: null })} />
                {stagesForPipeline.map((s) => (
                  <OptionRow key={s} label={s} selected={stage === s} onClick={() => setParams({ stage: s })} />
                ))}
              </Popover>
            )}
          </>
        )}
      </div>

      <div className="relative z-20 ml-auto flex items-center gap-2">
        <ThemeToggle />
      </div>
    </header>
  );
}

function Pill({
  label,
  value,
  icon,
  active,
  onClick,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
        active
          ? "border-brand/40 bg-brand-soft text-brand"
          : "border-border bg-surface text-fg hover:bg-surface-2",
      )}
    >
      {icon}
      <span className={cn(active ? "text-brand/70" : "text-muted")}>{label}:</span>
      <span className="max-w-[160px] truncate font-medium">{value}</span>
      <ChevronDown className="h-3.5 w-3.5 opacity-60" />
    </button>
  );
}

function Popover({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "absolute z-30 rounded-xl border border-border bg-surface p-3 shadow-[var(--shadow-lg)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

function OptionRow({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-fg transition-colors hover:bg-surface-2"
    >
      <span className="truncate">{label}</span>
      {selected && <Check className="h-4 w-4 shrink-0 text-brand" />}
    </button>
  );
}
