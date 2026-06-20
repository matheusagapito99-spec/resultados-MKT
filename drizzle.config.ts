import { defineConfig } from "drizzle-kit";

// Carrega .env.local (Next usa esse arquivo; drizzle-kit não o lê sozinho).
import { config } from "dotenv";
config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  verbose: true,
  strict: true,
});
