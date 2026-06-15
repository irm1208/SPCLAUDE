/**
 * Background scheduler that automatically confirms GB order payments.
 *
 * - AnonPay orders: polls Trocador every cycle and confirms when status is "finished".
 * - USDT ERC-20 / crypto orders: verifies the stored tx hash on-chain and confirms
 *   when the transfer to the correct wallet matches the expected amount.
 *
 * Runs every 5 minutes. Only picks up orders in "pending_confirmation" that have a
 * paymentTxHash already stored (i.e. the customer has already submitted their hash).
 */
import {
  db,
  ordersTable,
  groupBuysTable,
  gbReshippersTable,
  siteConfigTable,
} from "@workspace/db";
import { and, eq, isNotNull, ne, or } from "drizzle-orm";
import {
  verifyTransaction,
  isValidEthAddress,
  isValidBtcAddress,
} from "./payment-verify";
import { registerScheduler } from "./scheduler-registry";
import { logCustomerActivity } from "./activity-log";
import { writeLog } from "./audit-log";
import { notifyUserFromTemplate, sendAdminFromTemplate } from "./telegram";

const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const ANONPAY_PREFIX = "anonpay:";
const ANONPAY_DONE = new Set(["anonpayfinished", "finished", "complete", "completed"]);

// ── Helpers ────────────────────────────────────────────────────

async function getConfig(key: string): Promise<string | null> {
  const [row] = await db
    .select({ value: siteConfigTable.value })
    .from(siteConfigTable)
    .where(eq(siteConfigTable.key, key));
  return row?.value ?? null;
}

/** Resolve the destination wallet address/currency/network for a given order. */
async function resolveOrderCrypto(order: {
  groupBuyId: string | null;
  orderType?: string | null;
  shippingCountry?: string | null;
}): Promise<{ walletAddress: string | null; currency: string; network: string }> {
  const defaultCurrency = "USDT";
  const defaultNetwork = "ERC-20";

  const paymentRoutingEnabled = (await getConfig("paymentRoutingEnabled")) !== "false";
  if (!paymentRoutingEnabled) {
    const walletAddress = await getConfig("walletAddress");
    return { walletAddress, currency: defaultCurrency, network: defaultNetwork };
  }

  if (order.orderType === "wholesale") {
    const wsWallet = await getConfig("wholesale_usdt_wallet");
    if (wsWallet) return { walletAddress: wsWallet, currency: defaultCurrency, network: defaultNetwork };
    const walletAddress = await getConfig("walletAddress");
    return { walletAddress, currency: defaultCurrency, network: defaultNetwork };
  }

  if (order.groupBuyId) {
    // Reshipper wallet takes priority (mirrors /payments-info routing)
    if (order.shippingCountry) {
      const [assignment] = await db
        .select({
          reshipperPaymentDetails: gbReshippersTable.reshipperPaymentDetails,
          enabledPaymentMethods: gbReshippersTable.enabledPaymentMethods,
        })
        .from(gbReshippersTable)
        .where(
          and(
            eq(gbReshippersTable.gbId, order.groupBuyId),
            eq(gbReshippersTable.country, order.shippingCountry),
          )
        );
      if (assignment) {
        const rpd = assignment.reshipperPaymentDetails as Record<string, string | boolean | null> | null;
        const rpm = assignment.enabledPaymentMethods as Record<string, boolean> | null;
        const reshipperWallet =
          rpm?.cryptoEnabled && rpd?.cryptoWalletAddress ? String(rpd.cryptoWalletAddress)
          : rpm?.usdtEnabled && rpd?.usdtWallet ? String(rpd.usdtWallet)
          : null;
        if (reshipperWallet) {
          const currency = rpm?.cryptoEnabled && rpd?.cryptoCurrency ? String(rpd.cryptoCurrency) : defaultCurrency;
          const network  = rpm?.cryptoEnabled && rpd?.cryptoNetwork  ? String(rpd.cryptoNetwork)  : defaultNetwork;
          return { walletAddress: reshipperWallet, currency, network };
        }
      }
    }

    // GB organiser wallet
    const [gb] = await db
      .select({ organiserPayments: groupBuysTable.organiserPayments })
      .from(groupBuysTable)
      .where(eq(groupBuysTable.id, order.groupBuyId));
    const op = gb?.organiserPayments as Record<string, string | null> | null;
    const currency = op?.["cryptoCurrency"]?.trim() ?? defaultCurrency;
    const network  = op?.["cryptoNetwork"]?.trim()  ?? defaultNetwork;
    const gbWallet = op?.["cryptoWalletAddress"] ?? null;
    if (gbWallet && (isValidEthAddress(gbWallet) || isValidBtcAddress(gbWallet))) {
      return { walletAddress: gbWallet, currency, network };
    }
    const walletAddress = await getConfig("walletAddress");
    return { walletAddress, currency, network };
  }

  const walletAddress = await getConfig("walletAddress");
  return { walletAddress, currency: defaultCurrency, network: defaultNetwork };
}

