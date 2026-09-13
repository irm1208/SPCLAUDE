import { randomUUID } from "node:crypto";
import {
  accountsTable,
  auditLogsTable,
  creditTransactionsTable,
  groupBuyRefundsTable,
  groupBuysTable,
  ordersTable,
  type GroupBuyRefund,
} from "@workspace/db";
import { and, eq, inArray } from "drizzle-orm";
import { resolveEffectiveOrderCrypto } from "../routes/payments";
import {
  isValidEthAddress,
  verifyTransaction,
  type VerifyResult,
} from "./payment-verify";
import {
  evaluateRefundEligibility,
  type RefundEligibilityOrder,
  type ServerPaymentEvidenceProof,
} from "./refund-eligibility";
import {
  addMoney,
  usdToCents,
  usdToSixDecimalBaseUnits,
  type RefundRequestInput,
} from "./refund-money";

// Kept structural at runtime so callers can provide either the normal Drizzle
// database or a transaction-compatible adapter in integration tests.
export type DatabaseLike = any;

export type CreateRefundRequestArgs = {
  accountId: string;
  orderId: string;
  input: RefundRequestInput;
};

export type RefundRequestResult = Pick<
  GroupBuyRefund,
  "id" | "status" | "method" | "amountUsd" | "asset" | "network"
  | "destinationWallet" | "amountBaseUnits"
>;

export type CompleteCreditRefundArgs = {
  refundId: string;
  username: string;
  role: string;
  groupBuyId?: string;
};

export class GroupBuyRefundError extends Error {
  readonly code: string;

  constructor(code: string, message = code) {
    super(message);
    this.name = "GroupBuyRefundError";
    this.code = code;
  }
}

const ACTIVE_REFUND_STATUSES = ["requested", "verifying", "verification_failed"] as const;

function asRefundResult(refund: Record<string, any>): RefundRequestResult {
  return {
    id: refund.id,
    status: refund.status,
    method: refund.method,
    amountUsd: String(refund.amountUsd),
    asset: refund.asset ?? null,
    network: refund.network ?? null,
    destinationWallet: refund.destinationWallet ?? null,
    amountBaseUnits: refund.amountBaseUnits == null ? null : String(refund.amountBaseUnits),
  };
}

function normalizeUsername(value: string): string {
  return value.trim().replace(/^@/, "").toLowerCase();
}

function isUniqueViolation(error: unknown): boolean {
  return !!error && typeof error === "object" && (error as { code?: string }).code === "23505";
}

function refundOrder(row: Record<string, any>): RefundEligibilityOrder {
  return row as RefundEligibilityOrder;
}

function validateRefundInputShape(input: RefundRequestInput): void {
  if (input?.method === "credit") return;
  if (input?.method !== "crypto") throw new GroupBuyRefundError("invalid_method");
  if (input.asset !== "USDC" && input.asset !== "USDT") {
    throw new GroupBuyRefundError("invalid_asset");
  }
  if (input.network !== "Ethereum ERC-20") {
    throw new GroupBuyRefundError("invalid_network");
  }
  if (typeof input.destinationWallet !== "string" || !isValidEthAddress(input.destinationWallet)) {
    throw new GroupBuyRefundError("invalid_destination_wallet");
  }
}

