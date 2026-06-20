import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { StatCard } from "@/components/patterns/stat-card";
import { FunnelChart } from "@/components/charts/funnel-chart";
import { TrendArea } from "@/components/charts/trend-area";
import { getOverview } from "@/lib/metrics/overview";
import { formatBRL, formatNumber } from "@/lib/utils";
import type { FunnelStage } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

function buildFunnel(steps: { label: string; count: number }[]): FunnelStage[] {
  // cumulativo: "alcançou ao menos esta etapa" (descendente)
  const cum = steps.map((_, i) =>
    steps.slice(i).reduce((s, st) => s + st.count, 0),
  );
  let minConv = 101;
  let bottleneckIdx = -1;
  const conv = cum.map((c, i) => {
    if (i === 0) return null;
    const v = cum[i - 1] ? Math.round((c / cum[i - 1]) * 100) : 0;
    if (v < minConv) {
      minConv = v;
      bottleneckIdx = i;
    }
    return v;
  });
  return steps.map((s, i) => ({
    label: s.label,
    count: cum[i],
    conversion: conv[i],
    bottleneck: i === bottleneckIdx,
  }));
}

export default async function OverviewPage() {
  const d = await getOverview();
  const funnel = buildFunnel(d.funnel);
  const maxInbound = Math.max(1, ...d.inbound.map((i) => i.count));
  const syncWhen = d.lastSync?.finishedAt
    ? new Date(d.lastSync.finishedAt).toLocaleString("pt-BR")
    : "—";

  return (
    <div className="flex animate-fade-in flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Visão geral</h1>
          <p className="mt-1 text-sm text-muted">
            Resultados comerciais dos leads de Marketing · dados reais do Moskit
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          {formatNumber(d.totalImobiliarias)} imobiliárias · {formatNumber(d.totalDeals)} negócios
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Receita ganha (contratos)"
          value={formatBRL(d.receitaReais, true)}
          sub="Soma das propostas ganhas"
          accent
        />
        <StatCard
          label="Contratos ganhos"
          value={formatNumber(d.contratosGanhos)}
          sub="Negócios WON em Gestão de Propostas"
        />
        <StatCard
          label="Imobiliárias ativas"
          value={formatNumber(d.imobiliariasAtivas)}
          sub={`de ${formatNumber(d.totalImobiliarias)} cadastradas`}
        />
        <StatCard
          label="Ticket médio"
          value={formatBRL(d.ticketMedioReais, true)}
          sub="Receita ganha ÷ contratos"
        />
      </div>

      {/* Funil + Receita por mês */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader title="Funil de imobiliárias" description="Alcançou ao menos cada etapa" />
          <CardBody>
            <FunnelChart stages={funnel} />
          </CardBody>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader
            title="Receita ganha por mês"
            description="Últimos 12 meses (contratos ganhos)"
          />
          <CardBody>
            {d.revenueByMonth.length > 1 ? (
              <TrendArea data={d.revenueByMonth.map((m) => m.totalReais)} />
            ) : (
              <p className="py-12 text-center text-sm text-muted">
                Dados de receita insuficientes para a série temporal.
              </p>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Origem inbound + Vendedores */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Origem inbound"
            description="Imobiliárias por origem de entrada"
          />
          <CardBody className="flex flex-col gap-3">
            {d.inbound.map((i) => (
              <div key={i.label}>
                <div className="mb-1 flex items-baseline justify-between text-sm">
                  <span className="font-medium text-fg">{i.label}</span>
                  <span className="tnum font-mono text-muted">{formatNumber(i.count)}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${Math.max((i.count / maxInbound) * 100, 3)}%` }}
                  />
                </div>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader title="Vendedores" description="Contratos ganhos e valor fechado" />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-border text-left text-xs uppercase tracking-wide text-faint">
                  <th className="px-5 py-2 font-medium">Responsável</th>
                  <th className="px-3 py-2 text-right font-medium">Contratos</th>
                  <th className="px-5 py-2 text-right font-medium">Valor fechado</th>
                </tr>
              </thead>
              <tbody>
                {d.sellers.map((s) => (
                  <tr
                    key={s.name}
                    className="border-b border-border last:border-0 transition-colors hover:bg-surface-2"
                  >
                    <td className="px-5 py-3 font-medium text-fg">{s.name}</td>
                    <td className="tnum px-3 py-3 text-right font-mono text-muted">
                      {formatNumber(s.contratos)}
                    </td>
                    <td className="tnum px-5 py-3 text-right font-mono font-medium text-fg">
                      {formatBRL(s.valorReais, true)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <p className="text-xs text-faint">
        Sincronização: {syncWhen}. Valores conforme o campo de preço do Moskit
        (provável valor total garantido) — unidade a confirmar. UTM/marketing ainda em
        adoção; origem inbound é a dimensão predominante hoje.
      </p>
    </div>
  );
}
