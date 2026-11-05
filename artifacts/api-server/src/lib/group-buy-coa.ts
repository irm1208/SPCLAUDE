import { randomUUID } from "node:crypto";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import {
  db, groupBuysTable as groups, ordersTable as orders, siteConfigTable,
  groupBuyCoaSettingsTable as settings, groupBuyCoaRequestsTable as requests, auditLogsTable,
} from "@workspace/db";
import { coaCanClaim, coaConfig, coaDetails, coaHash, CoaError, EMPTY_COA_CONFIG, holdsCoaPlace, publicCoaRequest } from "./coa-rules";
import { fetchFiatToUsd } from "./crypto-pricing";
import { verifyTransaction } from "./payment-verify";
import { validateOnwardTx, parseOnwardPaymentSettings } from "./gb-onward-payment-rules";
import { onwardTransactionTime } from "./gb-onward-chain-time";
import { queueCoaNotification } from "./coa-notifications";
import { coaCertificateStore, validateCoaPdf, removeCoaPdf, type CoaCertificateStore } from "./coa-certificates";

type RequestRow = typeof requests.$inferSelect;
const canonical = (name: string) => name.replace(/^@/, "").toLowerCase();
const activeOrder = (o: any) => o && o.groupBuyId && !["wholesale", "wholesale_shared"].includes(o.orderType ?? "")
  && !o.deletedAt && !["Cancelled", "Refunded"].includes(o.status);
