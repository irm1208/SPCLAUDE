import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { createHash, timingSafeEqual } from "crypto";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { siteConfigTable, ordersTable, groupBuysTable, gbReshippersTable, gbCountryLegsTable, accountsTable } from "@workspace/db";
import { eq, or, and, sql } from "drizzle-orm";
import { logCustomerActivity } from "../lib/activity-log";
import { writeLog } from "../lib/audit-log";
import { getJwtSecret, type AccountJwtPayload } from "../middleware/account-auth";
import { notifyUserFromTemplate, sendAdminFromTemplate } from "../lib/telegram";
import { maybeSubmitSharedOrder } from "../lib/wholesale-submit";
import { isStablecoin, cryptoDecimals, roundCrypto, fetchFiatToUsd, fetchUsdPerCoin } from "../lib/crypto-pricing";
import { effectiveStableCurrency, isEthErc20StableRail, ERC20_STABLE_CURRENCIES } from "../lib/payment-verify";

// Silently populates req.account if a valid account session cookie is present —
// does NOT reject the request if missing or invalid.
async function optionalAccountAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.account_session as string | undefined;
  if (token) {
    try {
      const payload = jwt.verify(token, getJwtSecret()) as AccountJwtPayload;
      req.account = { telegramUsername: payload.telegramUsername, jti: payload.jti };
    } catch { /* ignore */ }
  }
  next();
}

const router: IRouter = Router();

// ─── ISO-2 code → full country name (mirrors SHIP_COUNTRIES on the frontend) ──
// Used to normalise stored country values so "GB" and "United Kingdom" match.
const ISO_TO_COUNTRY: Record<string, string> = {
  GB: "United Kingdom", IE: "Ireland", BE: "Belgium", NL: "Netherlands",
  LU: "Luxembourg", DE: "Germany", AT: "Austria", FR: "France",
  ES: "Spain", PT: "Portugal", IT: "Italy", SE: "Sweden", DK: "Denmark",
  FI: "Finland", NO: "Norway", EE: "Estonia", LV: "Latvia", LT: "Lithuania",
  PL: "Poland", CZ: "Czech Republic", SK: "Slovakia", HU: "Hungary",
  RO: "Romania", BG: "Bulgaria", HR: "Croatia", SI: "Slovenia",
  GR: "Greece", CY: "Cyprus", MT: "Malta", CH: "Switzerland",
  US: "United States", CA: "Canada", AU: "Australia",
};

/** Expand an ISO-2 code to its full name; leave full names unchanged. */
function normaliseCountry(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  return ISO_TO_COUNTRY[trimmed.toUpperCase()] ?? trimmed;
}

// ─── Payment leg blocking helper ─────────────────────────────
// Returns false (and sends a 403) if the order's country leg has payment_blocked = true.
async function checkLegPaymentBlocked(
  order: { countryLegId: string | null; code?: string | null },
  res: Response
): Promise<boolean> {
  if (!order.countryLegId) return true;
  const [leg] = await db
    .select({ paymentBlocked: gbCountryLegsTable.paymentBlocked })
    .from(gbCountryLegsTable)
    .where(eq(gbCountryLegsTable.id, order.countryLegId));
  if (leg?.paymentBlocked) {
    res.status(403).json({ error: "Payments are currently paused for your shipping country. Please contact the organiser for details." });
    return false;
  }
  return true;
}

// ─── Payment country restriction helper ───────────────────────
async function checkPaymentCountry(
  order: { telegramUsername: string; shippingCountry: string | null },
  gb: { allowedCountries: string[] | null | undefined; excludedCountries: string[] | null | undefined },
  res: Response
): Promise<boolean> {
  const allowed = gb.allowedCountries ?? [];
  const excluded = gb.excludedCountries ?? [];
  if (allowed.length === 0 && excluded.length === 0) return true;

  // Orders store telegramUsername with a leading "@" (e.g. "@pharmmd") but the
  // accounts table uses the bare username as primary key (e.g. "pharmmd").
  // Strip the "@" before looking up the account.
  const bareUsername = order.telegramUsername?.replace(/^@/, "") ?? "";
  const [acct] = await db
    .select({ country: accountsTable.country })
    .from(accountsTable)
    .where(eq(accountsTable.telegramUsername, bareUsername));

  // Normalise stored country (may be ISO-2 code like "GB" or full name like "United Kingdom").
  // The admin restriction lists always use full names; users who saved via the old address form
  // may have an ISO-2 code stored, so we expand it before comparing.
  const rawCountry = acct?.country ?? order.shippingCountry ?? null;
  const userCountry = normaliseCountry(rawCountry);

  if (allowed.length > 0) {
    if (!userCountry || !allowed.includes(userCountry)) {
      res.status(403).json({ error: `Payments for this group buy are only accepted from: ${allowed.join(", ")}` });
      return false;
    }
  }
  if (excluded.length > 0 && userCountry && excluded.includes(userCountry)) {
    res.status(403).json({ error: `Payments from your country (${userCountry}) are not accepted for this group buy.` });
    return false;
  }
  return true;
}

// ─── Shared type: organiser payment methods stored in GB JSONB ─
export interface OrganiserPayments {
  usdtWallet?: string;
  revolutHandle?: string;
  paypalHandle?: string;
  cryptoCurrency?: string;
  cryptoNetwork?: string;
  cryptoWalletAddress?: string;
  anonPayEnabled?: boolean;
  anonPayWallet?: string;
  anonPayTicker?: string;
  anonPayNetwork?: string;
}

// ─── Helpers ──────────────────────────────────────────────────
function requireAdmin(req: any, res: any): boolean {
  const secret = process.env["ADMIN_SECRET"];
  const provided = req.headers["x-admin-secret"];
  if (!secret) {
    res.status(503).json({ error: "Admin not configured" });
    return false;
  }
  if (!provided || !safeStrEqual(String(provided), secret)) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

function sha256(s: string) {
  return createHash("sha256").update(s).digest("hex");
}

function safeStrEqual(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) {
      timingSafeEqual(bufA, Buffer.alloc(bufA.length));
      return false;
    }
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

// Validate a transaction hash: EVM (0x-prefixed 64-char hex), BTC/Tron (plain 64-char hex), Solana (base58 86-88 chars)
export function isValidTxHash(hash: string): boolean {
  return (
    /^0x[0-9a-fA-F]{64}$/.test(hash) ||
    /^[0-9a-fA-F]{64}$/.test(hash) ||
    /^[1-9A-HJ-NP-Za-km-z]{86,88}$/.test(hash)
  );
}

// Validate an Ethereum/BSC wallet address (0x + 40 hex chars)
function isValidEthAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(addr);
}

// Validate a Bitcoin address (P2PKH, P2SH, or native SegWit bech32)
function isValidBtcAddress(addr: string): boolean {
  return /^[13][1-9A-HJ-NP-Za-km-z]{24,33}$/.test(addr) || /^bc1[a-z0-9]{6,87}$/.test(addr);
}

// Validate a Solana wallet address (base58, 32–44 chars)
function isValidSolanaAddress(addr: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr);
}

async function getConfig(key: string): Promise<string | null> {
  const [row] = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, key));
  return row?.value ?? null;
}

async function setConfig(key: string, value: string) {
  await db
    .insert(siteConfigTable)
    .values({ key, value })
    .onConflictDoUpdate({ target: siteConfigTable.key, set: { value } });
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

type PaymentOrderFields = {
  id: string;
  code: string | null;
  telegramUsername: string;
  grandTotal: unknown;
  deliveryMethod: string | null;
  groupBuyId: string | null;
};

function labelPaymentMethod(txHash: string | null | undefined, method?: string): string {
  const m = method ?? txHash ?? "";
  if (m.startsWith("fiat:revolut") || m === "revolut") return "Revolut";
  if (m.startsWith("fiat:paypal") || m === "paypal") return "PayPal";
  if (m.startsWith("anonpay:") || m === "anonpay" || m === "AnonPay") return "AnonPay";
  if (m === "credits") return "Store Credits";
  if (m) return "Crypto";
  return "—";
}

async function firePaymentNotifications(
  order: PaymentOrderFields,
  event: "confirmed" | "submitted",
  method?: string,
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
        gbContext = `\nGB: <b>${escHtml(gb.name)}</b>`;
        sym = (gb.currency ?? "USD").toUpperCase() === "GBP" ? "£" : "$";
      }
    }

    const orderTotal = `${sym}${grandTotal.toFixed(2)}`;
    const delivery = order.deliveryMethod ?? "—";
    const code = order.code ?? order.id;
    const paymentMethod = labelPaymentMethod(null, method);
    const cryptoLabel = String((order as any).paymentCryptoCurrency || "USDT").toUpperCase();
    const amountReceived = amountUsdt != null ? `${amountUsdt.toFixed(2)} ${cryptoLabel}` : orderTotal;
    const txidLine = txHash ? `\nTXID: <code>${txHash}</code>` : "";

    if (event === "confirmed") {
      notifyUserFromTemplate(order.telegramUsername, "payment", "customer_payment_confirmed",
        { code, gb_name: gbContext, username, order_total: orderTotal, delivery, app_url: appUrl, amount_received: amountReceived, payment_method: paymentMethod },
      ).catch(() => {});
      sendAdminFromTemplate("admin_payment_confirmed",
        { code, gb_name: gbContext, username, order_total: orderTotal, delivery, amount_received: amountReceived, payment_method: paymentMethod, txid_line: txidLine, test_info: "" },
      ).catch(() => {});
    } else {
      sendAdminFromTemplate("admin_payment_submitted",
        { code, gb_name: gbContext, username, order_total: orderTotal, delivery, method: method ?? "—", amount_received: amountReceived },
      ).catch(() => {});
    }
  } catch (err) {
    console.error("[payments:notify] firePaymentNotifications failed:", err);
  }
}

/**
 * Convert an order amount to USD using the order's actual fiat currency.
 * Non-GB orders are already priced in USD. GB orders use the group buy's
 * currency (GBP, EUR, USD, …); any non-USD currency is converted via the live
 * FX rate (with a safe fallback for fiat). The name is kept for compatibility.
 */
export async function toUsdIfGbp(amount: number, groupBuyId: string | null): Promise<number> {
  if (!groupBuyId) return amount;
  const [gb] = await db
    .select({ currency: groupBuysTable.currency })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.id, groupBuyId));
  const cur = (gb?.currency ?? "USD").toUpperCase();
  if (!gb || cur === "USD") return amount;
  const rate = await fetchFiatToUsd(cur);
  return Math.round(amount * rate * 100) / 100;
}

/**
 * Resolve the USD-per-coin rate to use for an order, preferring the rate that
 * was locked when the payment panel opened. Stablecoins are always 1. For a
 * volatile coin with no locked rate we fetch live and (optionally) persist it
 * so display and verification agree. Returns null if a volatile-coin price
 * cannot be obtained — the caller MUST block the payment in that case.
 */
export async function resolveLockedUsdPerCoin(
  order: { id: string; paymentCryptoCurrency?: string | null; paymentCryptoRate?: string | number | null },
  currency: string,
  persist = false,
): Promise<number | null> {
  if (isStablecoin(currency)) return 1;
  const lockedCur = (order.paymentCryptoCurrency ?? "").toUpperCase();
  const lockedRate = order.paymentCryptoRate != null ? parseFloat(String(order.paymentCryptoRate)) : null;
  if (lockedCur === currency.toUpperCase() && lockedRate != null && lockedRate > 0) {
    return lockedRate;
  }
  const live = await fetchUsdPerCoin(currency);
  if (live == null || live <= 0) return null;
  if (persist) {
    await db
      .update(ordersTable)
      .set({ paymentCryptoCurrency: currency.toUpperCase(), paymentCryptoRate: String(live) })
      .where(eq(ordersTable.id, order.id));
  }
  return live;
}

/**
 * Resolve the effective crypto wallet address, currency, and network for an order.
 *
 * Policy (must stay consistent with /api/payments-info display logic):
 * - Wholesale orders: use wholesale_usdt_wallet config if set; otherwise fall back to global wallet.
 * - GB orders: use GB organiserPayments.cryptoWalletAddress if it's a valid
 *   Ethereum or Bitcoin address; otherwise fall back to the global site wallet.
 * - Non-GB orders: always use the global site wallet (USDT ERC-20).
 */
