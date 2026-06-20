/**
 * Sync Moskit → Postgres (backfill completo + base p/ incremental).
 *
 * Modelo: imobiliária = company; negócios (deals) carregam origem (UTM/inbound) e
 * funil; "Gestão de Propostas" = contratos (name=ticket, price=valor). Derivações
 * de atribuição/funil/contratos/receita são feitas em SQL (set-based) ao final.
 */
import { sql } from "drizzle-orm";
import { getDb, schema } from "../db";
import { MoskitClient } from "./client";
import { fieldMap } from "./field-map";
import {
  extractOrigin,
  roleFromJobTitle,
  priceToCents,
  refId,
  firstRefId,
  cfValue,
} from "./extract";

type Rec = Record<string, unknown>;
type FunnelStepValue = (typeof schema.funnelStep.enumValues)[number];
const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);

const COMPANY_AVALYST_CF = "CF_oJZmPOUbSQjjYMgv"; // "ID Plataforma Avalyst" (COMPANY/NUMBER)

interface StageInfo {
  name: string;
  pipelineId: string;
  pipelineName: string;
  funnelStep: FunnelStepValue | null;
  isProposta: boolean;
}

async function inBatches<T>(
  rows: T[],
  size: number,
  fn: (batch: T[]) => Promise<unknown>,
) {
  for (let i = 0; i < rows.length; i += size) {
    const batch = rows.slice(i, i + size);
    if (batch.length) await fn(batch);
  }
}

/** Mapa stageId → info (pagina TODAS as etapas; a lista trava em 10). */
async function fetchStageMap(client: MoskitClient): Promise<Map<string, StageInfo>> {
  const pipelines: Rec[] = [];
  for await (const p of client.paginate("pipelines")) pipelines.push(p as Rec);
  const pipeName = new Map(pipelines.map((p) => [String(p.id), String(p.name).trim()]));
  const map = new Map<string, StageInfo>();
  for await (const s of client.paginate("stages")) {
    const st = s as Rec;
    const pid = refId(st.pipeline) ?? "";
    const pname = pipeName.get(pid) ?? "";
    const name = String(st.name).trim();
    map.set(String(st.id), {
      name,
      pipelineId: pid,
      pipelineName: pname,
      funnelStep: fieldMap.stageToFunnelStep[name] ?? null,
      isProposta: pname === fieldMap.contractPipelineName,
    });
  }
  return map;
}

/** Mapa optionId → rótulo da Origem Inbound ("Origem Lead"). */
async function fetchInboundOptions(client: MoskitClient): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const opts = (await client.get(
      `customFields/${fieldMap.dealFields.origemInbound}/options`,
    )) as Rec[];
    for (const o of opts ?? []) map.set(String(o.id), String(o.label ?? o.value ?? o.id));
  } catch {
    /* sem opções */
  }
  return map;
}

