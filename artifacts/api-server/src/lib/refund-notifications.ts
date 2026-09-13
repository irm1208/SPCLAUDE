import { randomUUID } from "node:crypto";
import {
  auditLogsTable,
  groupBuyRefundNotificationsTable,
  groupBuyRefundTransitionOutboxTable,
  type GroupBuyRefundStatus,
} from "@workspace/db";
import { and, asc, eq, isNull, lt, or } from "drizzle-orm";
import { notifyUserFromTemplateFull, type NotifyResult } from "./telegram";

export const REFUND_NOTIFICATION_EVENT_KEYS: Record<GroupBuyRefundStatus, string> = {
  requested: "group_buy_refund_requested",
  verifying: "group_buy_refund_verifying",
  verification_failed: "group_buy_refund_failed",
  completed: "group_buy_refund_completed",
};

const REFUND_NOTIFICATION_PREF = "payment" as const;
const DELIVERY_LEASE_MS = 5 * 60 * 1000;

export type RefundNotificationInput = {
  refundId: string;
  accountId: string;
  status: GroupBuyRefundStatus;
  orderCode?: string | null;
  amountUsd: string;
  explorerUrl?: string | null;
  txid?: string | null;
  /** A crypto processing attempt makes each failure occurrence distinct. */
  attemptId?: string | null;
  transitionKey?: string;
};

export type RefundNotificationVarsInput = {
  orderCode?: unknown;
  amountUsd?: unknown;
  status?: unknown;
  explorerUrl?: unknown;
  txid?: unknown;
  // Deliberately accepted and ignored: callers may pass a larger refund
  // record, but customer variables are an explicit allow-list.
  [key: string]: unknown;
};

export type RefundNotificationMarker = RefundNotificationInput & {
  id: string;
  eventKey: string;
  transitionKey: string;
  claimToken?: string | null;
};

export type NotificationDelivery = NotifyResult | { ok: boolean; skipped?: boolean };
export type NotificationSender = (
  marker: RefundNotificationMarker,
  vars: Record<string, string>,
) => Promise<NotificationDelivery>;

export type RefundNotificationDrainOptions = {
  limit?: number;
  sender?: NotificationSender;
  /** Injectable clock/token sources keep lease takeover tests deterministic. */
  now?: () => Date;
  tokenFactory?: () => string;
};

export type RefundNotificationDrainSchedulerOptions = {
  intervalMs?: number;
  drainAudits?: (database: DatabaseLike, options: { limit: number }) => Promise<number>;
  drainNotifications?: (database: DatabaseLike, options: { limit: number }) => Promise<number>;
  setIntervalFn?: (callback: () => void, intervalMs: number) => unknown;
  clearIntervalFn?: (timer: unknown) => void;
};

export type DatabaseLike = any;

export type RefundAuditOutboxInput = {
  refundId: string;
  attemptId: string;
  orderId: string;
  groupBuyId: string;
  accountId: string;
  method: string;
  processorUsername: string;
  processorRole: string;
  source: "customer" | "admin" | "organiser" | "background";
  transition: string;
  action: string;
  resultCode: string;
  txid?: string | null;
};

export function transitionKeyFor(
  status: GroupBuyRefundStatus,
  attemptId?: string | null,
): string {
  if (status === "requested") return "initial";
  if (status === "completed") return "completed";
  return attemptId ? `attempt:${attemptId}` : `transition:${status}`;
}

export function buildRefundNotificationVars(input: RefundNotificationVarsInput): Record<string, string> {
  return {
    order_code: input.orderCode == null ? "" : String(input.orderCode),
    amount_usd: input.amountUsd == null ? "" : String(input.amountUsd),
    status: input.status == null ? "" : String(input.status),
    explorer_url: input.explorerUrl == null ? "" : String(input.explorerUrl),
    txid: input.txid == null ? "" : String(input.txid),
  };
}

function markerValues(input: RefundNotificationInput): Omit<RefundNotificationMarker, "id"> {
  const status = input.status;
  return {
    refundId: input.refundId,
    accountId: input.accountId.trim().replace(/^@/, "").toLowerCase(),
    status,
    eventKey: REFUND_NOTIFICATION_EVENT_KEYS[status],
    transitionKey: input.transitionKey ?? transitionKeyFor(status, input.attemptId),
    orderCode: input.orderCode ?? null,
    amountUsd: input.amountUsd,
    explorerUrl: input.explorerUrl ?? null,
    txid: input.txid ?? null,
    attemptId: input.attemptId ?? null,
  } as Omit<RefundNotificationMarker, "id">;
}

