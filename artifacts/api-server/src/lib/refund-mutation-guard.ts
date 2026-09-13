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
const REFUND_MUTATION_DATABASE_ERROR_PREFIX = "refund_active:";

export const activeRefundStatusesSql = ACTIVE_REFUND_STATUSES
  .map(status => sql`${status}`)
  .reduce((combined, status, index) => index === 0 ? status : sql`${combined}, ${status}`);

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
 * The conditional guard is also used by a few low-level/background writers
 * which intentionally do not consume UPDATE ... RETURNING rows.  A false
 * predicate must never turn into a successful no-op for those callers:
 * force PostgreSQL to abort the statement with an identifiable error.  The
 * API error middleware converts that error to the same 409 used by the
 * returning/assertion paths.  The NOT EXISTS remains the actual atomic
 * authorization predicate; the cast is only the fail-closed branch.
 */
export function refundMutationDatabaseErrorOrderId(error: unknown): string | null {
  const candidate = error as { code?: unknown; message?: unknown } | null;
  if (candidate?.code !== "22P02" || typeof candidate.message !== "string") return null;
  // This is deliberately stricter than "any 22P02 containing the token":
  // only the exact invalid-integer shape emitted by refundMutationPredicate
  // is an authorization conflict.  Other PostgreSQL input errors retain their
  // existing route/global status.
  const match = candidate.message.match(
    /invalid input syntax for type integer:\s*"refund_active:([^"]+)"/,
  );
  return match?.[1] ?? null;
}

/**
 * Normalize both the explicit assertion error and the fail-closed database
 * error. Route-local catches must use this rather than only checking the
 * assertion class, otherwise a guarded no-RETURNING mutation can be exposed
 * as a generic 400/500 response instead of the refund 409.
 */
export function refundMutationErrorOrderId(error: unknown): string | null {
  if (error instanceof RefundMutationBlockedError) return error.orderId;
  return refundMutationDatabaseErrorOrderId(error);
}

export function refundMutationConflictResponse(error: unknown): {
  status: 409;
  body: { error: string; code: typeof REFUND_MUTATION_BLOCKED_CODE; orderId: string };
} | null {
  const orderId = refundMutationErrorOrderId(error);
  if (!orderId) return null;
  return {
    status: 409,
    body: {
      error: "Order mutation is blocked while a refund is active.",
      code: REFUND_MUTATION_BLOCKED_CODE,
      orderId,
    },
  };
}

export function refundMutationHttpStatus(error: unknown): number | null {
  if (refundMutationErrorOrderId(error)) return 409;
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === "number" ? status : null;
}

/**
 * Add this expression to the same conditional UPDATE/DELETE that mutates an
 * order.  Unlike a read-then-write check, PostgreSQL evaluates NOT EXISTS
 * atomically with the write and therefore closes the refund/mutation race.
 */
export function refundMutationPredicate(orderColumn = ordersTable.id) {
  return sql`CASE WHEN NOT EXISTS (
    SELECT 1
    FROM ${groupBuyRefundsTable} AS refund_mutation_guard
    WHERE refund_mutation_guard.order_id = ${orderColumn}
      AND refund_mutation_guard.status IN (${activeRefundStatusesSql})
  ) THEN TRUE ELSE CAST(CONCAT('${REFUND_MUTATION_DATABASE_ERROR_PREFIX}', ${orderColumn}) AS integer) = 1 END`;
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
  [key: string]: any;
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

/**
 * Transaction boundary for bulk order mutations.  The lock/check is inside
 * the same transaction as the callback, so a blocked order cannot leave a
 * partially updated subset behind.
 */
export async function withRefundMutationGuard<T>(
  database: GuardDatabase & {
    transaction: <R>(callback: (tx: GuardDatabase) => Promise<R>) => Promise<R>;
  },
  orderIds: readonly string[],
  mutate: (tx: GuardDatabase) => Promise<T>,
): Promise<T> {
  // Production Drizzle databases always expose transaction().  Lightweight
  // route adapters used by callers/tests may not; keep their behavior
  // deterministic while preserving the real transaction path above.
  if (typeof database.transaction !== "function") {
    return mutate(database);
  }
  return database.transaction(async tx => {
    await assertNoActiveRefunds(tx, orderIds);
    return mutate(tx);
  });
}

/** Convenient singular/plural spelling for route and service call sites. */
export const assertNoActiveRefundForOrder = assertNoActiveRefund;
export const assertNoActiveRefundForOrders = assertNoActiveRefunds;
export const assertRefundMutationAllowed = assertNoActiveRefund;
export const assertRefundMutationsAllowed = assertNoActiveRefunds;