export async function runFullSync() {
  const db = getDb();
  const client = new MoskitClient();
  const [run] = await db
    .insert(schema.syncRuns)
    .values({ kind: "full", status: "running" })
    .returning({ id: schema.syncRuns.id });
  const runId = run.id;
  log("Sync iniciado (run", runId, ")");

  try {
    // 1) Usuários ------------------------------------------------------
    const users = (await client.users()) as Rec[];
    await inBatches(
      users.map((u) => ({
        moskitId: String(u.id),
        name: String(u.name ?? "—"),
        email: (u.username as string) ?? null,
        role: roleFromJobTitle(u.jobTitle),
        active: Boolean(u.active),
      })),
      200,
      (b) => db.insert(schema.users).values(b).onConflictDoNothing(),
    );
    const userRows = await db
      .select({ id: schema.users.id, moskitId: schema.users.moskitId })
      .from(schema.users);
    const userMap = new Map(userRows.map((r) => [r.moskitId!, r.id]));
    log("Usuários:", users.length);

    // 2) Stages/pipelines + opções de inbound (mapas em memória) -------
    const stageMap = await fetchStageMap(client);
    const inboundOptions = await fetchInboundOptions(client);

    // 3) Companies → imobiliárias --------------------------------------
    const companyMap = new Map<string, { name: string | null; avalystId: string | null }>();
    let compCount = 0;
    for await (const comp of client.companies()) {
      const c = comp as Rec;
      companyMap.set(String(c.id), {
        name: (c.name as string) ?? null,
        avalystId: cfValue(c.entityCustomFields, COMPANY_AVALYST_CF),
      });
      if (++compCount % 1000 === 0) log("Companies lidas:", compCount);
    }
    log("Companies:", compCount);

    // 4) Deals (buffer normalizado) ------------------------------------
    interface NDeal {
      moskitId: string;
      name: string | null;
      companyId: string | null;
      contactId: string | null;
      ownerId: number | null;
      stage: StageInfo | null;
      stageId: string | null;
      status: string | null;
      isProposta: boolean;
      valueCents: number | null;
      dealCreatedAt: Date | null;
      closeDate: Date | null;
      lostReason: string | null;
      origin: ReturnType<typeof extractOrigin>;
    }
    const buffer: NDeal[] = [];
    const propostaMissingValue: number[] = [];
    let dealCount = 0;
    for await (const deal of client.deals()) {
      const d = deal as Rec;
      const stageId = refId(d.stage);
      const stage = stageId ? (stageMap.get(stageId) ?? null) : null;
      const isProposta = stage?.isProposta ?? false;
      const companyId = firstRefId(d.companies);
      let valueCents = priceToCents(d.price, d.dealProducts);
      if (isProposta && valueCents == null) propostaMissingValue.push(Number(d.id));
      buffer.push({
        moskitId: String(d.id),
        name: (d.name as string) ?? null,
        companyId,
        contactId: firstRefId(d.contacts),
        ownerId: userMap.get(refId(d.responsible) ?? "") ?? null,
        stage,
        stageId,
        status: (d.status as string) ?? null,
        isProposta,
        valueCents,
        dealCreatedAt: d.dateCreated ? new Date(String(d.dateCreated)) : null,
        closeDate: d.closeDate ? new Date(String(d.closeDate)) : null,
        lostReason: (d.lostReason as string) ?? null,
        origin: extractOrigin(d.entityCustomFields),
      });
      if (companyId && !companyMap.has(companyId)) companyMap.set(companyId, { name: null, avalystId: null });
      if (++dealCount % 1000 === 0) log("Deals lidos:", dealCount, "/ propostas s/ valor:", propostaMissingValue.length);
    }
    log("Deals:", dealCount, "| propostas sem valor na listagem:", propostaMissingValue.length);

    // 4b) Buscar preço dos negócios de proposta sem valor (detalhe) ----
    const limit = 6000;
    const toFetch = propostaMissingValue.slice(0, limit);
    if (toFetch.length) log("Buscando detalhe de", toFetch.length, "propostas p/ valor…");
    const valueById = new Map<string, number>();
    for (let i = 0; i < toFetch.length; i++) {
      try {
        const full = (await client.deal(toFetch[i])) as Rec;
        const v = priceToCents(full.price, full.dealProducts);
        if (v != null) valueById.set(String(toFetch[i]), v);
      } catch {
        /* ignora deal individual com erro */
      }
      if ((i + 1) % 500 === 0) log("  detalhes:", i + 1, "/", toFetch.length);
    }
    for (const nd of buffer) {
      if (nd.valueCents == null && valueById.has(nd.moskitId)) nd.valueCents = valueById.get(nd.moskitId)!;
    }

    // 5) Inserir imobiliárias (a partir do companyMap) -----------------
    await inBatches(
      [...companyMap.entries()].map(([id, info]) => ({
        moskitId: id,
        moskitEntity: "company",
        name: info.name ?? `Imobiliária ${id}`,
        avalystId: info.avalystId,
      })),
      200,
      (b) => db.insert(schema.imobiliarias).values(b).onConflictDoNothing(),
    );
    const imobRows = await db
      .select({ id: schema.imobiliarias.id, moskitId: schema.imobiliarias.moskitId })
      .from(schema.imobiliarias);
    const imobMap = new Map(imobRows.map((r) => [r.moskitId, r.id]));
    log("Imobiliárias:", imobMap.size);

    // 6) Inserir deals -------------------------------------------------
    await inBatches(
      buffer.map((d) => ({
        moskitId: d.moskitId,
        name: d.name,
        imobiliariaId: d.companyId ? (imobMap.get(d.companyId) ?? null) : null,
        moskitCompanyId: d.companyId,
        moskitContactId: d.contactId,
        ownerId: d.ownerId,
        pipelineId: d.stage?.pipelineId ?? null,
        pipelineName: d.stage?.pipelineName ?? null,
        stageId: d.stageId,
        stageName: d.stage?.name ?? null,
        funnelStep: d.stage?.funnelStep ?? null,
        isProposta: d.isProposta,
        status: d.status,
        valueCents: d.valueCents,
        lostReason: d.lostReason,
        dealCreatedAt: d.dealCreatedAt,
        closeDate: d.closeDate,
        utmSource: d.origin.utmSource,
        utmMedium: d.origin.utmMedium,
        utmCampaign: d.origin.utmCampaign,
        utmContent: d.origin.utmContent,
        utmTerm: d.origin.utmTerm,
        inboundOriginRaw: d.origin.inboundOriginRaw,
        inboundOriginLabel: d.origin.inboundOriginRaw
          ? (inboundOptions.get(d.origin.inboundOriginRaw) ?? null)
          : null,
        cidade: d.origin.cidade,
        uf: d.origin.uf,
      })),
      200,
      (b) => db.insert(schema.deals).values(b).onConflictDoNothing(),
    );
    log("Deals inseridos.");

    // 7) Derivações em SQL --------------------------------------------
    await deriveAttribution();
    log("Derivações concluídas.");

    await db
      .update(schema.syncRuns)
      .set({ status: "success", finishedAt: new Date(), recordsProcessed: dealCount })
      .where(sql`${schema.syncRuns.id} = ${runId}`);
    log("Sync OK. Deals:", dealCount, "Imobiliárias:", imobMap.size);
    return { deals: dealCount, imobiliarias: imobMap.size };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await db
      .update(schema.syncRuns)
      .set({ status: "error", finishedAt: new Date(), error: msg })
      .where(sql`${schema.syncRuns.id} = ${runId}`);
    throw err;
  }
}

