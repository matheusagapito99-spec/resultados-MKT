/**
 * Filtros globais (querystring) + condições SQL — auditados contra o Moskit.
 *
 * ORIGEM (3 categorias, padrão "Todos"):
 *   - Inbound  = registros com Origem Lead = "Inbound".
 *   - Marketing = registros com utm_source preenchido (campanhas rastreadas); pode
 *                 ser refinado por canais (utm_source) específicos.
 *   - Todos    = Inbound + Marketing.
 * Período aplica a data de criação (deals: deal_created_at; imobiliárias: entered_at).
 */
import { getSql } from "@/lib/db";

export type Origin = "all" | "inbound" | "marketing";

export interface Filters {
  period: string;
  from: string | null;
  to: string | null;
  origin: Origin;
  channels: string[]; // utm_sources selecionados (quando origin=marketing)
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
  const originRaw = one(sp.origin);
  const origin: Origin = originRaw === "inbound" || originRaw === "marketing" ? originRaw : "all";
  const channels = one(sp.channels) ? one(sp.channels).split(",").filter(Boolean) : [];
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
  return { period, from, to, origin, channels, pipeline, stage };
}

export function periodLabel(f: Filters): string {
  if (f.period === "custom") {
    if (f.from && f.to) return `${f.from} a ${f.to}`;
    if (f.from) return `desde ${f.from}`;
    return "Personalizado";
  }
  return PERIOD_LABEL.get(f.period) ?? "Todo o período";
}

export const ORIGIN_LABEL: Record<Origin, string> = {
  all: "Todos",
  inbound: "Inbound",
  marketing: "Marketing",
};

/* ----------------- Eixo temporal dinâmico (gráfico de tendência) ----------------- */

export type Granularity = "day" | "week" | "month" | "quarter";
export interface Bucket { start: string; endExclusive: string; label: string; isRef: boolean }
export interface TimeAxis { granularity: Granularity; unit: string; buckets: Bucket[]; rangeLabel: string }

const DAY = 86400000;
const MES3 = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const GRAN_LABEL: Record<Granularity, string> = { day: "diária", week: "semanal", month: "mensal", quarter: "trimestral" };
const pad = (n: number) => String(n).padStart(2, "0");
const fmtISO = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const startOfDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const startOfWeek = (d: Date) => {
  const s = startOfDay(d);
  return new Date(s.getTime() - ((s.getUTCDay() + 6) % 7) * DAY);
};
const startOfMonth = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
const startOfQuarter = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), Math.floor(d.getUTCMonth() / 3) * 3, 1));
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);
const addMonths = (d: Date, n: number) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));

function granularityFor(f: Filters): Granularity {
  if (f.period === "custom" && f.from && f.to) {
    const days = Math.round((Date.parse(f.to) - Date.parse(f.from)) / DAY) + 1;
    return days <= 2 ? "day" : days <= 10 ? "week" : days <= 75 ? "month" : "quarter";
  }
  const m: Record<string, Granularity> = { "7d": "week", "28d": "month", "3m": "quarter", "6m": "quarter", "12m": "quarter", all: "month" };
  return m[f.period] ?? "month";
}

export function timeAxis(f: Filters): TimeAxis {
  const g = granularityFor(f);
  const end = f.to ? new Date(`${f.to}T00:00:00Z`) : new Date();
  const N = 6;
  const refStart = g === "day" ? startOfDay(end) : g === "week" ? startOfWeek(end) : g === "month" ? startOfMonth(end) : startOfQuarter(end);
  const stepStart = (i: number) =>
    g === "day" ? addDays(refStart, -i) : g === "week" ? addDays(refStart, -i * 7) : g === "month" ? addMonths(refStart, -i) : addMonths(refStart, -i * 3);
  const stepNext = (s: Date) =>
    g === "day" ? addDays(s, 1) : g === "week" ? addDays(s, 7) : g === "month" ? addMonths(s, 1) : addMonths(s, 3);
  const label = (s: Date) => {
    if (g === "day" || g === "week") return `${pad(s.getUTCDate())}/${pad(s.getUTCMonth() + 1)}`;
    if (g === "month") return `${MES3[s.getUTCMonth()]}/${String(s.getUTCFullYear()).slice(2)}`;
    return `Q${Math.floor(s.getUTCMonth() / 3) + 1}/${String(s.getUTCFullYear()).slice(2)}`;
  };
  const buckets: Bucket[] = [];
  for (let i = N - 1; i >= 0; i--) {
    const start = stepStart(i);
    buckets.push({ start: fmtISO(start), endExclusive: fmtISO(stepNext(start)), label: label(start), isRef: i === 0 });
  }
  return { granularity: g, unit: g, buckets, rangeLabel: `${buckets[0].label} – ${buckets[buckets.length - 1].label} · visão ${GRAN_LABEL[g]}` };
}