type PendingOrder = {
  id: string;
  code: string | null;
  telegramUsername: string;
  groupBuyId: string | null;
  orderType: string | null;
  shippingCountry: string | null;
  deliveryMethod: string;
  grandTotal: string;
  paymentUsdAmount: string | null;
  creditsApplied: number;
  paymentTestAmount: string | null;
  paymentStatus: string;
  paymentTxHash: string | null;
};

// ── AnonPay handler ────────────────────────────────────────────

async function checkAnonPay(order: PendingOrder): Promise<void> {
  const raw = order.paymentTxHash ?? "";
  if (!raw.startsWith(ANONPAY_PREFIX)) return;

  // paymentTxHash is "anonpay:{sessionId}" or "anonpay:{sessionId}|{outTxHash}"
  const afterPrefix = raw.slice(ANONPAY_PREFIX.length);
  const paymentId = afterPrefix.split("|")[0] ?? "";
  if (!paymentId) return;

  let trocStatus = "";
  let trocOutgoingHash = "";
  try {
    const res = await fetch(
      `https://trocador.app/anonpay/status/${encodeURIComponent(paymentId)}?format=json`,
      { signal: AbortSignal.timeout(12000) }
    );
    if (!res.ok) return;
    const data: any = await res.json();
    trocStatus = String(data["Status"] ?? data["status"] ?? data["payment_status"] ?? "").toLowerCase();
    trocOutgoingHash = String(
      data["Hash"] ?? data["hash"] ?? data["tx_hash"] ?? data["txhash"] ?? data["HashTo"] ?? data["hash_to"] ?? ""
    ).trim();
    console.log(`[order-auto-verify] AnonPay ${order.code}: Trocador status=${trocStatus} hash=${trocOutgoingHash || "(none)"}`);
  } catch (err: any) {
    console.warn(`[order-auto-verify] AnonPay fetch error for order ${order.code}:`, err?.message);
    return;
  }

  if (!ANONPAY_DONE.has(trocStatus)) return;

  const newTxHash = trocOutgoingHash
    ? `${ANONPAY_PREFIX}${paymentId}|${trocOutgoingHash}`
    : `${ANONPAY_PREFIX}${paymentId}`;

  await db
    .update(ordersTable)
    .set({ paymentStatus: "confirmed", paymentConfirmedAt: new Date(), amountDue: "0.00", paymentTxHash: newTxHash })
    .where(eq(ordersTable.id, order.id));

  console.log(`[order-auto-verify] AnonPay confirmed — order ${order.code}`);

  writeLog("payment", "info", "anonpay_confirmed",
    `AnonPay auto-confirmed by scheduler for order ${order.code} (Trocador: ${trocStatus})`,
    { orderId: order.id, code: order.code, username: order.telegramUsername, paymentId, trocStatus, trocOutgoingHash: trocOutgoingHash || null },
  ).catch(() => {});

  logCustomerActivity({
    telegramUsername: order.telegramUsername,
    eventCategory: "payment",
    eventType: "payment.anonpay_confirmed",
    entityId: order.id,
    actorType: "system",
    metadata: { code: order.code, paymentType: "anonpay", paymentId, trocStatus, trocOutgoingHash: trocOutgoingHash || null },
  }).catch(() => {});

  fireConfirmNotification(order, "AnonPay", undefined, trocOutgoingHash || null).catch(() => {});
}

