import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

export { schema };

let _db: NeonHttpDatabase<typeof schema> | null = null;

/**
 * Cliente do banco (lazy). Não conecta no import — só ao primeiro uso —
 * para o build não falhar quando DATABASE_URL ainda não está definida.
 */
export function getDb(): NeonHttpDatabase<typeof schema> {
  if (!_db) {
    _db = drizzle(neon(requireUrl()), { schema });
  }
  return _db;
}

let _sql: ReturnType<typeof neon> | null = null;

/** Cliente SQL cru (neon) para consultas agregadas das métricas. */
export function getSql(): ReturnType<typeof neon> {
  if (!_sql) _sql = neon(requireUrl());
  return _sql;
}

function requireUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL não definida. Configure no .env.local (dev) ou no Vercel.",
    );
  }
  return url;
}
