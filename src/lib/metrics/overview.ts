import { db, q, num, str } from "./shared";
import { dealFilter, imobFilter, type Filters } from "@/lib/filters";

export interface OverviewData {
  receitaReais: number;
  contratosGanhos: number;
  imobiliariasAtivas: number;
  ticketMedioReais: number;
  totalImobiliarias: number;
  totalDeals: number;
  funnel: { step: string; label: string; count: number }[];
  inbound: { label: string; count: number }[];
  sellers: { name: string; contratos: number; valorReais: number }[];
  revenueByMonth: { month: string; totalReais: number }[];
  lastSync: { finishedAt: string | null; status: string | null } | null;
}

const FUNNEL_ORDER: { step: string; label: string }[] = [
  { step: "lead", label: "Lead" },
  { step: "qualificacao", label: "Qualificação" },
  { step: "reuniao", label: "Reunião" },
  { step: "cadastro", label: "Cadastro" },
  { step: "ativa", label: "Ativa" },
];

export async function getOverview(f: Filters): Promise<OverviewData> {
  const d = dealFilter(f);
  const i = imobFilter(f);

  const [kpi] = await q(
    `select coalesce(sum(d.value_cents) filter (where d.status='WON'),0) receita_cents,
       count(*) filter (where d.status='WON') contratos_ganhos
     from deals d${d.join} where d.is_proposta${d.and}`,
    d.params,
  );
  const [ativas] = await q(
    `select count(*) n from imobiliarias i where i.status='ativa'${i.and}`,
    i.params,
  );
  const [tImob] = await q(`select count(*) n from imobiliarias i${i.where}`, i.params);
  const [tDeals] = await q(`select count(*) n from deals d${d.join}${d.where}`, d.params);

  const funnelMap = new Map(
    (
      await q(
        `select funnel_step, count(*)::int n from imobiliarias i
         where i.funnel_step is not null${i.and} group by funnel_step`,
        i.params,
      )
    ).map((r) => [str(r.funnel_step), num(r.n)]),
  );

  const inbound = (
    await q(
      `select entry_inbound_label label, count(*)::int n from imobiliarias i
       where i.entry_inbound_label is not null${i.and}
       group by entry_inbound_label order by n desc limit 8`,
      i.params,
    )
  ).map((r) => ({ label: str(r.label), count: num(r.n) }));

  const sellers = (
    await q(
      `select u.name, count(*)::int contratos, coalesce(sum(d.value_cents),0) valor_cents
       from deals d${d.join} join users u on u.id=d.owner_id
       where d.is_proposta and d.status='WON' and d.value_cents is not null${d.and}
       group by u.name order by valor_cents desc limit 6`,
      d.params,
    )
  ).map((r) => ({ name: str(r.name), contratos: num(r.contratos), valorReais: num(r.valor_cents) / 100 }));

  const revenueByMonth = (
    await q(
      `select to_char(date_trunc('month', coalesce(d.close_date, d.deal_created_at)),'YYYY-MM') as ym,
        coalesce(sum(d.value_cents),0) as total_cents
       from deals d${d.join}
       where d.is_proposta and d.status='WON' and d.value_cents is not null${d.and}
       group by 1 order by 1`,
      d.params,
    )
  ).map((r) => ({ month: str(r.ym), totalReais: num(r.total_cents) / 100 }));

  const [run] = (await db()`
    select finished_at, status from sync_runs where kind='full' order by id desc limit 1`) as Record<string, unknown>[];

  const contratosGanhos = num(kpi?.contratos_ganhos);
  const receitaReais = num(kpi?.receita_cents) / 100;

  return {
    receitaReais,
    contratosGanhos,
    imobiliariasAtivas: num(ativas?.n),
    ticketMedioReais: contratosGanhos ? receitaReais / contratosGanhos : 0,
    totalImobiliarias: num(tImob?.n),
    totalDeals: num(tDeals?.n),
    funnel: FUNNEL_ORDER.map((x) => ({ ...x, count: funnelMap.get(x.step) ?? 0 })),
    inbound,
    sellers,
    revenueByMonth,
    lastSync: run
      ? { finishedAt: run.finished_at ? str(run.finished_at) : null, status: run.status ? str(run.status) : null }
      : null,
  };
}