/**
 * Enqueue a lifecycle event. This function does not send anything, making it
 * safe to call inside the refund state transaction. A unique transition key
 * makes retries and concurrent callers harmless.
 */
export async function enqueueRefundNotification(
  database: DatabaseLike,
  input: RefundNotificationInput,
): Promise<{ inserted: boolean; marker: RefundNotificationMarker }> {
  const values = markerValues(input);
  const id = randomUUID();
  const [inserted] = await database
    .insert(groupBuyRefundNotificationsTable)
    .values({ id, ...values, createdAt: new Date() })
    .onConflictDoNothing()
    .returning();
  if (inserted) return { inserted: true, marker: inserted as RefundNotificationMarker };
  const [existing] = await database
    .select()
    .from(groupBuyRefundNotificationsTable)
    .where(and(
      eq(groupBuyRefundNotificationsTable.refundId, values.refundId),
      eq(groupBuyRefundNotificationsTable.status, values.status),
      eq(groupBuyRefundNotificationsTable.accountId, values.accountId),
      eq(groupBuyRefundNotificationsTable.transitionKey, values.transitionKey),
    ))
    .limit(1);
  if (!existing) {
    throw new Error("Refund notification marker was not found after conflict.");
  }
  return { inserted: false, marker: existing as RefundNotificationMarker };
}

/**
 * Put an audit event in the same transaction as its state transition. The
 * unique key is the refund/attempt/transition tuple, so a retried request
 * cannot create a second audit event.
 */
export async function enqueueRefundAudit(
  database: DatabaseLike,
  input: RefundAuditOutboxInput,
): Promise<boolean> {
  const [inserted] = await database
    .insert(groupBuyRefundTransitionOutboxTable)
    .values({
      id: randomUUID(),
      refundId: input.refundId,
      attemptId: input.attemptId,
      orderId: input.orderId,
      groupBuyId: input.groupBuyId,
      accountId: input.accountId,
      method: input.method,
      source: input.source,
      transition: input.transition,
      action: input.action,
      processorUsername: input.processorUsername,
      processorRole: input.processorRole,
      submittedTxid: input.txid ?? null,
      resultCode: input.resultCode,
      deliveredAt: null,
      createdAt: new Date(),
    })
    .onConflictDoNothing()
    .returning();
  return Boolean(inserted);
}

/** Drain audits with row locking; audit insertion and acknowledgement commit together. */
export async function drainRefundAudits(
  database: DatabaseLike,
  options: { limit?: number } = {},
): Promise<number> {
  const limit = Number.isSafeInteger(options.limit) && (options.limit ?? 0) > 0 ? options.limit! : 100;
  let delivered = 0;
  for (let i = 0; i < limit; i += 1) {
    let didDeliver = false;
    try {
      didDeliver = await database.transaction(async (tx: DatabaseLike) => {
        const [marker] = await tx
          .select()
          .from(groupBuyRefundTransitionOutboxTable)
          .where(isNull(groupBuyRefundTransitionOutboxTable.deliveredAt))
          .orderBy(asc(groupBuyRefundTransitionOutboxTable.createdAt), asc(groupBuyRefundTransitionOutboxTable.id))
          .limit(1)
          .for("update", { skipLocked: true });
        if (!marker) return false;
        await tx.insert(auditLogsTable).values({
          type: "change",
          level: "info",
          action: marker.action,
          message: `Group-buy refund ${marker.refundId} ${marker.transition}`,
          metadata: safeAuditMetadata({
            refundId: marker.refundId,
            orderId: marker.orderId,
            groupBuyId: marker.groupBuyId,
            accountId: marker.accountId,
            method: marker.method,
            processorUsername: marker.processorUsername,
            processorRole: marker.processorRole,
            source: marker.source,
            transition: marker.transition,
            resultCode: marker.resultCode,
            txid: marker.submittedTxid,
          }),
          ip: null,
        });
        const [updated] = await tx.update(groupBuyRefundTransitionOutboxTable).set({
          deliveredAt: new Date(),
        }).where(and(
          eq(groupBuyRefundTransitionOutboxTable.id, marker.id),
          isNull(groupBuyRefundTransitionOutboxTable.deliveredAt),
        )).returning();
        return Boolean(updated);
      });
    } catch {
      // The transaction rolls back, retaining the marker for retry.
      break;
    }
    if (!didDeliver) break;
    delivered += 1;
  }
  return delivered;
}

