/**
 * Dynamic vendor shipping calculator for Task #11.
 *
 * calculateVendorShipping(gbId, reshipperCountry, orderIds)
 *   → { totalCost, perOrder: Map<orderId, cost>, packageCount } | null
 *
 * Logic:
 *  1. Count total kits from order_line_items for the given orderIds.
 *  2. Split into packages of max MAX_KITS_PER_PACKAGE each.
 *  3. Look up intl_shipping_rates scoped to the gbId and reshipperCountry.
 *     Uses the cheapest active rate found for that country (first active result).
 *  4. Return total cost + proportional per-order breakdown.
 *  5. Return null if no rate data is found (caller falls back to fixed vendorShippingCost).
 */
import { db } from "@workspace/db";
import { orderLineItemsTable, intlShippingRatesTable, intlParcelSizesTable } from "@workspace/db";
import { and, eq, inArray } from "drizzle-orm";

export const MAX_KITS_PER_PACKAGE = 25;

/**
 * Returns the effective max kits per package for a GB, falling back to the
 * global default if the GB hasn't configured one.
 */
export function resolveMaxKitsPerPackage(gbOverride: number | null | undefined): number {
  if (gbOverride != null && Number.isFinite(gbOverride) && gbOverride > 0) return gbOverride;
  return MAX_KITS_PER_PACKAGE;
}

export interface VendorShippingResult {
  totalCost: number;
  packageCount: number;
  totalKits: number;
  /** per-order vendor shipping share (orderId → amount) */
  perOrder: Map<string, number>;
  /** rate used (for audit trail) */
  rateId: string;
  pricePerPackage: number;
  currency: "gbp" | "usd" | "eur";
}

export async function calculateVendorShipping(
  gbId: string,
  reshipperCountry: string,
  orderIds: string[],
  currency: "gbp" | "usd" | "eur" = "gbp",
  maxKitsPerPackageOverride?: number | null,
): Promise<VendorShippingResult | null> {
  if (orderIds.length === 0) return null;

  // 1. Count kits per order from line items
  const lineItems = await db
    .select({
      orderId: orderLineItemsTable.orderId,
      quantity: orderLineItemsTable.quantity,
    })
    .from(orderLineItemsTable)
    .where(inArray(orderLineItemsTable.orderId, orderIds));

  const kitMap = new Map<string, number>();
  for (const li of lineItems) {
    const cur = kitMap.get(li.orderId) ?? 0;
    kitMap.set(li.orderId, cur + parseFloat(String(li.quantity)));
  }

  // Ensure every order has an entry (even if no line items found — use 1 as fallback)
  for (const id of orderIds) {
    if (!kitMap.has(id)) kitMap.set(id, 1);
  }

  const totalKits = Array.from(kitMap.values()).reduce((s, q) => s + q, 0);

  // 2. Look up shipping rate for this GB and country (with parcel size maxKitsPerPackage)
  // We look for any active rate scoped to this gbId first, then fall back to
  // global rates (groupBuyId IS NULL) for the same country.
  const rates = await db
    .select({
      id: intlShippingRatesTable.id,
      parcelSizeId: intlShippingRatesTable.parcelSizeId,
      country: intlShippingRatesTable.country,
      carrier: intlShippingRatesTable.carrier,
      priceGbp: intlShippingRatesTable.priceGbp,
      priceUsd: intlShippingRatesTable.priceUsd,
      priceEur: intlShippingRatesTable.priceEur,
      sortOrder: intlShippingRatesTable.sortOrder,
      active: intlShippingRatesTable.active,
      parcelMaxKits: intlParcelSizesTable.maxKitsPerPackage,
    })
    .from(intlShippingRatesTable)
    .leftJoin(intlParcelSizesTable, eq(intlShippingRatesTable.parcelSizeId, intlParcelSizesTable.id))
    .where(
      and(
        eq(intlShippingRatesTable.groupBuyId, gbId),
        eq(intlShippingRatesTable.country, reshipperCountry),
        eq(intlShippingRatesTable.active, true),
      ),
    );

  if (rates.length === 0) return null;

  // Pick the first active rate (admin sorts by sortOrder)
  type RateRow = typeof rates[number];
  const rate = rates.sort((a: RateRow, b: RateRow) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))[0];

  // Use parcel-size-level maxKitsPerPackage, then GB-level override, then global default
  const effectiveMaxKitsFromRate = rate.parcelMaxKits ?? null;
  const effectiveMaxKits = resolveMaxKitsPerPackage(effectiveMaxKitsFromRate ?? maxKitsPerPackageOverride);
  const packageCount = Math.max(1, Math.ceil(totalKits / effectiveMaxKits));

  const pricePerPackage =
    currency === "usd"
      ? parseFloat(String(rate.priceUsd))
      : currency === "eur"
        ? parseFloat(String(rate.priceEur))
        : parseFloat(String(rate.priceGbp));

  if (isNaN(pricePerPackage) || pricePerPackage <= 0) return null;

  const totalCost = parseFloat((pricePerPackage * packageCount).toFixed(2));

  // 3. Proportional per-order breakdown
  const perOrder = new Map<string, number>();
  const costPerKit = totalKits > 0 ? totalCost / totalKits : totalCost / orderIds.length;

  let allocated = 0;
  const orderIdsSorted = [...orderIds];
  for (let i = 0; i < orderIdsSorted.length; i++) {
    const id = orderIdsSorted[i];
    const kits = kitMap.get(id) ?? 1;
    if (i === orderIdsSorted.length - 1) {
      // Last order gets any rounding remainder
      perOrder.set(id, parseFloat((totalCost - allocated).toFixed(2)));
    } else {
      const share = parseFloat((costPerKit * kits).toFixed(2));
      perOrder.set(id, share);
      allocated += share;
    }
  }

  return {
    totalCost,
    packageCount,
    totalKits,
    perOrder,
    rateId: rate.id,
    pricePerPackage,
    currency,
  };
}