// ── Crypto (USDT ERC-20 / BEP-20 / ETH / BTC) handler ────────

async function checkCrypto(order: PendingOrder): Promise<void> {
  const txHash = order.paymentTxHash ?? "";
  // Skip AnonPay and fiat payment markers — they are not on-chain hashes
  if (!txHash || txHash.startsWith(ANONPAY_PREFIX) || txHash.startsWith("fiat:")) return;

  const { walletAddress, currency, network } = await resolveOrderCrypto(order);
  if (!walletAddress) return;

  const grandTotalRaw = parseFloat(String(order.grandTotal));
  const lockedUsd = order.paymentUsdAmount ? parseFloat(String(order.paymentUsdAmount)) : null;
  const creditsApplied = order.creditsApplied ? parseFloat(String(order.creditsApplied)) : 0;
  const testAmount =
    order.paymentStatus === "test_confirmed" && order.paymentTestAmount
      ? parseFloat(String(order.paymentTestAmount))
      : 0;

  // Use the locked USD amount when available (set when customer opens the payment panel).
  // Fall back to grandTotal, treating it as USD. We apply a generous 15% tolerance so
  // minor GBP/USD drift doesn't block auto-confirm for GBP-denominated GBs.
  const grandTotalUsd = lockedUsd ?? grandTotalRaw;
  const expectedAmount = parseFloat((Math.max(0, grandTotalUsd - creditsApplied) - testAmount).toFixed(2));

  const result = await verifyTransaction(txHash, walletAddress, expectedAmount, currency, network, 0.15);

  if (!result.verified) {
    if ((result as any).pending) {
      console.log(`[order-auto-verify] Crypto pending for order ${order.code}: ${result.reason}`);
    } else {
      console.log(`[order-auto-verify] Crypto not verified for order ${order.code}: ${result.reason}`);
    }
    return;
  }

  await db
    .update(ordersTable)
    .set({ paymentStatus: "confirmed", paymentConfirmedAt: new Date(), amountDue: "0.00" })
    .where(eq(ordersTable.id, order.id));

  console.log(`[order-auto-verify] Crypto confirmed — order ${order.code} ($${result.amountUsdt} ${currency})`);

  writeLog("payment", "info", "crypto_confirmed",
    `Crypto auto-confirmed by scheduler for order ${order.code} ($${result.amountUsdt} ${currency}/${network})`,
    { orderId: order.id, code: order.code, username: order.telegramUsername, txHash, amountUsdt: result.amountUsdt, currency, network },
  ).catch(() => {});

  logCustomerActivity({
    telegramUsername: order.telegramUsername,
    eventCategory: "payment",
    eventType: "payment.confirmed",
    entityId: order.id,
    actorType: "system",
    metadata: { code: order.code, paymentType: "crypto", txHash, amountUsdt: result.amountUsdt, currency, network },
  }).catch(() => {});

  fireConfirmNotification(order, `Crypto (${currency} ${network})`, result.amountUsdt, txHash).catch(() => {});
}

// ── Notification ───────────────────────────────────────────────

