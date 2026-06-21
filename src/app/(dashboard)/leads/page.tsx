import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/patterns/page-header";
import { getDeals } from "@/lib/metrics/deals";
import { parseFilters } from "@/lib/filters";
import { formatBRL, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS = [
  { v: "", label: "Todos os status" },
  { v: "OPEN", label: "Em aberto" },
  { v: "WON", label: "Ganhos" },
  { v: "LOST", label: "Perdidos" },
];

const STATUS_STYLE: Record<string, string> = {
  WON: "bg-success-soft text-success",
  LOST: "bg-danger-soft text-danger",
  OPEN: "bg-info-soft text-info",
};

function param(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const f = parseFilters(sp);
  const q = param(sp.q);
  const status = param(sp.status);
  const page = Math.max(1, parseInt(param(sp.page) || "1", 10) || 1);

  const data = await getDeals(f, { q, status, page });

  // querystring preservando TODOS os filtros (globais + locais)
  const qs = (p: number) => {
    const u = new URLSearchParams();
    const all: Record<string, string> = {
      period: f.period !== "all" ? f.period : "",
      from: f.from ?? "",
      to: f.to ?? "",
      origin: f.origin !== "all" ? f.origin : "",
      channels: f.channels.join(","),
      pipeline: f.pipeline,
      stage: f.stage,
      status,
      q,
    };
    for (const [k, v] of Object.entries(all)) if (v) u.set(k, v);
    u.set("page", String(p));
    return `?${u.toString()}`;
  };

  // valores p/ hidden inputs que preservam os filtros globais no submit do form
  const globals: Record<string, string> = {
    period: f.period !== "all" ? f.period : "",
    from: f.from ?? "",
    to: f.to ?? "",
    origin: f.origin !== "all" ? f.origin : "",
    channels: f.channels.join(","),
    pipeline: f.pipeline,
    stage: f.stage,
  };

  return (
    <div className="flex animate-fade-in flex-col gap-6">
      <PageHeader
        title="Leads & Negócios"
        description="Explorador de negócios do Moskit — use a barra de filtros acima + busca e status aqui"
      />

      <Card>
        <form className="flex flex-wrap items-end gap-3 p-5" method="get">
          {Object.entries(globals).map(([k, v]) =>
            v ? <input key={k} type="hidden" name={k} value={v} /> : null,
          )}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted">Buscar</label>
            <input
              name="q"
              defaultValue={q}
              placeholder="Ticket ou imobiliária…"
              className="h-9 w-56 rounded-lg border border-border bg-surface px-3 text-sm text-fg outline-none focus-visible:ring-2 focus-visible:ring-brand"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted">Status</label>
            <select
              name="status"
              defaultValue={status}
              className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-fg outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              {STATUS.map((s) => (
                <option key={s.v} value={s.v}>{s.label}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="h-9 rounded-lg bg-brand px-4 text-sm font-medium text-brand-fg transition-colors hover:bg-brand-strong"
          >
            Filtrar
          </button>
        </form>

        <CardHeader
          title={`${formatNumber(data.total)} negócios`}
          description={`Página ${data.page} de ${formatNumber(data.pages)}`}
        />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-border text-left text-xs uppercase tracking-wide text-faint">
                <th className="px-5 py-2 font-medium">Ticket</th>
                <th className="px-3 py-2 font-medium">Imobiliária</th>
                <th className="px-3 py-2 font-medium">Etapa</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Responsável</th>
                <th className="px-3 py-2 font-medium">Origem</th>
                <th className="px-5 py-2 text-right font-medium">Valor</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-muted">
                    Nenhum negócio com esses filtros.
                  </td>
                </tr>
              )}
              {data.rows.map((r) => (
                <tr key={r.moskitId} className="border-b border-border last:border-0 transition-colors hover:bg-surface-2">
                  <td className="px-5 py-3 font-mono text-fg">{r.ticket ?? "—"}</td>
                  <td className="max-w-[220px] truncate px-3 py-3 text-fg">{r.imobiliaria ?? "—"}</td>
                  <td className="px-3 py-3 text-muted">{r.stage ?? "—"}</td>
                  <td className="px-3 py-3">
                    {r.status ? (
                      <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[r.status] ?? "bg-surface-2 text-muted"}`}>
                        {r.status}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-3 text-muted">{r.owner ?? "—"}</td>
                  <td className="px-3 py-3 text-muted">{r.inbound ?? r.utmSource ?? "—"}</td>
                  <td className="tnum px-5 py-3 text-right font-mono text-fg">
                    {r.valorReais != null ? formatBRL(r.valorReais, true) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-2 p-5">
          <span className="text-xs text-muted">
            Mostrando {data.rows.length} de {formatNumber(data.total)}
          </span>
          <div className="flex gap-2">
            <Link
              href={qs(Math.max(1, data.page - 1))}
              aria-disabled={data.page <= 1}
              className={`rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:bg-surface-2 ${data.page <= 1 ? "pointer-events-none opacity-40" : "text-fg"}`}
            >
              Anterior
            </Link>
            <Link
              href={qs(Math.min(data.pages, data.page + 1))}
              aria-disabled={data.page >= data.pages}
              className={`rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:bg-surface-2 ${data.page >= data.pages ? "pointer-events-none opacity-40" : "text-fg"}`}
            >
              Próxima
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
