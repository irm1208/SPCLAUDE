export type PayoutStatus = "needs_review" | "owed" | "part_paid" | "paid" | "not_owed";
export interface CollectionWallet {
  collector: "admin" | "reshipper"; address: string; network: string;
  effectiveFrom: string; effectiveUntil: string | null;
}
export interface PayoutOrder {
  orderId: string; code: string; member: string; currency: string;
  adminFeeMinor: number; postageMinor: number; paidAdminMinor: number; paidPostageMinor: number;
  remainingAdminMinor: number; remainingPostageMinor: number;
  status: PayoutStatus; reviewReason: string | null; reviewedAt: string | null;
  reviewable: boolean; eligible: boolean; collector: "admin" | "reshipper" | null;
  reviewAdminMinor?: number; reviewPostageMinor?: number;
  paymentTxids?: string[];
  pendingPayoutId?: string | null;
  collectionEvidence?: { address: string; network: string; txid: string; checkedAt: string };
}
export interface PayoutAllocation {
  orderId: string; code: string; member: string; adminFeeMinor: number; postageMinor: number;
}
export interface PayoutReceipt {
  id: string; amountMinor: number; currency: string; paidAt: string; method: string;
  reference: string; destination: string; note: string; recordedBy: string; recordedAt: string;
  network?: string;
  token?: string; tokenUnits?: string; chainVerified?: boolean;
  allocations: PayoutAllocation[]; voidedAt: string | null; voidReason: string | null;
}
export interface PayoutData {
  orders: PayoutOrder[]; payouts: PayoutReceipt[];
  totals: { currency: string; entitledMinor: number; paidMinor: number; owedMinor: number; onHoldMinor: number }[];
  needsReviewCount: number; sourceNotice: string;
  paymentDetails: Record<string, unknown> | null;
  payoutWallet?: { address: string; network: string; currency?: string } | null;
  chainPayments?: ChainPayment[];
  canManagePayoutWallet?: boolean;
  collectionWallets?: CollectionWallet[];
  walletCheckResults?: { orderId: string; code: string; collector: "admin" | "reshipper" | null; reason: string; address?: string }[];
}
export interface ChainPayment {
  id: string; state: "prepared" | "signing" | "broadcast" | "confirmed" | "failed" | "cancelled";
  destination: string; network: string; token: "USDT" | "USDC"; sender?: string;
  amountMinor: number; currency: string; usdMinor: number; tokenUnits: string; rate: number;
  createdAt: string; txid: string | null; error: string | null;
  allocations: PayoutAllocation[]; transaction?: Record<string, unknown>;
}
export type PayoutFetcher = (path: string, init?: RequestInit) => Promise<Response>;
export const minorAmount = (value: number) => (value / 100).toFixed(2);
