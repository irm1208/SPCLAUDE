import { randomUUID } from "node:crypto";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import {
  db, ordersTable, orderLineItemsTable, groupBuysTable, accountGroupBuysTable,
  groupBuyProductsTable, productsTable, accountsTable, creditTransactionsTable,
  gbSupplierAllocationsTable, gbSupplierBatchesTable, gbSupplierEventsTable,
} from "@workspace/db";
import { lockHalfKitMoney } from "./half-kit-lock";
import { assertNoActiveRefund } from "./refund-mutation-guard";
import { additionMustSplit, additionBlockReason } from "./order-addition-policy";
import { centsToUsdString, usdToCents } from "./refund-money";
import { fingerprint, SupplierBatchError } from "./supplier-batches-model";
import { ensureAdditionReferences } from "./addition-order-references";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
const owner = (name: string) => name.replace(/^@/, "").toLowerCase();
export type AdditionRequest = { parentId: string; groupId: string; username: string; requestId: string; requestHash: string };
const eventId = (input: AdditionRequest) => `addition:${fingerprint([owner(input.username), input.requestId])}`;

/** Caller authorizes the parent first. Returns only that owner's saved result. */
export async function replayAddition(tx: any, input: AdditionRequest) {
  const [event] = await tx.select().from(gbSupplierEventsTable).where(eq(gbSupplierEventsTable.id, eventId(input)));
  if (!event) return null;
  const detail = event.detail as { requestHash: string; parentId: string; orderId: string; separate: boolean };
  if (detail.requestHash !== input.requestHash || detail.parentId !== input.parentId || event.groupBuyId !== input.groupId) {
    throw new SupplierBatchError("This addition request was already used with different items. Start a new addition.");
  }
  const [order]: (typeof ordersTable.$inferSelect)[] = await tx.select().from(ordersTable).where(eq(ordersTable.id, detail.orderId));
  if (!order || owner(order.telegramUsername) !== owner(input.username)) throw new SupplierBatchError("Saved addition not found. Open My Orders.");
  const lines: (typeof orderLineItemsTable.$inferSelect)[] = await tx.select().from(orderLineItemsTable).where(eq(orderLineItemsTable.orderId, order.id));
  return { updatedParent: order, mergedItems: lines, separate: detail.separate, replayed: true,
    addedAmountDue: 0, appliedCredits: 0 };
}

export async function recordAddition(tx: Tx, input: AdditionRequest, orderId: string, separate: boolean) {
  await tx.insert(gbSupplierEventsTable).values({
    id: eventId(input), groupBuyId: input.groupId, kind: "addition_submitted",
    detail: { requestHash: input.requestHash, parentId: input.parentId, orderId, separate },
  });
}

/** Money mutex -> group row -> account/order rows: matches supplier prepare/append/release/order. */
export async function lockAddition(tx: Tx, input: AdditionRequest) {
  await lockHalfKitMoney(tx, input.groupId);
  const [group] = await tx.select().from(groupBuysTable).where(eq(groupBuysTable.id, input.groupId)).for("update");
  const replay = await replayAddition(tx, input);
  if (replay) return { replay } as const;
  const [parent] = await tx.select().from(ordersTable).where(eq(ordersTable.id, input.parentId)).for("update");
  if (!parent || parent.deletedAt || owner(parent.telegramUsername) !== owner(input.username)
    || parent.groupBuyId !== input.groupId || parent.paymentStatus !== "confirmed"
    || parent.status === "Cancelled" || parent.additionOfOrderId
    || ["wholesale", "wholesale_shared"].includes(parent.orderType ?? "")
    || (parent.refundStatus && !["none", "rejected", "cancelled", "canceled"].includes(parent.refundStatus))
    || ["verifying", "pending_confirmation"].includes(parent.balancePaymentStatus ?? "")) {
    throw new SupplierBatchError("The original paid order changed. Refresh and try again.");
  }
  await assertNoActiveRefund(tx, parent.id);
  const [membership] = await tx.select().from(accountGroupBuysTable).where(and(
    eq(accountGroupBuysTable.groupBuyId, input.groupId),
    sql`lower(ltrim(${accountGroupBuysTable.accountId}, '@')) = ${owner(input.username)}`,
  ));
  if (!group || !membership || (group.status !== "active" && !group.allowExtraOrders && !membership.allowExtraOrder)
    || group.allowOrderAddons === false) throw new SupplierBatchError("This group buy is not accepting additions.", 403);
  const availability = await getAdditionAvailability(tx, parent);
  if (!availability.canAddItems) throw new SupplierBatchError(availability.reason!, 409);
  return { parent, group, membership } as const;
}

