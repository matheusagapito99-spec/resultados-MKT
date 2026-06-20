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

type Rec = Record<string, unknown>;

function scalarPart(rec: Rec): Rec {
  const out: Rec = {};
  for (const [k, v] of Object.entries(rec)) {
    if (v === null || ["string", "number", "boolean"].includes(typeof v)) out[k] = v;
  }
  return out;
}

function dumpRecord(label: string, rec: unknown) {
  if (!rec || typeof rec !== "object") {
    console.log(`${label}: (vazio)`);
    return;
  }
  const r = rec as Rec;
  console.log(`\n${label} — escalares:`);
  console.log(JSON.stringify(scalarPart(r), null, 2));
  if ("entityCustomFields" in r) {
    console.log(`${label} — entityCustomFields:`);
    console.log(JSON.stringify(r.entityCustomFields, null, 2));
  }
}

async function main() {
  head("Moskit — descoberta de estrutura");
  const client = new MoskitClient();

  head("Pipelines & Etapas");
  const pipelines = (await client.pipelines().catch(() => [])) as Rec[];
  const stages = (await client.stages().catch(() => [])) as Rec[];
  const pipeName = new Map(pipelines.map((p) => [String(p.id), String(p.name)]));
  for (const p of pipelines) console.log(`pipeline ${p.id}: ${p.name}`);
  console.log("");
  for (const s of stages) {
    const pid =
      typeof s.pipeline === "object" && s.pipeline
        ? String((s.pipeline as Rec).id)
        : String(s.pipeline);
    console.log(
      `etapa [${pipeName.get(pid) ?? pid}] prio=${s.priority}  →  ${s.name}`,
    );
  }

  head("Usuários (SDR vs Gestor: olhar jobTitle / team)");
  const users = (await client.users().catch(() => [])) as Rec[];
  for (const u of users) {
    const team =
      typeof u.team === "object" && u.team ? (u.team as Rec).name : u.team;
    console.log(
      `#${u.id} ${u.name} · jobTitle=${u.jobTitle ?? "-"} · team=${team ?? "-"} · ${u.active ? "ativo" : "inativo"}`,
    );
  }

  head("Custom Fields — metadata (decodificar CF_ ids e options)");
  const cfCandidates = [
    "customFields",
    "customfields",
    "custom-fields",
    "customField",
    "fields",
    "entityCustomFields",
    "customFields/DEAL",
    "customFields/CONTACT",
    "customFields/COMPANY",
  ];
  for (const path of cfCandidates) {
    try {
      const res = (await client.get(path)) as unknown;
      const arr = (Array.isArray(res) ? res : (res as Rec)?.data) as Rec[];
      console.log(`✓ GET ${path}  (itens: ${arr?.length ?? "?"})\n`);
      for (const f of arr ?? []) {
        const opts = (f.options as Rec[] | undefined)
          ?.map((o) => `${o.id}=${o.value ?? o.name}`)
          .join(" | ");
        console.log(
          `• [${f.module}] ${f.name}  (type=${f.type}, id=${f.id})` +
            (opts ? `\n    opções: ${opts}` : ""),
        );
      }
      break; // achou o endpoint certo
    } catch (err) {
      const m = err instanceof Error ? err.message : String(err);
      console.log(`✗ GET ${path}  →  ${m.split("(")[1] ?? m}`);
    }
  }

  head("Varredura de origens reais (primeiros registros)");
  async function scan(
    gen: AsyncGenerator<unknown>,
    label: string,
    max = 250,
  ) {
    const sources = new Set<string>();
    const origins = new Set<string>();
    let withCF = 0;
    let firstWithCF: unknown = null;
    let count = 0;
    for await (const item of gen) {
      if (count++ >= max) break;
      const r = item as Rec;
      if (r.source != null) sources.add(String(r.source));
      if (r.origin != null) origins.add(String(r.origin));
      const cf = r.entityCustomFields;
      if (Array.isArray(cf) && cf.length > 0) {
        withCF++;
        if (!firstWithCF) firstWithCF = r;
      }
    }
    console.log(`\n${label}: ${count} registros · com customFields: ${withCF}`);
    console.log(`  source distintos: ${[...sources].join(" | ") || "—"}`);
    console.log(`  origin distintos: ${[...origins].join(" | ") || "—"}`);
    if (firstWithCF) dumpRecord(`${label} (1º com customFields)`, firstWithCF);
  }
  await scan(client.contacts(), "contacts");
  await scan(client.deals(), "deals");
  await scan(client.companies(), "companies");

  head("Fim");
  console.log(
    "Ajuste src/lib/moskit/field-map.ts (entityCustomFields, source/origin) e o schema.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
