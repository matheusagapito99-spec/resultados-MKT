import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/patterns/page-header";
import { TrendStat } from "@/components/patterns/trend-stat";
import { HistoryToggle } from "@/components/patterns/history-toggle";
import { FunnelChart } from "@/components/charts/funnel-chart";
import { ReunioesTrendChart } from "@/components/charts/reunioes-trend-chart";
import { getFunnel } from "@/lib/metrics/funnel";
import { getReunioesTrend } from "@/lib/metrics/reunioes-trend";
import { toCumulativeFunnel } from "@/lib/funnel";
import { parseFilters, type SP } from "@/lib/filters";
import { formatNumber, formatPercent } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PIPELINE_ORDER = ["Prospecção de Imobiliárias", "Cadastros - OPPs", "Gestão de Propostas"];

function Dot({ color, dash }: { color: string; dash?: boolean }) {
  return dash ? (
    <span className="inline-block h-0.5 w-4 rounded" style={{ background: `repeating-linear-gradient(90deg, ${color} 0 4px, transparent 4px 7px)` }} />
  ) : (
    <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
  );
}

export default async function FunilPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const f = parseFilters(sp);
  const compare = (Array.isArray(sp.hist) ? sp.hist[0] : sp.hist) === "1";

  const [t, d] = await Promise.all([getReunioesTrend(f, compare), getFunnel(f)]);
  const funnel = toCumulativeFunnel(d.steps);
  const byPipeline = PIPELINE_ORDER.map((p) => ({ pipeline: p, stages: d.stages.filter((s) => s.pipeline === p) })).filter((g) => g.stages.length);

  return (
    <div className="flex animate-fade-in flex-col gap-6">
      <PageHeader
        title="Prospecção de Imobiliárias"
        description="Reuniões realizadas (por data da reunião), novos leads e taxa de ganho · 2025 = base RD Station, 2026 = Moskit"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <TrendStat
          label="Reuniões realizadas (período)"
          value={formatNumber(t.totalReunioes)}
          delta={t.deltaReunioesPct}
          unit="%"
          caption={compare ? `vs. ${formatNumber(t.totalReunioesHist ?? 0)} em 2025` : "ligue a comparação"}
        />
        <TrendStat label="Novos Leads (período)" value={formatNumber(t.totalNovos)} delta={null} caption="leads de Prospecção criados" />
        <TrendStat label="Taxa de ganho" value={formatPercent(t.taxaGanho, 2)} delta={null} caption="reuniões ÷ novos leads" />
      </div>

      <Card>
        <CardHeader
          title="Reuniões realizadas por período"
          description={`${t.rangeLabel} · período de referência em destaque`}
          action={<HistoryToggle active={compare} />}
        />
        <CardBody>
          <ReunioesTrendChart buckets={t.buckets} compare={compare} />
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted">
            <span className="flex items-center gap-1.5"><Dot color="var(--brand)" /> Reuniões realizadas</span>
            <span className="flex items-center gap-1.5"><Dot color="var(--chart-2)" /> Novos Leads</span>
            {compare && <span className="flex items-center gap-1.5"><Dot color="var(--warning)" dash /> Reuniões 2025 (mesmo período)</span>}
            <span className="ml-auto text-faint">Base 2025 cobre mai–ago; fora disso, sem histórico</span>
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
                        <span className={`tnum rounded px-1.5 py-0.5 text-xs font-medium ${s.bottleneck ? "bg-warning-soft text-warning" : "bg-surface-2 text-muted"}`}>{s.conversion}%</span>
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
