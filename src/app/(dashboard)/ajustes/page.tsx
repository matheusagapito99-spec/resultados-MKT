import { Settings } from "lucide-react";
import { EmptyState } from "@/components/patterns/empty-state";

export default function AjustesPage() {
  return (
    <EmptyState
      icon={Settings}
      title="Ajustes"
      description="Status da sincronização com o Moskit, mapeamento de origens e definições de SLA e metas. Disponível na Fase 1."
    />
  );
}
