/**
 * Mira — modelo de dados (Postgres / Drizzle).
 *
 * Princípios desta modelagem (ver docs/ATRIBUICAO.md):
 *  1. A IMOBILIÁRIA é a entidade central (o "lead"/parceiro), vinculada à sua
 *     origem durante toda a existência na plataforma.
 *  2. Duas origens INDEPENDENTES e COEXISTENTES:
 *       - Origem de Marketing (UTM) — canal de aquisição.
 *       - Origem Inbound — tipo de conversão / ponto de entrada (não-UTM).
 *  3. Origens são capturadas na ENTRADA e NUNCA sobrescritas. Mudanças futuras
 *     são registradas em `lead_origin_history` (append-only) para análise/auditoria.
 */
import {
  pgTable,
  pgEnum,
  serial,
  integer,
  bigint,
  text,
  boolean,
  timestamp,
  date,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/* ----------------------------- Enums ----------------------------- */
export const userRole = pgEnum("user_role", ["sdr", "gestor", "outro"]);
export const funnelStep = pgEnum("funnel_step", [
  "lead",
  "qualificacao",
  "reuniao",
  "cadastro",
  "ativa",
  "churn",
]);
export const originSource = pgEnum("origin_source", [
  "entry", // captura original na entrada do lead (imutável)
  "sync", // observado em uma sincronização incremental
  "webhook", // observado via webhook do Moskit
  "manual", // ajuste manual (auditado)
]);
export const revenueKind = pgEnum("revenue_kind", [
  "garantia",
  "contrato",
  "mensalidade",
  "outro",
]);
export const costSource = pgEnum("cost_source", ["manual", "import", "ads_api"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

/* --------------------- Dimensões / pessoas ----------------------- */

/** Usuários do Moskit: SDRs e Gestores de Contas. */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  moskitId: text("moskit_id").unique(),
  name: text("name").notNull(),
  email: text("email"),
  role: userRole("role").default("outro").notNull(),
  active: boolean("active").default(true).notNull(),
  ...timestamps,
});

/** Canal de aquisição normalizado (Origem de Marketing). Ex.: "Google Ads". */
export const marketingChannels = pgTable("marketing_channels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  isPaid: boolean("is_paid").default(true).notNull(),
  createdAt: timestamps.createdAt,
});

/** Tipo de conversão / ponto de entrada (Origem Inbound). Ex.: "Webinar". */
export const inboundOrigins = pgTable("inbound_origins", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamps.createdAt,
});

/* ----------------------- Entidade central ------------------------ */

export const imobiliarias = pgTable(
  "imobiliarias",
  {
    id: serial("id").primaryKey(),
    moskitId: text("moskit_id").notNull().unique(),
    /** De qual recurso do Moskit veio (definido na descoberta): company | deal. */
    moskitEntity: text("moskit_entity"),

    name: text("name").notNull(),
    cnpj: text("cnpj"),
    cidade: text("cidade"),
    uf: text("uf"),
    segmento: text("segmento"),

    sdrId: integer("sdr_id").references(() => users.id),
    gestorId: integer("gestor_id").references(() => users.id),

    moskitStageName: text("moskit_stage_name"),
    funnelStep: funnelStep("funnel_step"),
    status: text("status"), // ativa | inativa | churn

    enteredAt: timestamp("entered_at", { withTimezone: true }), // entrada do lead
    activatedAt: timestamp("activated_at", { withTimezone: true }), // ativação
    firstSaleAt: timestamp("first_sale_at", { withTimezone: true }), // 1ª venda

    /* -------- Atribuição de ENTRADA (imutável após criação) -------- */
    entryMarketingChannelId: integer("entry_marketing_channel_id").references(
      () => marketingChannels.id,
    ),
    entryInboundOriginId: integer("entry_inbound_origin_id").references(
      () => inboundOrigins.id,
    ),
    entryUtmSource: text("entry_utm_source"),
    entryUtmMedium: text("entry_utm_medium"),
    entryUtmCampaign: text("entry_utm_campaign"),
    entryUtmContent: text("entry_utm_content"),
    entryUtmTerm: text("entry_utm_term"),
    entryLandingPage: text("entry_landing_page"),
    entryConversionDate: timestamp("entry_conversion_date", { withTimezone: true }),

    /** Payload bruto do Moskit, para reprocessamento sem nova chamada. */
    raw: jsonb("raw"),
    ...timestamps,
  },
  (t) => [
    index("imob_entry_mkt_idx").on(t.entryMarketingChannelId),
    index("imob_entry_inbound_idx").on(t.entryInboundOriginId),
    index("imob_sdr_idx").on(t.sdrId),
    index("imob_gestor_idx").on(t.gestorId),
    index("imob_status_idx").on(t.status),
    index("imob_step_idx").on(t.funnelStep),
    index("imob_entered_idx").on(t.enteredAt),
  ],
);

/**
 * Histórico de origem — APPEND-ONLY (nunca UPDATE/DELETE).
 * A primeira linha (is_entry = true) é a captura imutável da entrada.
 * Preserva a evolução das origens para auditoria e análise.
 */
