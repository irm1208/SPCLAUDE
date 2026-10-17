import { randomUUID } from "node:crypto";
import { and, eq, like, sql } from "drizzle-orm";
import { db, gbReshippersTable, ordersTable, orderLineItemsTable, siteConfigTable, wholesaleSharesTable } from "@workspace/db";
import { onwardOrderAccess, onwardOrderEstimate, type OnwardOrderScope } from "./gb-onward-delivery";
import { canonicalUsername, type UpdateActor } from "./group-buy-updates-model";
import { OnwardDeliveryError } from "./gb-onward-delivery-rules";
import { fetchFiatToUsd, fetchUsdPerCoin, roundCrypto } from "./crypto-pricing";
import { verifyTransaction } from "./payment-verify";
import { onwardTransactionTime } from "./gb-onward-chain-time";
import {
  assertOnwardTransition, canAutoConfirmOnward, DEFAULT_ONWARD_PAYMENT_SETTINGS, ONWARD_PAYMENT_RAILS,
  onwardPaymentAmount, onwardTxIdentity, parseOnwardPaymentSettings, validateOnwardTx,
  type OnwardCharge, type OnwardLedger,
} from "./gb-onward-payment-rules";

type DataAccess = Pick<typeof db, "select" | "insert" | "update" | "delete" | "execute">;
const ledgerKey = (id: string) => `gb_onward_charge:${id}`;
const settingsKey = (id: string) => `gb_onward_payment_settings:${id}`;
const claimKey = (hash: string, network: string) => `gb_onward_tx:${onwardTxIdentity(hash, network)}`;
const canonicalHash = (hash: string) => /^(?:0x)?[a-f0-9]+$/i.test(hash) ? hash.replace(/^0x/i, "").toLowerCase() : hash;
// Shared with product-payment entry points. Conservatively reserve the hash
// across chains as well, so two independent payment flows cannot race the check.
const paymentClaimKey = (hash: string) => `crypto_payment_tx:${canonicalHash(hash)}`;
const emptyLedger = (): OnwardLedger => ({ request: null, history: [] });
async function read<T>(database: DataAccess, key: string): Promise<T | null> {
  const [row] = await database.select({ value: siteConfigTable.value }).from(siteConfigTable).where(eq(siteConfigTable.key, key)).limit(1);
  return row?.value != null ? JSON.parse(row.value) as T : null;
}
async function put(database: DataAccess, key: string, value: unknown) {
  const encoded = JSON.stringify(value);
  await database.insert(siteConfigTable).values({ key, value: encoded })
    .onConflictDoUpdate({ target: siteConfigTable.key, set: { value: encoded } });
}
async function assignment(database: DataAccess, gbId: string, username: string, lock = false) {
  const query = database.select().from(gbReshippersTable).where(and(
    eq(gbReshippersTable.gbId, gbId), eq(gbReshippersTable.enabled, true),
    sql`lower(ltrim(${gbReshippersTable.reshipperUsername}, '@')) = ${canonicalUsername(username)}`,
  )).limit(1);
  const rows = await (lock ? query.for("update") : query);
  if (!rows[0]) throw new OnwardDeliveryError("You are not an active reshipper for this group buy.", 403);
  return rows[0];
}
async function currentAssignment(database: DataAccess, order: typeof ordersTable.$inferSelect) {
  if (!order.reshipperUsername || !order.groupBuyId) return null;
  try { return await assignment(database, order.groupBuyId, order.reshipperUsername); }
  catch (error) { if (error instanceof OnwardDeliveryError && error.status === 403) return null; throw error; }
}
function canCreate(order: typeof ordersTable.$inferSelect) {
  // Fulfilment does not erase a delivery debt. Keep settlement available even
  // after dispatch/delivery; never reopen or rewrite the product order.
  return !order.directShippingRequested && !["Cancelled", "Refunded"].includes(order.status);
}
async function envelope(database: DataAccess, order: typeof ordersTable.$inferSelect, scope: OnwardOrderScope) {
  const ledger = await read<OnwardLedger>(database, ledgerKey(order.id)) ?? emptyLedger();
  const assigned = await currentAssignment(database, order);
  // The next reshipper must not inherit the previous reshipper's payment proof.
  const request = scope === "reshipper" && ledger.request?.assignmentId !== assigned?.id ? null : ledger.request;
  const history = scope === "reshipper" ? ledger.history.filter(r => r.assignmentId === assigned?.id) : ledger.history;
  const current = !!request && assigned?.id === request.assignmentId;
  return { request, history, canManage: scope === "reshipper" && current,
    canSubmit: scope === "member" && current && canCreate(order),
    canRequest: scope === "reshipper" && canCreate(order) && (!ledger.request || ledger.request.status === "cancelled"),
    requestBlockedReason: scope === "reshipper" && ledger.request && !request && ledger.request.status !== "cancelled"
      ? "An earlier reshipper has an unresolved or paid delivery charge. Contact the organiser before requesting another payment." : null };
}
export async function readOnwardPayment(orderId: string, actor: UpdateActor, scope: OnwardOrderScope, gbId?: string) {
  const order = await onwardOrderAccess(db, orderId, actor, scope, gbId);
  return envelope(db, order, scope);
}
export async function saveOnwardPaymentSettings(gbId: string, actor: UpdateActor, body: unknown) {
  const settings = parseOnwardPaymentSettings(body);
  return db.transaction(async tx => {
    const row = await assignment(tx, gbId, actor.username, true);
    // Assignment row lock serializes settings saves against charge creation.
    await put(tx, settingsKey(row.id), settings);
    return { settings };
  });
}
export async function listOnwardPayments(gbId: string, actor: UpdateActor) {
  const assigned = await assignment(db, gbId, actor.username);
  const settings = await read(db, settingsKey(assigned.id)) ?? DEFAULT_ONWARD_PAYMENT_SETTINGS;
  const rows = await db.select().from(ordersTable).where(and(
    eq(ordersTable.groupBuyId, gbId), sql`${ordersTable.deletedAt} IS NULL`,
    sql`lower(ltrim(${ordersTable.reshipperUsername}, '@')) = ${canonicalUsername(actor.username)}`,
  )).orderBy(ordersTable.createdAt);
  const orders = [];
  for (let start = 0; start < rows.length; start += 8) {
    const batch = await Promise.all(rows.slice(start, start + 8).map(async order => {
      const [estimate, data] = await Promise.all([
        onwardOrderEstimate(order.id, actor, "reshipper", gbId), envelope(db, order, "reshipper"),
      ]);
      // Retain existing records even if the member subsequently changes destination.
      if (!estimate.country && !data.request) return null;
      return { id: order.id, code: order.code, username: order.telegramUsername,
        country: order.shippingCountry || estimate.country || "Unknown", kits: estimate.kits,
        orderStatus: order.status, canRequest: !!estimate.country && estimate.kits > 0 && data.canRequest,
        requestBlockedReason: data.requestBlockedReason, estimate, request: data.request };
    }));
    for (const row of batch) if (row) orders.push(row);
  }
  return { settings, rails: ONWARD_PAYMENT_RAILS, orders };
}
function assertMatches(request: OnwardCharge | null, id: string) {
  if (!request || request.id !== id) throw new OnwardDeliveryError("This onward-delivery request is no longer current. Refresh the order.", 409);
  return request;
}
async function audit(action: string, orderId: string, request: OnwardCharge, username: string) {
  const { writeLog } = await import("./audit-log");
  await writeLog("payment", "info", `gb_onward_${action}`, `Onward-delivery payment ${action}`, {
    orderId, requestId: request.id, actor: username, amount: request.amount, currency: request.currency, status: request.status,
  }).catch(error => console.error("[onward-payment:audit]", error));
}
async function notify(username: string, text: string) {
  try {
    const { notifyUser } = await import("./telegram");
    await notifyUser(username, "payment", text);
  } catch (error) { console.error("[onward-payment:notify]", error instanceof Error ? error.message : "Notification failed"); }
}
export async function createOnwardPayment(gbId: string, orderId: string, actor: UpdateActor, body: Record<string, unknown>) {
  const amount = onwardPaymentAmount(body.amount);
  const currency = String(body.currency ?? "").toUpperCase();
  if (!["USD", "EUR", "GBP"].includes(currency)) throw new OnwardDeliveryError("Choose USD, EUR or GBP for the delivery charge.");
  if (body.method !== "pickup" && body.method !== "home") throw new OnwardDeliveryError("Choose pickup point or home delivery.");
  if (typeof body.idempotencyKey !== "string" || !/^[a-zA-Z0-9_-]{16,100}$/.test(body.idempotencyKey)) {
    throw new OnwardDeliveryError("A valid request reference is required. Refresh and try again.");
  }
  const idempotencyKey = body.idempotencyKey;
  if (typeof body.note !== "undefined" && (typeof body.note !== "string" || body.note.length > 1000)) throw new OnwardDeliveryError("Keep the delivery note within 1,000 characters.");
  const before = await onwardOrderAccess(db, orderId, actor, "reshipper", gbId);
  const assigned = await assignment(db, gbId, actor.username);
  const settings = parseOnwardPaymentSettings(await read(db, settingsKey(assigned.id)) ?? DEFAULT_ONWARD_PAYMENT_SETTINGS);
  if (!settings.enabled) throw new OnwardDeliveryError("Enable and save your separate onward-delivery wallet first.", 409);
  const estimate = await onwardOrderEstimate(orderId, actor, "reshipper", gbId);
  if (!estimate.country || estimate.kits <= 0 || !canCreate(before)) throw new OnwardDeliveryError("This order is not eligible for an onward-delivery request.", 409);
  // Network pricing is deliberately outside transaction locks.
  const [fiatToUsdRate, usdPerCoin] = await Promise.all([fetchFiatToUsd(currency, { strict: true }), fetchUsdPerCoin(settings.currency)])
    .catch(() => { throw new OnwardDeliveryError("Could not load the live exchange rate. No payment request was created; please retry.", 503); });
  if (!usdPerCoin || !Number.isFinite(usdPerCoin) || usdPerCoin <= 0 || !Number.isFinite(fiatToUsdRate) || fiatToUsdRate <= 0) {
    throw new OnwardDeliveryError("Could not load the exchange rate. No payment request was created; please retry.", 503);
  }
  const cryptoAmount = roundCrypto(amount * fiatToUsdRate / usdPerCoin, settings.currency);
  if (!(cryptoAmount > 0)) throw new OnwardDeliveryError("This delivery amount is too small for the selected cryptocurrency.");
  const result = await db.transaction(async tx => {
    const order = await onwardOrderAccess(tx, orderId, actor, "reshipper", gbId, true);
    const lockedAssignment = await assignment(tx, gbId, actor.username, true);
    if (assigned.id !== lockedAssignment.id || !canCreate(order)) throw new OnwardDeliveryError("The assignment or order changed. Refresh before requesting payment.", 409);
    const liveSettings = parseOnwardPaymentSettings(await read(tx, settingsKey(assigned.id)) ?? DEFAULT_ONWARD_PAYMENT_SETTINGS);
    if (JSON.stringify(liveSettings) !== JSON.stringify(settings)) throw new OnwardDeliveryError("Your onward wallet settings changed. Please retry.", 409);
    const ledger = await read<OnwardLedger>(tx, ledgerKey(orderId)) ?? emptyLedger();
    const replay = [ledger.request, ...ledger.history].find(r => r?.idempotencyKey === idempotencyKey);
    if (replay) {
      if (replay.assignmentId !== assigned.id || replay.amount !== amount || replay.currency !== currency
        || replay.method !== body.method || replay.note !== String(body.note ?? "").trim()) {
        throw new OnwardDeliveryError("That request reference already belongs to a different delivery charge.", 409);
      }
      return { data: await envelope(tx, order, "reshipper"), created: false, request: replay };
    }
    if (ledger.request && ledger.request.status !== "cancelled") throw new OnwardDeliveryError("This order already has an onward-delivery payment request. Resolve it before creating another.", 409);
    const [count] = await tx.select({ kits: sql<string>`coalesce(sum(${orderLineItemsTable.quantity}), 0)` })
      .from(orderLineItemsTable).where(eq(orderLineItemsTable.orderId, orderId));
    if (order.shippingCountry !== before.shippingCountry || Number(count?.kits ?? 0) !== estimate.kits) {
      throw new OnwardDeliveryError("The destination or kit quantity changed. Refresh the estimate before requesting payment.", 409);
    }
    if (ledger.request) ledger.history.push(ledger.request);
    ledger.request = {
      id: randomUUID(), orderId, assignmentId: assigned.id, idempotencyKey,
      status: "unpaid", amount, currency: currency as OnwardCharge["currency"], method: body.method as OnwardCharge["method"],
      note: String(body.note ?? "").trim(), reshipperUsername: assigned.reshipperUsername,
      wallet: { currency: settings.currency, network: settings.network, walletAddress: settings.walletAddress },
      cryptoAmount, fiatToUsdRate, usdPerCoin, confirmationMode: settings.confirmationMode,
      txHash: null, verificationNote: null, createdAt: new Date().toISOString(), submittedAt: null,
      confirmedAt: null, confirmedBy: null, attempts: [],
    };
    await put(tx, ledgerKey(orderId), ledger);
    return { data: await envelope(tx, order, "reshipper"), created: true, request: ledger.request! };
  });
  if (result.created) {
    await audit("requested", orderId, result.request!, actor.username);
    // Existing preferences apply. Failure never turns a committed request into a retry.
    await notify(before.telegramUsername,
      `Your reshipper has requested ${amount.toFixed(2)} ${currency} for onward delivery on order #${before.code}. Open My Orders to see the separate delivery payment details. Your product payment is unchanged.`);
  }
  return result.data;
}

