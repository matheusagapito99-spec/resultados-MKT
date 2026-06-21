import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/patterns/page-header";
import { getOrigins, type OriginRow } from "@/lib/metrics/origins";
import { formatBRL, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

function OriginTable({ rows }: { rows: OriginRow[] }) {
  if (!rows.length)
    return <p className="px-5 py-8 text-center text-sm text-muted">Sem dados nesta dimensão ainda.</p>;
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-y border-border text-left text-xs uppercase tracking-wide text-faint">
            <th className="px-5 py-2 font-medium">Origem</th>
            <th className="px-3 py-2 text-right font-medium">Imob.</th>
            <th className="px-3 py-2 text-right font-medium">Ativas</th>
            <th className="px-3 py-2 text-right font-medium">Contratos</th>
            <th className="px-5 py-2 text-right font-medium">Receita</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-border last:border-0 transition-colors hover:bg-surface-2">
              <td className="px-5 py-3 font-medium text-fg">{r.label}</td>
              <td className="tnum px-3 py-3 text-right font-mono text-muted">{formatNumber(r.imob)}</td>
              <td className="tnum px-3 py-3 text-right font-mono text-muted">{formatNumber(r.ativas)}</td>
              <td className="tnum px-3 py-3 text-right font-mono text-muted">{formatNumber(r.contratos)}</td>
              <td className="tnum px-5 py-3 text-right font-mono font-medium text-fg">
                {formatBRL(r.receitaReais, true)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function OrigensPage() {
  const d = await getOrigins();

  return (
    <div className="flex animate-fade-in flex-col gap-6">
      <PageHeader
        title="Origens & Campanhas"
        description="Resultado comercial por origem de entrada das imobiliárias"
      />

      <Card>
        <CardHeader
          title="Origem inbound"
          description="Tipo de conversão / ponto de entrada (campo Origem Lead)"
        />
        <OriginTable rows={d.inbound} />
      </Card>

      <Card>
        <CardHeader
          title="Origem de marketing (UTM)"
          description={`Canal de aquisição via UTM · ${formatNumber(d.utmDeals)} negócios com UTM hoje`}
        />
        {d.marketing.length ? (
          <OriginTable rows={d.marketing} />
        ) : (
          <p className="px-5 py-8 text-center text-sm text-muted">
            A captura de UTM começou recentemente — ainda há poucos negócios com origem de
            marketing. Esta tabela cresce conforme novos leads chegam com UTM.
          </p>
        )}
      </Card>

      <p className="text-xs text-faint">
        Receita conforme o campo de preço do Moskit (a confirmar unidade). CAC/ROI por origem
        dependem do custo de mídia (entrada manual — em breve).
      </p>
    </div>
  );
}
