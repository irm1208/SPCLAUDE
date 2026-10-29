import type { VendorSnapshot } from "@workspace/db";
import { centsToUsdString, usdToCents } from "./refund-money";
import { calcPackageShipping, pickRegionForCountry, type ShippingVendor } from "./wholesale-shipping";

/** Admin-only TXT metadata; never persisted into vendor-portal snapshots. */
export function supplierTextDetails(username: string, snapshot: VendorSnapshot, vendor: ShippingVendor) {
  const region = pickRegionForCountry(vendor, snapshot.shipping.country);
  const maxPackage = vendor.maxKitsPerPackage ?? 25;
  const prices: number[] = [];
  let remaining = snapshot.items.reduce((sum, item) => sum + item.quantity, 0);
  if (region && Number.isFinite(remaining) && Number.isFinite(maxPackage) && maxPackage > 0) {
    while (remaining > 0) {
      const kits = Math.min(remaining, maxPackage);
      const price = calcPackageShipping(vendor, region.region, kits);
      if (price === null || !Number.isFinite(price) || price < 0) { prices.length = 0; break; }
      prices.push(price);
      remaining -= kits;
    }
  }
  let exportPackageLine = `Package: $${snapshot.shippingCost}`;
  // Historical snapshots can predate today's rates. Never change their totals
  // or invent a breakdown when the current rate table doesn't explain them.
  const total = prices.reduce((sum, price) => sum + usdToCents(price.toFixed(2)), 0n);
  if (prices.length && total === usdToCents(snapshot.shippingCost)) {
    const description = prices.every(price => price === prices[0])
      ? `${prices.length} x $${prices[0].toFixed(2)}`
      : prices.map(price => `$${price.toFixed(2)}`).join(" + ");
    exportPackageLine = `Package: ${description} = $${snapshot.shippingCost}`;
  }
  return { exportUsername: username, exportPackageLine };
}
export function vendorSupplierCsv(shipments:Array<{reference:string;snapshot:VendorSnapshot}>,vendorName:string) {
  const escape=(v:unknown)=>`"${String(v).replace(/"/g,'""')}"`;
  const rows:unknown[][]=[["Vendor","Order","Product","Quantity","Unit cost USD","Line cost USD"]];
  for (const s of shipments) {
    for (const i of s.snapshot.items) rows.push([vendorName,s.reference,i.productName,i.quantity,i.unitCost,i.lineTotal]);
    rows.push([vendorName,s.reference,"Vendor shipping","","",s.snapshot.shippingCost]);
    rows.push([vendorName,s.reference,"Grand total","","",s.snapshot.totalCost]);
  }
  return rows.map(row=>row.map(escape).join(",")).join("\r\n");
}
export function vendorSupplierText(shipments: Array<{reference:string; vendorId:string; snapshot:VendorSnapshot; exportUsername?:string; exportPackageLine?:string}>, _vendorName: string) {
  if (!shipments.length) return "";
  const blocks = shipments.map((s, index) => [
    `Order no. ${s.reference}${s.exportUsername ? ` (@${s.exportUsername.replace(/^@+/, "")})` : ""}`, `New Order ${index + 1}:`, "",
    ...s.snapshot.items.map(i => `${i.productName} x${i.quantity} = $${i.lineTotal}`), "",
    `Total QTY: ${s.snapshot.items.reduce((n,i)=>n+i.quantity,0)}`,
    `Total: $${s.snapshot.productCost}`, s.exportPackageLine ?? `Package: $${s.snapshot.shippingCost}`, `Grand Total: $${s.snapshot.totalCost}`,
    "", "Address:", s.snapshot.shipping.name || "Recipient name: Not provided",
    ...(s.snapshot.shipping.address ? s.snapshot.shipping.address.split(/[\r\n,]+/).map(part => part.trim()).filter(Boolean) : ["Address: Not provided"]),
    s.snapshot.shipping.country || "Country: Not provided",
    `Phone: ${s.snapshot.shipping.phone || "Not provided"}`,
  ].join("\n")).join("\n\n--------------------------------\n\n");
  const orderTotals = shipments.map((s, index) => `Order ${index + 1} $${s.snapshot.totalCost}`).join(" + ");
  const overallTotal = centsToUsdString(shipments.reduce((sum, s) => sum + usdToCents(s.snapshot.totalCost), 0n));
  return `${blocks}\n\n================================\n\nGrand total for all orders = ${orderTotals} = $${overallTotal}`;
}