export async function resolveOrderCrypto(
  order: { groupBuyId: string | null; orderType?: string | null; shippingCountry?: string | null }
): Promise<{ walletAddress: string | null; currency: string; network: string }> {
  const defaultCurrency = "USDT";
  const defaultNetwork = "ERC-20";
  const paymentRoutingEnabled = (await getConfig("paymentRoutingEnabled")) !== "false";
  if (!paymentRoutingEnabled) {
    const walletAddress = await getConfig("walletAddress");
    return { walletAddress, currency: defaultCurrency, network: defaultNetwork };
  }
  // Wholesale orders: prefer the dedicated wholesale USDT wallet
  if (order.orderType === "wholesale") {
    const wsWallet = await getConfig("wholesale_usdt_wallet");
    if (wsWallet) {
      return { walletAddress: wsWallet, currency: defaultCurrency, network: defaultNetwork };
    }
    const walletAddress = await getConfig("walletAddress");
    return { walletAddress, currency: defaultCurrency, network: defaultNetwork };
  }
  if (order.groupBuyId) {
    // Reshipper takes priority over organiser wallet — mirrors /payments-info routing
    if (order.shippingCountry) {
      const [assignment] = await db
        .select({
          reshipperPaymentDetails: gbReshippersTable.reshipperPaymentDetails,
          enabledPaymentMethods: gbReshippersTable.enabledPaymentMethods,
        })
        .from(gbReshippersTable)
        .where(and(
          eq(gbReshippersTable.gbId, order.groupBuyId),
          eq(gbReshippersTable.country, order.shippingCountry),
        ));
      if (assignment) {
        const rpd = assignment.reshipperPaymentDetails as Record<string, string | boolean | null> | null;
        const rpm = assignment.enabledPaymentMethods as Record<string, boolean> | null;
        const hasAny = !!(rpd?.usdtWallet || rpd?.cryptoWalletAddress);
        if (hasAny) {
          // cryptoWalletAddress takes precedence over the legacy usdtWallet field
          const reshipperWallet = (rpm?.cryptoEnabled && rpd?.cryptoWalletAddress)
            ? String(rpd.cryptoWalletAddress)
            : (rpm?.usdtEnabled && rpd?.usdtWallet)
              ? String(rpd.usdtWallet)
              : null;
          if (reshipperWallet) {
            const currency = (rpm?.cryptoEnabled && rpd?.cryptoCurrency) ? String(rpd.cryptoCurrency) : defaultCurrency;
            const network  = (rpm?.cryptoEnabled && rpd?.cryptoNetwork)  ? String(rpd.cryptoNetwork)  : defaultNetwork;
            return { walletAddress: reshipperWallet, currency, network };
          }
        }
      }
    }
    const [gb] = await db
      .select({ organiserPayments: groupBuysTable.organiserPayments })
      .from(groupBuysTable)
      .where(eq(groupBuysTable.id, order.groupBuyId));
    const op = gb?.organiserPayments as Record<string, string | null> | null;
    const currency = op?.["cryptoCurrency"]?.trim() ?? defaultCurrency;
    const network = op?.["cryptoNetwork"]?.trim() ?? defaultNetwork;
    const gbWallet = op?.["cryptoWalletAddress"] ?? null;
    let walletAddress: string | null = null;
    if (gbWallet && (isValidEthAddress(gbWallet) || isValidBtcAddress(gbWallet) || isValidSolanaAddress(gbWallet))) {
      walletAddress = gbWallet;
    } else {
      walletAddress = await getConfig("walletAddress");
    }
    return { walletAddress, currency, network };
  }
  const walletAddress = await getConfig("walletAddress");
  return { walletAddress, currency: defaultCurrency, network: defaultNetwork };
}

// ─── Admin multi-chain wallet configs ─────────────────────────
// Each entry describes a site_config key that holds a wallet address for a
// specific network.  Multiple currencies can share the same wallet (ERC-20 rail).
const CHAIN_WALLET_CONFIGS: Array<{
  configKey: string;
  currencies: string[];
  network: string;
}> = [
  { configKey: "walletAddress",   currencies: ["USDT", "USDC"], network: "ERC-20" },
  { configKey: "wallet_arb",      currencies: ["USDT", "USDC"], network: "Arbitrum One" },
  { configKey: "wallet_polygon",  currencies: ["USDT", "USDC"], network: "Polygon" },
  { configKey: "wallet_solana",   currencies: ["USDC", "USDT"], network: "Solana" },
  { configKey: "wallet_tron",     currencies: ["USDT"],         network: "TRC-20" },
  { configKey: "wallet_btc",      currencies: ["BTC"],          network: "Bitcoin Mainnet" },
  { configKey: "wallet_eth",      currencies: ["ETH"],          network: "Ethereum" },
];

/** All chain/currency pairs currently configured by admin, with their wallet addresses. */
export async function getAdminCryptoOptions(): Promise<Array<{ currency: string; network: string; walletAddress: string }>> {
  const opts: Array<{ currency: string; network: string; walletAddress: string }> = [];
  for (const cfg of CHAIN_WALLET_CONFIGS) {
    const wallet = await getConfig(cfg.configKey);
    if (!wallet || !wallet.trim()) continue;
    for (const cur of cfg.currencies) {
      opts.push({ currency: cur, network: cfg.network, walletAddress: wallet.trim() });
    }
  }
  return opts;
}

/**
 * Crypto payment options a customer may choose between for an order.
 * - Non-GB non-wholesale: all configured chain wallets (multi-chain).
 * - ERC-20 rail (GB/wholesale/unconfigured): USDT + USDC same wallet.
 * - Any other single-rail: the one resolved currency.
 */
export async function getOrderCryptoOptions(
  order: { groupBuyId: string | null; orderType?: string | null; shippingCountry?: string | null }
): Promise<{ walletAddress: string | null; currency: string; network: string; options: Array<{ currency: string; network: string; walletAddress: string | null }> }> {
  const base = await resolveOrderCrypto(order);

  if (!order.groupBuyId && order.orderType !== "wholesale") {
    const paymentRoutingEnabled = (await getConfig("paymentRoutingEnabled")) !== "false";
    if (paymentRoutingEnabled) {
      const chainOpts = await getAdminCryptoOptions();
      if (chainOpts.length > 0) {
        const first = chainOpts[0];
        return { walletAddress: first.walletAddress, currency: first.currency, network: first.network, options: chainOpts };
      }
    }
  }

  if (isEthErc20StableRail(base.currency, base.network, base.walletAddress)) {
    return {
      ...base,
      options: ERC20_STABLE_CURRENCIES.map(c => ({ currency: c, network: base.network, walletAddress: base.walletAddress })),
    };
  }
  return { ...base, options: [{ currency: base.currency, network: base.network, walletAddress: base.walletAddress }] };
}

/**
 * Resolve the wallet/currency/network to VERIFY against for an order, honouring
 * the customer's persisted stablecoin choice (order.paymentCryptoCurrency + paymentCryptoNetwork)
 * only when it is a valid option for this order's rail. Never trusts raw client values —
 * the choice was validated against getOrderCryptoOptions at rate-lock time.
 */
export async function resolveEffectiveOrderCrypto(
  order: { groupBuyId: string | null; orderType?: string | null; shippingCountry?: string | null; paymentCryptoCurrency?: string | null; paymentCryptoNetwork?: string | null }
): Promise<{ walletAddress: string | null; currency: string; network: string }> {
  // For non-GB non-wholesale orders: use the chain wallet matching the stored currency+network
  if (!order.groupBuyId && order.orderType !== "wholesale" && order.paymentCryptoCurrency && order.paymentCryptoNetwork) {
    const paymentRoutingEnabled = (await getConfig("paymentRoutingEnabled")) !== "false";
    if (paymentRoutingEnabled) {
      const allOpts = await getAdminCryptoOptions();
      const match = allOpts.find(o =>
        o.currency.toUpperCase() === order.paymentCryptoCurrency!.toUpperCase() &&
        o.network.toLowerCase() === order.paymentCryptoNetwork!.toLowerCase()
      );
      if (match) return { walletAddress: match.walletAddress, currency: match.currency, network: match.network };
    }
  }
  const base = await resolveOrderCrypto(order);
  const currency = effectiveStableCurrency(base.currency, base.network, base.walletAddress, order.paymentCryptoCurrency ?? null);
  return { walletAddress: base.walletAddress, currency, network: base.network };
}

// ─── Blockchain verification ───────────────────────────────────
const ETH_USDT_CONTRACT = "0xdac17f958d2ee523a2206206994597c13d831ec7";
const ETH_USDC_CONTRACT = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
const BSC_USDT_CONTRACT = "0x55d398326f99059ff775485246999027b3197955";
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const USDT_DECIMALS = 6;
const USDC_DECIMALS = 6;
const BSC_USDT_DECIMALS = 18;

const ETH_RPC_ENDPOINTS = [
  "https://eth.llamarpc.com",
  "https://cloudflare-eth.com",
  "https://rpc.ankr.com/eth",
  "https://ethereum-rpc.publicnode.com",
  "https://1rpc.io/eth",
  "https://eth-mainnet.public.blastapi.io",
  "https://ethereum.blockpi.network/v1/rpc/public",
  "https://eth.drpc.org",
  "https://mainnet.gateway.tenderly.co",
  "https://rpc.mevblocker.io",
];

const BSC_RPC_ENDPOINTS = [
  "https://bsc-dataseed.binance.org",
  "https://bsc-dataseed1.defibit.io",
  "https://bsc-dataseed1.ninicoin.io",
  "https://bsc-rpc.publicnode.com",
  "https://1rpc.io/bnb",
  "https://bsc-mainnet.public.blastapi.io",
];

const ARB_USDT_CONTRACT  = "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9";
const ARB_USDC_CONTRACT  = "0xaf88d065e77c8cc2239327c5edb3a432268e5831";
const POLY_USDT_CONTRACT = "0xc2132d05d31c914a87c6611c10748aeb04b58e8f";
const POLY_USDC_CONTRACT = "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359";
const SOL_USDC_MINT      = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const SOL_USDT_MINT      = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
const TRON_USDT_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";

const ARB_RPC_ENDPOINTS = [
  "https://arb1.arbitrum.io/rpc",
  "https://arbitrum.llamarpc.com",
  "https://rpc.ankr.com/arbitrum",
  "https://arbitrum.blockpi.network/v1/rpc/public",
  "https://1rpc.io/arb",
];

const POLYGON_RPC_ENDPOINTS = [
  "https://polygon-rpc.com",
  "https://polygon.llamarpc.com",
  "https://rpc.ankr.com/polygon",
  "https://polygon.blockpi.network/v1/rpc/public",
  "https://1rpc.io/matic",
];

const SOL_RPC_ENDPOINTS = [
  "https://api.mainnet-beta.solana.com",
  "https://rpc.ankr.com/solana",
];

async function verifySolanaTokenTransfer(
  signature: string,
  walletAddress: string,
  expectedAmount: number,
  mintAddress: string,
  tokenSymbol: string,
  tolerancePct = 0.01,
): Promise<VerifyResult> {
  let txData: any = null;
  for (const endpoint of SOL_RPC_ENDPOINTS) {
    try {
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0", id: 1, method: "getTransaction",
          params: [signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0, commitment: "confirmed" }],
        }),
        signal: AbortSignal.timeout(12000),
      });
      if (!r.ok) continue;
      const json: any = await r.json();
      if (json.error || !json.result) continue;
      txData = json.result;
      break;
    } catch { /* try next */ }
  }
  if (!txData) {
    return { verified: false, pending: true, reason: "Solana transaction not found — it may still be propagating. Please wait and try again." };
  }
  if (txData.meta?.err !== null && txData.meta?.err !== undefined) {
    return { verified: false, reason: "Solana transaction failed on-chain." };
  }
  const pre: any[] = txData.meta?.preTokenBalances ?? [];
  const post: any[] = txData.meta?.postTokenBalances ?? [];
  for (const postBal of post) {
    if (postBal.mint !== mintAddress) continue;
    if (postBal.owner !== walletAddress) continue;
    const preBal = pre.find((p: any) => p.accountIndex === postBal.accountIndex && p.mint === mintAddress);
    const preAmt = preBal ? parseFloat(preBal.uiTokenAmount?.uiAmount ?? "0") : 0;
    const postAmt = parseFloat(postBal.uiTokenAmount?.uiAmount ?? "0");
    const received = postAmt - preAmt;
    if (received <= 0) continue;
    const minAccepted = expectedAmount - Math.max(expectedAmount * tolerancePct, 0.02);
    if (received >= minAccepted) {
      return { verified: true, amountUsdt: received, blockConfirmations: 1 };
    }
    const shortfall = parseFloat((expectedAmount - received).toFixed(2));
    return { verified: false, reason: `Underpayment: ${received.toFixed(2)} ${tokenSymbol} received, ${expectedAmount.toFixed(2)} expected. Short by ${shortfall.toFixed(2)} ${tokenSymbol}.` };
  }
  return { verified: false, reason: `No ${tokenSymbol} transfer to the expected wallet found in this Solana transaction.` };
}

async function verifyTronUsdtTransfer(
  txHash: string,
  walletAddress: string,
  expectedAmount: number,
  tolerancePct = 0.01,
): Promise<VerifyResult> {
  let data: any;
  try {
    const r = await fetch(`https://apilist.tronscanapi.com/api/transaction-info?hash=${txHash}`, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(14000),
    });
    if (!r.ok) return { verified: false, reason: "Could not reach Tron network — please try again." };
    data = await r.json();
  } catch {
    return { verified: false, reason: "Could not reach Tron network — please try again." };
  }
  if (!data || !data.confirmed) {
    return { verified: false, pending: true, reason: "Tron transaction not yet confirmed. Please wait for on-chain confirmation." };
  }
  const transfers: any[] = data.trc20TransferInfo ?? [];
  for (const t of transfers) {
    const contract = (t.contract_address ?? t.contractAddress ?? "").toLowerCase();
    if (contract !== TRON_USDT_CONTRACT.toLowerCase()) continue;
    const to = (t.to_address ?? t.to ?? "");
    if (to !== walletAddress) continue;
    const decimals = parseInt(t.decimals ?? "6", 10);
    const amount = parseInt(t.amount ?? "0", 10) / Math.pow(10, decimals);
    const minAccepted = expectedAmount - Math.max(expectedAmount * tolerancePct, 0.02);
    if (amount >= minAccepted && amount > 0) {
      return { verified: true, amountUsdt: amount, blockConfirmations: 1 };
    }
    if (amount > 0) {
      const shortfall = parseFloat((expectedAmount - amount).toFixed(2));
      return { verified: false, reason: `Underpayment: ${amount.toFixed(2)} USDT received, ${expectedAmount.toFixed(2)} expected. Short by ${shortfall.toFixed(2)} USDT.` };
    }
  }
  return { verified: false, reason: "No USDT TRC-20 transfer to the expected wallet found in this Tron transaction." };
}