async function defaultSender(
  marker: RefundNotificationMarker,
  vars: Record<string, string>,
): Promise<NotificationDelivery> {
  return notifyUserFromTemplateFull(
    marker.accountId,
    REFUND_NOTIFICATION_PREF,
    marker.eventKey,
    vars,
  );
}

/**
 * Claim one pending marker under a short transaction, deliver outside the
 * transaction, and only then mark it sent. A provider failure clears the
 * lease and leaves the marker pending for a later drain.
 */
export async function drainRefundNotifications(
  database: DatabaseLike,
  options: RefundNotificationDrainOptions = {},
): Promise<number> {
  const limit = Number.isSafeInteger(options.limit) && (options.limit ?? 0) > 0 ? options.limit! : 100;
  const sender = options.sender ?? defaultSender;
  const nowFactory = options.now ?? (() => new Date());
  const tokenFactory = options.tokenFactory ?? randomUUID;
  let delivered = 0;
  for (let i = 0; i < limit; i += 1) {
    const marker = await database.transaction(async (tx: DatabaseLike) => {
      const now = nowFactory();
      const claimToken = tokenFactory();
      const leaseExpired = lt(
        groupBuyRefundNotificationsTable.claimedAt,
        new Date(now.getTime() - DELIVERY_LEASE_MS),
      );
      const [row] = await tx
        .select()
        .from(groupBuyRefundNotificationsTable)
        .where(and(
          isNull(groupBuyRefundNotificationsTable.sentAt),
          or(isNull(groupBuyRefundNotificationsTable.claimedAt), leaseExpired),
        ))
        .orderBy(asc(groupBuyRefundNotificationsTable.createdAt), asc(groupBuyRefundNotificationsTable.id))
        .limit(1)
        .for("update", { skipLocked: true });
      if (!row) return null;
      const [claimed] = await tx
        .update(groupBuyRefundNotificationsTable)
        .set({
          claimToken,
          claimedAt: now,
          attemptCount: Number(row.attemptCount ?? 0) + 1,
          lastError: null,
        })
        .where(and(
          eq(groupBuyRefundNotificationsTable.id, row.id),
          isNull(groupBuyRefundNotificationsTable.sentAt),
        ))
        .returning();
      return claimed ? claimed as RefundNotificationMarker : null;
    });
    if (!marker) break;

    let result: NotificationDelivery;
    try {
      result = await sender(marker, buildRefundNotificationVars(marker));
    } catch (error) {
      result = { ok: false, skipped: false };
      await clearClaim(
        database,
        marker.id,
        marker.claimToken ?? "",
        error instanceof Error ? error.message : "notification delivery failed",
      );
    }
    if (result.ok || result.skipped) {
      const [sent] = await database
        .update(groupBuyRefundNotificationsTable)
        .set({
          sentAt: nowFactory(),
          claimedAt: null,
          claimToken: null,
          lastError: result.skipped ? "skipped" : null,
        })
        .where(and(
          eq(groupBuyRefundNotificationsTable.id, marker.id),
          eq(groupBuyRefundNotificationsTable.claimToken, marker.claimToken ?? ""),
          isNull(groupBuyRefundNotificationsTable.sentAt),
        ))
        .returning();
      if (sent) delivered += 1;
    } else {
      await clearClaim(database, marker.id, marker.claimToken ?? "", "notification delivery failed");
    }
  }
  return delivered;
}

async function clearClaim(database: DatabaseLike, id: string, claimToken: string, error: string): Promise<void> {
  await database
    .update(groupBuyRefundNotificationsTable)
    .set({ claimedAt: null, claimToken: null, lastError: error.slice(0, 500) })
    .where(and(
      eq(groupBuyRefundNotificationsTable.id, id),
      eq(groupBuyRefundNotificationsTable.claimToken, claimToken),
      isNull(groupBuyRefundNotificationsTable.sentAt),
    ));
}

