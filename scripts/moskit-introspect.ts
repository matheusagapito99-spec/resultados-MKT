/**
 * Descoberta da conta Moskit — mapeia a estrutura REAL para ajustarmos o
 * field-map e o schema antes de construir o sync.
 *
 *   1) Defina MOSKIT_API_KEY no .env.local
 *   2) npm run moskit:introspect
 *
 * Não grava nada e não imprime a API key. Apenas lê e resume a estrutura.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { MoskitClient } from "../src/lib/moskit/client";

function head(title: string) {
  console.log("\n" + "─".repeat(64) + "\n" + title + "\n" + "─".repeat(64));
}

function keysOf(sample: unknown): string[] {
  if (sample && typeof sample === "object" && !Array.isArray(sample)) {
    return Object.keys(sample as Record<string, unknown>);
  }
  return [];
}

async function tryCall(label: string, fn: () => Promise<unknown>) {
  try {
    const res = await fn();
    const arr = Array.isArray(res)
      ? res
      : ((res as { data?: unknown[] })?.data ?? null);
    const count = Array.isArray(arr) ? arr.length : "—";
    console.log(`✓ ${label}  (itens: ${count})`);
    const sample = Array.isArray(arr) ? arr[0] : res;
    const keys = keysOf(sample);
    if (keys.length) console.log(`   campos: ${keys.join(", ")}`);
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`✗ ${label}  →  ${msg}`);
    return null;
  }
}

async function main() {
  head("Moskit — descoberta de estrutura");
  const client = new MoskitClient();

  head("Metadados");
  await tryCall("GET pipelines", () => client.pipelines());
  await tryCall("GET stages", () => client.stages());
  await tryCall("GET users", () => client.users());
  await tryCall("GET fields/deals", () => client.fields("deals"));
  await tryCall("GET fields/companies", () => client.fields("companies"));
  await tryCall("GET fields/contacts", () => client.fields("contacts"));

  head("Amostras (1ª página) — procurar campos de UTM e origem inbound");
  for (const entity of ["deals", "companies", "contacts"] as const) {
    try {
      const gen =
        entity === "deals"
          ? client.deals()
          : entity === "companies"
            ? client.companies()
            : client.contacts();
      const first = await gen.next();
      if (first.value) {
        console.log(`\n${entity}[0] keys:`);
        console.log("   " + keysOf(first.value).join(", "));
        const custom = (first.value as { customFields?: unknown }).customFields;
        if (custom) console.log("   customFields:", JSON.stringify(custom, null, 2));
      } else {
        console.log(`\n${entity}: sem itens`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`\n${entity}: ✗ ${msg}`);
    }
  }

  head("Fim");
  console.log(
    "Use os campos acima para ajustar src/lib/moskit/field-map.ts e o schema.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