/**
 * @param retryOnNull - when true, a null result is treated like an error and the
 *   next endpoint is tried. Use for eth_getTransactionReceipt so a node that
 *   can't serve the receipt doesn't prematurely end the loop.
 * @param retryIf - optional validator: when it returns true for a result, that
 *   result is treated as unusable and the next endpoint is tried. Use to skip
 *   receipts with empty logs (some public nodes return partial receipts).
 */
async function evmJsonRpc(endpoints: string[], method: string, params: unknown[], retryOnNull = false, retryIf?: (result: unknown) => boolean): Promise<unknown> {
  let lastErr: unknown;
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        signal: AbortSignal.timeout(12000),
      });
      const json: any = await res.json();
      if (json.error) throw new Error(json.error.message ?? "RPC error");
      if (retryOnNull && json.result === null) {
        lastErr = new Error("null result from RPC");
        continue;
      }
      if (retryIf && retryIf(json.result)) {
        lastErr = new Error("RPC result failed validation, trying next endpoint");
        continue;
      }
      return json.result;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

type VerifyResult =
  | { verified: true; amountUsdt: number; blockConfirmations: number }
  | { verified: false; reason: string; pending?: boolean; manual?: boolean; underpayment?: boolean; amountPaid?: number; shortfall?: number };

// Generic ERC-20 / BEP-20 token transfer verifier
async function verifyErc20Transfer(
  txHash: string,
  walletAddress: string,
  expectedAmount: number,
  rpcEndpoints: string[],
  contractAddress: string,
  tokenDecimals: number,
  networkLabel: string,
  tolerancePct = 0.01,
  tokenSymbol = "USDT"
): Promise<VerifyResult> {
  // Normalise hash — Revolut/Coinbase often omit the 0x prefix
  const hash = txHash.startsWith("0x") ? txHash : `0x${txHash}`;
  let receipt: any;
  try {
    // retryOnNull: skip nodes that haven't propagated the tx yet (null receipt)
    // retryIf: skip nodes that return a receipt with empty logs — some public RPC nodes
    //   return a partial receipt (no logs) when under load, which would falsely fail
    //   the token transfer check even though the transaction is fully confirmed.
    receipt = await evmJsonRpc(
      rpcEndpoints,
      "eth_getTransactionReceipt",
      [hash],
      true,
      (r: any) => r !== null && r.status === "0x1" && Array.isArray(r.logs) && r.logs.length === 0,
    );
  } catch {
    // All endpoints either errored, returned null, or returned empty-logs receipts.
    // Treat as pending so the customer can try again rather than seeing a misleading error.
    return { verified: false, pending: true, reason: `Transaction not yet readable on ${networkLabel} — please wait a minute and try again.` };
  }
  if (!receipt) {
    return { verified: false, pending: true, reason: "Transaction not found on-chain — check the hash is correct, or wait a minute and try again." };
  }
  if (receipt.status !== "0x1") {
    return { verified: false, reason: "Transaction failed on-chain." };
  }

  const wallet = walletAddress.toLowerCase();
  for (const log of receipt.logs as any[]) {
    if (log.address?.toLowerCase() !== contractAddress) continue;
    if (!Array.isArray(log.topics) || log.topics[0] !== TRANSFER_TOPIC) continue;
    if (log.topics.length < 3) continue;

    const recipient = "0x" + log.topics[2].slice(26).toLowerCase();
    if (recipient !== wallet) continue;

    let rawAmount: bigint;
    try { rawAmount = BigInt(log.data); } catch { continue; }
    const amount = Number(rawAmount) / Math.pow(10, tokenDecimals);
    const tolerance = expectedAmount * tolerancePct;
    const minAccepted = expectedAmount - Math.max(tolerance, 0.02);

    // Accept any payment at or above the minimum threshold — overpayments are always fine
    if (amount >= minAccepted && amount > 0) {
      let blockConfirmations = 1;
      try {
        const currentBlockHex = await evmJsonRpc(rpcEndpoints, "eth_blockNumber", []) as string;
        const txBlockHex = receipt.blockNumber as string;
        const current = parseInt(currentBlockHex, 16);
        const txBlock = parseInt(txBlockHex, 16);
        blockConfirmations = Math.max(1, current - txBlock + 1);
      } catch { /* non-fatal */ }
      return { verified: true, amountUsdt: amount, blockConfirmations };
    }
    // Transfer to correct wallet found but amount is too short — track as underpayment
    if (amount > 0) {
      const shortfall = parseFloat((expectedAmount - amount).toFixed(2));
      return {
        verified: false,
        underpayment: true,
        amountPaid: parseFloat(amount.toFixed(2)),
        shortfall,
        reason: `Underpayment: ${amount.toFixed(2)} ${tokenSymbol} received, ${expectedAmount.toFixed(2)} ${tokenSymbol} expected. You are short by ${shortfall.toFixed(2)} ${tokenSymbol}.`,
      };
    }
  }
  return {
    verified: false,
    reason: "No token transfer to the wallet matching the expected amount was found in this transaction.",
  };
}

// Native ETH transfer verifier
async function verifyNativeEthTransfer(
  txHash: string,
  walletAddress: string,
  expectedAmount: number,
  tolerancePct = 0.01
): Promise<VerifyResult> {
  const hash = txHash.startsWith("0x") ? txHash : `0x${txHash}`;
  let receipt: any;
  try {
    receipt = await evmJsonRpc(ETH_RPC_ENDPOINTS, "eth_getTransactionReceipt", [hash], true);
  } catch {
    // All endpoints either errored or returned null — treat as pending
    return { verified: false, pending: true, reason: "Transaction not found on Ethereum — it may still be propagating. Please wait a minute and try again." };
  }
  if (!receipt) return { verified: false, pending: true, reason: "Transaction not found on-chain — check the hash is correct, or wait a minute and try again." };
  if (receipt.status !== "0x1") return { verified: false, reason: "Transaction failed on-chain." };

  let tx: any;
  try {
    tx = await evmJsonRpc(ETH_RPC_ENDPOINTS, "eth_getTransactionByHash", [hash]);
  } catch {
    return { verified: false, reason: "Could not fetch transaction details from Ethereum." };
  }
  if (!tx) return { verified: false, reason: "Transaction not found on Ethereum." };

  const toAddr = (tx.to ?? "").toLowerCase();
  if (toAddr !== walletAddress.toLowerCase()) {
    return { verified: false, reason: "Transaction recipient does not match the payment wallet address." };
  }

  const valueWei = BigInt(tx.value ?? "0x0");
  const amountEth = Number(valueWei) / 1e18;
  const tolerance = expectedAmount * tolerancePct;
  const minAccepted = expectedAmount - Math.max(tolerance, 1e-9);

  // Underpayment: received less than the minimum threshold
  if (amountEth < minAccepted) {
    if (amountEth > 0) {
      const shortfall = parseFloat((expectedAmount - amountEth).toFixed(6));
      return {
        verified: false,
        underpayment: true,
        amountPaid: parseFloat(amountEth.toFixed(6)),
        shortfall,
        reason: `Underpayment: ${amountEth.toFixed(6)} ETH received, ${expectedAmount.toFixed(6)} ETH expected. You are short by ${shortfall.toFixed(6)} ETH.`,
      };
    }
    return { verified: false, reason: `ETH amount received (${amountEth.toFixed(6)}) does not match expected (${expectedAmount.toFixed(6)}).` };
  }
  // At or above minimum — overpayments are always accepted

  let blockConfirmations = 1;
  try {
    const currentBlockHex = await evmJsonRpc(ETH_RPC_ENDPOINTS, "eth_blockNumber", []) as string;
    const txBlockHex = receipt.blockNumber as string;
    const current = parseInt(currentBlockHex, 16);
    const txBlock = parseInt(txBlockHex, 16);
    blockConfirmations = Math.max(1, current - txBlock + 1);
  } catch { /* non-fatal */ }

  return { verified: true, amountUsdt: amountEth, blockConfirmations };
}

