export const EU_BATCH_COUNTRIES = "AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE".split(" ");
export type SupplierScope = "admin" | "organiser";
export interface BatchRegion { id: string; name: string; countries: string[]; targetKits: number }
export interface BatchConfig { enabled: boolean; telegramAlerts: boolean; showToMembers?: boolean; regions: BatchRegion[] }
export interface BatchItem { productId: string; productName: string; quantity: number; unitPrice: string; lineTotal: string }
export interface BatchOrder { id: string; code: string; username: string; country: string; kits: number; paidAt: string | null; orderingAt: string; historicalReviewed: boolean; items: BatchItem[] }
export interface BatchProposal { region: BatchRegion; token: string; orders: BatchOrder[]; kits: number; queuedKits: number; remainingKits: number; ready: boolean; readyAt: string | null; products: {productId: string; productName: string; quantity: number}[] }
export interface SupplierBatch { id: string; reference: string; state: "prepared" | "ordered" | "released"; createdAt: string; createdBy: string; orderedAt: string | null; releasedAt: string | null; releaseReason: string | null; snapshot: BatchProposal; exceptions: {orderId: string; code: string; reason: string}[] }
export interface SupplierData {
  groupBuy: {id: string; name: string}; config: BatchConfig; version: number; checkedAt: string | null;
  proposals: BatchProposal[]; batches: SupplierBatch[];
  review: {id: string; code: string; username: string; country: string; reason: string; canReviewHistorical: boolean}[];
  events: {id: string; kind: string; createdAt: string; telegram: string; lastError: string | null; detail: any}[];
}
export const supplierKey = (scope: SupplierScope, id: string) => ["supplier-batches", scope, id] as const;
export const supplierUrl = (scope: SupplierScope, id: string) => `/api/${scope}/group-buys/${encodeURIComponent(id)}/supplier-batches`;
export async function supplierRequest<T = SupplierData>(scope: SupplierScope, id: string, suffix = "", body?: unknown, method = "POST", headers?: Record<string, string>): Promise<T> {
  const res = await fetch(supplierUrl(scope, id) + suffix, {
    credentials: "include", method: body === undefined ? "GET" : method,
    headers: { ...(body === undefined ? {} : {"Content-Type": "application/json"}), ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.error ?? "Could not complete supplier batch request."), {status: res.status});
  return data;
}
export async function downloadSupplierCsv(scope: SupplierScope, id: string, batchId: string, headers?: Record<string, string>) {
  const res = await fetch(`${supplierUrl(scope, id)}/${encodeURIComponent(batchId)}/export`, { credentials: "include", headers });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Export is unavailable."); }
  const url = URL.createObjectURL(await res.blob()); const a = document.createElement("a");
  a.href = url; a.download = `supplier-batch-${batchId}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