/**
 * Convenience API for callers that have already committed a state transition.
 * State transactions should use enqueueRefundNotification directly so a crash
 * between commit and this call is recoverable from the outbox.
 */
export async function notifyRefundTransition(
  database: DatabaseLike,
  input: RefundNotificationInput,
  options: { sender?: NotificationSender } = {},
): Promise<boolean> {
  const { inserted } = await enqueueRefundNotification(database, input);
  await drainRefundNotifications(database, { limit: 1, sender: options.sender });
  return inserted;
}

let scheduledDrainRunning = false;

/**
 * Register the small process-local scheduler used in production. The claim
 * lease provides cross-process safety; this flag prevents overlapping work in
 * one API process when a drain takes longer than its interval.
 */
export function startRefundNotificationDrain(
  database: DatabaseLike,
  intervalMs = 60_000,
  schedulerOptions: Omit<RefundNotificationDrainSchedulerOptions, "intervalMs"> = {},
): () => void {
  const drainAudits = schedulerOptions.drainAudits ?? drainRefundAudits;
  const drainNotifications = schedulerOptions.drainNotifications ?? drainRefundNotifications;
  const setIntervalFn = schedulerOptions.setIntervalFn ?? setInterval;
  const clearIntervalFn = schedulerOptions.clearIntervalFn ?? clearInterval;
  const run = async (): Promise<void> => {
    if (scheduledDrainRunning) return;
    scheduledDrainRunning = true;
    try {
      try {
        await drainAudits(database, { limit: 25 });
      } catch {
        // Audit outages must not suppress customer notification delivery.
      }
      try {
        await drainNotifications(database, { limit: 25 });
      } catch {
        // Notification outages must not suppress audit delivery or the next tick.
      }
    } finally {
      scheduledDrainRunning = false;
    }
  };
  const timer = setIntervalFn(run, Math.max(5_000, intervalMs));
  void run();
  return () => clearIntervalFn(timer);
}

export type RefundAuditInput = {
  refundId: string;
  orderId?: string | null;
  groupBuyId?: string | null;
  method?: string | null;
  accountId?: string | null;
  processorUsername?: string | null;
  processorRole?: string | null;
  source: "customer" | "admin" | "organiser" | "background";
  transition: string;
  resultCode: string;
  txid?: string | null;
  attemptId?: string | null;
  action?: string;
};

const SENSITIVE_AUDIT_KEYS = /wallet|private|secret|password|rpc|raw.?body|request.?body|key.?material/i;

function safeAuditMetadata(input: RefundAuditInput): Record<string, unknown> {
  const metadata: Record<string, unknown> = {
    refundId: input.refundId,
    ...(input.orderId ? { orderId: input.orderId } : {}),
    ...(input.groupBuyId ? { groupBuyId: input.groupBuyId } : {}),
    ...(input.accountId ? { accountId: input.accountId } : {}),
    ...(input.method ? { method: input.method } : {}),
    ...(input.processorUsername ? { processorUsername: input.processorUsername } : {}),
    ...(input.processorRole ? { processorRole: input.processorRole } : {}),
    source: input.source,
    transition: input.transition,
    resultCode: input.resultCode,
    ...(input.txid ? { txid: input.txid } : {}),
  };
  for (const key of Object.keys(metadata)) {
    if (SENSITIVE_AUDIT_KEYS.test(key)) delete metadata[key];
  }
  return metadata;
}

/** Enqueue one privacy-safe audit event. Delivery is performed by the drainer. */
export async function auditRefundTransition(
  database: DatabaseLike,
  input: RefundAuditInput,
): Promise<void> {
  await enqueueRefundAudit(database, {
    refundId: input.refundId,
    attemptId: input.attemptId ?? `audit:${input.transition}`,
    orderId: input.orderId ?? "",
    groupBuyId: input.groupBuyId ?? "",
    accountId: input.accountId ?? "",
    method: input.method ?? "unknown",
    processorUsername: input.processorUsername ?? "system",
    processorRole: input.processorRole ?? "system",
    source: input.source,
    transition: input.transition,
    action: input.action ?? `group_buy_refund_${input.transition}`,
    resultCode: input.resultCode,
    txid: input.txid,
  });
}