async function loadOriginalPaymentProof(
  order: Record<string, any>,
): Promise<ServerPaymentEvidenceProof> {
  const txHash = typeof order.paymentTxHash === "string" && order.paymentTxHash.trim()
    ? order.paymentTxHash.trim()
    : Array.isArray(order.paymentTxHashes)
      ? order.paymentTxHashes.find((hash: unknown) => typeof hash === "string" && hash.trim())
      : null;
  if (!txHash || !order.paymentCryptoCurrency || !order.paymentCryptoNetwork) {
    throw new GroupBuyRefundError("ineligible_payment_evidence");
  }

  let amount: number;
  try {
    // Payment verification uses the server's payment lock when present. The
    // refund amount itself is still derived exclusively from grandTotal below.
    const paymentAmount = order.paymentUsdAmount ?? order.grandTotal;
    amount = Number(usdToCents(String(paymentAmount))) / 100;
  } catch {
    throw new GroupBuyRefundError("non_positive_total");
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new GroupBuyRefundError("non_positive_total");
  }

  // This resolver is the same server-owned wallet/currency/network boundary
  // used by the payment routes. It is deliberately called before opening the
  // refund transaction so RPC latency can never hold row locks.
  const payment = await resolveEffectiveOrderCrypto(order as {
    groupBuyId: string | null;
    orderType?: string | null;
    shippingCountry?: string | null;
    sharedOrderId?: string | null;
    paymentCryptoCurrency?: string | null;
    paymentCryptoNetwork?: string | null;
  });
  if (!payment.walletAddress) {
    throw new GroupBuyRefundError("ineligible_payment_evidence");
  }

  let result: VerifyResult;
  try {
    result = await verifyTransaction(
      txHash,
      payment.walletAddress,
      amount,
      payment.currency,
      payment.network,
      0.01,
    );
  } catch {
    throw new GroupBuyRefundError("payment_verification_failed");
  }
  if (!result.verified) {
    throw new GroupBuyRefundError("ineligible_payment_evidence", result.reason);
  }

  // Only this successful verifier branch can construct the proof. No request
  // field is consulted for any of these identities.
  return Object.freeze({
    verified: true as const,
    source: "server-payment-verifier" as const,
    txHash,
    currency: payment.currency,
    network: payment.network,
  });
}

async function loadRows(database: DatabaseLike, table: unknown, predicate: unknown): Promise<any[]> {
  return await database.select().from(table).where(predicate);
}

async function lockRows(database: DatabaseLike, table: unknown, predicate: unknown): Promise<any[]> {
  return await database.select().from(table).where(predicate).for("update");
}

async function insertAudit(database: DatabaseLike, values: {
  action: string;
  message: string;
  metadata: Record<string, unknown>;
}): Promise<void> {
  await database.insert(auditLogsTable).values({
    type: "change",
    level: "info",
    action: values.action,
    message: values.message,
    metadata: values.metadata,
    ip: null,
  });
}

