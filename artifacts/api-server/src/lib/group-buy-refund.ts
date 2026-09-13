import { randomUUID } from "node:crypto";
import {
  accountsTable,
  auditLogsTable,
  creditTransactionsTable,
  groupBuyRefundAttemptsTable,
  groupBuyRefundTxClaimsTable,
  groupBuyRefundsTable,
  groupBuysTable,
  gbReshippersTable,
  siteConfigTable,
  wholesaleSharesTable,
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
  normalizeEthereumTxid,
  verifyRefundCryptoTransfer,
  type RefundCryptoVerificationResult,
} from "./refund-crypto-verifier";
import {
  evaluateRefundEligibility,
  type RefundEligibilityOrder,
  type ServerPaymentEvidenceProof,
} from "./refund-eligibility";
import {
  addMoney,
  centsToUsdString,
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
> & {
  outgoingTxid?: string | null;
  confirmationCount?: number | null;
  explorerUrl?: string | null;
};

export type CryptoRefundProcessor = {
  username: string;
  role: string;
  groupBuyId?: string;
};

const REFUND_VERIFY_LEASE_DEFAULT_SECONDS = 15 * 60;
const PROCESSING_FAILURE_MESSAGE = "Refund verification processing failed; please retry.";

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
    outgoingTxid: refund.outgoingTxid ?? null,
    confirmationCount: refund.confirmationCount ?? null,
    explorerUrl: refund.explorerUrl ?? null,
  };
}

function normalizeUsername(value: string): string {
  return value.trim().replace(/^@/, "").toLowerCase();
}

function refundVerifyLeaseMs(): number | null {
  const configured = process.env.GROUP_BUY_REFUND_VERIFY_LEASE_SECONDS;
  if (configured === undefined || configured.trim() === "") {
    return REFUND_VERIFY_LEASE_DEFAULT_SECONDS * 1000;
  }
  if (!/^\d+$/.test(configured)) return null;
  const seconds = Number(configured);
  return Number.isSafeInteger(seconds) && seconds > 0 ? seconds * 1000 : null;
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
  if (!result.recipientAddress || result.amountUsdt == null) {
    throw new GroupBuyRefundError("ineligible_payment_evidence");
  }

  // Only this successful verifier branch can construct the proof. No request
  // field is consulted for any of these identities.
  try {
    return Object.freeze({
      verified: true as const,
      source: "server-payment-verifier" as const,
      txHash,
      currency: payment.currency,
      network: payment.network,
      recipientWallet: result.recipientAddress,
      expectedAmountUsd: centsToUsdString(usdToCents(String(order.paymentUsdAmount ?? order.grandTotal))),
      verifiedAmountUsd: centsToUsdString(usdToCents(String(result.amountUsdt))),
    });
  } catch {
    throw new GroupBuyRefundError("ineligible_payment_evidence");
  }
}

async function lockPaymentRoutingSources(database: DatabaseLike, order: Record<string, any>): Promise<void> {
  const configKeys = [
    "paymentRoutingEnabled",
    "walletAddress",
    "wholesale_usdt_wallet",
    "wholesale_usdc_erc20_wallet",
    "wallet_arb",
    "wallet_polygon",
    "wallet_solana",
    "wallet_tron",
    "wallet_btc",
    "wallet_eth",
  ];
  await lockRows(database, siteConfigTable, inArray(siteConfigTable.key, configKeys));
  if (order.groupBuyId && order.shippingCountry) {
    await lockRows(database, gbReshippersTable, and(
      eq(gbReshippersTable.gbId, order.groupBuyId),
      eq(gbReshippersTable.country, order.shippingCountry),
    ));
  }
  if (order.orderType === "wholesale_shared" && order.sharedOrderId) {
    await lockRows(database, wholesaleSharesTable, eq(wholesaleSharesTable.id, order.sharedOrderId));
  }
}

