import { gbSupplierBatchesTable, ordersTable } from "@workspace/db";
import { and, eq, inArray, isNull, ne, sql } from "drizzle-orm";

export class BroadcastBatchFilterError extends Error { status = 400; }

export async function broadcastBatchOrderIds(database: any, groupBuyId: string, batchId: unknown): Promise<string[] | null> {
  if (batchId === undefined) return null;
  if (typeof batchId !== "string" || !batchId.trim() || batchId.length > 128) {
    throw new BroadcastBatchFilterError("Choose a valid supplier batch.");
  }
  const [batch] = await database.select({ state: gbSupplierBatchesTable.state, snapshot: gbSupplierBatchesTable.snapshot })
    .from(gbSupplierBatchesTable).where(and(
      eq(gbSupplierBatchesTable.id, batchId), eq(gbSupplierBatchesTable.groupBuyId, groupBuyId),
    )).limit(1);
  if (!batch || !["prepared", "ordered"].includes(batch.state)) {
    throw new BroadcastBatchFilterError("This batch is unavailable or released. Refresh and choose an active batch.");
  }
  if (!Array.isArray(batch.snapshot?.orders)) throw new BroadcastBatchFilterError("The selected batch has invalid allocations.");
  return [...new Set<string>(batch.snapshot.orders.map((order: any) => order.id).filter((id: unknown) => typeof id === "string" && id))];
}

/** Use current account ownership, not historical usernames stored in a snapshot. */
export async function broadcastBatchUsernames(database: any, groupBuyId: string, batchId: unknown): Promise<Set<string> | null> {
  const orderIds = await broadcastBatchOrderIds(database, groupBuyId, batchId);
  if (orderIds === null) return null;
  const rows = await database.select({ username: ordersTable.telegramUsername }).from(ordersTable).where(and(
    eq(ordersTable.groupBuyId, groupBuyId), isNull(ordersTable.deletedAt), ne(ordersTable.status, "Cancelled"),
    orderIds.length ? inArray(ordersTable.id, orderIds) : sql`false`,
  ));
  return new Set(rows.map((row: { username: string }) => row.username.replace(/^@/, "").toLowerCase()));
}
