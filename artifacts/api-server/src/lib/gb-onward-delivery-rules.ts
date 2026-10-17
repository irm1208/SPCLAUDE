export const EU_DESTINATIONS = [
  ["AT", "Austria"], ["BE", "Belgium"], ["BG", "Bulgaria"], ["HR", "Croatia"],
  ["CY", "Cyprus"], ["CZ", "Czech Republic"], ["DK", "Denmark"], ["EE", "Estonia"],
  ["FI", "Finland"], ["FR", "France"], ["DE", "Germany"], ["GR", "Greece"],
  ["HU", "Hungary"], ["IE", "Ireland"], ["IT", "Italy"], ["LV", "Latvia"],
  ["LT", "Lithuania"], ["LU", "Luxembourg"], ["MT", "Malta"], ["NL", "Netherlands"],
  ["PL", "Poland"], ["PT", "Portugal"], ["RO", "Romania"], ["SK", "Slovakia"],
  ["SI", "Slovenia"], ["ES", "Spain"], ["SE", "Sweden"],
] as const;
export const ONWARD_CURRENCIES = ["USD", "EUR", "GBP", "USDT", "USDC"] as const;
export type OnwardMethod = "pickup" | "home";
export type OnwardRate = { country: string; pickupSmall: number | null; pickupLarge: number | null; homeSmall: number | null; homeLarge: number | null };
export type OnwardMatrix = { enabled: boolean; currency: string; rates: OnwardRate[] };
export class OnwardDeliveryError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export function validOnwardMethod(value: unknown): value is OnwardMethod | null | undefined {
  return value === undefined || value === null || value === "pickup" || value === "home";
}
export function normalizeEuCountry(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim().toLowerCase();
  const aliases: Record<string, string> = { czechia: "CZ", "rep. of ireland": "IE", "republic of ireland": "IE", "the netherlands": "NL", hellas: "GR" };
  if (aliases[value]) return aliases[value];
  return EU_DESTINATIONS.find(([code, name]) =>
    value === code.toLowerCase() || value === name.toLowerCase() ||
    value === `${name.toLowerCase()} (${code.toLowerCase()})` ||
    value === `${code.toLowerCase()} ${name.toLowerCase()}`,
  )?.[0] ?? null;
}
export function parseOnwardMatrix(input: unknown): OnwardMatrix {
  if (!input || typeof input !== "object") throw new OnwardDeliveryError("Enter a delivery matrix.");
  const data = input as Record<string, unknown>;
  if (typeof data.enabled !== "boolean") throw new OnwardDeliveryError("enabled must be true or false.");
  if (!ONWARD_CURRENCIES.includes(data.currency as typeof ONWARD_CURRENCIES[number])) throw new OnwardDeliveryError("Choose a supported rate currency.");
  if (!Array.isArray(data.rates) || data.rates.length > 27) throw new OnwardDeliveryError("Enter up to 27 EU country rows.");
  const seen = new Set<string>();
  const rates = data.rates.map((row: unknown) => {
    if (!row || typeof row !== "object") throw new OnwardDeliveryError("Invalid country rate.");
    const raw = row as Record<string, unknown>;
    const country = normalizeEuCountry(raw.country);
    if (!country || seen.has(country)) throw new OnwardDeliveryError("Choose each EU country only once.");
    seen.add(country);
    const result: OnwardRate = { country, pickupSmall: null, pickupLarge: null, homeSmall: null, homeLarge: null };
    for (const key of ["pickupSmall", "pickupLarge", "homeSmall", "homeLarge"] as const) {
      const price = raw[key];
      if (price === null) continue;
      if (typeof price !== "number" || !Number.isFinite(price) || price < 0 || price > 10000 || Math.abs(price * 100 - Math.round(price * 100)) > 1e-7) {
        throw new OnwardDeliveryError("Rates must be blank or a non-negative amount with at most two decimal places.");
      }
      result[key] = price;
    }
    return result;
  });
  return { enabled: data.enabled, currency: data.currency as string, rates };
}
export function estimateOnwardDelivery(matrix: OnwardMatrix | null, rawCountry: unknown, kits: number) {
  if (!Number.isFinite(kits) || kits <= 0 || !Number.isInteger(kits * 2)) throw new OnwardDeliveryError("Quantity must be a positive number of kits, in half-kit increments.");
  const country = normalizeEuCountry(rawCountry);
  const base = { country, kits, currency: matrix?.currency ?? null, options: [] as { method: OnwardMethod; amount: number }[] };
  if (!matrix?.enabled || !country) return { ...base, status: "unavailable" as const };
  const row = matrix.rates.find(rate => rate.country === country);
  if (!row) return { ...base, status: "unavailable" as const };
  if (kits > 25) return { ...base, status: "quote_required" as const };
  const pickup = kits <= 5 ? row.pickupSmall : row.pickupLarge;
  const home = kits <= 5 ? row.homeSmall : row.homeLarge;
  if (pickup !== null) base.options.push({ method: "pickup", amount: pickup });
  if (home !== null) base.options.push({ method: "home", amount: home });
  return { ...base, status: base.options.length ? "available" as const : "unavailable" as const };
}
/** Explicit user-supplied starting rates. Only saved when a manager chooses to apply them. */
export function suppliedEuMatrix(): OnwardMatrix {
  const noPickup = new Set(["HR", "CY", "EE", "LV", "LT", "LU", "MT", "SK", "SI"]);
  const premiumPickup = new Set(["CZ", "PL", "RO"]);
  const home20 = new Set(["FI", "DE", "IE", "LU", "PT", "SE"]);
  const home213 = new Set(["HR", "CZ", "EE", "HU", "LV", "LT", "PL", "RO", "SK", "SI"]);
  return {
    enabled: true, currency: "USD",
    rates: EU_DESTINATIONS.map(([country]) => {
      if (country === "IT") return { country, pickupSmall: 7.5, pickupLarge: 11.5, homeSmall: 15, homeLarge: 20 };
      const homeSmall = country === "CY" || country === "MT" ? 40.3 : home20.has(country) ? 20 : home213.has(country) ? 21.3 : 19.6;
      return { country, pickupSmall: noPickup.has(country) ? null : premiumPickup.has(country) ? 17.8 : 17.3,
        pickupLarge: noPickup.has(country) ? null : premiumPickup.has(country) ? 23.6 : 23,
        homeSmall, homeLarge: Number((homeSmall + 6).toFixed(2)) };
    }),
  };
}