async function resolveLockedPayment(database: DatabaseLike, order: Record<string, any>) {
  await lockPaymentRoutingSources(database, order);
  return resolveEffectiveOrderCrypto(order as {
    groupBuyId: string | null;
    orderType?: string | null;
    shippingCountry?: string | null;
    sharedOrderId?: string | null;
    paymentCryptoCurrency?: string | null;
    paymentCryptoNetwork?: string | null;
  }, database);
}

function requireLockedPaymentProof(
  order: Record<string, any>,
  proof: ServerPaymentEvidenceProof,
  payment: { walletAddress: string | null; currency: string; network: string },
): void {
  let expected: string;
  try {
    expected = centsToUsdString(usdToCents(String(order.paymentUsdAmount ?? order.grandTotal)));
  } catch {
    throw new GroupBuyRefundError("payment_evidence_changed");
  }
  if (proof.expectedAmountUsd !== expected) {
    throw new GroupBuyRefundError("payment_evidence_changed");
  }
  try {
    if (usdToCents(proof.verifiedAmountUsd) !== usdToCents(expected)) {
      throw new GroupBuyRefundError("ineligible_payment_evidence");
    }
  } catch (error) {
    if (error instanceof GroupBuyRefundError) throw error;
    throw new GroupBuyRefundError("ineligible_payment_evidence");
  }
  if (
    !payment.walletAddress
    || proof.recipientWallet.toLowerCase() !== payment.walletAddress.toLowerCase()
    || proof.currency.toUpperCase().trim() !== payment.currency.toUpperCase().trim()
    || proof.network.toUpperCase().trim().replace(/[^A-Z0-9]/g, "") !== payment.network.toUpperCase().trim().replace(/[^A-Z0-9]/g, "")
    || ![
      order.paymentTxHash,
      ...(Array.isArray(order.paymentTxHashes) ? order.paymentTxHashes : []),
    ].some(hash => typeof hash === "string" && hash.trim() === proof.txHash.trim())
    || proof.currency.toUpperCase().trim() !== String(order.paymentCryptoCurrency ?? "").toUpperCase().trim()
    || proof.network.toUpperCase().trim().replace(/[^A-Z0-9]/g, "") !== String(order.paymentCryptoNetwork ?? "").toUpperCase().trim().replace(/[^A-Z0-9]/g, "")
  ) {
    throw new GroupBuyRefundError("payment_evidence_changed");
  }
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

function validateProcessorScope(
  account: Record<string, any>,
  order: Record<string, any>,
  groupBuy: Record<string, any>,
  refund: Record<string, any>,
  args: CompleteCreditRefundArgs,
): void {
  if (refund.method !== "credit") throw new GroupBuyRefundError("refund_method_mismatch");
  if (args.groupBuyId && args.groupBuyId !== groupBuy.id) {
    throw new GroupBuyRefundError("group_buy_scope");
  }
  if (
    args.role !== "admin"
    && !(args.role === "organiser" && normalizeUsername(groupBuy.organiserId ?? "") === normalizeUsername(args.username))
  ) {
    throw new GroupBuyRefundError("forbidden");
  }
  if (
    order.id !== refund.orderId
    || order.groupBuyId !== refund.groupBuyId
    || account.telegramUsername !== refund.accountId
    || normalizeUsername(order.telegramUsername) !== normalizeUsername(account.telegramUsername)
  ) {
    throw new GroupBuyRefundError("refund_linkage_mismatch");
  }
}

function validateCompletedTerminal(order: Record<string, any>): void {
  if (
    order.status !== "Cancelled"
    || order.paymentStatus !== "refunded"
    || order.refundStatus !== "refunded"
  ) {
    throw new GroupBuyRefundError("completed_refund_linkage_mismatch");
  }
}

async function returnCompletedIfValid(
  database: DatabaseLike,
  unlockedRefund: Record<string, any>,
  args: CompleteCreditRefundArgs,
  forceRecheck = false,
): Promise<RefundRequestResult | null> {
  if (!forceRecheck && unlockedRefund.status !== "completed") return null;
  return database.transaction(async (tx: DatabaseLike) => {
    const [account] = await lockRows(tx, accountsTable, eq(accountsTable.telegramUsername, unlockedRefund.accountId));
    const [order] = await lockRows(tx, ordersTable, eq(ordersTable.id, unlockedRefund.orderId));
    const [groupBuy] = await lockRows(tx, groupBuysTable, eq(groupBuysTable.id, unlockedRefund.groupBuyId));
    const [refund] = await lockRows(tx, groupBuyRefundsTable, eq(groupBuyRefundsTable.id, unlockedRefund.id));
    if (!account || !order || !groupBuy || !refund || refund.status !== "completed") return null;
    validateProcessorScope(account, order, groupBuy, refund, args);
    validateCompletedTerminal(order);
    return asRefundResult(refund);
  });
}

export async function createRefundRequest(
  database: DatabaseLike,
  args: CreateRefundRequestArgs,
): Promise<RefundRequestResult> {
  const accountId = normalizeUsername(args.accountId);
  const canonicalArgs = { ...args, accountId };
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
  if (accountId !== normalizeUsername(unlockedOrder.telegramUsername ?? "")) {
    throw new GroupBuyRefundError("not_owner");
  }

  // Verify before opening the transaction. The transaction re-locks and
  // re-evaluates all values so this proof cannot survive a payment identity
  // change made while the verifier was doing network I/O.
  const paymentEvidenceProof = await loadOriginalPaymentProof(unlockedOrder);

  return database.transaction(async (tx: DatabaseLike) => {
    const [account] = await lockRows(tx, accountsTable, eq(accountsTable.telegramUsername, accountId));
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
    const lockedPayment = await resolveLockedPayment(tx, order);
    requireLockedPaymentProof(order, paymentEvidenceProof, lockedPayment);

    const eligibility = evaluateRefundEligibility({
      accountId,
      paymentEvidenceProof,
      order: refundOrder(order),
      groupBuy: { id: groupBuy.id, cryptoRefundsEnabled: groupBuy.cryptoRefundsEnabled },
      activeRefund: null,
    });
    if (!eligibility.eligible || !eligibility.amountUsd) {
      throw new GroupBuyRefundError(eligibility.reasonCode ?? "ineligible");
    }

    const input = canonicalArgs.input as RefundRequestInput;
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
         identity: accountId,
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
  const [unlockedOrder] = await loadRows(
    database,
    ordersTable,
    eq(ordersTable.id, unlockedRefund.orderId),
  );
  if (!unlockedOrder) throw new GroupBuyRefundError("not_found");
  const [unlockedAccount] = await loadRows(
    database,
    accountsTable,
    eq(accountsTable.telegramUsername, unlockedRefund.accountId),
  );
  const [unlockedGroupBuy] = await loadRows(
    database,
    groupBuysTable,
    eq(groupBuysTable.id, unlockedRefund.groupBuyId),
  );
  if (!unlockedAccount || !unlockedGroupBuy) throw new GroupBuyRefundError("not_found");
  validateProcessorScope(unlockedAccount, unlockedOrder, unlockedGroupBuy, unlockedRefund, args);
  const alreadyCompleted = await returnCompletedIfValid(database, unlockedRefund, args);
  if (alreadyCompleted) return alreadyCompleted;

  // Completion also independently verifies the original incoming payment
  // before any row lock. This is deliberately repeated on retries: evidence
  // is not persisted as a caller-controlled field on a refund row.
  let paymentEvidenceProof: ServerPaymentEvidenceProof;
  try {
    paymentEvidenceProof = await loadOriginalPaymentProof(unlockedOrder);
  } catch (error) {
    const completedDuringVerification = await returnCompletedIfValid(database, unlockedRefund, args, true);
    if (completedDuringVerification) return completedDuringVerification;
    throw error;
  }

  return database.transaction(async (tx: DatabaseLike) => {
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

    validateProcessorScope(account, order, groupBuy, refund, args);

    if (refund.status === "completed") {
      validateCompletedTerminal(order);
      return asRefundResult(refund);
    }
    if (
      order.deletedAt != null
      || order.status === "Cancelled"
      || order.refundStatus === "refunded"
      || order.paymentStatus !== "confirmed"
      || order.paymentConfirmedAt == null
    ) {
      throw new GroupBuyRefundError("payment_state_changed");
    }

    const lockedPayment = await resolveLockedPayment(tx, order);
    requireLockedPaymentProof(order, paymentEvidenceProof, lockedPayment);
    // Revalidate the original evidence against locked authoritative values.
    // The completion path intentionally treats the GB feature flag as
    // irrelevant: disabling new requests must not strand active history.
    const evidenceCheck = evaluateRefundEligibility({
      accountId: account.telegramUsername,
      paymentEvidenceProof,
      order: {
        ...refundOrder(order),
        status: "Submitted",
        refundStatus: null,
        paymentStatus: "confirmed",
      },
      groupBuy: { id: groupBuy.id, cryptoRefundsEnabled: true },
      activeRefund: null,
    });
    if (!evidenceCheck.eligible) throw new GroupBuyRefundError("payment_evidence_changed");

    if (refund.status !== "requested" && refund.status !== "verification_failed") {
      throw new GroupBuyRefundError("invalid_refund_transition");
    }
    // Claim directly to completed before money writes. A concurrent retry or
    // failed conditional claim performs no money, ledger, order, or audit
    // writes. Any later failure rolls the transaction back to the original
    // requested/verification_failed state.
    const [claimed] = await tx
      .update(groupBuyRefundsTable)
      .set({
        status: "completed",
        completedAt: new Date(),
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
      reason: `Group-buy refund for order #${order.code}`,
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
    await insertAudit(tx, {
      action: "group_buy_refund_completed",
      message: `Group-buy refund ${refund.id} completed`,
      metadata: {
        identity: args.username,
        role: args.role,
        source: "refund_processor",
        transition: "requested_or_verification_failed_to_completed",
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

function cryptoProcessorValues(processor: CryptoRefundProcessor): { username: string; role: string } {
  if (
    !processor
    || typeof processor.username !== "string"
    || !processor.username.trim()
    || (processor.role !== "admin" && processor.role !== "organiser")
  ) {
    throw new GroupBuyRefundError("forbidden");
  }
  return { username: processor.username.trim(), role: processor.role };
}

function validateCryptoProcessorScope(
  account: Record<string, any>,
  order: Record<string, any>,
  groupBuy: Record<string, any>,
  refund: Record<string, any>,
  processor: CryptoRefundProcessor,
): void {
  if (refund.method !== "crypto") throw new GroupBuyRefundError("refund_method_mismatch");
  if (processor.groupBuyId && processor.groupBuyId !== groupBuy.id) {
    throw new GroupBuyRefundError("group_buy_scope");
  }
  if (
    processor.role !== "admin"
    && normalizeUsername(groupBuy.organiserId ?? "") !== normalizeUsername(processor.username)
  ) {
    throw new GroupBuyRefundError("forbidden");
  }
  if (
    order.id !== refund.orderId
    || order.groupBuyId !== refund.groupBuyId
    || account.telegramUsername !== refund.accountId
    || normalizeUsername(order.telegramUsername) !== normalizeUsername(account.telegramUsername)
  ) {
    throw new GroupBuyRefundError("refund_linkage_mismatch");
  }
  if (
    refund.asset !== "USDC"
    && refund.asset !== "USDT"
    || refund.network !== "Ethereum ERC-20"
    || typeof refund.destinationWallet !== "string"
    || !isValidEthAddress(refund.destinationWallet)
    || typeof refund.amountBaseUnits !== "string" && typeof refund.amountBaseUnits !== "number"
  ) {
    throw new GroupBuyRefundError("invalid_refund_configuration");
  }
}

function completedCryptoResult(refund: Record<string, any>, txid: string): RefundRequestResult {
  if (refund.outgoingTxid !== txid) throw new GroupBuyRefundError("completed_txid_immutable");
  return asRefundResult(refund);
}

async function lockCryptoRows(
  tx: DatabaseLike,
  refund: Record<string, any>,
): Promise<{
  account: Record<string, any> | undefined;
  order: Record<string, any> | undefined;
  groupBuy: Record<string, any> | undefined;
  refund: Record<string, any> | undefined;
  attempts: Record<string, any>[];
}> {
  // Keep this order identical for claims, failures, and completion. In
  // particular, no attempt lock is acquired before the refund lock.
  const [account] = await lockRows(tx, accountsTable, eq(accountsTable.telegramUsername, refund.accountId));
  const [order] = await lockRows(tx, ordersTable, eq(ordersTable.id, refund.orderId));
  const [groupBuy] = await lockRows(tx, groupBuysTable, eq(groupBuysTable.id, refund.groupBuyId));
  const [lockedRefund] = await lockRows(tx, groupBuyRefundsTable, eq(groupBuyRefundsTable.id, refund.id));
  const attempts = await lockRows(tx, groupBuyRefundAttemptsTable, eq(groupBuyRefundAttemptsTable.refundId, refund.id));
  return { account, order, groupBuy, refund: lockedRefund, attempts };
}

async function compensateCryptoProcessingFailure(
  database: DatabaseLike,
  refundSnapshot: Record<string, any>,
  attemptId: string,
  txid: string,
  actor: { username: string; role: string },
): Promise<void> {
  let auditPayload: { orderId: string; groupBuyId: string } | undefined;
  try {
    await database.transaction(async (tx: DatabaseLike) => {
      const locked = await lockCryptoRows(tx, refundSnapshot);
      if (!locked.account || !locked.order || !locked.groupBuy || !locked.refund) return;
      const attempt = locked.attempts.find(candidate => candidate.id === attemptId);
      if (
        !attempt
        || attempt.submittedTxid !== txid
        || locked.refund.status !== "verifying"
        || locked.refund.processingAttemptId !== attemptId
        || normalizeUsername(locked.refund.processorUsername ?? "") !== normalizeUsername(actor.username)
      ) return;
      const now = new Date();
      await tx.update(groupBuyRefundAttemptsTable).set({
        endedAt: now,
        resultCode: "processing_failure",
        failureReason: PROCESSING_FAILURE_MESSAGE,
      }).where(and(
        eq(groupBuyRefundAttemptsTable.id, attemptId),
        eq(groupBuyRefundAttemptsTable.submittedTxid, txid),
      ));
      await tx.update(groupBuyRefundsTable).set({
        status: "verification_failed",
        failedAt: now,
        verificationErrorCode: "processing_failure",
        verificationErrorMessage: PROCESSING_FAILURE_MESSAGE,
      }).where(and(
        eq(groupBuyRefundsTable.id, refundSnapshot.id),
        eq(groupBuyRefundsTable.status, "verifying"),
        eq(groupBuyRefundsTable.processingAttemptId, attemptId),
      ));
      auditPayload = { orderId: locked.order.id, groupBuyId: locked.groupBuy.id };
    });
  } catch {
    // The original finalization error is the stable error exposed to callers.
  }
  if (!auditPayload) return;
  try {
    await database.transaction(async (tx: DatabaseLike) => {
      await insertAudit(tx, {
        action: "group_buy_refund_processing_failed",
        message: `Group-buy crypto refund ${refundSnapshot.id} processing failed`,
        metadata: {
          identity: actor.username,
          role: actor.role,
          source: "refund_processor",
          transition: "verifying_to_verification_failed",
          resultCode: "processing_failure",
          refundId: refundSnapshot.id,
          orderId: auditPayload!.orderId,
          groupBuyId: auditPayload!.groupBuyId,
        },
      });
    });
  } catch {
    // Audit is best effort after recovery has committed.
  }
}

/**
 * Claims and independently verifies an outgoing crypto refund. Network I/O is
 * deliberately between two transactions: the claim transaction never holds
 * application row locks while an Ethereum provider is queried.
 */
export async function submitCryptoRefund(
  database: DatabaseLike,
  processor: CryptoRefundProcessor,
  refundId: string,
  txid: string,
): Promise<RefundRequestResult> {
  const canonicalTxid = typeof normalizeEthereumTxid === "function"
    ? normalizeEthereumTxid(txid)
    : typeof txid === "string" && /^(?:0x)?[0-9a-fA-F]{64}$/.test(txid)
      ? (txid.startsWith("0x") ? txid : `0x${txid}`).toLowerCase()
      : null;
  if (!canonicalTxid) {
    throw new GroupBuyRefundError("invalid_txid");
  }
  const actor = cryptoProcessorValues(processor);
  const [unlockedRefund] = await loadRows(database, groupBuyRefundsTable, eq(groupBuyRefundsTable.id, refundId));
  if (!unlockedRefund) throw new GroupBuyRefundError("not_found");

  const [unlockedOrder] = await loadRows(database, ordersTable, eq(ordersTable.id, unlockedRefund.orderId));
  const [unlockedAccount] = await loadRows(
    database,
    accountsTable,
    eq(accountsTable.telegramUsername, unlockedRefund.accountId),
  );
  const [unlockedGroupBuy] = await loadRows(
    database,
    groupBuysTable,
    eq(groupBuysTable.id, unlockedRefund.groupBuyId),
  );
  if (!unlockedOrder || !unlockedAccount || !unlockedGroupBuy) throw new GroupBuyRefundError("not_found");
  validateCryptoProcessorScope(unlockedAccount, unlockedOrder, unlockedGroupBuy, unlockedRefund, processor);
  if (unlockedRefund.status === "completed") return completedCryptoResult(unlockedRefund, canonicalTxid);
  if (refundVerifyLeaseMs() === null) {
    throw new GroupBuyRefundError("provider_unavailable", "Refund verification lease configuration is invalid.");
  }
  const [replayedRefund] = await loadRows(
    database,
    groupBuyRefundsTable,
    eq(groupBuyRefundsTable.outgoingTxid, canonicalTxid),
  );
  if (replayedRefund && replayedRefund.id !== refundId) throw new GroupBuyRefundError("txid_replay");

  let attemptId: string | undefined;
  let completedDuringClaim: RefundRequestResult | undefined;
  await database.transaction(async (tx: DatabaseLike) => {
    const locked = await lockCryptoRows(tx, unlockedRefund);
    if (!locked.account || !locked.order || !locked.groupBuy || !locked.refund) {
      throw new GroupBuyRefundError("not_found");
    }
    validateCryptoProcessorScope(locked.account, locked.order, locked.groupBuy, locked.refund, processor);
    if (locked.refund.status === "completed") {
      completedDuringClaim = completedCryptoResult(locked.refund, canonicalTxid);
      return;
    }
    if (locked.refund.status === "verifying") {
      const leaseMs = refundVerifyLeaseMs();
      if (leaseMs === null) throw new GroupBuyRefundError("provider_unavailable", "Refund verification lease configuration is invalid.");
      const currentAttempt = locked.attempts.find(candidate =>
        candidate.id === locked.refund!.processingAttemptId);
      const startedAt = currentAttempt?.startedAt ?? locked.refund.verifyingAt;
      const startedAtMs = startedAt instanceof Date
        ? startedAt.getTime()
        : typeof startedAt === "string"
          ? Date.parse(startedAt)
          : Number.NaN;
      if (!Number.isFinite(startedAtMs) || Date.now() - startedAtMs <= leaseMs) {
        throw new GroupBuyRefundError(
          normalizeUsername(locked.refund.processorUsername ?? "") === normalizeUsername(actor.username)
            ? "owned"
            : "in_progress",
        );
      }
      const staleAt = new Date();
      if (currentAttempt) {
        await tx.update(groupBuyRefundAttemptsTable).set({
          endedAt: staleAt,
          resultCode: "processing_failure",
          failureReason: PROCESSING_FAILURE_MESSAGE,
        }).where(and(
          eq(groupBuyRefundAttemptsTable.id, currentAttempt.id),
          eq(groupBuyRefundAttemptsTable.submittedTxid, currentAttempt.submittedTxid),
        ));
      }
      await tx.update(groupBuyRefundsTable).set({
        status: "verification_failed",
        failedAt: staleAt,
        verificationErrorCode: "processing_failure",
        verificationErrorMessage: PROCESSING_FAILURE_MESSAGE,
      }).where(and(
        eq(groupBuyRefundsTable.id, refundId),
        eq(groupBuyRefundsTable.status, "verifying"),
        eq(groupBuyRefundsTable.processingAttemptId, locked.refund.processingAttemptId),
      ));
      locked.refund.status = "verification_failed";
    }
    if (locked.refund.status !== "requested" && locked.refund.status !== "verification_failed") {
      throw new GroupBuyRefundError("invalid_refund_transition");
    }

    attemptId = randomUUID();
    const [claimed] = await tx
      .insert(groupBuyRefundTxClaimsTable)
      .values({ txid: canonicalTxid, refundId, createdAt: new Date() })
      .onConflictDoNothing()
      .returning();
    if (!claimed) {
      const [existingClaim] = await lockRows(
        tx,
        groupBuyRefundTxClaimsTable,
        eq(groupBuyRefundTxClaimsTable.txid, canonicalTxid),
      );
      if (existingClaim?.refundId !== refundId) throw new GroupBuyRefundError("txid_replay");
    }
    const [claimedRefund] = await tx
      .update(groupBuyRefundsTable)
      .set({
        status: "verifying",
        verifyingAt: new Date(),
        processorUsername: actor.username,
        processorRole: actor.role,
        processingAttemptId: attemptId,
        verificationErrorCode: null,
        verificationErrorMessage: null,
        failedAt: null,
      })
      .where(and(
        eq(groupBuyRefundsTable.id, refundId),
        inArray(groupBuyRefundsTable.status, ["requested", "verification_failed"]),
      ))
      .returning();
    if (!claimedRefund) throw new GroupBuyRefundError("in_progress");
    await tx.insert(groupBuyRefundAttemptsTable).values({
      id: attemptId,
      refundId,
      submittedTxid: canonicalTxid,
      processorUsername: actor.username,
      processorRole: actor.role,
      startedAt: new Date(),
    });
  });
  if (completedDuringClaim) return completedDuringClaim;
  if (!attemptId) throw new GroupBuyRefundError("in_progress");
  const processingAttemptId = attemptId;

  let verification: RefundCryptoVerificationResult;
  try {
    verification = await verifyRefundCryptoTransfer({
      txid: canonicalTxid,
      asset: String(unlockedRefund.asset),
      destinationWallet: String(unlockedRefund.destinationWallet),
      amountBaseUnits: String(unlockedRefund.amountBaseUnits),
    });
  } catch {
    verification = {
      verified: false,
      code: "provider_unavailable",
      message: "Ethereum provider is unavailable.",
    };
  }

  let completion: RefundRequestResult | { failureCode: string; failureMessage: string };
  try {
    completion = await database.transaction(async (tx: DatabaseLike) => {
    const locked = await lockCryptoRows(tx, unlockedRefund);
    if (!locked.account || !locked.order || !locked.groupBuy || !locked.refund) {
      throw new GroupBuyRefundError("not_found");
    }
    validateCryptoProcessorScope(locked.account, locked.order, locked.groupBuy, locked.refund, processor);
    const attempt = locked.attempts.find(candidate => candidate.id === processingAttemptId);
    if (
      !attempt
      || attempt.submittedTxid !== canonicalTxid
      || attempt.processorUsername !== actor.username
      || locked.refund.status !== "verifying"
      || normalizeUsername(locked.refund.processorUsername ?? "") !== normalizeUsername(actor.username)
    ) {
      throw new GroupBuyRefundError("attempt_ownership_lost");
    }

    const now = new Date();
    const failureCode = verification.verified ? null : verification.code;
    const failureMessage = verification.verified ? null : verification.message;
    await tx.update(groupBuyRefundAttemptsTable).set({
      endedAt: now,
      resultCode: verification.verified ? "verified" : verification.code,
      failureReason: failureMessage,
    }).where(and(
      eq(groupBuyRefundAttemptsTable.id, processingAttemptId),
      eq(groupBuyRefundAttemptsTable.submittedTxid, canonicalTxid),
    ));

    if (!verification.verified) {
      await tx.update(groupBuyRefundsTable).set({
        status: "verification_failed",
        failedAt: now,
        verificationErrorCode: failureCode,
        verificationErrorMessage: failureMessage,
      }).where(and(
        eq(groupBuyRefundsTable.id, refundId),
        eq(groupBuyRefundsTable.status, "verifying"),
      ));
      await insertAudit(tx, {
        action: "group_buy_refund_verification_failed",
        message: `Group-buy crypto refund ${refundId} verification failed`,
        metadata: {
          identity: actor.username,
          role: actor.role,
          source: "refund_processor",
          transition: "verifying_to_verification_failed",
          resultCode: verification.code,
          refundId,
          orderId: locked.order.id,
          groupBuyId: locked.groupBuy.id,
        },
      });
      return { failureCode: verification.code, failureMessage: verification.message };
    }

    const explorerUrl = `https://etherscan.io/tx/${canonicalTxid}`;
    await tx.update(groupBuyRefundsTable).set({
      status: "completed",
      outgoingTxid: canonicalTxid,
      confirmationCount: verification.confirmationCount,
      explorerUrl,
      processorUsername: actor.username,
      processorRole: actor.role,
      completedAt: now,
      verificationErrorCode: null,
      verificationErrorMessage: null,
      failedAt: null,
    }).where(and(
      eq(groupBuyRefundsTable.id, refundId),
      eq(groupBuyRefundsTable.status, "verifying"),
    ));
    await tx.update(ordersTable).set({
      refundStatus: "refunded",
      refundedAt: now,
      status: "Cancelled",
      paymentStatus: "refunded",
    }).where(eq(ordersTable.id, locked.order.id));
    await insertAudit(tx, {
      action: "group_buy_refund_completed",
      message: `Group-buy crypto refund ${refundId} completed`,
      metadata: {
        identity: actor.username,
        role: actor.role,
        source: "refund_processor",
        transition: "verifying_to_completed",
        resultCode: "crypto_refund_completed",
        refundId,
        orderId: locked.order.id,
        groupBuyId: locked.groupBuy.id,
        asset: locked.refund.asset,
        confirmationCount: verification.confirmationCount,
        outgoingTxid: canonicalTxid,
      },
    });
    return asRefundResult({
      ...locked.refund,
      status: "completed",
      outgoingTxid: canonicalTxid,
      confirmationCount: verification.confirmationCount,
      explorerUrl,
      completedAt: now,
    });
    });
  } catch {
    await compensateCryptoProcessingFailure(database, unlockedRefund, processingAttemptId, canonicalTxid, actor);
    throw new GroupBuyRefundError("processing_failure", PROCESSING_FAILURE_MESSAGE);
  }
  if ("failureCode" in completion) {
    throw new GroupBuyRefundError(completion.failureCode, completion.failureMessage);
  }
  return completion;
}