/* ----------------- Condições SQL de filtro ----------------- */

interface Clause { where: string; and: string; join: string; params: unknown[] }

/** Condições de ORIGEM nas colunas informadas (inbound label / utm source). */
function originConds(
  f: Filters,
  cols: { inbound: string; utm: string },
  params: unknown[],
): string[] {
  const c: string[] = [];
  if (f.origin === "inbound") {
    c.push(`${cols.inbound} = 'Inbound'`);
  } else if (f.origin === "marketing") {
    c.push(`${cols.utm} is not null`);
    if (f.channels.length) {
      const ph = f.channels.map((ch) => {
        params.push(ch);
        return `$${params.length}`;
      });
      c.push(`${cols.utm} in (${ph.join(", ")})`);
    }
  } else {
    c.push(`(${cols.inbound} = 'Inbound' or ${cols.utm} is not null)`);
  }
  return c;
}

/** Filtro p/ imobiliárias (origem por entrada + período por entered_at). */
export function imobFilter(f: Filters, alias = "i"): Clause {
  const params: unknown[] = [];
  const conds = originConds(f, { inbound: `${alias}.entry_inbound_label`, utm: `${alias}.entry_utm_source` }, params);
  if (f.from) { params.push(f.from); conds.push(`${alias}.entered_at >= $${params.length}`); }
  if (f.to) { params.push(f.to); conds.push(`${alias}.entered_at < ($${params.length}::date + 1)`); }
  return { where: ` where ${conds.join(" and ")}`, and: ` and ${conds.join(" and ")}`, join: "", params };
}

/** Filtro p/ deals via imobiliária (`_i`): origem da imobiliária + período/pipeline/etapa no deal. */
export function dealFilter(f: Filters, alias = "d"): Clause {
  const params: unknown[] = [];
  const conds = originConds(f, { inbound: "_i.entry_inbound_label", utm: "_i.entry_utm_source" }, params);
  if (f.from) { params.push(f.from); conds.push(`${alias}.deal_created_at >= $${params.length}`); }
  if (f.to) { params.push(f.to); conds.push(`${alias}.deal_created_at < ($${params.length}::date + 1)`); }
  if (f.pipeline) { params.push(f.pipeline); conds.push(`${alias}.pipeline_name = $${params.length}`); }
  if (f.stage) { params.push(f.stage); conds.push(`${alias}.stage_name = $${params.length}`); }
  return {
    where: ` where ${conds.join(" and ")}`,
    and: ` and ${conds.join(" and ")}`,
    join: ` join imobiliarias _i on _i.id = ${alias}.imobiliaria_id`,
    params,
  };
}

export interface FilterOptions {
  channels: string[]; // utm_sources de marketing (para o sub-filtro)
  pipelines: { name: string; stages: string[] }[];
}

export async function getFilterOptions(): Promise<FilterOptions> {
  const sql = getSql();
  const utmRows = (await sql`
    select utm_source c, count(*)::int n from deals
    where utm_source is not null group by utm_source order by n desc`) as Record<string, unknown>[];
  const stageRows = (await sql`
    select distinct pipeline_name, stage_name from deals
    where pipeline_name is not null and stage_name is not null
    order by pipeline_name, stage_name`) as Record<string, unknown>[];

  const channels = utmRows.map((r) => String(r.c));
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
