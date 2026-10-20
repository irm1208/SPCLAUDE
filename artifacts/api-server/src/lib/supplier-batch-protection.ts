import { and, eq, inArray } from "drizzle-orm";
import { gbSupplierAllocationsTable, gbSupplierBatchesTable } from "@workspace/db";
import { SupplierBatchError } from "./supplier-batches-model";

/** Caller holds the existing half-kit money mutex, shared by batch preparation. */
export async function assertSupplierOrderEditable(tx: any, ids: string[]) {
  if (!ids.length) return;
  const assigned = await tx.select({ batchId: gbSupplierAllocationsTable.batchId }).from(gbSupplierAllocationsTable)
    .where(inArray(gbSupplierAllocationsTable.orderId, ids));
  if (!assigned.length) return;
  const [row] = await tx.select({ reference: gbSupplierBatchesTable.reference, state: gbSupplierBatchesTable.state })
    .from(gbSupplierBatchesTable)
    .where(and(inArray(gbSupplierBatchesTable.id, assigned.map((a: any) => a.batchId)), inArray(gbSupplierBatchesTable.state, ["prepared", "ordered"]))).limit(1);
  if (row) throw new SupplierBatchError(`This order belongs to supplier batch ${row.reference}. ${
    row.state === "prepared" ? "Release the unsent batch in Supplier batches before changing products, destination or charges."
      : "It has already been ordered from the supplier. Contact Admin to resolve the exception; do not change the purchased items."
  }`);
}
