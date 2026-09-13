import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { groupBuyRefundsTable, ordersTable } from "@workspace/db";

/**
 * A refund in one of these states owns the order while its financial
 * transition is in progress.  `completed` is intentionally absent: the
 * existing completed/refunded checks still protect the terminal transition.
 */
export const ACTIVE_REFUND_STATUSES = [
  "requested",
  "verifying",
  "verification_failed",
] as const;

export type ActiveRefundStatus = typeof ACTIVE_REFUND_STATUSES[number];

export const REFUND_MUTATION_BLOCKED_CODE = "refund_active" as const;

export class RefundMutationBlockedError extends Error {
  readonly code = REFUND_MUTATION_BLOCKED_CODE;
  readonly orderId: string;

  constructor(orderId: string) {
    super("Order mutation is blocked while a refund is active.");
    this.name = "RefundMutationBlockedError";
    this.orderId = orderId;
  }
}

/**
 * Add this expression to the same conditional UPDATE/DELETE that mutates an
 * order.  Unlike a read-then-write check, PostgreSQL evaluates NOT EXISTS
 * atomically with the write and therefore closes the refund/mutation race.
 */
export function refundMutationPredicate(orderColumn = ordersTable.id) {
  return sql`NOT EXISTS (
    SELECT 1
    FROM ${groupBuyRefundsTable} AS refund_mutation_guard
    WHERE refund_mutation_guard.order_id = ${orderColumn}
      AND refund_mutation_guard.status IN ('requested', 'verifying', 'verification_failed')
  )`;
}

/**
 * Compose the race-safe predicate with an existing order mutation predicate.
 * Callers use this directly in UPDATE/DELETE WHERE clauses, rather than doing
 * a guard read outside the write transaction.
 */
export function refundMutableOrderWhere(
  predicate: unknown,
  orderColumn: any = ordersTable.id,
) {
  return and(refundMutationPredicate(orderColumn), predicate as any);
}

/** Alias kept descriptive for callers that build larger conditional predicates. */
export const noActiveRefundPredicate = refundMutationPredicate;
export const refundActivePredicate = refundMutationPredicate;

type GuardDatabase = {
  select: (selection?: unknown) => any;
};

/**
 * Check one order after authorization and before a mutation.  Mutation paths
 * that can express a conditional UPDATE should also include
 * `refundMutationPredicate()` in that UPDATE's WHERE clause.
 */
export async function assertNoActiveRefund(
  database: GuardDatabase,
  orderId: string,
): Promise<void> {
  const normalizedOrderId = String(orderId ?? "").trim();
  if (!normalizedOrderId) return;

  const activeRefunds = await database
    .select({
      id: groupBuyRefundsTable.id,
      orderId: groupBuyRefundsTable.orderId,
      status: groupBuyRefundsTable.status,
    })
    .from(groupBuyRefundsTable)
    .where(and(
      eq(groupBuyRefundsTable.orderId, normalizedOrderId),
      inArray(groupBuyRefundsTable.status, [...ACTIVE_REFUND_STATUSES]),
    ))
    .orderBy(asc(groupBuyRefundsTable.id))
    .for("update");

  if (activeRefunds.length > 0) {
    throw new RefundMutationBlockedError(normalizedOrderId);
  }
}

/**
 * Lock every order in sorted order, then inspect all refund rows before any
 * caller performs its writes.  The first active order is deterministic and a
 * thrown error makes the caller's transaction reject the entire batch.
 */
export async function assertNoActiveRefunds(
  database: GuardDatabase,
  orderIds: readonly string[],
): Promise<void> {
  const normalizedOrderIds = [...new Set(orderIds
    .map(orderId => String(orderId ?? "").trim())
    .filter(Boolean))].sort();
  if (normalizedOrderIds.length === 0) return;

  await database
    .select({ id: ordersTable.id })
    .from(ordersTable)
    .where(inArray(ordersTable.id, normalizedOrderIds))
    .orderBy(asc(ordersTable.id))
    .for("update");

  const activeRefunds = await database
    .select({
      id: groupBuyRefundsTable.id,
      orderId: groupBuyRefundsTable.orderId,
      status: groupBuyRefundsTable.status,
    })
    .from(groupBuyRefundsTable)
    .where(and(
      inArray(groupBuyRefundsTable.orderId, normalizedOrderIds),
      inArray(groupBuyRefundsTable.status, [...ACTIVE_REFUND_STATUSES]),
    ))
    .orderBy(asc(groupBuyRefundsTable.orderId), asc(groupBuyRefundsTable.id))
    .for("update");

  const blockedOrderId = activeRefunds[0]?.orderId;
  if (blockedOrderId) throw new RefundMutationBlockedError(blockedOrderId);
}

/** Convenient singular/plural spelling for route and service call sites. */
export const assertNoActiveRefundForOrder = assertNoActiveRefund;
export const assertNoActiveRefundForOrders = assertNoActiveRefunds;
export const assertRefundMutationAllowed = assertNoActiveRefund;
export const assertRefundMutationsAllowed = assertNoActiveRefunds;