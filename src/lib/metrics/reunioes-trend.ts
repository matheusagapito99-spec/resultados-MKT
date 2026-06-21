import { q, num, str } from "./shared";
import { timeAxis, type Filters, type Granularity, type Bucket } from "@/lib/filters";

export interface ReuBucket {
  label: string;
  isRef: boolean;
  novos: number;
  reunioes: number;
  reunioesHist: number | null; // mesmo período −1 ano (quando comparação ligada)
}
export interface ReunioesTrend {
  granularity: Granularity;
  rangeLabel: string;
  compare: boolean;
  buckets: ReuBucket[];
  totalReunioes: number;
  totalReunioesHist: number | null;
  deltaReunioesPct: number | null;
  totalNovos: number;
  taxaGanho: number; // reuniões / novos do período (%)
}

const PIPE = "Prospecção de Imobiliárias";

/** Origem nas colunas do DEAL (Moskit). Retorna a condição SQL e empurra params. */
function dealOrigin(f: Filters, params: unknown[]): string {
  if (f.origin === "inbound") return "inbound_origin_label = 'Inbound'";
  if (f.origin === "marketing") {
    let c = "utm_source is not null";
    if (f.channels.length) {
      const ph = f.channels.map((ch) => {
        params.push(ch);
        return `$${params.length}`;
      });
      c += ` and utm_source in (${ph.join(", ")})`;
    }
    return c;
  }
  return "(inbound_origin_label = 'Inbound' or utm_source is not null)";
}

/** Origem na base histórica (2025). Marketing não existia em 2025 → retorna null. */
function histOrigin(f: Filters): string | null {
  if (f.origin === "marketing") return null;
  // Inbound e Todos: Origem Lead = 'Inbound' (Marketing inexiste em 2025)
  return "origem = 'Inbound'";
}

const shiftYear = (isoDate: string, years: number) => {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d.toISOString().slice(0, 10);
};

/** Reuniões realizadas por bucket (por DATA DA REUNIÃO). 2025→base histórica; 2026+→Moskit (WON). */
async function reunioesByBucket(buckets: Bucket[], unit: string, f: Filters): Promise<Map<string, number>> {
  const start = buckets[0].start;
  const endEx = buckets[buckets.length - 1].endExclusive;

  // Moskit: WON na Prospecção por close_date
  const mp: unknown[] = [unit, start, endEx, PIPE];
  const moskit = await q(
    `select to_char(date_trunc($1, close_date),'YYYY-MM-DD') b, count(*)::int n
     from deals
     where pipeline_name=$4 and status='WON' and close_date is not null
       and close_date >= $2 and close_date < $3 and ${dealOrigin(f, mp)}
     group by 1`,
    mp,
  );
  const moskitMap = new Map(moskit.map((r) => [str(r.b), num(r.n)]));

  // Histórico: Realizou='Sim' por data_reuniao
  let histMap = new Map<string, number>();
  const ho = histOrigin(f);
  if (ho) {
    const hist = await q(
      `select to_char(date_trunc($1, data_reuniao),'YYYY-MM-DD') b, count(*)::int n
       from hist_reunioes
       where fonte='controle' and lower(realizou)='sim' and data_reuniao is not null
         and data_reuniao >= $2 and data_reuniao < $3 and ${ho}
       group by 1`,
      [unit, start, endEx],
    );
    histMap = new Map(hist.map((r) => [str(r.b), num(r.n)]));
  }

  // por bucket: 2025→histórico (prioritário); 2026+→Moskit
  const out = new Map<string, number>();
  for (const b of buckets) {
    const year = Number(b.start.slice(0, 4));
    out.set(b.start, year < 2026 ? (histMap.get(b.start) ?? 0) : (moskitMap.get(b.start) ?? 0));
  }
  return out;
}

/** Novos leads da Prospecção (por data de criação) — contexto. Moskit. */
async function novosByBucket(buckets: Bucket[], unit: string, f: Filters): Promise<Map<string, number>> {
  const params: unknown[] = [unit, buckets[0].start, buckets[buckets.length - 1].endExclusive, PIPE];
  const rows = await q(
    `select to_char(date_trunc($1, deal_created_at),'YYYY-MM-DD') b, count(*)::int n
     from deals
     where pipeline_name=$4 and deal_created_at >= $2 and deal_created_at < $3 and ${dealOrigin(f, params)}
     group by 1`,
    params,
  );
  const m = new Map(rows.map((r) => [str(r.b), num(r.n)]));
  const out = new Map<string, number>();
  for (const b of buckets) out.set(b.start, m.get(b.start) ?? 0);
  return out;
}

export async function getReunioesTrend(f: Filters, compare: boolean): Promise<ReunioesTrend> {
  const ax = timeAxis(f);
  const cur = ax.buckets;
  const reuMap = await reunioesByBucket(cur, ax.unit, f);
  const novMap = await novosByBucket(cur, ax.unit, f);

  let histMap = new Map<string, number>();
  if (compare) {
    const shifted: Bucket[] = cur.map((b) => ({
      start: shiftYear(b.start, -1),
      endExclusive: shiftYear(b.endExclusive, -1),
      label: b.label,
      isRef: b.isRef,
    }));
    const sMap = await reunioesByBucket(shifted, ax.unit, f);
    // remapeia para o bucket atual correspondente
    cur.forEach((b, i) => histMap.set(b.start, sMap.get(shifted[i].start) ?? 0));
  }

  const buckets: ReuBucket[] = cur.map((b) => ({
    label: b.label,
    isRef: b.isRef,
    novos: novMap.get(b.start) ?? 0,
    reunioes: reuMap.get(b.start) ?? 0,
    reunioesHist: compare ? (histMap.get(b.start) ?? 0) : null,
  }));

  const totalReunioes = buckets.reduce((s, b) => s + b.reunioes, 0);
  const totalNovos = buckets.reduce((s, b) => s + b.novos, 0);
  const totalReunioesHist = compare ? buckets.reduce((s, b) => s + (b.reunioesHist ?? 0), 0) : null;
  const deltaReunioesPct =
    compare && totalReunioesHist ? ((totalReunioes - totalReunioesHist) / totalReunioesHist) * 100 : compare ? (totalReunioes ? 100 : 0) : null;

  return {
    granularity: ax.granularity,
    rangeLabel: ax.rangeLabel,
    compare,
    buckets,
    totalReunioes,
    totalReunioesHist,
    deltaReunioesPct,
    totalNovos,
    taxaGanho: totalNovos ? (totalReunioes / totalNovos) * 100 : 0,
  };
}
