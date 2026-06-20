/**
 * Mapa de campos Moskit → modelo de atribuição da Mira.
 *
 * Esta é a "costura" entre o CRM e o nosso schema. As origens (Marketing/UTM e
 * Inbound) normalmente chegam ao Moskit como CUSTOM FIELDS vindos da landing
 * page / automação de marketing. Os nomes/chaves reais variam por conta — por
 * isso são preenchidos AQUI depois de rodar `npm run moskit:introspect`.
 *
 * Enquanto não confirmado, o sync usa estes nomes como tentativa e registra em
 * `sync_runs` quando um campo esperado não é encontrado.
 */
export interface MoskitFieldMap {
  /** Qual recurso do Moskit representa a imobiliária (lead/parceiro). */
  imobiliariaEntity: "company" | "deal";

  /** Chaves dos custom fields de UTM (Origem de Marketing). */
  utm: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
    landingPage?: string;
    conversionDate?: string;
  };

  /** Chave do custom field que carrega a Origem Inbound (tipo de conversão). */
  inboundOrigin?: string;

  /** Campos de papéis. */
  roles: {
    /** Como identificar SDR vs Gestor entre os `users` do Moskit. */
    sdrTeamName?: string;
    gestorTeamName?: string;
  };

  /** Nomes de etapas do Moskit → passo normalizado do funil. */
  stageToFunnelStep: Record<string, "lead" | "qualificacao" | "reuniao" | "cadastro" | "ativa" | "churn">;
}

/** Valores PROVISÓRIOS — confirmar/ajustar após a descoberta. */
export const fieldMap: MoskitFieldMap = {
  imobiliariaEntity: "company",
  utm: {
    source: "utm_source",
    medium: "utm_medium",
    campaign: "utm_campaign",
    content: "utm_content",
    term: "utm_term",
    landingPage: "landing_page",
    conversionDate: "data_conversao",
  },
  inboundOrigin: "origem_inbound",
  roles: {
    sdrTeamName: "SDR",
    gestorTeamName: "Gestor de Contas",
  },
  stageToFunnelStep: {
    // "Nome da etapa no Moskit": "passo normalizado"
    // Preencher após a descoberta, ex.:
    // "Lead": "lead",
    // "Reunião realizada": "reuniao",
    // "Cadastro": "cadastro",
    // "Ativa": "ativa",
  },
};
