import { Router, type IRouter, type Request, type Response } from "express";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import {
  accountsTable,
  groupBuyRefundAttemptsTable,
  groupBuyRefundsTable,
  groupBuysTable,
  ordersTable,
} from "@workspace/db";
import { db } from "@workspace/db";
import { requireAccount } from "../middleware/account-auth";
import { requireAdmin } from "../middleware/require-admin";
import { requireOrganiser } from "../middleware/require-organiser";
import {
  completeCreditRefund,
  completeManualCryptoRefund,
  createRefundRequest,
  GroupBuyRefundError,
  MAX_MANUAL_REFUND_REASON_LENGTH,
  submitCryptoRefund,
} from "../lib/group-buy-refund";
import type { RefundRequestInput } from "../lib/refund-money";
import { getCustomerRefundView } from "../lib/customer-refund-view";
import { isValidTxHash } from "../lib/payment-verify";
import { normalizeEthereumTxid } from "../lib/refund-crypto-verifier";

const router: IRouter = Router();
const REFUND_STATUSES = ["requested", "verifying", "verification_failed", "completed"] as const;
const MAX_PAGE_SIZE = 100;
const MAX_PAGE_NUMBER = 10_000;
const MAX_OFFSET = 1_000_000;

type RefundStatus = typeof REFUND_STATUSES[number];

function errorResponse(res: Response, error: unknown): void {
  const code = error instanceof GroupBuyRefundError ? error.code : "internal_error";
  const status =
    ["not_found", "not_group_buy_order", "group_buy_scope", "refund_linkage_mismatch"].includes(code) ? 404
      : ["forbidden", "not_owner", "refunds_disabled"].includes(code) ? 403
        : [
          "active_refund_exists", "active_refund_race", "in_progress", "owned", "txid_replay",
          "concurrent_state_change", "completed_txid_immutable", "invalid_refund_transition",
          "refund_claim_lost", "attempt_ownership_lost", "order_state_changed", "payment_state_changed",
          "payment_evidence_changed", "refund_active",
        ].includes(code) ? 409
          : ["provider_unavailable", "processing_failure", "audit_failure", "storage_failure", "transient_failure"].includes(code) ? 503
            : ["internal_error", "completed_refund_linkage_mismatch", "invalid_refund_configuration", "invalid_refund_amount"].includes(code) ? 500
              : 400;
  res.status(status).json({ code, error: code });
}

function oneQueryValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function parseQueueQuery(req: Request): { groupBuyId?: string; status?: RefundStatus; page: number; limit: number } | null {
  const groupBuyIdValue = req.query["groupBuyId"];
  const statusValue = req.query["status"];
  const pageValue = req.query["page"];
  const limitValue = req.query["limit"];
  if (
    (groupBuyIdValue !== undefined && typeof groupBuyIdValue !== "string")
    || (statusValue !== undefined && typeof statusValue !== "string")
    || (pageValue !== undefined && typeof pageValue !== "string")
    || (limitValue !== undefined && typeof limitValue !== "string")
  ) return null;
  const groupBuyId = oneQueryValue(groupBuyIdValue);
  const status = oneQueryValue(statusValue);
  const pageRaw = oneQueryValue(pageValue) ?? "1";
  const limitRaw = oneQueryValue(limitValue) ?? "50";
  const page = Number(pageRaw);
  const limit = Number(limitRaw);
  if (req.query["groupBuyId"] !== undefined && !groupBuyId) return null;
  if (req.query["status"] !== undefined && (!status || !(REFUND_STATUSES as readonly string[]).includes(status))) return null;
  if (!/^[1-9]\d*$/.test(pageRaw) || !Number.isSafeInteger(page) || page < 1 || page > MAX_PAGE_NUMBER) return null;
  if (!/^[1-9]\d*$/.test(limitRaw) || !Number.isSafeInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) return null;
  if (!Number.isSafeInteger((page - 1) * limit) || (page - 1) * limit > MAX_OFFSET) return null;
  return { groupBuyId: groupBuyId || undefined, status: status as RefundStatus | undefined, page, limit };
}

function parseRefundRequestBody(body: unknown): RefundRequestInput | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const record = body as Record<string, unknown>;
  const keys = Object.keys(record);
  if (record.method === "credit" && keys.length === 1) return { method: "credit" };
  if (
    record.method === "crypto"
    && keys.length === 4
    && keys.every(key => ["method", "asset", "network", "destinationWallet"].includes(key))
    && (record.asset === "USDC" || record.asset === "USDT")
    && record.network === "Ethereum ERC-20"
    && typeof record.destinationWallet === "string"
  ) {
    return {
      method: "crypto",
      asset: record.asset,
      network: record.network,
      destinationWallet: record.destinationWallet,
    };
  }
  return null;
}

