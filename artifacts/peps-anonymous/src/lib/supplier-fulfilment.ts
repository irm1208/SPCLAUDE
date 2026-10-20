export type FulfilmentScope = "admin" | "organiser" | "reshipper";
export interface ShipmentLine { orderId: string; productId: string; productName: string; code: string; username: string; quantity: number }
export interface ReceiptLine { orderId: string; productId: string; good: number; damaged: number }
export interface SupplierShipment {
  id: string; batchId: string; version: number; label: string; recipientUsername: string | null;
  directOrderId: string | null; carrier: number; trackingNumber: string | null; trackingParams: Record<string, string>;
  trackingStatus: string; trackingEvents: { date: string; status: string; location?: string }[];
  lastChecked: string | null; contents: ShipmentLine[]; receipt: ReceiptLine[]; receiptChecked: boolean;
  notes: string | null; receiptNotes: string | null; cancelledAt: string | null; cancelReason: string | null;
  createdAt: string; updatedAt: string; canReceive: boolean;
}
export interface FulfilmentBatchSummary {
  id: string; reference: string; region: string; state: string; kits: number; orderCount: number;
  shipmentCount: number; untracked: number; allocatedKits: number; receivedKits: number; damagedKits: number;
  missingKits: number; outstandingOrders: number; exceptionCount: number;
}
export interface FulfilmentOrder {
  id: string; code: string; username: string; country: string; status: string; route: string;
  reshipperUsername: string | null; direct: boolean; ready: boolean;
  items: { productId: string; productName: string; quantity: number; allocated: number; received: number; damaged: number }[];
  exceptions: string[];
}
export interface FulfilmentOverview {
  groupBuy: { id: string; name: string }; canManage: boolean;
  batches: FulfilmentBatchSummary[]; nextCursor: number | null;
}
export interface FulfilmentDetail {
  groupBuy: { id: string; name: string }; canManage: boolean; batch: FulfilmentBatchSummary;
  orders: FulfilmentOrder[]; shipments: SupplierShipment[]; recipients: string[];
  history: { id: string; kind: string; createdAt: string; detail: { actor?: string; shipmentId?: string; label?: string; reason?: string; [key: string]: unknown } }[];
}
export const fulfilmentKey = (scope: FulfilmentScope, id: string, batchId?: string) => ["supplier-fulfilment", scope, id, batchId ?? "overview"];
export function fulfilmentUrl(scope: FulfilmentScope, id: string) {
  const root = scope === "reshipper" ? `/api/reshipper/gb/${encodeURIComponent(id)}` : `/api/${scope}/group-buys/${encodeURIComponent(id)}`;
  return `${root}/supplier-fulfilment`;
}
export async function fulfilmentRequest<T>(scope: FulfilmentScope, id: string, suffix = "", body?: unknown, headers?: Record<string, string>, method = "POST"): Promise<T> {
  const response = await fetch(fulfilmentUrl(scope, id) + suffix, {
    credentials: "include", method: body === undefined ? "GET" : method,
    headers: { ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.error ?? "Could not update supplier fulfilment."), { status: response.status });
  return data;
}
export async function downloadPackingManifest(scope: FulfilmentScope, id: string, batchId: string, headers?: Record<string, string>) {
  const response = await fetch(`${fulfilmentUrl(scope, id)}/${encodeURIComponent(batchId)}/manifest`, { credentials: "include", headers });
  if (!response.ok) throw new Error((await response.json()).error ?? "Manifest unavailable.");
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a"); link.href = url; link.download = `batch-${batchId}-packing.csv`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
