import { createHash } from "node:crypto";
import type { VendorCostItem, VendorShipping } from "@workspace/db";
import { centsToUsdString, usdToCents } from "./refund-money";

export class VendorPortalError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

/** Normalise spelling only; never infer doses or modified compounds. */
export function supplierCatalogueCosts(
  lines: Array<{ productId?: string | null; productName: string; unitPrice?: unknown }>,
  products: Array<{ id: string; wholesaleVendorId?: string | null; wholesaleCost?: unknown }>,
  savedCosts: Array<{ productName: string; unitCost: unknown }>,
) {
  const normalise = (value: string) => value.trim().toLowerCase();
  // Explicitly approved FS3 catalogue aliases, not general strength inference.
  // Keep aligned with the FS3 profit lookup in fs3-order-tools.ts.
  const aliases: Record<string, string> = {
    "na semax 10mg": "na semax",
    "na selank 10mg": "na selank",
    "na kpv 30mg": "kpv 30mg",
  };
  const resolved = new Map<string, string>();
  const missing = new Set<string>();
  for (const line of lines) {
    const product = products.find(p => p.id === line.productId);
    let unitCost: unknown = product?.wholesaleCost;
    if (unitCost == null && !product?.wholesaleVendorId) {
      const name = normalise(line.productName);
      const exact = savedCosts.filter(c => normalise(c.productName) === name);
      const matches = exact.length ? exact : savedCosts.filter(c => aliases[name] && normalise(c.productName) === aliases[name]);
      const prices = new Set(matches.map(c => c.unitCost == null ? NaN : Number(c.unitCost)));
      if (prices.size === 1) unitCost = [...prices][0];
    }
    const amount = unitCost == null ? NaN : Number(unitCost);
    if (!Number.isFinite(amount) || amount < 0) {
      missing.add(line.productName);
      continue;
    }
    const price = amount.toFixed(2);
    if (resolved.has(line.productName) && resolved.get(line.productName) !== price) missing.add(line.productName);
    resolved.set(line.productName, price);
  }
  if (missing.size) {
    throw new VendorPortalError(
      `Missing or conflicting product supplier costs: ${[...missing].join("; ")}. ` +
      "Check FS3 My Prices for legacy products, or Wholesale setup for vendor-specific products. " +
      "This is a product-cost issue, not a vendor shipping charge.",
    );
  }
  return [...resolved].map(([productName, unitCost]) => ({ productName, unitCost }));
}

export function supplierItems(
  lines: Array<{ productName: string; quantity: unknown; unitPrice?: unknown }>,
  costs: Array<{ productName: string; unitCost: unknown }>,
): VendorCostItem[] {
  if (!lines.length) throw new VendorPortalError("No products to submit.");
  const totals = new Map<string, number>();
  for (const line of lines) {
    const quantity = Number(line.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 100000) throw new VendorPortalError(`Invalid quantity for ${line.productName}.`);
    totals.set(line.productName, (totals.get(line.productName) ?? 0) + quantity);
  }
  return [...totals].sort(([a], [b]) => a.localeCompare(b)).map(([productName, quantity]) => {
    const matches = costs.filter(c => c.productName === productName);
    const amount = Number(matches[0]?.unitCost);
    if (matches.length !== 1 || !Number.isFinite(amount) || amount < 0) {
      throw new VendorPortalError(`Set a saved FS3 supplier cost for "${productName}" before submitting.`);
    }
    const unitCents = usdToCents(String(matches[0].unitCost));
    const quantityHundredths = BigInt(Math.round(quantity * 100));
    const totalCents = (unitCents * quantityHundredths + 50n) / 100n;
    return { productName, quantity: Number(quantity.toFixed(2)), unitCost: centsToUsdString(unitCents), lineTotal: centsToUsdString(totalCents) };
  });
}

export function sourceFingerprint(source: { items: Array<{ productName: string; quantity: unknown; productId?: string; unitPrice?: unknown }>; shipping: unknown; orderIds?: string[] }): string {
  const items = source.items.map(i => ({ productName: i.productName, quantity: Number(i.quantity), ...(i.productId ? { productId: i.productId } : {}) }))
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  // Shipping is constructed with a fixed allowlisted key order by the service.
  return createHash("sha256").update(JSON.stringify({ items, shipping: source.shipping, orderIds: [...(source.orderIds ?? [])].sort() })).digest("hex");
}
export function previewFingerprint(shipments: unknown): string {
  const canonical = (value: any): any => {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
    return value;
  };
  return createHash("sha256").update(JSON.stringify(canonical(shipments))).digest("hex");
}
export function requiredShipping(source: Record<string, any>): VendorShipping {
  const address = String(source.shippingAddress ?? "").trim();
  const addressParts = [address];
  for (const part of [source.shippingCity, source.shippingPostcode]) {
    const text = typeof part === "string" ? part.trim() : "";
    if (text && !address.toLowerCase().includes(text.toLowerCase())) addressParts.push(text);
  }
  const shipping = {
    name: String(source.shippingName ?? "").trim(), address: addressParts.filter(Boolean).join(", "),
    country: String(source.shippingCountry ?? "").trim(), phone: String(source.shippingPhone ?? "").trim(),
    email: String(source.shippingEmail ?? "").trim(),
  };
  const missing = Object.entries(shipping).filter(([, value]) => !value).map(([key]) => key);
  if (missing.length) throw new VendorPortalError(`Delivery details missing: ${missing.join(", ")}. Set these before submitting.`);
  return shipping;
}
export function publicVendorOrder(row: any, stale: boolean, images: any[]) {
  // Never spread database records or snapshots into a vendor-facing response.
  const snapshot = row.snapshot;
  return {
    id: row.id, reference: row.reference, status: row.status,
    submittedAt: row.submittedAt, stale,
    items: snapshot.items.map((i: VendorCostItem) => ({ productName: i.productName, quantity: i.quantity, unitCost: i.unitCost, lineTotal: i.lineTotal })),
    currency: "USD", productCost: snapshot.productCost, shippingCost: snapshot.shippingCost, totalCost: snapshot.totalCost,
    shipping: {
      name: snapshot.shipping.name, address: snapshot.shipping.address, country: snapshot.shipping.country,
      phone: snapshot.shipping.phone, email: snapshot.shipping.email,
    },
    trackingNumber: row.trackingNumber ?? null, carrier: row.carrier ?? null,
    images: images.map(i => ({ id: i.id, filename: i.filename, url: i.url, createdAt: i.createdAt })),
  };
}
