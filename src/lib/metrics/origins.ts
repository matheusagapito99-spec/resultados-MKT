import { q, num, str } from "./shared";
import { dealFilter, imobFilter, type Filters } from "@/lib/filters";

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

function byColumn(col: string, i: ReturnType<typeof imobFilter>) {
  return q(
    `select i.${col} label, count(*)::int imob,
       count(*) filter (where i.status='ativa')::int ativas,
       coalesce(sum(rev.cnt),0)::int contratos,
       coalesce(sum(rev.val),0) receita_cents
     from imobiliarias i
     left join (select imobiliaria_id, count(*) cnt, sum(value_cents) val from deals
                where is_proposta and status='WON' group by imobiliaria_id) rev
       on rev.imobiliaria_id = i.id
     where i.${col} is not null${i.and}
     group by i.${col} order by receita_cents desc nulls last, imob desc`,
    i.params,
  );
}

export async function getOrigins(f: Filters): Promise<OriginsData> {
  const i = imobFilter(f);
  const d = dealFilter(f);

  const inbound = (await byColumn("entry_inbound_label", i)).map(map);
  const marketing = (await byColumn("entry_utm_source", i)).map(map);
  const [utm] = await q(
    `select count(*)::int n from deals d where d.utm_source is not null${d.and}`,
    d.params,
  );

  return { inbound, marketing, utmDeals: num(utm?.n) };
}
