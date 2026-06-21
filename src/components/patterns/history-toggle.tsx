"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export function HistoryToggle({ active, label = "Comparar com 2025" }: { active: boolean; label?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const toggle = () => {
    const p = new URLSearchParams(Array.from(sp.entries()));
    if (active) p.delete("hist");
    else p.set("hist", "1");
    const qs = p.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      onClick={toggle}
      className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-fg transition-colors hover:bg-surface-2"
    >
      <span className={cn("relative h-4 w-7 rounded-full transition-colors", active ? "bg-brand" : "bg-border-strong")}>
        <span className={cn("absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all", active ? "left-[14px]" : "left-0.5")} />
      </span>
      {label}
    </button>
  );
}