function parseTxidBody(body: unknown): { txid: string; txid2?: string } | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const record = body as Record<string, unknown>;
  const keys = Object.keys(record);
  if (
    keys.length < 1
    || keys.length > 2
    || !keys.every(key => key === "txid" || key === "txid2")
    || typeof record.txid !== "string"
    || record.txid2 !== undefined && typeof record.txid2 !== "string"
  ) return null;
  const txid = record.txid.trim();
  const txid2 = typeof record.txid2 === "string" ? record.txid2.trim() : "";
  return txid ? { txid, ...(txid2 ? { txid2 } : {}) } : null;
}

function parseManualCompleteBody(body: unknown): { txid: string; txid2?: string; reason: string } | { code: "invalid_txid" | "invalid_txid_pair" } | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const record = body as Record<string, unknown>;
  const keys = Object.keys(record);
  if (
    keys.length < 2
    || keys.length > 3
    || !keys.every(key => key === "txid" || key === "txid2" || key === "reason")
    || typeof record.txid !== "string"
    || record.txid2 !== undefined && typeof record.txid2 !== "string"
    || typeof record.reason !== "string"
  ) return null;
  const txid = record.txid.trim();
  const txid2 = typeof record.txid2 === "string" ? record.txid2.trim() : "";
  const reason = record.reason.trim();
  if (!normalizeEthereumTxid(txid)) return { code: "invalid_txid" };
  if (txid2 && !normalizeEthereumTxid(txid2)) return { code: "invalid_txid" };
  if (txid2 && normalizeEthereumTxid(txid2) === normalizeEthereumTxid(txid)) return { code: "invalid_txid_pair" };
  if (!reason || reason.length > MAX_MANUAL_REFUND_REASON_LENGTH) return null;
  return txid2 ? { txid, txid2, reason } : { txid, reason };
}

function safeAttempt(attempt: Record<string, unknown>) {
  return {
    id: attempt.id,
    submittedTxid: attempt.submittedTxid,
    processorUsername: attempt.processorUsername,
    processorRole: attempt.processorRole,
    startedAt: attempt.startedAt,
    endedAt: attempt.endedAt,
    resultCode: attempt.resultCode,
    failureReason: attempt.failureReason,
  };
}

function paymentTxids(refund: Record<string, unknown>): string[] {
  const values: unknown[] = [
    refund.paymentTxHash,
    ...(Array.isArray(refund.paymentTxHashes) ? refund.paymentTxHashes : []),
  ];
  values.push(refund.balanceTxHash);
  const outgoing = new Set(
    [refund.outgoingTxid, refund.outgoingTxid2]
      .filter((value): value is string => typeof value === "string")
      .map(value => txidComparisonKey(value.trim())),
  );
  const seen = new Set<string>();
  return values.reduce<string[]>((result, value) => {
    if (typeof value !== "string") return result;
    const trimmed = value.trim();
    if (!isValidTxHash(trimmed)) return result;
    const comparisonKey = txidComparisonKey(trimmed);
    if (outgoing.has(comparisonKey) || seen.has(comparisonKey)) return result;
    seen.add(comparisonKey);
    result.push(trimmed);
    return result;
  }, []);
}

function txidComparisonKey(value: string): string {
  const withoutPrefix = value.replace(/^0x/i, "");
  return /^[0-9a-fA-F]{64}$/.test(withoutPrefix)
    ? withoutPrefix.toLowerCase()
    : value;
}

function safeRefund(refund: Record<string, unknown>, customerUsername?: string, groupBuyName?: string, orderCode?: string) {
  return {
    id: refund.id,
    orderId: refund.orderId,
    orderCode: orderCode ?? null,
    groupBuyId: refund.groupBuyId,
    groupBuyName: groupBuyName ?? null,
    customerUsername: customerUsername ?? refund.accountId,
    method: refund.method,
    asset: refund.asset,
    network: refund.network,
    amountUsd: refund.amountUsd == null ? null : String(refund.amountUsd),
    amountBaseUnits: refund.amountBaseUnits == null ? null : String(refund.amountBaseUnits),
    destinationWallet: refund.destinationWallet,
    status: refund.status,
    paymentTxids: paymentTxids(refund),
    requestedAt: refund.requestedAt,
    verifyingAt: refund.verifyingAt,
    failedAt: refund.failedAt,
    completedAt: refund.completedAt,
    outgoingTxid: refund.outgoingTxid,
    outgoingTxid2: refund.outgoingTxid2,
    confirmationCount: refund.confirmationCount,
    explorerUrl: refund.explorerUrl,
    verificationError: refund.verificationErrorCode
      ? { code: refund.verificationErrorCode, message: refund.verificationErrorMessage }
      : null,
  };
}

