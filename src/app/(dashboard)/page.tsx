import { ArrowUpRight, AlertTriangle, CircleAlert, Info } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { KpiCard } from "@/components/patterns/kpi-card";
import { FunnelChart } from "@/components/charts/funnel-chart";
import { TrendArea } from "@/components/charts/trend-area";
import {
  kpis,
  funnel,
  revenueTrend,
  topSources,
  alerts,
  type Alert,
} from "@/lib/mock-data";
import { formatBRL, formatNumber, formatPercent } from "@/lib/utils";

const alertIcon = {
  warning: AlertTriangle,
  danger: CircleAlert,
  info: Info,
} as const;

const alertTone = {
  warning: "text-warning",
  danger: "text-danger",
  info: "text-info",
} as const;

function AlertRow({ alert }: { alert: Alert }) {
  const Icon = alertIcon[alert.tone];
  return (
    <li className="flex items-center gap-3 px-5 py-3">
      <Icon className={`h-[18px] w-[18px] shrink-0 ${alertTone[alert.tone]}`} />
      <span className="text-sm text-fg">{alert.text}</span>
    </li>
  );
}

export default function OverviewPage() {
  return (
    <div className="flex animate-fade-in flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            Visão geral
          </h1>
          <p className="mt-1 text-sm text-muted">
            Resultados comerciais dos leads de Marketing · Últimos 30 dias
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          Dados de demonstração
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} />
        ))}
      </div>

      {/* Funil + Tendência */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Funil de conversão"
            description="Volume e conversão por etapa"
          />
          <CardBody>
            <FunnelChart stages={funnel} />
          </CardBody>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader
            title="Receita ganha"
            description="Evolução semanal (R$ mil)"
            action={
              <span className="inline-flex items-center gap-1 rounded-md bg-success-soft px-2 py-1 text-xs font-semibold text-success">
                <ArrowUpRight className="h-3.5 w-3.5" />
                +12,3%
              </span>
            }
          />
          <CardBody>
            <TrendArea data={revenueTrend} />
          </CardBody>
        </Card>
      </div>

      {/* Top origens + Alertas */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader
            title="Top origens"
            description="Resultado comercial por origem de lead"
          />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-border text-left text-xs uppercase tracking-wide text-faint">
                  <th className="px-5 py-2 font-medium">Origem</th>
                  <th className="px-3 py-2 text-right font-medium">Leads</th>
                  <th className="px-3 py-2 text-right font-medium">Ganhos</th>
                  <th className="px-3 py-2 text-right font-medium">Win%</th>
                  <th className="px-5 py-2 text-right font-medium">Receita</th>
                </tr>
              </thead>
              <tbody>
                {topSources.map((row) => (
                  <tr
                    key={row.source}
                    className="border-b border-border last:border-0 transition-colors hover:bg-surface-2"
                  >
                    <td className="px-5 py-3 font-medium text-fg">{row.source}</td>
                    <td className="tnum px-3 py-3 text-right font-mono text-muted">
                      {formatNumber(row.leads)}
                    </td>
                    <td className="tnum px-3 py-3 text-right font-mono text-muted">
                      {row.won}
                    </td>
                    <td className="tnum px-3 py-3 text-right font-mono text-muted">
                      {formatPercent(row.winRate)}
                    </td>
                    <td className="tnum px-5 py-3 text-right font-mono font-medium text-fg">
                      {formatBRL(row.revenue, true)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Alertas" description="O que precisa de atenção" />
          <ul className="mt-3 divide-y divide-border">
            {alerts.map((alert) => (
              <AlertRow key={alert.id} alert={alert} />
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