const paidStates = ["paid", "processing", "completed"];
const effectiveStatus = (r: RequestRow) => r.status === "reserved" && !holdsCoaPlace(r) ? "expired" : r.status;
const actorNote = (value: unknown) => {
  if (typeof value !== "string" || value.trim().length < 5 || value.length > 2000)
    throw new CoaError("Record a receipt/reason note of 5–2,000 characters.");
  return value.trim();
};
async function audit(tx: any, action: string, actor: string, id: string, metadata: any = {}) {
  await tx.insert(auditLogsTable).values({ type: "change", action: `coa_${action}`,
    message: `COA ${action}`, metadata: { actor, id, ...metadata } });
}
export type CoaOrganiserAccess = { groupBuyId: string; username: string; adminGbId?: string };
function checkOrganiserGroup(group: typeof groups.$inferSelect | undefined, access: CoaOrganiserAccess) {
  if (!group || group.id !== access.groupBuyId ||
    (access.adminGbId ? access.adminGbId !== group.id : canonical(group.organiserId ?? "") !== canonical(access.username)))
    throw new CoaError("Group buy not found.", 404);
}
export async function assertCoaOrganiserAccess(access: CoaOrganiserAccess, database = db) {
  const [group] = await database.select().from(groups).where(eq(groups.id, access.groupBuyId));
  checkOrganiserGroup(group, access);
}
async function lockGroup(tx: any, id: string, access?: CoaOrganiserAccess) {
  const [group] = await tx.select().from(groups).where(eq(groups.id, id)).for("update");
  if (!group) throw new CoaError("Group buy not found.", 404);
  if (access) checkOrganiserGroup(group, access);
  // All capacity mutations acquire this parent lock first, including expiry.
  await tx.update(requests).set({ status: "expired", updatedAt: new Date() }).where(and(
    eq(requests.groupBuyId, id), eq(requests.source, "public"), eq(requests.status, "reserved"),
    isNull(requests.txHash), isNull(requests.reference), sql`${requests.expiresAt} <= now()`,
  ));
  return group;
}
async function config(tx: any, id: string) {
  const [row] = await tx.select().from(settings).where(eq(settings.groupBuyId, id));
  return configFromRow(row);
}
function configFromRow(row: typeof settings.$inferSelect | undefined | null) {
  return row ? { mode: row.mode, fee: Number(row.fee), currency: row.currency, cap: row.cap,
    rails: row.rails, manualInstructions: row.manualInstructions } : { ...EMPTY_COA_CONFIG };
}
async function commitments(tx: any, id: string) {
  const all: RequestRow[] = await tx.select().from(requests).where(eq(requests.groupBuyId, id));
  return all.filter(r => holdsCoaPlace(r)).length;
}
async function owned(tx: any, orderId: string, username: string) {
  const [hint] = await tx.select({ groupBuyId: orders.groupBuyId }).from(orders).where(eq(orders.id, orderId));
  if (!hint?.groupBuyId) throw new CoaError("Group-buy order not found.", 404);
  await lockGroup(tx, hint.groupBuyId);
  const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
  if (!order || canonical(order.telegramUsername) !== canonical(username))
    throw new CoaError("Order not found.", 404);
  if (order.groupBuyId !== hint.groupBuyId || ["wholesale", "wholesale_shared"].includes(order.orderType ?? ""))
    throw new CoaError("COAs are available on group-buy orders only.", 404);
  return order;
}
async function orderRequest(tx: any, orderId: string): Promise<RequestRow | undefined> {
  const [row] = await tx.select().from(requests).where(eq(requests.orderId, orderId));
  return row;
}
function serialise(r: RequestRow | undefined, order: any, group: any, admin = false) {
  if (!r) return null;
  const row = { ...r, status: effectiveStatus(r), fee: Number(r.fee),
    member: order.telegramUsername, orderCode: order.code, groupName: group.name };
  const publicRow = publicCoaRequest(row);
  return admin ? { ...row, certificate: publicRow.certificate } : publicRow;
}
async function memberView(tx: any, order: any) {
  // Read settings + group together, and reuse the capacity rows for the current
  // request. Avoid re-reading the same request/config on every mutation response.
  const [info] = await tx.select({ group: { name: groups.name }, settings })
    .from(groups).leftJoin(settings, eq(settings.groupBuyId, groups.id))
    .where(eq(groups.id, order.groupBuyId));
  if (!info) throw new CoaError("Group buy not found.", 404);
  const cfg = configFromRow(info.settings);
  const all: RequestRow[] = await tx.select().from(requests).where(eq(requests.groupBuyId, order.groupBuyId));
  const request = all.find(r => r.orderId === order.id);
  const available = Math.max(0, cfg.cap - all.filter(r => holdsCoaPlace(r)).length);
  const hasPlace = !!request && holdsCoaPlace(request);
  const eligible = !!activeOrder(order) && coaCanClaim(cfg.mode, available, hasPlace);
  const reason = !activeOrder(order) ? "This order is no longer eligible for a new COA request."
    : eligible ? null : cfg.mode === "disabled" ? "COA requests are closed."
      : cfg.mode === "selected" ? "COA requests are by Admin invitation only." : "All COA places are taken.";
  // Committed price and instructions survive later setting changes/closure.
  const shownConfig = request
    ? { ...cfg, fee: Number(request.fee), currency: request.currency, rails: request.rails, manualInstructions: request.manualInstructions } : cfg;
  return { eligible, reason, available, config: shownConfig, request: serialise(request, order, info.group) };
}
export async function getMemberCoa(orderId: string, username: string, database = db) {
  // Status polling must not lock the whole group or the product order, or expire
  // reservations. holdsCoaPlace/effectiveStatus already handle expiry for reads.
  // Every mutation still uses owned()/lockGroup() to serialize capacity/payment.
  const [order] = await database.select().from(orders).where(eq(orders.id, orderId));
  if (!order || !order.groupBuyId || canonical(order.telegramUsername) !== canonical(username))
    throw new CoaError("Order not found.", 404);
  if (["wholesale", "wholesale_shared"].includes(order.orderType ?? ""))
    throw new CoaError("COAs are available on group-buy orders only.", 404);
  return memberView(database, order);
}
/** No signed/public URLs: ownership is resolved from the live order on every download. */
export async function downloadCoaCertificate(orderId: string, username: string, database = db,
  store?: CoaCertificateStore): Promise<Buffer> {
  return database.transaction(async tx => {
    const order = await owned(tx, orderId, username);
    const request = await orderRequest(tx, order.id);
    if (!request?.certificate || request.status !== "completed" || order.deletedAt)
      throw new CoaError("Certificate not available.", 404);
    const result = await (store ?? coaCertificateStore()).downloadAsBytes(request.certificate.key);
    if (!result.ok) throw new CoaError("The certificate could not be loaded. Please try again.", 503);
    return result.value[0];
  });
}

