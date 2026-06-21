import { getSql } from "@/lib/db";
import type { Filters } from "@/lib/filters";

export interface DealRow {
  moskitId: string;
  ticket: string | null;
  status: string | null;
  pipeline: string | null;
  stage: string | null;
  valorReais: number | null;
  createdAt: string | null;
  imobiliaria: string | null;
  owner: string | null;
  inbound: string | null;
  utmSource: string | null;
}

export interface DealsPage {
  rows: DealRow[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

const PAGE_SIZE = 25;

/** Explorador de negócios: filtros globais (período/canal/pipeline/etapa) + status + busca. */
export async function getDeals(
  f: Filters,
  opts: { status?: string; q?: string; page?: number },
): Promise<DealsPage> {
  const sql = getSql();
  const page = Math.max(1, opts.page ?? 1);
  const offset = (page - 1) * PAGE_SIZE;

  // universo = inbound + marketing somente (via imobiliária `im`)
  const conds: string[] = [];
  const params: unknown[] = [];
  const add = (cond: (i: number) => string, value: unknown) => {
    params.push(value);
    conds.push(cond(params.length));
  };
  // origem (via imobiliária im): Todos = Inbound + Marketing
  if (f.origin === "inbound") {
    conds.push("im.entry_inbound_label = 'Inbound'");
  } else if (f.origin === "marketing") {
    conds.push("im.entry_utm_source is not null");
    if (f.channels.length) {
      const ph = f.channels.map((c) => {
        params.push(c);
        return `$${params.length}`;
      });
      conds.push(`im.entry_utm_source in (${ph.join(", ")})`);
    }
  } else {
    conds.push("(im.entry_inbound_label = 'Inbound' or im.entry_utm_source is not null)");
  }
  if (f.from) add((i) => `d.deal_created_at >= $${i}`, f.from);
  if (f.to) add((i) => `d.deal_created_at < ($${i}::date + 1)`, f.to);
  if (f.pipeline) add((i) => `d.pipeline_name = $${i}`, f.pipeline);
  if (f.stage) add((i) => `d.stage_name = $${i}`, f.stage);
  if (opts.status) add((i) => `d.status = $${i}`, opts.status);
  if (opts.q) {
    params.push(`%${opts.q}%`);
    const idx = params.length;
    conds.push(`(d.name ilike $${idx} or im.name ilike $${idx})`);
  }
  const whereSql = `where ${conds.join(" and ")}`;

  const list = (await sql.query(
    `select d.moskit_id, d.name ticket, d.status, d.pipeline_name, d.stage_name,
       d.value_cents, d.deal_created_at, im.name imobiliaria, u.name owner,
       d.inbound_origin_label, d.utm_source
     from deals d
     left join imobiliarias im on im.id = d.imobiliaria_id
     left join users u on u.id = d.owner_id
     ${whereSql}
     order by d.deal_created_at desc nulls last
     limit ${PAGE_SIZE} offset ${offset}`,
    params,
  )) as Record<string, unknown>[];

  const countRes = (await sql.query(
    `select count(*)::int n from deals d
     left join imobiliarias im on im.id = d.imobiliaria_id
     ${whereSql}`,
    params,
  )) as Record<string, unknown>[];
  const total = Number(countRes[0]?.n ?? 0);

  return {
    rows: list.map((r) => ({
      moskitId: String(r.moskit_id),
      ticket: (r.ticket as string) ?? null,
      status: (r.status as string) ?? null,
      pipeline: (r.pipeline_name as string) ?? null,
      stage: (r.stage_name as string) ?? null,
      valorReais: r.value_cents != null ? Number(r.value_cents) / 100 : null,
      createdAt: r.deal_created_at ? String(r.deal_created_at) : null,
      imobiliaria: (r.imobiliaria as string) ?? null,
      owner: (r.owner as string) ?? null,
      inbound: (r.inbound_origin_label as string) ?? null,
      utmSource: (r.utm_source as string) ?? null,
    })),
    total,
    page,
    pageSize: PAGE_SIZE,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}
