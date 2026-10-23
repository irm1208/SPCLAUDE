import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db, accountsTable, accountGroupBuysTable, gbCountryLegsTable, groupBuysTable, ordersTable, orderLineItemsTable, groupBuyRefundsTable, gbSupplierEligibilityTable, gbSupplierSettingsTable, gbSupplierBatchesTable, gbSupplierAllocationsTable, gbSupplierShipmentsTable } from "@workspace/db";
import { SupplierBatchError, collectSupplierQueues, isDirectSupplierOrder, propose, type BatchOrder, type SupplierConfig } from "./supplier-batches-model";
import { orderReadiness, type QuantityShipment } from "./supplier-fulfilment-model";
import { normalizeToCode } from "./country-utils";
import { canonicalUsername } from "./group-buy-updates-model";

type MemberBatch = { id: string; reference: string; state: string; createdAt: Date; orderedAt: Date | null;
  snapshot: { region: { name: string; countries?: string[]; targetKits?: number }; kits: number; orders: BatchOrder[] } };
type MemberShipment = QuantityShipment & { batchId: string };

const countryCode = (v: string | null | undefined) => {
  const code = normalizeToCode(v ?? "");
  return code === "UK" ? "GB" : code;
};
export function memberDestinationCountries(ownOrders: any[], joinedCountry?: string | null, profileCountry?: string | null) {
  const countries = new Set<string>(ownOrders.filter(o => !o.deletedAt && o.status !== "Cancelled" && o.paymentStatus !== "refunded")
    .map(o => countryCode(o.shippingCountry)).filter(Boolean));
  if (!countries.size) {
    const fallback = countryCode(joinedCountry) || countryCode(profileCountry);
    if (fallback) countries.add(fallback);
  }
  return countries;
}
export function memberCanViewBatch(batch: MemberBatch, countries: Set<string>) {
  const canonical = new Set([...countries].map(countryCode));
  const covered = batch.snapshot.region.countries ?? batch.snapshot.orders.map(o => o.country);
  return covered.some(c => canonical.has(countryCode(c)));
}
export function memberRegionalProgress(config: SupplierConfig, queues: Map<string, BatchOrder[]>, countries: Set<string>, ownOrderIds: Set<string> = new Set()) {
  if (!config.enabled) return [];
  const canonical = new Set([...countries].map(countryCode));
  return config.regions.filter(r => r.countries.some(c => canonical.has(countryCode(c)))).map(region => {
    const queue = queues.get(region.id) ?? [];
    const progress = propose(queue, region.targetKits);
    const yourOrderStatus = progress.orders.some(o => ownOrderIds.has(o.id)) ? "included"
      : queue.some(o => ownOrderIds.has(o.id)) ? "waiting" : "not_included";
    return { id: region.id, name: region.name, kits: progress.queuedKits, targetKits: region.targetKits,
      status: progress.ready ? "Ready" : "Filling", yourOrderStatus };
  });
}

/** Explicit allow-list: never spread staff batch/snapshot/shipment objects into a member response. */
export function memberBatchSummary(batch: MemberBatch, shipments: MemberShipment[], ownBatchIds: Set<string>) {
  const active = shipments.filter(s => s.batchId === batch.id && !s.cancelledAt);
  let status = batch.state === "released" ? "Released — not ordered" : batch.state === "prepared" ? "Prepared" : "Submitted to vendor";
  if (batch.state === "ordered" && active.length) {
    const readiness = batch.snapshot.orders.map(o => orderReadiness(o, active, []));
    const complete = readiness.length > 0 && readiness.every(r => r.ready);
    const anyReceived = readiness.some(r => r.items.some(i => i.received > 0));
    status = complete ? "Received by reshipper" : anyReceived ? "Part received by reshipper" : "Supplier packages arranged";
  }
  return { id: batch.id, reference: batch.reference, region: batch.snapshot.region.name, kits: batch.snapshot.kits,
    targetKits: batch.snapshot.region.targetKits ?? null,
    status, createdAt: batch.createdAt.toISOString(), orderedAt: batch.orderedAt?.toISOString() ?? null,
    isYourBatch: batch.state !== "released" && ownBatchIds.has(batch.id) };
}