/** Serialize replacements with all request transitions; preserve the old file on upload/DB failure. */
export async function attachCoaCertificate(requestId: string, actor: string,
  file: { buffer: Buffer; originalname: string; mimetype: string }, database = db, store?: CoaCertificateStore,
  access?: CoaOrganiserAccess) {
  await validateCoaPdf(file.buffer, file.originalname, file.mimetype);
  const key = `private/coa-certificates/${randomUUID()}.pdf`;
  let uploaded = false;
  let oldKey: string | undefined;
  const storage = store ?? coaCertificateStore();
  try {
    await database.transaction(async tx => {
      const [hint] = await tx.select().from(requests).where(eq(requests.id, requestId));
      if (!hint) throw new CoaError("COA request not found.", 404);
      await lockGroup(tx, hint.groupBuyId, access);
      const [r] = await tx.select().from(requests).where(eq(requests.id, requestId)).for("update");
      if (!r || r.status !== "completed") throw new CoaError("Complete the paid COA request before attaching a certificate.", 409);
      const result = await storage.uploadFromBytes(key, file.buffer, { compress: false });
      if (!result.ok) throw new CoaError("The certificate could not be stored. Please try again.", 503);
      uploaded = true;
      oldKey = r.certificate?.key;
      await tx.update(requests).set({ certificate: { key, size: file.buffer.length,
        attachedAt: new Date().toISOString(), attachedBy: actor }, updatedAt: new Date() }).where(eq(requests.id, requestId));
      await audit(tx, oldKey ? "certificate_replaced" : "certificate_attached", actor, requestId);
    });
  } catch (error) {
    if (uploaded) await removeCoaPdf(key, storage).catch(() => console.error("[COA] Unused certificate cleanup failed."));
    throw error;
  }
  if (oldKey) await removeCoaPdf(oldKey, storage).catch(() => console.error("[COA] Replaced certificate cleanup failed."));
  return { attached: true };
}
export async function saveMemberCoa(orderId: string, username: string, body: unknown, database = db) {
  const details = coaDetails(body);
  return database.transaction(async tx => {
    const order = await owned(tx, orderId, username);
    if (!activeOrder(order)) throw new CoaError("This order is no longer eligible.", 409);
    const previous = await orderRequest(tx, orderId);
    if (previous && (paidStates.includes(previous.status) || previous.txHash || previous.reference)) {
      if (Object.entries(details).every(([k, value]) => previous[k as keyof typeof details] === value))
        return memberView(tx, order);
      throw new CoaError("Details are locked after payment submission. Ask Admin for a correction.", 409);
    }
    const cfg = await config(tx, order.groupBuyId!);
    const hasPlace = !!previous && holdsCoaPlace(previous);
    if (!coaCanClaim(cfg.mode, cfg.cap - await commitments(tx, order.groupBuyId!), hasPlace))
      throw new CoaError(cfg.mode === "open" ? "All COA places are taken." : "COA requests are not open for this order.", 409);
    // An existing request keeps its quoted terms even after an unpaid place is
    // released. Re-reserving must never silently charge a newly increased fee.
    const snapshot = previous ? { fee: previous.fee, currency: previous.currency,
      rails: previous.rails, manualInstructions: previous.manualInstructions, source: hasPlace ? previous.source : "public" }
      : { fee: String(cfg.fee), currency: cfg.currency, rails: cfg.rails, manualInstructions: cfg.manualInstructions, source: "public" };
    const expiresAt = snapshot.source === "invited" ? null
      : hasPlace ? previous!.expiresAt : new Date(Date.now() + 24 * 60 * 60 * 1000);
    const values = { ...snapshot, ...details, status: Number(snapshot.fee) === 0 ? "paid" : "reserved",
      expiresAt, updatedAt: new Date() };
    if (previous) await tx.update(requests).set({ ...values, ...(!hasPlace ? { payment: null } : {}) }).where(eq(requests.id, previous.id));
    else await tx.insert(requests).values({ ...values, id: randomUUID(), orderId, groupBuyId: order.groupBuyId!, createdBy: username });
    await audit(tx, "details", username, orderId);
    return memberView(tx, order);
  });
}
export async function availableCoaRails(database = db) {
  const { getAdminCryptoOptions } = await import("../routes/payments");
  return (await getAdminCryptoOptions(database)).filter(r => ["USDT", "USDC"].includes(r.currency));
}
export async function saveCoaSettings(groupId: string, actor: string, input: unknown, database = db, access?: CoaOrganiserAccess) {
  const cfg = coaConfig(input);
  const available = access ? [] : await availableCoaRails(database);
  if (access) {
    for (const rail of cfg.rails) {
      try {
        parseOnwardPaymentSettings({ ...rail, enabled: true, network: rail.network === "ERC-20" ? "Ethereum" : rail.network });
      } catch { throw new CoaError("Enter a valid stablecoin wallet address and supported network."); }
    }
    const keys = cfg.rails.map(r => `${r.currency}|${r.network === "ERC-20" ? "Ethereum" : r.network}`);
    if (new Set(keys).size !== keys.length) throw new CoaError("Choose only one wallet per currency and network.");
  }
  return database.transaction(async tx => {
    await lockGroup(tx, groupId, access);
    if (!access) {
      const existing = await config(tx, groupId);
      const allowed = [...available, ...existing.rails];
      if (cfg.rails.some(r => !allowed.some(a => a.currency === r.currency && a.network === r.network && a.walletAddress === r.walletAddress)))
        throw new CoaError("Select an existing Admin payment destination. Reload the available payment methods.");
    }
    if (cfg.cap < await commitments(tx, groupId)) throw new CoaError("The limit cannot be lower than the number of committed COA places.", 409);
    const values = { ...cfg, groupBuyId: groupId, fee: String(cfg.fee), updatedAt: new Date() };
    await tx.insert(settings).values(values).onConflictDoUpdate({ target: settings.groupBuyId, set: values });
    await audit(tx, "settings", actor, groupId, { mode: cfg.mode, fee: cfg.fee, currency: cfg.currency, cap: cfg.cap });
    return cfg;
  });
}
export async function inviteCoa(groupId: string, actor: string, input: any, database = db, access?: CoaOrganiserAccess) {
  if (!Array.isArray(input?.orderIds) || !input.orderIds.length || input.orderIds.length > 500
    || input.orderIds.some((id: unknown) => typeof id !== "string")) throw new CoaError("Select 1–500 orders to invite.");
  const ids: string[] = [...new Set<string>(input.orderIds)];
  return database.transaction(async tx => {
    await lockGroup(tx, groupId, access);
    const cfg = await config(tx, groupId);
    if (cfg.mode === "disabled") throw new CoaError("Enable COA settings before inviting members.");
    const selected = await tx.select().from(orders).where(and(eq(orders.groupBuyId, groupId), inArray(orders.id, ids))).for("update");
    if (selected.length !== ids.length || selected.some((o: any) => !activeOrder(o)))
      throw new CoaError("Every invitation must be for an active order in this group buy.");
    let committed = await commitments(tx, groupId);
    for (const o of selected) {
      const previous = await orderRequest(tx, o.id);
      if (previous && (holdsCoaPlace(previous) || previous.txHash || previous.reference)) continue;
      if (++committed > cfg.cap) throw new CoaError("These invitations would exceed the COA place limit.", 409);
      const values = { source: "invited", status: "invited", fee: previous?.fee ?? String(cfg.fee), currency: previous?.currency ?? cfg.currency,
        rails: previous?.rails ?? cfg.rails, manualInstructions: previous?.manualInstructions ?? cfg.manualInstructions,
        expiresAt: null, payment: null, updatedAt: new Date() };
      const id = previous?.id ?? randomUUID();
      if (previous) await tx.update(requests).set(values).where(eq(requests.id, previous.id));
      else await tx.insert(requests).values({ ...values, id, orderId: o.id, groupBuyId: groupId, createdBy: actor });
      await queueCoaNotification(tx, { id, orderId: o.id, fee: values.fee, currency: values.currency }, "invited");
    }
    await audit(tx, "invite", actor, groupId, { orderIds: ids });
    return { ok: true };
  });
}
export async function coaPaymentInstructions(orderId: string, username: string, input: any, database = db) {
  return database.transaction(async tx => {
    const order = await owned(tx, orderId, username);
    const r = await orderRequest(tx, orderId);
    if (!r || !activeOrder(order) || !holdsCoaPlace(r) || r.status !== "reserved")
      throw new CoaError("Reserve a COA place and complete its details before paying.", 409);
    if (r.txHash || r.reference) throw new CoaError("Payment has already been submitted.", 409);
    const rail = r.rails.find(a => a.currency === input?.currency && a.network === input?.network);
    if (!rail) throw new CoaError("Choose an available COA payment method.");
    if (r.payment) {
      if (r.payment.currency !== rail.currency || r.payment.network !== rail.network)
        throw new CoaError("Payment instructions are locked. Use the displayed currency and network or ask Admin.", 409);
      return memberView(tx, order);
    }
    let rate: number;
    try { rate = await fetchFiatToUsd(r.currency, { strict: true }); }
    catch { throw new CoaError("The exchange rate is unavailable. No payment instructions were created; please retry.", 503); }
    const payment = { ...rail, amount: Math.ceil(Number(r.fee) * rate * 100) / 100, quotedAt: new Date().toISOString() };
    if (!Number.isFinite(payment.amount) || payment.amount <= 0) throw new CoaError("Invalid COA payment amount.", 409);
    await tx.update(requests).set({ payment, updatedAt: new Date() }).where(eq(requests.id, r.id));
    await audit(tx, "instructions", username, r.id, { payment });
    return memberView(tx, order);
  });
}

