import { Construction, type LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon = Construction,
  title,
  description,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-surface text-muted shadow-[var(--shadow-sm)]">
        <Icon className="h-6 w-6" />
      </div>
      <h2 className="text-lg font-semibold tracking-tight text-fg">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>
    </div>
  );
}
