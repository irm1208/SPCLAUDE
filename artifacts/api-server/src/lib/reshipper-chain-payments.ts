import { db, siteConfigTable, accountsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { context, view, lockConfig } from "./reshipper-payouts";
import { applyPayout, parsePayoutLedger, payoutReferenceKey, PayoutError } from "./reshipper-payout-rules";
import { prepareChainIntent, settleChainIntent } from "./payout-chain-rules";
import { type ChainIntent } from "./payout-chain-schema";
import { acceptSignedTransaction, assetFor, broadcastChainTransaction, prepareChainTransaction, verifyChainIntent, validateReplacementHash } from "./payout-chain-provider";
import { fetchFiatToUsd } from "./crypto-pricing";

const inputSchema = z.object({ operationId: z.string().uuid(), sender: z.string().min(1).max(200),
  currency: z.string().min(2).max(8), allocations: z.array(z.object({ orderId: z.string().min(1).max(100), adminFee: z.string(), postage: z.string() })).min(1).max(5000) });
const nonceKey = (intent: ChainIntent) => `reshipper_chain_nonce:v1:${assetFor(intent).chainId}:${intent.sender.toLowerCase()}:${String(intent.transaction.nonce)}`;
const save = async (tx: Parameters<Parameters<typeof db.transaction>[0]>[0], ctx: Awaited<ReturnType<typeof context>>) =>
  tx.update(siteConfigTable).set({ value: JSON.stringify(ctx.ledger), updatedAt: new Date() }).where(eq(siteConfigTable.key, ctx.key));
function find(ctx: Awaited<ReturnType<typeof context>>, id: string) {
  const p = ctx.ledger.chainPayments.find(p => p.id === id && p.accountId === ctx.recipient.id);
  if (!p) throw new PayoutError("Payout payment not found.", 404);
  return p;
}
export async function prepareReshipperChainPayment(username: string, gbId: string, raw: unknown, actor: string) {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) throw new PayoutError("Select eligible orders and connect a sending wallet.");
  const body = parsed.data, now = new Date().toISOString();
  // RPC / live FX calls are deliberately outside database locks.
  const snapshot = await db.transaction(tx => context(tx, username, gbId), { isolationLevel: "repeatable read" });
  let rate: number;
  try { rate = ["USD", "USDT", "USDC"].includes(snapshot.currency) ? 1 : await fetchFiatToUsd(snapshot.currency, { strict: true }); }
  catch { throw new PayoutError("Live currency conversion is unavailable. No payment was prepared; try later or use a manual payout.", 503); }
  const candidate = prepareChainIntent(snapshot.ledger, snapshot.orders, snapshot.currency, snapshot.recipient, snapshot.payoutWallet, body, actor, now, rate);
  if (Object.keys(candidate.transaction).length) return view(snapshot, true);
  const transaction = await prepareChainTransaction(candidate);
  return db.transaction(async tx => {
    const ctx = await context(tx, username, gbId, true, body.allocations.map(a => a.orderId));
    const existing = ctx.ledger.chainPayments.find(p => p.id === body.operationId);
    if (!existing && JSON.stringify(ctx.payoutWallet) !== JSON.stringify(snapshot.payoutWallet))
      throw new PayoutError("The reshipper changed their payout wallet. Refresh and review it before paying.", 409);
    const intent = prepareChainIntent(ctx.ledger, ctx.orders, ctx.currency, ctx.recipient, ctx.payoutWallet, body, actor, now, rate);
    if (!Object.keys(intent.transaction).length) {
      intent.transaction = transaction;
      if (assetFor(intent).family === "evm") {
        const row = await lockConfig(tx, nonceKey(intent));
        if (row.value && JSON.parse(row.value).id !== intent.id)
          throw new PayoutError("This sending wallet already has a pending payment on this network. Finish that payment first.", 409);
        await tx.update(siteConfigTable).set({ value: JSON.stringify({ id: intent.id, ledgerKey: ctx.key }) }).where(eq(siteConfigTable.key, nonceKey(intent)));
      }
      await save(tx, ctx);
    }
    return view(ctx, true);
  });
}
export async function approveReshipperChainPayment(username: string, gbId: string, id: string, actor: string) {
  return db.transaction(async tx => {
    const ctx = await context(tx, username, gbId, true), p = find(ctx, id);
    if (p.state === "prepared") {
      if (Date.now() - new Date(p.createdAt).getTime() > 10 * 60_000) throw new PayoutError("The payment preview expired. Cancel it and prepare a new preview.", 409);
      // Recheck paid-only eligibility before money can move. Once approval starts, preserve the sent snapshot instead.
      const check = structuredClone(ctx.ledger); check.chainPayments = check.chainPayments.filter(c => c.id !== id);
      applyPayout(check, ctx.orders, ctx.currency, ctx.recipient, {
        operationId: p.id, amount: (p.amountMinor / 100).toFixed(2), currency: p.currency,
        paidAt: new Date().toISOString().slice(0, 10), method: "crypto", destination: p.destination, network: p.network,
        reference: `pending:${id}`, confirmedDestination: true,
        allocations: p.allocations.map(a => ({ orderId: a.orderId, adminFee: (a.adminFeeMinor / 100).toFixed(2), postage: (a.postageMinor / 100).toFixed(2) })),
      }, actor, new Date().toISOString());
      p.state = "signing"; p.error = null;
      ctx.ledger.audit.push({ action: "chain_payout_wallet_approval", actor, at: new Date().toISOString(), reason: "Admin opened wallet approval.", details: { id } });
      await save(tx, ctx);
    } else if (p.state !== "signing") throw new PayoutError("This payment is already submitted or closed. Check its status instead.", 409);
    return view(ctx, true);
  });
}
export async function submitReshipperChainPayment(username: string, gbId: string, id: string, raw: unknown, actor: string) {
  const snapshot = await db.transaction(tx => context(tx, username, gbId), { isolationLevel: "repeatable read" });
  const previous = find(snapshot, id), proposed = acceptSignedTransaction(previous, raw);
  if (previous.txid && previous.txid !== proposed.txid) await validateReplacementHash(previous, proposed.txid);
  const payment = await db.transaction(async tx => {
    const ctx = await context(tx, username, gbId, true), p = find(ctx, id);
    if (!["signing", "broadcast", "confirmed"].includes(p.state)) throw new PayoutError("Approve the payout preview before submitting a transaction.", 409);
    const signed = acceptSignedTransaction(p, raw);
    if (p.txid && p.txid !== signed.txid) {
      if (p.state === "confirmed" || assetFor(p).family !== "evm" || p.requestHash !== previous.requestHash)
        throw new PayoutError("This payment already has a different TXID. Do not send a second transfer.", 409);
      if (p.previousTxids.length >= 5) throw new PayoutError("This payment has too many replacements. Admin review is required; its fees remain reserved.", 409);
      p.previousTxids.push(p.txid);
    }
    if (p.state === "confirmed") return p;
    const key = payoutReferenceKey(signed.txid), reserved = await lockConfig(tx, key);
    if (reserved.value && JSON.parse(reserved.value).payoutId !== id)
      throw new PayoutError("This transaction is already linked to another payout.", 409);
    await tx.update(siteConfigTable).set({ value: JSON.stringify({ ledgerKey: ctx.key, payoutId: id }), updatedAt: new Date() }).where(eq(siteConfigTable.key, key));
    p.txid = signed.txid; p.signedRaw = signed.signedRaw; p.state = "broadcast"; p.error = "Waiting for blockchain confirmation.";
    ctx.ledger.audit.push({ action: "chain_payout_submitted", actor, at: new Date().toISOString(), reason: "Saved approved transaction before broadcast.", details: { id, txid: p.txid } });
    await save(tx, ctx); return p;
  });
  // Persist first, then broadcast. A timeout cannot lose the transfer's identity or release its orders.
  if (payment.state !== "confirmed") {
    try { await broadcastChainTransaction(payment); } catch { /* Retain it for background reconciliation and same-transaction retries. */ }
  }
  return checkReshipperChainPayment(username, gbId, id, actor);
}
export async function checkReshipperChainPayment(username: string, gbId: string, id: string, actor: string) {
  const snapshot = await db.transaction(tx => context(tx, username, gbId), { isolationLevel: "repeatable read" });
  const payment = find(snapshot, id);
  if (payment.state !== "broadcast") return view(snapshot, true);
  let result: Awaited<ReturnType<typeof verifyChainIntent>>;
  try {
    result = { state: "pending", reason: "Waiting for blockchain confirmation." };
    for (const txid of [payment.txid, ...payment.previousTxids.slice().reverse()]) {
      const check = await verifyChainIntent({ ...payment, txid });
      if (check.state !== "pending") { result = check; payment.txid = txid; break; }
      if (txid === payment.txid) result = check;
    }
    if (result.state === "pending" && payment.signedRaw) {
      // Rebroadcast identical signed bytes, never construct or sign a replacement transfer.
      try { await broadcastChainTransaction(payment); } catch { /* Verification, not broadcast acceptance, decides settlement. */ }
    }
  } catch { result = { state: "pending", reason: "Blockchain check unavailable. Payment remains pending; do not send again." }; }
  return db.transaction(async tx => {
    const ctx = await context(tx, username, gbId, true), current = find(ctx, id);
    if (current.state !== "broadcast" || (current.txid !== payment.txid && !current.previousTxids.includes(payment.txid!))) return view(ctx, true);
    current.error = result.reason;
    if (result.state === "confirmed") {
      current.txid = payment.txid;
      const row = await lockConfig(tx, payoutReferenceKey(current.txid!));
      if (!row.value || JSON.parse(row.value).payoutId !== current.id) throw new PayoutError("Transaction ownership needs review; do not send again.", 409);
      current.verifiedAt = new Date().toISOString();
      settleChainIntent(ctx.ledger, current.id, actor, current.verifiedAt);
      current.error = null; current.signedRaw = null;
    } else if (result.state === "failed") {
      current.txid = payment.txid;
      current.state = "failed"; current.signedRaw = null;
      ctx.ledger.audit.push({ action: "chain_payout_failed", actor, at: new Date().toISOString(), reason: result.reason, details: { id } });
    }
    await save(tx, ctx); return view(ctx, true);
  });
}
export async function cancelReshipperChainPayment(username: string, gbId: string, id: string, actor: string) {
  return db.transaction(async tx => {
    const ctx = await context(tx, username, gbId, true), p = find(ctx, id);
    if (p.state === "cancelled") return view(ctx, true);
    if (p.state !== "prepared" && !(p.state === "signing" && assetFor(p).family !== "evm" && !p.signedRaw))
      throw new PayoutError("This payment may already have been sent. Recover its TXID or check it; its orders stay reserved.", 409);
    p.state = "cancelled"; p.error = null;
    if (assetFor(p).family === "evm") {
      const row = await lockConfig(tx, nonceKey(p));
      if (row.value && JSON.parse(row.value).id === id) await tx.update(siteConfigTable).set({ value: null }).where(eq(siteConfigTable.key, nonceKey(p)));
    }
    ctx.ledger.audit.push({ action: "chain_payout_cancelled", actor, at: new Date().toISOString(), reason: "Cancelled before any transaction could be broadcast by the app.", details: { id } });
    await save(tx, ctx); return view(ctx, true);
  });
}
let running = false;
let cursor = 0;
export function startReshipperChainPaymentChecks() {
  const tick = async () => {
    if (running) return; running = true;
    try {
      const prefix = "reshipper_payouts:v1:";
      const rows = await db.select().from(siteConfigTable).where(sql`left(${siteConfigTable.key}, ${prefix.length}) = ${prefix}`);
      const work: { gbId: string; p: ChainIntent }[] = [];
      for (const row of rows) {
        let ledger;
        try { ledger = parsePayoutLedger(row.value ?? "null"); } catch { continue; }
        for (const p of ledger.chainPayments.filter(p => p.state === "broadcast")) work.push({ gbId: row.key.slice(prefix.length), p });
      }
      // Round-robin prevents a slow first payment from starving other reshippers. Two concurrent checks bound RPC load.
      const chosen = Array.from({ length: Math.min(2, work.length) }, (_, n) => work[(cursor + n) % work.length]);
      cursor = work.length ? (cursor + chosen.length) % work.length : 0;
      await Promise.all(chosen.map(async ({ gbId, p }) => {
          const [account] = await db.select({ username: accountsTable.telegramUsername }).from(accountsTable).where(eq(accountsTable.reshipperPayoutId, p.accountId));
          if (!account) return;
          try { await checkReshipperChainPayment(account.username, gbId, p.id, "blockchain-checker"); }
          catch (error) { console.error("[reshipper-chain] Pending payout check failed", p.id, error instanceof Error ? error.message : "Unknown error"); }
      }));
    } catch (error) { console.error("[reshipper-chain] Could not read pending payouts", error instanceof Error ? error.message : "Unknown error"); }
    finally { running = false; }
  };
  const timer = setInterval(tick, 30_000); timer.unref();
}
