import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { isValidTxHash } from "./payment-verify";

export class PayoutError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
const minor = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const entitlementSchema = z.object({
  accountId: z.string(), code: z.string(), member: z.string(), currency: z.string(),
  adminFeeMinor: minor, postageMinor: minor, fingerprint: z.string(),
  collector: z.enum(["admin", "reshipper"]), reviewedAt: z.string(), reviewedBy: z.string(), reason: z.string(),
});
const allocationSchema = z.object({
  orderId: z.string(), code: z.string(), member: z.string(), adminFeeMinor: minor, postageMinor: minor,
});
const receiptSchema = z.object({
  id: z.string(), accountId: z.string(), username: z.string(), operationId: z.string(), requestHash: z.string(),
  amountMinor: minor, currency: z.string(), paidAt: z.string(), method: z.string(), reference: z.string(),
  destination: z.string(), note: z.string(), recordedBy: z.string(), recordedAt: z.string(),
  allocations: z.array(allocationSchema), voidedAt: z.string().nullable(), voidReason: z.string().nullable(),
});
const ledgerSchema = z.object({
  version: z.literal(1), entitlements: z.record(z.string(), entitlementSchema),
  payouts: z.array(receiptSchema), audit: z.array(z.object({
    action: z.string(), actor: z.string(), at: z.string(), reason: z.string(),
    details: z.unknown(),
  })),
});
export type PayoutLedger = z.infer<typeof ledgerSchema>;
export type PayoutRecipient = { id: string; username: string };
export interface FeeOrder {
  id: string; code: string; telegramUsername: string; reshipperAccountId: string | null;
  paymentStatus: string; amountDue: string; adminFee: string; deliveryPrice: string; status: string;
  deletedAt: unknown; refundStatus: string | null; routingType: string | null; paymentTxHash: string | null;
  paymentTxHashes?: string[] | null; balanceTxHash?: string | null;
}
export const payoutLedgerKey = (gbId: string) => `reshipper_payouts:v1:${gbId}`;
export const payoutReferenceKey = (reference: string) => `reshipper_payout_reference:v1:${digest(reference.trim().toLowerCase())}`;
export function digest(value: string) { return createHash("sha256").update(value).digest("hex"); }
export function moneyToMinor(raw: unknown): number {
  if (typeof raw !== "string" || !/^\d{1,8}(?:\.\d{1,2})?$/.test(raw.trim())) {
    throw new PayoutError("Use a non-negative amount with at most two decimal places.");
  }
  const [whole, fraction = ""] = raw.trim().split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}
