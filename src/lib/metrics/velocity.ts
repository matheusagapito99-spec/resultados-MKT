import { db, rows, num } from "./shared";

export interface VelocityData {
  avgCycleDays: number;
  comVenda: number;
  avgAtivacaoDays: number;
  comAtivacao: number;
  abertas: number;
  idadeMediaDias: number;
  paradas30: number;
  paradas60: number;
  /** distribuição do ciclo de venda (dias) em faixas */
  cicloBuckets: { label: string; count: number }[];
}

export async function getVelocity(): Promise<VelocityData> {
  const sql = db();

  const [cycle] = rows(await sql`
    select
      avg(extract(epoch from (first_sale_at - entered_at))/86400)
        filter (where first_sale_at is not null and entered_at is not null and first_sale_at >= entered_at) avg_cycle,
      count(*) filter (where first_sale_at is not null and entered_at is not null)::int com_venda,
      avg(extract(epoch from (activated_at - entered_at))/86400)
        filter (where activated_at is not null and entered_at is not null and activated_at >= entered_at) avg_ativacao,
      count(*) filter (where activated_at is not null and entered_at is not null)::int com_ativacao
    from imobiliarias`);

  const [aging] = rows(await sql`
    select count(*)::int abertas,
      avg(extract(epoch from (now() - deal_created_at))/86400) idade_media,
      count(*) filter (where deal_created_at < now() - interval '30 days')::int paradas30,
      count(*) filter (where deal_created_at < now() - interval '60 days')::int paradas60
    from deals where is_proposta and status='OPEN' and deal_created_at is not null`);

  const buckets = rows(await sql`
    select faixa, count(*)::int n from (
      select case
        when dias <= 7 then '0–7 dias'
        when dias <= 30 then '8–30 dias'
        when dias <= 90 then '31–90 dias'
        else '90+ dias' end as faixa
      from (
        select extract(epoch from (first_sale_at - entered_at))/86400 dias
        from imobiliarias
        where first_sale_at is not null and entered_at is not null and first_sale_at >= entered_at
      ) t
    ) b group by faixa`);
  const order = ["0–7 dias", "8–30 dias", "31–90 dias", "90+ dias"];
  const bMap = new Map(buckets.map((r) => [String(r.faixa), num(r.n)]));

  return {
    avgCycleDays: Math.round(num(cycle?.avg_cycle)),
    comVenda: num(cycle?.com_venda),
    avgAtivacaoDays: Math.round(num(cycle?.avg_ativacao)),
    comAtivacao: num(cycle?.com_ativacao),
    abertas: num(aging?.abertas),
    idadeMediaDias: Math.round(num(aging?.idade_media)),
    paradas30: num(aging?.paradas30),
    paradas60: num(aging?.paradas60),
    cicloBuckets: order.map((label) => ({ label, count: bMap.get(label) ?? 0 })),
  };
}