export async function createRefundRequest(
  database: DatabaseLike,
  args: CreateRefundRequestArgs,
): Promise<RefundRequestResult> {
  const [unlockedOrder] = await loadRows(database, ordersTable, eq(ordersTable.id, args.orderId));
  if (!unlockedOrder) throw new GroupBuyRefundError("not_found");
  validateRefundInputShape(args.input);

  // These checks cannot make a request eligible; they only avoid unnecessary
  // RPC work for rows that are categorically outside the refund policy. The
  // locked transaction still performs the authoritative eligibility check.
  if (
    !unlockedOrder.groupBuyId
    || ["wholesale", "wholesale_shared"].includes(unlockedOrder.orderType ?? "")
  ) {
    throw new GroupBuyRefundError("not_group_buy_order");
  }
  const [unlockedGroupBuy] = await loadRows(
    database,
    groupBuysTable,
    eq(groupBuysTable.id, unlockedOrder.groupBuyId),
  );
  if (!unlockedGroupBuy) throw new GroupBuyRefundError("not_group_buy_order");
  if (!unlockedGroupBuy.cryptoRefundsEnabled) {
    throw new GroupBuyRefundError("refunds_disabled");
  }
  if (normalizeUsername(args.accountId) !== normalizeUsername(unlockedOrder.telegramUsername ?? "")) {
    throw new GroupBuyRefundError("not_owner");
  }

  // Verify before opening the transaction. The transaction re-locks and
  // re-evaluates all values so this proof cannot survive a payment identity
  // change made while the verifier was doing network I/O.
  const paymentEvidenceProof = await loadOriginalPaymentProof(unlockedOrder);

  return database.transaction(async (tx) => {
    const [account] = await lockRows(tx, accountsTable, eq(accountsTable.telegramUsername, args.accountId));
    if (!account) throw new GroupBuyRefundError("account_not_found");

    const [order] = await lockRows(tx, ordersTable, eq(ordersTable.id, args.orderId));
    if (!order) throw new GroupBuyRefundError("not_found");
    if (!order.groupBuyId) throw new GroupBuyRefundError("not_group_buy_order");
    const [groupBuy] = await lockRows(tx, groupBuysTable, eq(groupBuysTable.id, order.groupBuyId));
    if (!groupBuy) throw new GroupBuyRefundError("not_group_buy_order");
    const activeRows = await lockRows(
      tx,
      groupBuyRefundsTable,
      and(
        eq(groupBuyRefundsTable.orderId, args.orderId),
        inArray(groupBuyRefundsTable.status, [...ACTIVE_REFUND_STATUSES]),
      ),
    );
    const activeRefund = activeRows[0];
    if (activeRefund) return asRefundResult(activeRefund);

    const eligibility = evaluateRefundEligibility({
      accountId: args.accountId,
      paymentEvidenceProof,
      order: refundOrder(order),
      groupBuy: { id: groupBuy.id, cryptoRefundsEnabled: groupBuy.cryptoRefundsEnabled },
      activeRefund: null,
    });
    if (!eligibility.eligible || !eligibility.amountUsd) {
      throw new GroupBuyRefundError(eligibility.reasonCode ?? "ineligible");
    }

    const input = args.input as RefundRequestInput;
    const isCredit = input?.method === "credit";
    const isCrypto = input?.method === "crypto";
    if (!isCredit && !isCrypto) throw new GroupBuyRefundError("invalid_method");

    let asset: string | null = null;
    let network: string | null = null;
    let destinationWallet: string | null = null;
    let amountBaseUnits: string | null = null;
    if (isCrypto) {
      if (input.asset !== "USDC" && input.asset !== "USDT") {
        throw new GroupBuyRefundError("invalid_asset");
      }
      if (input.network !== "Ethereum ERC-20") {
        throw new GroupBuyRefundError("invalid_network");
      }
      if (typeof input.destinationWallet !== "string" || !isValidEthAddress(input.destinationWallet)) {
        throw new GroupBuyRefundError("invalid_destination_wallet");
      }
      asset = input.asset;
      network = input.network;
      destinationWallet = input.destinationWallet.toLowerCase();
      amountBaseUnits = usdToSixDecimalBaseUnits(eligibility.amountUsd);
    }

    const id = randomUUID();
    const values = {
      id,
      orderId: order.id,
      groupBuyId: groupBuy.id,
      accountId: account.telegramUsername,
      method: isCredit ? "credit" : "crypto",
      status: "requested",
      amountUsd: eligibility.amountUsd,
      asset,
      network,
      destinationWallet,
      amountBaseUnits,
    };
    const inserted = await tx
      .insert(groupBuyRefundsTable)
      .values(values)
      .onConflictDoNothing()
      .returning();
    if (inserted.length === 0) {
      // ON CONFLICT DO NOTHING leaves this transaction usable. A plain insert
      // followed by a catch would leave PostgreSQL's transaction aborted.
      const [winner] = await lockRows(
        tx,
        groupBuyRefundsTable,
        and(
          eq(groupBuyRefundsTable.orderId, args.orderId),
          inArray(groupBuyRefundsTable.status, [...ACTIVE_REFUND_STATUSES]),
        ),
      );
      if (winner) return asRefundResult(winner);
      throw new GroupBuyRefundError("active_refund_race");
    }

    await insertAudit(tx, {
      action: "group_buy_refund_requested",
      message: `Group-buy refund ${id} requested`,
      metadata: {
        identity: args.accountId,
        role: "account",
        source: "customer",
        transition: "none_to_requested",
        resultCode: "refund_requested",
        refundId: id,
        orderId: order.id,
        groupBuyId: groupBuy.id,
        method: values.method,
        amountUsd: values.amountUsd,
      },
    });
    return asRefundResult(values);
  });
}

