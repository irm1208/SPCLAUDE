import { isValidBtcAddress, isValidEthAddress, isValidSolanaAddress } from "./payment-verify";
import { normalizeWholesaleOrganiserPaymentIdentity } from "./wholesale-organiser-payment-identity";
import { OnwardDeliveryError } from "./gb-onward-delivery-rules";

export const ONWARD_PAYMENT_RAILS = [
  { currency: "USDT", network: "Ethereum" }, { currency: "USDC", network: "Ethereum" },
  { currency: "USDT", network: "Arbitrum" }, { currency: "USDC", network: "Arbitrum" },
  { currency: "USDT", network: "Polygon" }, { currency: "USDC", network: "Polygon" },
  { currency: "USDT", network: "BSC" }, { currency: "USDT", network: "TRON" },
  { currency: "USDT", network: "Solana" }, { currency: "USDC", network: "Solana" },
  { currency: "ETH", network: "Ethereum" }, { currency: "BTC", network: "Bitcoin" },
] as const;
export type OnwardPaymentSettings = {
  enabled: boolean; confirmationMode: "manual" | "automatic"; currency: string; network: string; walletAddress: string;
};
export const DEFAULT_ONWARD_PAYMENT_SETTINGS: OnwardPaymentSettings = {
  enabled: false, confirmationMode: "manual", currency: "USDT", network: "Ethereum", walletAddress: "",
};
export function parseOnwardPaymentSettings(input: unknown): OnwardPaymentSettings {
  if (!input || typeof input !== "object") throw new OnwardDeliveryError("Enter onward-delivery payment settings.");
  const value = input as Record<string, unknown>;
  if (typeof value.enabled !== "boolean") throw new OnwardDeliveryError("Choose whether onward payments are enabled.");
  const confirmationMode = value.confirmationMode ?? "manual";
  if (confirmationMode !== "manual" && confirmationMode !== "automatic") throw new OnwardDeliveryError("Choose manual or automatic confirmation.");
  const currency = String(value.currency ?? "").trim().toUpperCase();
  const network = String(value.network ?? "").trim();
  if (!ONWARD_PAYMENT_RAILS.some(rail => rail.currency === currency && rail.network === network)) {
    throw new OnwardDeliveryError("Choose a supported cryptocurrency and network.");
  }
  const walletAddress = String(value.walletAddress ?? "").trim();
  const valid = network === "Bitcoin" ? isValidBtcAddress(walletAddress)
    : network === "Solana" ? isValidSolanaAddress(walletAddress)
      : network === "TRON" ? /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(walletAddress) : isValidEthAddress(walletAddress);
  if ((value.enabled || walletAddress) && !valid) throw new OnwardDeliveryError("Enter a valid onward-delivery wallet address for this network.");
  return { enabled: value.enabled, confirmationMode, currency, network, walletAddress };
}
export function onwardPaymentAmount(input: unknown): number {
  if (typeof input !== "number" || !Number.isFinite(input) || input <= 0 || input > 1_000_000
    || Math.abs(Math.round(input * 100) - input * 100) > 0.000001) {
    throw new OnwardDeliveryError("Enter a positive delivery charge with no more than two decimal places.");
  }
  return Math.round(input * 100) / 100;
}
export function validateOnwardTx(value: unknown, network: string): string {
  if (typeof value !== "string") throw new OnwardDeliveryError("Enter the payment transaction ID.");
  const hash = value.trim();
  const valid = network === "Solana" ? /^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(hash)
    : network === "TRON" || network === "Bitcoin" ? /^[0-9a-fA-F]{64}$/.test(hash)
      : /^0x[0-9a-fA-F]{64}$/i.test(hash);
  if (!valid) throw new OnwardDeliveryError("Enter a valid transaction ID for the requested network.");
  return network === "Solana" ? hash : hash.toLowerCase();
}
export function onwardTxIdentity(txHash: string, network: string) {
  const normalized = normalizeWholesaleOrganiserPaymentIdentity({ txHash, network, currency: network === "Bitcoin" ? "BTC" : "USDT" });
  return `${normalized.network}:${normalized.txHash}`;
}
export function canAutoConfirmOnward(mode: string, result: { verified: boolean }) {
  return mode === "automatic" && result.verified === true;
}
export type OnwardPaymentStatus = "unpaid" | "pending_confirmation" | "paid" | "cancelled";
export function assertOnwardTransition(status: OnwardPaymentStatus, action: "submit" | "confirm" | "reject" | "cancel") {
  if ((action === "submit" || action === "cancel") ? status === "unpaid" : status === "pending_confirmation") return;
  throw new OnwardDeliveryError("This onward payment has changed. Refresh the order before trying again.", 409);
}
export type OnwardCharge = {
  id: string; orderId: string; assignmentId: string; idempotencyKey: string;
  status: OnwardPaymentStatus; amount: number; currency: "USD" | "EUR" | "GBP";
  method: "pickup" | "home"; note: string; reshipperUsername: string;
  wallet: { currency: string; network: string; walletAddress: string };
  cryptoAmount: number; fiatToUsdRate: number; usdPerCoin: number;
  confirmationMode: "manual" | "automatic"; txHash: string | null;
  verificationNote: string | null; createdAt: string; submittedAt: string | null;
  confirmedAt: string | null; confirmedBy: string | null;
  lastCheckedAt?: string;
  combined?: { quoteId: string; productCryptoAmount: number; totalCryptoAmount: number; verified: boolean };
  attempts: { txHash: string; reason: string; rejectedAt: string }[];
};
export type OnwardLedger = { request: OnwardCharge | null; history: OnwardCharge[] };
export const onwardChargeLedgerKey = (orderId: string) => `gb_onward_charge:${orderId}`;
