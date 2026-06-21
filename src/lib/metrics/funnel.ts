import { db, rows, num, str } from "./shared";

const FUNNEL_ORDER: { step: string; label: string }[] = [
  { step: "lead", label: "Lead" },
  { step: "qualificacao", label: "Qualificação" },
  { step: "reuniao", label: "Reunião" },
  { step: "cadastro", label: "Cadastro" },
  { step: "ativa", label: "Ativa" },
];

export interface FunnelData {
  steps: { step: string; label: string; count: number }[];
  stages: { pipeline: string; stage: string; count: number }[];
}

export async function getFunnel(): Promise<FunnelData> {
  const sql = db();
  const stepMap = new Map(
    rows(
      await sql`select funnel_step, count(*)::int n from imobiliarias
        where funnel_step is not null group by funnel_step`,
    ).map((r) => [str(r.funnel_step), num(r.n)]),
  );
  const stages = rows(
    await sql`select pipeline_name, stage_name, count(*)::int n from deals
      where stage_name is not null group by pipeline_name, stage_name
      order by pipeline_name, n desc`,
  ).map((r) => ({
    pipeline: str(r.pipeline_name),
    stage: str(r.stage_name),
    count: num(r.n),
  }));
  return {
    steps: FUNNEL_ORDER.map((f) => ({ ...f, count: stepMap.get(f.step) ?? 0 })),
    stages,
  };
}
