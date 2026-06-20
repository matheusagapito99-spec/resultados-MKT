"use client";

import { ChevronDown, Search, SlidersHorizontal, Download } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";

function FilterPill({ label, value }: { label: string; value: string }) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-fg transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      <span className="text-muted">{label}:</span>
      <span className="font-medium">{value}</span>
      <ChevronDown className="h-3.5 w-3.5 text-faint" />
    </button>
  );
}

export function Topbar() {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-bg/80 px-4 backdrop-blur-md md:px-6">
      <div className="flex items-center gap-2">
        <FilterPill label="Período" value="Últimos 30 dias" />
        <span className="hidden md:inline-flex">
          <FilterPill label="Pipeline" value="Todos" />
        </span>
        <span className="hidden lg:inline-flex">
          <FilterPill label="Origem" value="Todas" />
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          className="hidden items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-faint transition-colors hover:bg-surface-2 hover:text-muted sm:flex"
        >
          <Search className="h-4 w-4" />
          <span>Buscar…</span>
          <kbd className="ml-2 rounded border border-border bg-bg-subtle px-1.5 py-0.5 font-mono text-[10px] text-muted">
            ⌘K
          </kbd>
        </button>

        <button
          type="button"
          aria-label="Filtros avançados"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-muted transition-colors hover:bg-surface-2 hover:text-fg sm:hidden"
        >
          <SlidersHorizontal className="h-[18px] w-[18px]" />
        </button>

        <button
          type="button"
          aria-label="Exportar"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-muted transition-colors hover:bg-surface-2 hover:text-fg"
        >
          <Download className="h-[18px] w-[18px]" />
        </button>

        <ThemeToggle />
      </div>
    </header>
  );
}