async function attemptsFor(refundId: string): Promise<ReturnType<typeof safeAttempt>[]> {
  const attempts = await db.select().from(groupBuyRefundAttemptsTable)
    .where(eq(groupBuyRefundAttemptsTable.refundId, refundId))
    .orderBy(asc(groupBuyRefundAttemptsTable.startedAt), asc(groupBuyRefundAttemptsTable.id));
  return attempts.map(attempt => safeAttempt(attempt as unknown as Record<string, unknown>));
}

async function attemptsForMany(refundIds: string[]): Promise<Map<string, ReturnType<typeof safeAttempt>[]>> {
  const grouped = new Map<string, ReturnType<typeof safeAttempt>[]>();
  if (refundIds.length === 0) return grouped;
  const attempts = await db.select().from(groupBuyRefundAttemptsTable)
    .where(inArray(groupBuyRefundAttemptsTable.refundId, refundIds))
    .orderBy(asc(groupBuyRefundAttemptsTable.refundId), asc(groupBuyRefundAttemptsTable.startedAt), asc(groupBuyRefundAttemptsTable.id));
  for (const attempt of attempts) {
    const id = String(attempt.refundId);
    const list = grouped.get(id) ?? [];
    list.push(safeAttempt(attempt as unknown as Record<string, unknown>));
    grouped.set(id, list);
  }
  return grouped;
}

async function detailFor(
  refund: Record<string, unknown>,
  customerUsername?: string,
  groupBuyName?: string,
  orderCode?: string,
  attempts?: ReturnType<typeof safeAttempt>[],
) {
  return {
    ...safeRefund(refund, customerUsername, groupBuyName, orderCode),
    attempts: attempts ?? await attemptsFor(String(refund.id)),
  };
}

function adminUsername(res: Response): string {
  return typeof res.locals["adminUsername"] === "string" ? res.locals["adminUsername"] : "admin";
}

function organiserUsername(req: Request): string {
  return String(req.organiser?.telegramUsername ?? "").trim().replace(/^@/, "").toLowerCase();
}

function organiserProcessor(req: Request): { username: string; role: "organiser" | "admin"; groupBuyId?: string } {
  return req.organiser?.isAdmin
    ? { username: organiserUsername(req), role: "admin", groupBuyId: req.organiser.adminGbId }
    : { username: organiserUsername(req), role: "organiser" };
}

function organiserOwnerPredicate(req: Request) {
  return req.organiser?.isAdmin
    ? eq(groupBuysTable.id, req.organiser.adminGbId ?? "")
    : sql`lower(regexp_replace(${groupBuysTable.organiserId}, '^@', '')) = ${organiserUsername(req)}`;
}

function refundWithPaymentFields(row: Record<string, any>): Record<string, unknown> {
  return {
    ...row.refund,
    customerUsername: row.customerUsername,
    groupBuyName: row.groupBuyName,
    orderCode: row.orderCode,
    paymentTxHash: row.paymentTxHash ?? row.refund.paymentTxHash,
    paymentTxHashes: row.paymentTxHashes ?? row.refund.paymentTxHashes,
    balanceTxHash: row.balanceTxHash ?? row.refund.balanceTxHash,
    balancePaymentStatus: row.balancePaymentStatus ?? row.refund.balancePaymentStatus,
  };
}

async function loadRefundForRole(refundId: string, role: "admin" | "organiser", username?: string, req?: Request): Promise<Record<string, unknown> | undefined> {
  const predicates = [eq(groupBuyRefundsTable.id, refundId)];
  if (role === "organiser") {
    predicates.push(req?.organiser?.isAdmin
      ? eq(groupBuysTable.id, req.organiser.adminGbId ?? "")
      : sql`lower(regexp_replace(${groupBuysTable.organiserId}, '^@', '')) = ${username ?? ""}`);
  }
  const [row] = await db.select({
    refund: groupBuyRefundsTable,
    customerUsername: accountsTable.telegramUsername,
    groupBuyName: groupBuysTable.name,
    orderCode: ordersTable.code,
    paymentTxHash: ordersTable.paymentTxHash,
    paymentTxHashes: ordersTable.paymentTxHashes,
    balanceTxHash: ordersTable.balanceTxHash,
    balancePaymentStatus: ordersTable.balancePaymentStatus,
  })
    .from(groupBuyRefundsTable)
    .innerJoin(groupBuysTable, eq(groupBuyRefundsTable.groupBuyId, groupBuysTable.id))
    .innerJoin(ordersTable, eq(groupBuyRefundsTable.orderId, ordersTable.id))
    .leftJoin(accountsTable, eq(groupBuyRefundsTable.accountId, accountsTable.telegramUsername))
    .where(and(...predicates));
  if (!row) return undefined;
  return refundWithPaymentFields(row as Record<string, any>);
}

