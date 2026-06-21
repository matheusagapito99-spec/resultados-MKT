import type { MonthRow } from "@/lib/metrics/inbound-monthly";
import { formatPercent } from "@/lib/utils";

const NOVOS = "var(--brand-strong)";
const REUNI = "var(--brand)";
const LINHA = "var(--success)";

export function MonthlyInboundChart({ months }: { months: MonthRow[] }) {
  const W = 760;
  const H = 340;
  const padL = 36;
  const padR = 40;
  const padT = 28;
  const padB = 46;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const n = months.length || 1;

  const maxBarRaw = Math.max(1, ...months.map((m) => Math.max(m.novosLeads, m.reunioes)));
  // arredonda o topo para um número "redondo"
  const step = Math.pow(10, Math.floor(Math.log10(maxBarRaw)));
  const maxBar = Math.ceil(maxBarRaw / step) * step;

  const groupW = innerW / n;
  const barW = Math.min(28, groupW * 0.3);
  const yBar = (v: number) => padT + innerH * (1 - v / maxBar);
  const yPct = (p: number) => padT + innerH * (1 - p / 100);
  const cx = (idx: number) => padL + groupW * idx + groupW / 2;

  const linePts = months
    .map((m, i) => `${cx(i).toFixed(1)},${yPct(m.taxaGanho).toFixed(1)}`)
    .join(" ");

  const gridY = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Leads inbound por mês">
      {/* grid + eixos */}
      {gridY.map((g) => {
        const y = padT + innerH * g;
        return (
          <g key={g}>
            <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="var(--border-c)" strokeWidth="1" strokeDasharray="2 4" />
            <text x={padL - 6} y={y + 3} textAnchor="end" fontSize="9" fill="var(--faint)">
              {Math.round(maxBar * (1 - g))}
            </text>
            <text x={W - padR + 6} y={y + 3} textAnchor="start" fontSize="9" fill="var(--faint)">
              {Math.round(100 * (1 - g))}%
            </text>
          </g>
        );
      })}

      {/* barras */}
      {months.map((m, i) => {
        const center = cx(i);
        const x1 = center - barW - 2;
        const x2 = center + 2;
        return (
          <g key={m.ym}>
            <rect x={x1} y={yBar(m.novosLeads)} width={barW} height={Math.max(0, padT + innerH - yBar(m.novosLeads))} rx="2" fill={NOVOS} />
            <rect x={x2} y={yBar(m.reunioes)} width={barW} height={Math.max(0, padT + innerH - yBar(m.reunioes))} rx="2" fill={REUNI} />
            {m.novosLeads > 0 && (
              <text x={x1 + barW / 2} y={yBar(m.novosLeads) - 4} textAnchor="middle" fontSize="9.5" fontWeight="600" fill="var(--fg)">
                {m.novosLeads}
              </text>
            )}
            {m.reunioes > 0 && (
              <text x={x2 + barW / 2} y={yBar(m.reunioes) - 4} textAnchor="middle" fontSize="9" fill="var(--muted)">
                {m.reunioes}
              </text>
            )}
            <text x={center} y={H - padB + 16} textAnchor="middle" fontSize="10" fill="var(--muted)">
              {m.label}
            </text>
          </g>
        );
      })}

      {/* linha de taxa de ganho */}
      <polyline points={linePts} fill="none" stroke={LINHA} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {months.map((m, i) => (
        <g key={`p-${m.ym}`}>
          <circle cx={cx(i)} cy={yPct(m.taxaGanho)} r="3.5" fill={LINHA} stroke="var(--surface)" strokeWidth="1.5" />
          {m.novosLeads > 0 && (
            <text x={cx(i)} y={yPct(m.taxaGanho) - 8} textAnchor="middle" fontSize="9" fontWeight="600" fill={LINHA}>
              {formatPercent(m.taxaGanho, m.taxaGanho >= 10 ? 0 : 1)}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