export function emptyPayoutLedger(): PayoutLedger {
  return { version: 1, entitlements: Object.create(null), payouts: [], audit: [] };
}
export function parsePayoutLedger(raw: string | undefined): PayoutLedger {
  if (raw === undefined) return emptyPayoutLedger();
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new PayoutError("Payout history could not be read. No changes were made.", 503); }
  const result = ledgerSchema.safeParse(parsed);
  if (!result.success) throw new PayoutError("Payout history failed validation. No changes were made.", 503);
  const ledger = result.data;
  ledger.entitlements = Object.assign(Object.create(null), ledger.entitlements);
  const paidIndex = paymentIndex(ledger);
  for (const payout of ledger.payouts.filter(p => !p.voidedAt)) {
    if (sum(payout.allocations.flatMap(a => [a.adminFeeMinor, a.postageMinor])) !== payout.amountMinor ||
      payout.allocations.some(a => ledger.entitlements[a.orderId]?.accountId !== payout.accountId ||
        ledger.entitlements[a.orderId]?.currency !== payout.currency)) {
      throw new PayoutError("Payout allocations failed validation. No changes were made.", 503);
    }
  }
  for (const [id, entry] of Object.entries(ledger.entitlements)) {
    const paid = paidIndex.get(id) ?? { admin: 0, postage: 0 };
    if (paid.admin > entry.adminFeeMinor || paid.postage > entry.postageMinor) {
      throw new PayoutError("Payout balances failed validation. No changes were made.", 503);
    }
  }
  return ledger;
}
function sum(values: number[]) {
  const total = values.reduce((a, b) => a + b, 0);
  if (!Number.isSafeInteger(total)) throw new PayoutError("Financial total exceeds the supported range.", 409);
  return total;
}
function paymentIndex(ledger: PayoutLedger) {
  const index = new Map<string, { admin: number; postage: number }>();
  for (const payout of ledger.payouts) {
    if (payout.voidedAt) continue;
    for (const allocation of payout.allocations) {
      const previous = index.get(allocation.orderId) ?? { admin: 0, postage: 0 };
      index.set(allocation.orderId, {
        admin: sum([previous.admin, allocation.adminFeeMinor]), postage: sum([previous.postage, allocation.postageMinor]),
      });
    }
  }
  return index;
}
function settled(order: FeeOrder | undefined) {
  return !!order && order.paymentStatus === "confirmed" && moneyToMinor(order.amountDue) === 0 &&
    !order.deletedAt && !["cancelled", "refunded", "draft"].includes(order.status.toLowerCase()) &&
    (!order.refundStatus || ["none", "rejected", "declined", "cancelled"].includes(order.refundStatus.toLowerCase())) &&
    order.routingType !== "direct";
}
function fingerprint(order: FeeOrder | undefined, currency: string) {
  return digest(JSON.stringify(order ? [
    order.id, order.reshipperAccountId, currency, moneyToMinor(order.adminFee), moneyToMinor(order.deliveryPrice),
    order.paymentStatus, moneyToMinor(order.amountDue), Boolean(order.deletedAt), order.refundStatus,
    // Ordinary fulfilment transitions and member/username renames do not invalidate paid fee snapshots.
    ["cancelled", "refunded", "draft"].includes(order.status.toLowerCase()), order.routingType === "direct",
    order.paymentTxHash,
  ] : ["missing", currency]));
}
const reviewSchema = z.object({
  reason: z.string().trim().min(5).max(2000),
  orders: z.array(z.object({
    orderId: z.string().min(1).max(100), collector: z.enum(["admin", "reshipper"]),
    adminFee: z.string(), postage: z.string(),
  })).min(1).max(5000),
});
function validate<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new PayoutError(result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; "));
  return result.data;
}
export function reviewEntitlements(ledger: PayoutLedger, orders: FeeOrder[], currency: string, recipient: PayoutRecipient,
  raw: unknown, actor: string, now: string) {
  const body = validate(reviewSchema, raw);
  const seen = new Set<string>();
  const paidIndex = paymentIndex(ledger);
  const byId = new Map(orders.map(order => [order.id, order]));
  const updates = body.orders.map(item => {
    if (seen.has(item.orderId)) throw new PayoutError("An order can be reviewed only once per request.");
    seen.add(item.orderId);
    const order = byId.get(item.orderId);
    const previous = ledger.entitlements[item.orderId];
    const paid = paidIndex.get(item.orderId) ?? { admin: 0, postage: 0 };
    if (previous && previous.accountId !== recipient.id && (previous.adminFeeMinor || previous.postageMinor || paid.admin || paid.postage)) {
      throw new PayoutError("This order's fee entitlement already belongs to another reshipper. Review the original owner's ledger first.", 409);
    }
    const ownsPrevious = previous?.accountId === recipient.id;
    if ((!order || order.reshipperAccountId !== recipient.id) && !ownsPrevious) {
      throw new PayoutError("Order is not assigned to this reshipper.", 403);
    }
    const reportedAdmin = moneyToMinor(item.adminFee), reportedPostage = moneyToMinor(item.postage);
    const admin = item.collector === "reshipper" ? 0 : reportedAdmin;
    const postage = item.collector === "reshipper" ? 0 : reportedPostage;
    if (admin < paid.admin || postage < paid.postage) throw new PayoutError("Cannot reduce an entitlement below money already paid. Reverse an incorrect payout first.", 409);
    const canIncrease = settled(order) && (!previous || previous.currency === currency || (!previous.adminFeeMinor && !previous.postageMinor && !paid.admin && !paid.postage));
    const maxAdmin = Math.max(paid.admin, canIncrease && order ? moneyToMinor(order.adminFee) : 0);
    const maxPostage = Math.max(paid.postage, canIncrease && order ? moneyToMinor(order.deliveryPrice) : 0);
    if (admin > maxAdmin || postage > maxPostage) throw new PayoutError("Only settled, collected fees can be owed. Unpaid, refunded, direct or currency-changed amounts require a paid-only/zero adjustment.", 409);
    const retainCurrency = previous && (previous.adminFeeMinor || previous.postageMinor || paid.admin || paid.postage);
    return { id: item.orderId, previous: previous ?? null, reportedAdminFeeMinor: reportedAdmin, reportedPostageMinor: reportedPostage, next: {
      accountId: recipient.id, code: previous?.code ?? order!.code, member: previous?.member ?? order!.telegramUsername,
      currency: retainCurrency ? previous.currency : currency, adminFeeMinor: admin, postageMinor: postage,
      fingerprint: fingerprint(order, currency), collector: item.collector, reviewedAt: now, reviewedBy: actor, reason: body.reason,
    } };
  });
  for (const update of updates) ledger.entitlements[update.id] = update.next;
  ledger.audit.push({ action: "review", actor, at: now, reason: body.reason, details: updates });
  return updates;
}
function incomingPaymentTxids(order: FeeOrder | undefined): string[] {
  const seen = new Set<string>();
  return [order?.paymentTxHash, ...(order?.paymentTxHashes ?? []), order?.balanceTxHash]
    .flatMap(value => {
      if (typeof value !== "string" || !isValidTxHash(value.trim())) return [];
      const txid = value.trim();
      const key = /^(?:0x)?[0-9a-f]{64}$/i.test(txid) ? txid.replace(/^0x/i, "").toLowerCase() : txid;
      if (seen.has(key)) return [];
      seen.add(key);
      return [txid];
    });
}

