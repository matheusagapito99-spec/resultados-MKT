import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/patterns/page-header";
import { getSellers } from "@/lib/metrics/sellers";
import { formatBRL, formatNumber, formatPercent } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function VendedoresPage() {
  const sellers = await getSellers();

  return (
    <div className="flex animate-fade-in flex-col gap-6">
      <PageHeader
        title="Vendedores"
        description="Performance por responsável: contratos, win rate e valor fechado"
      />

      <Card>
        <CardHeader title="Ranking" description={`${formatNumber(sellers.length)} responsáveis com negócios`} />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-border text-left text-xs uppercase tracking-wide text-faint">
                <th className="px-5 py-2 font-medium">Responsável</th>
                <th className="px-3 py-2 font-medium">Papel</th>
                <th className="px-3 py-2 text-right font-medium">Ganhos</th>
                <th className="px-3 py-2 text-right font-medium">Win %</th>
                <th className="px-3 py-2 text-right font-medium">Abertas</th>
                <th className="px-5 py-2 text-right font-medium">Valor fechado</th>
              </tr>
            </thead>
            <tbody>
              {sellers.map((s) => (
                <tr
                  key={s.name}
                  className="border-b border-border last:border-0 transition-colors hover:bg-surface-2"
                >
                  <td className="px-5 py-3 font-medium text-fg">{s.name}</td>
                  <td className="px-3 py-3">
                    <span className="rounded-md bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted">
                      {s.role}
                    </span>
                  </td>
                  <td className="tnum px-3 py-3 text-right font-mono text-muted">{formatNumber(s.ganhos)}</td>
                  <td className="tnum px-3 py-3 text-right font-mono text-muted">
                    {s.ganhos + s.perdidas > 0 ? formatPercent(s.winRate, 0) : "—"}
                  </td>
                  <td className="tnum px-3 py-3 text-right font-mono text-muted">{formatNumber(s.abertas)}</td>
                  <td className="tnum px-5 py-3 text-right font-mono font-medium text-fg">
                    {formatBRL(s.valorReais, true)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-xs text-faint">
        Win rate = ganhos ÷ (ganhos + perdidos) nas propostas. SDR/Gestor identificados pelo
        cargo (jobTitle) no Moskit.
      </p>
    </div>
  );
}
