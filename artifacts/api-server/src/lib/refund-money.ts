/**
 * Fixed-point helpers for refund and account-credit money.
 *
 * Values cross the database boundary as decimal strings. Keep all calculations
 * in bigint cents so numeric database columns cannot reintroduce binary-float
 * rounding.
 */

const PLAIN_USD = /^(?:0|[1-9]\d*)(?:\.\d*)?$/;
const USD_WITH_FRACTION = /^(?:0|[1-9]\d*)\.(\d*)$/;

export type RefundRequestInput =
  | { method: "credit" }
  | {
      method: "crypto";
      asset: "USDC" | "USDT";
      network: "Ethereum ERC-20";
      destinationWallet: string;
    };

function parseUsd(usd: string): { whole: string; fraction: string } {
  if (typeof usd !== "string" || !PLAIN_USD.test(usd)) {
    throw new Error("amount_usd_format");
  }

  const match = USD_WITH_FRACTION.exec(usd);
  const whole = match ? usd.slice(0, usd.indexOf(".")) : usd;
  const fraction = match?.[1] ?? "";
  if (fraction.length > 2) throw new Error("amount_usd_precision");
  if (match && fraction.length === 0) throw new Error("amount_usd_format");
  return { whole, fraction };
}

export function usdToCents(usd: string): bigint {
  const { whole, fraction } = parseUsd(usd);
  return BigInt(whole) * 100n + BigInt((fraction + "00").slice(0, 2));
}

export function centsToUsdString(cents: bigint): string {
  if (cents < 0n) throw new Error("money_negative");
  return `${cents / 100n}.${(cents % 100n).toString().padStart(2, "0")}`;
}

export function addMoney(left: string, right: string): string {
  return centsToUsdString(usdToCents(left) + usdToCents(right));
}

export function subtractMoney(left: string, right: string): string {
  const result = usdToCents(left) - usdToCents(right);
  if (result < 0n) throw new Error("money_negative");
  return centsToUsdString(result);
}

export function usdToSixDecimalBaseUnits(usd: string): string {
  const cents = usdToCents(usd);
  if (cents <= 0n) throw new Error("amount_usd_positive");
  return (cents * 10_000n).toString();
}