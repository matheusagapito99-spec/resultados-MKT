/**
 * Mapa de campos Moskit → modelo de atribuição da Mira.
 * CONFIRMADO pela descoberta (2026-06-20) — ver docs/DESCOBERTA-MOSKIT.md.
 *
 * Modelo real:
 *  - IMOBILIÁRIA = `project` (Moskit "Projetos"). Cada projeto lista seus `deals[]`.
 *  - A ORIGEM (UTM + Origem Inbound) vive nos `deals` (negócios), como custom fields.
 *  - Para atribuir origem à imobiliária, casamos projeto → deals[] e usamos o deal de
 *    ENTRADA (mais antigo com dados de origem) como atribuição imutável.
 *  - Funil = pipelines/stages dos deals. Garantias/contratos = deals ganhos na
 *    pipeline "Gestão de Propostas".
 */
export interface MoskitFieldMap {
  imobiliariaEntity: "project";

  /** Custom fields de UTM (Origem de Marketing) — todos no módulo DEAL, tipo TEXT. */
  utm: {
    source: string;
    medium: string;
    campaign: string;
    content: string;
    term: string;
  };

  /** Outros custom fields úteis no DEAL. */
  dealFields: {
    cidade: string;
    estado: string;
    /** Origem Inbound — SINGLE_OPTION "Origem Lead". */
    origemInbound: string;
    etapaCadastro: string;
  };

  /** jobTitles que identificam papéis (campo `team` está vazio na conta). */
  roles: {
    sdrJobTitles: string[];
    gestorJobTitles: string[];
  };

  /** Nome da pipeline cujo "ganho" representa contrato/garantia. */
  contractPipelineName: string;

  /** Nome da etapa do Moskit → passo normalizado do funil. */
  stageToFunnelStep: Record<
    string,
    "lead" | "qualificacao" | "reuniao" | "cadastro" | "ativa" | "churn"
  >;
}

export const fieldMap: MoskitFieldMap = {
  imobiliariaEntity: "project",
  utm: {
    source: "CF_3LvDvEi4CLR67m6a", // utm_source
    medium: "CF_wPVm2Vi2CP64GmK6", // utm_medium
    campaign: "CF_42AmaJiZCvEp0Djl", // utm_campaign
    content: "CF_Pj3qYeieCWJGZqQe", // utm_content
    term: "CF_Lo1qjyi1C46Y6Der", // utm_term
  },
  dealFields: {
    cidade: "CF_A4wMWNigCBLO3qB8", // Cidade
    estado: "CF_6rRmweivCyoOnq4X", // Estado
    origemInbound: "CF_oJZmP1i9iQAvKDgv", // "Origem Lead" (SINGLE_OPTION)
    etapaCadastro: "CF_oJZmP1i9iQpa5Dgv", // "Etapa do cadastro" (SINGLE_OPTION)
  },
  roles: {
    sdrJobTitles: ["Sales Development Representative"],
    gestorJobTitles: ["Account Manager", "Account Maneger"], // grafias reais na conta
  },
  contractPipelineName: "Gestão de Propostas",
  stageToFunnelStep: {
    "Novo lead": "lead",
    "Em Cadência": "qualificacao",
    "Em contato": "qualificacao",
    "Em Contato": "qualificacao",
    Discovery: "qualificacao",
    "Conexão": "qualificacao",
    "Qualificação": "qualificacao",
    "Reunião Agendada": "reuniao",
    "Reunião Realizada": "reuniao",
    "Apresentação Realizada": "cadastro",
    "Pendente de Alteração": "ativa",
    Aprovadas: "ativa",
    "Pendente de Assinatura": "ativa",
    "Pendente de Ativação": "ativa",
  },
};
