import { Filter } from "lucide-react";
import { EmptyState } from "@/components/patterns/empty-state";

export default function FunilPage() {
  return (
    <EmptyState
      icon={Filter}
      title="Funil de conversão"
      description="Conversão e drop-off por etapa, tempo médio em cada estágio e comparação de períodos. Disponível na Fase 2."
    />
  );
}
