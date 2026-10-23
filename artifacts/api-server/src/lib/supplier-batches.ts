import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import {
  db, groupBuysTable, ordersTable, orderLineItemsTable, groupBuyRefundsTable, auditLogsTable,
  gbSupplierSettingsTable as settings, gbSupplierBatchesTable as batches,
  gbSupplierAllocationsTable as allocations, gbSupplierEligibilityTable as eligibility,
  gbSupplierEventsTable as events, telegramMessageLogsTable,
  accountsTable, fs3CostsTable,
} from "@workspace/db";
import { supplierTxt, type TxtBlock, type SupplierContact } from "./supplier-txt";
import { getActiveWholesaleVendor } from "../routes/config";
import { COUNTRY_CODE_TO_NAME, normalizeToCode } from "./country-utils";
import { calcPackageShipping, pickRegionForCountry } from "./wholesale-shipping";
import { SupplierBatchError, validateRegions, eligibleOrder, isDirectSupplierOrder, snapshotOrder, collectSupplierQueues, propose, fingerprint, csv, type SupplierConfig, type BatchOrder } from "./supplier-batches-model";
import { canonicalUsername, type UpdateActor } from "./group-buy-updates-model";
import { lockHalfKitMoney } from "./half-kit-lock";
import { assertNoActiveRefunds } from "./refund-mutation-guard";