// Bitcoin payment verifier via Blockstream public API
async function verifyBtcPayment(
  txid: string,
  walletAddress: string,
  expectedAmount: number,
  tolerancePct = 0.01
): Promise<VerifyResult> {
  let data: any;
  try {
    const r = await fetch(`https://blockstream.info/api/tx/${txid}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (r.status === 404) {
      return { verified: false, pending: true, reason: "Bitcoin transaction not found — it may not have been broadcast yet. Try again in a moment." };
    }
    if (!r.ok) {
      return { verified: false, reason: "Could not reach Bitcoin network — please try again shortly." };
    }
    data = await r.json();
  } catch {
    return { verified: false, reason: "Could not reach Bitcoin network — please try again shortly." };
  }

  if (!data.status?.confirmed) {
    return { verified: false, pending: true, reason: "Bitcoin transaction not yet confirmed — please wait for at least 1 block confirmation." };
  }

  for (const out of data.vout ?? []) {
    if (out.scriptpubkey_address !== walletAddress) continue;
    const btcAmount = (out.value ?? 0) / 1e8;
    const tolerance = expectedAmount * tolerancePct;
    const minAccepted = expectedAmount - Math.max(tolerance, 1e-8);

    // Accept any payment at or above the minimum threshold — overpayments are always fine
    if (btcAmount >= minAccepted && btcAmount > 0) {
      let blockConfirmations = 1;
      try {
        const tipRes = await fetch("https://blockstream.info/api/blocks/tip/height", { signal: AbortSignal.timeout(5000) });
        const tipHeight = parseInt(await tipRes.text(), 10);
        if (!isNaN(tipHeight) && data.status.block_height) {
          blockConfirmations = Math.max(1, tipHeight - data.status.block_height + 1);
        }
      } catch { /* non-fatal */ }
      return { verified: true, amountUsdt: btcAmount, blockConfirmations };
    }
    // Output to correct address found but amount is too short — underpayment
    if (btcAmount > 0) {
      const shortfall = parseFloat((expectedAmount - btcAmount).toFixed(8));
      return {
        verified: false,
        underpayment: true,
        amountPaid: parseFloat(btcAmount.toFixed(8)),
        shortfall,
        reason: `Underpayment: ${btcAmount.toFixed(8)} BTC received, ${expectedAmount.toFixed(8)} BTC expected. You are short by ${shortfall.toFixed(8)} BTC.`,
      };
    }
  }
  return {
    verified: false,
    reason: `No BTC output to the expected wallet matching the amount (${expectedAmount.toFixed(8)} BTC) was found in this transaction.`,
  };
}

// Multi-chain transaction verifier dispatcher
export async function verifyTransaction(
  txHash: string,
  walletAddress: string,
  expectedAmount: number,
  currency: string,
  network: string,
  tolerancePct = 0.01
): Promise<VerifyResult> {
  const cur = currency.toUpperCase().trim();
  const net = network.toLowerCase().trim();

  if (cur === "USDT" && /arbitrum/.test(net)) {
    return verifyErc20Transfer(txHash, walletAddress, expectedAmount, ARB_RPC_ENDPOINTS, ARB_USDT_CONTRACT, USDT_DECIMALS, "Arbitrum", tolerancePct, "USDT");
  }
  if (cur === "USDC" && /arbitrum/.test(net)) {
    return verifyErc20Transfer(txHash, walletAddress, expectedAmount, ARB_RPC_ENDPOINTS, ARB_USDC_CONTRACT, USDC_DECIMALS, "Arbitrum", tolerancePct, "USDC");
  }
  if (cur === "USDT" && /polygon/.test(net)) {
    return verifyErc20Transfer(txHash, walletAddress, expectedAmount, POLYGON_RPC_ENDPOINTS, POLY_USDT_CONTRACT, USDT_DECIMALS, "Polygon", tolerancePct, "USDT");
  }
  if (cur === "USDC" && /polygon/.test(net)) {
    return verifyErc20Transfer(txHash, walletAddress, expectedAmount, POLYGON_RPC_ENDPOINTS, POLY_USDC_CONTRACT, USDC_DECIMALS, "Polygon", tolerancePct, "USDC");
  }
  if (cur === "USDC" && /solana/.test(net)) {
    return verifySolanaTokenTransfer(txHash, walletAddress, expectedAmount, SOL_USDC_MINT, "USDC", tolerancePct);
  }
  if (cur === "USDT" && /solana/.test(net)) {
    return verifySolanaTokenTransfer(txHash, walletAddress, expectedAmount, SOL_USDT_MINT, "USDT", tolerancePct);
  }
  if (cur === "USDT" && /tron|trc/.test(net)) {
    return verifyTronUsdtTransfer(txHash, walletAddress, expectedAmount, tolerancePct);
  }
  if (cur === "USDT" && /erc.?20|ethereum/.test(net)) {
    return verifyErc20Transfer(txHash, walletAddress, expectedAmount, ETH_RPC_ENDPOINTS, ETH_USDT_CONTRACT, USDT_DECIMALS, "Ethereum", tolerancePct, "USDT");
  }
  if (cur === "USDC" && /erc.?20|ethereum/.test(net)) {
    return verifyErc20Transfer(txHash, walletAddress, expectedAmount, ETH_RPC_ENDPOINTS, ETH_USDC_CONTRACT, USDC_DECIMALS, "Ethereum", tolerancePct, "USDC");
  }
  if (cur === "USDT" && /bep.?20|bsc|binance/.test(net)) {
    return verifyErc20Transfer(txHash, walletAddress, expectedAmount, BSC_RPC_ENDPOINTS, BSC_USDT_CONTRACT, BSC_USDT_DECIMALS, "BSC", tolerancePct, "USDT");
  }
  if (cur === "ETH" && /mainnet|ethereum|erc.?20/.test(net)) {
    if (!isValidEthAddress(walletAddress)) {
      return { verified: false, reason: "ETH payment configured but no compatible EVM wallet address is set — please contact the organiser." };
    }
    return verifyNativeEthTransfer(txHash, walletAddress, expectedAmount, tolerancePct);
  }
  if (cur === "BTC" && /mainnet|bitcoin/.test(net)) {
    if (!isValidBtcAddress(walletAddress)) {
      return { verified: false, reason: "BTC payment configured but no Bitcoin wallet address is set — please contact the organiser." };
    }
    return verifyBtcPayment(txHash, walletAddress, expectedAmount, tolerancePct);
  }
  return {
    verified: false,
    manual: true,
    reason: `Automated verification is not supported for ${currency} on ${network}. Your organiser will confirm your payment manually — please contact them if you need further assistance.`,
  };
}

// ─── PUBLIC: Get payments info ─────────────────────────────────
router.get("/payments-info", optionalAccountAuth, async (req, res): Promise<void> => {
  const globalPaymentsEnabled = (await getConfig("paymentsEnabled")) === "true";
  const walletAddress = await getConfig("walletAddress");

  // Global AnonPay settings
  const globalAnonPayEnabled = (await getConfig("anonPayEnabled")) === "true";
  const globalAnonPayWallet = await getConfig("anonPayWallet");
  const globalAnonPayTicker = await getConfig("anonPayTicker");
  const globalAnonPayNetwork = await getConfig("anonPayNetwork");

  let paymentsEnabled = globalPaymentsEnabled;
  let revolutHandle: string | null = null;
  let paypalHandle: string | null = null;
  let orderCode: string | null = null;
  let cryptoCurrency: string | null = null;
  let cryptoNetwork: string | null = null;
  let cryptoWalletAddress: string | null = null;
  let availableCryptoOptions: { currency: string; network: string }[] = [];
  let anonPayEnabled: boolean = globalAnonPayEnabled;
  let anonPayWallet: string | null = globalAnonPayWallet;
  let anonPayTicker: string | null = globalAnonPayTicker;
  let anonPayNetwork: string | null = globalAnonPayNetwork;
  let isGroupBuyOrder = false;
  let collectedBy: { type: "admin" | "organiser" | "reshipper"; username?: string } = { type: "admin" };

  const paymentRoutingEnabled = (await getConfig("paymentRoutingEnabled")) !== "false";

  const orderId = req.query["orderId"] as string | undefined;
  if (orderId) {
    const [order] = await db
      .select({ groupBuyId: ordersTable.groupBuyId, code: ordersTable.code, shippingCountry: ordersTable.shippingCountry, orderType: ordersTable.orderType, directShippingRequested: ordersTable.directShippingRequested, paymentCryptoCurrency: ordersTable.paymentCryptoCurrency, paymentCryptoNetwork: ordersTable.paymentCryptoNetwork })
      .from(ordersTable)
      .where(eq(ordersTable.id, orderId));

    if (order) {
      orderCode = order.code ?? null;

      // Crypto options the buyer may choose from (e.g. USDT/USDC on the ERC-20 rail).
      // Computed from the same resolver the verify path uses, so the toggle the
      // buyer sees always matches what rate-lock + verification will accept.
      availableCryptoOptions = (await getOrderCryptoOptions(order)).options;

      // Wholesale orders: prefer wholesale-specific payment settings
      if (order.orderType === "wholesale") {
        const [wsUsdtWallet, wsAnonPayEnabled, wsAnonPayWallet, wsAnonPayTicker, wsAnonPayNetwork] = await Promise.all([
          getConfig("wholesale_usdt_wallet"),
          getConfig("wholesale_anon_pay_enabled"),
          getConfig("wholesale_anon_pay_wallet"),
          getConfig("wholesale_anon_pay_ticker"),
          getConfig("wholesale_anon_pay_network"),
        ]);
        const hasWsUsdt = !!wsUsdtWallet;
        const hasWsAnonPay = wsAnonPayEnabled === "true" && !!wsAnonPayWallet;
        if (hasWsUsdt || hasWsAnonPay) {
          if (hasWsUsdt) {
            cryptoWalletAddress = wsUsdtWallet;
            cryptoCurrency      = "USDT";
            cryptoNetwork       = "ERC-20";
          }
          if (hasWsAnonPay) {
            anonPayEnabled = true;
            anonPayWallet  = wsAnonPayWallet!;
            anonPayTicker  = wsAnonPayTicker ?? "usdt";
            anonPayNetwork = wsAnonPayNetwork ?? "ERC20";
          } else {
            anonPayEnabled = false;
          }
        }
      } else if (order.groupBuyId && paymentRoutingEnabled) {
        isGroupBuyOrder = true;
        const [gb] = await db
          .select({
            organiserPayments: groupBuysTable.organiserPayments,
            paymentsEnabled: groupBuysTable.paymentsEnabled,
            paymentsTestMode: groupBuysTable.paymentsTestMode,
            paymentsTestUsernames: groupBuysTable.paymentsTestUsernames,
            directShippingPaymentsEnabled: groupBuysTable.directShippingPaymentsEnabled,
          })
          .from(groupBuysTable)
          .where(eq(groupBuysTable.id, order.groupBuyId));

        // For GB orders the GB-level flag is authoritative.
        // Direct-to-home orders bypass GB payments-closed gate when directShippingPaymentsEnabled is on.
        if (gb) {
          const isDirectShipping = order.directShippingRequested === true;
          const directShippingCanPay = isDirectShipping && gb.directShippingPaymentsEnabled !== false;
          paymentsEnabled = !!gb.paymentsEnabled || directShippingCanPay;

          // Test mode: restrict payments to whitelisted usernames only
          if (gb.paymentsTestMode) {
            const allowed = (gb.paymentsTestUsernames as string[] | null) ?? [];
            const requesterTg = req.account?.telegramUsername ?? "";
            const bare = requesterTg.startsWith("@") ? requesterTg.slice(1) : requesterTg;
            const isAllowed = allowed.some(u => {
              const ub = u.startsWith("@") ? u.slice(1) : u;
              return ub.toLowerCase() === bare.toLowerCase();
            });
            if (!isAllowed) paymentsEnabled = false;
          }
        }

        // Check if there's a reshipper assigned for this GB + member's country
        let usedReshipper = false;
        if (order.shippingCountry) {
          const [assignment] = await db
            .select({
              reshipperUsername: gbReshippersTable.reshipperUsername,
              reshipperPaymentDetails: gbReshippersTable.reshipperPaymentDetails,
              enabledPaymentMethods: gbReshippersTable.enabledPaymentMethods,
            })
            .from(gbReshippersTable)
            .where(and(
              eq(gbReshippersTable.gbId, order.groupBuyId),
              eq(gbReshippersTable.country, order.shippingCountry),
            ));

          if (assignment) {
            const rpd = assignment.reshipperPaymentDetails as Record<string, string | boolean | null> | null;
            const rpm = assignment.enabledPaymentMethods as Record<string, boolean> | null;
            // Only use reshipper details if they have at least one field filled in
            const hasAny = !!(
              rpd?.usdtWallet || rpd?.revolutHandle || rpd?.paypalHandle ||
              rpd?.cryptoWalletAddress || rpd?.anonPayWallet
            );
            if (hasAny) {
              usedReshipper = true;
              collectedBy = { type: "reshipper", username: assignment.reshipperUsername };
              // Use reshipper payment details, filtered by what admin enabled
              revolutHandle       = (rpm?.revolutEnabled  && rpd?.revolutHandle)  ? String(rpd.revolutHandle)  : null;
              paypalHandle        = (rpm?.paypalEnabled   && rpd?.paypalHandle)   ? String(rpd.paypalHandle)   : null;
              cryptoCurrency      = (rpm?.cryptoEnabled   && rpd?.cryptoCurrency) ? String(rpd.cryptoCurrency) : null;
              cryptoNetwork       = (rpm?.cryptoEnabled   && rpd?.cryptoNetwork)  ? String(rpd.cryptoNetwork)  : null;
              cryptoWalletAddress = (rpm?.cryptoEnabled   && rpd?.cryptoWalletAddress) ? String(rpd.cryptoWalletAddress) : null;
              if (rpm?.anonPayEnabled && rpd?.anonPayWallet && rpd?.anonPayTicker && rpd?.anonPayNetwork) {
                anonPayEnabled = true;
                anonPayWallet  = String(rpd.anonPayWallet);
                anonPayTicker  = String(rpd.anonPayTicker);
                anonPayNetwork = String(rpd.anonPayNetwork);
              } else {
                anonPayEnabled = false;
              }
              // USDT: map to crypto fields if cryptoEnabled and usdtWallet is set but no cryptoWalletAddress
              if (rpm?.usdtEnabled && rpd?.usdtWallet && !cryptoWalletAddress) {
                cryptoWalletAddress = String(rpd.usdtWallet);
                cryptoCurrency      = "USDT";
                cryptoNetwork       = cryptoNetwork ?? "TRC-20 / ERC-20";
              }
            }
          }
        }

        // Fall back to organiser payment details if no reshipper used
        if (!usedReshipper) {
          const op: OrganiserPayments | null = gb?.organiserPayments as OrganiserPayments | null;
          if (op) {
            revolutHandle       = op.revolutHandle       ?? null;
            paypalHandle        = op.paypalHandle        ?? null;
            cryptoCurrency      = op.cryptoCurrency      ?? null;
            cryptoNetwork       = op.cryptoNetwork       ?? null;
            cryptoWalletAddress = op.cryptoWalletAddress ?? null;
            if (op.anonPayEnabled !== undefined) anonPayEnabled = !!op.anonPayEnabled;
            if (op.anonPayWallet)  anonPayWallet  = op.anonPayWallet;
            if (op.anonPayTicker)  anonPayTicker  = op.anonPayTicker;
            if (op.anonPayNetwork) anonPayNetwork = op.anonPayNetwork;
          }
          const hasOrganiserDetails = !!(revolutHandle || paypalHandle || cryptoWalletAddress || (anonPayEnabled && anonPayWallet));
          collectedBy = hasOrganiserDetails ? { type: "organiser" } : { type: "admin" };
        }
      }

      // Non-GB direct-to-home orders: override paymentsEnabled when global directShippingPaymentsEnabled is on
      if (!order.groupBuyId && order.directShippingRequested === true && !paymentsEnabled) {
        const directShippingPaymentsEnabled = (await getConfig("directShippingPaymentsEnabled")) !== "false";
        if (directShippingPaymentsEnabled) paymentsEnabled = true;
      }

      // Reflect the buyer's previously-chosen token so the panel re-opens on the
      // same coin/network after a refresh — but only when it is still a valid option.
      const persistedCur = (order.paymentCryptoCurrency ?? "").toUpperCase();
      const persistedNet = (order.paymentCryptoNetwork  ?? "").toLowerCase();
      const selMatch =
        (persistedCur && persistedNet)
          ? availableCryptoOptions.find(o => o.currency.toUpperCase() === persistedCur && o.network.toLowerCase() === persistedNet)
          : persistedCur
            ? availableCryptoOptions.find(o => o.currency.toUpperCase() === persistedCur)
            : null;
      if (selMatch) {
        cryptoCurrency = selMatch.currency;
        cryptoNetwork  = selMatch.network;
        // For non-GB multi-chain orders: surface the per-chain wallet so the frontend
        // can validate the address format correctly (EVM vs Solana vs Tron).
        if (!order.groupBuyId && (selMatch as any).walletAddress) {
          cryptoWalletAddress = (selMatch as any).walletAddress;
        }
      } else if (!order.groupBuyId && availableCryptoOptions.length > 0) {
        // No persisted match — surface first option's wallet for non-GB orders
        const first = availableCryptoOptions[0];
        cryptoCurrency = first.currency;
        cryptoNetwork  = first.network;
        if ((first as any).walletAddress) cryptoWalletAddress = (first as any).walletAddress;
      }
    }
  }

  res.json({
    paymentsEnabled,
    walletAddress,
    isGroupBuyOrder,
    revolutHandle,
    paypalHandle,
    orderCode,
    cryptoCurrency,
    cryptoNetwork,
    cryptoWalletAddress,
    availableCryptoOptions,
    anonPayEnabled,
    anonPayWallet,
    anonPayTicker,
    anonPayNetwork,
    collectedBy,
  });
});

// ─── PUBLIC: Lock the GBP→USD rate for an order ───────────────
// Called when the payment panel opens so the rate is frozen at a
// known moment and used consistently for both display and verification.
router.post("/orders/:id/lock-usdt-rate", async (req, res): Promise<void> => {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, req.params.id));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  const { currency: baseCurrency, network: baseNetwork, options } = await getOrderCryptoOptions(order);

  // Honour a customer-selected crypto currency+network, but only when it is a valid
  // option for this order's rail. When the client sends nothing, keep the
  // previously-persisted choice so a page refresh never silently clobbers it.
  // Anything invalid falls back to the server default — never trust the client blindly.
  const reqCurrency = typeof req.body?.cryptoCurrency === "string" ? req.body.cryptoCurrency.toUpperCase().trim() : "";
  const reqNetwork  = typeof req.body?.cryptoNetwork  === "string" ? req.body.cryptoNetwork.trim() : "";
  const persistedCur = (order.paymentCryptoCurrency ?? "").toUpperCase();
  const persistedNet = (order.paymentCryptoNetwork  ?? "").toLowerCase();

  // Match by currency+network when client sends both; fall back to currency-only match; then persisted; then base
  const resolvedOpt =
    (reqCurrency && reqNetwork)
      ? options.find(o => o.currency.toUpperCase() === reqCurrency && o.network.toLowerCase() === reqNetwork.toLowerCase())
      : reqCurrency
        ? options.find(o => o.currency.toUpperCase() === reqCurrency)
        : null;
  const persistedOpt =
    (persistedCur && persistedNet)
      ? options.find(o => o.currency.toUpperCase() === persistedCur && o.network.toLowerCase() === persistedNet)
      : persistedCur
        ? options.find(o => o.currency.toUpperCase() === persistedCur)
        : null;
  const chosenOpt = resolvedOpt ?? persistedOpt ?? options[0] ?? { currency: baseCurrency, network: baseNetwork, walletAddress: null };
  const currency = chosenOpt.currency;
  const network  = chosenOpt.network;
  const walletAddress = chosenOpt.walletAddress ?? null;

  // Persist the chosen currency+network so the verify endpoints + auto-verifiers
  // check the same token/chain the buyer was shown.
  const curChanged = (order.paymentCryptoCurrency ?? "").toUpperCase() !== currency.toUpperCase();
  const netChanged = (order.paymentCryptoNetwork  ?? "").toLowerCase() !== network.toLowerCase();
  if (curChanged || netChanged) {
    await db.update(ordersTable)
      .set({ paymentCryptoCurrency: currency.toUpperCase(), paymentCryptoNetwork: network })
      .where(eq(ordersTable.id, order.id));
  }

  // Lock the USD total (fiat → USD). Re-use a cached value only when it is
  // still within 3% of the current total.
  const currentUsd = await toUsdIfGbp(parseFloat(String(order.grandTotal)), order.groupBuyId ?? null);
  const lockedUsd = order.paymentUsdAmount != null ? parseFloat(String(order.paymentUsdAmount)) : null;
  const lockIsStale = lockedUsd != null && Math.abs(lockedUsd - currentUsd) > currentUsd * 0.03;
  const usdAmount = (lockedUsd != null && !lockIsStale) ? lockedUsd : currentUsd;
  if (lockedUsd == null || lockIsStale) {
    await db.update(ordersTable).set({ paymentUsdAmount: String(usdAmount) }).where(eq(ordersTable.id, order.id));
  }

  // Lock the coin price (USD → coin). Stablecoins are 1:1; for volatile coins we
  // must have a live price — never guess.
  const usdPerCoin = await resolveLockedUsdPerCoin(order, currency, true);
  if (usdPerCoin == null) {
    res.status(503).json({
      error: "Couldn't load the live exchange rate for this coin. Please try again in a moment.",
      rateUnavailable: true,
    });
    return;
  }

  const stable = isStablecoin(currency);
  const decimals = cryptoDecimals(currency);
  const cryptoAmount = roundCrypto(usdAmount / usdPerCoin, currency);

  res.json({
    usdAmount,
    cryptoCurrency: currency,
    cryptoNetwork: network,
    walletAddress,
    usdPerCoin,
    cryptoAmount,
    isStable: stable,
    decimals,
    availableCryptoOptions: options,
  });
});

// ─── PUBLIC: Generate a test payment amount ────────────────────
router.post("/orders/:id/generate-test", async (req, res): Promise<void> => {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, req.params.id));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  if (order.groupBuyId) {
    // GB orders: GB-level paymentsEnabled is authoritative — global flag does not apply
    const [gb] = await db.select({ paymentsEnabled: groupBuysTable.paymentsEnabled, directShippingPaymentsEnabled: groupBuysTable.directShippingPaymentsEnabled, allowedCountries: groupBuysTable.allowedCountries, excludedCountries: groupBuysTable.excludedCountries }).from(groupBuysTable).where(eq(groupBuysTable.id, order.groupBuyId));
    const directCanBypassClosed = order.directShippingRequested && gb?.directShippingPaymentsEnabled !== false;
    if (!gb || (!gb.paymentsEnabled && !directCanBypassClosed)) {
      res.status(403).json({ error: "Payments are not currently open for this group buy" });
      return;
    }
    if (order.directShippingRequested && gb.directShippingPaymentsEnabled === false) {
      res.status(403).json({ error: "Payments are not currently accepted for direct-to-home shipping orders" });
      return;
    }
    if (!await checkPaymentCountry(order, gb, res)) return;
    if (!await checkLegPaymentBlocked(order, res)) return;
  } else {
    // Non-GB orders: check global paymentsEnabled
    const paymentsEnabled = (await getConfig("paymentsEnabled")) === "true";
    if (!paymentsEnabled) {
      res.status(403).json({ error: "Payments are not currently enabled" });
      return;
    }
  }

  if (order.paymentStatus === "confirmed") {
    res.status(400).json({ error: "Payment already confirmed" });
    return;
  }

  if (order.paymentTestAmount && order.paymentStatus === "test_ready") {
    res.json({
      paymentTestAmount: parseFloat(String(order.paymentTestAmount)),
      paymentStatus: order.paymentStatus,
    });
    return;
  }

  const testAmount = parseFloat((1 + Math.random()).toFixed(2));

  const [updated] = await db
    .update(ordersTable)
    .set({ paymentTestAmount: String(testAmount), paymentStatus: "test_ready" })
    .where(eq(ordersTable.id, req.params.id))
    .returning();

  res.json({
    paymentTestAmount: parseFloat(String(updated.paymentTestAmount)),
    paymentStatus: updated.paymentStatus,
  });
});

// ─── PUBLIC: Submit test payment TX hash ───────────────────────
router.post("/orders/:id/submit-test", async (req, res): Promise<void> => {
  const { txHash } = req.body;
  const cleanHash = typeof txHash === "string" ? txHash.trim() : "";

  if (!cleanHash) {
    writeLog("payment", "warn", "payment_test_rejected_invalid_hash", `Empty tx hash submitted for test payment on order ${req.params.id}`, { orderId: req.params.id, txHash: "", reason: "empty hash" }, req.ip).catch(() => {});
    res.status(400).json({ error: "Transaction hash is required" });
    return;
  }
  if (!isValidTxHash(cleanHash)) {
    writeLog("payment", "warn", "payment_test_rejected_invalid_hash", `Invalid tx hash format for test payment on order ${req.params.id}`, { orderId: req.params.id, txHash: cleanHash, reason: "invalid hash format" }, req.ip).catch(() => {});
    res.status(400).json({ error: "Invalid transaction hash format. Expected a 64-character hex string (0x-prefixed for Ethereum/BSC, or plain hex for Bitcoin)." });
    return;
  }

  // Anti-replay: reject a TXID already recorded on any other order
  const txReuse = await db
    .select({ id: ordersTable.id })
    .from(ordersTable)
    .where(and(
      sql`${ordersTable.id} <> ${req.params.id}`,
      or(
        eq(ordersTable.paymentTxHash, cleanHash),
        eq(ordersTable.testPaymentTxHash, cleanHash),
        sql`(${ordersTable.id} IS NOT NULL AND balance_tx_hash = ${cleanHash})`,
      ),
    ));
  if (txReuse.length > 0) {
    writeLog("payment", "warn", "payment_test_rejected_replay", `Test tx hash reuse attempt on order ${req.params.id}`, { orderId: req.params.id, txHash: cleanHash, conflictOrderId: txReuse[0]?.id, reason: "hash already used on another order" }, req.ip).catch(() => {});
    res.status(400).json({ error: "This transaction hash has already been used on another order. Each on-chain payment can only be applied once." });
    return;
  }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, req.params.id));
  if (!order) {
    writeLog("payment", "warn", "payment_test_rejected_not_found", `Order not found for test payment: ${req.params.id}`, { orderId: req.params.id, txHash: cleanHash, reason: "order not found" }, req.ip).catch(() => {});
    res.status(404).json({ error: "Order not found" }); return;
  }
  if (!order.paymentTestAmount) {
    writeLog("payment", "warn", "payment_test_rejected_no_amount", `No test payment amount for order ${order.code}`, { orderId: order.id, code: order.code, username: order.telegramUsername, txHash: cleanHash, reason: "no test amount generated" }, req.ip).catch(() => {});
    res.status(400).json({ error: "No test payment generated for this order" });
    return;
  }

  const { walletAddress, currency, network } = await resolveEffectiveOrderCrypto(order);
  if (!walletAddress) {
    writeLog("payment", "warn", "payment_test_rejected_wallet", `Wallet not configured for test payment on order ${order.code}`, { orderId: order.id, code: order.code, username: order.telegramUsername, currency, network, reason: "wallet not configured" }, req.ip).catch(() => {});
    res.status(400).json({ error: "Wallet address not configured" });
    return;
  }

  const testUsd = parseFloat(String(order.paymentTestAmount));
  const usdPerCoin = await resolveLockedUsdPerCoin(order, currency, true);
  if (usdPerCoin == null) {
    res.json({ verified: false, pending: true, reason: "Couldn't load the live exchange rate for this coin. Please wait a moment and try again." });
    return;
  }
  const expectedAmount = roundCrypto(testUsd / usdPerCoin, currency);
  const result = await verifyTransaction(cleanHash, walletAddress, expectedAmount, currency, network);

  if (!result.verified) {
    writeLog("payment", "warn", "payment_test_failed", `Test tx verification failed for order ${order.code}: ${result.reason}`, { orderId: order.id, code: order.code, username: order.telegramUsername, txHash: cleanHash, currency, network, expectedAmount, pending: result.pending ?? false, reason: result.reason }, req.ip).catch(() => {});
    res.json({ verified: false, pending: result.pending ?? false, reason: result.reason });
    return;
  }

  const [updated] = await db
    .update(ordersTable)
    .set({ testPaymentTxHash: cleanHash, paymentStatus: "test_confirmed" })
    .where(eq(ordersTable.id, req.params.id))
    .returning();

  writeLog("payment", "info", "payment_test_submitted", `Test payment confirmed for order ${order.code}`, { orderId: order.id, code: order.code, username: order.telegramUsername, txHash: cleanHash, amountUsdt: result.amountUsdt, currency, network }, req.ip).catch(() => {});
  await logCustomerActivity({
    telegramUsername: order.telegramUsername,
    eventCategory: "payment",
    eventType: "payment.test_submitted",
    entityId: order.id,
    actorType: "customer",
    metadata: { code: order.code, txHash: cleanHash, amountUsdt: result.amountUsdt, paymentType: "test_crypto" },
  }).catch(err => console.error("[payments] payment_submitted (test) log failed:", err));

  // Notify admin of test payment received. Amounts are shown in the coin the
  // buyer actually pays in (USD totals converted at the locked rate).
  (() => {
    const decimals = cryptoDecimals(currency);
    const lockedUsd = order.paymentUsdAmount != null ? parseFloat(String(order.paymentUsdAmount)) : parseFloat(String(order.grandTotal));
    const testCoin = roundCrypto(testUsd / usdPerCoin, currency);
    const remainderCoin = roundCrypto(Math.max(0, lockedUsd - testUsd) / usdPerCoin, currency);
    const deliveryLabel = order.deliveryMethod ?? "—";
    const code = order.code ?? order.id;
    const username = order.telegramUsername.replace(/^@/, "");
    const notify = async () => {
      let gbContext = "";
      if (order.groupBuyId) {
        const [gb] = await db
          .select({ name: groupBuysTable.name })
          .from(groupBuysTable)
          .where(eq(groupBuysTable.id, order.groupBuyId));
        if (gb) gbContext = `\nGB: <b>${escHtml(gb.name)}</b>`;
      }
      await sendAdminFromTemplate("admin_test_payment_confirmed", {
        code, username, gb_name: gbContext,
        test_amount: testCoin.toFixed(decimals),
        txid: cleanHash,
        remainder: remainderCoin.toFixed(decimals),
        delivery: deliveryLabel,
        coin: currency,
      });
    };
    notify().catch(() => {});
  })();

  res.json({ verified: true, paymentStatus: updated.paymentStatus, amountUsdt: result.amountUsdt });
});

// ─── PUBLIC: Submit full payment TX hash ──────────────────────
router.post("/orders/:id/pay", async (req, res): Promise<void> => {
  const { txHash } = req.body;
  const cleanHash = typeof txHash === "string" ? txHash.trim() : "";

  if (!cleanHash) {
    writeLog("payment", "warn", "payment_rejected_invalid_hash", `Empty tx hash submitted for payment on order ${req.params.id}`, { orderId: req.params.id, txHash: "", reason: "empty hash" }, req.ip).catch(() => {});
    res.status(400).json({ error: "Transaction hash is required" });
    return;
  }
  if (!isValidTxHash(cleanHash)) {
    writeLog("payment", "warn", "payment_rejected_invalid_hash", `Invalid tx hash format for payment on order ${req.params.id}`, { orderId: req.params.id, txHash: cleanHash, reason: "invalid hash format" }, req.ip).catch(() => {});
    res.status(400).json({ error: "Invalid transaction hash format. Expected a 64-character hex string (0x-prefixed for Ethereum/BSC, or plain hex for Bitcoin)." });
    return;
  }

  // Anti-replay: reject a TXID already confirmed on any other order
  const txReuse = await db
    .select({ id: ordersTable.id })
    .from(ordersTable)
    .where(and(
      sql`${ordersTable.id} <> ${req.params.id}`,
      or(
        eq(ordersTable.paymentTxHash, cleanHash),
        eq(ordersTable.testPaymentTxHash, cleanHash),
        sql`(${ordersTable.id} IS NOT NULL AND balance_tx_hash = ${cleanHash})`,
      ),
    ));
  if (txReuse.length > 0) {
    writeLog("payment", "warn", "payment_rejected_replay", `Full tx hash reuse attempt on order ${req.params.id}`, { orderId: req.params.id, txHash: cleanHash, conflictOrderId: txReuse[0]?.id, reason: "hash already used on another order" }, req.ip).catch(() => {});
    res.status(400).json({ error: "This transaction hash has already been used on another order. Each on-chain payment can only be applied once." });
    return;
  }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, req.params.id));
  if (!order) {
    writeLog("payment", "warn", "payment_rejected_not_found", `Order not found for payment: ${req.params.id}`, { orderId: req.params.id, txHash: cleanHash, reason: "order not found" }, req.ip).catch(() => {});
    res.status(404).json({ error: "Order not found" }); return;
  }

  if (order.groupBuyId) {
    // GB orders: GB-level paymentsEnabled is authoritative — global flag does not apply
    const [gb] = await db.select({ paymentsEnabled: groupBuysTable.paymentsEnabled, directShippingPaymentsEnabled: groupBuysTable.directShippingPaymentsEnabled, allowedCountries: groupBuysTable.allowedCountries, excludedCountries: groupBuysTable.excludedCountries }).from(groupBuysTable).where(eq(groupBuysTable.id, order.groupBuyId));
    const directCanBypassClosed = order.directShippingRequested && gb?.directShippingPaymentsEnabled !== false;
    if (!gb || (!gb.paymentsEnabled && !directCanBypassClosed)) {
      writeLog("payment", "warn", "payment_rejected_disabled", `Payment rejected — GB payments disabled for order ${order.code}`, { orderId: order.id, code: order.code, username: order.telegramUsername, groupBuyId: order.groupBuyId, txHash: cleanHash, reason: "GB payments disabled" }, req.ip).catch(() => {});
      res.status(403).json({ error: "Payments are not currently open for this group buy" });
      return;
    }
    if (order.directShippingRequested && gb.directShippingPaymentsEnabled === false) {
      writeLog("payment", "warn", "payment_rejected_disabled", `Payment rejected — direct-to-home payments disabled for order ${order.code}`, { orderId: order.id, code: order.code, username: order.telegramUsername, groupBuyId: order.groupBuyId, txHash: cleanHash, reason: "direct shipping payments disabled" }, req.ip).catch(() => {});
      res.status(403).json({ error: "Payments are not currently accepted for direct-to-home shipping orders" });
      return;
    }
    if (!await checkPaymentCountry(order, gb, res)) {
      writeLog("payment", "warn", "payment_rejected_country", `Payment rejected — country restriction for order ${order.code}`, { orderId: order.id, code: order.code, username: order.telegramUsername, groupBuyId: order.groupBuyId, shippingCountry: order.shippingCountry ?? null, txHash: cleanHash, reason: "country restriction" }, req.ip).catch(() => {});
      return;
    }
    if (!await checkLegPaymentBlocked(order, res)) {
      writeLog("payment", "warn", "payment_rejected_leg_blocked", `Payment rejected — country leg payment blocked for order ${order.code}`, { orderId: order.id, code: order.code, username: order.telegramUsername, countryLegId: order.countryLegId, reason: "leg payment blocked" }, req.ip).catch(() => {});
      return;
    }
  } else {
    // Non-GB orders: check global paymentsEnabled
    const paymentsEnabled = (await getConfig("paymentsEnabled")) === "true";
    if (!paymentsEnabled) {
      writeLog("payment", "warn", "payment_rejected_disabled", `Payment rejected — payments globally disabled for order ${order.code}`, { orderId: order.id, code: order.code, username: order.telegramUsername, txHash: cleanHash, reason: "payments globally disabled" }, req.ip).catch(() => {});
      res.status(403).json({ error: "Payments are not currently enabled" });
      return;
    }
  }

  const { walletAddress, currency, network } = await resolveEffectiveOrderCrypto(order);
  if (!walletAddress) {
    writeLog("payment", "warn", "payment_rejected_wallet", `Wallet not configured for payment on order ${order.code}`, { orderId: order.id, code: order.code, username: order.telegramUsername, currency, network, reason: "wallet not configured" }, req.ip).catch(() => {});
    res.status(400).json({ error: "Wallet address not configured" });
    return;
  }

  if (order.paymentStatus === "confirmed") {
    writeLog("payment", "warn", "payment_rejected_already_confirmed", `Payment attempt on already-confirmed order ${order.code}`, { orderId: order.id, code: order.code, username: order.telegramUsername, txHash: cleanHash, reason: "already confirmed" }, req.ip).catch(() => {});
    res.status(400).json({ error: "Payment already confirmed" });
    return;
  }

  const grandTotalRaw = parseFloat(String(order.grandTotal));
  const testAmount = order.paymentStatus === "test_confirmed" && order.paymentTestAmount
    ? parseFloat(String(order.paymentTestAmount))
    : 0;
  const creditsApplied = order.creditsApplied ? parseFloat(String(order.creditsApplied)) : 0;

  // Always compute the current fiat→USD value of the grand total. The locked
  // amount (paymentUsdAmount) is honoured only when it is within 3% of the
  // current total — enough to absorb normal FX drift between panel-open and
  // submission. A larger gap in EITHER direction means the order was edited
  // after the rate was locked; the fresh total is used instead. This prevents
  // a stale-lock exploit where a customer pays a lower pre-edit amount and gets
  // confirmed, and also stops verify from demanding a higher pre-edit amount
  // after an order is edited down.
  const currentGrandTotalUsd = await toUsdIfGbp(grandTotalRaw, order.groupBuyId ?? null);
  const lockedUsdTotal = order.paymentUsdAmount ? parseFloat(String(order.paymentUsdAmount)) : null;
  const lockIsStale = lockedUsdTotal != null && Math.abs(lockedUsdTotal - currentGrandTotalUsd) > currentGrandTotalUsd * 0.03;
  if (lockIsStale) {
    await db.update(ordersTable).set({ paymentUsdAmount: null }).where(eq(ordersTable.id, order.id));
  }
  const grandTotalUsd = (lockedUsdTotal != null && !lockIsStale) ? lockedUsdTotal : currentGrandTotalUsd;

  // Subtract any credits the customer applied at order time — the payment panel
  // already shows the reduced amount, so the on-chain verification must match.
  const netUsd = Math.max(0, Math.max(0, grandTotalUsd - creditsApplied) - testAmount);

  // Convert the USD total to the chosen coin using the rate locked when the
  // panel opened. For volatile coins with no usable rate we must block — never
  // verify against a guessed amount.
  const usdPerCoin = await resolveLockedUsdPerCoin(order, currency, true);
  if (usdPerCoin == null) {
    writeLog("payment", "warn", "payment_rate_unavailable", `Live coin rate unavailable for order ${order.code}`, { orderId: order.id, code: order.code, username: order.telegramUsername, currency, network, reason: "coin rate unavailable" }, req.ip).catch(() => {});
    res.status(503).json({ error: "Couldn't load the live exchange rate for this coin. Please try again in a moment.", rateUnavailable: true });
    return;
  }
  const expectedAmount = roundCrypto(netUsd / usdPerCoin, currency);

  const result = await verifyTransaction(cleanHash, walletAddress, expectedAmount, currency, network);

  if (!result.verified) {
    if (result.underpayment) {
      // Underpayment: save tx hash, flag for admin review, tell customer the shortfall
      await db
        .update(ordersTable)
        .set({ paymentTxHash: cleanHash, paymentStatus: "pending_confirmation" })
        .where(eq(ordersTable.id, req.params.id));
      writeLog("payment", "warn", "payment_underpayment", `Underpayment for order ${order.code}: paid ${result.amountPaid}, expected ${expectedAmount} ${currency}`, { orderId: order.id, code: order.code, username: order.telegramUsername, txHash: cleanHash, amountPaid: result.amountPaid, shortfall: result.shortfall, expectedAmount, currency, network, reason: "underpayment" }, req.ip).catch(() => {});
      await logCustomerActivity({
        telegramUsername: order.telegramUsername,
        eventCategory: "payment",
        eventType: "payment.underpayment",
        entityId: order.id,
        actorType: "customer",
        metadata: { code: order.code, txHash: cleanHash, amountPaid: result.amountPaid, shortfall: result.shortfall, expectedAmount, currency, network },
      }).catch(err => console.error("[payments] underpayment log failed:", err));
      firePaymentNotifications(order, "submitted", `Crypto (Underpayment — short by ${result.shortfall} ${currency})`).catch(() => {});
      res.json({ verified: false, underpayment: true, amountPaid: result.amountPaid, shortfall: result.shortfall, currency, reason: result.reason });
      return;
    }
    if (result.manual) {
      // Unsupported/manual rail: save tx hash and queue for organiser confirmation
      await db
        .update(ordersTable)
        .set({ paymentTxHash: cleanHash, paymentStatus: "pending_confirmation" })
        .where(eq(ordersTable.id, req.params.id));
      writeLog("payment", "info", "payment_manual", `Manual payment queued for order ${order.code} (${currency}/${network})`, { orderId: order.id, code: order.code, username: order.telegramUsername, txHash: cleanHash, currency, network, reason: result.reason }, req.ip).catch(() => {});
      firePaymentNotifications(order, "submitted", "Crypto (Manual Confirmation)").catch(() => {});
    } else {
      // Store txHash and queue for the background auto-verifier to retry.
      // IMPORTANT: if the order was in test_confirmed status, keep it there.
      // Demoting to pending_confirmation would cause the auto-verifier to
      // compute expectedAmount = grandTotal (no test deduction), permanently
      // mismatching what the customer sent (grandTotal − testAmount).
      const nextStatus = order.paymentStatus === "test_confirmed" ? "test_confirmed" : "pending_confirmation";
      await db
        .update(ordersTable)
        .set({ paymentTxHash: cleanHash, paymentStatus: nextStatus })
        .where(eq(ordersTable.id, req.params.id));
      writeLog("payment", "warn", "payment_failed", `Tx verification failed for order ${order.code}: ${result.reason}`, { orderId: order.id, code: order.code, username: order.telegramUsername, txHash: cleanHash, currency, network, expectedAmount, pending: result.pending ?? false, reason: result.reason }, req.ip).catch(() => {});
    }
    res.json({ verified: false, pending: result.pending ?? false, reason: result.reason });
    return;
  }

  const [updated] = await db
    .update(ordersTable)
    .set({ paymentStatus: "confirmed", paymentTxHash: cleanHash, paymentConfirmedAt: new Date(), amountDue: "0.00" })
    .where(eq(ordersTable.id, req.params.id))
    .returning();

  writeLog("payment", "info", "payment_confirmed", `Payment confirmed for order ${order.code} — ${result.amountUsdt} ${currency}`, { orderId: order.id, code: order.code, username: order.telegramUsername, txHash: cleanHash, amountUsdt: result.amountUsdt, grandTotal: order.grandTotal, currency, network, reason: "payment confirmed" }, req.ip).catch(() => {});
  await logCustomerActivity({
    telegramUsername: order.telegramUsername,
    eventCategory: "payment",
    eventType: "payment.confirmed",
    entityId: order.id,
    actorType: "customer",
    metadata: { code: order.code, txHash: cleanHash, amountUsdt: result.amountUsdt, grandTotal: order.grandTotal, currency, network, paymentType: "crypto" },
  }).catch(err => console.error("[payments] payment_submitted log failed:", err));

  firePaymentNotifications(order, "confirmed", "Crypto", result.amountUsdt, cleanHash).catch(() => {});
  maybeSubmitSharedOrder(order.id).catch(() => {});

  res.json({ verified: true, paymentStatus: updated.paymentStatus, amountUsdt: result.amountUsdt });
});

// ─── PUBLIC: Initiate AnonPay payment via Trocador ─────────────
router.post("/orders/:id/init-anonpay", async (req, res): Promise<void> => {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, req.params.id));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  if (order.paymentStatus === "confirmed") {
    writeLog("payment", "warn", "anonpay_rejected_already_confirmed", `AnonPay init on already-confirmed order ${order.code}`, { orderId: order.id, code: order.code, username: order.telegramUsername, reason: "already confirmed" }, req.ip).catch(() => {});
    res.status(400).json({ error: "Payment already confirmed" }); return;
  }

  // If the order already has an AnonPay session stored, return it rather than creating
  // a brand-new Trocador swap. This covers two cases:
  //   1. status = "pending_confirmation" — customer already clicked "I've Sent Payment"
  //   2. status = "unpaid" — customer refreshed mid-payment before confirming
  // In case 2 we also upgrade the status so the auto-poll can track Trocador.
  const ANON_PAY_PREFIX = "anonpay:";
  if (order.paymentTxHash?.startsWith(ANON_PAY_PREFIX)) {
    const existingRaw = order.paymentTxHash.slice(ANON_PAY_PREFIX.length);
    // Strip any appended blockchain hash added at confirmation ("sessionId|txHash")
    const existingId = existingRaw.includes("|") ? existingRaw.split("|")[0] : existingRaw;
    const existingIframeUrl = `https://trocador.app/en/anonpay/${encodeURIComponent(existingId)}?embed=1`;
    // Upgrade status to pending_confirmation so the auto-poll activates immediately
    if (order.paymentStatus !== "pending_confirmation" && order.paymentStatus !== "confirmed") {
      await db.update(ordersTable)
        .set({ paymentStatus: "pending_confirmation" })
        .where(eq(ordersTable.id, req.params.id));
      writeLog("payment", "info", "anonpay_session_restored", `Restored AnonPay session for order ${order.code} after page refresh`, { orderId: order.id, code: order.code, username: order.telegramUsername, paymentId: existingId }, req.ip).catch(() => {});
    }
    res.json({ iframeUrl: existingIframeUrl, paymentId: existingId, existing: true }); return;
  }

  // Check payments enabled
  if (order.groupBuyId) {
    const [gb] = await db.select({ paymentsEnabled: groupBuysTable.paymentsEnabled, directShippingPaymentsEnabled: groupBuysTable.directShippingPaymentsEnabled, allowedCountries: groupBuysTable.allowedCountries, excludedCountries: groupBuysTable.excludedCountries }).from(groupBuysTable).where(eq(groupBuysTable.id, order.groupBuyId));
    const directCanBypassClosed = order.directShippingRequested && gb?.directShippingPaymentsEnabled !== false;
    if (!gb || (!gb.paymentsEnabled && !directCanBypassClosed)) {
      res.status(403).json({ error: "Payments are not currently open for this group buy" }); return;
    }
    if (order.directShippingRequested && gb.directShippingPaymentsEnabled === false) {
      res.status(403).json({ error: "Payments are not currently accepted for direct-to-home shipping orders" }); return;
    }
    if (!await checkPaymentCountry(order, gb, res)) return;
    if (!await checkLegPaymentBlocked(order, res)) return;
  } else {
    const paymentsEnabled = (await getConfig("paymentsEnabled")) === "true";
    if (!paymentsEnabled) { res.status(403).json({ error: "Payments are not currently enabled" }); return; }
  }

  // Resolve AnonPay config (GB overrides global)
  let globalAnonPayEnabled = (await getConfig("anonPayEnabled")) === "true";
  let anonPayWallet = await getConfig("anonPayWallet");
  let anonPayTicker = await getConfig("anonPayTicker");
  let anonPayNetwork = await getConfig("anonPayNetwork");
  let anonPayEnabled: boolean = globalAnonPayEnabled;

  if (order.groupBuyId) {
    const [gb] = await db.select({ organiserPayments: groupBuysTable.organiserPayments }).from(groupBuysTable).where(eq(groupBuysTable.id, order.groupBuyId));
    const op: OrganiserPayments | null = gb?.organiserPayments as OrganiserPayments | null;
    if (op?.anonPayWallet)  anonPayWallet  = op.anonPayWallet;
    if (op?.anonPayTicker)  anonPayTicker  = op.anonPayTicker;
    if (op?.anonPayNetwork) anonPayNetwork = op.anonPayNetwork;
    if (typeof op?.anonPayEnabled === "boolean") anonPayEnabled = op.anonPayEnabled;
  }

  if (!anonPayEnabled) {
    res.status(403).json({ error: "AnonPay is not enabled for this order." }); return;
  }

  const PLACEHOLDER_VALUES = new Set(["null", "undefined", "none", ""]);
  const isInvalid = (v: string | null) => !v || PLACEHOLDER_VALUES.has(v.toLowerCase().trim());

  if (isInvalid(anonPayWallet) || isInvalid(anonPayTicker) || isInvalid(anonPayNetwork)) {
    writeLog("payment", "error", "anonpay_init_failed", `AnonPay not fully configured for order ${order.code}`, { orderId: order.id, code: order.code, username: order.telegramUsername, anonPayWallet: anonPayWallet ?? null, anonPayTicker: anonPayTicker ?? null, anonPayNetwork: anonPayNetwork ?? null }, req.ip).catch(() => {});
    res.status(400).json({ error: "AnonPay is not fully configured. Please contact the organiser." }); return;
  }

  const grandTotalRaw = parseFloat(String(order.grandTotal));
  const creditsAppliedAnonPay = order.creditsApplied ? parseFloat(String(order.creditsApplied)) : 0;
  const grandTotalUsd = await toUsdIfGbp(grandTotalRaw, order.groupBuyId ?? null);
  // Subtract credits (already deducted from customer's balance at order time) before converting to AnonPay amount
  const effectiveUsdAnonPay = Math.max(0, grandTotalUsd - creditsAppliedAnonPay);
  const grandTotal = Math.round(effectiveUsdAnonPay * 100) / 100;
  const description = encodeURIComponent(order.code ?? order.id);
  // Non-null asserted — isInvalid() guard above ensures all three are non-null strings
  const trocadorUrl = `https://trocador.app/anonpay/?ticker_to=${encodeURIComponent(anonPayTicker!)}&network_to=${encodeURIComponent(anonPayNetwork!)}&address=${encodeURIComponent(anonPayWallet!)}&amount=${grandTotal.toFixed(2)}&description=${description}&direct=False&format=json`;

  let iframeUrl: string;
  let paymentId: string;
  try {
    const trocRes = await fetch(trocadorUrl, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    if (!trocRes.ok) {
      const errText = await trocRes.text().catch(() => "");
      console.error("[init-anonpay] Trocador error", trocRes.status, errText);
      writeLog("payment", "error", "anonpay_init_failed", `Trocador returned ${trocRes.status} for order ${order.code}`, { orderId: order.id, code: order.code, username: order.telegramUsername, trocStatus: trocRes.status, errText }, req.ip).catch(() => {});
      res.status(502).json({ error: "AnonPay service is unavailable. Please try another payment method." }); return;
    }
    const data = await trocRes.json() as Record<string, unknown>;
    paymentId = String(data["ID"] ?? data["id"] ?? data["payment_id"] ?? "").trim();
    const resultUrl = String(data["result"] ?? data["url"] ?? "").trim();
    if (!paymentId) {
      // A real AnonPay ID is required to enable status polling — reject if absent
      console.error("[init-anonpay] Trocador returned no payment ID", data);
      writeLog("payment", "error", "anonpay_init_failed", `Trocador returned no payment ID for order ${order.code}`, { orderId: order.id, code: order.code, username: order.telegramUsername, trocadorResponse: data }, req.ip).catch(() => {});
      res.status(502).json({ error: "AnonPay service did not return a payment ID. Please try again shortly." }); return;
    }
    // Use /en/anonpay/{ID}?embed=1 — Trocador's embeddable widget URL (frame-ancestors *)
    iframeUrl = `https://trocador.app/en/anonpay/${paymentId}?embed=1`;
  } catch (err: any) {
    console.error("[init-anonpay] fetch error", err?.message);
    writeLog("payment", "error", "anonpay_init_failed", `Trocador fetch error for order ${order.code}: ${err?.message}`, { orderId: order.id, code: order.code, username: order.telegramUsername, error: err?.message }, req.ip).catch(() => {});
    res.status(502).json({ error: "Could not reach AnonPay service. Please try again shortly." }); return;
  }

  // Prefix-tag the stored ID so we can reliably distinguish AnonPay sessions
  // from blockchain tx hashes (ETH/BTC/BSC use 64-char hex, no prefix).
  const storedId = `anonpay:${paymentId}`;

  // Store payment ID only — status stays as-is until customer confirms initiation
  await db
    .update(ordersTable)
    .set({ paymentTxHash: storedId })
    .where(eq(ordersTable.id, req.params.id));

  writeLog("payment", "info", "anonpay_initiated", `AnonPay session created for order ${order.code}`, { orderId: order.id, code: order.code, username: order.telegramUsername, paymentId, anonPayTicker, anonPayNetwork }, req.ip).catch(() => {});

  res.json({ iframeUrl, paymentId });
});

// ─── PUBLIC: Customer confirms AnonPay initiation ─────────────
// Called when user taps "I've Initiated Payment". Moves order to
// pending_confirmation and logs the submission event.
router.post("/orders/:id/confirm-anonpay-initiation", async (req, res): Promise<void> => {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, req.params.id));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  if (order.paymentStatus === "confirmed") {
    res.json({ ok: true, paymentStatus: "confirmed" }); return;
  }

  const ANON_PAY_PREFIX = "anonpay:";
  if (!order.paymentTxHash?.startsWith(ANON_PAY_PREFIX)) {
    writeLog("payment", "warn", "anonpay_confirm_failed", `No AnonPay session found on order ${order.code} — cannot confirm initiation`, { orderId: order.id, code: order.code, username: order.telegramUsername, paymentTxHash: order.paymentTxHash ?? null }, req.ip).catch(() => {});
    res.status(400).json({ error: "No AnonPay payment session found. Please re-initialise." }); return;
  }

  const paymentId = order.paymentTxHash.slice(ANON_PAY_PREFIX.length);

  await db
    .update(ordersTable)
    .set({ paymentStatus: "pending_confirmation" })
    .where(eq(ordersTable.id, req.params.id));

  writeLog("payment", "info", "anonpay_initiation_confirmed", `Customer confirmed AnonPay initiation for order ${order.code}`, { orderId: order.id, code: order.code, username: order.telegramUsername, paymentId, grandTotal: order.grandTotal }, req.ip).catch(() => {});
  await logCustomerActivity({
    telegramUsername: order.telegramUsername,
    eventCategory: "payment",
    eventType: "payment.anonpay_submitted",
    entityId: order.id,
    actorType: "customer",
    metadata: { code: order.code, paymentType: "anonpay", paymentId, grandTotal: order.grandTotal },
  }).catch(err => console.error("[confirm-anonpay-initiation] activity log failed:", err));

  firePaymentNotifications(order, "submitted", "AnonPay").catch(() => {});

  res.json({ ok: true, paymentStatus: "pending_confirmation" });
});

