import { z } from "zod";

export const paymentStatuses = ["created", "awaiting_payment", "transaction_submitted", "confirming", "paid", "expired", "underpaid", "overpaid_review", "failed", "cancelled"] as const;
export type PaymentStatus = (typeof paymentStatuses)[number];
const transitions: Record<PaymentStatus, readonly PaymentStatus[]> = {
  created: ["awaiting_payment", "cancelled", "expired"],
  awaiting_payment: ["transaction_submitted", "expired", "cancelled"],
  transaction_submitted: ["confirming", "underpaid", "overpaid_review", "failed", "expired"],
  confirming: ["confirming", "paid", "underpaid", "overpaid_review", "failed", "expired"],
  paid: ["paid"], expired: ["expired"], underpaid: ["underpaid"], overpaid_review: ["overpaid_review"], failed: ["failed"], cancelled: ["cancelled"],
};
export const canTransition = (from: PaymentStatus, to: PaymentStatus) => transitions[from].includes(to);

export type RailId =
  | "ethereum-eth" | "ethereum-usdt" | "ethereum-usdc" | "bsc-usdt"
  | "arbitrum-usdt" | "arbitrum-usdc" | "polygon-usdt" | "polygon-usdc"
  | "solana-usdt" | "solana-usdc" | "tron-usdt" | "bitcoin-btc";
export type PaymentRail = Readonly<{ id: RailId; network: string; chainId: string; asset: string; decimals: number; tokenId?: string; confirmations: number; kind: "evm_native" | "evm_erc20" | "solana_spl" | "tron_trc20" | "bitcoin" }>;
export const PAYMENT_RAILS: readonly PaymentRail[] = [
  { id: "ethereum-eth", network: "ethereum", chainId: "1", asset: "ETH", decimals: 18, confirmations: 12, kind: "evm_native" },
  { id: "ethereum-usdt", network: "ethereum", chainId: "1", asset: "USDT", decimals: 6, tokenId: "0xdAC17F958D2ee523a2206206994597C13D831ec7", confirmations: 12, kind: "evm_erc20" },
  { id: "ethereum-usdc", network: "ethereum", chainId: "1", asset: "USDC", decimals: 6, tokenId: "0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", confirmations: 12, kind: "evm_erc20" },
  { id: "bsc-usdt", network: "bsc", chainId: "56", asset: "USDT", decimals: 18, tokenId: "0x55d398326f99059fF775485246999027B3197955", confirmations: 15, kind: "evm_erc20" },
  { id: "arbitrum-usdt", network: "arbitrum", chainId: "42161", asset: "USDT", decimals: 6, tokenId: "0xfd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", confirmations: 20, kind: "evm_erc20" },
  { id: "arbitrum-usdc", network: "arbitrum", chainId: "42161", asset: "USDC", decimals: 6, tokenId: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", confirmations: 20, kind: "evm_erc20" },
  { id: "polygon-usdt", network: "polygon", chainId: "137", asset: "USDT", decimals: 6, tokenId: "0xc2132D05D31c914a87C6611C10748AaCbAeaD58e", confirmations: 128, kind: "evm_erc20" },
  { id: "polygon-usdc", network: "polygon", chainId: "137", asset: "USDC", decimals: 6, tokenId: "0x3c499c542cEF5E3811e1192ce70d8cc03d5c3359", confirmations: 128, kind: "evm_erc20" },
  { id: "solana-usdt", network: "solana", chainId: "mainnet-beta", asset: "USDT", decimals: 6, tokenId: "Es9vMFrzaCERmJfrF4H2FYD6JgD3McyhU2zqL9JWuK4", confirmations: 1, kind: "solana_spl" },
  { id: "solana-usdc", network: "solana", chainId: "mainnet-beta", asset: "USDC", decimals: 6, tokenId: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", confirmations: 1, kind: "solana_spl" },
  { id: "tron-usdt", network: "tron", chainId: "mainnet", asset: "USDT", decimals: 6, tokenId: "TR7NHqjeKQxGTCi8q8ZY4pL8otS4h5C2D", confirmations: 19, kind: "tron_trc20" },
  { id: "bitcoin-btc", network: "bitcoin", chainId: "mainnet", asset: "BTC", decimals: 8, confirmations: 3, kind: "bitcoin" },
] as const;
export const railById = (id: string) => PAYMENT_RAILS.find((rail) => rail.id === id);

export type AmountClassification = "verified" | "underpaid" | "overpaid_review";
/** Compares integer base units; bps are always integer values. */
export function classifyAmount(expected: bigint, observed: bigint, underpayBps: number, overpayBps: number): AmountClassification {
  if (expected <= 0n || observed < 0n) throw new Error("amounts must be non-negative and expected must be positive");
  const scale = 10_000n;
  if (observed * scale < expected * BigInt(scale - BigInt(underpayBps))) return "underpaid";
  if (observed * scale > expected * BigInt(scale + BigInt(overpayBps))) return "overpaid_review";
  return "verified";
}
export function decimalToBaseUnits(value: string, decimals: number): bigint {
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value) || decimals < 0) throw new Error("invalid decimal amount");
  const [whole, fraction = ""] = value.split(".");
  if (fraction.length > decimals) throw new Error("amount has too many decimal places");
  return BigInt(whole + fraction.padEnd(decimals, "0"));
}

const railIdSchema = z.enum(["ethereum-eth", "ethereum-usdt", "ethereum-usdc", "bsc-usdt", "arbitrum-usdt", "arbitrum-usdc", "polygon-usdt", "polygon-usdc", "solana-usdt", "solana-usdc", "tron-usdt", "bitcoin-btc"]);
const decimalSchema = z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d+)?$/).max(40);
export const createPaymentRequestSchema = z.object({
  merchantOrderReference: z.string().trim().min(1).max(128),
  fiatAmount: decimalSchema,
  fiatCurrency: z.string().regex(/^[A-Z]{3}$/),
  rails: z.array(railIdSchema).min(1).max(12).refine((ids) => new Set(ids).size === ids.length),
  returnUrl: z.string().url().max(2048).optional(),
  metadata: z.record(z.string().max(64), z.string().max(256)).optional(),
}).strict();
export const selectRailSchema = z.object({ railId: railIdSchema }).strict();
export const transactionHashSchema = z.object({ transactionHash: z.string().trim().regex(/^(?:0x[a-fA-F0-9]{64}|[1-9A-HJ-NP-Za-km-z]{32,100})$/) }).strict();
export const publicIdSchema = z.string().regex(/^pay_[A-Za-z0-9_-]{20,}$/);
export const webhookEventSchema = z.object({
  id: z.string().min(1), type: z.enum(["payment.paid", "payment.status_changed"]), createdAt: z.string().datetime(),
  merchantOrderReference: z.string(), paymentId: publicIdSchema, status: z.enum(paymentStatuses),
  asset: z.string().optional(), network: z.string().optional(), amountBaseUnits: z.string().regex(/^\d+$/).optional(), transactionHash: z.string().optional(),
}).strict();