async function listRefunds(role: "admin" | "organiser", req: Request, username?: string): Promise<unknown[]> {
  const parsed = parseQueueQuery(req);
  if (!parsed) throw new GroupBuyRefundError("invalid_query");
  const predicates = [];
  if (parsed.groupBuyId) predicates.push(eq(groupBuyRefundsTable.groupBuyId, parsed.groupBuyId));
  if (parsed.status) predicates.push(eq(groupBuyRefundsTable.status, parsed.status));
  if (role === "organiser") {
    predicates.push(req.organiser?.isAdmin
      ? eq(groupBuysTable.id, req.organiser.adminGbId ?? "")
      : sql`lower(regexp_replace(${groupBuysTable.organiserId}, '^@', '')) = ${username ?? ""}`);
  }
  const rows = await db.select({
    refund: groupBuyRefundsTable,
    customerUsername: accountsTable.telegramUsername,
    groupBuyName: groupBuysTable.name,
    orderCode: ordersTable.code,
    paymentTxHash: ordersTable.paymentTxHash,
    paymentTxHashes: ordersTable.paymentTxHashes,
    balanceTxHash: ordersTable.balanceTxHash,
    balancePaymentStatus: ordersTable.balancePaymentStatus,
  })
    .from(groupBuyRefundsTable)
    .innerJoin(groupBuysTable, eq(groupBuyRefundsTable.groupBuyId, groupBuysTable.id))
    .innerJoin(ordersTable, eq(groupBuyRefundsTable.orderId, ordersTable.id))
    .leftJoin(accountsTable, eq(groupBuyRefundsTable.accountId, accountsTable.telegramUsername))
    .where(predicates.length ? and(...predicates) : sql`true`)
    .orderBy(desc(groupBuyRefundsTable.requestedAt), desc(groupBuyRefundsTable.id))
    .limit(parsed.limit)
    .offset((parsed.page - 1) * parsed.limit);
  const attempts = await attemptsForMany(rows.map(row => String(row.refund.id)));
  return Promise.all(rows.map(row => detailFor(
    refundWithPaymentFields(row as Record<string, any>),
    row.customerUsername ?? undefined,
    row.groupBuyName ?? undefined,
    row.orderCode ?? undefined,
    attempts.get(String(row.refund.id)) ?? [],
  )));
}

async function ensureOrganiserGroupBuy(req: Request, groupBuyId: string): Promise<boolean> {
  const owner = req.organiser?.isAdmin
    ? and(eq(groupBuysTable.id, groupBuyId), eq(groupBuysTable.id, req.organiser.adminGbId ?? ""))
    : and(eq(groupBuysTable.id, groupBuyId), organiserOwnerPredicate(req));
  const [owned] = await db.select({ id: groupBuysTable.id }).from(groupBuysTable).where(owner);
  return !!owned;
}

router.post("/account/orders/:orderId/refund", requireAccount, async (req, res): Promise<void> => {
  const input = parseRefundRequestBody(req.body);
  if (!input) { res.status(400).json({ code: "invalid_refund_request", error: "invalid_refund_request" }); return; }
  try {
    const created = await createRefundRequest(db, {
      accountId: req.account!.telegramUsername,
      orderId: String(req.params["orderId"]),
      input,
    });
    const view = await getCustomerRefundView(String(req.params["orderId"]), req.account!.telegramUsername);
    res.status(201).json({
      ...view,
      // Preserve the original refund response contract for existing clients while
      // the nested customer view carries the authoritative refreshed state.
      id: created.id,
      status: created.status,
      method: created.method,
      amountUsd: created.amountUsd == null ? null : String(created.amountUsd),
    });
  } catch (error) {
    errorResponse(res, error);
  }
});

router.get("/admin/group-buy-refunds", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try { res.json(await listRefunds("admin", req)); } catch (error) { errorResponse(res, error); }
});

