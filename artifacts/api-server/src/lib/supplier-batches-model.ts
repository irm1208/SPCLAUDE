import { createHash } from "node:crypto";
import { normalizeToCode, COUNTRY_CODE_TO_NAME } from "./country-utils";

export const EU_COUNTRIES = "AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE".split(" ");
export class SupplierBatchError extends Error {
  constructor(message: string, public status = 409) { super(message); }
}
export interface BatchRegion { id: string; name: string; countries: string[]; targetKits: number }
export interface SupplierConfig { enabled: boolean; telegramAlerts: boolean; regions: BatchRegion[] }
export interface BatchItem { productId: string; productName: string; quantity: number; unitPrice: string; lineTotal: string }
export interface BatchOrder {
  id: string; code: string; username: string; country: string; kits: number; paidAt: string | null;
  orderingAt: string; historicalReviewed: boolean; items: BatchItem[]; money: string[];
}
export function validateRegions(input: unknown): BatchRegion[] {
  if (!Array.isArray(input) || input.length > 50) throw new SupplierBatchError("Provide up to 50 regions.", 400);
  const seen = new Set<string>(), ids = new Set<string>();
  return input.map(r => {
    if (!r || typeof r.id !== "string" || !/^[a-zA-Z0-9_-]{1,60}$/.test(r.id) || ids.has(r.id)
      || typeof r.name !== "string" || !r.name.trim() || r.name.length > 80
      || !Number.isFinite(r.targetKits) || r.targetKits <= 0 || r.targetKits > 1e7 || r.targetKits * 2 % 1
      || !Array.isArray(r.countries) || !r.countries.length) throw new SupplierBatchError("Each region needs a unique ID, name, countries and a positive kit target (increments of 0.5).", 400);
    ids.add(r.id);
    const countries: string[] = r.countries.map((v: unknown) => {
      if (typeof v !== "string") throw new SupplierBatchError("Invalid country.", 400);
      const code = normalizeToCode(v);
      if (!COUNTRY_CODE_TO_NAME[code]) throw new SupplierBatchError(`Unknown country: ${v}`, 400);
      if (seen.has(code)) throw new SupplierBatchError(`Country overlap: ${code} belongs to more than one region.`, 400);
      seen.add(code); return code;
    });
    return { id: r.id, name: r.name.trim(), countries: countries.sort(), targetKits: r.targetKits };
  });
}
const iso = (v: any) => v && Number.isFinite(new Date(v).getTime()) ? new Date(v).toISOString() : null;
export function paymentDate(o: any): string | null {
  const dates = [iso(o.paymentConfirmedAt), iso(o.balanceConfirmedAt)].filter(Boolean) as string[];
  return dates.sort().at(-1) ?? null;
}
export function eligibleOrder(o: any, allowPlaced = false, historicalReviewed = false): string | null {
  if (o.deletedAt) return "Deleted order";
  if (o.batchLocked) return "Already locked in a legacy supplier submission—review before including again";
  if (!(allowPlaced ? ["Submitted", "Processing", "Shipped", "Completed"] : ["Submitted"]).includes(o.status)) return `Order is ${o.status}`;
  if (o.paymentStatus !== "confirmed") return "Full payment not confirmed";
  if (!Number.isFinite(Number(o.amountDue ?? 0)) || Number(o.amountDue ?? 0) > 0) return "Outstanding order balance";
  if (o.refundStatus && !["none", "rejected", "cancelled", "canceled"].includes(o.refundStatus)) return "Refund requires review";
  if (o.activeRefund) return "Active refund requires review";
  if (!paymentDate(o) && !historicalReviewed) return "Missing reliable payment date—review historical order";
  if (!COUNTRY_CODE_TO_NAME[normalizeToCode(o.shippingCountry ?? "")]) return "Missing or unknown order destination";
  const items = o.lineItems?.filter((i: any) => !i.isOos) ?? [];
  if (!items.length || items.some((i: any) => !Number.isFinite(Number(i.quantity)) || Number(i.quantity) <= 0 || Number(i.quantity) * 2 % 1)) return "No valid active kit quantities";
  return null;
}
export function snapshotOrder(o: any, fallbackAt?: string): BatchOrder {
  const items = o.lineItems.filter((i: any) => !i.isOos).map((i: any) => ({
    productId: String(i.productId), productName: String(i.productName), quantity: Number(i.quantity),
    unitPrice: String(i.unitPrice), lineTotal: String(i.lineTotal),
  })).sort((a: BatchItem, b: BatchItem) => `${a.productId}:${a.unitPrice}:${a.quantity}:${a.productName}`.localeCompare(`${b.productId}:${b.unitPrice}:${b.quantity}:${b.productName}`));
  const paidAt = paymentDate(o);
  return {
    id: o.id, code: o.code, username: o.telegramUsername, country: normalizeToCode(o.shippingCountry ?? ""),
    items, kits: items.reduce((s: number, i: BatchItem) => s + i.quantity, 0),
    paidAt, orderingAt: paidAt ?? fallbackAt ?? "", historicalReviewed: !paidAt,
    money: ["grandTotal", "creditsApplied", "amountDue", "productSubtotal", "vendorShipping", "currency", "groupBuyId"].map(k => String(o[k] ?? "")),
  };
}
function canonical(v: any): any {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === "object") return Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])]));
  return v;
}
/** JSONB does not preserve insertion order. Hash semantic content, not key order. */
export const fingerprint = (v: unknown) => createHash("sha256").update(JSON.stringify(canonical(v))).digest("hex");
export function propose(queue: BatchOrder[], target: number) {
  const sorted = [...queue].sort((a, b) => a.orderingAt.localeCompare(b.orderingAt) || a.id.localeCompare(b.id));
  const total = sorted.reduce((s, o) => s + o.kits, 0);
  const orders: BatchOrder[] = []; let kits = 0;
  for (const o of sorted) { if (kits >= target) break; orders.push(o); kits += o.kits; }
  const products = new Map<string, { productId: string; productName: string; quantity: number }>();
  for (const o of orders) for (const i of o.items) {
    const key = `${i.productId}:${i.productName}`;
    const p = products.get(key) ?? { productId: i.productId, productName: i.productName, quantity: 0 };
    p.quantity += i.quantity; products.set(key, p);
  }
  return { orders, kits, queuedKits: total, remainingKits: total - kits, ready: kits >= target, products: [...products.values()] };
}
export function csv(rows: unknown[][]) {
  return rows.map(row => row.map(value => {
    let s = String(value ?? ""); if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  }).join(",")).join("\r\n") + "\r\n";
}
