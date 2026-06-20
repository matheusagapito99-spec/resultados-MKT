/**
 * Enriquecimento in-place dos dados já sincronizados (etapas completas + rótulos
 * de inbound + re-derivação). npm run moskit:enrich
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { enrichExisting } from "../src/lib/moskit/sync";

enrichExisting()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Falhou:", err);
    process.exit(1);
  });
