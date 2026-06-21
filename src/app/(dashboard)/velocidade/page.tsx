import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/patterns/page-header";
import { StatCard } from "@/components/patterns/stat-card";
import { BarList } from "@/components/patterns/bar-list";
import { getVelocity } from "@/lib/metrics/velocity";
import { formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function VelocidadePage() {
  const d = await getVelocity();

  return (
    <div className="flex animate-fade-in flex-col gap-6">
      <PageHeader
        title="Velocidade & SLA"
        description="Tempo de ciclo, ativação e saúde dos negócios em aberto"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Ciclo médio de venda"
          value={`${formatNumber(d.avgCycleDays)} dias`}
          sub={`entrada → 1ª venda · ${formatNumber(d.comVenda)} imob.`}
          accent
        />
        <StatCard
          label="Tempo até ativação"
          value={`${formatNumber(d.avgAtivacaoDays)} dias`}
          sub={`entrada → ativação · ${formatNumber(d.comAtivacao)} imob.`}
        />
        <StatCard
          label="Propostas em aberto"
          value={formatNumber(d.abertas)}
          sub={`idade média ${formatNumber(d.idadeMediaDias)} dias`}
        />
        <StatCard
          label="Propostas paradas"
          value={formatNumber(d.paradas30)}
          sub={`+30 dias · ${formatNumber(d.paradas60)} há +60 dias`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Ciclo de venda" description="Distribuição do tempo entrada → 1ª venda" />
          <CardBody>
            <BarList items={d.cicloBuckets.map((b) => ({ label: b.label, value: b.count }))} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Saúde do pipeline de propostas" description="Negócios em aberto por idade" />
          <CardBody>
            <BarList
              items={[
                { label: "Em aberto (total)", value: d.abertas },
                { label: "Paradas há +30 dias", value: d.paradas30 },
                { label: "Paradas há +60 dias", value: d.paradas60 },
              ]}
            />
          </CardBody>
        </Card>
      </div>

      <p className="text-xs text-faint">
        SLA de 1º contato dependerá da sincronização de atividades/reuniões do Moskit (próxima
        etapa). Ciclo e ativação derivam das datas de entrada e fechamento dos negócios.
      </p>
    </div>
  );
}
