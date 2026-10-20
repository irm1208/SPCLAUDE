import type { OnwardLedger } from "./gb-onward-payment-rules";

const canonical = (value: string) => value.trim().replace(/^@/, "").toLowerCase();

/** Financial summaries only: never return wallets, transaction IDs or other owners' receipts. */
export function reshipperPostageReceipts(raw: string | null, orderId: string, username: string) {
  if (!raw) return [];
  const ledger = JSON.parse(raw) as OnwardLedger;
  const seen = new Set<string>();
  const result: { currency: string; amount: number }[] = [];
  for (const receipt of [ledger.request, ...ledger.history]) {
    if (!receipt || receipt.orderId !== orderId || receipt.status !== "paid" ||
      canonical(receipt.reshipperUsername) !== canonical(username) || seen.has(receipt.id)) continue;
    if (!Number.isFinite(receipt.amount) || receipt.amount < 0 || !["USD", "EUR", "GBP"].includes(receipt.currency))
      throw new Error("Invalid confirmed onward-payment amount");
    seen.add(receipt.id);
    result.push({ currency: receipt.currency, amount: receipt.amount });
  }
  return result;
}