// ─── PUBLIC: Cancel AnonPay session ────────────────────────────
// Customer can cancel an in-progress AnonPay session (not yet confirmed
// by Trocador) so they can switch to another payment method.
router.post("/orders/:id/cancel-anonpay", async (req, res): Promise<void> => {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, req.params.id));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  if (order.paymentStatus === "confirmed") {
    res.status(400).json({ error: "Payment is already confirmed and cannot be cancelled." }); return;
  }

  if (!order.paymentTxHash?.startsWith("anonpay:")) {
    res.status(400).json({ error: "No active AnonPay session found." }); return;
  }

  await db
    .update(ordersTable)
    .set({ paymentTxHash: null, paymentStatus: "unpaid" })
    .where(eq(ordersTable.id, req.params.id));

  writeLog("payment", "info", "anonpay_cancelled", `Customer cancelled AnonPay session for order ${order.code}`, { orderId: order.id, code: order.code, username: order.telegramUsername }, req.ip).catch(() => {});

  res.json({ ok: true });
});

// ─── PUBLIC: Poll AnonPay status from Trocador ─────────────────
// Called by the frontend after the customer initiates AnonPay.
// If Trocador reports "finished" we auto-confirm the order.
router.get("/orders/:id/anonpay-status", async (req, res): Promise<void> => {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, req.params.id));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  // If already confirmed, return early without hitting Trocador
  if (order.paymentStatus === "confirmed") {
    res.json({ status: "confirmed", paymentStatus: "confirmed" }); return;
  }

  // The prefix "anonpay:" is written exclusively by /init-anonpay, making it a reliable
  // discriminator from bank/crypto/PayPal payments.
  const ANON_PAY_PREFIX = "anonpay:";
  if (!order.paymentTxHash?.startsWith(ANON_PAY_PREFIX)) {
    res.status(409).json({ error: "This order was not initiated via AnonPay." }); return;
  }

  // Only poll Trocador once the customer has submitted the order. We also accept "unpaid"
  // when there is already an AnonPay session stored — this covers the edge case where the
  // page was refreshed after /init-anonpay wrote the ID but before /confirm-anonpay-initiation
  // ran. In that case we upgrade the status here as a failsafe so polling keeps working.
  if (order.paymentStatus !== "pending_confirmation") {
    if (order.paymentStatus === "unpaid") {
      await db.update(ordersTable)
        .set({ paymentStatus: "pending_confirmation" })
        .where(eq(ordersTable.id, req.params.id));
    } else {
      res.status(400).json({ error: "Order has not been submitted for AnonPay confirmation yet." }); return;
    }
  }

  const paymentId = order.paymentTxHash.slice(ANON_PAY_PREFIX.length);
  if (!paymentId) {
    res.status(400).json({ error: "No AnonPay payment ID on this order." }); return;
  }

  // Trocador status endpoint: GET /anonpay/status/<ID>?format=json
  const statusUrl = `https://trocador.app/anonpay/status/${encodeURIComponent(paymentId)}?format=json`;
  let trocStatus = "";
  let trocOutgoingHash = "";
  try {
    const trocRes = await fetch(statusUrl, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(12000),
    });
    if (trocRes.ok) {
      const data = await trocRes.json() as Record<string, unknown>;
      trocStatus = String(data["Status"] ?? data["status"] ?? data["payment_status"] ?? "").toLowerCase();
      // Capture the outgoing blockchain tx hash Trocador includes when the swap is complete
      trocOutgoingHash = String(data["Hash"] ?? data["hash"] ?? data["tx_hash"] ?? data["txhash"] ?? data["HashTo"] ?? data["hash_to"] ?? "").trim();
      console.log("[anonpay-status] Trocador raw status:", data["Status"] ?? data["status"], "hash:", trocOutgoingHash || "(none)");
    } else {
      console.warn("[anonpay-status] Trocador returned", trocRes.status);
    }
  } catch (err: any) {
    console.warn("[anonpay-status] fetch error", err?.message);
  }

  let paymentStatus = order.paymentStatus as string;

  // Trocador AnonPay statuses: anonpaynew → anonpayfound → anonpayfinished
  if (trocStatus === "anonpayfinished" || trocStatus === "finished" || trocStatus === "complete" || trocStatus === "completed") {
    if (paymentStatus !== "confirmed") {
      // If Trocador returned the outgoing blockchain tx hash, append it to the stored ID
      // so admins can look it up on-chain: stored as "anonpay:{sessionId}|{txHash}"
      const newTxHash = trocOutgoingHash
        ? `anonpay:${paymentId}|${trocOutgoingHash}`
        : `anonpay:${paymentId}`;
      await db
        .update(ordersTable)
        .set({ paymentStatus: "confirmed", paymentConfirmedAt: new Date(), amountDue: "0.00", paymentTxHash: newTxHash })
        .where(eq(ordersTable.id, req.params.id));
      paymentStatus = "confirmed";

      writeLog("payment", "info", "anonpay_confirmed", `AnonPay auto-confirmed for order ${order.code} (Trocador: ${trocStatus})`, { orderId: order.id, code: order.code, username: order.telegramUsername, paymentId, trocStatus, trocOutgoingHash: trocOutgoingHash || null }).catch(() => {});
      await logCustomerActivity({
        telegramUsername: order.telegramUsername,
        eventCategory: "payment",
        eventType: "payment.anonpay_confirmed",
        entityId: order.id,
        actorType: "system",
        metadata: { code: order.code, paymentType: "anonpay", paymentId, trocStatus, trocOutgoingHash: trocOutgoingHash || null },
      }).catch(err => console.error("[anonpay-status] activity log failed:", err));

      firePaymentNotifications(order, "confirmed", "AnonPay").catch(() => {});
      maybeSubmitSharedOrder(order.id).catch(() => {});
    }
  }

  res.json({ status: trocStatus, paymentStatus });
});

