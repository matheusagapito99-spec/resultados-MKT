import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/patterns/page-header";
import { FunnelChart } from "@/components/charts/funnel-chart";
import { getFunnel } from "@/lib/metrics/funnel";
import { toCumulativeFunnel } from "@/lib/funnel";
import { parseFilters } from "@/lib/filters";
import { formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PIPELINE_ORDER = [
  "Prospecção de Imobiliárias",
  "Cadastros - OPPs",
  "Gestão de Propostas",
];

export default async function FunilPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const d = await getFunnel(parseFilters(await searchParams));
  const funnel = toCumulativeFunnel(d.steps);

  const byPipeline = PIPELINE_ORDER.map((p) => ({
    pipeline: p,
    stages: d.stages.filter((s) => s.pipeline === p),
  })).filter((g) => g.stages.length);

  return (
    <div className="flex animate-fade-in flex-col gap-6">
      <PageHeader
        title="Funil de conversão"
        description="Jornada das imobiliárias por etapa (cumulativo) e detalhe por pipeline"
      />

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
                    <td className="tnum px-3 py-3 text-right font-mono text-muted">
                      {formatNumber(s.count)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {s.conversion !== null ? (
                        <span
                          className={`tnum rounded px-1.5 py-0.5 text-xs font-medium ${
                            s.bottleneck ? "bg-warning-soft text-warning" : "bg-surface-2 text-muted"
                          }`}
                        >
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
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${Math.max((s.count / max) * 100, 3)}%` }}
                      />
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