/** Additional anti-replay fence used by original product-payment submission. */
export async function hasOnwardPaymentTransaction(hash: string, database: DataAccess = db) {
  const [claim] = await database.select({ key: siteConfigTable.key }).from(siteConfigTable).where(and(
    like(siteConfigTable.key, "gb_onward_tx:%"), sql`${siteConfigTable.value}::jsonb->>'canonicalHash' = ${canonicalHash(hash)}`,
  )).limit(1);
  return !!claim;
}
export async function reserveProductPaymentTransaction(hash: string, orderId: string) {
  const key = paymentClaimKey(hash);
  const inserted = await db.insert(siteConfigTable).values({
    key, value: JSON.stringify({ kind: "product", orderId }),
  }).onConflictDoNothing({ target: siteConfigTable.key }).returning({ key: siteConfigTable.key });
  if (inserted.length) return true;
  const owner = await read<{ kind: string; orderId: string }>(db, key);
  return owner?.kind === "product" && owner.orderId === orderId;
}
async function assertNotProductPayment(database: DataAccess, hash: string) {
  const normal = canonicalHash(hash);
  const matches = (column: any) => sql`regexp_replace(${/^(?:0x)?[a-f0-9]+$/i.test(hash) ? sql`lower(${column})` : column}, '^0x', '') = ${normal}`;
  const [usedOrder] = await database.select({ id: ordersTable.id }).from(ordersTable).where(sql`(
    ${matches(ordersTable.paymentTxHash)} OR ${matches(ordersTable.testPaymentTxHash)} OR ${matches(ordersTable.balanceTxHash)}
    OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(COALESCE(${ordersTable.paymentTxHashes}, '[]'::jsonb)) AS h(value)
      WHERE regexp_replace(${/^(?:0x)?[a-f0-9]+$/i.test(hash) ? sql`lower(h.value)` : sql`h.value`}, '^0x', '') = ${normal})
  )`).limit(1);
  const [usedShare] = await database.select({ id: wholesaleSharesTable.id }).from(wholesaleSharesTable)
    .where(matches(wholesaleSharesTable.organiserPaymentTxHash)).limit(1);
  if (usedOrder || usedShare) throw new OnwardDeliveryError("This transaction already belongs to a product payment. Onward delivery needs a separate payment.", 409);
}
export async function submitOnwardPayment(orderId: string, requestId: string, actor: UpdateActor, txHash: unknown) {
  const changed = await db.transaction(async tx => {
    const order = await onwardOrderAccess(tx, orderId, actor, "member", undefined, true);
    const ledger = await read<OnwardLedger>(tx, ledgerKey(orderId)) ?? emptyLedger();
    const request = assertMatches(ledger.request, requestId);
    const assigned = await currentAssignment(tx, order);
    if (!canCreate(order) || assigned?.id !== request.assignmentId) throw new OnwardDeliveryError("The order or reshipper assignment changed. Contact your organiser before paying.", 409);
    const hash = validateOnwardTx(txHash, request.wallet.network);
    if ((request.status === "pending_confirmation" || request.status === "paid") && request.txHash
      && onwardTxIdentity(request.txHash, request.wallet.network) === onwardTxIdentity(hash, request.wallet.network)) return false;
    assertOnwardTransition(request.status, "submit");
    await assertNotProductPayment(tx, hash);
    const globalKey = paymentClaimKey(hash);
    const globalInserted = await tx.insert(siteConfigTable).values({
      key: globalKey, value: JSON.stringify({ kind: "onward", requestId, orderId }),
    }).onConflictDoNothing({ target: siteConfigTable.key }).returning({ key: siteConfigTable.key });
    if (!globalInserted.length && (await read<{ requestId?: string }>(tx, globalKey))?.requestId !== requestId) {
      throw new OnwardDeliveryError("This transaction is already reserved by another payment. Each transfer can only pay one charge.", 409);
    }
    const key = claimKey(hash, request.wallet.network);
    const inserted = await tx.insert(siteConfigTable).values({ key, value: JSON.stringify({
      requestId, orderId, canonicalHash: canonicalHash(hash),
    }) }).onConflictDoNothing({ target: siteConfigTable.key }).returning({ key: siteConfigTable.key });
    if (!inserted.length && (await read<{ requestId: string }>(tx, key))?.requestId !== requestId) {
      throw new OnwardDeliveryError("This transaction is already being used for another onward-delivery payment.", 409);
    }
    request.txHash = hash; request.status = "pending_confirmation"; request.submittedAt = new Date().toISOString();
    delete request.lastCheckedAt;
    request.verificationNote = request.confirmationMode === "manual" ? "Waiting for your reshipper to confirm receipt." : "Checking the blockchain. Confirmation can take a few minutes.";
    await put(tx, ledgerKey(orderId), ledger);
    return true;
  });
  await verifyOnwardPayment(orderId, requestId);
  const data = await readOnwardPayment(orderId, actor, "member");
  if (data.request && changed) {
    await audit("submitted", orderId, data.request, actor.username);
    const order = await onwardOrderAccess(db, orderId, actor, "member");
    if (order.reshipperUsername) await notify(order.reshipperUsername,
      `An onward-delivery payment was submitted for order #${order.code}. Open the group buy's Shipping tab to review its separate delivery payment.`);
  }
  return data;
}
export async function manageOnwardPayment(gbId: string, orderId: string, requestId: string, actor: UpdateActor,
  action: "confirm" | "reject" | "cancel", reason?: unknown) {
  const result = await db.transaction(async tx => {
    const order = await onwardOrderAccess(tx, orderId, actor, "reshipper", gbId, true);
    const ledger = await read<OnwardLedger>(tx, ledgerKey(orderId)) ?? emptyLedger();
    const request = assertMatches(ledger.request, requestId);
    if ((await assignment(tx, gbId, actor.username)).id !== request.assignmentId) throw new OnwardDeliveryError("This payment belongs to the previous reshipper.", 409);
    if ((action === "confirm" && request.status === "paid") || (action === "cancel" && request.status === "cancelled")) {
      return { data: await envelope(tx, order, "reshipper"), changed: false, username: order.telegramUsername, code: order.code };
    }
    assertOnwardTransition(request.status, action);
    if (action === "confirm") {
      if (!request.txHash) throw new OnwardDeliveryError("The member needs to submit a transaction ID before confirmation.", 409);
      await assertNotProductPayment(tx, request.txHash);
      request.status = "paid"; request.confirmedAt = new Date().toISOString(); request.confirmedBy = actor.username;
      request.verificationNote = "Receipt confirmed manually by your reshipper.";
    } else if (action === "cancel") {
      request.status = "cancelled"; request.verificationNote = "This onward-delivery payment request was cancelled.";
    } else {
      if (typeof reason !== "string" || !reason.trim() || reason.length > 1000) throw new OnwardDeliveryError("Enter a short reason so the member knows what to correct.");
      if (request.txHash) {
        request.attempts.push({ txHash: request.txHash, reason: reason.trim(), rejectedAt: new Date().toISOString() });
        await tx.delete(siteConfigTable).where(and(eq(siteConfigTable.key, claimKey(request.txHash, request.wallet.network)),
          sql`${siteConfigTable.value}::jsonb->>'requestId' = ${request.id}`));
        await tx.delete(siteConfigTable).where(and(eq(siteConfigTable.key, paymentClaimKey(request.txHash)),
          sql`${siteConfigTable.value}::jsonb->>'requestId' = ${request.id}`));
      }
      request.status = "unpaid"; request.txHash = null; request.submittedAt = null; request.verificationNote = reason.trim();
    }
    await put(tx, ledgerKey(orderId), ledger);
    return { data: await envelope(tx, order, "reshipper"), changed: true, username: order.telegramUsername, code: order.code };
  });
  if (result.changed && result.data.request) {
    await audit(action, orderId, result.data.request, actor.username);
    await notify(result.username, action === "confirm"
      ? `Your onward-delivery payment for order #${result.code} was confirmed by your reshipper. Your product payment is unchanged.`
      : action === "reject" ? `Your reshipper could not confirm the onward-delivery transaction for order #${result.code}. Open My Orders to see their explanation before sending anything else.`
        : `The onward-delivery payment request for order #${result.code} was cancelled. Do not pay that request.`);
  }
  return result.data;
}

