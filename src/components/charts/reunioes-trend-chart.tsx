import type { ReuBucket } from "@/lib/metrics/reunioes-trend";

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const exp = Math.floor(Math.log10(v));
  const base = Math.pow(10, exp);
  const f = v / base;
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nf * base;
}

export function ReunioesTrendChart({ buckets, compare }: { buckets: ReuBucket[]; compare: boolean }) {
  const W = 820;
  const H = 330;
  const padL = 34;
  const padR = 16;
  const padT = 26;
  const padB = 40;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const n = buckets.length || 1;

  const maxVal = niceMax(
    Math.max(1, ...buckets.map((b) => Math.max(b.novos, b.reunioes, b.reunioesHist ?? 0))),
  );
  const groupW = innerW / n;
  const barW = Math.min(26, groupW * 0.3);
  const cx = (i: number) => padL + groupW * (i + 0.5);
  const y = (v: number) => padT + innerH * (1 - v / maxVal);
  const baseY = padT + innerH;
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  const histPts = compare
    ? buckets.map((b, i) => `${cx(i).toFixed(1)},${y(b.reunioesHist ?? 0).toFixed(1)}`).join(" ")
    : "";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Reuniões realizadas por período">
      <defs>
        <linearGradient id="reuBar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand)" />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity="0.75" />
        </linearGradient>
      </defs>

      <rect x={cx(n - 1) - groupW / 2} y={padT - 6} width={groupW} height={innerH + 12} rx="8" fill="var(--brand)" opacity="0.06" />

      {ticks.map((g) => {
        const yy = padT + innerH * g;
        return (
          <g key={g}>
            <line x1={padL} x2={W - padR} y1={yy} y2={yy} stroke="var(--border-c)" strokeWidth="1" strokeDasharray="2 5" />
            <text x={padL - 7} y={yy + 3} textAnchor="end" fontSize="9.5" fill="var(--faint)">
              {Math.round(maxVal * (1 - g))}
            </text>
          </g>
        );
      })}

      {buckets.map((b, i) => {
        const center = cx(i);
        const xr = center - barW - 1.5; // reuniões (atual)
        const xn = center + 1.5; // novos (contexto)
        return (
          <g key={i}>
            <rect x={xn} y={y(b.novos)} width={barW} height={Math.max(0, baseY - y(b.novos))} rx="3" fill="var(--chart-2)" opacity={b.isRef ? 0.55 : 0.28} />
            <rect x={xr} y={y(b.reunioes)} width={barW} height={Math.max(0, baseY - y(b.reunioes))} rx="3" fill="url(#reuBar)" opacity={b.isRef ? 1 : 0.5} />
            {b.reunioes > 0 && (
              <text x={xr + barW / 2} y={y(b.reunioes) - 5} textAnchor="middle" fontSize="10" fontWeight={b.isRef ? 700 : 500} fill="var(--fg)">
                {b.reunioes}
              </text>
            )}
            <text x={center} y={H - padB + 16} textAnchor="middle" fontSize="10" fontWeight={b.isRef ? 700 : 400} fill={b.isRef ? "var(--brand)" : "var(--muted)"}>
              {b.label}
            </text>
          </g>
        );
      })}

      {compare && (
        <>
          <polyline points={histPts} fill="none" stroke="var(--warning)" strokeWidth="2.25" strokeDasharray="5 4" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {buckets.map((b, i) => (
            <g key={`h${i}`}>
              <circle cx={cx(i)} cy={y(b.reunioesHist ?? 0)} r="3.2" fill="var(--warning)" stroke="var(--surface)" strokeWidth="1.5" />
              {(b.reunioesHist ?? 0) > 0 && (
                <text x={cx(i)} y={y(b.reunioesHist ?? 0) - 8} textAnchor="middle" fontSize="9" fontWeight="600" fill="var(--warning)">
                  {b.reunioesHist}
                </text>
              )}
            </g>
          ))}
        </>
      )}
    </svg>
  );
}
