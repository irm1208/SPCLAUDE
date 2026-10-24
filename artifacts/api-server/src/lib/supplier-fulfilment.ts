import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray, lt, sql } from "drizzle-orm";
import {
  db, groupBuysTable, gbReshippersTable, ordersTable, orderLineItemsTable, groupBuyRefundsTable,
  auditLogsTable, gbSupplierBatchesTable as batches, gbSupplierShipmentsTable as shipments,
  gbSupplierEventsTable as events, gbSupplierAllocationsTable as allocations,
} from "@workspace/db";
import { canonicalUsername, type UpdateActor } from "./group-buy-updates-model";
import { lockHalfKitMoney } from "./half-kit-lock";
import { SupplierBatchError, fingerprint, snapshotOrder, csv, regionalBatchReference, type BatchOrder } from "./supplier-batches-model";
import { allocateContents, validateReceipt, orderReadiness, routeOf, type ShipmentLine, type ReceiptLine } from "./supplier-fulfilment-model";

export type FulfilmentActor = UpdateActor & { reshipper?: boolean };
type Database = typeof db;
const bad = (message: string, status = 409): never => { throw new SupplierBatchError(message, status); };
const text = (value: unknown, max: number, required = false) => {
  if (value != null && typeof value !== "string") return bad("Invalid text field.", 400);
  const result = ((value as string) ?? "").trim();
  if (result.length > max || required && !result) return bad(`Provide ${required ? "a non-empty value of " : "up to "}${max} characters.`, 400);
  return result;
};
const normalizeShipment = (s: any, canReceive: boolean) => ({ ...s, receiptChecked: !!s.receiptChecked, canReceive, requestKey: undefined, requestHash: undefined, createdBy: undefined });
const live = (s: any) => !s.cancelledAt;

