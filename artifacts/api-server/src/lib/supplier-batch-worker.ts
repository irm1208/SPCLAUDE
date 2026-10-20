import { and, asc, eq, inArray, lte, sql } from "drizzle-orm";
import { db, gbSupplierSettingsTable as settings, gbSupplierEventsTable as events } from "@workspace/db";
import { reconcileSupplierGroup } from "./supplier-batches";
import { notifyUserFull } from "./telegram";
import { registerScheduler } from "./scheduler-registry";

let cursor = "", pending: ReturnType<typeof setTimeout> | null = null, running = false;
let lastFailure: string | null = null;
export async function reconcileSupplierBatches() {
  if (running) return;
  running = true;
  try {
    const rows = await db.select({ id: settings.groupBuyId }).from(settings)
      .where(and(sql`${settings.config}->>'enabled' = 'true'`, sql`${settings.groupBuyId} > ${cursor}`))
      .orderBy(asc(settings.groupBuyId)).limit(25);
    if (!rows.length) { cursor = ""; return; }
    const failures: string[] = [];
    for (const row of rows) {
      try {
        await reconcileSupplierGroup(row.id);
        await db.delete(events).where(eq(events.id, `supplier-reconcile-error:${row.id}`));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Reconciliation failed";
        failures.push(`${row.id}: ${message}`);
        await db.insert(events).values({id:`supplier-reconcile-error:${row.id}`,groupBuyId:row.id,kind:"reconciliation_failed",
          detail:{text:"Queue reconciliation failed. Counts may be stale; reload before preparing a batch."},lastError:message})
          .onConflictDoUpdate({target:events.id,set:{lastError:message,createdAt:new Date()}}).catch(e => console.error("[supplier-reconciliation:error-record]",e));
      }
      cursor = row.id;
    }
    if (rows.length < 25) cursor = "";
    lastFailure = failures.join("; ") || null;
    if (lastFailure) throw new Error(lastFailure);
  } finally { running = false; }
}
/** Coalesced server-driven hook; not dependent on opening a staff page. */
export function requestSupplierReconciliation() {
  if (pending) return;
  pending = setTimeout(() => {
    pending = null;
    void reconcileSupplierBatches().catch(e => { console.error("[supplier-batch reconcile]", e); });
  }, 250);
  pending.unref();
}
const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export async function drainSupplierAlerts() {
  const now = new Date();
  const rows = await db.select().from(events).where(and(inArray(events.telegram, ["pending", "retry", "sending"]), lte(events.availableAt, now))).orderBy(asc(events.availableAt)).limit(10);
  for (const row of rows) {
    const lease = new Date(Date.now() + 120_000);
    const [claimed] = await db.update(events).set({ telegram: "sending", availableAt: lease, attempts: row.attempts + 1 })
      // PostgreSQL default now() has microseconds; JS Date loses them. CAS on
      // the integer generation/state, not equality with a rounded timestamp.
      .where(and(eq(events.id, row.id), eq(events.telegram, row.telegram), lte(events.availableAt, now), eq(events.attempts, row.attempts))).returning();
    if (!claimed) continue;
    // Telegram has no idempotency token. An interrupted delivery is marked for
    // manual review rather than retried blindly and potentially duplicated.
    if (row.telegram === "sending") {
      await db.update(events).set({ telegram: "delivery_uncertain", lastError: "Delivery was interrupted. Check Telegram before retrying; no automatic duplicate sent." }).where(eq(events.id, row.id));
      continue;
    }
    try {
      const result = await notifyUserFull(row.recipient!, "status", escape(String((row.detail as any).text)), undefined,
        { eventKey: `supplier-ready:${row.id}`, websiteAlreadyRecorded: true });
      await db.update(events).set({
        telegram: result.ok ? "delivered" : result.skipped ? "skipped" : "retry",
        lastError: result.ok ? null : result.skipped ? "Telegram disabled by preferences, not linked, or unavailable. Website alert remains visible." : "Telegram delivery failed; retry scheduled.",
        availableAt: new Date(Date.now() + Math.min(3_600_000, 30_000 * 2 ** Math.min(row.attempts, 7))),
      }).where(and(eq(events.id, row.id), eq(events.availableAt, lease)));
    } catch (error) {
      await db.update(events).set({ telegram: "delivery_uncertain", lastError: error instanceof Error ? error.message : "Interrupted delivery—check Telegram." })
        .where(and(eq(events.id, row.id), eq(events.availableAt, lease)));
    }
  }
}
export function registerSupplierBatchScheduler() {
  registerScheduler({
    name: "supplier-batches", label: "Regional supplier batches",
    description: "Reconcile paid regional queues and deliver private organiser readiness alerts.",
    defaultIntervalMs: 30_000, minIntervalMs: 15_000, maxIntervalMs: 300_000, initialDelayMs: 20_000,
    run: async () => { await reconcileSupplierBatches(); await drainSupplierAlerts(); },
    channelStatus: () => ({ reconciliationError: lastFailure, reconciliationRunning: running }),
  });
}
