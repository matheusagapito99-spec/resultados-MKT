import { getSql } from "@/lib/db";

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

type Row = Record<string, unknown>;
const rows = (r: unknown): Row[] => r as Row[];
const num = (v: unknown) => Number(v ?? 0);
const str = (v: unknown) => String(v ?? "");

export async function getOverview(): Promise<OverviewData> {
  const sql = getSql();

  const [kpi] = rows(await sql`
    select
      coalesce(sum(value_cents) filter (where status='WON'),0) as receita_cents,
      count(*) filter (where status='WON') as contratos_ganhos
    from deals where is_proposta`);

  const [ativas] = rows(await sql`select count(*) n from imobiliarias where status='ativa'`);
  const [totals] = rows(await sql`
    select (select count(*) from imobiliarias) as imob,
           (select count(*) from deals) as deals`);

  const funnelMap = new Map(
    rows(
      await sql`select funnel_step, count(*)::int n from imobiliarias
        where funnel_step is not null group by funnel_step`,
    ).map((r) => [str(r.funnel_step), num(r.n)]),
  );

  const inbound = rows(
    await sql`select entry_inbound_label as label, count(*)::int n from imobiliarias
      where entry_inbound_label is not null
      group by entry_inbound_label order by n desc limit 8`,
  ).map((r) => ({ label: str(r.label), count: num(r.n) }));

  const sellers = rows(
    await sql`select u.name, count(*)::int contratos, coalesce(sum(d.value_cents),0) as valor_cents
      from deals d join users u on u.id = d.owner_id
      where d.is_proposta and d.status='WON' and d.value_cents is not null
      group by u.name order by valor_cents desc limit 6`,
  ).map((r) => ({
    name: str(r.name),
    contratos: num(r.contratos),
    valorReais: num(r.valor_cents) / 100,
  }));

  const revenueByMonth = rows(
    await sql`select to_char(date_trunc('month', occurred_at),'YYYY-MM') as month,
        coalesce(sum(amount_cents),0) as total_cents
      from revenue_events
      where occurred_at >= now() - interval '12 months'
      group by 1 order by 1`,
  ).map((r) => ({ month: str(r.month), totalReais: num(r.total_cents) / 100 }));

  const [run] = rows(await sql`
    select finished_at, status from sync_runs
    where kind='full' order by id desc limit 1`);

  const contratosGanhos = num(kpi?.contratos_ganhos);
  const receitaReais = num(kpi?.receita_cents) / 100;

  return {
    receitaReais,
    contratosGanhos,
    imobiliariasAtivas: num(ativas?.n),
    ticketMedioReais: contratosGanhos ? receitaReais / contratosGanhos : 0,
    totalImobiliarias: num(totals?.imob),
    totalDeals: num(totals?.deals),
    funnel: FUNNEL_ORDER.map((f) => ({ ...f, count: funnelMap.get(f.step) ?? 0 })),
    inbound,
    sellers,
    revenueByMonth,
    lastSync: run
      ? { finishedAt: run.finished_at ? str(run.finished_at) : null, status: str(run.status) || null }
      : null,
  };
}
