import { createHash } from "node:crypto";
/** Pure projection: callers must authorize orders BEFORE calling this function. */
type Order = {
  id: string; code?: string | null; additionOfOrderId?: string | null; groupBuyId?: string | null;
  telegramUsername: string; status: string; paymentStatus?: string | null; amountDue?: unknown;
  balancePaymentStatus?: string | null; refundStatus?: string | null; deliveryPrice?: unknown;
  currency?: string | null; reshipperUsername?: string | null; deletedAt?: unknown;
};
type Item = { productId: string; productName: string; quantity: unknown };
type Line = Item & { orderId: string };
type Batch = { id: string; reference: string; state: string; snapshot: unknown };
type Shipment = {
  batchId: string; recipientUsername?: string | null; cancelledAt?: unknown;
  receiptChecked?: unknown; receipt: unknown; contents: unknown;
};
export interface ShipmentContextOrder {
  id: string; code: string | null; additionOfOrderId: string | null; status: string;
  paymentStatus: string; amountDue: number; shippingTotal: number; currency: string;
  lineItems: { productName: string; quantity: number }[];
  batches: { id: string; reference: string; state: string; kits: number; items: { productId: string; productName: string; quantity: number }[] }[];
  allocationComplete: boolean; readiness: string | null; relatedOrderIds: string[];
  shipmentOrderIds: string[]; separateOrderIds: string[]; reviewReason: string | null;
  allocationToken: string;
}
const norm = (v?: string | null) => (v ?? "").trim().replace(/^@/, "").toLowerCase();
const sent = (o: { status: string }) => ["Shipped", "Completed"].includes(o.status);
function quantities(items: Item[]) {
  const result = new Map<string, number>();
  for (const i of items) {
    const q = Number(i.quantity);
    if (!i.productId || !Number.isFinite(q) || q <= 0) return null;
    result.set(i.productId, (result.get(i.productId) ?? 0) + q);
  }
  return result;
}

