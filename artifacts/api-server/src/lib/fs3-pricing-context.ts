import { db, productsTable, wholesaleSharesTable, groupBuysTable, fs3CostsTable } from "@workspace/db";
import { inArray } from "drizzle-orm";
import { resolveFs3ProductCost, resolveFs3SupplierId } from "@workspace/api-zod/fs3-costs";
import { loadFs3CostMatches } from "./fs3-cost-matches";
import { getVendors } from "../routes/config";

interface Order {
  id: string; wholesaleVendorId?: string | null; sharedOrderId?: string | null; groupBuyId?: string | null;
}
interface Line { orderId: string; productId?: string | null; productName: string; vendorId?: string | null; }
/** One supplier identity and pricing path for FS3 summaries, P&L and batch sheets. */
export async function loadFs3PricingContext(orders: Order[], lines: Line[], tx: any = db, includeCosts = true) {
  const productIds = [...new Set(lines.map(l => l.productId).filter((id): id is string => !!id))];
  const shareIds = [...new Set(orders.map(o => o.sharedOrderId).filter((id): id is string => !!id))];
  const gbIds = [...new Set(orders.map(o => o.groupBuyId).filter((id): id is string => !!id))];
  const [products, shares, groups, vendors, costs, matches] = await Promise.all([
    productIds.length ? tx.select().from(productsTable).where(inArray(productsTable.id, productIds)) : [],
    shareIds.length ? tx.select({ id: wholesaleSharesTable.id, vendorId: wholesaleSharesTable.vendorId })
      .from(wholesaleSharesTable).where(inArray(wholesaleSharesTable.id, shareIds)) : [],
    gbIds.length ? tx.select({ id: groupBuysTable.id, manufacturer: groupBuysTable.manufacturer })
      .from(groupBuysTable).where(inArray(groupBuysTable.id, gbIds)) : [],
    getVendors(), includeCosts ? tx.select().from(fs3CostsTable) : [], includeCosts ? loadFs3CostMatches(tx) : [],
  ]);
  const productRows = products as (typeof productsTable.$inferSelect)[];
  const productMap = new Map(productRows.map(p => [p.id, p]));
  const orderMap = new Map(orders.map(o => [o.id, o]));
  const shareMap = new Map<string, string | null>(shares.map((s: any) => [s.id, s.vendorId]));
  const gbMap = new Map<string, string | null>(groups.map((g: any) => [g.id, g.manufacturer]));
  function vendorIdFor(line: Line) {
    const order = orderMap.get(line.orderId);
    return resolveFs3SupplierId({
      vendorId: line.vendorId, shareVendorId: order?.sharedOrderId ? shareMap.get(order.sharedOrderId) : null,
      wholesaleVendorId: order?.wholesaleVendorId,
      legacyVendor: order?.groupBuyId ? gbMap.get(order.groupBuyId) : null,
    }, productMap.get(line.productId ?? "") ?? {}, vendors);
  }
  const vendorNamesById = new Map(vendors.map(v => [v.id, v.name]));
  const linesByOrder = new Map<string, Line[]>();
  for (const line of lines) {
    const orderLines = linesByOrder.get(line.orderId) ?? [];
    orderLines.push(line);
    linesByOrder.set(line.orderId, orderLines);
  }
  function vendorNamesFor(orderId: string): string[] {
    const order = orderMap.get(orderId);
    const orderLines = linesByOrder.get(orderId) ?? [];
    const displayLines: Line[] = orderLines.length ? orderLines : [{ orderId, productName: "" }];
    const names = displayLines.map(line => {
      const vendorId = vendorIdFor(line);
      const configuredName = vendorId ? vendorNamesById.get(vendorId) : null;
      if (configuredName) return configuredName;
      // Keep historical labels, but never substitute a product's supplier for
      // a different, explicitly assigned supplier that no longer exists.
      if (!vendorId || vendorId.startsWith("unresolved:")) {
        return productMap.get(line.productId ?? "")?.vendor?.trim()
          || (order?.groupBuyId ? gbMap.get(order.groupBuyId)?.trim() : null)
          || "Unknown";
      }
      return "Unknown";
    });
    return [...new Set(names)].sort((a, b) => a.localeCompare(b));
  }
  function unitCostFor(line: Line) {
    return resolveFs3ProductCost(productMap.get(line.productId ?? ""), costs, matches, line.productName, vendorIdFor(line));
  }
  return { products: productRows, vendors, vendorIdFor, vendorNamesFor, unitCostFor };
}
