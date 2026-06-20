import {
  LayoutDashboard,
  Filter,
  Target,
  Users,
  Gauge,
  Table2,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { href: "/", label: "Visão geral", icon: LayoutDashboard },
  { href: "/funil", label: "Funil", icon: Filter },
  { href: "/origens", label: "Origens & Campanhas", icon: Target },
  { href: "/vendedores", label: "Vendedores", icon: Users },
  { href: "/velocidade", label: "Velocidade & SLA", icon: Gauge },
  { href: "/leads", label: "Leads & Negócios", icon: Table2 },
];

export const secondaryNavItems: NavItem[] = [
  { href: "/ajustes", label: "Ajustes", icon: Settings },
];
