/**
 * Filtros globais (querystring) + condições SQL.
 *
 * Universo de interesse = leads de INBOUND + MARKETING somente (origem inbound não-outbound
 * OU origem de marketing/UTM). Demais canais do CRM são excluídos. O canal selecionado
 * filtra por rótulo inbound OU utm_source.
 * Período aplica a `deal_created_at` (deals) e `entered_at` (imobiliárias = data de criação do lead).
 */
import { getSql } from "@/lib/db";

export interface Filters {
  period: string;
  from: string | null;
  to: string | null;
  source: string; // canal (rótulo inbound ou utm_source) ou ''
  pipeline: string;
  stage: string;
}

export const PERIOD_OPTIONS = [
  { key: "all", label: "Todo o período" },
  { key: "7d", label: "Últimos 7 dias" },
  { key: "28d", label: "Últimos 28 dias" },
  { key: "3m", label: "Últimos 3 meses" },
  { key: "6m", label: "Últimos 6 meses" },
  { key: "12m", label: "Últimos 12 meses" },
  { key: "custom", label: "Personalizado" },
] as const;

const PERIOD_LABEL = new Map<string, string>(PERIOD_OPTIONS.map((o) => [o.key, o.label]));

/** Condição que define o universo inbound+marketing (alias da tabela de imobiliárias). */
const universe = (a: string) =>
  `((${a}.entry_inbound_label is not null and ${a}.entry_inbound_label not ilike '%outbound%') or ${a}.entry_utm_source is not null)`;

const iso = (d: Date) => d.toISOString().slice(0, 10);

function presetRange(key: string): { from: string | null; to: string | null } {
  const to = new Date();
  const from = new Date();
  switch (key) {
    case "7d": from.setDate(from.getDate() - 7); break;
    case "28d": from.setDate(from.getDate() - 28); break;
    case "3m": from.setMonth(from.getMonth() - 3); break;
    case "6m": from.setMonth(from.getMonth() - 6); break;
    case "12m": from.setMonth(from.getMonth() - 12); break;
    default: return { from: null, to: null };
  }
  return { from: iso(from), to: iso(to) };
}

const one = (v: string | string[] | undefined): string => (Array.isArray(v) ? v[0] : v) ?? "";
export type SP = { [k: string]: string | string[] | undefined };

export function parseFilters(sp: SP): Filters {
  const period = one(sp.period) || "all";
  const source = one(sp.source);
  const pipeline = one(sp.pipeline);
  const stage = one(sp.stage);
  let from: string | null = null;
  let to: string | null = null;
  if (period === "custom") {
    from = one(sp.from) || null;
    to = one(sp.to) || null;
  } else if (period !== "all") {
    ({ from, to } = presetRange(period));
  }
  return { period, from, to, source, pipeline, stage };
}

export function periodLabel(f: Filters): string {
  if (f.period === "custom") {
    if (f.from && f.to) return `${f.from} a ${f.to}`;
    if (f.from) return `desde ${f.from}`;
    return "Personalizado";
  }
  return PERIOD_LABEL.get(f.period) ?? "Todo o período";
}

/** Mês de referência (YYYY-MM) derivado do período: fim do período, ou mês atual. */
export function referenceMonth(f: Filters): { year: number; month: number } {
  const base = f.to ? new Date(`${f.to}T00:00:00`) : new Date();
  return { year: base.getFullYear(), month: base.getMonth() + 1 };
}

/** Lista de meses (YYYY-MM) de janeiro até o mês de referência; se ref=jan, 3 meses antes. */
export function monthsUntilReference(f: Filters): { ym: string; label: string }[] {
  const { year, month } = referenceMonth(f);
  const MES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const out: { ym: string; label: string }[] = [];
  const push = (y: number, m: number) =>
    out.push({ ym: `${y}-${String(m).padStart(2, "0")}`, label: `${MES[m - 1]}/${String(y).slice(2)}` });
  if (month === 1) {
    // 3 meses antes (nov, dez do ano anterior + jan)
    push(year - 1, 11);
    push(year - 1, 12);
    push(year, 1);
  } else {
    for (let m = 1; m <= month; m++) push(year, m);
  }
  return out;
}

