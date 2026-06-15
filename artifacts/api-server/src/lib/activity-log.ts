import { db } from "@workspace/db";
import { customerActivityLogsTable } from "@workspace/db";
import { randomUUID } from "crypto";

export type ActorType = "customer" | "admin" | "system";

export interface ActivityEvent {
  telegramUsername: string;
  eventCategory: string;
  eventType: string;
  entityId?: string | null;
  actorUsername?: string | null;
  actorType?: ActorType;
  metadata?: Record<string, unknown> | null;
}

/**
 * Build the row to insert — deterministic, no side effects.
 */
function buildRow(event: ActivityEvent) {
  return {
    id: randomUUID(),
    telegramUsername: event.telegramUsername,
    eventCategory: event.eventCategory,
    eventType: event.eventType,
    entityId: event.entityId ?? null,
    actorUsername: event.actorUsername ?? null,
    actorType: event.actorType ?? "customer",
    metadata: event.metadata ?? null,
  };
}

/**
 * Returns true if the error is a PostgreSQL FK violation (23503).
 * These happen when the customer doesn't have a registered account yet
 * and are expected — we silently skip rather than retry.
 */
function isFkViolation(err: unknown): boolean {
  if (err && typeof err === "object" && "cause" in err) {
    const cause = (err as { cause?: unknown }).cause;
    if (cause && typeof cause === "object" && "code" in cause) {
      return (cause as { code?: string }).code === "23503";
    }
  }
  // Also handle raw pg errors surfaced directly
  if (err && typeof err === "object" && "code" in err) {
    return (err as { code?: string }).code === "23503";
  }
  return false;
}

/**
 * Write an activity log entry.
 * Retries once after 200 ms on transient failure then throws.
 * FK constraint violations (customer has no account) are silently dropped.
 * Callers should decide whether to await (required events) or fire-and-forget (best-effort).
 */
export async function logCustomerActivity(event: ActivityEvent): Promise<void> {
  const row = buildRow(event);

  try {
    await db.insert(customerActivityLogsTable).values(row);
  } catch (firstErr) {
    // FK violation: customer hasn't registered an account — skip silently, no retry
    if (isFkViolation(firstErr)) {
      return;
    }

    // Single retry after 200 ms for transient DB connection issues
    await new Promise(r => setTimeout(r, 200));
    try {
      await db.insert(customerActivityLogsTable).values({ ...row, id: randomUUID() });
    } catch (retryErr) {
      if (isFkViolation(retryErr)) {
        return;
      }
      console.error("[activity-log] DROPPED EVENT after retry:", {
        eventType: event.eventType,
        telegramUsername: event.telegramUsername,
        entityId: event.entityId,
        err: String(retryErr),
      });
      throw retryErr; // Re-throw so callers that await can handle / fail the request
    }
  }
}