router.get("/admin/group-buy-refunds/:refundId", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const refund = await loadRefundForRole(String(req.params["refundId"]), "admin");
    if (!refund) { res.status(404).json({ code: "not_found", error: "not_found" }); return; }
    res.json(await detailFor(refund, String(refund.customerUsername), String(refund.groupBuyName), String(refund.orderCode)));
  } catch (error) { errorResponse(res, error); }
});

router.post("/admin/group-buy-refunds/:refundId/credit-complete", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const result = await completeCreditRefund(db, {
      refundId: String(req.params["refundId"]),
      username: adminUsername(res),
      role: "admin",
    });
    res.json(result);
  } catch (error) { errorResponse(res, error); }
});

router.post("/admin/group-buy-refunds/:refundId/verify", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const txids = parseTxidBody(req.body);
  if (!txids) { res.status(400).json({ code: "invalid_txid", error: "invalid_txid" }); return; }
  try {
    const result = txids.txid2
      ? await submitCryptoRefund(db, { username: adminUsername(res), role: "admin" }, String(req.params["refundId"]), txids.txid, txids.txid2)
      : await submitCryptoRefund(db, { username: adminUsername(res), role: "admin" }, String(req.params["refundId"]), txids.txid);
    res.json(result);
  } catch (error) { errorResponse(res, error); }
});

router.post("/admin/group-buy-refunds/:refundId/manual-complete", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const input = parseManualCompleteBody(req.body);
  if (input && "code" in input) {
    res.status(400).json({ code: input.code, error: input.code });
    return;
  }
  if (!input) {
    res.status(400).json({ code: "invalid_manual_completion_request", error: "invalid_manual_completion_request" });
    return;
  }
  try {
    const result = await completeManualCryptoRefund(db, {
      refundId: String(req.params["refundId"]),
      username: adminUsername(res),
      role: "admin",
      txid: input.txid,
      txid2: input.txid2,
      reason: input.reason,
    });
    res.json(result);
  } catch (error) { errorResponse(res, error); }
});

router.get("/organiser/group-buy-refunds", requireOrganiser, async (req, res): Promise<void> => {
  const parsed = parseQueueQuery(req);
  if (!parsed) { res.status(400).json({ code: "invalid_query", error: "invalid_query" }); return; }
  if (parsed.groupBuyId && !(await ensureOrganiserGroupBuy(req, parsed.groupBuyId))) {
    res.status(404).json({ code: "not_found", error: "not_found" }); return;
  }
  try { res.json(await listRefunds("organiser", req, organiserUsername(req))); } catch (error) { errorResponse(res, error); }
});

router.get("/organiser/group-buy-refunds/:refundId", requireOrganiser, async (req, res): Promise<void> => {
  try {
    const refund = await loadRefundForRole(String(req.params["refundId"]), "organiser", organiserUsername(req), req);
    if (!refund) { res.status(404).json({ code: "not_found", error: "not_found" }); return; }
    res.json(await detailFor(refund, String(refund.customerUsername), String(refund.groupBuyName), String(refund.orderCode)));
  } catch (error) { errorResponse(res, error); }
});

router.post("/organiser/group-buy-refunds/:refundId/credit-complete", requireOrganiser, async (req, res): Promise<void> => {
  try {
    const scoped = await loadRefundForRole(String(req.params["refundId"]), "organiser", organiserUsername(req), req);
    if (!scoped) { res.status(404).json({ code: "not_found", error: "not_found" }); return; }
    const processor = organiserProcessor(req);
    const result = await completeCreditRefund(db, {
      refundId: String(req.params["refundId"]),
      username: processor.username,
      role: processor.role,
      groupBuyId: processor.groupBuyId,
    });
    res.json(result);
  } catch (error) { errorResponse(res, error); }
});

router.post("/organiser/group-buy-refunds/:refundId/verify", requireOrganiser, async (req, res): Promise<void> => {
  const txids = parseTxidBody(req.body);
  if (!txids) { res.status(400).json({ code: "invalid_txid", error: "invalid_txid" }); return; }
  try {
    const scoped = await loadRefundForRole(String(req.params["refundId"]), "organiser", organiserUsername(req), req);
    if (!scoped) { res.status(404).json({ code: "not_found", error: "not_found" }); return; }
    const result = txids.txid2
      ? await submitCryptoRefund(db, organiserProcessor(req), String(req.params["refundId"]), txids.txid, txids.txid2)
      : await submitCryptoRefund(db, organiserProcessor(req), String(req.params["refundId"]), txids.txid);
    res.json(result);
  } catch (error) { errorResponse(res, error); }
});

export default router;