export async function memberSupplierBatches(id: string, username: string, database = db) {
  const identity = canonicalUsername(username);
  if (!identity) throw new SupplierBatchError("Group buy not found or you are not a member.", 404);
  return database.transaction(async tx => {
    const [group] = await tx.select({ name: groupBuysTable.name, status: groupBuysTable.status, forced: groupBuysTable.forcedUsernames })
      .from(groupBuysTable).where(eq(groupBuysTable.id, id));
    const [member] = await tx.select({ id: accountGroupBuysTable.id, countryLegId: accountGroupBuysTable.countryLegId }).from(accountGroupBuysTable)
      .where(and(eq(accountGroupBuysTable.groupBuyId, id),
        sql`lower(regexp_replace(btrim(${accountGroupBuysTable.accountId}), '^@', '')) = ${identity}`));
    if (!group || group.status === "archived" || (!member && !group.forced?.some(name => canonicalUsername(name) === identity)))
      throw new SupplierBatchError("Group buy not found or you are not a member.", 404);
    const [settings] = await tx.select({ config: gbSupplierSettingsTable.config }).from(gbSupplierSettingsTable)
      .where(eq(gbSupplierSettingsTable.groupBuyId, id));
    if ((settings?.config as SupplierConfig | undefined)?.showToMembers !== true)
      throw new SupplierBatchError("Batch status is not shared with members for this group buy.", 403);
    const config = settings!.config as SupplierConfig;
    // Project only queue inputs: never pull QR labels, proof images or tracking blobs into a polled member request.
    const parents = await tx.select({
      id: ordersTable.id, code: ordersTable.code, telegramUsername: ordersTable.telegramUsername,
      shippingCountry: ordersTable.shippingCountry, status: ordersTable.status, paymentStatus: ordersTable.paymentStatus,
      amountDue: ordersTable.amountDue, paymentConfirmedAt: ordersTable.paymentConfirmedAt, balanceConfirmedAt: ordersTable.balanceConfirmedAt,
      refundStatus: ordersTable.refundStatus, deletedAt: ordersTable.deletedAt, batchLocked: ordersTable.batchLocked,
      routingType: ordersTable.routingType, directShippingRequested: ordersTable.directShippingRequested, reshipperUsername: ordersTable.reshipperUsername,
    }).from(ordersTable).where(eq(ordersTable.groupBuyId, id));
    const ownActiveOrders = parents.filter(o => canonicalUsername(o.telegramUsername) === identity && !o.deletedAt
      && o.status !== "Cancelled" && o.paymentStatus !== "refunded");
    const directShipping = ownActiveOrders.some(isDirectSupplierOrder);
    const directShippingOnly = directShipping && ownActiveOrders.every(isDirectSupplierOrder);
    const base = { groupBuy: { id, name: group.name }, batches: [], regions: [], directShipping, directShippingOnly };
    // Direct orders never belong to the regional supplier queue. Do not require a
    // destination country or expose unrelated regional counts for these members.
    if (directShippingOnly) return { ...base, countryRequired: false };
    const [profile] = await tx.select({ country: accountsTable.country }).from(accountsTable)
      .where(sql`lower(regexp_replace(btrim(${accountsTable.telegramUsername}), '^@', '')) = ${identity}`);
    const [leg] = member?.countryLegId ? await tx.select({ country: gbCountryLegsTable.countryCode }).from(gbCountryLegsTable)
      .where(and(eq(gbCountryLegsTable.id, member.countryLegId), eq(gbCountryLegsTable.gbId, id))) : [];
    const countries = memberDestinationCountries(ownActiveOrders.filter(o => !isDirectSupplierOrder(o)), leg?.country, profile?.country);
    const empty = { ...base, countryRequired: countries.size === 0 };
    if (!countries.size) return empty; // No guessed/global region access when country is unknown.
    const allBatches = await tx.select({ id: gbSupplierBatchesTable.id, reference: gbSupplierBatchesTable.reference, state: gbSupplierBatchesTable.state,
      createdAt: gbSupplierBatchesTable.createdAt, orderedAt: gbSupplierBatchesTable.orderedAt, snapshot: gbSupplierBatchesTable.snapshot })
      .from(gbSupplierBatchesTable).where(eq(gbSupplierBatchesTable.groupBuyId, id)).orderBy(asc(gbSupplierBatchesTable.sequence));
    const orderIds = parents.map(o => o.id);
    const [lines, refunds, used, eligibility] = orderIds.length ? await Promise.all([
      tx.select({ orderId: orderLineItemsTable.orderId, productId: orderLineItemsTable.productId, quantity: orderLineItemsTable.quantity,
        isOos: orderLineItemsTable.isOos }).from(orderLineItemsTable).where(inArray(orderLineItemsTable.orderId, orderIds)),
      tx.select({ orderId: groupBuyRefundsTable.orderId }).from(groupBuyRefundsTable)
        .where(and(inArray(groupBuyRefundsTable.orderId, orderIds), inArray(groupBuyRefundsTable.status, ["requested", "verifying", "verification_failed", "completed"]))),
      tx.select({ orderId: gbSupplierAllocationsTable.orderId, batchId: gbSupplierAllocationsTable.batchId }).from(gbSupplierAllocationsTable)
        .where(inArray(gbSupplierAllocationsTable.orderId, orderIds)),
      tx.select({ orderId: gbSupplierEligibilityTable.orderId, reviewedAt: gbSupplierEligibilityTable.reviewedAt }).from(gbSupplierEligibilityTable)
        .where(inArray(gbSupplierEligibilityTable.orderId, orderIds)),
    ]) : [[], [], [], []];
    const byOrder = new Map<string, typeof lines>();
    for (const line of lines) { const list = byOrder.get(line.orderId) ?? []; list.push(line); byOrder.set(line.orderId, list); }
    const refundIds = new Set(refunds.map(r => r.orderId));
    const all = parents.map(o => ({ ...o, lineItems: byOrder.get(o.id) ?? [], activeRefund: refundIds.has(o.id) }));
    const { queues } = collectSupplierQueues({ all, used, elig: eligibility, config });
    const ownOrderIds = new Set(ownActiveOrders.filter(o => !isDirectSupplierOrder(o)).map(o => o.id));
    const allocations = new Map(used.map(a => [a.orderId, a.batchId]));
    // Region membership alone does not grant access to another member's batch.
    // Require an exact current allocation of an owned active order in its snapshot.
    const batches = allBatches.filter(b => b.state !== "released" && memberCanViewBatch(b as MemberBatch, countries)
      && (b.snapshot as MemberBatch["snapshot"]).orders.some(o => ownOrderIds.has(o.id) && allocations.get(o.id) === b.id));
    // Once assigned, the next queue is relevant only for another owned order.
    // Include unpaid new orders without claiming they are eligible/in the queue.
    const pendingCountries = new Set(ownActiveOrders
      .filter(o => ownOrderIds.has(o.id) && !allocations.has(o.id))
      .map(o => countryCode(o.shippingCountry)).filter(Boolean));
    const regions = memberRegionalProgress(config, queues, batches.length ? pendingCountries : countries, ownOrderIds);
    if (!batches.length) return { ...empty, regions };
    const ids = batches.map(b => b.id);
    const shipments = await tx.select({ batchId: gbSupplierShipmentsTable.batchId, contents: gbSupplierShipmentsTable.contents, receipt: gbSupplierShipmentsTable.receipt,
        receiptChecked: gbSupplierShipmentsTable.receiptChecked, cancelledAt: gbSupplierShipmentsTable.cancelledAt })
        .from(gbSupplierShipmentsTable).where(inArray(gbSupplierShipmentsTable.batchId, ids));
    const own = new Set(used.filter(a => ownOrderIds.has(a.orderId)).map(a => a.batchId));
    return { ...empty, regions, batches: batches.map(b => ({
      ...memberBatchSummary(b as MemberBatch, shipments as unknown as MemberShipment[], own),
      // Read current statuses, not immutable purchase-snapshot statuses. Never
      // expose another member's order codes, even inside a shared batch.
      orders: (b.snapshot as MemberBatch["snapshot"]).orders
        .filter(o => ownOrderIds.has(o.id) && allocations.get(o.id) === b.id)
        .map(o => {
          const current = ownActiveOrders.find(row => row.id === o.id)!;
          return { code: current.code, status: current.status };
        }),
    })) };
  }, { isolationLevel: "repeatable read" });
}
