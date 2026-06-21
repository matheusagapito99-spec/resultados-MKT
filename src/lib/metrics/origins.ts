import { db, rows, num, str } from "./shared";

export interface OriginRow {
  label: string;
  imob: number;
  ativas: number;
  contratos: number;
  receitaReais: number;
}
export interface OriginsData {
  inbound: OriginRow[];
  marketing: OriginRow[];
  utmDeals: number;
}

const map = (r: Record<string, unknown>): OriginRow => ({
  label: str(r.label),
  imob: num(r.imob),
  ativas: num(r.ativas),
  contratos: num(r.contratos),
  receitaReais: num(r.receita_cents) / 100,
});

export async function getOrigins(): Promise<OriginsData> {
  const sql = db();

  const inbound = rows(
    await sql`
      select i.entry_inbound_label label, count(*)::int imob,
        count(*) filter (where i.status='ativa')::int ativas,
        coalesce(sum(rev.cnt),0)::int contratos,
        coalesce(sum(rev.val),0) receita_cents
      from imobiliarias i
      left join (select imobiliaria_id, count(*) cnt, sum(value_cents) val from deals
                 where is_proposta and status='WON' group by imobiliaria_id) rev
        on rev.imobiliaria_id = i.id
      where i.entry_inbound_label is not null
      group by i.entry_inbound_label order by receita_cents desc nulls last, imob desc`,
  ).map(map);

  const marketing = rows(
    await sql`
      select i.entry_utm_source label, count(*)::int imob,
        count(*) filter (where i.status='ativa')::int ativas,
        coalesce(sum(rev.cnt),0)::int contratos,
        coalesce(sum(rev.val),0) receita_cents
      from imobiliarias i
      left join (select imobiliaria_id, count(*) cnt, sum(value_cents) val from deals
                 where is_proposta and status='WON' group by imobiliaria_id) rev
        on rev.imobiliaria_id = i.id
      where i.entry_utm_source is not null
      group by i.entry_utm_source order by receita_cents desc nulls last, imob desc`,
  ).map(map);

  const [utm] = rows(
    await sql`select count(*)::int n from deals where utm_source is not null`,
  );

  return { inbound, marketing, utmDeals: num(utm?.n) };
}
