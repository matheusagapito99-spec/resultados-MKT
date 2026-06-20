/** Helpers de extração/normalização dos dados do Moskit. */
import { fieldMap } from "./field-map";

type Rec = Record<string, unknown>;

/** Valor de um custom field (entityCustomFields) por id. */
export function cfValue(
  entityCustomFields: unknown,
  cfId: string,
): string | null {
  if (!Array.isArray(entityCustomFields)) return null;
  const f = (entityCustomFields as Rec[]).find((x) => x.id === cfId);
  if (!f) return null;
  if (typeof f.textValue === "string") return f.textValue;
  if (f.numericValue != null) return String(f.numericValue);
  if (Array.isArray(f.options) && f.options.length) return String(f.options[0]);
  return null;
}

export interface DealOrigin {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  inboundOriginRaw: string | null;
  cidade: string | null;
  uf: string | null;
}

export function extractOrigin(entityCustomFields: unknown): DealOrigin {
  return {
    utmSource: cfValue(entityCustomFields, fieldMap.utm.source),
    utmMedium: cfValue(entityCustomFields, fieldMap.utm.medium),
    utmCampaign: cfValue(entityCustomFields, fieldMap.utm.campaign),
    utmContent: cfValue(entityCustomFields, fieldMap.utm.content),
    utmTerm: cfValue(entityCustomFields, fieldMap.utm.term),
    inboundOriginRaw: cfValue(entityCustomFields, fieldMap.dealFields.origemInbound),
    cidade: cfValue(entityCustomFields, fieldMap.dealFields.cidade),
    uf: cfValue(entityCustomFields, fieldMap.dealFields.estado),
  };
}

/** jobTitle → papel normalizado. */
export function roleFromJobTitle(jobTitle: unknown): "sdr" | "gestor" | "outro" {
  const t = String(jobTitle ?? "").toLowerCase();
  if (fieldMap.roles.sdrJobTitles.some((j) => t.includes(j.toLowerCase()))) return "sdr";
  if (fieldMap.roles.gestorJobTitles.some((j) => t.includes(j.toLowerCase()))) return "gestor";
  return "outro";
}

/** Canal de marketing normalizado a partir do utm_source/medium. */
export function normalizeChannel(
  utmSource: string | null,
  utmMedium: string | null,
): string | null {
  if (!utmSource) return null;
  const s = utmSource.trim().toLowerCase();
  const m = (utmMedium ?? "").trim().toLowerCase();
  const paid = ["cpc", "ppc", "paid", "paid_social", "display"].includes(m);
  if (s.includes("google")) return paid ? "Google Ads" : "Google (orgânico)";
  if (s.includes("facebook") || s.includes("meta") || s === "fb" || s.includes("instagram"))
    return "Meta Ads";
  if (s.includes("linkedin")) return "LinkedIn Ads";
  if (s.includes("bing")) return "Bing Ads";
  if (s.includes("email") || m.includes("email")) return "E-mail Marketing";
  // capitaliza a primeira letra como fallback
  return utmSource.charAt(0).toUpperCase() + utmSource.slice(1);
}

/** Converte preço do Moskit (reais) para centavos. */
export function priceToCents(price: unknown, dealProducts: unknown): number | null {
  let p: number | null = null;
  if (typeof price === "number") p = price;
  else if (Array.isArray(dealProducts) && dealProducts.length) {
    p = (dealProducts as Rec[]).reduce(
      (sum, dp) => sum + (Number(dp.finalPrice ?? dp.price ?? 0) || 0),
      0,
    );
  }
  if (p == null || Number.isNaN(p) || p === 0) return null;
  return Math.round(p * 100);
}

/** id de um campo que pode ser objeto {id} ou valor cru. */
export function refId(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "object") {
    const o = v as Rec;
    return o.id != null ? String(o.id) : null;
  }
  return String(v);
}

/** Primeiro id de um array de refs [{id}]. */
export function firstRefId(arr: unknown): string | null {
  if (Array.isArray(arr) && arr.length) return refId(arr[0]);
  return null;
}
