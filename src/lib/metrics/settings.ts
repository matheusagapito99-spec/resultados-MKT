import { db, rows, num, str } from "./shared";

export interface SyncStatus {
  lastRun: {
    kind: string;
    status: string;
    startedAt: string | null;
    finishedAt: string | null;
    records: number;
  } | null;
  counts: {
    deals: number;
    imobiliarias: number;
    ativas: number;
    contratos: number;
    receitaReais: number;
  };
  sdrs: number;
  gestores: number;
  inboundOrigins: number;
  channels: number;
}

export async function getSyncStatus(): Promise<SyncStatus> {
  const sql = db();

  const [run] = rows(await sql`
    select kind, status, started_at, finished_at, records_processed
    from sync_runs order by id desc limit 1`);

  const [c] = rows(await sql`
    select
      (select count(*) from deals)::int deals,
      (select count(*) from imobiliarias)::int imob,
      (select count(*) from imobiliarias where status='ativa')::int ativas,
      (select count(*) from contracts)::int contratos,
      (select coalesce(sum(amount_cents),0) from revenue_events) receita_cents`);

  const [roles] = rows(await sql`
    select
      count(*) filter (where role='sdr')::int sdrs,
      count(*) filter (where role='gestor')::int gestores
    from users`);

  const [inb] = rows(await sql`
    select count(distinct entry_inbound_label)::int n from imobiliarias
    where entry_inbound_label is not null`);
  const [ch] = rows(await sql`select count(*)::int n from marketing_channels`);

  return {
    lastRun: run
      ? {
          kind: str(run.kind),
          status: str(run.status),
          startedAt: run.started_at ? str(run.started_at) : null,
          finishedAt: run.finished_at ? str(run.finished_at) : null,
          records: num(run.records_processed),
        }
      : null,
    counts: {
      deals: num(c?.deals),
      imobiliarias: num(c?.imob),
      ativas: num(c?.ativas),
      contratos: num(c?.contratos),
      receitaReais: num(c?.receita_cents) / 100,
    },
    sdrs: num(roles?.sdrs),
    gestores: num(roles?.gestores),
    inboundOrigins: num(inb?.n),
    channels: num(ch?.n),
  };
}