export async function completeCreditRefund(
  database: DatabaseLike,
  args: CompleteCreditRefundArgs,
): Promise<RefundRequestResult> {
  const [unlockedRefund] = await loadRows(
    database,
    groupBuyRefundsTable,
    eq(groupBuyRefundsTable.id, args.refundId),
  );
  if (!unlockedRefund) throw new GroupBuyRefundError("not_found");

  return database.transaction(async (tx) => {
    // Every refund mutation uses account -> order -> group buy -> refund.
    // The initial read only discovers immutable foreign-key identities; no
    // write occurs until those rows are acquired in this order.
    const [account] = await lockRows(
      tx,
      accountsTable,
      eq(accountsTable.telegramUsername, unlockedRefund.accountId),
    );
    const [order] = await lockRows(tx, ordersTable, eq(ordersTable.id, unlockedRefund.orderId));
    const [groupBuy] = await lockRows(tx, groupBuysTable, eq(groupBuysTable.id, unlockedRefund.groupBuyId));
    const [refund] = await lockRows(tx, groupBuyRefundsTable, eq(groupBuyRefundsTable.id, args.refundId));
    if (!account || !order || !groupBuy || !refund) throw new GroupBuyRefundError("not_found");

    if (refund.status === "completed") return asRefundResult(refund);
    if (refund.method !== "credit") throw new GroupBuyRefundError("crypto_refund_not_supported");
    if (args.groupBuyId && args.groupBuyId !== groupBuy.id) {
      throw new GroupBuyRefundError("group_buy_scope");
    }
    if (
      args.role !== "admin"
      && !(args.role === "organiser" && normalizeUsername(groupBuy.organiserId ?? "") === normalizeUsername(args.username))
    ) {
      throw new GroupBuyRefundError("forbidden");
    }
    if (refund.status !== "requested" && refund.status !== "verification_failed") {
      throw new GroupBuyRefundError("invalid_refund_transition");
    }
    if (order.id !== refund.orderId || order.groupBuyId !== refund.groupBuyId || account.telegramUsername !== refund.accountId) {
      throw new GroupBuyRefundError("refund_linkage_mismatch");
    }

    // Claim before money writes. A conditional update makes a concurrent
    // retry a no-op rather than allowing a second credit.
    const [claimed] = await tx
      .update(groupBuyRefundsTable)
      .set({
        status: "verifying",
        verifyingAt: new Date(),
        processorUsername: args.username,
        processorRole: args.role,
      })
      .where(and(
        eq(groupBuyRefundsTable.id, args.refundId),
        inArray(groupBuyRefundsTable.status, ["requested", "verification_failed"]),
      ))
      .returning();
    if (!claimed) throw new GroupBuyRefundError("refund_claim_lost");

    let amountUsd: string;
    try {
      amountUsd = String(refund.amountUsd);
      usdToCents(amountUsd);
    } catch {
      throw new GroupBuyRefundError("invalid_refund_amount");
    }
    const credits = addMoney(String(account.credits ?? "0"), amountUsd);
    await tx
      .update(accountsTable)
      .set({ credits: Number(credits) })
      .where(eq(accountsTable.telegramUsername, account.telegramUsername));
    await tx.insert(creditTransactionsTable).values({
      accountUsername: account.telegramUsername,
      amount: Number(amountUsd),
      reason: "group_buy_refund",
      orderId: order.id,
      refundId: refund.id,
      adminUsername: args.username,
    });
    await tx
      .update(ordersTable)
      .set({
        refundStatus: "refunded",
        refundedAt: new Date(),
        status: "Cancelled",
        paymentStatus: "refunded",
      })
      .where(eq(ordersTable.id, order.id));
    await tx
      .update(groupBuyRefundsTable)
      .set({
        status: "completed",
        completedAt: new Date(),
        processorUsername: args.username,
        processorRole: args.role,
      })
      .where(eq(groupBuyRefundsTable.id, refund.id));
    await insertAudit(tx, {
      action: "group_buy_refund_completed",
      message: `Group-buy refund ${refund.id} completed`,
      metadata: {
        identity: args.username,
        role: args.role,
        source: "refund_processor",
        transition: "verifying_to_completed",
        resultCode: "credit_refund_completed",
        refundId: refund.id,
        orderId: order.id,
        groupBuyId: groupBuy.id,
        amountUsd,
      },
    });

    return asRefundResult({
      ...refund,
      status: "completed",
      amountUsd,
      asset: null,
      network: null,
      destinationWallet: null,
      amountBaseUnits: null,
    });
  });
}