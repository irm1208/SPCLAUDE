/**
 * Automatically closes group buys when their close date is reached.
 * Registered with the scheduler registry so the interval and enabled
 * state are editable from the admin panel.
 */
import { db, groupBuysTable } from "@workspace/db";
import { and, eq, lte, isNotNull } from "drizzle-orm";
import { registerScheduler } from "./scheduler-registry";

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000; // every hour

async function runGbAutoClose(): Promise<void> {
  const now = new Date();
  const due = await db
    .select({ id: groupBuysTable.id, name: groupBuysTable.name })
    .from(groupBuysTable)
    .where(
      and(
        eq(groupBuysTable.status, "active"),
        isNotNull(groupBuysTable.closeDate),
        lte(groupBuysTable.closeDate, now),
      ),
    );

  if (due.length === 0) return;

  for (const gb of due) {
    await db
      .update(groupBuysTable)
      .set({ status: "closed" })
      .where(eq(groupBuysTable.id, gb.id));
    console.log(`[gb-auto-close] Closed GB "${gb.name}" (${gb.id})`);
  }
  console.log(`[gb-auto-close] Closed ${due.length} group buy(s).`);
}

export function startGbAutoClose(): void {
  registerScheduler({
    name: "gb-auto-close",
    label: "Group buy auto-close",
    description: "Closes active group buys whose close date has passed.",
    defaultIntervalMs: DEFAULT_INTERVAL_MS,
    minIntervalMs: 60_000,
    maxIntervalMs: 24 * 60 * 60 * 1000,
    initialDelayMs: 30_000,
    run: runGbAutoClose,
  });
}