interface Clause {
  where: string;
  and: string;
  join: string;
  params: unknown[];
}

function buildImob(f: Filters, alias = "i"): Clause {
  const conds: string[] = [universe(alias)];
  const params: unknown[] = [];
  const add = (cond: (i: number) => string, value: unknown) => {
    params.push(value);
    conds.push(cond(params.length));
  };
  if (f.from) add((i) => `${alias}.entered_at >= $${i}`, f.from);
  if (f.to) add((i) => `${alias}.entered_at < ($${i}::date + 1)`, f.to);
  if (f.source)
    add(
      (i) => `(${alias}.entry_inbound_label = $${i} or ${alias}.entry_utm_source = $${i})`,
      f.source,
    );
  return {
    where: ` where ${conds.join(" and ")}`,
    and: ` and ${conds.join(" and ")}`,
    join: "",
    params,
  };
}

/** Condições p/ imobiliárias (universo + período por entrada + canal). */
export function imobFilter(f: Filters, alias = "i"): Clause {
  return buildImob(f, alias);
}

/**
 * Condições p/ deals: junta com imobiliárias (`_i`) p/ aplicar universo+canal, e filtra
 * período (deal_created_at), pipeline e etapa no próprio deal.
 */
export function dealFilter(f: Filters, alias = "d"): Clause {
  const conds: string[] = [universe("_i")];
  const params: unknown[] = [];
  const add = (cond: (i: number) => string, value: unknown) => {
    params.push(value);
    conds.push(cond(params.length));
  };
  if (f.from) add((i) => `${alias}.deal_created_at >= $${i}`, f.from);
  if (f.to) add((i) => `${alias}.deal_created_at < ($${i}::date + 1)`, f.to);
  if (f.source)
    add((i) => `(_i.entry_inbound_label = $${i} or _i.entry_utm_source = $${i})`, f.source);
  if (f.pipeline) add((i) => `${alias}.pipeline_name = $${i}`, f.pipeline);
  if (f.stage) add((i) => `${alias}.stage_name = $${i}`, f.stage);
  return {
    where: ` where ${conds.join(" and ")}`,
    and: ` and ${conds.join(" and ")}`,
    join: ` join imobiliarias _i on _i.id = ${alias}.imobiliaria_id`,
    params,
  };
}

export interface FilterOptions {
  channels: string[];
  pipelines: { name: string; stages: string[] }[];
}

/** Opções: canais = origens inbound (não-outbound) + sources de marketing; pipelines/etapas. */
export async function getFilterOptions(): Promise<FilterOptions> {
  const sql = getSql();
  const inbRows = (await sql`
    select distinct entry_inbound_label c from imobiliarias
    where entry_inbound_label is not null and entry_inbound_label not ilike '%outbound%'`) as Record<string, unknown>[];
  const utmRows = (await sql`
    select distinct entry_utm_source c from imobiliarias
    where entry_utm_source is not null`) as Record<string, unknown>[];
  const stageRows = (await sql`
    select distinct pipeline_name, stage_name from deals
    where pipeline_name is not null and stage_name is not null
    order by pipeline_name, stage_name`) as Record<string, unknown>[];

  const channels = Array.from(
    new Set([...inbRows, ...utmRows].map((r) => String(r.c))),
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  const byPipe = new Map<string, string[]>();
  for (const r of stageRows) {
    const p = String(r.pipeline_name);
    if (!byPipe.has(p)) byPipe.set(p, []);
    byPipe.get(p)!.push(String(r.stage_name));
  }
  const order = ["Prospecção de Imobiliárias", "Cadastros - OPPs", "Gestão de Propostas"];
  const pipelines = [...byPipe.entries()]
    .map(([name, stages]) => ({ name, stages }))
    .sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));

  return { channels, pipelines };
}
