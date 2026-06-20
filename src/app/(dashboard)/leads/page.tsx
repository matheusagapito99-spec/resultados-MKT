import { Table2 } from "lucide-react";
import { EmptyState } from "@/components/patterns/empty-state";

export default function LeadsPage() {
  return (
    <EmptyState
      icon={Table2}
      title="Leads & Negócios"
      description="Explorador filtrável de leads e negócios com drawer de detalhe e exportação. Disponível na Fase 4."
    />
  );
}
