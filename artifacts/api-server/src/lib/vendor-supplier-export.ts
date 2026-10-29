import type { VendorSnapshot } from "@workspace/db";
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
export function vendorSupplierText(shipments: Array<{reference:string; vendorId:string; snapshot:VendorSnapshot}>, _vendorName: string) {
  return shipments.map((s, index) => [
    `Order no. ${s.reference}`, `New Order ${index + 1}:`, "",
    ...s.snapshot.items.map(i => `${i.productName} x${i.quantity} = $${i.lineTotal}`), "",
    `Total QTY: ${s.snapshot.items.reduce((n,i)=>n+i.quantity,0)}`,
    `Total: $${s.snapshot.productCost}`, `Package: $${s.snapshot.shippingCost}`, `Grand Total: $${s.snapshot.totalCost}`,
    "", "Address:", s.snapshot.shipping.name || "Recipient name: Not provided",
    s.snapshot.shipping.address || "Address: Not provided", s.snapshot.shipping.country || "Country: Not provided",
    `Phone: ${s.snapshot.shipping.phone || "Not provided"}`,
  ].join("\n")).join("\n\n--------------------\n\n");
}
