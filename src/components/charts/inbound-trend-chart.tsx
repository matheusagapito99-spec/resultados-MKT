import type { TrendBucket } from "@/lib/metrics/inbound-trend";
import { formatPercent } from "@/lib/utils";

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const exp = Math.floor(Math.log10(v));
  const base = Math.pow(10, exp);
  const f = v / base;
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nf * base;
}

export function InboundTrendChart({ buckets }: { buckets: TrendBucket[] }) {
  const W = 820;
  const H = 340;
  const padL = 34;
  const padR = 40;
  const padT = 26;
  const padB = 40;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const n = buckets.length || 1;

  const leftMax = niceMax(Math.max(1, ...buckets.map((b) => Math.max(b.novosLeads, b.reunioes))));
  const rightMaxRaw = Math.max(...buckets.map((b) => b.taxaGanho), 0);
  const rightMax = Math.min(100, niceMax(rightMaxRaw || 1));

  const groupW = innerW / n;
  const barW = Math.min(26, groupW * 0.3);
  const cx = (i: number) => padL + groupW * (i + 0.5);
  const yL = (v: number) => padT + innerH * (1 - v / leftMax);
  const yR = (p: number) => padT + innerH * (1 - p / rightMax);
  const baseY = padT + innerH;

  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const linePts = buckets.map((b, i) => `${cx(i).toFixed(1)},${yR(b.taxaGanho).toFixed(1)}`).join(" ");
  const areaPts = `${cx(0)},${baseY} ${linePts} ${cx(n - 1)},${baseY}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Tendência de leads inbound">
      <defs>
        <linearGradient id="barNovos" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand)" />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity="0.75" />
        </linearGradient>
        <linearGradient id="taxaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--success)" stopOpacity="0.16" />
          <stop offset="100%" stopColor="var(--success)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* destaque do período de referência (último bucket) */}
      <rect
        x={cx(n - 1) - groupW / 2}
        y={padT - 6}
        width={groupW}
        height={innerH + 12}
        rx="8"
        fill="var(--brand)"
        opacity="0.06"
      />

      {/* grid + eixos */}
      {ticks.map((g) => {
        const y = padT + innerH * g;
        return (
          <g key={g}>
            <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="var(--border-c)" strokeWidth="1" strokeDasharray="2 5" />
            <text x={padL - 7} y={y + 3} textAnchor="end" fontSize="9.5" fill="var(--faint)">
              {Math.round(leftMax * (1 - g))}
            </text>
            <text x={W - padR + 7} y={y + 3} textAnchor="start" fontSize="9.5" fill="var(--faint)">
              {Math.round(rightMax * (1 - g))}%
            </text>
          </g>
        );
      })}

      {/* barras */}
      {buckets.map((b, i) => {
        const center = cx(i);
        const xn = center - barW - 1.5;
        const xr = center + 1.5;
        const op = b.isRef ? 1 : 0.42;
        return (
          <g key={i}>
            <rect x={xn} y={yL(b.novosLeads)} width={barW} height={Math.max(0, baseY - yL(b.novosLeads))} rx="3" fill="url(#barNovos)" opacity={op} />
            <rect x={xr} y={yL(b.reunioes)} width={barW} height={Math.max(0, baseY - yL(b.reunioes))} rx="3" fill="var(--chart-2)" opacity={op} />
            {b.novosLeads > 0 && (
              <text x={xn + barW / 2} y={yL(b.novosLeads) - 5} textAnchor="middle" fontSize="10" fontWeight={b.isRef ? 700 : 500} fill="var(--fg)">
                {b.novosLeads}
              </text>
            )}
            <text
              x={center}
              y={H - padB + 16}
              textAnchor="middle"
              fontSize="10"
              fontWeight={b.isRef ? 700 : 400}
              fill={b.isRef ? "var(--brand)" : "var(--muted)"}
            >
              {b.label}
            </text>
          </g>
        );
      })}

      {/* taxa de ganho: área + linha */}
      <polygon points={areaPts} fill="url(#taxaFill)" />
      <polyline points={linePts} fill="none" stroke="var(--success)" strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      {buckets.map((b, i) => (
        <g key={`p${i}`}>
          <circle cx={cx(i)} cy={yR(b.taxaGanho)} r={b.isRef ? 4.5 : 3} fill="var(--success)" stroke="var(--surface)" strokeWidth="1.5" />
          {(b.isRef || b.taxaGanho > 0) && (
            <text x={cx(i)} y={yR(b.taxaGanho) - 9} textAnchor="middle" fontSize="9.5" fontWeight={b.isRef ? 700 : 500} fill="var(--success)">
              {formatPercent(b.taxaGanho, b.taxaGanho >= 10 ? 0 : 1)}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
