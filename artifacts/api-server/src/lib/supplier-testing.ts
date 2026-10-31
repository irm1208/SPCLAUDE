import { createHash } from "node:crypto";

export const testingUsername = (value: string) => value.trim().replace(/^@/, "").toLowerCase();
const supplierName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
export const isJbgSupplier = (vendor: { name: string }) => ["jbg", "jbgyt"].includes(supplierName(vendor.name));

export function eligibleTestingOrder(order: {
  telegramUsername: string; status: string; paymentStatus?: string | null; orderType?: string | null;
  groupBuyId?: string | null; deletedAt?: unknown; refundStatus?: string | null;
}, username: string) {
  return testingUsername(order.telegramUsername) === testingUsername(username)
    && ["Submitted", "Processing", "Shipped", "Completed"].includes(order.status)
    && !order.deletedAt && order.paymentStatus !== "refunded"
    && (!order.refundStatus || ["rejected", "cancelled"].includes(order.refundStatus.toLowerCase()))
    && (!!order.groupBuyId || ["wholesale", "wholesale_shared"].includes(order.orderType ?? ""));
}

export function resolveTestingSupplier<T extends { id: string; name: string }>(source: {
  vendorId?: string | null; productVendorId?: string | null; productVendor?: string | null; groupSupplier?: string | null;
}, vendors: T[]): T | null {
  let vendor: T | undefined;
  if (source.groupSupplier?.trim()) {
    const name = supplierName(source.groupSupplier);
    vendor = vendors.find(v => supplierName(v.name) === name || v.id === source.groupSupplier);
  } else if (source.vendorId || source.productVendorId) {
    vendor = vendors.find(v => v.id === (source.vendorId || source.productVendorId));
  } else if (source.productVendor) {
    const matches = vendors.filter(v => supplierName(v.name) === supplierName(source.productVendor!));
    if (matches.length === 1) vendor = matches[0];
  }
  return vendor && isJbgSupplier(vendor) ? vendor : null;
}

export function supplierTestingIdentity(...parts: string[]) {
  const identity = parts.length === 3 ? [parts[0], parts[1], parts[2].trim().toLowerCase()] : parts;
  return createHash("sha256").update(JSON.stringify(identity)).digest("hex");
}