export function buildPayoutView(ledger: PayoutLedger, orders: FeeOrder[], currency: string, recipient: PayoutRecipient, includePaymentTxids = false) {
  const orderMap = new Map(orders.map(o => [o.id, o]));
  const paidIndex = paymentIndex(ledger);
  const ids = new Set(orders.filter(o => o.reshipperAccountId === recipient.id && settled(o)).map(o => o.id));
  for (const [id, entry] of Object.entries(ledger.entitlements)) if (entry.accountId === recipient.id) ids.add(id);
  const rows = [...ids].map(id => {
    const order = orderMap.get(id), anyEntry = ledger.entitlements[id];
    const entry = anyEntry?.accountId === recipient.id ? anyEntry : undefined;
    const orderPaid = paidIndex.get(id) ?? { admin: 0, postage: 0 };
    const conflict = !!anyEntry && anyEntry.accountId !== recipient.id && (anyEntry.adminFeeMinor > 0 || anyEntry.postageMinor > 0 || orderPaid.admin + orderPaid.postage > 0);
    const paid = entry ? orderPaid : { admin: 0, postage: 0 };
    const admin = entry?.adminFeeMinor ?? (order ? moneyToMinor(order.adminFee) : 0);
    const postage = entry?.postageMinor ?? (order ? moneyToMinor(order.deliveryPrice) : 0);
    const changed = !!entry && entry.fingerprint !== fingerprint(order, currency);
    const unreviewed = !entry && admin + postage > 0;
    const needsReview = changed || unreviewed || conflict;
    const remainingAdmin = entry ? Math.max(0, admin - paid.admin) : 0;
    const remainingPostage = entry ? Math.max(0, postage - paid.postage) : 0;
    const status = needsReview ? "needs_review" : !admin && !postage ? "not_owed" :
      remainingAdmin + remainingPostage === 0 ? "paid" : paid.admin + paid.postage > 0 ? "part_paid" : "owed";
    return {
      orderId: id, code: entry?.code ?? order?.code ?? id, member: entry?.member ?? order?.telegramUsername ?? "",
      // Incoming customer transactions are for Admin collection review, not the reshipper's read-only response.
      ...(includePaymentTxids ? { paymentTxids: incomingPaymentTxids(order) } : {}),
      currency: entry?.currency ?? currency, adminFeeMinor: admin, postageMinor: postage,
      paidAdminMinor: paid.admin, paidPostageMinor: paid.postage,
      remainingAdminMinor: remainingAdmin, remainingPostageMinor: remainingPostage,
      status, collector: entry?.collector ?? null, reviewedAt: entry?.reviewedAt ?? null,
      reviewReason: conflict ? "Fee ownership requires Admin review of the previous reshipper's entitlement." :
        changed ? "Order fees, collection status or assignment changed. Outstanding fees are on hold until Admin reviews them." :
          unreviewed ? "Original collection recipient is not recorded. Admin must confirm which fees they actually collected." : entry?.reason ?? null,
      reviewable: !conflict && (!!order || !!entry),
      reviewAdminMinor: Math.max(paid.admin, settled(order) && (!entry || entry.currency === currency) && order ? moneyToMinor(order.adminFee) : 0),
      reviewPostageMinor: Math.max(paid.postage, settled(order) && (!entry || entry.currency === currency) && order ? moneyToMinor(order.deliveryPrice) : 0),
      eligible: !needsReview && !!entry && settled(order) && remainingAdmin + remainingPostage > 0,
    };
  });
  const totals = [...new Set(rows.map(row => row.currency))].map(code => {
    const scoped = rows.filter(row => row.currency === code);
    return {
      currency: code,
      entitledMinor: sum(scoped.filter(row => row.reviewedAt).flatMap(row => [row.adminFeeMinor, row.postageMinor])),
      paidMinor: sum(scoped.flatMap(row => [row.paidAdminMinor, row.paidPostageMinor])),
      owedMinor: sum(scoped.filter(row => row.status !== "needs_review").flatMap(row => [row.remainingAdminMinor, row.remainingPostageMinor])),
      onHoldMinor: sum(scoped.filter(row => row.status === "needs_review").flatMap(row => [row.remainingAdminMinor, row.remainingPostageMinor])),
    };
  });
  return {
    orders: rows, payouts: ledger.payouts.filter(p => p.accountId === recipient.id).map(({ requestHash, operationId, accountId, username, ...receipt }) => receipt).reverse(),
    totals, needsReviewCount: rows.filter(row => row.status === "needs_review").length,
    sourceNotice: "Only fees confirmed as collected by Admin are payable here. Vendor shipping and postage paid directly to the reshipper are excluded. Payouts record external transfers; they do not send money or change customer payments.",
  };
}
const payoutSchema = z.object({
  operationId: z.string().uuid(), amount: z.string(), currency: z.string().trim().min(2).max(8),
  paidAt: z.string().min(10).max(40), method: z.string().trim().min(1).max(100),
  reference: z.string().trim().min(1).max(300), destination: z.string().trim().min(1).max(500),
  confirmedDestination: z.literal(true), note: z.string().trim().max(2000).optional().default(""),
  allocations: z.array(z.object({ orderId: z.string().min(1).max(100), adminFee: z.string(), postage: z.string() })).min(1).max(5000),
});
export function applyPayout(ledger: PayoutLedger, orders: FeeOrder[], currency: string, recipient: PayoutRecipient,
  raw: unknown, actor: string, now: string) {
  const body = validate(payoutSchema, raw);
  const amount = moneyToMinor(body.amount);
  if (!amount) throw new PayoutError("The payout amount must be positive.");
  const date = new Date(body.paidAt);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== body.paidAt.slice(0, 10) || body.paidAt.slice(0, 10) > now.slice(0, 10)) {
    throw new PayoutError("Enter the valid date on which you already sent the payment, not a future date.");
  }
  const allocations = body.allocations.map(a => ({ orderId: a.orderId, adminFeeMinor: moneyToMinor(a.adminFee), postageMinor: moneyToMinor(a.postage) })).sort((a, b) => a.orderId.localeCompare(b.orderId));
  if (new Set(allocations.map(a => a.orderId)).size !== allocations.length) throw new PayoutError("An order may appear only once in a payout.");
  const note = body.note ?? "";
  const requestHash = digest(JSON.stringify({ ...body, note, amount, allocations }));
  const existing = ledger.payouts.find(p => p.operationId === body.operationId);
  if (existing) {
    if (existing.accountId !== recipient.id || existing.requestHash !== requestHash) throw new PayoutError("This operation was already used for a different payout. Refresh and retry.", 409);
    return existing;
  }
  if (ledger.payouts.some(p => !p.voidedAt && p.reference.trim().toLowerCase() === body.reference.toLowerCase())) {
    throw new PayoutError("That transfer reference is already recorded. Open its receipt instead.", 409);
  }
  if (sum(allocations.flatMap(a => [a.adminFeeMinor, a.postageMinor])) !== amount) throw new PayoutError("Payout amount must equal the exact sum allocated to the selected orders.");
  const view = buildPayoutView(ledger, orders, currency, recipient);
  const snapshots = allocations.map(allocation => {
    const row = view.orders.find(o => o.orderId === allocation.orderId);
    if (!row || !row.eligible) throw new PayoutError("An order needs review or has no eligible outstanding fees. Refresh the ledger before recording payment.", 409);
    if (row.currency !== body.currency) throw new PayoutError("A payout can cover only one currency. No conversion is performed.");
    if (!allocation.adminFeeMinor && !allocation.postageMinor) throw new PayoutError("Remove orders with zero allocation.");
    if (allocation.adminFeeMinor > row.remainingAdminMinor || allocation.postageMinor > row.remainingPostageMinor) throw new PayoutError("Allocation exceeds the remaining admin fee or postage for an order.", 409);
    return { ...allocation, code: row.code, member: row.member };
  });
  const receipt = {
    id: randomUUID(), accountId: recipient.id, username: recipient.username, operationId: body.operationId, requestHash,
    amountMinor: amount, currency: body.currency, paidAt: date.toISOString(), method: body.method, reference: body.reference,
    destination: body.destination, note, recordedBy: actor, recordedAt: now, allocations: snapshots, voidedAt: null, voidReason: null,
  };
  ledger.payouts.push(receipt);
  ledger.audit.push({ action: "payout", actor, at: now, reason: note, details: { payoutId: receipt.id, orderIds: snapshots.map(a => a.orderId) } });
  return receipt;
}
export function reversePayout(ledger: PayoutLedger, accountId: string, payoutId: string, reason: string, actor: string, now: string) {
  if (typeof reason !== "string" || reason.trim().length < 5 || reason.length > 2000) throw new PayoutError("Give a correction reason of 5–2000 characters.");
  const payout = ledger.payouts.find(p => p.id === payoutId && p.accountId === accountId);
  if (!payout) throw new PayoutError("Payout not found.", 404);
  if (payout.voidedAt) return payout;
  payout.voidedAt = now; payout.voidReason = reason.trim();
  ledger.audit.push({ action: "void", actor, at: now, reason: payout.voidReason, details: { payoutId } });
  return payout;
}