/** Deriva atribuição de entrada, funil, status, contratos e receita a partir de `deals`. */
export async function deriveAttribution() {
  const db = getDb();
  const stmts = [
    // entered_at = primeiro deal da imobiliária
    sql`UPDATE imobiliarias i SET entered_at = d.min_created
        FROM (SELECT imobiliaria_id, MIN(deal_created_at) min_created FROM deals
              WHERE imobiliaria_id IS NOT NULL GROUP BY imobiliaria_id) d
        WHERE i.id = d.imobiliaria_id`,
    // atribuição de entrada = primeiro deal COM utm_source
    sql`UPDATE imobiliarias i SET
          entry_utm_source = d.utm_source, entry_utm_medium = d.utm_medium,
          entry_utm_campaign = d.utm_campaign, entry_utm_content = d.utm_content,
          entry_utm_term = d.utm_term, entry_conversion_date = d.deal_created_at,
          cidade = COALESCE(i.cidade, d.cidade), uf = COALESCE(i.uf, d.uf)
        FROM (SELECT DISTINCT ON (imobiliaria_id) imobiliaria_id, utm_source, utm_medium,
                 utm_campaign, utm_content, utm_term, deal_created_at, cidade, uf
              FROM deals WHERE imobiliaria_id IS NOT NULL AND utm_source IS NOT NULL
              ORDER BY imobiliaria_id, deal_created_at ASC) d
        WHERE i.id = d.imobiliaria_id`,
    // canais de marketing (= utm_source) + ligação
    sql`INSERT INTO marketing_channels (name)
        SELECT DISTINCT entry_utm_source FROM imobiliarias WHERE entry_utm_source IS NOT NULL
        ON CONFLICT (name) DO NOTHING`,
    sql`UPDATE imobiliarias i SET entry_marketing_channel_id = mc.id
        FROM marketing_channels mc WHERE mc.name = i.entry_utm_source`,
    // origem inbound de entrada (primeiro deal com Origem Lead)
    sql`UPDATE imobiliarias i SET entry_inbound_label = d.lbl
        FROM (SELECT DISTINCT ON (imobiliaria_id) imobiliaria_id, inbound_origin_label AS lbl
              FROM deals WHERE imobiliaria_id IS NOT NULL AND inbound_origin_label IS NOT NULL
              ORDER BY imobiliaria_id, deal_created_at ASC) d
        WHERE i.id = d.imobiliaria_id`,
    // funnel_step = etapa mais avançada
    sql`UPDATE imobiliarias i SET funnel_step = d.step::funnel_step
        FROM (SELECT DISTINCT ON (imobiliaria_id) imobiliaria_id, funnel_step::text AS step
              FROM deals WHERE imobiliaria_id IS NOT NULL AND funnel_step IS NOT NULL
              ORDER BY imobiliaria_id, CASE funnel_step
                WHEN 'churn' THEN 0 WHEN 'lead' THEN 1 WHEN 'qualificacao' THEN 2
                WHEN 'reuniao' THEN 3 WHEN 'cadastro' THEN 4 WHEN 'ativa' THEN 5 END DESC) d
        WHERE i.id = d.imobiliaria_id`,
    // status ativa + 1ª venda (proposta ganha)
    sql`UPDATE imobiliarias i SET status = 'ativa',
          first_sale_at = w.first_won,
          activated_at = COALESCE(i.activated_at, w.first_won)
        FROM (SELECT imobiliaria_id, MIN(close_date) first_won FROM deals
              WHERE is_proposta AND status = 'WON' AND imobiliaria_id IS NOT NULL
              GROUP BY imobiliaria_id) w
        WHERE i.id = w.imobiliaria_id`,
    // histórico de origem (entrada) — idempotente
    sql`DELETE FROM lead_origin_history WHERE is_entry = true`,
    sql`INSERT INTO lead_origin_history (imobiliaria_id, marketing_channel_id, utm_source,
          utm_medium, utm_campaign, utm_content, utm_term, conversion_date, captured_at, source, is_entry)
        SELECT id, entry_marketing_channel_id, entry_utm_source, entry_utm_medium, entry_utm_campaign,
          entry_utm_content, entry_utm_term, entry_conversion_date,
          COALESCE(entry_conversion_date, now()), 'entry', true
        FROM imobiliarias WHERE entry_utm_source IS NOT NULL`,
    // contratos (= deals de Gestão de Propostas)
    sql`INSERT INTO contracts (moskit_id, imobiliaria_id, signed_at, value_cents, status)
        SELECT moskit_id, imobiliaria_id,
          CASE WHEN status = 'WON' THEN close_date ELSE NULL END, value_cents, status
        FROM deals WHERE is_proposta AND imobiliaria_id IS NOT NULL
        ON CONFLICT (moskit_id) DO NOTHING`,
    // receita (propostas ganhas)
    sql`DELETE FROM revenue_events WHERE source = 'moskit_proposta'`,
    sql`INSERT INTO revenue_events (imobiliaria_id, occurred_at, amount_cents, kind, ref_id, source)
        SELECT imobiliaria_id, COALESCE(close_date, deal_created_at), value_cents, 'contrato',
          moskit_id, 'moskit_proposta'
        FROM deals WHERE is_proposta AND status = 'WON' AND value_cents IS NOT NULL
          AND imobiliaria_id IS NOT NULL`,
  ];
  for (const s of stmts) await db.execute(s);
}

/**
 * Corrige dados JÁ sincronizados sem re-buscar os 25k deals:
 * remapeia pipeline/etapa/funil/is_proposta (com as 15 etapas), resolve os
 * rótulos da Origem Inbound e re-deriva a atribuição.
 */
export async function enrichExisting() {
  const db = getDb();
  const client = new MoskitClient();
  const stageMap = await fetchStageMap(client);
  const inbound = await fetchInboundOptions(client);
  log("Etapas:", stageMap.size, "| opções inbound:", inbound.size);

  for (const [stageId, info] of stageMap) {
    await db.execute(sql`
      UPDATE deals SET
        pipeline_id = ${info.pipelineId},
        pipeline_name = ${info.pipelineName},
        stage_name = ${info.name},
        funnel_step = ${info.funnelStep ? sql`${info.funnelStep}::funnel_step` : sql`NULL`},
        is_proposta = ${info.isProposta}
      WHERE stage_id = ${stageId}`);
  }
  for (const [optId, label] of inbound) {
    await db.execute(
      sql`UPDATE deals SET inbound_origin_label = ${label} WHERE inbound_origin_raw = ${optId}`,
    );
  }
  await deriveAttribution();
  log("Enriquecimento concluído.");
}
