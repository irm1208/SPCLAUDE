// EU onward-delivery estimates (reshipper -> member). Estimates are informational only:
// nothing in this module may ever be added to an order total, vendor shipping,
// delivery price, amount due, coupon basis or credits.

export type OnwardMethod = "pickup" | "home";
export type OnwardCurrency = "USD" | "EUR" | "GBP" | "USDT" | "USDC";
export const ONWARD_CURRENCIES: OnwardCurrency[] = ["USD", "EUR", "GBP", "USDT", "USDC"];
export const SMALL_MAX_KITS = 5;
export const LARGE_MAX_KITS = 25;

export interface OnwardRate {
  country: string;
  pickupSmall: number | null;
  pickupLarge: number | null;
  homeSmall: number | null;
  homeLarge: number | null;
}
export interface OnwardMatrix { enabled: boolean; currency: OnwardCurrency; rates: OnwardRate[] }
export interface OnwardCountry { code: string; name: string }
export interface OnwardConfig {
  reshippers: { username: string; enabled: boolean; matrix: OnwardMatrix | null }[];
  template: OnwardMatrix;
  countries: OnwardCountry[];
  currencies: string[];
}
export type EstimateStatus = "available" | "unassigned" | "unavailable" | "quote_required" | "not_applicable";
export interface OnwardEstimate {
  status: EstimateStatus;
  configured?: boolean;
  country: string | null;
  kits: number;
  currency: string | null;
  reshipperUsername: string | null;
  options: { method: OnwardMethod; amount: number }[];
  selectedMethod: OnwardMethod | null;
}
export const RATE_FIELDS = ["pickupSmall", "pickupLarge", "homeSmall", "homeLarge"] as const;
export type RateField = typeof RATE_FIELDS[number];

export const ONWARD_CAPTION = "Reshipper to you. Estimate only; pay the reshipper later. Not vendor shipping and not included in order total.";

/** Blank input -> null (never 0). Invalid/negative -> undefined (reject). */
export function parsePriceInput(raw: string): number | null | undefined {
  const s = raw.trim().replace(",", ".");
  if (s === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return undefined;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}
export const formatPriceInput = (v: number | null) => (v === null || v === undefined ? "" : String(v));

export function isOnwardMethod(v: unknown): v is OnwardMethod { return v === "pickup" || v === "home"; }

/** Half kits count 0.5; only product lines count. */
export function countKits(items: { productId?: string | null; quantity: number }[]): number {
  return items.reduce((s, i) => s + (i.productId && Number.isFinite(i.quantity) && i.quantity > 0 ? i.quantity : 0), 0);
}
export function kitBand(kits: number): "none" | "small" | "large" | "quote" {
  if (!(kits > 0)) return "none";
  if (kits <= SMALL_MAX_KITS) return "small";
  if (kits <= LARGE_MAX_KITS) return "large";
  return "quote";
}

/** Ensure every country has a row (blank = null), keep server order. */
export function normaliseMatrix(m: OnwardMatrix | null, countries: OnwardCountry[], fallbackCurrency: OnwardCurrency = "EUR"): OnwardMatrix {
  const byCode = new Map((m?.rates ?? []).map(r => [r.country, r]));
  return {
    enabled: m?.enabled ?? false,
    currency: m?.currency ?? fallbackCurrency,
    rates: countries.map(c => {
      const r = byCode.get(c.code);
      return { country: c.code, pickupSmall: r?.pickupSmall ?? null, pickupLarge: r?.pickupLarge ?? null, homeSmall: r?.homeSmall ?? null, homeLarge: r?.homeLarge ?? null };
    }),
  };
}
export function filledRateCount(m: OnwardMatrix | null): number {
  return (m?.rates ?? []).filter(r => RATE_FIELDS.some(f => r[f] !== null)).length;
}

export function parseEstimate(raw: unknown): OnwardEstimate {
  const r = (raw ?? {}) as Record<string, unknown>;
  const statuses: EstimateStatus[] = ["available", "unassigned", "unavailable", "quote_required", "not_applicable"];
  const status = statuses.includes(r.status as EstimateStatus) ? (r.status as EstimateStatus) : "unavailable";
  const options = Array.isArray(r.options)
    ? (r.options as { method: unknown; amount: unknown }[])
        .filter(o => isOnwardMethod(o?.method) && typeof o.amount === "number" && Number.isFinite(o.amount))
        .map(o => ({ method: o.method as OnwardMethod, amount: o.amount as number }))
    : [];
  return {
    status,
    configured: typeof r.configured === "boolean" ? r.configured : undefined,
    country: typeof r.country === "string" ? r.country : null,
    kits: typeof r.kits === "number" ? r.kits : 0,
    currency: typeof r.currency === "string" ? r.currency : null,
    reshipperUsername: typeof r.reshipperUsername === "string" ? r.reshipperUsername : null,
    options,
    selectedMethod: isOnwardMethod(r.selectedMethod) ? r.selectedMethod : null,
  };
}

/** Saved method whose price is no longer offered must be re-selected. */
export function selectionIsStale(e: OnwardEstimate, selected: OnwardMethod | null): boolean {
  return !!selected && !e.options.some(o => o.method === selected);
}

export function statusMessage(e: OnwardEstimate): string {
  switch (e.status) {
    case "available": return e.options.length ? "" : "No matching rate for your country and kit count yet.";
    case "unassigned": return "Pending reshipper assignment. Estimates appear once a reshipper covers your country.";
    case "unavailable": return "No matching rate from your reshipper for this country yet.";
    case "quote_required": return `Over ${LARGE_MAX_KITS} kits: the reshipper will quote onward delivery directly.`;
    case "not_applicable": return "Not applicable to this order.";
  }
}

export function formatOnwardAmount(amount: number, currency: string | null): string {
  const sym: Record<string, string> = { USD: "$", EUR: "\u20AC", GBP: "\u00A3" };
  const c = currency ?? "";
  const n = amount.toFixed(2);
  return sym[c] ? `${sym[c]}${n}` : `${n} ${c}`.trim();
}
export const methodLabel = (m: OnwardMethod) => (m === "pickup" ? "Pickup point" : "Home delivery");

// ── HTTP ────────────────────────────────────────────────────────────────────
export type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;
export const defaultFetcher: Fetcher = (url, init) => fetch(url, { credentials: "include", ...init });

async function json<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error || `Request failed (${res.status})`);
  return body as T;
}
const jsonInit = (method: string, body: unknown, init?: RequestInit): RequestInit => ({
  ...init, method,
  headers: { "Content-Type": "application/json", ...((init?.headers as Record<string, string>) ?? {}) },
  body: JSON.stringify(body),
});

