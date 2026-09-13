import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import {
  groupBuyRefundsTable,
  groupBuysTable,
  ordersTable,
  paymentAuditResultsTable,
} from "@workspace/db";
import { db } from "@workspace/db";
import {
  evaluateRefundRequestAvailability,
  isSupportedRefundPaymentRail,
  type RefundEligibilityCode,
  type RefundEligibilityOrder,
  type ServerPaymentEvidenceProof,
} from "./refund-eligibility";

export type CustomerRefundStatus =
  | "requested"
  | "verifying"
  | "verification_failed"
  | "completed";

export type CustomerRefundSafeView = {
  id: string;
  method: "credit" | "crypto";
  status: CustomerRefundStatus;
  amountUsd: number;
  asset: "USDC" | "USDT" | null;
  network: "Ethereum ERC-20" | null;
  destinationWallet: string | null;
  outgoingTxid: string | null;
  explorerUrl: string | null;
  verificationErrorCode: string | null;
  verificationErrorMessage: string | null;
  requestedAt: string;
};

export type CustomerRefundView = {
  canRequest: boolean;
  ineligibilityReasonCode: RefundEligibilityCode | null;
  preferredAsset: "USDC" | "USDT";
  preferredNetwork: "Ethereum ERC-20";
  current: CustomerRefundSafeView | null;
};

type OrderForRefund = RefundEligibilityOrder & {
  id: string;
  paymentTxHashes?: string[] | null;
};

function ownerPredicate(accountId: string) {
  const bare = accountId.trim().replace(/^@/, "").toLowerCase();
  return sql`lower(${ordersTable.telegramUsername}) in (${`@${bare}`}, ${bare})`;
}

function safeRefund(row: Record<string, any>): CustomerRefundSafeView {
  const amount = Number(row.amountUsd);
  return {
    id: String(row.id),
    method: row.method as "credit" | "crypto",
    status: row.status as CustomerRefundStatus,
    amountUsd: Number.isFinite(amount) ? amount : 0,
    asset: row.asset as "USDC" | "USDT" | null,
    network: row.network as "Ethereum ERC-20" | null,
    destinationWallet: row.destinationWallet ?? null,
    outgoingTxid: row.outgoingTxid ?? null,
    explorerUrl: row.explorerUrl ?? null,
    verificationErrorCode: row.verificationErrorCode ?? null,
    verificationErrorMessage: row.verificationErrorMessage ?? null,
    requestedAt: new Date(row.requestedAt).toISOString(),
  };
}

function proofFromAudit(
  order: OrderForRefund,
  audits: Array<Record<string, any>>,
): ServerPaymentEvidenceProof | null {
  const hashes = [
    order.paymentTxHash,
    ...(Array.isArray(order.paymentTxHashes) ? order.paymentTxHashes : []),
  ].filter((hash): hash is string => typeof hash === "string" && hash.trim().length > 0);
  const audit = audits.find(item =>
    item.status === "verified"
    && item.referenceSource === "payment"
    && item.txKind === "crypto"
    && hashes.some(hash => hash.trim() === String(item.txHash ?? "").trim()),
  );
  if (!audit || !audit.recipientAddress || !audit.currency || !audit.network) return null;
  return {
    verified: true,
    source: "server-payment-verifier",
    txHash: String(audit.txHash),
    currency: String(audit.currency),
    network: String(audit.network),
    recipientWallet: String(audit.recipientAddress),
    expectedAmountUsd: String(audit.expectedAmount ?? order.grandTotal),
    verifiedAmountUsd: String(audit.receivedAmount ?? audit.expectedAmount ?? order.grandTotal),
  };
}

function buildView(
  order: OrderForRefund | null,
  groupBuy: { id: string; cryptoRefundsEnabled: boolean } | null,
  refunds: Array<Record<string, any>>,
  audits: Array<Record<string, any>>,
  accountId: string,
): CustomerRefundView {
  const current = refunds[0] ? safeRefund(refunds[0]) : null;
  const active = refunds.find(row => ["requested", "verifying", "verification_failed"].includes(String(row.status)));
  if (!order || !groupBuy || !order.groupBuyId || order.groupBuyId !== groupBuy.id) {
    return { canRequest: false, ineligibilityReasonCode: "not_group_buy_order", preferredAsset: "USDC", preferredNetwork: "Ethereum ERC-20", current };
  }
  const proof = proofFromAudit(order, audits);
  const paymentCurrency = String(proof?.currency ?? order.paymentCryptoCurrency ?? "").toUpperCase();
  const paymentNetwork = String(proof?.network ?? order.paymentCryptoNetwork ?? "");
  const preferredAsset = ["USDC", "USDT"].includes(paymentCurrency)
    && isSupportedRefundPaymentRail(paymentCurrency, paymentNetwork)
    ? paymentCurrency as "USDC" | "USDT"
    : "USDC";
  const eligibility = evaluateRefundRequestAvailability({
    accountId,
    order,
    groupBuy,
    activeRefund: active ? { id: String(active.id), status: String(active.status) } : null,
  });
  return {
    canRequest: eligibility.eligible && groupBuy.cryptoRefundsEnabled === true,
    ineligibilityReasonCode: eligibility.eligible ? null : eligibility.reasonCode,
    preferredAsset,
    preferredNetwork: "Ethereum ERC-20",
    current,
  };
}

/** Customer-safe refund state. Ownership is part of the SQL predicate. */
export async function getCustomerRefundView(
  orderId: string,
  accountId: string,
  preloaded?: Map<string, CustomerRefundView>,
): Promise<CustomerRefundView> {
  if (preloaded?.has(orderId)) return preloaded.get(orderId)!;
  const views = await getCustomerRefundViews([orderId], accountId);
  return views.get(orderId) ?? { canRequest: false, ineligibilityReasonCode: "not_owner", preferredAsset: "USDC", preferredNetwork: "Ethereum ERC-20", current: null };
}

/** Batch variant used by the order list so refund state does not create N+1 queries. */
export async function getCustomerRefundViews(orderIds: string[], accountId: string): Promise<Map<string, CustomerRefundView>> {
  const result = new Map<string, CustomerRefundView>();
  if (orderIds.length === 0) return result;
  const orders = await db.select().from(ordersTable).where(and(
    inArray(ordersTable.id, orderIds),
    isNull(ordersTable.deletedAt),
    ownerPredicate(accountId),
  ));
  const ids = orders.map(order => order.id);
  if (ids.length === 0) return result;
  const groupIds = [...new Set(orders.map(order => order.groupBuyId).filter((id): id is string => !!id))];
  const [groups, refunds, audits] = await Promise.all([
    groupIds.length
      ? db.select({ id: groupBuysTable.id, cryptoRefundsEnabled: groupBuysTable.cryptoRefundsEnabled }).from(groupBuysTable).where(inArray(groupBuysTable.id, groupIds))
      : Promise.resolve([]),
    db.select().from(groupBuyRefundsTable).where(inArray(groupBuyRefundsTable.orderId, ids)).orderBy(desc(groupBuyRefundsTable.requestedAt)),
    db.select().from(paymentAuditResultsTable).where(inArray(paymentAuditResultsTable.orderId, ids)).orderBy(desc(paymentAuditResultsTable.checkedAt)),
  ]);
  const groupsById = new Map(groups.map(group => [group.id, group]));
  for (const order of orders) {
    result.set(order.id, buildView(
      order as unknown as OrderForRefund,
      groupsById.get(order.groupBuyId ?? "") ?? null,
      refunds.filter(row => row.orderId === order.id),
      audits.filter(row => row.orderId === order.id),
      accountId,
    ));
  }
  return result;
}