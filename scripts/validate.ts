/**
 * Processo de validação — recalcula as métricas do dashboard a partir dos dados
 * brutos (deals) e imprime de forma conferível no Moskit.
 *   npm run validate
 *
 * Definições auditadas (devem bater com o Kanban "Prospecção de Imobiliárias"):
 *   Novos Leads     = deals da pipeline Prospecção, Origem Lead='Inbound', por data de criação
 *   Reuniões/Ganhos = desses, status='WON'
 *   Taxa de ganho   = Ganhos / Novos Leads
 *   Ciclo médio     = média de (close_date - deal_created_at) em dias, dos ganhos
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";

const YEAR = process.argv[2] || "2026";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  console.log(`\nValidação — Prospecção de Imobiliárias · Origem Lead = "Inbound" · ${YEAR}\n`);
  console.log("Mês     | Novos | Reuniões | Taxa ganho | Ciclo médio (dias)");
  console.log("--------|-------|----------|------------|-------------------");
  const rows = await sql`
    select to_char(date_trunc('month', deal_created_at),'YYYY-MM') as m,
      count(*)::int novos,
      count(*) filter (where status='WON')::int won,
      round(100.0 * count(*) filter (where status='WON') / nullif(count(*),0), 2) taxa,
      round(avg(extract(epoch from (close_date - deal_created_at))/86400)
        filter (where status='WON' and close_date is not null and close_date >= deal_created_at)::numeric, 2) ciclo
    from deals
    where pipeline_name = 'Prospecção de Imobiliárias'
      and inbound_origin_label = 'Inbound'
      and deal_created_at >= ${`${YEAR}-01-01`} and deal_created_at < ${`${Number(YEAR) + 1}-01-01`}
    group by 1 order by 1`;
  for (const r of rows) {
    console.log(
      `${r.m} | ${String(r.novos).padStart(5)} | ${String(r.won).padStart(8)} | ${String(r.taxa ?? 0).padStart(9)}% | ${String(r.ciclo ?? "—").padStart(10)}`,
    );
  }

  // Sanidade global
  const [s] = await sql`
    select (select count(*) from deals)::int deals,
      (select count(*) from deals where imobiliaria_id is null)::int orfaos,
      (select count(*) from (select moskit_id from deals group by moskit_id having count(*)>1) x)::int dups,
      (select count(*) from imobiliarias where entry_inbound_label='Inbound' or entry_utm_source is not null)::int universo`;
  console.log(
    `\nSanidade: deals=${s.deals} · órfãos(sem imobiliária)=${s.orfaos} · duplicados=${s.dups} · universo(Inbound+Mkt)=${s.universo}`,
  );
  console.log(
    "\nComo conferir no Moskit: filtre o Kanban 'Prospecção de Imobiliárias' por Origem Lead='Inbound',\nagrupe por mês de criação; 'Novos' = total de cards; 'Reuniões' = cards ganhos (WON).",
  );
}
main().catch((e) => { console.error(e); process.exit(1); });
