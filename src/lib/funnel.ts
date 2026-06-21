import type { FunnelStage } from "@/lib/mock-data";

/** Converte contagens por etapa (distribuição) em funil cumulativo descendente. */
export function toCumulativeFunnel(
  steps: { label: string; count: number }[],
): FunnelStage[] {
  const cum = steps.map((_, i) =>
    steps.slice(i).reduce((s, st) => s + st.count, 0),
  );
  let minConv = 101;
  let bottleneckIdx = -1;
  const conv = cum.map((c, i) => {
    if (i === 0) return null;
    const v = cum[i - 1] ? Math.round((c / cum[i - 1]) * 100) : 0;
    if (v < minConv) {
      minConv = v;
      bottleneckIdx = i;
    }
    return v;
  });
  return steps.map((s, i) => ({
    label: s.label,
    count: cum[i],
    conversion: conv[i],
    bottleneck: i === bottleneckIdx,
  }));
}
