import { randomUUID } from "node:crypto";
import { and, eq, desc, inArray, isNull, sql } from "drizzle-orm";
import { db, groupBuysTable as groups, productsTable as products, groupBuyProductsTable as links,
  ordersTable as orders, orderLineItemsTable as lines, groupBuyOrderRevisionSettingsTable as settings,
  groupBuyOrderRevisionsTable as revisions, gbHalfKitClaimsTable as claims,
  gbSupplierAllocationsTable as allocations } from "@workspace/db";
import { lockHalfKitMoney } from "./half-kit-lock";
import { lockGroupStock } from "./group-buy-stock";
import { assertNoActiveRefund, refundMutableOrderWhere } from "./refund-mutation-guard";
import { revisionEligibility, revisionItems, revisionSnapshot, planRevision, RevisionError } from "./group-buy-order-revisions-rules";
import { resolveGroupBuyAdminFee } from "./group-buy-admin-fee";

type Database = Pick<typeof db, "select" | "transaction">;
export type RevisionActor = { username: string; admin?: boolean; adminGbId?: string | null };
const canonical = (s: string) => s.replace(/^@/, "").toLowerCase();
async function groupFor(database: any, id: string, actor?: RevisionActor) {
  const [group] = await database.select().from(groups).where(eq(groups.id, id));
  if (!group || (actor && !(actor.admin && (!actor.adminGbId || actor.adminGbId === id))
    && group.organiserId !== actor.username)) throw new RevisionError("Group buy not found.", 404);
  return group;
}
async function ownProducts(database: any, group: any) {
  if (!group.organiserId) return [];
  return database.select({ id: products.id, name: products.name }).from(links)
    .innerJoin(products, eq(links.productId, products.id))
    .where(and(eq(links.groupBuyId, group.id), eq(products.organiserId, group.organiserId)));
}
async function enabled(database: any, id: string) {
  const [row] = await database.select().from(settings).where(eq(settings.groupBuyId, id));
  return row?.enabled === true;
}
async function locked(database: Database, id: string, action: (tx: any) => Promise<any>) {
  return database.transaction(async tx => {
    // Same acquisition order as ordinary member edits, batch preparation and organiser writes.
    await lockHalfKitMoney(tx, id);
    await lockGroupStock(tx, id);
    return action(tx);
  });
}
async function orderFor(database: any, id: string, username?: string, forUpdate = false) {
  let query = database.select().from(orders).where(and(eq(orders.id, id), isNull(orders.deletedAt)));
  if (forUpdate) query = query.for("update");
  const [order] = await query;
  if (!order?.groupBuyId || (username && canonical(order.telegramUsername) !== canonical(username)))
    throw new RevisionError("Order not found.", 404);
  return order;
}
async function protectionReason(database: any, order: any) {
  const reason = revisionEligibility(order);
  if (reason) return reason;
  const [batch] = await database.select({ id: allocations.orderId }).from(allocations).where(eq(allocations.orderId, order.id)).limit(1);
  if (batch) return "Release this order from its supplier batch before requesting changes.";
  const [claim] = await database.select({ id: claims.id }).from(claims)
    .where(and(eq(claims.orderId, order.id), eq(claims.state, "active"))).limit(1);
  if (claim) return "Orders with claimed half kits use their existing protected edit process.";
  return null;
}
function publicRevision(row: any, order: any, group: any) {
  return { id: row.id, orderId: row.orderId, orderCode: order.code, member: order.telegramUsername,
    currency: group.currency, status: row.status, message: row.message, createdAt: row.createdAt,
    decidedAt: row.decidedAt, before: { ...row.before, grandTotal: Number(row.before.grandTotal) },
    proposal: { ...row.proposal, grandTotal: Number(row.proposal.grandTotal) } };
}
export async function organiserRevisionList(id: string, actor: RevisionActor, database: Database = db) {
  const group = await groupFor(database, id, actor);
  const owned = await ownProducts(database, group);
  if (!owned.length) return { enabled: false, eligible: false, products: [], orders: [], requests: [] };
  const orderRows = await database.select().from(orders).where(and(eq(orders.groupBuyId, id), isNull(orders.deletedAt)));
  const ids = orderRows.map(o => o.id);
  const allLines = ids.length ? await database.select().from(lines).where(inArray(lines.orderId, ids)) : [];
  // Batched reads keep this screen inexpensive even for a large group.
  const batchRows = ids.length ? await database.select({ id: allocations.orderId }).from(allocations).where(inArray(allocations.orderId, ids)) : [];
  const claimRows = ids.length ? await database.select({ id: claims.orderId }).from(claims).where(and(inArray(claims.orderId, ids), eq(claims.state, "active"))) : [];
  const batched = new Set(batchRows.map(r => r.id)), claimed = new Set(claimRows.map(r => r.id));
  const records = await database.select().from(revisions).where(eq(revisions.groupBuyId, id)).orderBy(desc(revisions.createdAt));
  const byId = new Map(orderRows.map(o => [o.id, o]));
  return { enabled: await enabled(database, id), eligible: true, products: owned,
    orders: orderRows.filter(o => !["Cancelled", "Completed", "Shipped"].includes(o.status)).map(o => {
      const reason = revisionEligibility(o)
        ?? (batched.has(o.id) ? "Order belongs to a supplier batch." : null)
        ?? (claimed.has(o.id) ? "Order contains claimed half kits." : null);
      const items = allLines.filter(l => l.orderId === o.id);
      const ownsAny = items.some(l => owned.some((p: any) => p.id === l.productId));
      return { id: o.id, code: o.code, telegramUsername: o.telegramUsername, currency: group.currency,
        grandTotal: Number(o.grandTotal), eligible: !reason && ownsAny,
        adminFee: Number(o.adminFee),
        adminFeePercent: Number(o.adminFee) > 0 && !o.directShippingRequested && group.adminFeeType === "percent"
          ? resolveGroupBuyAdminFee({ enabled: group.adminFeeEnabled, feeType: group.adminFeeType,
            baseAmount: group.adminFeeAmount, label: group.adminFeeLabel, countryOverrides: group.adminFeeCountries,
            shippingCountry: o.shippingCountry, productSubtotal: 100 }).amount : null,
        ineligibleReason: reason ?? (ownsAny ? null : "No organiser-owned products in this order."),
        items: revisionItems(items) };
    }),
    requests: records.filter(r => byId.has(r.orderId)).map(r => publicRevision(r, byId.get(r.orderId), group)) };
}
export async function setRevisionEnabled(id: string, actor: RevisionActor, value: unknown, database: Database = db) {
  if (typeof value !== "boolean") throw new RevisionError("Enabled must be true or false.");
  return locked(database, id, async tx => {
    const group = await groupFor(tx, id, actor);
    if (value && !(await ownProducts(tx, group)).length) throw new RevisionError("This option is only available for organiser-added stock.", 403);
    await tx.insert(settings).values({ groupBuyId: id, enabled: value }).onConflictDoUpdate({
      target: settings.groupBuyId, set: { enabled: value, updatedAt: new Date() },
    });
    return { enabled: value };
  });
}
export async function createOrderRevisions(id: string, actor: RevisionActor, input: any, database: Database = db) {
  if (typeof input?.message !== "string" || !input.message.trim() || input.message.trim().length > 2000)
    throw new RevisionError("Add a message explaining the changes, up to 2000 characters.");
  if (!Array.isArray(input.changes) || !input.changes.length || input.changes.length > 500)
    throw new RevisionError("Choose between 1 and 500 orders per request.");
  const ids = input.changes.map((c: any) => c?.orderId);
  if (ids.some((v: any) => typeof v !== "string") || new Set(ids).size !== ids.length)
    throw new RevisionError("Choose each order once.");
  return locked(database, id, async tx => {
    const group = await groupFor(tx, id, actor);
    if (!await enabled(tx, id)) throw new RevisionError("Enable member-confirmed revisions for this group buy first.", 409);
    const owned = new Set<string>((await ownProducts(tx, group)).map((p: any) => p.id));
    if (!owned.size) throw new RevisionError("This option is only available for organiser-added stock.", 403);
    const created: Array<{ id: string; orderId: string; username: string; code: string }> = [];
    // All selected proposals validate and persist atomically. A bad selection never partially sends.
    for (const change of [...input.changes].sort((a: any, b: any) => a.orderId.localeCompare(b.orderId))) {
      const order = await orderFor(tx, change.orderId, undefined, true);
      if (order.groupBuyId !== id) throw new RevisionError("An order is not in this group buy.", 403);
      const reason = await protectionReason(tx, order);
      if (reason) throw new RevisionError(`Order ${order.code}: ${reason}`, 409);
      await assertNoActiveRefund(tx, order.id);
      const current = await tx.select().from(lines).where(eq(lines.orderId, order.id)).for("update");
      const proposal = planRevision(order, current, change.items, owned, group);
      const before = { items: revisionItems(current), grandTotal: order.grandTotal,
        productSubtotal: order.productSubtotal, adminFee: order.adminFee };
      if (!proposal.items.some(item => {
        const old = before.items.find(l => l.id === item.id)!;
        return old.quantity !== item.quantity || old.unitPrice !== item.unitPrice;
      })) throw new RevisionError(`Order ${order.code} has no changes.`);
      await tx.update(revisions).set({ status: "withdrawn", decidedAt: new Date() })
        .where(and(eq(revisions.orderId, order.id), eq(revisions.status, "pending")));
      const revisionId = randomUUID();
      await tx.insert(revisions).values({ id: revisionId, groupBuyId: id, orderId: order.id,
        createdBy: actor.username, message: input.message.trim(), snapshotHash: revisionSnapshot(order, current, group),
        before, proposal });
      created.push({ id: revisionId, orderId: order.id, username: order.telegramUsername, code: order.code });
    }
    return { created: created.length, notifications: created };
  });
}
export async function withdrawOrderRevision(id: string, revisionId: string, actor: RevisionActor, database: Database = db) {
  return locked(database, id, async tx => {
    await groupFor(tx, id, actor);
    const [row] = await tx.select().from(revisions).where(and(eq(revisions.id, revisionId), eq(revisions.groupBuyId, id))).for("update");
    if (!row) throw new RevisionError("Change request not found.", 404);
    if (row.status === "withdrawn") return { status: "withdrawn" };
    if (row.status !== "pending") throw new RevisionError("This request has already been answered.", 409);
    await tx.update(revisions).set({ status: "withdrawn", decidedAt: new Date() }).where(eq(revisions.id, row.id));
    return { status: "withdrawn" };
  });
}
export async function memberOrderRevisions(orderId: string, username: string, database: Database = db) {
  const order = await orderFor(database, orderId, username);
  const group = await groupFor(database, order.groupBuyId);
  const current = await database.select().from(lines).where(eq(lines.orderId, orderId));
  const reason = await protectionReason(database, order);
  const records = await database.select().from(revisions).where(eq(revisions.orderId, orderId)).orderBy(desc(revisions.createdAt));
  const snapshot = revisionSnapshot(order, current, group);
  return { enabled: await enabled(database, group.id),
    requests: records.map(row => ({ ...publicRevision(row, order, group),
      eligible: !reason && row.snapshotHash === snapshot,
      ineligibleReason: reason ?? (row.snapshotHash !== snapshot ? "Your order changed after this proposal. Ask the organiser for a fresh request." : null),
    })) };
}
export async function memberPendingRevisions(username: string, database: Database = db) {
  const rows = await database.select({ orderId: orders.id }).from(revisions)
    .innerJoin(orders, eq(revisions.orderId, orders.id))
    .innerJoin(settings, eq(settings.groupBuyId, orders.groupBuyId))
    .where(and(eq(revisions.status, "pending"), eq(settings.enabled, true), isNull(orders.deletedAt),
      eq(orders.paymentStatus, "unpaid"),
      sql`lower(regexp_replace(${orders.telegramUsername}, '^@', '')) = ${canonical(username)}`));
  return { orderIds: [...new Set(rows.map(r => r.orderId))] };
}
export async function decideOrderRevision(orderId: string, revisionId: string, username: string,
  decision: unknown, database: Database = db) {
  if (decision !== "accepted" && decision !== "declined") throw new RevisionError("Choose accept or decline.");
  const hint = await orderFor(database, orderId, username);
  return locked(database, hint.groupBuyId, async tx => {
    const order = await orderFor(tx, orderId, username, true);
    if (order.groupBuyId !== hint.groupBuyId) throw new RevisionError("Order changed. Reload before continuing.", 409);
    const group = await groupFor(tx, order.groupBuyId);
    const [row] = await tx.select().from(revisions).where(and(eq(revisions.id, revisionId),
      eq(revisions.orderId, order.id), eq(revisions.groupBuyId, group.id))).for("update");
    if (!row) throw new RevisionError("Change request not found.", 404);
    if (row.status === decision) return { status: decision };
    if (row.status !== "pending") throw new RevisionError("This request has already been answered or replaced.", 409);
    if (decision === "declined") {
      await tx.update(revisions).set({ status: "declined", decidedAt: new Date() }).where(eq(revisions.id, row.id));
      return { status: "declined" };
    }
    if (!await enabled(tx, group.id)) throw new RevisionError("The organiser has paused change requests. Your order is unchanged.", 409);
    const reason = await protectionReason(tx, order);
    if (reason) throw new RevisionError(reason, 409);
    await assertNoActiveRefund(tx, order.id);
    const current = await tx.select().from(lines).where(eq(lines.orderId, order.id)).for("update");
    if (revisionSnapshot(order, current, group) !== row.snapshotHash) {
      await tx.update(revisions).set({ status: "stale", decidedAt: new Date() }).where(eq(revisions.id, row.id));
      return { status: "stale", error: "Your order changed after this proposal. Ask the organiser for a fresh request." };
    }
    const owned = new Set<string>((await ownProducts(tx, group)).map((p: any) => p.id));
    const plan = planRevision(order, current, row.proposal.items, owned, group);
    if (plan.grandTotal !== row.proposal.grandTotal || plan.productSubtotal !== row.proposal.productSubtotal
      || plan.adminFee !== row.proposal.adminFee) throw new RevisionError("The proposed totals are no longer current. Request a new proposal.", 409);
    for (const item of plan.items) {
      await tx.update(lines).set({ quantity: String(item.quantity), unitPrice: item.unitPrice.toFixed(2),
        lineTotal: item.lineTotal.toFixed(2), isOos: item.quantity === 0 })
        .where(refundMutableOrderWhere(eq(lines.id, item.id), lines.orderId));
    }
    const [saved] = await tx.update(orders).set({ productSubtotal: plan.productSubtotal,
      grandTotal: plan.grandTotal, adminFee: plan.adminFee, updatedAt: new Date(),
      paymentUsdAmount: null, paymentCryptoRate: null, paymentCryptoCurrency: null, paymentCryptoNetwork: null })
      .where(refundMutableOrderWhere(and(eq(orders.id, order.id), eq(orders.paymentStatus, "unpaid")))).returning({ id: orders.id });
    if (!saved) throw new RevisionError("Order payment changed. Your order was not revised.", 409);
    await tx.update(revisions).set({ status: "accepted", decidedAt: new Date() }).where(eq(revisions.id, row.id));
    return { status: "accepted" };
  });
}