export const leadOriginHistory = pgTable(
  "lead_origin_history",
  {
    id: serial("id").primaryKey(),
    imobiliariaId: integer("imobiliaria_id")
      .notNull()
      .references(() => imobiliarias.id),
    marketingChannelId: integer("marketing_channel_id").references(
      () => marketingChannels.id,
    ),
    inboundOriginId: integer("inbound_origin_id").references(() => inboundOrigins.id),
    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    utmContent: text("utm_content"),
    utmTerm: text("utm_term"),
    landingPage: text("landing_page"),
    conversionDate: timestamp("conversion_date", { withTimezone: true }),
    capturedAt: timestamp("captured_at", { withTimezone: true }).defaultNow().notNull(),
    source: originSource("source").notNull(),
    isEntry: boolean("is_entry").default(false).notNull(),
    note: text("note"),
  },
  (t) => [
    index("loh_imob_idx").on(t.imobiliariaId),
    index("loh_imob_captured_idx").on(t.imobiliariaId, t.capturedAt),
  ],
);

/** Histórico de etapas do funil — base para tempo-até-ativação / tempo-em-etapa. */
export const imobiliariaStageHistory = pgTable(
  "imobiliaria_stage_history",
  {
    id: serial("id").primaryKey(),
    imobiliariaId: integer("imobiliaria_id")
      .notNull()
      .references(() => imobiliarias.id),
    moskitStageName: text("moskit_stage_name"),
    funnelStep: funnelStep("funnel_step"),
    enteredAt: timestamp("entered_at", { withTimezone: true }).notNull(),
    source: originSource("source").default("sync").notNull(),
  },
  (t) => [
    index("ish_imob_idx").on(t.imobiliariaId),
    index("ish_imob_entered_idx").on(t.imobiliariaId, t.enteredAt),
  ],
);

/* ----------------------- Eventos comerciais ---------------------- */

export const meetings = pgTable(
  "meetings",
  {
    id: serial("id").primaryKey(),
    moskitActivityId: text("moskit_activity_id").unique(),
    imobiliariaId: integer("imobiliaria_id").references(() => imobiliarias.id),
    sdrId: integer("sdr_id").references(() => users.id),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    doneAt: timestamp("done_at", { withTimezone: true }),
    status: text("status"),
    ...timestamps,
  },
  (t) => [
    index("meet_imob_idx").on(t.imobiliariaId),
    index("meet_sdr_idx").on(t.sdrId),
    index("meet_done_idx").on(t.doneAt),
  ],
);

export const contracts = pgTable(
  "contracts",
  {
    id: serial("id").primaryKey(),
    moskitId: text("moskit_id").unique(),
    imobiliariaId: integer("imobiliaria_id")
      .notNull()
      .references(() => imobiliarias.id),
    signedAt: timestamp("signed_at", { withTimezone: true }),
    valueCents: bigint("value_cents", { mode: "number" }),
    status: text("status"),
    ...timestamps,
  },
  (t) => [
    index("contract_imob_idx").on(t.imobiliariaId),
    index("contract_signed_idx").on(t.signedAt),
  ],
);

export const garantias = pgTable(
  "garantias",
  {
    id: serial("id").primaryKey(),
    moskitId: text("moskit_id").unique(),
    imobiliariaId: integer("imobiliaria_id")
      .notNull()
      .references(() => imobiliarias.id),
    contractId: integer("contract_id").references(() => contracts.id),
    contractedAt: timestamp("contracted_at", { withTimezone: true }),
    valueCents: bigint("value_cents", { mode: "number" }),
    tipo: text("tipo"),
    status: text("status"),
    ...timestamps,
  },
  (t) => [
    index("garantia_imob_idx").on(t.imobiliariaId),
    index("garantia_contracted_idx").on(t.contractedAt),
  ],
);

/** Eventos de receita granulares — base para LTV por imobiliária/origem. */
export const revenueEvents = pgTable(
  "revenue_events",
  {
    id: serial("id").primaryKey(),
    imobiliariaId: integer("imobiliaria_id")
      .notNull()
      .references(() => imobiliarias.id),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
    kind: revenueKind("kind").default("outro").notNull(),
    refId: text("ref_id"),
    source: text("source"),
    createdAt: timestamps.createdAt,
  },
  (t) => [
    index("rev_imob_idx").on(t.imobiliariaId),
    index("rev_occurred_idx").on(t.occurredAt),
    index("rev_kind_idx").on(t.kind),
  ],
);

/** Investimento por canal/campanha — base para CAC e ROI por Origem de Marketing. */
export const marketingCosts = pgTable(
  "marketing_costs",
  {
    id: serial("id").primaryKey(),
    marketingChannelId: integer("marketing_channel_id")
      .notNull()
      .references(() => marketingChannels.id),
    campaign: text("campaign"),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
    source: costSource("source").default("manual").notNull(),
    createdAt: timestamps.createdAt,
  },
  (t) => [
    index("cost_channel_idx").on(t.marketingChannelId),
    index("cost_period_idx").on(t.periodStart, t.periodEnd),
  ],
);

/* --------------------- Infra de sincronização -------------------- */

export const syncRuns = pgTable("sync_runs", {
  id: serial("id").primaryKey(),
  kind: text("kind").notNull(), // incremental | full | webhook
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  status: text("status").default("running").notNull(),
  recordsProcessed: integer("records_processed").default(0).notNull(),
  cursor: text("cursor"),
  error: text("error"),
});

export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: serial("id").primaryKey(),
    moskitEventId: text("moskit_event_id"),
    type: text("type"),
    payload: jsonb("payload"),
    receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    status: text("status").default("received").notNull(),
  },
  (t) => [uniqueIndex("webhook_event_uq").on(t.moskitEventId)],
);
