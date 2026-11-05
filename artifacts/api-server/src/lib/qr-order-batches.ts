import { gbSupplierBatchesTable } from "@workspace/db";
import { and, eq, ne } from "drizzle-orm";

/** QR-only viewers may see references and membership, never supplier snapshots or costs. */
export async function qrOrderBatches(database: any, groupBuyId: string, visibleOrderIds: string[]) {
  const rows = await database.select({
    id: gbSupplierBatchesTable.id,
    reference: gbSupplierBatchesTable.reference,
    state: gbSupplierBatchesTable.state,
    snapshot: gbSupplierBatchesTable.snapshot,
  }).from(gbSupplierBatchesTable).where(and(
    eq(gbSupplierBatchesTable.groupBuyId, groupBuyId),
    ne(gbSupplierBatchesTable.state, "released"),
  ));
  const visible = new Set(visibleOrderIds);
  // Current snapshots retain partial allocations; a primary order-to-batch pointer
  // alone would lose the second batch when one order is split.
  return rows.filter((batch: any) => batch.state !== "released").map((batch: any) => ({
    id: batch.id as string,
    reference: batch.reference as string,
    orderIds: [...new Set<string>((batch.snapshot?.orders ?? [])
      .filter((order: any) => visible.has(order.id) && order.items?.some((item: any) =>
        Number.isFinite(Number(item.quantity)) && Number(item.quantity) > 0))
      .map((order: any) => order.id))],
  })).sort((a: { reference: string }, b: { reference: string }) => a.reference.localeCompare(b.reference, undefined, { numeric: true }));
}
