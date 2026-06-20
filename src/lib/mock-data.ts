/**
 * Dados de demonstração para a Fase 0 (shell premium).
 * Serão substituídos pela camada de métricas sobre o Postgres (sync do Moskit)
 * a partir da Fase 1/2. A forma aqui já antecipa o contrato real.
 */

export type Trend = "up" | "down";

export interface Kpi {
  id: string;
  label: string;
  value: string;
  delta: string;
  trend: Trend;
  /** true quando "down" é bom (ex.: ciclo de venda menor) */
  goodWhenDown?: boolean;
  spark: number[];
}

export const kpis: Kpi[] = [
  {
    id: "revenue",
    label: "Receita ganha",
    value: "R$ 482,0 mil",
    delta: "+12,3%",
    trend: "up",
    spark: [220, 240, 235, 280, 300, 290, 340, 360, 410, 482],
  },
  {
    id: "won",
    label: "Negócios ganhos",
    value: "37",
    delta: "+5",
    trend: "up",
    spark: [18, 22, 19, 25, 24, 28, 30, 31, 34, 37],
  },
  {
    id: "conversion",
    label: "Conversão lead → ganho",
    value: "18,4%",
    delta: "−2,1 pp",
    trend: "down",
    spark: [22, 21, 23, 20, 21, 19, 20, 19, 18.6, 18.4],
  },
  {
    id: "cycle",
    label: "Ciclo médio de venda",
    value: "21 dias",
    delta: "−3 dias",
    trend: "down",
    goodWhenDown: true,
    spark: [29, 28, 27, 26, 26, 24, 24, 23, 22, 21],
  },
];

export interface FunnelStage {
  label: string;
  count: number;
  /** conversão a partir da etapa anterior, em % */
  conversion: number | null;
  bottleneck?: boolean;
}

export const funnel: FunnelStage[] = [
  { label: "Leads", count: 1240, conversion: null },
  { label: "Qualificados", count: 612, conversion: 49 },
  { label: "Proposta enviada", count: 240, conversion: 39, bottleneck: true },
  { label: "Negociação", count: 96, conversion: 40 },
  { label: "Ganho", count: 37, conversion: 39 },
];

/** Receita ganha por semana (R$ mil) — últimas 12 semanas. */
export const revenueTrend = [
  180, 205, 195, 240, 260, 250, 300, 320, 360, 400, 440, 482,
];

export interface SourceRow {
  source: string;
  leads: number;
  deals: number;
  won: number;
  revenue: number;
  ticket: number;
  winRate: number;
}

export const topSources: SourceRow[] = [
  { source: "Google Ads", leads: 410, deals: 96, won: 22, revenue: 181000, ticket: 8227, winRate: 22.9 },
  { source: "Orgânico / SEO", leads: 520, deals: 140, won: 19, revenue: 120000, ticket: 6316, winRate: 13.6 },
  { source: "Indicação", leads: 96, deals: 48, won: 11, revenue: 98000, ticket: 8909, winRate: 22.9 },
  { source: "Meta Ads", leads: 214, deals: 52, won: 8, revenue: 53000, ticket: 6625, winRate: 15.4 },
];

export interface Alert {
  id: string;
  tone: "warning" | "danger" | "info";
  text: string;
}

export const alerts: Alert[] = [
  { id: "a1", tone: "warning", text: "12 negócios parados há mais de 14 dias" },
  { id: "a2", tone: "danger", text: "8 leads fora do SLA de 1º contato" },
  { id: "a3", tone: "info", text: "Sincronização com o Moskit concluída há 4 min" },
];
