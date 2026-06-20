import { Gauge } from "lucide-react";
import { EmptyState } from "@/components/patterns/empty-state";

export default function VelocidadePage() {
  return (
    <EmptyState
      icon={Gauge}
      title="Velocidade & SLA"
      description="Tempo de ciclo de venda, tempo em cada etapa, SLA de 1º contato e idade dos negócios abertos. Disponível na Fase 4."
    />
  );
}
