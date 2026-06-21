import { getSql } from "@/lib/db";

export type Row = Record<string, unknown>;
export const num = (v: unknown) => Number(v ?? 0);
export const str = (v: unknown) => String(v ?? "");
export const rows = (r: unknown): Row[] => r as Row[];

/** Cliente SQL cru (neon) para as métricas. */
export const db = () => getSql();