// ─── ADMIN: Get payments config ────────────────────────────────
router.get("/admin/payments-config", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const paymentsEnabled = (await getConfig("paymentsEnabled")) === "true";
  const walletAddress = await getConfig("walletAddress");
  const hasChangeCode = !!(await getConfig("walletChangeCodeHash"));
  const anonPayEnabled = (await getConfig("anonPayEnabled")) === "true";
  const anonPayWallet = await getConfig("anonPayWallet");
  const anonPayTicker = await getConfig("anonPayTicker");
  const anonPayNetwork = await getConfig("anonPayNetwork");
  const paymentRoutingEnabled = (await getConfig("paymentRoutingEnabled")) !== "false";
  const directShippingPaymentsEnabled = (await getConfig("directShippingPaymentsEnabled")) !== "false";
  res.json({ paymentsEnabled, walletAddress, hasChangeCode, anonPayEnabled, anonPayWallet, anonPayTicker, anonPayNetwork, paymentRoutingEnabled, directShippingPaymentsEnabled });
});

// ─── ADMIN: Toggle payments enabled ───────────────────────────
router.patch("/admin/payments-config", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { paymentsEnabled, paymentRoutingEnabled, directShippingPaymentsEnabled } = req.body;
  if (typeof paymentsEnabled !== "boolean" && typeof paymentRoutingEnabled !== "boolean" && typeof directShippingPaymentsEnabled !== "boolean") {
    res.status(400).json({ error: "paymentsEnabled, paymentRoutingEnabled, or directShippingPaymentsEnabled must be boolean" });
    return;
  }
  if (typeof paymentsEnabled === "boolean") {
    await setConfig("paymentsEnabled", paymentsEnabled ? "true" : "false");
  }
  if (typeof paymentRoutingEnabled === "boolean") {
    await setConfig("paymentRoutingEnabled", paymentRoutingEnabled ? "true" : "false");
  }
  if (typeof directShippingPaymentsEnabled === "boolean") {
    await setConfig("directShippingPaymentsEnabled", directShippingPaymentsEnabled ? "true" : "false");
  }
  res.json({
    paymentsEnabled: typeof paymentsEnabled === "boolean" ? paymentsEnabled : undefined,
    paymentRoutingEnabled: typeof paymentRoutingEnabled === "boolean" ? paymentRoutingEnabled : undefined,
    directShippingPaymentsEnabled: typeof directShippingPaymentsEnabled === "boolean" ? directShippingPaymentsEnabled : undefined,
  });
});

