import { q, num, str } from "./shared";
import { monthsUntilReference, type Filters } from "@/lib/filters";

export interface MonthRow {
  ym: string;
  label: string;
  novosLeads: number;
  reunioes: number;
  ganhos: number;
  taxaGanho: number; // %
  cicloMedioDias: number;
}
export interface InboundMonthly {
  months: MonthRow[];
  picoLeads: { value: number; label: string };
  maiorTaxa: { value: number; label: string };
  menorCiclo: { value: number; label: string };
  rangeLabel: string;
}

const UNIVERSE =
  "((i.entry_inbound_label is not null and i.entry_inbound_label not ilike '%outbound%') or i.entry_utm_source is not null)";

/** Série mensal de leads inbound (por data de criação) com reuniões, taxa de ganho e ciclo. */
export async function getInboundMonthly(f: Filters): Promise<InboundMonthly> {
  const months = monthsUntilReference(f);
  const start = `${months[0].ym}-01`;
  const [ry, rm] = months[months.length - 1].ym.split("-").map(Number);
  const endExclusive = new Date(Date.UTC(ry, rm, 1)).toISOString().slice(0, 10); // 1º dia do mês seguinte ao ref

  const conds = [UNIVERSE, `i.entered_at >= $1`, `i.entered_at < $2`];
  const params: unknown[] = [start, endExclusive];
  if (f.source) {
    params.push(f.source);
    conds.push(`(i.entry_inbound_label = $3 or i.entry_utm_source = $3)`);
  }

  const data = await q(
    `select to_char(date_trunc('month', i.entered_at),'YYYY-MM') as ym,
       count(*)::int novos,
       count(*) filter (where i.funnel_step in ('reuniao','cadastro','ativa'))::int reunioes,
       count(*) filter (where i.status='ativa')::int ganhos,
       avg(extract(epoch from (i.first_sale_at - i.entered_at))/86400)
         filter (where i.status='ativa' and i.first_sale_at is not null and i.first_sale_at >= i.entered_at) ciclo
     from imobiliarias i
     where ${conds.join(" and ")}
     group by 1`,
    params,
  );

  const byYm = new Map(data.map((r) => [str(r.ym), r]));
  const rows: MonthRow[] = months.map((m) => {
    const r = byYm.get(m.ym);
    const novos = num(r?.novos);
    const ganhos = num(r?.ganhos);
    return {
      ym: m.ym,
      label: m.label,
      novosLeads: novos,
      reunioes: num(r?.reunioes),
      ganhos,
      taxaGanho: novos ? (ganhos / novos) * 100 : 0,
      cicloMedioDias: Math.round(num(r?.ciclo)),
    };
  });

  const withLeads = rows.filter((r) => r.novosLeads > 0);
  const withGanho = rows.filter((r) => r.ganhos > 0);
  const pico = rows.reduce((a, b) => (b.novosLeads > a.novosLeads ? b : a), rows[0]);
  const maiorT = withLeads.reduce(
    (a, b) => (b.taxaGanho > a.taxaGanho ? b : a),
    withLeads[0] ?? rows[0],
  );
  const menorC = withGanho.reduce(
    (a, b) => (b.cicloMedioDias < a.cicloMedioDias ? b : a),
    withGanho[0] ?? rows[0],
  );

  return {
    months: rows,
    picoLeads: { value: pico?.novosLeads ?? 0, label: pico?.label ?? "—" },
    maiorTaxa: { value: maiorT?.taxaGanho ?? 0, label: maiorT?.label ?? "—" },
    menorCiclo: { value: menorC?.cicloMedioDias ?? 0, label: menorC?.label ?? "—" },
    rangeLabel: `${months[0].label} a ${months[months.length - 1].label}`,
  };
}
