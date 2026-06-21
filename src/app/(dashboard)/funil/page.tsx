import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/patterns/page-header";
import { StatCard } from "@/components/patterns/stat-card";
import { FunnelChart } from "@/components/charts/funnel-chart";
import { MonthlyInboundChart } from "@/components/charts/monthly-inbound-chart";
import { getFunnel } from "@/lib/metrics/funnel";
import { getInboundMonthly } from "@/lib/metrics/inbound-monthly";
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
  const [mon, d] = await Promise.all([getInboundMonthly(f), getFunnel(f)]);
  const funnel = toCumulativeFunnel(d.steps);
  const byPipeline = PIPELINE_ORDER.map((p) => ({
    pipeline: p,
    stages: d.stages.filter((s) => s.pipeline === p),
  })).filter((g) => g.stages.length);

  return (
    <div className="flex animate-fade-in flex-col gap-6">
      <PageHeader
        title="Inbound · Prospecções de imobiliárias"
        description={`Resultados de ${mon.rangeLabel} — leads gerados, reuniões, taxa de ganho e ciclo médio (por data de criação do lead)`}
      />

      {/* Primeira dobra: gráfico dinâmico */}
      <Card>
        <CardHeader
          title="Leads inbound por mês"
          description="Etapa inicial de contato com novas imobiliárias · ajusta com o filtro"
        />
        <CardBody>
          <div className="flex flex-col gap-5 lg:flex-row">
            <div className="min-w-0 flex-1">
              <MonthlyInboundChart months={mon.months} />
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted">
                <span className="flex items-center gap-1.5"><Dot color="var(--brand-strong)" /> Novos Leads</span>
                <span className="flex items-center gap-1.5"><Dot color="var(--brand)" /> Reuniões Realizadas</span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-0.5 w-4 rounded" style={{ background: "var(--success)" }} /> Taxa de ganho (%)
                </span>
              </div>
            </div>
            <div className="w-full shrink-0 lg:w-60">
              <p className="mb-2 text-sm font-semibold text-fg">Ciclo médio de ganho</p>
              <div className="flex max-h-[300px] flex-col gap-1.5 overflow-y-auto">
                {mon.months.map((m) => (
                  <div
                    key={m.ym}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <span className="text-muted">{m.label}</span>
                    <span className="tnum font-mono font-medium text-fg">
                      {m.ganhos ? `${formatNumber(m.cicloMedioDias)} dias` : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Pico de leads" value={formatNumber(mon.picoLeads.value)} sub={`em ${mon.picoLeads.label}`} accent />
        <StatCard label="Maior taxa de ganho" value={formatPercent(mon.maiorTaxa.value, 2)} sub={`em ${mon.maiorTaxa.label}`} />
        <StatCard label="Menor ciclo médio" value={`${formatNumber(mon.menorCiclo.value)} dias`} sub={`em ${mon.menorCiclo.label}`} />
      </div>

      {/* Funil detalhado (movido para baixo) */}
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
