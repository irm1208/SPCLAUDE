import type { Request, Response } from "express";
import { db, ordersTable } from "@workspace/db";
import { and, eq, or, sql } from "drizzle-orm";
import { assertNoActiveRefund, refundMutableOrderWhere } from "../lib/refund-mutation-guard";
import { fetchUsdPerCoin, isStablecoin, roundCrypto } from "../lib/crypto-pricing";
import { getOrderCryptoOptions, getWholesaleCryptoOptions, isValidTxHash, toUsdIfGbp, verifyTransaction } from "./payments";
import { writeLog } from "../lib/audit-log";
import { logCustomerActivity } from "../lib/activity-log";

type Quote = {
  amountDue: string;
  usdAmount: number;
  usdPerCoin: number;
  cryptoAmount: number;
  currency: string;
  network: string;
  walletAddress: string;
};
type Order = typeof ordersTable.$inferSelect;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function ownedOrder(tx: Tx, req: Request) {
  const username = req.account!.telegramUsername.replace(/^@/, "").toLowerCase();
  const [order] = await tx.select().from(ordersTable).where(and(
    eq(ordersTable.id, String(req.params.id)),
    sql`lower(${ordersTable.telegramUsername}) IN (${username}, ${"@" + username})`,
  )).for("update");
  return order;
}

function payable(order: Order | undefined, res: Response): order is Order {
  if (!order) { res.status(404).json({ error: "Order not found" }); return false; }
  const amount = Number(order.amountDue);
  if (!Number.isFinite(amount) || amount <= 0 || order.balancePaymentStatus === "confirmed"
    || order.paymentStatus === "refunded" || order.deletedAt) {
    res.status(400).json({ error: "No outstanding balance payable on this order" }); return false;
  }
  if (order.balancePaymentStatus === "pending_confirmation") {
    res.status(409).json({ error: "A balance payment is already awaiting confirmation" }); return false;
  }
  return true;
}

function quoteMatches(order: Order, quote: Quote | null): quote is Quote {
  return !!quote && quote.amountDue === Number(order.amountDue).toFixed(2)
    && Number.isFinite(quote.cryptoAmount) && quote.cryptoAmount > 0;
}

// Balance quotes are deliberately independent of primary-payment locks and credits.
// amountDue is the already-net outstanding charge, not grandTotal less credits.
export async function balanceCryptoQuote(req: Request, res: Response): Promise<void> {
  await db.transaction(async tx => {
    const order = await ownedOrder(tx, req);
    if (!payable(order, res)) return;
    await assertNoActiveRefund(tx, order.id);
    const wholesaleOptions = order.orderType === "wholesale" ? await getWholesaleCryptoOptions() : [];
    const resolved = wholesaleOptions.length > 0
      ? { ...wholesaleOptions[0], options: wholesaleOptions }
      : await getOrderCryptoOptions(order);
    const requested = String(req.query.cryptoCurrency ?? "").toUpperCase().trim();
    const requestedNetwork = String(req.query.cryptoNetwork ?? "").toLowerCase().trim();
    const currency = requested || resolved.currency;
    const option = resolved.options.find(o => o.currency.toUpperCase() === currency.toUpperCase()
      && (!requestedNetwork || o.network.toLowerCase() === requestedNetwork));
    if (!option?.walletAddress) {
      res.status(400).json({ error: "Crypto payment option is not available for this order" }); return;
    }
    const { network, walletAddress } = option;
    const previous = order.balanceCryptoQuote as Quote | null;
    if (quoteMatches(order, previous) && previous.currency === currency && previous.network === network
      && previous.walletAddress === walletAddress) {
      res.json(previous); return;
    }
    const usdAmount = Number((await toUsdIfGbp(Number(order.amountDue), order.groupBuyId)).toFixed(2));
    const usdPerCoin = isStablecoin(currency) ? 1 : await fetchUsdPerCoin(currency);
    if (!usdPerCoin || !Number.isFinite(usdPerCoin) || usdPerCoin <= 0) {
      res.status(503).json({ error: "Couldn't load the exchange rate. Please try again.", rateUnavailable: true }); return;
    }
    const cryptoAmount = roundCrypto(usdAmount / usdPerCoin, currency);
    if (!Number.isFinite(cryptoAmount) || cryptoAmount <= 0) {
      res.status(400).json({ error: "Balance is too small for this coin" }); return;
    }
    const quote: Quote = {
      amountDue: Number(order.amountDue).toFixed(2), usdAmount, usdPerCoin, cryptoAmount,
      currency, network, walletAddress,
    };
    const rows = await tx.update(ordersTable).set({ balanceCryptoQuote: quote })
      .where(refundMutableOrderWhere(eq(ordersTable.id, order.id))).returning({ id: ordersTable.id });
    if (!rows.length) throw new Error("Balance quote could not be saved");
    res.json(quote);
  });
}

