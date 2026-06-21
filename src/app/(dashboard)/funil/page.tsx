import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/patterns/page-header";
import { TrendStat } from "@/components/patterns/trend-stat";
import { FunnelChart } from "@/components/charts/funnel-chart";
import { InboundTrendChart } from "@/components/charts/inbound-trend-chart";
import { getFunnel } from "@/lib/metrics/funnel";
import { getInboundTrend } from "@/lib/metrics/inbound-trend";
import { toCumulativeFunnel } from "@/lib/funnel";
import { parseFilters } from "@/lib/filters";
import { formatNumber, formatPercent } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PIPELINE_ORDER = [
  "Prospecção de Imobiliárias",
  "Cadastros - OPPs",
  "Gestão de Propostas",
];

function Dot({ color }: { color: string }) {
  return <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: color }} />;
}

export default async function FunilPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const f = parseFilters(await searchParams);
  const [t, d] = await Promise.all([getInboundTrend(f), getFunnel(f)]);
  const funnel = toCumulativeFunnel(d.steps);
  const byPipeline = PIPELINE_ORDER.map((p) => ({
    pipeline: p,
    stages: d.stages.filter((s) => s.pipeline === p),
  })).filter((g) => g.stages.length);

  return (
    <div className="flex animate-fade-in flex-col gap-6">
      <PageHeader
        title="Prospecção de Imobiliárias"
        description="Evolução dos leads de inbound gerados, reuniões, taxa de ganho e ciclo médio"
      />

      {/* Primeira dobra: tendência */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <TrendStat label="Novos Leads (período atual)" value={formatNumber(t.ref.novosLeads)} delta={t.deltaNovos} unit="%" />
        <TrendStat label="Taxa de ganho" value={formatPercent(t.ref.taxaGanho, 2)} delta={t.deltaTaxa} unit=" pp" />
        <TrendStat label="Ciclo médio de ganho" value={t.ref.ganhos ? `${formatNumber(t.ref.cicloMedioDias)} dias` : "—"} delta={t.deltaCiclo} unit="dias" goodWhenDown />
      </div>

      <Card>
        <CardHeader
          title="Tendência de leads inbound"
          description={`Por data de criação do lead · ${t.rangeLabel}`}
          action={
            <span className="rounded-md bg-brand-soft px-2 py-1 text-xs font-medium capitalize text-brand">
              {t.granularity === "day" ? "Diário" : t.granularity === "week" ? "Semanal" : t.granularity === "month" ? "Mensal" : "Trimestral"}
            </span>
          }
        />
        <CardBody>
          <InboundTrendChart buckets={t.buckets} />
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted">
            <span className="flex items-center gap-1.5"><Dot color="var(--brand)" /> Novos Leads</span>
            <span className="flex items-center gap-1.5"><Dot color="var(--chart-2)" /> Reuniões Realizadas</span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 rounded" style={{ background: "var(--success)" }} /> Taxa de ganho (%)
            </span>
            <span className="ml-auto text-faint">Coluna em destaque = período de referência (filtro)</span>
          </div>
        </CardBody>
      </Card>

      {/* Funil detalhado */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader title="Funil de imobiliárias" description="Alcançou ao menos cada etapa" />
          <CardBody>
            <FunnelChart stages={funnel} />
          </CardBody>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader title="Conversão por etapa" description="Imobiliárias e taxa vs. etapa anterior" />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-border text-left text-xs uppercase tracking-wide text-faint">
                  <th className="px-5 py-2 font-medium">Etapa</th>
                  <th className="px-3 py-2 text-right font-medium">Alcançaram</th>
                  <th className="px-5 py-2 text-right font-medium">Conversão</th>
                </tr>
              </thead>
              <tbody>
                {funnel.map((s) => (
                  <tr key={s.label} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 font-medium text-fg">{s.label}</td>
                    <td className="tnum px-3 py-3 text-right font-mono text-muted">{formatNumber(s.count)}</td>
                    <td className="px-5 py-3 text-right">
                      {s.conversion !== null ? (
                        <span className={`tnum rounded px-1.5 py-0.5 text-xs font-medium ${s.bottleneck ? "bg-warning-soft text-warning" : "bg-surface-2 text-muted"}`}>
                          {s.conversion}%
                        </span>
                      ) : (
                        <span className="text-faint">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {byPipeline.map((g) => {
          const total = g.stages.reduce((s, x) => s + x.count, 0);
          const max = Math.max(...g.stages.map((x) => x.count));
          return (
            <Card key={g.pipeline}>
              <CardHeader title={g.pipeline} description={`${formatNumber(total)} negócios`} />
              <CardBody className="flex flex-col gap-3">
                {g.stages.map((s) => (
                  <div key={s.stage}>
                    <div className="mb-1 flex items-baseline justify-between text-sm">
                      <span className="truncate pr-2 text-fg">{s.stage}</span>
                      <span className="tnum font-mono text-muted">{formatNumber(s.count)}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max((s.count / max) * 100, 3)}%` }} />
                    </div>
                  </div>
                ))}
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
