import { resolveFs3Cost, resolveFs3SupplierId, type Fs3SavedCost } from "@workspace/api-zod/fs3-costs";
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
  costVendorId?: string | null;
}
interface Order {
  lineItems?: Line[]; wholesaleVendorId?: string | null; shareVendorId?: string | null; legacyVendor?: string | null;
}
const normalise = (name: string) => name.trim().toLowerCase();
const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
export function findFs3SavedCost(costs: Fs3SavedCost[], name: string, vendorId: string | null = null, allowLegacyExact = vendorId === null) {
  return resolveFs3Cost(costs, costs.flatMap(c => c.matches ?? []), name, vendorId, allowLegacyExact);
}
function productFor(line: Pick<Line, "productId" | "productName">, products: Fs3Product[]) {
  // Match the API: only a persisted product ID establishes a catalogue offer.
  // An unlinked historical line uses its resolved supplier's reviewed cost,
  // never a current same-name offer (even when only one exists).
  return line.productId ? products.find(p => p.id === line.productId) : undefined;
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
  for (const order of orders) for (const line of order.lineItems ?? []) {
    const product = productFor(line, products);
    const id = line.costVendorId !== undefined ? line.costVendorId
      : resolveFs3SupplierId({ ...order, vendorId: line.vendorId }, product ?? {}, vendors);
    if (!id || !vendors.some(v => v.id === id)) return "";
    ids.add(id);
  }
  return ids.size === 1 ? [...ids][0] : "";
}

/** Supplier-cost precedence matches the wholesale supplier export. */
export function fs3ProductCost(
  name: string, productId: string | null | undefined, products: Fs3Product[],
  legacyCost: (name: string, vendorId?: string | null, allowLegacyExact?: boolean) => number | null,
  vendorId?: string | null,
  vendors: Fs3Supplier[] = [],
) {
  const product = productFor({ productId, productName: name }, products);
  if (product?.wholesaleCost != null) {
    const cost = Number(product.wholesaleCost);
    return Number.isFinite(cost) && cost >= 0 ? cost : null;
  }
  const scope = vendorId !== undefined ? vendorId : resolveFs3SupplierId({}, product ?? {}, vendors);
  if (!product && !scope && products.filter(p => normalise(p.name) === normalise(name)).length > 1) return null;
  return legacyCost(name, scope, !product?.wholesaleVendorId);
}

export function aggregateFs3Orders(orders: Order[], products: Fs3Product[], legacyCost: (name: string, vendorId?: string | null, allowLegacyExact?: boolean) => number | null, vendors: Fs3Supplier[] = []) {
  const grouped = new Map<string, {
    name: string; productId: string | null; vendorId: string | null; qty: number; revenue: number;
  }>();
  for (const order of orders) for (const line of order.lineItems ?? []) {
    const product = productFor(line, products);
    const vendorId = line.costVendorId !== undefined ? line.costVendorId
      : resolveFs3SupplierId({ ...order, vendorId: line.vendorId }, product ?? {}, vendors);
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
    const cost = fs3ProductCost(row.name, row.productId, products, legacyCost, row.vendorId);
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