export type ManagerScope = "admin" | "organiser";
export const onwardApi = {
  getConfig: (f: Fetcher, scope: ManagerScope, gbId: string, init?: RequestInit) =>
    f(`/api/${scope}/group-buys/${encodeURIComponent(gbId)}/onward-delivery`, init).then(r => json<OnwardConfig>(r)),
  saveMatrix: (f: Fetcher, scope: ManagerScope, gbId: string, username: string, m: OnwardMatrix, init?: RequestInit) =>
    f(`/api/${scope}/group-buys/${encodeURIComponent(gbId)}/onward-delivery/${encodeURIComponent(username)}`, jsonInit("PUT", m, init))
      .then(r => json<{ matrix: OnwardMatrix }>(r)),
  estimate: (f: Fetcher, gbId: string, body: { country: string; kits: number; reshipperCode?: string; directShippingRequested?: boolean; orderId?: string }) =>
    f(`/api/group-buys/${encodeURIComponent(gbId)}/onward-delivery/estimate`, jsonInit("POST", body)).then(r => json<unknown>(r)).then(parseEstimate),
  getOrder: (f: Fetcher, orderId: string) =>
    f(`/api/orders/${encodeURIComponent(orderId)}/onward-delivery`).then(r => json<unknown>(r)).then(parseEstimate),
  setOrder: (f: Fetcher, orderId: string, method: OnwardMethod | null) =>
    f(`/api/orders/${encodeURIComponent(orderId)}/onward-delivery`, jsonInit("PUT", { method })).then(r => json<unknown>(r)).then(parseEstimate),
  getManagerOrder: (f: Fetcher, scope: ManagerScope, gbId: string, orderId: string, init?: RequestInit) =>
    f(`/api/${scope}/group-buys/${encodeURIComponent(gbId)}/orders/${encodeURIComponent(orderId)}/onward-delivery`, init).then(r => json<unknown>(r)).then(parseEstimate),
  getReshipperOrder: (f: Fetcher, gbId: string, orderId: string) =>
    f(`/api/reshipper/gb/${encodeURIComponent(gbId)}/orders/${encodeURIComponent(orderId)}/onward-delivery`).then(r => json<unknown>(r)).then(parseEstimate),
};