// ─── ADMIN: Save AnonPay config ────────────────────────────────
router.patch("/admin/anonpay-config", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { anonPayEnabled, anonPayWallet, anonPayTicker, anonPayNetwork } = req.body;
  if (typeof anonPayEnabled === "boolean") {
    await setConfig("anonPayEnabled", anonPayEnabled ? "true" : "false");
  }
  if (anonPayWallet !== undefined) await setConfig("anonPayWallet", String(anonPayWallet ?? "").trim());
  if (anonPayTicker !== undefined) await setConfig("anonPayTicker", String(anonPayTicker ?? "").trim());
  if (anonPayNetwork !== undefined) await setConfig("anonPayNetwork", String(anonPayNetwork ?? "").trim());
  res.json({
    anonPayEnabled: (await getConfig("anonPayEnabled")) === "true",
    anonPayWallet: await getConfig("anonPayWallet"),
    anonPayTicker: await getConfig("anonPayTicker"),
    anonPayNetwork: await getConfig("anonPayNetwork"),
  });
});

// ─── ADMIN: Set wallet address (requires change code) ─────────
router.post("/admin/wallet-address", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { walletAddress, changeCode } = req.body;

  const cleanAddr = typeof walletAddress === "string" ? walletAddress.trim() : "";
  if (!cleanAddr) {
    res.status(400).json({ error: "Wallet address is required" });
    return;
  }
  if (!isValidEthAddress(cleanAddr)) {
    res.status(400).json({ error: "Invalid Ethereum wallet address format" });
    return;
  }

  const storedHash = await getConfig("walletChangeCodeHash");
  if (storedHash) {
    if (!changeCode || !safeStrEqual(sha256(String(changeCode)), storedHash)) {
      res.status(403).json({ error: "Incorrect wallet change code" });
      return;
    }
  }

  await setConfig("walletAddress", cleanAddr);
  res.json({ walletAddress: cleanAddr });
});

