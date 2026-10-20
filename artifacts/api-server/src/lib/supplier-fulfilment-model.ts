import { canonicalUsername } from "./group-buy-updates-model";
import { SupplierBatchError, type BatchOrder } from "./supplier-batches-model";

export interface ShipmentLine { orderId: string; productId: string; productName: string; code: string; username: string; quantity: number }
export interface ReceiptLine { orderId: string; productId: string; good: number; damaged: number }
export interface QuantityShipment {
  contents: ShipmentLine[]; receipt?: ReceiptLine[]; receiptChecked?: boolean; cancelledAt?: unknown;
}
export const lineKey = (l: { orderId: string; productId: string }) => JSON.stringify([l.orderId, l.productId]);
const fail = (message: string): never => { throw new SupplierBatchError(message, 400); };
export function quantity(value: unknown, zero = false): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < (zero ? 0 : 0.5) || value > 1e7 || !Number.isInteger(value * 2)) {
    return fail("Quantities must be finite kit amounts in steps of 0.5.");
  }
  return value;
}
export function routeOf(order: any) {
  const reshipperUsername = canonicalUsername(order.reshipperUsername ?? "") || null;
  // Ownership takes precedence over the legacy routingType default.
  // routingType defaults to "direct" on old unassigned orders; it is not proof
  // that a supplier is shipping to the member rather than a reshipper.
  const direct = !reshipperUsername && order.directShippingRequested === true;
  return { reshipperUsername, direct, route: reshipperUsername ? `@${reshipperUsername}` : direct ? "Direct to member" : "Unassigned — resolve in Fulfilment" };
}
export function purchasedLines(orders: BatchOrder[]) {
  const lines = new Map<string, ShipmentLine>();
  for (const o of orders) for (const i of o.items) {
    const l = { orderId: o.id, code: o.code, username: o.username, productId: i.productId, productName: i.productName, quantity: Number(i.quantity) };
    const key = lineKey(l), existing = lines.get(key);
    if (existing) existing.quantity += l.quantity; else lines.set(key, l);
  }
  return lines;
}
export function allocateContents(orders: BatchOrder[], shipments: QuantityShipment[], input: unknown): ShipmentLine[] {
  if (!Array.isArray(input) || !input.length || input.length > 10000) return fail("Choose between 1 and 10,000 purchased product lines.");
  const purchased = purchasedLines(orders), allocated = new Map<string, number>(), seen = new Set<string>();
  for (const s of shipments) if (!s.cancelledAt) for (const l of s.contents) allocated.set(lineKey(l), (allocated.get(lineKey(l)) ?? 0) + l.quantity);
  return input.map(l => {
    if (!l || typeof l.orderId !== "string" || typeof l.productId !== "string") return fail("Invalid purchased product line.");
    const key = lineKey(l), expected = purchased.get(key);
    if (!expected || seen.has(key)) return fail("A product line is duplicated or is not in the purchased batch.");
    seen.add(key);
    const q = quantity(l.quantity), remaining = expected.quantity - (allocated.get(key) ?? 0);
    if (q > remaining) throw new SupplierBatchError(`Order #${expected.code}, ${expected.productName}: only ${remaining} kits remaining to allocate.`);
    return { ...expected, quantity: q };
  });
}
export function validateReceipt(contents: ShipmentLine[], input: unknown): ReceiptLine[] {
  if (!Array.isArray(input) || input.length !== contents.length) return fail("Inspect every expected product line, including any with zero received.");
  const expected = new Map(contents.map(l => [lineKey(l), l])), seen = new Set<string>();
  return input.map(l => {
    if (!l || typeof l.orderId !== "string" || typeof l.productId !== "string") return fail("Invalid received product line.");
    const key = lineKey(l), e = expected.get(key);
    if (!e || seen.has(key)) return fail("Unknown or duplicated receipt line.");
    seen.add(key);
    const good = quantity(l.good, true), damaged = quantity(l.damaged, true);
    if (good + damaged > e.quantity) return fail(`Received plus damaged exceeds the expected ${e.quantity} kits for order #${e.code}.`);
    return { orderId: e.orderId, productId: e.productId, good, damaged };
  });
}
export function orderReadiness(order: BatchOrder, shipments: QuantityShipment[], exceptions: string[]) {
  const totals = new Map<string, { allocated: number; received: number; damaged: number }>();
  for (const s of shipments) if (!s.cancelledAt) {
    const receipts = new Map((s.receiptChecked ? s.receipt ?? [] : []).map(r => [lineKey(r), r]));
    for (const l of s.contents) if (l.orderId === order.id) {
      const key = lineKey(l), t = totals.get(key) ?? { allocated: 0, received: 0, damaged: 0 }, r = receipts.get(key);
      t.allocated += l.quantity; t.received += r?.good ?? 0; t.damaged += r?.damaged ?? 0; totals.set(key, t);
    }
  }
  const items = [...purchasedLines([order]).values()].map(l => ({
    productId: l.productId, productName: l.productName, quantity: l.quantity,
    ...(totals.get(lineKey(l)) ?? { allocated: 0, received: 0, damaged: 0 }),
  }));
  return { items, ready: !exceptions.length && items.length > 0 && items.every(i => i.received >= i.quantity) };
}
