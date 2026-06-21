/**
 * Importa as bases históricas de 2025 (RD Station) do xlsx para o Postgres.
 *   npm run import:hist  ["caminho/arquivo.xlsx"]
 * Fonte de verdade p/ a comparação histórica e validação das reuniões.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import * as XLSX from "xlsx";
import { getDb, getSql, schema } from "../src/lib/db";

const FILE = process.argv[2] || "C:/Users/mathe/Downloads/Controle Pré-Vendas.xlsx";

function toISODate(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "number") {
    const ms = Date.UTC(1899, 11, 30) + Math.round(v) * 86400000;
    return new Date(ms).toISOString().slice(0, 10);
  }
  if (v instanceof Date) return new Date(Date.UTC(v.getFullYear(), v.getMonth(), v.getDate())).toISOString().slice(0, 10);
  const s = String(v).trim();
  if (!s || s === "-") return null;
  const d = new Date(s);
  return isNaN(+d) ? null : new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10);
}
const txt = (v: unknown) => {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
};

async function bulk<T>(rows: T[], fn: (b: T[]) => Promise<unknown>, size = 200) {
  for (let i = 0; i < rows.length; i += size) {
    const b = rows.slice(i, i + size);
    if (b.length) await fn(b);
  }
}

async function main() {
  const db = getDb();
  const sql = getSql();
  const wb = XLSX.readFile(FILE);
  const sheet = (n: string) =>
    XLSX.utils.sheet_to_json(wb.Sheets[n], { raw: true, defval: null }) as Record<string, unknown>[];

  await sql`truncate hist_reunioes, hist_cadastros, hist_faturamento restart identity`;

  // Reuniões — Controle + Fenix
  const controle = sheet("Controle Reuniões (2025)").map((r) => ({
    nome: txt(r["Nome"]),
    imobiliaria: txt(r["Imobiliaria"]),
    origem: txt(r["Origem"]),
    realizou: txt(r["Realizou"]),
    responsavel: txt(r["Responsável"]),
    amResponsavel: txt(r["AM Responsável"]),
    dataAgendamento: toISODate(r["Data de Agendamento"]),
    dataReuniao: toISODate(r["Data da Reunião"]),
    link: txt(r["Link lead (CRM)"]),
    fonte: "controle",
  }));
  const fenix = sheet("Fenix (2025)").map((r) => ({
    nome: txt(r["Nome"]),
    imobiliaria: txt(r["Empresa"]),
    origem: "Fenix",
    realizou: txt(r["Realizou"]),
    responsavel: txt(r["BDR Responsável"]),
    amResponsavel: txt(r["AM Responsável"]),
    dataAgendamento: toISODate(r["Data de Agendamento"]),
    dataReuniao: toISODate(r["Data da Reunião"]),
    link: txt(r["Link lead (RD)"]),
    fonte: "fenix",
  }));
  await bulk([...controle, ...fenix], (b) => db.insert(schema.histReunioes).values(b));

  // Cadastros
  const cad = sheet("Cadastros (2025)").map((r) => ({
    nome: txt(r["Nome"]),
    imobiliaria: txt(r["Imobiliaria"]),
    origem: txt(r["Origem"]),
    bdr: txt(r["BDR Responsável"]),
    amResponsavel: txt(r["AM Responsável"]),
    dataReuniao: toISODate(r["Data da Reunião"]),
    cadastrou: txt(r["Cadastrou?"]),
    dataCadastro: toISODate(r["Data de Cadastro"]),
    link: txt(r["Link lead (RD)"]),
  }));
  await bulk(cad, (b) => db.insert(schema.histCadastros).values(b));

  // Faturamento
  const fat = sheet("Faturamento (2025)").map((r) => {
    const valor = r["Valor da Proposta"];
    return {
      nProposta: txt(r["N° Proposta"]),
      imobiliaria: txt(r["Imobiliaria"]),
      valorCents: typeof valor === "number" ? Math.round(valor * 100) : null,
      status: txt(r["Status da Proposta"]),
      dataEnvio: toISODate(r["Data Envio Proposta"]),
      dataAtualizacao: toISODate(r["Data Ultima Atualização"]),
      origemImob: txt(r["Origem Imob"]),
      regional: txt(r["Regional"]),
      url: txt(r["URL Plataforma"]),
    };
  });
  await bulk(fat, (b) => db.insert(schema.histFaturamento).values(b));

  const [c] = (await sql`select
    (select count(*) from hist_reunioes)::int reun,
    (select count(*) from hist_reunioes where lower(realizou)='sim')::int realizadas,
    (select count(*) from hist_cadastros)::int cad,
    (select count(*) from hist_faturamento)::int fat`) as Record<string, unknown>[];
  console.log("Importado:", JSON.stringify(c));
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
