import { cn } from "@/lib/utils";

/** Marca "Mira" — aperture/alvo, sugere precisão comercial. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("h-6 w-6", className)}
      aria-hidden="true"
    >
      <rect width="24" height="24" rx="7" fill="var(--brand)" />
      <circle cx="12" cy="12" r="6.5" stroke="var(--brand-fg)" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="2.4" fill="var(--brand-fg)" />
      <path
        d="M12 2.6v3M12 18.4v3M2.6 12h3M18.4 12h3"
        stroke="var(--brand-fg)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark />
      {!collapsed && (
        <div className="flex flex-col leading-none">
          <span className="text-[15px] font-semibold tracking-tight text-fg">
            Mira
          </span>
          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-faint">
            Revenue Intel
          </span>
        </div>
      )}
    </div>
  );
}
