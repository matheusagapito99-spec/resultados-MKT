import { q, num, str } from "./shared";
import { timeAxis, type Filters, type Granularity } from "@/lib/filters";

export interface TrendBucket {
  label: string;
  isRef: boolean;
  novosLeads: number;
  reunioes: number;
  ganhos: number;
  taxaGanho: number; // %
  cicloMedioDias: number;
}

export interface InboundTrend {
  granularity: Granularity;
  rangeLabel: string;
  buckets: TrendBucket[];
  ref: TrendBucket;
  prev: TrendBucket | null;
  deltaNovos: number | null; // % vs período anterior
  deltaTaxa: number | null; // pontos percentuais
  deltaCiclo: number | null; // dias (variação)
}

const UNIVERSE =
  "((i.entry_inbound_label is not null and i.entry_inbound_label not ilike '%outbound%') or i.entry_utm_source is not null)";

/**
 * Série de tendência dos leads inbound (Kanban Prospecção), por data de criação do lead.
 * Granularidade e janela (6 períodos, referência à direita) vêm de `timeAxis(f)`.
 */
export async function getInboundTrend(f: Filters): Promise<InboundTrend> {
  const ax = timeAxis(f);
  const start = ax.buckets[0].start;
  const endEx = ax.buckets[ax.buckets.length - 1].endExclusive;

  const conds = [UNIVERSE, `i.entered_at >= $2`, `i.entered_at < $3`];
  const params: unknown[] = [ax.unit, start, endEx];
  if (f.source) {
    params.push(f.source);
    conds.push(`(i.entry_inbound_label = $4 or i.entry_utm_source = $4)`);
  }

  const data = await q(
    `select to_char(date_trunc($1, i.entered_at),'YYYY-MM-DD') as bstart,
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

  const byStart = new Map(data.map((r) => [str(r.bstart), r]));
  const buckets: TrendBucket[] = ax.buckets.map((b) => {
    const r = byStart.get(b.start);
    const novos = num(r?.novos);
    const ganhos = num(r?.ganhos);
    return {
      label: b.label,
      isRef: b.isRef,
      novosLeads: novos,
      reunioes: num(r?.reunioes),
      ganhos,
      taxaGanho: novos ? (ganhos / novos) * 100 : 0,
      cicloMedioDias: Math.round(num(r?.ciclo)),
    };
  });

  const ref = buckets[buckets.length - 1];
  const prev = buckets.length > 1 ? buckets[buckets.length - 2] : null;
  const pct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : a ? 100 : 0);

  return {
    granularity: ax.granularity,
    rangeLabel: ax.rangeLabel,
    buckets,
    ref,
    prev,
    deltaNovos: prev ? pct(ref.novosLeads, prev.novosLeads) : null,
    deltaTaxa: prev ? ref.taxaGanho - prev.taxaGanho : null,
    deltaCiclo: prev && ref.ganhos && prev.ganhos ? ref.cicloMedioDias - prev.cicloMedioDias : null,
  };
}