async function fireConfirmNotification(
  order: PendingOrder,
  method: string,
  amountUsdt?: number,
  txHash?: string | null,
): Promise<void> {
  try {
    const appUrl = process.env["APP_URL"] ?? "https://saltandpeps.co.uk";
    const username = order.telegramUsername.replace(/^@/, "");
    const grandTotal = parseFloat(String(order.grandTotal));

    let gbContext = "";
    let sym = "$";
    if (order.groupBuyId) {
      const [gb] = await db
        .select({ name: groupBuysTable.name, currency: groupBuysTable.currency })
        .from(groupBuysTable)
        .where(eq(groupBuysTable.id, order.groupBuyId));
      if (gb) {
        gbContext = `\nGB: <b>${gb.name}</b>`;
        sym = (gb.currency ?? "USD").toUpperCase() === "GBP" ? "£" : "$";
      }
    }

    const orderTotal = `${sym}${grandTotal.toFixed(2)}`;
    const delivery = order.deliveryMethod ?? "—";
    const code = order.code ?? order.id;
    const amountReceived = amountUsdt != null ? `${amountUsdt.toFixed(2)} USDT` : orderTotal;
    const txidLine = txHash ? `\nTXID: <code>${txHash}</code>` : "";

    notifyUserFromTemplate(order.telegramUsername, "payment", "customer_payment_confirmed",
      { code, gb_name: gbContext, username, order_total: orderTotal, delivery, app_url: appUrl, amount_received: amountReceived, payment_method: method },
    ).catch(() => {});

    sendAdminFromTemplate("admin_payment_confirmed",
      { code, gb_name: gbContext, username, order_total: orderTotal, delivery, amount_received: amountReceived, payment_method: method, txid_line: txidLine, test_info: "" },
    ).catch(() => {});
  } catch (err) {
    console.error("[order-auto-verify] fireConfirmNotification failed:", err);
  }
}

// ── Main run loop ──────────────────────────────────────────────

async function runOrderPaymentAutoVerify(): Promise<void> {
  try {
    const pending = await db
      .select({
        id: ordersTable.id,
        code: ordersTable.code,
        telegramUsername: ordersTable.telegramUsername,
        groupBuyId: ordersTable.groupBuyId,
        orderType: ordersTable.orderType,
        shippingCountry: ordersTable.shippingCountry,
        deliveryMethod: ordersTable.deliveryMethod,
        grandTotal: ordersTable.grandTotal,
        paymentUsdAmount: ordersTable.paymentUsdAmount,
        creditsApplied: ordersTable.creditsApplied,
        paymentTestAmount: ordersTable.paymentTestAmount,
        paymentStatus: ordersTable.paymentStatus,
        paymentTxHash: ordersTable.paymentTxHash,
      })
      .from(ordersTable)
      .where(
        and(
          or(
            eq(ordersTable.paymentStatus, "pending_confirmation"),
            // Also catch orders where the customer submitted a hash but verification
            // failed transiently (RPC error / empty logs) — status stays awaiting_payment
            // until the auto-verifier confirms or rejects it.
            eq(ordersTable.paymentStatus, "awaiting_payment"),
            // test_confirmed orders where the full-payment hash has been submitted
            eq(ordersTable.paymentStatus, "test_confirmed"),
          ),
          isNotNull(ordersTable.paymentTxHash),
          ne(ordersTable.paymentTxHash, ""),
        )
      );

    if (pending.length === 0) return;
    console.log(`[order-auto-verify] Checking ${pending.length} pending order(s)…`);

    for (const order of pending) {
      try {
        const hash = order.paymentTxHash ?? "";
        if (hash.startsWith(ANONPAY_PREFIX)) {
          await checkAnonPay(order as PendingOrder);
        } else {
          await checkCrypto(order as PendingOrder);
        }
      } catch (err: any) {
        console.error(`[order-auto-verify] Error on order ${order.code}:`, err?.message ?? err);
      }
    }
  } catch (err: any) {
    console.error("[order-auto-verify] Error:", err?.message ?? err);
  }
}

export function startOrderPaymentAutoVerify(): void {
  registerScheduler({
    name: "order-payment-auto-verify",
    label: "Order payment auto-verify",
    description: "Auto-confirms GB orders paid via AnonPay or USDT ERC-20 (polls Trocador / checks on-chain).",
    defaultIntervalMs: CHECK_INTERVAL_MS,
    minIntervalMs: 60_000,
    maxIntervalMs: 60 * 60 * 1000,
    initialDelayMs: 90_000,
    run: runOrderPaymentAutoVerify,
  });
}
