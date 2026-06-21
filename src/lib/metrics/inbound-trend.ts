import { q, num, str } from "./shared";
import { timeAxis, type Filters, type Granularity } from "@/lib/filters";

export interface TrendBucket {
  label: string;
  isRef: boolean;
  novosLeads: number;
  reunioes: number; // = ganhos (status WON) na Prospecção = reunião realizada
  ganhos: number;
  taxaGanho: number; // reuniões / novos leads (%)
  cicloMedioDias: number;
}

export interface InboundTrend {
  granularity: Granularity;
  rangeLabel: string;
  buckets: TrendBucket[];
  ref: TrendBucket;
  prev: TrendBucket | null;
  deltaNovos: number | null;
  deltaTaxa: number | null;
  deltaCiclo: number | null;
}

const PIPE = "Prospecção de Imobiliárias";

/**
 * Tendência do Kanban "Prospecção de Imobiliárias" — DEALS por data de criação.
 * Validado contra o Moskit: Novos Leads = deals (Origem Lead=Inbound / UTM);
 * Reuniões realizadas = status WON; Taxa de ganho = WON/novos; Ciclo = close−created (WON).
 */
export async function getInboundTrend(f: Filters): Promise<InboundTrend> {
  const ax = timeAxis(f);
  const start = ax.buckets[0].start;
  const endEx = ax.buckets[ax.buckets.length - 1].endExclusive;

  const conds = [`pipeline_name = $4`, `deal_created_at >= $2`, `deal_created_at < $3`];
  const params: unknown[] = [ax.unit, start, endEx, PIPE];
  if (f.origin === "inbound") {
    conds.push(`inbound_origin_label = 'Inbound'`);
  } else if (f.origin === "marketing") {
    conds.push(`utm_source is not null`);
    if (f.channels.length) {
      const ph = f.channels.map((c) => {
        params.push(c);
        return `$${params.length}`;
      });
      conds.push(`utm_source in (${ph.join(", ")})`);
    }
  } else {
    conds.push(`(inbound_origin_label = 'Inbound' or utm_source is not null)`);
  }

  const data = await q(
    `select to_char(date_trunc($1, deal_created_at),'YYYY-MM-DD') as bstart,
       count(*)::int novos,
       count(*) filter (where status='WON')::int won,
       avg(extract(epoch from (close_date - deal_created_at))/86400)
         filter (where status='WON' and close_date is not null and close_date >= deal_created_at) ciclo
     from deals
     where ${conds.join(" and ")}
     group by 1`,
    params,
  );

  const byStart = new Map(data.map((r) => [str(r.bstart), r]));
  const buckets: TrendBucket[] = ax.buckets.map((b) => {
    const r = byStart.get(b.start);
    const novos = num(r?.novos);
    const won = num(r?.won);
    return {
      label: b.label,
      isRef: b.isRef,
      novosLeads: novos,
      reunioes: won,
      ganhos: won,
      taxaGanho: novos ? (won / novos) * 100 : 0,
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