export async function getAdditionAvailability(tx: any, parent: { id: string; batchLocked: boolean; status?: string }) {
  const [allocation] = await tx.select({ state: gbSupplierBatchesTable.state })
    .from(gbSupplierAllocationsTable)
    .innerJoin(gbSupplierBatchesTable, eq(gbSupplierAllocationsTable.batchId, gbSupplierBatchesTable.id))
    .where(eq(gbSupplierAllocationsTable.orderId, parent.id));
  const reason = additionBlockReason(parent.batchLocked, allocation?.state, parent.status);
  return { canAddItems: reason === null, reason,
    additionOutcome: additionMustSplit(parent.batchLocked, allocation?.state) ? "separate" as const : "merged" as const };
}

export async function additionIsSeparate(tx: any, parent: { id: string; batchLocked: boolean }) {
  return (await getAdditionAvailability(tx, parent)).additionOutcome === "separate";
}

/** Revalidate catalogue and limits inside the monetary transaction, never client batch hints. */
export async function validateAdditionItems(tx: Tx, input: AdditionRequest, group: any, membership: any,
  items: Array<{ productId: string; productName: string; quantity: number; unitPrice: number }>) {
  const catalogue = await tx.select({ id: productsTable.id, name: productsTable.name,
    price: productsTable.price, override: groupBuyProductsTable.priceOverride, limit: groupBuyProductsTable.maxPerCustomer })
    .from(groupBuyProductsTable).innerJoin(productsTable, eq(groupBuyProductsTable.productId, productsTable.id))
    .where(and(eq(groupBuyProductsTable.groupBuyId, input.groupId), eq(groupBuyProductsTable.active, true),
      eq(productsTable.active, true), inArray(productsTable.id, items.map(i => i.productId))));
  const existing = await tx.select({ productId: orderLineItemsTable.productId, quantity: orderLineItemsTable.quantity,
    username: ordersTable.telegramUsername })
    .from(orderLineItemsTable).innerJoin(ordersTable, eq(orderLineItemsTable.orderId, ordersTable.id))
    .where(and(eq(ordersTable.groupBuyId, input.groupId), isNull(ordersTable.deletedAt)));
  const own = existing.filter(row => owner(row.username) === owner(input.username));
  const sum = (rows: Array<{ quantity: string | number }>) => rows.reduce((n, row) => n + Number(row.quantity), 0);
  const limited = !group.allowExtraOrders && !membership.allowExtraOrder;
  if ((group.maxKitsTotal != null && sum(existing) + sum(items) > group.maxKitsTotal)
    || (limited && group.maxKitsPerCustomer != null && sum(own) + sum(items) > group.maxKitsPerCustomer)) {
    throw new SupplierBatchError("Kit limit exceeded. Refresh your basket.");
  }
  for (const item of items) {
    const product = catalogue.find(p => p.id === item.productId);
    if (!product || Number(product.override ?? product.price) !== Number(item.unitPrice) || product.name !== item.productName) {
      throw new SupplierBatchError("The catalogue changed. Refresh your basket before submitting.");
    }
    if (limited && product.limit != null && sum(own.filter(row => row.productId === item.productId))
      + sum(items.filter(row => row.productId === item.productId)) > product.limit) {
      throw new SupplierBatchError(`Product limit exceeded for ${product.name}.`);
    }
  }
}

