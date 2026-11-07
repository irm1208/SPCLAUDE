import { siteConfigTable } from "@workspace/db";
import { inArray } from "drizzle-orm";

export const receiptDispatchKey = (id: string) => `supplier-receipt-dispatch:${id}`;
export interface ReceiptDispatch {
  source: "supplier_receipts"; groupBuyId: string; orderIds: string[];
  trackingNumber: string | null;
}
/** Internal inventory provenance, never a payment record or a client assertion. */
export async function receiptDispatches(store: any, ids: string[]): Promise<Map<string, ReceiptDispatch>> {
  if (!ids.length) return new Map();
  const rows = await store.select().from(siteConfigTable).where(inArray(siteConfigTable.key, ids.map(receiptDispatchKey)));
  const result = new Map<string, ReceiptDispatch>();
  for (const r of rows) {
    const value = JSON.parse(r.value ?? "null");
    if (!value || value.source !== "supplier_receipts" || !Array.isArray(value.orderIds)
      || !value.orderIds.every((id: unknown) => typeof id === "string") || typeof value.groupBuyId !== "string") {
      throw new Error("Invalid supplier receipt dispatch record; staff review required.");
    }
    const id = r.key.slice("supplier-receipt-dispatch:".length);
    if (!value.orderIds.includes(id)) throw new Error("Supplier dispatch membership is inconsistent.");
    result.set(id, value);
  }
  return result;
}
export async function recordReceiptDispatch(store: any, data: ReceiptDispatch) {
  const value = JSON.stringify(data);
  for (const id of data.orderIds) {
    await store.insert(siteConfigTable).values({ key: receiptDispatchKey(id), value })
      .onConflictDoUpdate({ target: siteConfigTable.key, set: { value } });
  }
}
export async function clearReceiptDispatch(store: any, ids: string[]) {
  if (ids.length) await store.delete(siteConfigTable).where(inArray(siteConfigTable.key, ids.map(receiptDispatchKey)));
}
