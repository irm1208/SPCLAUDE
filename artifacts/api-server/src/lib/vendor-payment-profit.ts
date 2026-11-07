import { centsToUsdString, usdToCents } from "./refund-money";
import { paymentOrderDetail, supplierCostsValid } from "./vendor-payment-ledger";

const definition = "Customer product sales for this supplier minus submitted supplier product costs. Before shipping, order-level discounts, credits, fees, tax and overheads; not net profit.";

/** Admin-only estimate. Never allocate an entire mixed/shared customer order to each supplier. */
export function vendorProductProfit(row: any, source: any, stale: boolean) {
  const detail = paymentOrderDetail(row);
  const result = {
    currency: "USD" as const, basis: "product_gross" as const,
    salesUsd: null as string | null, supplierProductsUsd: detail.productCost,
    amountUsd: null as string | null, reason: null as string | null, definition,
  };
  if (stale || !source || source.fingerprint !== row.sourceFingerprint) {
    result.reason = "Current order does not match the supplier submission. Review and resubmit before estimating profit.";
    return result;
  }
  if (!Array.isArray(source.vendorIds) || source.vendorIds.length !== 1 || source.vendorIds[0] !== row.vendorId
    || !Array.isArray(source.items) || !source.items.length || source.items.some((item: any) => item.vendorId !== row.vendorId)) {
    result.reason = "Product sales cannot be attributed to this supplier reliably.";
    return result;
  }
  if (!supplierCostsValid(detail)) {
    result.reason = "Submitted supplier costs are unavailable or inconsistent.";
    return result;
  }
  try {
    const sales = source.items.reduce((sum: bigint, item: any) => sum + usdToCents(item.lineTotal), 0n);
    const profit = sales - usdToCents(detail.productCost!);
    result.salesUsd = centsToUsdString(sales);
    result.amountUsd = profit < 0n ? `-${centsToUsdString(-profit)}` : centsToUsdString(profit);
  } catch {
    result.reason = "Customer product sales are unavailable. No profit has been assumed.";
  }
  return result;
}
