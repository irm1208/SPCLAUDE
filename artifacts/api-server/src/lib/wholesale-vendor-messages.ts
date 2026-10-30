import { db, siteConfigTable } from "@workspace/db";
import { inArray } from "drizzle-orm";

export const wholesaleVendorMessageKey = (vendorId: string) => `wholesale_vendor_message:${vendorId}`;

export async function getWholesaleVendorMessages(vendorIds: string[]): Promise<Map<string, string>> {
  if (!vendorIds.length) return new Map();
  const rows = await db.select({ key: siteConfigTable.key, value: siteConfigTable.value })
    .from(siteConfigTable).where(inArray(siteConfigTable.key, vendorIds.map(wholesaleVendorMessageKey)));
  const byKey = new Map(rows.map(row => [row.key, row.value ?? ""]));
  return new Map(vendorIds.map(id => [id, byKey.get(wholesaleVendorMessageKey(id)) ?? ""]));
}
