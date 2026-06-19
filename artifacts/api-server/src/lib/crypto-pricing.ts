/**
 * Fiat → USD → crypto conversion helpers.
 *
 * The store prices everything in fiat (GBP for the vial shop, the group-buy
 * currency for group orders, USD otherwise). When a buyer pays in crypto we
 * must show — and verify on-chain — the live crypto-equivalent of that fiat
 * total: fiat → USD → coin.
 *
 * Money-critical rules:
 * - Stablecoins (USDT, USDC, …) are treated as exactly 1 USD = 1 coin.
 * - For volatile coins we fetch a live USD price. If that lookup fails we
 *   return null and the caller MUST block/flag the payment — we never invent
 *   a coin price, because guessing loses real money.
 * - Fiat→USD keeps a safe fallback rate (fiat rates barely move); coin prices
 *   do not get a fallback.
 */

/** Coins treated as 1:1 with USD. */
const STABLECOINS = new Set(["USDT", "USDC", "USD", "DAI", "BUSD", "TUSD", "USDP", "FDUSD"]);

/** Map a coin ticker to its CoinGecko id for the live price lookup. */
const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  BNB: "binancecoin",
  LTC: "litecoin",
  XMR: "monero",
  SOL: "solana",
  TRX: "tron",
  DOGE: "dogecoin",
};

/** Display/precision decimals per coin. Defaults to 8 for unknown volatile coins. */
const CRYPTO_DECIMALS: Record<string, number> = {
  BTC: 8,
  ETH: 8,
  BNB: 8,
  LTC: 8,
  XMR: 8,
  SOL: 6,
  TRX: 6,
  DOGE: 8,
  USDT: 2,
  USDC: 2,
};

/** Fallback fiat→USD rates, used only when the live FX API is unreachable. */
const FIAT_USD_FALLBACK: Record<string, number> = {
  GBP: 1.27,
  EUR: 1.08,
  USD: 1,
};

export function isStablecoin(currency: string | null | undefined): boolean {
  return STABLECOINS.has((currency ?? "").toUpperCase().trim());
}

export function cryptoDecimals(currency: string | null | undefined): number {
  const cur = (currency ?? "").toUpperCase().trim();
  return CRYPTO_DECIMALS[cur] ?? (isStablecoin(cur) ? 2 : 8);
}

/** Round an amount to the correct number of decimals for the given coin. */
export function roundCrypto(amount: number, currency: string | null | undefined): number {
  const d = cryptoDecimals(currency);
  return parseFloat(amount.toFixed(d));
}

/**
 * Live fiat→USD rate. Returns 1 for USD. Falls back to a stored rate (or 1 for
 * unknown fiat) if the FX API can't be reached — fiat rates move slowly so a
 * slightly stale rate is acceptable.
 */
export async function fetchFiatToUsd(fromCurrency: string | null | undefined): Promise<number> {
  const cur = (fromCurrency ?? "USD").toUpperCase().trim();
  if (cur === "USD" || !cur) return 1;
  try {
    const res = await fetch(`https://api.frankfurter.app/latest?from=${encodeURIComponent(cur)}&to=USD`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = (await res.json()) as { rates?: { USD?: number } };
      const rate = data.rates?.USD;
      if (typeof rate === "number" && rate > 0) return rate;
    }
  } catch {
    /* fall through to fallback */
  }
  return FIAT_USD_FALLBACK[cur] ?? 1;
}

/**
 * Live USD-per-coin price.
 * - Stablecoins → 1.
 * - Volatile coins → CoinGecko spot price.
 * - Returns null when the price can't be fetched (caller must block the payment).
 */
export async function fetchUsdPerCoin(currency: string | null | undefined): Promise<number | null> {
  const cur = (currency ?? "").toUpperCase().trim();
  if (!cur) return null;
  if (isStablecoin(cur)) return 1;
  const id = COINGECKO_IDS[cur];
  if (!id) return null;
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, { usd?: number }>;
    const price = data[id]?.usd;
    if (typeof price === "number" && price > 0) return price;
    return null;
  } catch {
    return null;
  }
}

/**
 * Convert a USD amount to coin units.
 * @param lockedUsdPerCoin when provided (a previously-locked rate), it is used
 *   instead of fetching a fresh price — this keeps display and verification in
 *   agreement. Pass null to fetch live.
 * @returns the rounded coin amount and the USD-per-coin rate used, or null if a
 *   volatile-coin price could not be obtained.
 */
export async function usdToCrypto(
  usdAmount: number,
  currency: string | null | undefined,
  lockedUsdPerCoin?: number | null,
): Promise<{ cryptoAmount: number; usdPerCoin: number } | null> {
  const rate =
    lockedUsdPerCoin != null && lockedUsdPerCoin > 0
      ? lockedUsdPerCoin
      : await fetchUsdPerCoin(currency);
  if (rate == null || rate <= 0) return null;
  return { cryptoAmount: roundCrypto(usdAmount / rate, currency), usdPerCoin: rate };
}