/** All historic incoming-payment stores, plus the existing cross-flow claim fence. */
async function reserveCoaTransaction(tx: any, hash: string, requestId: string) {
  const normal = coaHash(hash);
  const match = (column: any) => sql`CASE WHEN ${column} ~* '^(0x)?[a-f0-9]+$'
    THEN regexp_replace(lower(${column}), '^0x', '') ELSE ${column} END = ${normal}`;
  const historic = await tx.execute(sql`SELECT 1 FROM (
    SELECT payment_tx_hash AS hash FROM orders UNION ALL SELECT test_payment_tx_hash FROM orders
    UNION ALL SELECT balance_tx_hash FROM orders
    UNION ALL SELECT jsonb_array_elements_text(COALESCE(payment_tx_hashes, '[]'::jsonb)) FROM orders
    UNION ALL SELECT organiser_payment_tx_hash FROM wholesale_shares
    UNION ALL SELECT payment_tx_hash FROM pool_participants
    UNION ALL SELECT payment_tx_hash FROM gb_entry_fee_payments
    UNION ALL SELECT tx_hash FROM gb_testing_contributions
    UNION ALL SELECT payment_tx_hash FROM wholesale_access_requests
    UNION ALL SELECT test_payment_tx_hash FROM wholesale_access_requests
    UNION ALL SELECT payment_tx_hash FROM vial_orders
  ) evidence WHERE ${match(sql`hash`)} LIMIT 1`);
  if (historic.rows.length) throw new CoaError("This transaction already belongs to another payment. COA fees need a separate transfer.", 409);
  const key = `crypto_payment_tx:${normal}`;
  const inserted = await tx.insert(siteConfigTable).values({ key, value: JSON.stringify({ kind: "coa", requestId }) })
    .onConflictDoNothing({ target: siteConfigTable.key }).returning({ key: siteConfigTable.key });
  if (!inserted.length) {
    const [row] = await tx.select().from(siteConfigTable).where(eq(siteConfigTable.key, key));
    const claim = JSON.parse(row.value);
    if (claim.kind !== "coa" || claim.requestId !== requestId)
      throw new CoaError("This transaction is reserved by another payment.", 409);
  }
}
export async function submitCoaPayment(orderId: string, username: string, input: any, database = db,
  verifier = verifyTransaction, transactionTime = onwardTransactionTime) {
  const submitted = await database.transaction(async tx => {
    const order = await owned(tx, orderId, username);
    const r = await orderRequest(tx, orderId);
    if (!r) throw new CoaError("COA request not found.", 404);
    // Idempotent terminal replay; never rerun a transfer after confirmation.
    if (paidStates.includes(r.status)) return { id: r.id, payment: null, hash: null };
    coaDetails(r);
    if (!["reserved", "expired", "review"].includes(r.status)) throw new CoaError("This request cannot accept payment.", 409);
    let hash: string | null = null;
    let reference: string | null = null;
    if (input?.txHash) {
      if (!r.payment) throw new CoaError("Select COA payment instructions before submitting a transaction.");
      hash = validateOnwardTx(input.txHash, /solana/i.test(r.payment.network) ? "Solana" : /tron|trc/i.test(r.payment.network) ? "TRON" : "Ethereum");
      if (r.txHash && coaHash(r.txHash) !== coaHash(hash) || r.reference) throw new CoaError("Payment evidence is already recorded. Contact Admin before changing it.", 409);
      await reserveCoaTransaction(tx, hash, r.id);
    } else {
      if (!r.manualInstructions || typeof input?.reference !== "string" || input.reference.trim().length < 3 || input.reference.length > 500)
        throw new CoaError("Enter the payment reference (3–500 characters) for the displayed manual payment method.");
      reference = input.reference.trim();
      if (r.txHash || r.reference && r.reference !== reference) throw new CoaError("Payment evidence is already recorded. Contact Admin before changing it.", 409);
    }
    // An expired place does not reappear merely because a member submits evidence.
    // Keep it expired with evidence; only Admin can allocate capacity and confirm.
    const late = r.status === "expired";
    const message = late ? "Payment submitted after the reservation expired. Admin must review payment and available capacity."
      : hash ? "Checking the payment. If not yet confirmed, retry verification or contact Admin."
        : "Awaiting Admin confirmation of payment receipt.";
    await tx.update(requests).set({ txHash: hash, reference, status: late ? "expired" : "review",
      submittedAt: r.submittedAt ?? new Date(), verificationMessage: message, updatedAt: new Date() }).where(eq(requests.id, r.id));
    await audit(tx, "payment_submitted", username, r.id, { txHash: hash, reference, late });
    return { id: r.id, payment: !late ? r.payment : null, hash };
  });
  if (submitted.hash && submitted.payment) {
    let result: Awaited<ReturnType<typeof verifyTransaction>>;
    try { result = await verifier(submitted.hash, submitted.payment.walletAddress, submitted.payment.amount,
      submitted.payment.currency, submitted.payment.network, 0.01, submitted.id); }
    catch { result = { verified: false, reason: "Tracking the payment is temporarily unavailable. Retry verification; your evidence is saved." }; }
    if (result.verified) {
      const network = submitted.payment.network;
      const canonicalNetwork = /solana/i.test(network) ? "Solana" : /tron|trc/i.test(network) ? "TRON"
        : /arbitrum/i.test(network) ? "Arbitrum" : /polygon/i.test(network) ? "Polygon"
          : /bsc|bep/i.test(network) ? "BSC" : "Ethereum";
      let chainTime: number | null = null;
      try { chainTime = await transactionTime(submitted.hash, canonicalNetwork); } catch { /* retain evidence for review */ }
      if (chainTime === null) result = { verified: false, reason: "Payment amount matched, but its transfer date could not be checked. Retry or ask Admin to review." };
      else if (!submitted.payment.quotedAt || chainTime < Date.parse(submitted.payment.quotedAt) - 60_000)
        result = { verified: false, reason: "This transfer predates the COA payment instructions. Admin must review it; no place has been marked paid." };
    }
    await database.transaction(async tx => {
      await owned(tx, orderId, username);
      const r = await orderRequest(tx, orderId);
      if (!r || r.id !== submitted.id || r.txHash !== submitted.hash || r.status !== "review") return;
      await tx.update(requests).set({ status: result.verified ? "paid" : "review",
        verificationMessage: result.verified ? "Payment verified on chain." : result.reason,
        ...(result.verified ? { confirmedBy: "blockchain", confirmationNote: "Verified full COA charge at 1% tolerance." } : {}),
        updatedAt: new Date() }).where(eq(requests.id, r.id));
      await audit(tx, result.verified ? "payment_verified" : "payment_review", username, r.id, { result });
      if (result.verified) await queueCoaNotification(tx, r, "paid");
    });
  }
  return getMemberCoa(orderId, username, database);
}
export async function withdrawCoa(orderId: string, username: string, database = db) {
  return database.transaction(async tx => {
    const order = await owned(tx, orderId, username);
    const r = await orderRequest(tx, orderId);
    if (!r) throw new CoaError("COA request not found.", 404);
    if (r.txHash || r.reference || paidStates.includes(r.status)) throw new CoaError("Submitted or paid requests cannot be withdrawn. Contact Admin.", 409);
    await tx.update(requests).set({ status: "withdrawn", updatedAt: new Date() }).where(eq(requests.id, r.id));
    await audit(tx, "withdrawn", username, r.id);
    return memberView(tx, order);
  });
}
export async function manageCoa(requestId: string, actor: string, input: any, database = db, access?: CoaOrganiserAccess) {
  return database.transaction(async tx => {
    const [hint] = await tx.select().from(requests).where(eq(requests.id, requestId));
    if (!hint) throw new CoaError("COA request not found.", 404);
    await lockGroup(tx, hint.groupBuyId, access);
    const [r] = await tx.select().from(requests).where(eq(requests.id, requestId)).for("update");
    const update: Partial<RequestRow> = { updatedAt: new Date() };
    if (input?.action === "notes") {
      if (access) throw new CoaError("Internal notes are Admin only.", 403);
      if (typeof input.internalNotes !== "string" || input.internalNotes.length > 5000) throw new CoaError("Internal notes must be under 5,000 characters.");
      update.internalNotes = input.internalNotes;
    } else if (input?.action === "confirm") {
      if (paidStates.includes(r.status)) return { ok: true };
      coaDetails(r);
      if (r.status === "withdrawn" || r.status === "invited") throw new CoaError("Complete the request details before confirming payment.");
      const note = actorNote(input.note);
      const cfg = await config(tx, r.groupBuyId);
      if (!holdsCoaPlace(r) && await commitments(tx, r.groupBuyId) >= cfg.cap)
        throw new CoaError("No COA place is available. Increase capacity before accepting this late payment.", 409);
      update.status = "paid"; update.confirmedBy = actor; update.confirmationNote = note;
      update.verificationMessage = access ? "Payment receipt confirmed by organiser." : "Payment receipt confirmed by Admin.";
    } else if (input?.action === "processing") {
      if (r.status !== "paid" && r.status !== "processing") throw new CoaError("Only a paid COA can be marked processing.", 409);
      update.status = "processing";
    } else if (input?.action === "completed") {
      if (!paidStates.includes(r.status)) throw new CoaError("Only a paid COA can be completed.", 409);
      update.status = "completed";
    } else if (input?.action === "release") {
      if (r.txHash || r.reference || paidStates.includes(r.status)) throw new CoaError("A paid request or submitted payment cannot be silently released.", 409);
      update.status = "withdrawn";
    } else throw new CoaError("Unknown COA action.");
    await tx.update(requests).set(update).where(eq(requests.id, r.id));
    await audit(tx, input.action, actor, r.id, { note: input.note, ...update });
    if (update.status && update.status !== r.status && ["paid", "processing", "completed"].includes(update.status))
      await queueCoaNotification(tx, r, update.status as "paid" | "processing" | "completed");
    return { ok: true };
  });
}
export async function organiserCoaList(access: CoaOrganiserAccess, filters: { search?: string; batch?: string; status?: string }, database = db) {
  return adminCoaList({ ...filters, groupBuyId: access.groupBuyId }, database, access);
}
export async function adminCoaList(filters: { groupBuyId?: string; search?: string; batch?: string; status?: string }, database = db,
  access?: CoaOrganiserAccess) {
  if (access) {
    await assertCoaOrganiserAccess(access, database);
    filters = { ...filters, groupBuyId: access.groupBuyId };
  }
  const groupList = await database.select({ id: groups.id, name: groups.name }).from(groups)
    .where(access ? eq(groups.id, access.groupBuyId) : undefined).orderBy(groups.name);
  const selectedGroup = filters.groupBuyId;
  const rows = await database.select({ request: requests, order: { id: orders.id, code: orders.code, telegramUsername: orders.telegramUsername },
    group: { name: groups.name } }).from(requests).innerJoin(orders, eq(requests.orderId, orders.id))
    .innerJoin(groups, eq(requests.groupBuyId, groups.id))
    .where(selectedGroup ? eq(requests.groupBuyId, selectedGroup) : undefined).orderBy(requests.createdAt);
  const search = (filters.search ?? "").toLowerCase();
  const batch = (filters.batch ?? "").toLowerCase();
  const filtered = rows.map(row => serialise(row.request, row.order, row.group, !access)!)
    .filter((r: any) => (!filters.status || r.status === filters.status)
      && (!batch || r.batch.toLowerCase().includes(batch))
      && (!search || [r.orderCode, r.member, r.client, r.sample, r.manufacturer, r.groupName].some(s => String(s).toLowerCase().includes(search))));
  const selectable = selectedGroup ? await database.select({ id: orders.id, code: orders.code, member: orders.telegramUsername })
    .from(orders).where(and(eq(orders.groupBuyId, selectedGroup), isNull(orders.deletedAt),
      sql`${orders.status} NOT IN ('Cancelled','Refunded')`, sql`COALESCE(${orders.orderType}, '') NOT IN ('wholesale','wholesale_shared')`)).orderBy(orders.code) : [];
  return { requests: filtered, groups: groupList, config: selectedGroup ? await config(database, selectedGroup) : null,
    committed: selectedGroup ? rows.filter(row => holdsCoaPlace(row.request)).length : rows.filter(row => holdsCoaPlace(row.request)).length,
    orders: selectable };
}
