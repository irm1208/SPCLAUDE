import { db, accountsTable, gbReshippersTable, groupBuysTable, ordersTable, siteConfigTable } from "@workspace/db";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  applyPayout, buildPayoutView, emptyPayoutLedger, parsePayoutLedger, payoutLedgerKey, payoutReferenceKey,
  PayoutError, reversePayout, reviewEntitlements, type FeeOrder, type PayoutLedger,
} from "./reshipper-payout-rules";

type Executor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];
const PREFIX = "reshipper_payouts:v1:";
const orderOwnerKey = (id: string) => `reshipper_payout_order_owner:v1:${id}`;

async function accountIdentity(executor: Executor, username: string) {
  const columns = { id: accountsTable.reshipperPayoutId, username: accountsTable.telegramUsername };
  let [account] = await executor.select(columns).from(accountsTable).where(eq(accountsTable.telegramUsername, username));
  if (!account) throw new PayoutError("Reshipper account not found.", 404);
  if (!account.id) {
    await executor.update(accountsTable).set({ reshipperPayoutId: randomUUID() })
      .where(and(eq(accountsTable.telegramUsername, username), isNull(accountsTable.reshipperPayoutId)));
    [account] = await executor.select(columns).from(accountsTable).where(eq(accountsTable.telegramUsername, username));
  }
  if (!account?.id) throw new PayoutError("Reshipper identity changed. Refresh before continuing.", 409);
  return { id: account.id, username: account.username };
}
async function context(executor: Executor, username: string, gbId: string, lock = false, orderIds: string[] = []) {
  const account = await accountIdentity(executor, username);
  const groupQuery = executor.select({ id: groupBuysTable.id, name: groupBuysTable.name, currency: groupBuysTable.currency })
    .from(groupBuysTable).where(eq(groupBuysTable.id, gbId));
  const [group] = await (lock ? groupQuery.for("share") : groupQuery);
  if (!group) throw new PayoutError("Group buy not found.", 404);
  const assignments = await executor.select({ country: gbReshippersTable.country, paymentDetails: gbReshippersTable.reshipperPaymentDetails })
    .from(gbReshippersTable).where(and(eq(gbReshippersTable.gbId, gbId), eq(gbReshippersTable.reshipperUsername, username)));
  const key = payoutLedgerKey(gbId);
  const [stored] = await executor.select().from(siteConfigTable).where(eq(siteConfigTable.key, key));
  let ledger = parsePayoutLedger(stored ? stored.value ?? "null" : undefined);
  const history = ledger.payouts.some(p => p.accountId === account.id) || Object.values(ledger.entitlements).some(e => e.accountId === account.id);
  if (!assignments.length && !history) throw new PayoutError("This reshipper has no assignment or payout history in this group buy.", 403);
  if (lock) {
    await executor.insert(siteConfigTable).values({ key, value: JSON.stringify(emptyPayoutLedger()) }).onConflictDoNothing();
    const [locked] = await executor.select().from(siteConfigTable).where(eq(siteConfigTable.key, key)).for("update");
    ledger = parsePayoutLedger(locked.value ?? "null");
    if (orderIds.length) {
      // Only selected customers are locked; a payout must not block every member's order edits.
      await executor.select({ id: ordersTable.id }).from(ordersTable)
        .where(and(eq(ordersTable.groupBuyId, gbId), inArray(ordersTable.id, orderIds)))
        .orderBy(ordersTable.id).for("update");
    }
  }
  const orderQuery = executor.select({
    id: ordersTable.id, code: ordersTable.code, telegramUsername: ordersTable.telegramUsername,
    reshipperAccountId: accountsTable.reshipperPayoutId, paymentStatus: ordersTable.paymentStatus, amountDue: ordersTable.amountDue,
    adminFee: ordersTable.adminFee, deliveryPrice: ordersTable.deliveryPrice, status: ordersTable.status,
    deletedAt: ordersTable.deletedAt, refundStatus: ordersTable.refundStatus, routingType: ordersTable.routingType,
    paymentTxHash: ordersTable.paymentTxHash,
    paymentTxHashes: ordersTable.paymentTxHashes, balanceTxHash: ordersTable.balanceTxHash,
  }).from(ordersTable).leftJoin(accountsTable, eq(accountsTable.telegramUsername, ordersTable.reshipperUsername))
    .where(eq(ordersTable.groupBuyId, gbId)).orderBy(ordersTable.id);
  const orders: FeeOrder[] = await orderQuery;
  return {
    key, ledger, orders, recipient: { id: account.id, username: account.username },
    currency: (group.currency || "USD").trim().toUpperCase(),
    paymentDetails: assignments.length ? { referencesOnly: true, assignments } : null,
  };
}
function view(ctx: Awaited<ReturnType<typeof context>>, includePaymentTxids = false) {
  return { ...buildPayoutView(ctx.ledger, ctx.orders, ctx.currency, ctx.recipient, includePaymentTxids), paymentDetails: ctx.paymentDetails };
}
export async function readReshipperPayouts(username: string, gbId: string, includePaymentTxids = false) {
  // Repeatable-read prevents a payout committed between the ledger and order reads producing a mixed snapshot.
  return db.transaction(async tx => view(await context(tx, username, gbId), includePaymentTxids), { isolationLevel: "repeatable read" });
}
export async function listReshipperPayoutGroups(username: string) {
  const account = await accountIdentity(db, username);
  const assigned = await db.select({ gbId: gbReshippersTable.gbId }).from(gbReshippersTable)
    .where(eq(gbReshippersTable.reshipperUsername, username));
  const histories = await db.select().from(siteConfigTable).where(sql`left(${siteConfigTable.key}, ${PREFIX.length}) = ${PREFIX}`);
  const ids = new Set(assigned.map(a => a.gbId));
  for (const item of histories) {
    const ledger = parsePayoutLedger(item.value ?? "null");
    if (ledger.payouts.some(p => p.accountId === account.id) || Object.values(ledger.entitlements).some(e => e.accountId === account.id)) {
      ids.add(item.key.slice(PREFIX.length));
    }
  }
  const groups = ids.size ? await db.select({ id: groupBuysTable.id, name: groupBuysTable.name, currency: groupBuysTable.currency })
    .from(groupBuysTable).where(inArray(groupBuysTable.id, [...ids])).orderBy(groupBuysTable.name) : [];
  return { groups };
}
async function lockConfig(executor: Executor, key: string) {
  await executor.insert(siteConfigTable).values({ key, value: null }).onConflictDoNothing();
  const [row] = await executor.select().from(siteConfigTable).where(eq(siteConfigTable.key, key)).for("update");
  return row;
}
function selectedOrderIds(body: unknown, field: "orders" | "allocations") {
  const entries = body && typeof body === "object" ? (body as Record<string, unknown>)[field] : undefined;
  if (!Array.isArray(entries)) return [];
  return [...new Set(entries.slice(0, 5000).flatMap(entry =>
    entry && typeof entry.orderId === "string" && entry.orderId.length <= 100 ? [entry.orderId] : []))].sort();
}
export async function reviewReshipperFees(username: string, gbId: string, body: unknown, actor: string) {
  return db.transaction(async tx => {
    const ctx = await context(tx, username, gbId, true, selectedOrderIds(body, "orders"));
    const updates = reviewEntitlements(ctx.ledger, ctx.orders, ctx.currency, ctx.recipient, body, actor, new Date().toISOString());
    // An order moved into another GB must not acquire a second fee entitlement.
    // Batch reservation reads/writes so hundreds of reviewed orders do not require thousands of SQL round trips.
    const sorted = [...updates].sort((a, b) => a.id.localeCompare(b.id));
    const keys = sorted.map(update => orderOwnerKey(update.id));
    await tx.insert(siteConfigTable).values(keys.map(key => ({ key, value: null }))).onConflictDoNothing();
    const lockedOwners = await tx.select().from(siteConfigTable).where(inArray(siteConfigTable.key, keys)).orderBy(siteConfigTable.key).for("update");
    const owners = new Map(lockedOwners.map(row => [row.key, row]));
    const reservations: { key: string; value: string | null }[] = [];
    for (const update of sorted) {
      const key = orderOwnerKey(update.id), owner = owners.get(key)!;
      if (owner.value) {
        const previous = JSON.parse(owner.value) as { gbId: string; accountId: string };
        if (previous.gbId !== gbId) {
          if (update.next.adminFeeMinor + update.next.postageMinor > 0) {
            throw new PayoutError("An entitlement for this order exists in another group buy. Review and close its original outstanding fees first.", 409);
          }
          // Closing an old zero liability must not release the new group's ownership.
          continue;
        }
      }
      reservations.push({
        key,
        value: update.next.adminFeeMinor + update.next.postageMinor > 0
          ? JSON.stringify({ gbId, accountId: ctx.recipient.id }) : null,
      });
    }
    if (reservations.length) await tx.insert(siteConfigTable).values(reservations).onConflictDoUpdate({
      target: siteConfigTable.key, set: { value: sql`excluded.value`, updatedAt: new Date() },
    });
    await tx.update(siteConfigTable).set({ value: JSON.stringify(ctx.ledger), updatedAt: new Date() }).where(eq(siteConfigTable.key, ctx.key));
    return view(ctx, true);
  });
}
export async function recordReshipperPayout(username: string, gbId: string, body: unknown, actor: string) {
  return db.transaction(async tx => {
    const ctx = await context(tx, username, gbId, true, selectedOrderIds(body, "allocations"));
    const before = new Set(ctx.ledger.payouts.map(p => p.id));
    const payout = applyPayout(ctx.ledger, ctx.orders, ctx.currency, ctx.recipient, body, actor, new Date().toISOString());
    if (!before.has(payout.id)) {
      const referenceKey = payoutReferenceKey(payout.reference);
      const reservation = await lockConfig(tx, referenceKey);
      if (reservation.value) throw new PayoutError("This transfer reference is already used by a payout. Open the original receipt instead.", 409);
      await tx.update(siteConfigTable).set({ value: JSON.stringify({ ledgerKey: ctx.key, payoutId: payout.id }), updatedAt: new Date() })
        .where(eq(siteConfigTable.key, referenceKey));
      await tx.update(siteConfigTable).set({ value: JSON.stringify(ctx.ledger), updatedAt: new Date() }).where(eq(siteConfigTable.key, ctx.key));
    }
    return view(ctx, true);
  });
}
export async function voidReshipperPayout(username: string, gbId: string, payoutId: string, reason: string, actor: string) {
  return db.transaction(async tx => {
    const ctx = await context(tx, username, gbId, true);
    const original = ctx.ledger.payouts.find(p => p.id === payoutId && p.accountId === ctx.recipient.id);
    const wasVoided = !!original?.voidedAt;
    const payout = reversePayout(ctx.ledger, ctx.recipient.id, payoutId, reason, actor, new Date().toISOString());
    if (!wasVoided) {
      const key = payoutReferenceKey(payout.reference), reservation = await lockConfig(tx, key);
      if (!reservation.value || JSON.parse(reservation.value).payoutId !== payout.id) {
        throw new PayoutError("The transfer reference reservation needs review. No changes were made.", 409);
      }
      await tx.update(siteConfigTable).set({ value: null, updatedAt: new Date() }).where(eq(siteConfigTable.key, key));
      await tx.update(siteConfigTable).set({ value: JSON.stringify(ctx.ledger), updatedAt: new Date() }).where(eq(siteConfigTable.key, ctx.key));
    }
    return view(ctx, true);
  });
}