/** Explicit allowlist: never copy payment/refund/fulfilment/batch fields from the parent. */
export async function createSeparateAddition(tx: Tx, parent: typeof ordersTable.$inferSelect, input: {
  items: Array<{ productId: string; productName: string; quantity: number; unitPrice: number }>;
  productSubtotal: number; grandTotal: number; tip: number; testingContribution: number; kitFees: number;
  couponCode: string | null; couponDiscount: number; requestedCredits: number; notes: string | null;
}) {
  const id = randomUUID();
  // A dedicated UUID namespace avoids the unrelated global numeric-code allocator race.
  const code = `ADD-${id}`;
  let credits = 0n;
  if (input.requestedCredits > 0) {
    const [account] = await tx.select().from(accountsTable).where(
      sql`lower(ltrim(${accountsTable.telegramUsername}, '@')) = ${owner(parent.telegramUsername)}`).for("update");
    if (!account) throw new SupplierBatchError("Account not found.", 403);
    const available = usdToCents(String(account.credits ?? 0));
    credits = [available, usdToCents(String(input.requestedCredits)), usdToCents(input.grandTotal.toFixed(2))]
      .reduce((a, b) => a < b ? a : b);
    if (credits > 0n) await tx.update(accountsTable).set({ credits: Number(centsToUsdString(available - credits)) })
      .where(eq(accountsTable.telegramUsername, account.telegramUsername));
    // The order is inserted before its credit ledger reference below.
  }
  const settled = credits >= usdToCents(input.grandTotal.toFixed(2));
  const [order] = await tx.insert(ordersTable).values({
    id, code, telegramUsername: parent.telegramUsername, groupBuyId: parent.groupBuyId,
    additionOfOrderId: parent.id, deliveryMethod: parent.deliveryMethod, deliveryMethodId: parent.deliveryMethodId,
    deliveryPrice: "0", vendorShipping: "0", vendorShippingIsTbd: false, adminFee: "0", kitFees: input.kitFees.toFixed(2),
    shippingName: parent.shippingName, shippingPhone: parent.shippingPhone, shippingEmail: parent.shippingEmail,
    shippingAddress: parent.shippingAddress, shippingCountry: parent.shippingCountry,
    shippingCity: parent.shippingCity, shippingPostcode: parent.shippingPostcode,
    countryLegId: parent.countryLegId, reshipperUsername: parent.reshipperUsername,
    reshipperCleared: parent.reshipperCleared, routingType: parent.routingType,
    reshipperHubCountry: parent.reshipperHubCountry, directShippingRequested: parent.directShippingRequested,
    productSubtotal: input.productSubtotal.toFixed(2), grandTotal: input.grandTotal.toFixed(2),
    tip: input.tip.toFixed(2), testingContribution: input.testingContribution.toFixed(2),
    couponCode: input.couponCode, couponDiscount: input.couponDiscount.toFixed(2), notes: input.notes,
    creditsApplied: Number(centsToUsdString(credits)), status: "Submitted",
    paymentStatus: settled ? "confirmed" : "unpaid", paymentConfirmedAt: settled ? new Date() : null,
  }).returning();
  await ensureAdditionReferences(tx, parent.id, [id]);
  const [referenceRow] = await tx.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (referenceRow) order.additionDisplayReference = referenceRow.additionDisplayReference;
  const lines = await tx.insert(orderLineItemsTable).values(input.items.map(item => ({
    id: randomUUID(), orderId: id, productId: item.productId, productName: item.productName,
    quantity: Number(item.quantity).toFixed(2), unitPrice: Number(item.unitPrice).toFixed(2),
    lineTotal: (Number(item.quantity) * Number(item.unitPrice)).toFixed(2),
  }))).returning();
  if (credits > 0n) {
    const [account] = await tx.select({ username: accountsTable.telegramUsername }).from(accountsTable).where(
      sql`lower(ltrim(${accountsTable.telegramUsername}, '@')) = ${owner(parent.telegramUsername)}`);
    await tx.insert(creditTransactionsTable).values({ accountUsername: account.username,
      amount: -Number(centsToUsdString(credits)), orderId: id, reason: `Credits applied to order #${code}` });
  }
  return { updatedParent: order, mergedItems: lines, separate: true, replayed: false,
    addedAmountDue: Number(centsToUsdString(usdToCents(input.grandTotal.toFixed(2)) - credits)),
    appliedCredits: Number(centsToUsdString(credits)) };
}