export async function supplierFulfilmentAccess(tx: any, id: string, actor: FulfilmentActor, write = false) {
  let q: any = tx.select({ id: groupBuysTable.id, name: groupBuysTable.name, organiserId: groupBuysTable.organiserId,
    organiserCanEditTracking: groupBuysTable.organiserCanEditTracking }).from(groupBuysTable).where(eq(groupBuysTable.id, id));
  if (write) q = q.for("update");
  const [group] = await q;
  if (!group) return bad("Group buy not found.", 404);
  if (actor.adminGbId && actor.adminGbId !== id) return bad("This session belongs to another group buy.", 403);
  if (actor.reshipper) {
    const [assignment] = await tx.select({ id: gbReshippersTable.id }).from(gbReshippersTable).where(and(
      eq(gbReshippersTable.gbId, id),
      sql`lower(ltrim(${gbReshippersTable.reshipperUsername}, '@')) = ${canonicalUsername(actor.username)}`,
    )).limit(1);
    if (!assignment) return bad("You are not assigned to this group buy.", 403);
  } else if (!actor.admin && canonicalUsername(group.organiserId ?? "") !== canonicalUsername(actor.username)) {
    return bad("You do not manage this group buy.", 403);
  }
  return group;
}
async function audit(tx: any, id: string, actor: FulfilmentActor, kind: string, detail: any) {
  const metadata = { actor: actor.username, ...detail };
  await tx.insert(events).values({ id: randomUUID(), groupBuyId: id, kind, detail: metadata });
  await tx.insert(auditLogsTable).values({
    type: "change", level: "info", action: `supplier_fulfilment_${kind}`,
    message: `Supplier shipment ${kind}`, metadata: { groupBuyId: id, ...metadata },
  });
}
async function loadBatch(tx: any, id: string, batchId: string, actor: FulfilmentActor, write = false) {
  let query: any = tx.select().from(batches).where(and(eq(batches.id, batchId), eq(batches.groupBuyId, id)));
  if (write) query = query.for("update");
  const [batch] = await query;
  if (!batch || batch.state === "released") return bad("Batch not found.", 404);
  // A reshipper may see only a shipment they own, not other batches in their GB.
  const owned = actor.reshipper ? eq(shipments.recipientUsername, canonicalUsername(actor.username)) : undefined;
  const packages = await tx.select().from(shipments).where(and(eq(shipments.batchId, batchId), owned)).orderBy(asc(shipments.createdAt));
  if (actor.reshipper && !packages.length) return bad("Batch not found.", 404);
  const snapshot = batch.snapshot as { region: { name: string; countries?: string[] }; kits: number; orders: BatchOrder[] };
  const visible = new Set(packages.flatMap((s: any) => (s.contents as ShipmentLine[]).map(l => l.orderId)));
  const purchased = actor.reshipper ? snapshot.orders.filter(o => visible.has(o.id)) : snapshot.orders;
  const ids = purchased.map(o => o.id);
  // Project parent metadata, never labels, addresses, PDFs, payment TXIDs or blobs.
  let parentQuery: any = ids.length ? tx.select({
    id: ordersTable.id, code: ordersTable.code, telegramUsername: ordersTable.telegramUsername, groupBuyId: ordersTable.groupBuyId,
    status: ordersTable.status, deletedAt: ordersTable.deletedAt, paymentStatus: ordersTable.paymentStatus,
    grandTotal: ordersTable.grandTotal, creditsApplied: ordersTable.creditsApplied, amountDue: ordersTable.amountDue,
    productSubtotal: ordersTable.productSubtotal, vendorShipping: ordersTable.vendorShipping,
    shippingCountry: ordersTable.shippingCountry, reshipperUsername: ordersTable.reshipperUsername,
    routingType: ordersTable.routingType, directShippingRequested: ordersTable.directShippingRequested,
  }).from(ordersTable).where(inArray(ordersTable.id, ids)).orderBy(asc(ordersTable.id)) : null;
  if (write && parentQuery) parentQuery = parentQuery.for("update");
  const parents: any[] = parentQuery ? await parentQuery : [];
  const lines = ids.length ? await tx.select().from(orderLineItemsTable).where(inArray(orderLineItemsTable.orderId, ids)) : [];
  const refunds = ids.length ? await tx.select({ orderId: groupBuyRefundsTable.orderId, status: groupBuyRefundsTable.status })
    .from(groupBuyRefundsTable).where(inArray(groupBuyRefundsTable.orderId, ids)) : [];
  const used = ids.length ? await tx.select().from(allocations).where(inArray(allocations.orderId, ids)) : [];
  const parentMap = new Map(parents.map(o => [o.id, o]));
  const lineMap = new Map<string, any[]>(); for (const l of lines) lineMap.set(l.orderId, [...(lineMap.get(l.orderId) ?? []), l]);
  const usedMap = new Map(used.map((a: any) => [a.orderId, a.batchId]));
  const refundSet = new Set(refunds.filter((r: any) => !["rejected", "cancelled", "canceled"].includes(r.status)).map((r: any) => r.orderId));
  const orders = purchased.map(o => {
    const current = parentMap.get(o.id), problems: string[] = [];
    if (!current || current.deletedAt) problems.push("Order removed — Admin review required.");
    if (current && (current.paymentStatus !== "confirmed" || Number(current.amountDue ?? 0) > 0 || current.status === "Cancelled")) problems.push("Payment or cancellation changed — review before dispatch.");
    if (refundSet.has(o.id)) problems.push("Refund exists — resolve before dispatch.");
    if (usedMap.get(o.id) !== batchId) problems.push("Supplier batch reservation mismatch.");
    if (current) {
      const latest = snapshotOrder({ ...current, lineItems: lineMap.get(o.id) ?? [] }, o.orderingAt);
      if (fingerprint(latest.items) !== fingerprint(o.items) || fingerprint(latest.money) !== fingerprint(o.money) || latest.country !== o.country) problems.push("Purchased products, charges or country changed — do not change the supplier snapshot.");
    }
    const route = routeOf(current ?? {});
    if (!route.direct && !route.reshipperUsername) problems.push("Assign a reshipper, or explicitly enable direct shipping on this order. A legacy Direct label alone is not enough.");
    for (const s of packages.filter(live)) if ((s.contents as ShipmentLine[]).some(l => l.orderId === o.id)
      && (s.recipientUsername ? route.reshipperUsername !== s.recipientUsername : !route.direct || s.directOrderId !== o.id)) {
      problems.push("Routing changed after allocation — reconcile this supplier package before dispatch."); break;
    }
    for (const s of packages.filter(live)) if (s.receiptChecked) {
      const receipts = new Map((s.receipt as ReceiptLine[]).map(r => [JSON.stringify([r.orderId, r.productId]), r]));
      for (const l of s.contents as ShipmentLine[]) if (l.orderId === o.id) {
        const r = receipts.get(JSON.stringify([l.orderId, l.productId]));
        if ((r?.damaged ?? 0) > 0) problems.push(`Received package: ${r!.damaged} damaged kits of ${l.productName} (${s.label}).`);
        const missing = l.quantity - (r?.good ?? 0) - (r?.damaged ?? 0);
        if (missing > 0) problems.push(`Received package: ${missing} missing kits of ${l.productName} (${s.label}).`);
      }
    }
    return {
      id: o.id, code: o.code, username: o.username, country: o.country, status: current?.status ?? "Missing",
      ...route, ...orderReadiness(o, packages.map((s: any) => ({ ...s, receiptChecked: !!s.receiptChecked })), problems),
      exceptions: problems,
    };
  });
  const active = packages.filter(live);
  const items = orders.flatMap(o => o.items);
  const summary = {
    id: batch.id, reference: regionalBatchReference(batch.reference, snapshot.region), region: snapshot.region.name, state: batch.state,
    kits: items.reduce((sum, i) => sum + i.quantity, 0), orderCount: orders.length,
    shipmentCount: active.length, untracked: active.filter((s: any) => !s.trackingNumber).length,
    allocatedKits: items.reduce((sum, i) => sum + i.allocated, 0),
    receivedKits: items.reduce((sum, i) => sum + i.received, 0), damagedKits: items.reduce((sum, i) => sum + i.damaged, 0),
    missingKits: items.reduce((sum, i) => sum + Math.max(0, i.quantity - i.received), 0),
    outstandingOrders: orders.filter(o => !["Shipped", "Completed", "Cancelled"].includes(o.status)).length,
    exceptionCount: orders.filter(o => o.exceptions.length).length,
  };
  return { batch, purchased, orders, packages, summary, parents: parentMap };
}
async function detail(tx: any, id: string, batchId: string, actor: FulfilmentActor, group: any) {
  const loaded = await loadBatch(tx, id, batchId, actor);
  const ownIds = loaded.packages.map((s: any) => s.id);
  const history = await tx.select({ id: events.id, kind: events.kind, createdAt: events.createdAt, detail: events.detail })
    .from(events).where(and(eq(events.groupBuyId, id), sql`${events.detail}->>'batchId' = ${batchId}`,
      actor.reshipper ? ownIds.length ? inArray(sql`${events.detail}->>'shipmentId'`, ownIds) : sql`false` : undefined))
    .orderBy(desc(events.createdAt)).limit(100);
  return {
    groupBuy: { id, name: group.name }, canManage: !actor.reshipper, batch: loaded.summary,
    orders: loaded.orders, shipments: loaded.packages.map((s: any) => normalizeShipment(s, !s.cancelledAt)),
    recipients: [...new Set(loaded.orders.map(o => o.reshipperUsername).filter((v): v is string => !!v))].sort(),
    history,
  };
}
export async function supplierFulfilmentDetail(id: string, batchId: string, actor: FulfilmentActor, database: Database = db) {
  return database.transaction(async tx => detail(tx, id, batchId, actor, await supplierFulfilmentAccess(tx, id, actor)));
}
export async function supplierFulfilmentOverview(id: string, actor: FulfilmentActor, cursor = 0, database: Database = db) {
  return database.transaction(async tx => {
    const group = await supplierFulfilmentAccess(tx, id, actor);
    const rows = await tx.select({ id: batches.id, sequence: batches.sequence }).from(batches).where(and(
      eq(batches.groupBuyId, id), eq(batches.state, "ordered"), cursor > 0 ? lt(batches.sequence, cursor) : undefined,
      actor.reshipper ? sql`EXISTS (SELECT 1 FROM gb_supplier_shipments ss WHERE ss.batch_id = ${batches.id} AND ss.recipient_username = ${canonicalUsername(actor.username)})` : undefined,
    )).orderBy(desc(batches.sequence)).limit(11);
    const result = [];
    for (const b of rows.slice(0, 10)) result.push((await loadBatch(tx, id, b.id, actor)).summary);
    return { groupBuy: { id, name: group.name }, canManage: !actor.reshipper, batches: result, nextCursor: rows.length > 10 ? rows[9].sequence : null };
  });
}
function trackingInput(body: any) {
  const carrier = body.carrier ?? 0;
  if (!Number.isInteger(carrier) || carrier < 0 || carrier > 9999999) return bad("Choose a valid carrier code (0 for Auto).", 400);
  const number = text(body.trackingNumber, 120).replace(/\s/g, "").toUpperCase() || null;
  const params = body.trackingParams ?? {};
  if (typeof params !== "object" || params === null || Array.isArray(params) || Object.keys(params).length > 10
    || Object.entries(params).some(([k, v]) => !/^[a-zA-Z0-9_]{1,50}$/.test(k) || typeof v !== "string" || v.length > 150)) return bad("Invalid carrier parameters.", 400);
  return { carrier, trackingNumber: number, trackingParams: params };
}
async function mutate(id: string, batchId: string, actor: FulfilmentActor, fn: (tx: any, loaded: Awaited<ReturnType<typeof loadBatch>> & { trackingAllowed: boolean }) => Promise<void>, database: Database) {
  return database.transaction(async tx => {
    await lockHalfKitMoney(tx, id);
    const group = await supplierFulfilmentAccess(tx, id, actor, true);
    const loaded = await loadBatch(tx, id, batchId, actor, true);
    if (loaded.batch.state !== "ordered") return bad("Mark this batch as ordered with the supplier before adding packages.");
    await fn(tx, { ...loaded, trackingAllowed: !!actor.admin || !!actor.reshipper || group.organiserCanEditTracking !== false });
    return detail(tx, id, batchId, actor, group);
  });
}
export async function createSupplierShipment(id: string, batchId: string, actor: FulfilmentActor, body: any, database: Database = db) {
  if (actor.reshipper) return bad("Only Admin or the organiser can allocate purchased batch contents.", 403);
  return mutate(id, batchId, actor, async (tx, loaded) => {
    const requestKey = text(body.requestKey, 100, true);
    if (!/^[a-zA-Z0-9_-]{10,100}$/.test(requestKey)) return bad("Provide a unique request key.", 400);
    const recipientUsername = canonicalUsername(text(body.recipientUsername, 80)) || null;
    const directOrderId = text(body.directOrderId, 100) || null;
    if (!!recipientUsername === !!directOrderId) return bad("Choose one assigned reshipper or one direct member order.", 400);
    const record = { ...trackingInput(body), label: text(body.label, 160, true), notes: text(body.notes, 2000) || null, recipientUsername, directOrderId };
    if (!loaded.trackingAllowed && record.trackingNumber) return bad("Admin has disabled organiser tracking changes for this group buy.", 403);
    const requestHash = fingerprint({ ...record, contents: body.contents });
    const existing = loaded.packages.find((s: any) => s.requestKey === requestKey);
    if (existing) { if (existing.requestHash !== requestHash) return bad("This request key was already used for different contents."); return; }
    const contents = allocateContents(loaded.purchased, loaded.packages, body.contents);
    const selected = new Set(contents.map(l => l.orderId));
    for (const o of loaded.orders.filter(o => selected.has(o.id))) {
      const blocking = o.exceptions.find(e => !e.startsWith("Received package:"));
      if (blocking) return bad(`Order #${o.code}: ${blocking}`);
      if (["Shipped", "Completed", "Cancelled"].includes(o.status)) return bad(`Order #${o.code} is already dispatched or cancelled.`);
      if (recipientUsername ? o.reshipperUsername !== recipientUsername : !o.direct || o.id !== directOrderId) return bad(`Order #${o.code} is not routed to this recipient.`);
    }
    if (recipientUsername) {
      const [assigned] = await tx.select({ id: gbReshippersTable.id }).from(gbReshippersTable).where(and(eq(gbReshippersTable.gbId, id),
        sql`lower(ltrim(${gbReshippersTable.reshipperUsername}, '@')) = ${recipientUsername}`)).limit(1);
      if (!assigned) return bad("This reshipper is no longer assigned to the group buy.");
    }
    const shipmentId = randomUUID();
    await tx.insert(shipments).values({ id: shipmentId, batchId, requestKey, requestHash, contents, ...record, createdBy: actor.username });
    await audit(tx, id, actor, "shipment_created", { batchId, shipmentId, label: record.label, recipientUsername, directOrderId, contents });
  }, database);
}
export async function changeSupplierShipment(id: string, batchId: string, shipmentId: string, actor: FulfilmentActor, action: "receive" | "update" | "cancel", body: any, database: Database = db) {
  return mutate(id, batchId, actor, async (tx, loaded) => {
    const s = loaded.packages.find((s: any) => s.id === shipmentId);
    if (!s) return bad("Shipment not found.", 404);
    if (actor.reshipper && (action !== "receive" || s.recipientUsername !== canonicalUsername(actor.username))) return bad("Only the assigned recipient can record receipt.", 403);
    if (!Number.isInteger(body.expectedVersion) || body.expectedVersion < 0) return bad("Reload this shipment before saving.", 400);
    let patch: any; const reason = text(body.reason, 1000);
    if (action === "receive") {
      if (s.cancelledAt) return bad("This allocation was cancelled.");
      const receipt = validateReceipt(s.contents as ShipmentLine[], body.receipt);
      const receiptNotes = text(body.notes, 2000) || null;
      if (s.receiptChecked && fingerprint(receipt) === fingerprint(s.receipt) && receiptNotes === s.receiptNotes) return;
      if (s.receiptChecked && !reason) return bad("Explain the receipt correction; the previous inspection stays in the audit history.", 400);
      // A reroute must not silently send newly received stock to a different reshipper.
      for (const l of s.contents as ShipmentLine[]) {
        const o = loaded.orders.find(o => o.id === l.orderId);
        if (!o || o.exceptions.some(e => e.startsWith("Routing changed"))) return bad("Routing changed — ask Admin/organiser to reconcile the package first.");
      }
      patch = { receipt, receiptChecked: 1, receiptNotes };
    } else if (action === "cancel") {
      if (s.cancelledAt) { if (s.cancelReason !== reason) return bad("This shipment was already cancelled with another reason."); return; }
      if (s.receiptChecked) return bad("An inspected shipment cannot be cancelled or reallocated. Correct its receipt with an audit reason instead.");
      if (!reason) return bad("Explain this allocation correction. Cancelling a record does not recall a real parcel.", 400);
      patch = { cancelledAt: new Date(), cancelReason: reason };
    } else {
      if (s.cancelledAt) return bad("This allocation was cancelled.");
      patch = { ...trackingInput(body), label: text(body.label, 160, true), notes: text(body.notes, 2000) || null };
      const identityChanged = fingerprint([patch.carrier, patch.trackingNumber, patch.trackingParams]) !== fingerprint([s.carrier, s.trackingNumber, s.trackingParams]);
      if (identityChanged && !loaded.trackingAllowed) return bad("Admin has disabled organiser tracking changes for this group buy.", 403);
      if (identityChanged && s.trackingNumber && !reason) return bad("Explain the tracking correction.", 400);
      if (!identityChanged && patch.label === s.label && patch.notes === s.notes) return;
      if (identityChanged) patch = { ...patch, trackingStatus: "pending", trackingEvents: [], lastChecked: null };
    }
    if (body.expectedVersion !== s.version) return bad("Someone changed this shipment. Refresh before trying again.");
    await tx.update(shipments).set({ ...patch, version: s.version + 1, updatedAt: new Date() }).where(and(eq(shipments.id, s.id), eq(shipments.version, s.version)));
    await audit(tx, id, actor, `shipment_${action}`, { batchId, shipmentId, label: s.label, reason, before: {
      receipt: s.receipt, receiptChecked: !!s.receiptChecked, trackingNumber: s.trackingNumber, carrier: s.carrier, trackingParams: s.trackingParams,
    }, after: patch });
  }, database);
}
export async function supplierPackingManifest(id: string, batchId: string, actor: FulfilmentActor, database: Database = db) {
  const result = await supplierFulfilmentDetail(id, batchId, actor, database);
  return csv([
    ["Batch", "Region", "Order", "Member", "Country", "Route", "Product ID", "Purchased product", "Purchased kits", "Allocated", "Received usable", "Damaged", "Ready", "Member status", "Exceptions"],
    ...result.orders.flatMap(o => o.items.map(i => [result.batch.reference, result.batch.region, o.code, o.username, o.country, o.route, i.productId, i.productName, i.quantity, i.allocated, i.received, i.damaged, o.ready ? "Yes" : "No", o.status, o.exceptions.join("; ")])),
  ]);
}
