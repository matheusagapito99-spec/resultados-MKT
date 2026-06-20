/** Estatísticas rápidas do banco (monitorar sync). npm run db:stats */
import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const n = async (q: ReturnType<typeof sql>) =>
    Number((await q)[0]?.n ?? 0);

  const counts = {
    users: await n(sql`select count(*)::int n from users`),
    imobiliarias: await n(sql`select count(*)::int n from imobiliarias`),
    deals: await n(sql`select count(*)::int n from deals`),
    contracts: await n(sql`select count(*)::int n from contracts`),
    revenue_events: await n(sql`select count(*)::int n from revenue_events`),
    marketing_channels: await n(sql`select count(*)::int n from marketing_channels`),
    lead_origin_history: await n(sql`select count(*)::int n from lead_origin_history`),
  };
  console.log("Contagens:", counts);

  const runs = await sql`
    select id, kind, status, records_processed, started_at, finished_at,
           left(coalesce(error,''), 120) as error
    from sync_runs order by id desc limit 3`;
  console.log("\nsync_runs (últimas):");
  for (const r of runs) console.log(" ", JSON.stringify(r));

  const imobAtivas = await n(
    sql`select count(*)::int n from imobiliarias where status = 'ativa'`,
  );
  const comUtm = await n(
    sql`select count(*)::int n from imobiliarias where entry_utm_source is not null`,
  );
  console.log(`\nimobiliárias ativas: ${imobAtivas} | com origem de marketing: ${comUtm}`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
