import { Target } from "lucide-react";
import { EmptyState } from "@/components/patterns/empty-state";

export default function OrigensPage() {
  return (
    <EmptyState
      icon={Target}
      title="Origens & Campanhas"
      description="ROI por origem do lead e campanha de Marketing: receita ganha, ticket médio e win rate por canal. Disponível na Fase 3."
    />
  );
}