/** Provider work is outside locks; the complete request/assignment identity is rechecked before writing. */
export async function verifyOnwardPayment(orderId: string, requestId: string) {
  const snapshot = await db.transaction(async tx => {
    const [order] = await tx.select().from(ordersTable).where(eq(ordersTable.id, orderId)).for("update");
    if (!order || order.deletedAt) return null;
    const ledger = await read<OnwardLedger>(tx, ledgerKey(orderId));
    const current = ledger?.request;
    if (!current || current.id !== requestId || current.status !== "pending_confirmation"
      || current.confirmationMode !== "automatic" || !current.txHash) return null;
    if (current.lastCheckedAt && Date.now() - Date.parse(current.lastCheckedAt) < 30_000) return null;
    if ((await currentAssignment(tx, order))?.id !== current.assignmentId) return null;
    current.lastCheckedAt = new Date().toISOString();
    await put(tx, ledgerKey(orderId), ledger);
    return current;
  });
  if (!snapshot || !snapshot.txHash) return;
  let verified = false, note = "Blockchain verification is temporarily unavailable. Your reshipper can confirm receipt manually.";
  try {
    const result = await verifyTransaction(snapshot.txHash, snapshot.wallet.walletAddress,
      snapshot.cryptoAmount, snapshot.wallet.currency, snapshot.wallet.network, 0.01);
    if (result.verified && canAutoConfirmOnward(snapshot.confirmationMode, result)
      && result.blockConfirmations >= 1 && result.amountUsdt >= snapshot.cryptoAmount * 0.99) {
      const paidAt = await onwardTransactionTime(snapshot.txHash, snapshot.wallet.network);
      // Allow a small block-clock skew, never an unrelated historical receipt.
      verified = paidAt !== null && paidAt >= Date.parse(snapshot.createdAt) - 120_000;
      note = verified ? "Onward-delivery payment verified on the blockchain." : paidAt === null
        ? "Could not confirm the transaction date yet. Retrying; your reshipper can also check manually."
        : "This transfer predates the delivery payment request. Your reshipper needs to review it.";
    } else if (!result.verified) note = result.reason || "Waiting for blockchain confirmation.";
    else note = "The transfer does not yet meet the amount and confirmation requirements. Your reshipper can review it.";
  } catch (error) { console.error("[onward-payment:verify]", error instanceof Error ? error.message : "Verification failed"); }
  const result = await db.transaction(async tx => {
    const [order] = await tx.select().from(ordersTable).where(eq(ordersTable.id, orderId)).for("update");
    if (!order || order.deletedAt) return null;
    const ledger = await read<OnwardLedger>(tx, ledgerKey(orderId));
    const current = ledger?.request;
    if (!current || current.id !== snapshot.id || current.status !== "pending_confirmation" || current.txHash !== snapshot.txHash
      || JSON.stringify(current.wallet) !== JSON.stringify(snapshot.wallet) || current.cryptoAmount !== snapshot.cryptoAmount) return null;
    if ((await currentAssignment(tx, order))?.id !== current.assignmentId) {
      current.verificationNote = "Reshipper assignment changed. Your organiser must resolve this payment.";
      await put(tx, ledgerKey(orderId), ledger);
      return null;
    }
    await assertNotProductPayment(tx, current.txHash!);
    const claim = await read<{ requestId: string }>(tx, claimKey(current.txHash!, current.wallet.network));
    if (claim?.requestId !== current.id) return null;
    current.verificationNote = note;
    if (verified) { current.status = "paid"; current.confirmedAt = new Date().toISOString(); current.confirmedBy = "automatic"; }
    await put(tx, ledgerKey(orderId), ledger);
    return verified ? { request: current, username: order.telegramUsername, code: order.code } : null;
  });
  if (result) {
    await audit("automatically_confirmed", orderId, result.request, "automatic");
    await notify(result.username, `Your onward-delivery payment for order #${result.code} was verified on the blockchain. Your product payment is unchanged.`);
  }
}
let retryRunning = false;
export async function retryOnwardPayments() {
  if (retryRunning) return;
  retryRunning = true;
  try {
    const rows = await db.select({ value: siteConfigTable.value }).from(siteConfigTable).where(and(
      like(siteConfigTable.key, "gb_onward_charge:%"),
      sql`${siteConfigTable.value}::jsonb->'request'->>'status' = 'pending_confirmation'`,
      sql`${siteConfigTable.value}::jsonb->'request'->>'confirmationMode' = 'automatic'`,
    ));
    for (const row of rows) {
      if (!row.value) continue;
      const request = (JSON.parse(row.value) as OnwardLedger).request;
      if (request) await verifyOnwardPayment(request.orderId, request.id).catch(error => console.error("[onward-payment:retry]", error));
    }
  } finally { retryRunning = false; }
}
export function startOnwardPaymentAutoVerify() {
  void import("./scheduler-registry").then(({ registerScheduler }) => registerScheduler({
    name: "gb-onward-payment-auto-verify", label: "GB onward-delivery payments",
    description: "Verifies separate reshipper-owned onward-delivery charges without altering product payments.",
    defaultIntervalMs: 300_000, minIntervalMs: 60_000, maxIntervalMs: 3_600_000,
    initialDelayMs: 120_000, run: retryOnwardPayments,
  }));
}
