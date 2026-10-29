export interface Fs3Product {
  id: string;
  name: string;
  vendor?: string | null;
  wholesaleVendorId?: string | null;
  wholesaleCost?: number | string | null;
}
export interface Fs3Supplier { id: string; name: string; legacyCatalogueVendor?: string; }
interface Line {
  productId?: string | null; productName: string; quantity: number;
  unitPrice?: number; lineTotal?: number; vendorId?: string | null;
}
interface Order { lineItems?: Line[]; }
const normalise = (name: string) => name.trim().toLowerCase();
const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
export function findFs3SavedCost(costs: Array<{ productName: string; unitCost: number }>, name: string) {
  // Explicitly approved FS3 aliases; mirror supplierCatalogueCosts on the API.
  const aliases: Record<string, string> = {
    "na semax 10mg": "na semax",
    "na selank 10mg": "na selank",
    "na kpv 30mg": "kpv 30mg",
  };
  const key = normalise(name);
  const exact = costs.filter(c => normalise(c.productName) === key);
  const matching = exact.length ? exact : costs.filter(c => aliases[key] && normalise(c.productName) === aliases[key]);
  const prices = new Set(matching.map(c => c.unitCost));
  const price = prices.size === 1 ? [...prices][0] : null;
  return price != null && Number.isFinite(price) && price >= 0 ? price : null;
}
function productFor(line: Pick<Line, "productId" | "productName">, products: Fs3Product[]) {
  const exact = line.productId ? products.find(p => p.id === line.productId) : undefined;
  if (exact) return exact;
  const matching = products.filter(p => normalise(p.name) === normalise(line.productName));
  if (matching.length === 1) return matching[0];
  // Historical catalogue duplicates for one supplier are equivalent, not
  // ambiguous offers from different suppliers.
  const identities = new Set(matching.map(p => JSON.stringify([
    p.wholesaleVendorId || normalise(p.vendor ?? ""), p.wholesaleCost == null ? null : Number(p.wholesaleCost),
  ])));
  return matching.length > 1 && identities.size === 1 ? matching[0] : undefined;
}

export function matchesFs3Order(
  order: { paymentStatus?: string | null; status: string }, payment: string, status: string,
) {
  const paid = ["confirmed", "test_confirmed"].includes(order.paymentStatus ?? "");
  return (!payment || (payment === "paid" ? paid : !paid)) && (!status || order.status === status);
}

/** Resolve only an unambiguous supplier; mixed selections need an explicit choice. */
export function inferFs3Supplier(orders: Order[], products: Fs3Product[], vendors: Fs3Supplier[]) {
  const ids = new Set<string>();
  for (const line of orders.flatMap(o => o.lineItems ?? [])) {
    const product = productFor(line, products);
    let id = line.vendorId ?? product?.wholesaleVendorId;
    if (!id && product?.vendor) {
      const name = normalise(product.vendor);
      const matching = vendors.filter(v => [v.id, v.name, v.legacyCatalogueVendor ?? ""].some(n => normalise(n) === name));
      if (matching.length === 1) id = matching[0].id;
    }
    if (!id || !vendors.some(v => v.id === id)) return "";
    ids.add(id);
  }
  return ids.size === 1 ? [...ids][0] : "";
}

/** Supplier-cost precedence matches the wholesale supplier export. */
export function fs3ProductCost(
  name: string, productId: string | null | undefined, products: Fs3Product[],
  legacyCost: (name: string) => number | null,
) {
  const product = productFor({ productId, productName: name }, products);
  if (product?.wholesaleCost != null) {
    const cost = Number(product.wholesaleCost);
    return Number.isFinite(cost) && cost >= 0 ? cost : null;
  }
  if (product?.wholesaleVendorId) return null;
  if (!product && products.filter(p => normalise(p.name) === normalise(name)).length > 1) return null;
  return legacyCost(name);
}

export function aggregateFs3Orders(orders: Order[], products: Fs3Product[], legacyCost: (name: string) => number | null) {
  const grouped = new Map<string, {
    name: string; productId: string | null; vendorId: string | null; qty: number; revenue: number;
  }>();
  for (const line of orders.flatMap(o => o.lineItems ?? [])) {
    const product = productFor(line, products);
    const vendorId = line.vendorId ?? product?.wholesaleVendorId ?? null;
    // Keep unresolved duplicate-name lines separate from identified offers.
    const identity = normalise(line.productName);
    const key = `${vendorId ?? "legacy"}:${identity}`;
    const entry = grouped.get(key) ?? {
      name: line.productName.trim(), productId: product?.id ?? (line.productId || null), vendorId, qty: 0, revenue: 0,
    };
    entry.qty += Number(line.quantity);
    entry.revenue += line.lineTotal != null ? Number(line.lineTotal) : Number(line.unitPrice ?? 0) * Number(line.quantity);
    grouped.set(key, entry);
  }
  return [...grouped.values()].map(row => {
    const cost = fs3ProductCost(row.name, row.productId, products, legacyCost);
    const totalRevenue = money(row.revenue);
    const totalCost = cost == null ? null : money(cost * row.qty);
    const profit = totalCost == null ? null : money(totalRevenue - totalCost);
    const unitPrice = row.qty > 0 ? totalRevenue / row.qty : 0;
    const unitProfit = cost == null ? null : unitPrice - cost;
    return {
      name: row.name, productId: row.productId, vendorId: row.vendorId, totalQty: row.qty,
      totalRevenue, cost, totalCost, profit,
      margin: profit != null && totalRevenue > 0 ? profit / totalRevenue * 100 : null,
      unitPrice, unitProfit, unitMargin: unitProfit != null && unitPrice > 0 ? unitProfit / unitPrice * 100 : null,
      groupBuyId: undefined as string | undefined,
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

export function fs3ProfitRowKey(row: {
  name: string; vendorId?: string | null; productId?: string | null; groupBuyId?: string | null;
}, index: number) {
  return JSON.stringify([row.vendorId, row.productId, row.groupBuyId, row.name, index]);
}
