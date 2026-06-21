"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { PanelLeftClose, PanelLeft, CheckCircle2 } from "lucide-react";
import { navItems, secondaryNavItems, type NavItem } from "@/config/nav";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  item,
  active,
  collapsed,
  qs,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  qs: string;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={`${item.href}${qs}`}
      title={collapsed ? item.label : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        collapsed && "justify-center px-0",
        active
          ? "bg-brand-soft text-brand"
          : "text-muted hover:bg-surface-2 hover:text-fg"
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-brand" />
      )}
      <Icon className={cn("h-[18px] w-[18px] shrink-0", active && "text-brand")} />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const qs = search ? `?${search}` : "";
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-svh shrink-0 flex-col border-r border-border bg-bg-subtle/60 backdrop-blur md:flex",
        collapsed ? "w-[68px]" : "w-[244px]"
      )}
    >
      <div
        className={cn(
          "flex h-14 items-center border-b border-border px-4",
          collapsed && "justify-center px-0"
        )}
      >
        <Logo collapsed={collapsed} />
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {!collapsed && (
          <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-faint">
            Análise
          </p>
        )}
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            collapsed={collapsed}
            qs={qs}
            active={isActive(pathname, item.href)}
          />
        ))}

        <div className="mt-auto flex flex-col gap-1 pt-2">
          {secondaryNavItems.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              collapsed={collapsed}
              qs={qs}
              active={isActive(pathname, item.href)}
            />
          ))}
        </div>
      </nav>

      <div className="border-t border-border p-3">
        {!collapsed && (
          <div className="mb-2 flex items-center gap-2 rounded-lg bg-success-soft px-3 py-2 text-xs font-medium text-success">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="truncate">Sync há 4 min</span>
          </div>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-fg",
            collapsed && "justify-center px-0"
          )}
        >
          {collapsed ? (
            <PanelLeft className="h-[18px] w-[18px]" />
          ) : (
            <>
              <PanelLeftClose className="h-[18px] w-[18px]" />
              <span>Recolher</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