async function reused(tx: Tx, order: Order, hash: string) {
  // A primary/test transfer on this same order cannot pay a new charge twice.
  if ([order.paymentTxHash, order.testPaymentTxHash].some(value => value?.toLowerCase() === hash.toLowerCase())) return true;
  const rows = await tx.select({ id: ordersTable.id }).from(ordersTable).where(and(
    sql`${ordersTable.id} <> ${order.id}`,
    or(
      sql`lower(${ordersTable.paymentTxHash}) = lower(${hash})`,
      sql`lower(${ordersTable.testPaymentTxHash}) = lower(${hash})`,
      sql`lower(${ordersTable.balanceTxHash}) = lower(${hash})`,
    ),
  ));
  return rows.length > 0;
}

export async function balanceCryptoPay(req: Request, res: Response): Promise<void> {
  const hash = typeof req.body.txHash === "string" ? req.body.txHash.trim() : "";
  if (!isValidTxHash(hash)) { res.status(400).json({ error: "Invalid transaction hash format" }); return; }
  const snapshot = await db.transaction(async tx => {
    const order = await ownedOrder(tx, req);
    if (!payable(order, res)) return null;
    await assertNoActiveRefund(tx, order.id);
    if (await reused(tx, order, hash)) {
      res.status(400).json({ error: "This transaction hash has already been used. Each on-chain payment can only be applied once." }); return null;
    }
    const quote = order.balanceCryptoQuote as Quote | null;
    if (!quoteMatches(order, quote)
      || (req.body.cryptoCurrency && String(req.body.cryptoCurrency).toUpperCase() !== quote.currency.toUpperCase())
      || (req.body.cryptoNetwork && String(req.body.cryptoNetwork).toLowerCase() !== quote.network.toLowerCase())) {
      res.status(409).json({ error: "Please refresh the balance payment quote before trying again." }); return null;
    }
    return { order, quote };
  });
  if (!snapshot) return;
  const { order, quote } = snapshot;
  // Display and verification share this exact locked coin amount. Use only the
  // verifier's standard 1% rounding tolerance, never a fiat/coin drift allowance.
  const result = await verifyTransaction(hash, quote.walletAddress, quote.cryptoAmount, quote.currency, quote.network);

  const saved = await db.transaction(async tx => {
    // Serialize concurrent balance claims for the same transfer before rechecking reuse.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${hash.toLowerCase()}))`);
    const current = await ownedOrder(tx, req);
    if (!current || !quoteMatches(current, current.balanceCryptoQuote as Quote | null)
      || JSON.stringify(current.balanceCryptoQuote) !== JSON.stringify(quote)
      || current.balancePaymentStatus !== order.balancePaymentStatus
      || current.paymentStatus === "refunded" || current.deletedAt) {
      res.status(409).json({ error: "The outstanding balance changed while payment was being verified. Please refresh before trying again." }); return false;
    }
    await assertNoActiveRefund(tx, order.id);
    if (await reused(tx, current, hash)) {
      res.status(400).json({ error: "This transaction hash has already been used. Each on-chain payment can only be applied once." }); return false;
    }
    const rows = await tx.update(ordersTable).set(result.verified
      ? { balanceTxHash: hash, balancePaymentStatus: "confirmed", balanceConfirmedAt: new Date(), amountDue: "0.00", balanceCryptoQuote: null }
      : { balanceTxHash: hash, ...(result.manual ? { balancePaymentStatus: "pending_confirmation" } : {}) })
      .where(refundMutableOrderWhere(eq(ordersTable.id, order.id))).returning({ id: ordersTable.id });
    if (!rows.length) throw new Error("Balance payment could not be saved");
    return true;
  });
  if (!saved) return;
  writeLog("payment", result.verified ? "info" : "warn",
    result.verified ? "balance_payment_confirmed" : result.manual ? "balance_payment_manual" : "balance_payment_failed",
    `Balance payment ${result.verified ? "confirmed" : "not confirmed"} for order ${order.code}`,
    { orderId: order.id, code: order.code, txHash: hash, expectedAmount: quote.cryptoAmount,
      amountDue: quote.amountDue, currency: quote.currency, network: quote.network,
      reason: result.verified ? "balance payment confirmed" : result.reason }, req.ip).catch(() => {});
  if (result.verified) {
    await logCustomerActivity({
      telegramUsername: order.telegramUsername, eventCategory: "payment", eventType: "payment.balance_confirmed",
      entityId: order.id, actorType: "customer",
      metadata: { code: order.code, txHash: hash, amountUsdt: result.amountUsdt,
        amountDue: Number(quote.amountDue), currency: quote.currency, network: quote.network, paymentType: "crypto" },
    }).catch(err => console.error("[balance-pay] activity log failed:", err));
  }
  res.json(result.verified
    ? { verified: true, balancePaymentStatus: "confirmed", amountUsdt: result.amountUsdt }
    : { verified: false, pending: result.pending ?? false, reason: result.reason });
}
