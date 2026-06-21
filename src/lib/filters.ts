/**
 * Filtros globais (propagados por querystring) e construção das condições SQL.
 * Período aplica a `deal_created_at` (deals) e `entered_at` (imobiliárias).
 */
import { getSql } from "@/lib/db";

export interface Filters {
  period: string; // 'all' | '7d' | '28d' | '3m' | '6m' | '12m' | 'custom'
  from: string | null; // 'YYYY-MM-DD'
  to: string | null; // 'YYYY-MM-DD' (inclusivo)
  source: string; // utm_source ou ''
  pipeline: string; // pipeline_name ou ''
  stage: string; // stage_name ou ''
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

const PERIOD_LABEL = new Map<string, string>(
  PERIOD_OPTIONS.map((o) => [o.key, o.label]),
);

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

const one = (v: string | string[] | undefined): string =>
  (Array.isArray(v) ? v[0] : v) ?? "";

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

interface Clause {
  where: string;
  and: string;
  params: unknown[];
}

function build(conds: string[], params: unknown[]): Clause {
  const body = conds.join(" and ");
  return {
    where: conds.length ? ` where ${body}` : "",
    and: conds.length ? ` and ${body}` : "",
    params,
  };
}

/** Condições para consultas sobre `deals` (alias informado). */
export function dealFilter(f: Filters, alias = "d"): Clause {
  const conds: string[] = [];
  const params: unknown[] = [];
  const add = (cond: (i: number) => string, value: unknown) => {
    params.push(value);
    conds.push(cond(params.length));
  };
  if (f.from) add((i) => `${alias}.deal_created_at >= $${i}`, f.from);
  if (f.to) add((i) => `${alias}.deal_created_at < ($${i}::date + 1)`, f.to);
  if (f.source) add((i) => `${alias}.utm_source = $${i}`, f.source);
  if (f.pipeline) add((i) => `${alias}.pipeline_name = $${i}`, f.pipeline);
  if (f.stage) add((i) => `${alias}.stage_name = $${i}`, f.stage);
  return build(conds, params);
}

/** Condições para consultas sobre `imobiliarias` (alias informado). Período por entrada + UTM source. */
export function imobFilter(f: Filters, alias = "i"): Clause {
  const conds: string[] = [];
  const params: unknown[] = [];
  const add = (cond: (i: number) => string, value: unknown) => {
    params.push(value);
    conds.push(cond(params.length));
  };
  if (f.from) add((i) => `${alias}.entered_at >= $${i}`, f.from);
  if (f.to) add((i) => `${alias}.entered_at < ($${i}::date + 1)`, f.to);
  if (f.source) add((i) => `${alias}.entry_utm_source = $${i}`, f.source);
  return build(conds, params);
}

export interface FilterOptions {
  sources: string[];
  pipelines: { name: string; stages: string[] }[];
}

/** Opções dos dropdowns: sources com histórico de conversão + pipelines/etapas reais. */
export async function getFilterOptions(): Promise<FilterOptions> {
  const sql = getSql();
  const srcRows = (await sql`
    select distinct entry_utm_source s from imobiliarias
    where entry_utm_source is not null order by 1`) as Record<string, unknown>[];
  const stageRows = (await sql`
    select distinct pipeline_name, stage_name from deals
    where pipeline_name is not null and stage_name is not null
    order by pipeline_name, stage_name`) as Record<string, unknown>[];

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

  return {
    sources: srcRows.map((r) => String(r.s)),
    pipelines,
  };
}
