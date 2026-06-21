import { q, num, str } from "./shared";
import { dealFilter, imobFilter, type Filters } from "@/lib/filters";

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

export async function getFunnel(f: Filters): Promise<FunnelData> {
  const d = dealFilter(f);
  const i = imobFilter(f);

  const stepMap = new Map(
    (
      await q(
        `select funnel_step, count(*)::int n from imobiliarias i
         where i.funnel_step is not null${i.and} group by funnel_step`,
        i.params,
      )
    ).map((r) => [str(r.funnel_step), num(r.n)]),
  );

  const stages = (
    await q(
      `select pipeline_name, stage_name, count(*)::int n from deals d${d.join}
       where d.stage_name is not null${d.and}
       group by pipeline_name, stage_name order by pipeline_name, n desc`,
      d.params,
    )
  ).map((r) => ({ pipeline: str(r.pipeline_name), stage: str(r.stage_name), count: num(r.n) }));

  return {
    steps: FUNNEL_ORDER.map((x) => ({ ...x, count: stepMap.get(x.step) ?? 0 })),
    stages,
  };
}
