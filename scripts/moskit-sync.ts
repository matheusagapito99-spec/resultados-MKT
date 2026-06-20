/**
 * Backfill completo Moskit → Postgres.
 *   npm run moskit:sync   (precisa MOSKIT_API_KEY e DATABASE_URL no .env.local)
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { runFullSync } from "../src/lib/moskit/sync";

runFullSync()
  .then((r) => {
    console.log("Concluído:", r);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Falhou:", err);
    process.exit(1);
  });
