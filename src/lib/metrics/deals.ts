import { getSql } from "@/lib/db";

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

export interface DealFilters {
  page?: number;
  status?: string;
  pipeline?: string;
  q?: string;
}

const PAGE_SIZE = 25;

export async function getDeals(opts: DealFilters): Promise<DealsPage> {
  const sql = getSql();
  const page = Math.max(1, opts.page ?? 1);
  const offset = (page - 1) * PAGE_SIZE;

  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.status) {
    params.push(opts.status);
    where.push(`d.status = $${params.length}`);
  }
  if (opts.pipeline) {
    params.push(opts.pipeline);
    where.push(`d.pipeline_name = $${params.length}`);
  }
  if (opts.q) {
    params.push(`%${opts.q}%`);
    where.push(`(d.name ilike $${params.length} or im.name ilike $${params.length})`);
  }
  const whereSql = where.length ? `where ${where.join(" and ")}` : "";

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
