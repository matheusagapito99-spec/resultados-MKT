import { CheckCircle2, AlertTriangle } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/patterns/page-header";
import { StatCard } from "@/components/patterns/stat-card";
import { getSyncStatus } from "@/lib/metrics/settings";
import { formatBRL, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AjustesPage() {
  const s = await getSyncStatus();
  const ok = s.lastRun?.status === "success";
  const when = s.lastRun?.finishedAt
    ? new Date(s.lastRun.finishedAt).toLocaleString("pt-BR")
    : "—";

  return (
    <div className="flex animate-fade-in flex-col gap-6">
      <PageHeader
        title="Ajustes"
        description="Sincronização com o Moskit e mapeamento de dados"
      />

      <Card>
        <CardHeader title="Sincronização" description="Status da última carga de dados" />
        <CardBody>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${
                ok ? "bg-success-soft text-success" : "bg-warning-soft text-warning"
              }`}
            >
              {ok ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
            </span>
            <div>
              <p className="text-sm font-medium text-fg">
                {ok ? "Sincronizado com sucesso" : `Status: ${s.lastRun?.status ?? "—"}`}
              </p>
              <p className="text-sm text-muted">
                Última carga ({s.lastRun?.kind ?? "—"}): {when} · {formatNumber(s.lastRun?.records ?? 0)} registros
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Negócios" value={formatNumber(s.counts.deals)} accent />
        <StatCard label="Imobiliárias" value={formatNumber(s.counts.imobiliarias)} sub={`${formatNumber(s.counts.ativas)} ativas`} />
        <StatCard label="Contratos" value={formatNumber(s.counts.contratos)} />
        <StatCard label="Receita ganha" value={formatBRL(s.counts.receitaReais, true)} />
        <StatCard label="SDR / Gestores" value={`${formatNumber(s.sdrs)} / ${formatNumber(s.gestores)}`} />
      </div>

      <Card>
        <CardHeader title="Mapeamento de dados" description="Como o Moskit é interpretado" />
        <CardBody>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
            {[
              ["Imobiliária", "Empresa (company) do Moskit"],
              ["Negócio / ticket", "Nome do deal = ID da plataforma Avalyst"],
              ["Contratos", "Pipeline “Gestão de Propostas” (deals ganhos)"],
              ["Dono", "Responsável (responsible) do negócio"],
              ["Origem inbound", `Campo “Origem Lead” · ${formatNumber(s.inboundOrigins)} origens`],
              ["Origem marketing", `UTMs no negócio · ${formatNumber(s.channels)} canais`],
              ["SDR / Gestor", "Identificados pelo cargo (jobTitle)"],
              ["Valor", "Campo de preço do Moskit (unidade a confirmar)"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-border pb-2">
                <dt className="text-muted">{k}</dt>
                <dd className="text-right font-medium text-fg">{v}</dd>
              </div>
            ))}
          </dl>
        </CardBody>
      </Card>

      <p className="text-xs text-faint">
        Hoje a sincronização é executada manualmente (backfill). Sync incremental automático +
        webhooks do Moskit + atualização sob demanda virão na próxima etapa.
      </p>
    </div>
  );
}
