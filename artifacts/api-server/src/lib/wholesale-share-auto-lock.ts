/**
 * Automatically locks open wholesale shared orders once their organiser-set
 * deadline has passed — but only when the order is actually ready to lock (enough
 * members, a delivery recipient with a full address, every member within the kit
 * rules, etc.). Not-ready orders stay open so members can finish; the organiser can
 * extend the deadline or cancel. Registered with the scheduler registry so the
 * interval and enabled state are editable from the admin panel. The same
 * attemptLockShare() service powers the manual lock and the GET lazy-lock backup.
 */
import { db, wholesaleSharesTable } from "@workspace/db";
import { and, eq, lte, isNotNull } from "drizzle-orm";
import { registerScheduler } from "./scheduler-registry";
import { attemptLockShare } from "../routes/wholesale-shares";

const DEFAULT_INTERVAL_MS = 60 * 1000; // every minute

async function runWholesaleShareAutoLock(): Promise<void> {
  const now = new Date();
  const due = await db
    .select()
    .from(wholesaleSharesTable)
    .where(
      and(
        eq(wholesaleSharesTable.status, "open"),
        isNotNull(wholesaleSharesTable.lockDeadline),
        lte(wholesaleSharesTable.lockDeadline, now),
      ),
    );

  if (due.length === 0) return;

  let locked = 0;
  for (const share of due) {
    // Validation failures (not yet ready) are expected and intentionally silent —
    // don't spam the audit log; the share simply stays open until next tick.
    const result = await attemptLockShare(share, share.creatorUsername, "auto");
    if (result.ok) locked++;
  }
  if (locked > 0) {
    console.log(`[wholesale-share-auto-lock] Locked ${locked} of ${due.length} due share(s).`);
  }
}

export function startWholesaleShareAutoLock(): void {
  registerScheduler({
    name: "wholesale-share-auto-lock",
    label: "Wholesale share auto-lock",
    description: "Locks open wholesale shared orders whose deadline has passed (when ready).",
    defaultIntervalMs: DEFAULT_INTERVAL_MS,
    minIntervalMs: 30_000,
    maxIntervalMs: 60 * 60 * 1000,
    initialDelayMs: 30_000,
    run: runWholesaleShareAutoLock,
  });
}