// ─── ADMIN: Set / change wallet change code ────────────────────
router.post("/admin/wallet-change-code", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { currentCode, newCode } = req.body;

  if (!newCode || typeof newCode !== "string" || newCode.trim().length < 8) {
    res.status(400).json({ error: "New code must be at least 8 characters" });
    return;
  }

  const storedHash = await getConfig("walletChangeCodeHash");
  if (storedHash) {
    if (!currentCode || !safeStrEqual(sha256(String(currentCode)), storedHash)) {
      res.status(403).json({ error: "Current code is incorrect" });
      return;
    }
  }

  await setConfig("walletChangeCodeHash", sha256(newCode.trim()));
  res.json({ ok: true });
});

// ─── ADMIN: List orders with payment submissions ───────────────
router.get("/admin/payment-orders", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const orders = await db
    .select({
      id: ordersTable.id,
      code: ordersTable.code,
      telegramUsername: ordersTable.telegramUsername,
      grandTotal: ordersTable.grandTotal,
      paymentStatus: ordersTable.paymentStatus,
      paymentTxHash: ordersTable.paymentTxHash,
      testPaymentTxHash: ordersTable.testPaymentTxHash,
      paymentTestAmount: ordersTable.paymentTestAmount,
      paymentCryptoCurrency: ordersTable.paymentCryptoCurrency,
      paymentScreenshot: ordersTable.paymentScreenshot,
      status: ordersTable.status,
      createdAt: ordersTable.createdAt,
    })
    .from(ordersTable)
    .where(
      or(
        eq(ordersTable.paymentStatus, "pending_confirmation"),
        eq(ordersTable.paymentStatus, "confirmed"),
        eq(ordersTable.paymentStatus, "failed"),
        eq(ordersTable.paymentStatus, "test_confirmed"),
        eq(ordersTable.paymentStatus, "test_ready"),
      )
    );
  res.json(orders.map((o: typeof orders[number]) => ({
    ...o,
    grandTotal: parseFloat(String(o.grandTotal)),
    paymentTestAmount: o.paymentTestAmount ? parseFloat(String(o.paymentTestAmount)) : null,
  })));
});

// ─── ADMIN: Manually override payment status ───────────────────
router.patch("/admin/orders/:id/payment-status", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { paymentStatus } = req.body;
  const valid = ["unpaid", "test_ready", "test_confirmed", "pending_confirmation", "confirmed", "failed"];
  if (!valid.includes(paymentStatus)) {
    res.status(400).json({ error: "Invalid paymentStatus" });
    return;
  }
  const [updated] = await db
    .update(ordersTable)
    .set({ paymentStatus })
    .where(eq(ordersTable.id, req.params.id))
    .returning();
  if (paymentStatus === "confirmed") maybeSubmitSharedOrder(updated.id).catch(() => {});
  res.json({ id: updated.id, paymentStatus: updated.paymentStatus });
});

// ─── ADMIN: Chain wallet config ────────────────────────────────
// Returns all configured chain wallets (excluding the main ERC-20 which has its
// own protected endpoint).
router.get("/admin/chain-wallets", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const result: Array<{ configKey: string; label: string; network: string; currencies: string[]; walletAddress: string | null }> = [];
  for (const cfg of CHAIN_WALLET_CONFIGS) {
    if (cfg.configKey === "walletAddress") continue; // handled by separate protected endpoint
    const wallet = await getConfig(cfg.configKey);
    result.push({
      configKey: cfg.configKey,
      label: cfg.network,
      network: cfg.network,
      currencies: cfg.currencies,
      walletAddress: wallet ?? null,
    });
  }
  res.json(result);
});

router.patch("/admin/chain-wallets", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const updates = req.body as Record<string, string | null>;
  if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
    res.status(400).json({ error: "Body must be an object of {configKey: walletAddress}" });
    return;
  }
  const allowedKeys = new Set(CHAIN_WALLET_CONFIGS.map(c => c.configKey).filter(k => k !== "walletAddress"));
  for (const [key, value] of Object.entries(updates)) {
    if (!allowedKeys.has(key)) continue;
    const v = typeof value === "string" ? value.trim() : "";
    if (v) {
      await setConfig(key, v);
    } else {
      await db.delete(siteConfigTable).where(eq(siteConfigTable.key, key));
    }
  }
  const result: Array<{ configKey: string; walletAddress: string | null }> = [];
  for (const cfg of CHAIN_WALLET_CONFIGS) {
    if (cfg.configKey === "walletAddress") continue;
    const wallet = await getConfig(cfg.configKey);
    result.push({ configKey: cfg.configKey, walletAddress: wallet ?? null });
  }
  res.json(result);
});

export default router;
