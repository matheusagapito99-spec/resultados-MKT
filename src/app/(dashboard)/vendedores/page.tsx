import { Users } from "lucide-react";
import { EmptyState } from "@/components/patterns/empty-state";

export default function VendedoresPage() {
  return (
    <EmptyState
      icon={Users}
      title="Vendedores"
      description="Ranking e produtividade por vendedor: negócios, taxa de ganho, valor fechado e atividades, com drill-down individual. Disponível na Fase 3."
    />
  );
}