type Database = typeof db;
const emptyConfig: SupplierConfig = { enabled: false, telegramAlerts: false, showToMembers: false, regions: [] };
const asDate = (v: any) => v ? new Date(v).toISOString() : null;
export async function supplierAccess(tx: any, id: string, actor: UpdateActor) {
  const [group] = await tx.select().from(groupBuysTable).where(eq(groupBuysTable.id, id)).for("update");
  if (!group) throw new SupplierBatchError("Group buy not found.", 404);
  if (actor.adminGbId && actor.adminGbId !== id) throw new SupplierBatchError("This session belongs to another group buy.", 403);
  if (!actor.admin && (!group.organiserId || canonicalUsername(group.organiserId) !== canonicalUsername(actor.username))) throw new SupplierBatchError("You do not manage this group buy.", 403);
  return group;
}
async function locked<T>(id: string, actor: UpdateActor | null, fn: (tx: any, group: any) => Promise<T>, database: Database = db) {
  return database.transaction(async tx => {
    // Match every existing legacy/customer monetary mutation, BEFORE group/order row locks.
    await lockHalfKitMoney(tx, id);
    const group = actor ? await supplierAccess(tx, id, actor)
      : (await tx.select().from(groupBuysTable).where(eq(groupBuysTable.id, id)).for("update"))[0];
    if (!group) throw new SupplierBatchError("Group buy not found.", 404);
    return fn(tx, group);
  });
}
async function audit(tx: any, id: string, actor: string, action: string, detail: any) {
  await tx.insert(events).values({ id: randomUUID(), groupBuyId: id, kind: action, detail: { actor, ...detail } });
  await tx.insert(auditLogsTable).values({ type: "change", level: "info", action: `supplier_batch_${action}`,
    message: `Group-buy supplier batch ${action}`, metadata: { groupBuyId: id, actor, ...detail } });
}
async function load(tx: any, id: string) {
  const [stored] = await tx.select().from(settings).where(eq(settings.groupBuyId, id));
  const config = { ...emptyConfig, ...(stored?.config as SupplierConfig | undefined), showToMembers: (stored?.config as SupplierConfig | undefined)?.showToMembers === true };
  // Do not load labels, proof images or tracking blobs into the recurring queue worker.
  const parents = await tx.select({
    id: ordersTable.id, code: ordersTable.code, telegramUsername: ordersTable.telegramUsername,
    groupBuyId: ordersTable.groupBuyId, shippingCountry: ordersTable.shippingCountry,
    status: ordersTable.status, paymentStatus: ordersTable.paymentStatus, amountDue: ordersTable.amountDue,
    paymentConfirmedAt: ordersTable.paymentConfirmedAt, balanceConfirmedAt: ordersTable.balanceConfirmedAt,
    grandTotal: ordersTable.grandTotal, creditsApplied: ordersTable.creditsApplied,
    productSubtotal: ordersTable.productSubtotal, vendorShipping: ordersTable.vendorShipping,
    refundStatus: ordersTable.refundStatus, deletedAt: ordersTable.deletedAt,
    batchLocked: ordersTable.batchLocked, routingType: ordersTable.routingType,
    directShippingRequested: ordersTable.directShippingRequested, reshipperUsername: ordersTable.reshipperUsername,
  }).from(ordersTable).where(eq(ordersTable.groupBuyId, id)).orderBy(asc(ordersTable.id)).for("update");
  const ids = parents.map((o: any) => o.id);
  const lines = ids.length ? await tx.select().from(orderLineItemsTable).where(inArray(orderLineItemsTable.orderId, ids)).orderBy(asc(orderLineItemsTable.id)).for("update") : [];
  const refunds = ids.length ? await tx.select({ orderId: groupBuyRefundsTable.orderId }).from(groupBuyRefundsTable)
    .where(and(inArray(groupBuyRefundsTable.orderId, ids), inArray(groupBuyRefundsTable.status, ["requested", "verifying", "verification_failed", "completed"]))) : [];
  const all = parents.map((o: any) => ({ ...o, activeRefund: refunds.some((r: any) => r.orderId === o.id), lineItems: lines.filter((i: any) => i.orderId === o.id) }));
  const history = await tx.select().from(batches).where(eq(batches.groupBuyId, id)).orderBy(asc(batches.sequence));
  const used = ids.length ? await tx.select().from(allocations).where(inArray(allocations.orderId, ids)) : [];
  const elig = ids.length ? await tx.select().from(eligibility).where(inArray(eligibility.orderId, ids)) : [];
  return { stored, config, all, history, used, elig };
}
function mismatch(batch: any, order: any, currentEligibility: any) {
  const old = batch.snapshot.orders.find((o: BatchOrder) => o.id === order?.id);
  if (!order || !old) return "Order is missing or moved out of this group buy";
  const reason = eligibleOrder(order, batch.state === "ordered", !!currentEligibility?.reviewedAt);
  if (reason) return reason;
  const current = snapshotOrder(order, old.orderingAt);
  // Settling timestamps don't alter a purchased snapshot; material product/money changes do.
  return fingerprint({ ...current, paidAt: old.paidAt, orderingAt: old.orderingAt, historicalReviewed: old.historicalReviewed })
    !== fingerprint(old) ? "Products, destination, member or order amounts changed since preparation" : null;
}
async function state(tx: any, group: any, reconcile = true) {
  const id = group.id, data = await load(tx, id), now = new Date();
  const { review, queues, eligible } = collectSupplierQueues(data);
  for (const snap of eligible) {
    if (reconcile && data.config.enabled) {
      await tx.insert(eligibility).values({ orderId: snap.id, firstEligibleAt: now, orderingAt: new Date(snap.orderingAt) })
        .onConflictDoUpdate({ target: eligibility.orderId, set: { orderingAt: new Date(snap.orderingAt) } });
    }
  }
  const readiness: Record<string, any> = { ...((data.stored?.readiness ?? {}) as any) };
  const proposals = data.config.regions.map(region => {
    const p = propose(queues.get(region.id) ?? [], region.targetKits);
    const token = fingerprint({ version: data.stored?.version ?? 0, region, orders: p.orders });
    const prior = readiness[region.id];
    let readyAt = prior?.readyAt ?? null;
    // Readiness is a persisted transition, not "whenever someone opens the UI".
    if (reconcile) {
      if (data.config.enabled && p.ready) {
        if (!prior?.readyAt) {
          const thresholdPaidAt = p.orders.at(-1)?.orderingAt ?? null;
          // For a new payment/balance crossing, retain its real settlement time.
          // For an already-full queue when enabling/changing a region, record
          // detection time instead of inventing a historical region event.
          readyAt = thresholdPaidAt && data.stored?.checkedAt
            && thresholdPaidAt >= asDate(data.stored.checkedAt)! && thresholdPaidAt <= now.toISOString()
            ? thresholdPaidAt : now.toISOString();
          readiness[region.id] = { readyAt, eventId: randomUUID(), thresholdPaidAt: p.orders.at(-1)?.orderingAt ?? null };
        }
      } else { delete readiness[region.id]; readyAt = null; }
    }
    const all = propose(queues.get(region.id) ?? [], region.targetKits, true);
    return { ...p, region, token, readyAt, allQueued: {
      ...all, region, readyAt,
      token: fingerprint({ version: data.stored?.version ?? 0, region, orders: all.orders, includeAll: true }),
    } };
  });
  if (reconcile && data.stored) {
    for (const p of proposals) {
      const ready = readiness[p.region.id];
      if (!ready?.eventId) continue;
      const text = `${group.name}: ${p.region.name} supplier batch ready — ${p.kits} kits / target ${p.region.targetKits}. Review and prepare the batch in your organiser dashboard. No supplier order has been placed.`;
      const inserted = await tx.insert(events).values({
        id: ready.eventId, groupBuyId: id, kind: "ready",
        detail: { region: p.region.name, kits: p.kits, target: p.region.targetKits, readyAt: ready.readyAt, thresholdPaidAt: ready.thresholdPaidAt, text },
        recipient: group.organiserId, telegram: data.config.telegramAlerts && group.organiserId ? "pending" : "disabled",
      }).onConflictDoNothing().returning({ id: events.id });
      if (inserted.length && group.organiserId) {
        // Website feed insertion is in the same transaction and deduped by the durable event.
        await tx.insert(telegramMessageLogsTable).values({
          recipientType: "user", recipientUsername: canonicalUsername(group.organiserId),
          recipientChatId: "", eventKey: `supplier-ready:${ready.eventId}`, messageText: text,
          delivered: false, errorMessage: "Website readiness alert; private Telegram delivery is tracked separately.",
        });
      }
    }
    await tx.update(settings).set({ readiness, checkedAt: now }).where(eq(settings.groupBuyId, id));
  }
  const history = data.history.map((b: any) => ({
    ...b, exceptions: b.state === "released" ? [] : b.snapshot.orders.flatMap((old: BatchOrder) => {
      const reason = mismatch(b, data.all.find((o: any) => o.id === old.id), data.elig.find((e: any) => e.orderId === old.id));
      return reason ? [{ orderId: old.id, code: old.code, reason }] : [];
    }),
  }));
  const eventRows = await tx.select().from(events).where(eq(events.groupBuyId, id)).orderBy(sql`${events.createdAt} desc`).limit(100);
  return { groupBuy: { id, name: group.name }, config: data.config, version: data.stored?.version ?? 0,
    checkedAt: reconcile && data.stored ? now.toISOString() : asDate(data.stored?.checkedAt),
    proposals, batches: history.reverse(), review, events: eventRows };
}
export async function supplierData(id: string, actor: UpdateActor, database = db) {
  return locked(id, actor, (tx, group) => state(tx, group), database);
}
export async function saveSupplierConfig(id: string, actor: UpdateActor, body: any, database = db) {
  if (typeof body?.config?.enabled !== "boolean" || typeof body?.config?.telegramAlerts !== "boolean" || !Number.isInteger(body?.expectedVersion)) throw new SupplierBatchError("Invalid supplier settings.", 400);
  if (body.config.showToMembers !== undefined && typeof body.config.showToMembers !== "boolean") throw new SupplierBatchError("Invalid member visibility setting.", 400);
  const config: SupplierConfig = { enabled: body.config.enabled, telegramAlerts: body.config.telegramAlerts, regions: validateRegions(body.config.regions) };
  if (config.enabled && !config.regions.length) throw new SupplierBatchError("Add a region before enabling supplier batches.", 400);
  return locked(id, actor, async (tx, group) => {
    const [old] = await tx.select().from(settings).where(eq(settings.groupBuyId, id));
    if ((old?.version ?? 0) !== body.expectedVersion) throw new SupplierBatchError("Settings changed in another session. Reload and review your changes.");
    config.showToMembers = body.config.showToMembers ?? ((old?.config as SupplierConfig | undefined)?.showToMembers === true);
    await tx.insert(settings).values({ groupBuyId: id, config, version: body.expectedVersion + 1 })
      .onConflictDoUpdate({ target: settings.groupBuyId, set: { config, version: body.expectedVersion + 1 } });
    await audit(tx, id, actor.username, "settings", { config });
    return state(tx, group);
  }, database);
}
export async function confirmSupplierBatch(id: string, actor: UpdateActor, body: any, database = db) {
  if (typeof body?.regionId !== "string" || typeof body?.token !== "string") throw new SupplierBatchError("Select a displayed batch preview.", 400);
  if (body.includeAll !== undefined && typeof body.includeAll !== "boolean") throw new SupplierBatchError("Choose target-sized or all queued orders.", 400);
  return locked(id, actor, async (tx, group) => {
    const [existing] = await tx.select().from(batches).where(and(eq(batches.groupBuyId, id), eq(batches.previewToken, body.token)));
    // Only replay a still-active exact preparation; released proposals must be refreshed.
    if (existing && existing.state !== "released") return state(tx, group);
    const current = await state(tx, group);
    if (!current.config.enabled) throw new SupplierBatchError("Supplier batching is disabled.");
    const regionProposal = current.proposals.find(p => p.region.id === body.regionId);
    if (!regionProposal) throw new SupplierBatchError("This preview changed or is no longer ready. Reload and review the latest orders before confirming.");
    const { allQueued, ...targetProposal } = regionProposal;
    const p = body.includeAll === true ? allQueued : targetProposal;
    if (!p || !p.ready || p.token !== body.token || existing) throw new SupplierBatchError("This preview changed or is no longer ready. Reload and review the latest orders before confirming.");
    await assertNoActiveRefunds(tx, p.orders.map(o => o.id));
    const sequence = Math.max(0, ...current.batches.map((b: any) => b.sequence)) + 1;
    const batchId = randomUUID(), reference = `GB-${id.slice(0, 8)} / ${String(sequence).padStart(3, "0")}`;
    await tx.insert(batches).values({ id: batchId, groupBuyId: id, sequence, reference, previewToken: p.token, snapshot: p, createdBy: actor.username });
    await tx.insert(allocations).values(p.orders.map(o => ({ orderId: o.id, batchId })));
    await audit(tx, id, actor.username, "prepared", { batchId, reference, orderIds: p.orders.map(o => o.id), kits: p.kits });
    return state(tx, group);
  }, database);
}
export async function appendSupplierBatch(id: string, batchId: string, actor: UpdateActor, body: any, database = db) {
  if (typeof body?.regionId !== "string" || typeof body?.token !== "string"
    || typeof body?.expectedBatchToken !== "string"
    || (body.includeAll !== undefined && typeof body.includeAll !== "boolean"))
    throw new SupplierBatchError("Select a displayed preview and an existing prepared batch.", 400);
  const requestKey = fingerprint({ batchId, regionId: body.regionId, token: body.token,
    expectedBatchToken: body.expectedBatchToken, includeAll: body.includeAll === true });
  return locked(id, actor, async (tx, group) => {
    // Durable replay protection survives later additions, placement and page reloads.
    const [replay] = await tx.select({ id: events.id }).from(events).where(and(
      eq(events.groupBuyId, id), eq(events.kind, "appended"),
      sql`${events.detail}->>'requestKey' = ${requestKey}`,
    ));
    if (replay) return state(tx, group);
    const current = await state(tx, group);
    if (!current.config.enabled) throw new SupplierBatchError("Supplier batching is disabled.");
    const batch = current.batches.find((b: any) => b.id === batchId);
    if (!batch) throw new SupplierBatchError("Batch not found.", 404);
    if (batch.state !== "prepared") throw new SupplierBatchError("Orders can only be added to a prepared batch, before supplier placement.");
    if (batch.exceptions.length) throw new SupplierBatchError("Resolve the existing batch's order/payment exceptions before adding orders.");
    if (batch.snapshot.token !== body.expectedBatchToken) throw new SupplierBatchError("The existing batch changed. Reload and review its latest totals before adding orders.");
    const regionProposal = current.proposals.find(p => p.region.id === body.regionId);
    if (!regionProposal) throw new SupplierBatchError("This region preview changed. Reload and review the latest orders.");
    const { allQueued, ...targetProposal } = regionProposal;
    const p = body.includeAll === true ? allQueued : targetProposal;
    if (p.token !== body.token || !p.orders.length) throw new SupplierBatchError("This preview changed. Reload and review the latest orders before adding them.");
    if (batch.snapshot.region.id !== p.region.id
      || fingerprint([...batch.snapshot.region.countries].sort()) !== fingerprint([...p.region.countries].sort()))
      throw new SupplierBatchError("Choose a prepared batch for the same region and countries.");
    await assertNoActiveRefunds(tx, p.orders.map(o => o.id));
    const combined = propose([...batch.snapshot.orders, ...p.orders], batch.snapshot.region.targetKits, true);
    const snapshot = { ...batch.snapshot, ...combined, queuedKits: combined.kits, remainingKits: 0,
      token: fingerprint({ previous: batch.snapshot.token, requestKey, orders: combined.orders }) };
    const updated = await tx.update(batches).set({ snapshot }).where(and(
      eq(batches.id, batchId), eq(batches.groupBuyId, id), eq(batches.state, "prepared"),
      sql`${batches.snapshot}->>'token' = ${body.expectedBatchToken}`,
    )).returning({ id: batches.id });
    if (!updated.length) throw new SupplierBatchError("The existing batch changed. Reload and review it before retrying.");
    await tx.insert(allocations).values(p.orders.map(o => ({ orderId: o.id, batchId })));
    await audit(tx, id, actor.username, "appended", {
      requestKey, batchId, reference: batch.reference, orderIds: p.orders.map(o => o.id),
      addedKits: p.kits, totalKits: snapshot.kits,
    });
    return state(tx, group);
  }, database);
}
export async function orderSupplierBatch(id: string, batchId: string, actor: UpdateActor, body: any, database = db) {
  if (body?.confirm !== true) throw new SupplierBatchError("Confirm supplier placement and processing of this batch.", 400);
  return locked(id, actor, async (tx, group) => {
    if (!actor.admin && !group.organiserCanEditStatus) throw new SupplierBatchError("Order-status changes are disabled for this organiser. Ask Admin to mark the batch ordered.", 403);
    const current = await state(tx, group);
    const batch = current.batches.find((b: any) => b.id === batchId);
    if (!batch) throw new SupplierBatchError("Batch not found.", 404);
    if (batch.state === "ordered") return current;
    if (batch.state !== "prepared") throw new SupplierBatchError("Released batches cannot be ordered.");
    if (batch.exceptions.length) throw new SupplierBatchError("Batch has order/payment exceptions. Resolve them or explicitly release this unsent batch.");
    const ids = batch.snapshot.orders.map((o: BatchOrder) => o.id);
    await assertNoActiveRefunds(tx, ids);
    const actual = await tx.select().from(allocations).where(eq(allocations.batchId, batchId));
    if (fingerprint(actual.map((a: any) => a.orderId).sort()) !== fingerprint([...ids].sort())) throw new SupplierBatchError("Batch allocation mismatch. Contact Admin for review.");
    const changed = await tx.update(ordersTable).set({ status: "Processing", updatedAt: new Date() })
      .where(and(inArray(ordersTable.id, ids), eq(ordersTable.status, "Submitted"), eq(ordersTable.paymentStatus, "confirmed"), isNull(ordersTable.deletedAt),
        sql`coalesce(${ordersTable.amountDue},0) <= 0`)).returning({ id: ordersTable.id });
    if (changed.length !== ids.length) throw new SupplierBatchError("An order changed while this batch was being processed. Reload and review.");
    await tx.update(batches).set({ state: "ordered", orderedAt: new Date(), orderedBy: actor.username }).where(eq(batches.id, batchId));
    await audit(tx, id, actor.username, "ordered", { batchId, reference: batch.reference, processedOrderIds: changed.map((o: any) => o.id) });
    return state(tx, group);
  }, database);
}
export async function releaseSupplierBatch(id: string, batchId: string, actor: UpdateActor, body: any, database = db) {
  if (body?.confirm !== true || typeof body?.reason !== "string" || !body.reason.trim() || body.reason.length > 1000) throw new SupplierBatchError("Confirm release and provide a reason (up to 1000 characters).", 400);
  return locked(id, actor, async (tx, group) => {
    const [batch] = await tx.select().from(batches).where(and(eq(batches.id, batchId), eq(batches.groupBuyId, id)));
    if (!batch) throw new SupplierBatchError("Batch not found.", 404);
    if (batch.state === "released") return state(tx, group);
    if (batch.state !== "prepared") throw new SupplierBatchError("This batch was ordered from the supplier. It cannot be released or requeued.");
    await tx.delete(allocations).where(eq(allocations.batchId, batchId));
    await tx.update(batches).set({ state: "released", releasedAt: new Date(), releaseReason: body.reason.trim() }).where(eq(batches.id, batchId));
    // Change config generation so re-preparing the same orders gets a fresh token.
    await tx.update(settings).set({ version: sql`${settings.version} + 1` }).where(eq(settings.groupBuyId, id));
    await audit(tx, id, actor.username, "released", { batchId, reason: body.reason.trim() });
    return state(tx, group);
  }, database);
}
export async function reviewHistoricalSupplierOrder(id: string, orderId: string, actor: UpdateActor, body: any, database = db) {
  if (body?.confirm !== true) throw new SupplierBatchError("Confirm review of the existing full payment. This does not verify or change a payment.", 400);
  return locked(id, actor, async (tx, group) => {
    const current = await state(tx, group);
    if (!current.review.some(r => r.id === orderId && r.canReviewHistorical)) throw new SupplierBatchError("This order does not qualify for historical payment-date review.");
    await tx.insert(eligibility).values({ orderId, reviewedAt: new Date(), reviewedBy: actor.username })
      .onConflictDoUpdate({ target: eligibility.orderId, set: { reviewedAt: new Date(), reviewedBy: actor.username } });
    await audit(tx, id, actor.username, "historical_review", { orderId, orderingRule: "Review time; original payment date unknown" });
    return state(tx, group);
  }, database);
}
export async function exportSupplierBatch(id: string, batchId: string, actor: UpdateActor, database = db) {
  return locked(id, actor, async (tx, group) => {
    const current = await state(tx, group);
    const b = current.batches.find((v: any) => v.id === batchId);
    if (!b) throw new SupplierBatchError("Batch not found.", 404);
    if (b.state === "released" || b.exceptions.length) throw new SupplierBatchError("Export blocked: this batch is released or has unresolved order/payment exceptions.");
    await audit(tx, id, actor.username, "exported", { batchId });
    return { reference: b.reference, csv: csv([
      ["Batch", "Region", "Country", "Order", "Member", "Product ID", "Product", "Kits"],
      ...b.snapshot.orders.flatMap((o: BatchOrder) => o.items.map(i => [b.reference, b.snapshot.region.name, o.country, o.code, o.username, i.productId, i.productName, i.quantity])),
      [], ["Supplier product totals", "", "", "", "", "Product ID", "Product", "Kits"],
      ...b.snapshot.products.map((p: any) => ["", "", "", "", "", p.productId, p.productName, p.quantity]),
    ]) };
  }, database);
}
function exportableDirect(o: any) {
  return isDirectSupplierOrder(o) && o.directShippingRequested === true && !o.deletedAt && !o.batchLocked
    && ["Submitted", "Processing", "Shipped", "Completed"].includes(o.status)
    && o.paymentStatus === "confirmed" && Number(o.amountDue ?? 0) === 0 && !o.activeRefund
    && (!o.refundStatus || ["none", "rejected", "cancelled", "canceled"].includes(o.refundStatus));
}
/** Supplier costs and delivery contacts are Admin-only; never expose them to member summaries. */
export async function supplierDirectOrders(id: string, actor: UpdateActor, database = db) {
  if (!actor.admin) throw new SupplierBatchError("Supplier TXT downloads require Admin access.", 403);
  return locked(id, actor, async tx => {
    const data = await load(tx, id);
    return { orders: data.all.filter(exportableDirect).map((o: any) => ({
      id: o.id, code: o.code, username: o.telegramUsername, country: o.shippingCountry,
      kits: o.lineItems.filter((i: any) => !i.isOos).reduce((s: number, i: any) => s + Number(i.quantity), 0),
    })) };
  }, database);
}
export async function exportSupplierTxt(id: string, actor: UpdateActor, input: { batchId?: string; orderIds?: unknown }, database = db) {
  if (!actor.admin) throw new SupplierBatchError("Supplier TXT downloads require Admin access.", 403);
  return locked(id, actor, async (tx, group) => {
    const data = await load(tx, id);
    const costs = await tx.select({ productName: fs3CostsTable.productName, unitCost: fs3CostsTable.unitCost }).from(fs3CostsTable);
    const blocks: TxtBlock[] = [];
    const packageLimit = Number(group.vendorShippingMaxKitsPerPackage) > 0 ? Number(group.vendorShippingMaxKitsPerPackage) : 25;
    if (input.batchId) {
      const current = await state(tx, group);
      const b = current.batches.find((v: any) => v.id === input.batchId);
      if (!b) throw new SupplierBatchError("Batch not found.", 404);
      if (b.state === "released" || b.exceptions.length) throw new SupplierBatchError("Resolve batch exceptions before downloading.");
      const grouped = new Map<string, BatchOrder[]>();
      for (const o of b.snapshot.orders as BatchOrder[]) {
        const live = data.all.find((v: any) => v.id === o.id);
        const recipient = canonicalUsername(live?.reshipperUsername ?? "");
        if (!recipient || isDirectSupplierOrder(live)) throw new SupplierBatchError(`Assign order ${o.code} to a reshipper before downloading.`, 400);
        grouped.set(recipient, [...(grouped.get(recipient) ?? []), o]);
      }
      for (const [recipient, orders] of grouped) {
        const [account] = await tx.select({ settings: accountsTable.reshipperSettings }).from(accountsTable)
          .where(eq(sql`lower(ltrim(${accountsTable.telegramUsername}, '@'))`, recipient));
        const kits = orders.reduce((s, o) => s + o.kits, 0);
        blocks.push({ title: `Batch ${b.reference} — ${b.snapshot.region.name}`, recipient: `@${recipient}`,
          contact: account?.settings?.supplierDelivery as SupplierContact, orders,
          packagePrices: Array.from({ length: Math.ceil(kits / packageLimit) }, () => 70),
          packageNote: "FS3 reshipper rate: $70 per supplier package; excludes member onward postage",
        });
      }
    } else {
      if (!Array.isArray(input.orderIds) || !input.orderIds.length || input.orderIds.length > 500
        || input.orderIds.some(v => typeof v !== "string") || new Set(input.orderIds).size !== input.orderIds.length)
        throw new SupplierBatchError("Select between 1 and 500 distinct direct orders.", 400);
      const orders = input.orderIds.map(orderId => data.all.find((o: any) => o.id === orderId));
      if (orders.some(o => !o || !exportableDirect(o))) throw new SupplierBatchError("One or more selected orders are no longer eligible direct orders. Refresh and select again.");
      const vendor = await getActiveWholesaleVendor();
      for (const o of orders) {
        const [address] = await tx.select({
          name: ordersTable.shippingName, address: ordersTable.shippingAddress, city: ordersTable.shippingCity,
          postcode: ordersTable.shippingPostcode, country: ordersTable.shippingCountry,
          email: ordersTable.shippingEmail, phone: ordersTable.shippingPhone,
        }).from(ordersTable).where(eq(ordersTable.id, o.id));
        const snap = snapshotOrder(o);
        const country = normalizeToCode(address.country ?? "");
        const region = vendor && (pickRegionForCountry(vendor, COUNTRY_CODE_TO_NAME[country]) ?? pickRegionForCountry(vendor, country));
        const max = vendor && Number(vendor.maxKitsPerPackage) > 0 ? Number(vendor.maxKitsPerPackage) : packageLimit;
        const prices: number[] = []; let remaining = snap.kits, fallback = false;
        while (remaining > 0) {
          const qty = Math.min(remaining, max);
          const price = vendor && region ? calcPackageShipping(vendor, region.region, qty) : null;
          if (price === null) fallback = true;
          prices.push(price ?? 70); remaining -= qty;
        }
        blocks.push({ title: `Order no. ${o.code} (${o.telegramUsername}) — Direct`, recipient: o.telegramUsername,
          contact: { ...address, name: address.name ?? "", address: [address.address, address.city, address.postcode].filter(Boolean).join("\n"),
            country, email: address.email ?? "", phone: address.phone ?? "" },
          orders: [snap], packagePrices: prices,
          packageNote: fallback ? "FS3 fallback: $70 per package (no calculable vendor region)" : "Active wholesale vendor regional tiers",
        });
      }
    }
    const text = supplierTxt(blocks, costs);
    await audit(tx, id, actor.username, "txt_exported", { batchId: input.batchId ?? null, orderIds: blocks.flatMap(b => b.orders.map(o => o.id)) });
    return text;
  }, database);
}
/** Used by HTTP/background reconciliation. Network delivery is a separate worker. */
export async function reconcileSupplierGroup(id: string, database = db) {
  return locked(id, null, (tx, group) => state(tx, group), database);
}