export function buildShipmentContext(orders: Order[], lines: Line[], batches: Batch[], shipments: Shipment[] = []): ShipmentContextOrder[] {
  const active = orders.filter(o => !o.deletedAt && o.status !== "Cancelled");
  const rows = active.map(o => {
    const ownLines = lines.filter(l => l.orderId === o.id);
    const allocated = batches.filter(b => b.state !== "released").flatMap(b => {
      const snapshot = b.snapshot as { orders?: { id: string; items?: Item[] }[] } | null;
      const items = (snapshot?.orders ?? []).filter(s => s.id === o.id).flatMap(s => s.items ?? []);
      return items.length ? [{
        id: b.id, reference: b.reference, state: b.state,
        kits: items.reduce((sum, i) => sum + Number(i.quantity), 0),
        items: items.map(i => ({ productId: i.productId, productName: i.productName, quantity: Number(i.quantity) })),
      }] : [];
    });
    const expected = quantities(ownLines), actual = quantities(allocated.flatMap(b => b.items));
    const allocationComplete = !!expected?.size && !!actual && expected.size === actual.size
      && [...expected].every(([id, q]) => Math.abs((actual.get(id) ?? 0) - q) < 0.00001);
    const parent = o.additionOfOrderId ? active.find(p => p.id === o.additionOfOrderId
      && p.groupBuyId === o.groupBuyId && norm(p.telegramUsername) === norm(o.telegramUsername) && !p.additionOfOrderId) : null;
    let reviewReason: string | null = o.additionOfOrderId && !parent ? "Original order unavailable — staff review required." : null;
    if (!allocationComplete) reviewReason ??= "Supplier allocation is missing or differs from the complete order — review before packing.";
    if (allocated.length > 1) reviewReason ??= "Order spans multiple supplier batches — review the complete allocation before packing.";
    let readiness: string | null = sent(o) ? "Already shipped — not included in a new parcel." : null;
    if (!sent(o)) {
      if (!["confirmed", "test_confirmed"].includes(o.paymentStatus ?? "") || !Number.isFinite(Number(o.amountDue ?? 0))
        || Number(o.amountDue ?? 0) > 0 || ["verifying", "pending_confirmation"].includes(o.balancePaymentStatus ?? "")) {
        readiness = "Waiting for full payment and any outstanding balance.";
      } else if (o.refundStatus && !["none", "rejected", "cancelled", "canceled"].includes(o.refundStatus)) {
        readiness = "An active refund requires review.";
      } else if (!["Submitted", "Processing"].includes(o.status)) {
        readiness = "Order is not in a dispatchable status.";
      } else if (reviewReason) readiness = reviewReason;
      else {
        const good = new Map<string, number>();
        for (const s of shipments) {
          if (s.cancelledAt || !s.receiptChecked || norm(s.recipientUsername) !== norm(o.reshipperUsername)
            || !allocated.some(b => b.id === s.batchId && b.state === "ordered")) continue;
          const receipts = Array.isArray(s.receipt) ? s.receipt : [];
          const contents = Array.isArray(s.contents) ? s.contents : [];
          for (const r of receipts) if (r.orderId === o.id && Number.isFinite(Number(r.good)) && Number(r.good) >= 0) {
            const content = contents.filter(c => c.orderId === o.id && c.productId === r.productId);
            const cap = content.reduce((sum, c) => sum + Number(c.quantity), 0);
            good.set(r.productId, (good.get(r.productId) ?? 0) + Math.min(Number(r.good), cap));
          }
        }
        if (!expected || [...expected].some(([id, q]) => (good.get(id) ?? 0) < q)) {
          readiness = "Supplier receipt must confirm all usable kits for this order and batch before dispatch.";
        }
      }
    }
    return {
      id: o.id, code: o.code ?? null, additionOfOrderId: parent?.id ?? null,
      status: o.status, paymentStatus: o.paymentStatus ?? "", amountDue: Number(o.amountDue ?? 0),
      shippingTotal: Number(o.deliveryPrice ?? 0), currency: o.currency ?? "",
      lineItems: ownLines.map(l => ({ productName: l.productName, quantity: Number(l.quantity) })),
      batches: allocated, allocationComplete, readiness, relatedOrderIds: [] as string[],
      shipmentOrderIds: [o.id], separateOrderIds: [] as string[], reviewReason,
      allocationToken: createHash("sha256").update(JSON.stringify(allocated.map(b => [
        b.id, b.state, b.items.map(i => [i.productId, i.productName, i.quantity]).sort(),
      ]).sort())).digest("hex"),
    };
  });
  for (const row of rows) {
    const root = row.additionOfOrderId ?? row.id;
    const family = rows.filter(r => (r.id === root || r.additionOfOrderId === root));
    row.relatedOrderIds = family.filter(r => r.id !== row.id).map(r => r.id);
    // Ambiguous linked allocations must not be inferred into a shipment.
    const unclear = family.some(r => !sent(r) && (r.reviewReason || r.batches.length !== 1));
    if (row.relatedOrderIds.length && unclear && !sent(row)) {
      row.reviewReason ??= "A linked supplier allocation is missing, partial or spans multiple batches — staff review required.";
    }
    const original = family.find(r => r.id === root);
    // The combined workflow is rooted at the original. Later-batch additions
    // remain standalone, including siblings and additions to a shipped original.
    row.shipmentOrderIds = !sent(row) && !row.reviewReason && original && !sent(original)
      && original.batches[0]?.id === row.batches[0]?.id
      ? family.filter(r => !sent(r) && !r.reviewReason && r.batches[0]?.id === row.batches[0]?.id).map(r => r.id)
      : [row.id];
    row.separateOrderIds = row.relatedOrderIds.filter(id => !row.shipmentOrderIds.includes(id));
  }
  return rows;
}

export function assertExpectedAllocations(context: ShipmentContextOrder[], ids: string[], expected?: Record<string, string>) {
  if (expected === undefined) return;
  if (!expected || typeof expected !== "object" || Array.isArray(expected)
    || ids.some(id => typeof expected[id] !== "string" || context.find(o => o.id === id)?.allocationToken !== expected[id])) {
    throw new Error("Supplier allocation changed. Reload and review the shipment before dispatching.");
  }
}

export function linkedShipmentBlocker(context: ShipmentContextOrder[], ids: string[]): string | null {
  for (const id of ids) {
    const row = context.find(r => r.id === id);
    if (!row || (!row.relatedOrderIds.length && !row.additionOfOrderId && !row.reviewReason?.startsWith("Original order unavailable"))) continue;
    if (row.reviewReason) return row.reviewReason;
    if (row.shipmentOrderIds.length > 1) return "This order has same-batch linked add-ons. Use the Linked orders tab to pack and dispatch them together.";
    if (row.readiness) return row.readiness;
  }
  return null;
}
