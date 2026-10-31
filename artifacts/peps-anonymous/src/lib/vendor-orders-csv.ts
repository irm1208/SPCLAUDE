import { getVendorLanguage, type VendorLanguage } from "./vendor-language";
import { vendorAddressLines } from "./vendor-address.ts";
import type { VendorOrder } from "../pages/VendorPortal";

type ExportOrder = Pick<VendorOrder, "reference" | "status" | "stale" | "submittedAt" | "shipping" | "items" | "currency" | "productCost" | "shippingCost" | "totalCost" | "carrier" | "trackingNumber">;

function cell(value: string | number | null): string {
  const text = String(value ?? "");
  // Quoting alone does not stop spreadsheet applications evaluating formulas.
  const safe = /^[\s]*[=+\-@]|^[\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

const chineseLabels: Record<string, string> = {
  "Order reference": "订单编号", "Status": "状态", "On hold": "暂缓", "Date": "日期",
  "Recipient": "收件人", "Address": "地址", "Country": "国家", "Phone": "电话", "Email": "邮箱",
  "Order": "订单", "Currency": "币种", "Order product cost": "订单产品成本", "Order shipping cost": "订单运费",
  "Order total cost": "订单总成本", "Carrier": "承运商", "Tracking number": "运单号", "Paid": "已付款", "Yes": "是", "No": "否",
};

/** Explicit allowlist: no retail prices, member identities or internal notes. */
export function vendorOrdersCsv(orders: readonly ExportOrder[], language: VendorLanguage = getVendorLanguage()): string {
  const label = (text: string) => language === "zh" ? chineseLabels[text] ?? text : text;
  const rows: (string | number | null)[][] = [[
    "Order reference", "Status", "On hold", "Date", "Recipient", "Address", "Country", "Phone", "Email",
    "Order", "Currency", "Order product cost", "Order shipping cost", "Order total cost", "Carrier", "Tracking number",
  ].map(label)];
  for (const order of orders) {
    const submitted = new Date(order.submittedAt);
    const date = Number.isNaN(submitted.getTime()) ? "" : new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", day: "2-digit", month: "2-digit", year: "numeric" }).format(submitted);
    rows.push([
      order.reference, label("Paid"), label(order.stale ? "Yes" : "No"), date,
      order.shipping.name, vendorAddressLines(order.shipping.address, order.shipping.country).join("\n"),
      order.shipping.country, order.shipping.phone, order.shipping.email,
      order.items.map(item => `${item.quantity}x ${item.productName}`).join("\n"), order.currency,
      order.productCost, order.shippingCost, order.totalCost, order.carrier, order.trackingNumber,
    ]);
  }
  return "\uFEFF" + rows.map(row => row.map(cell).join(",")).join("\r\n") + "\r\n";
}

export function downloadVendorOrdersCsv(orders: readonly ExportOrder[], language: VendorLanguage = getVendorLanguage()): void {
  const url = URL.createObjectURL(new Blob([vendorOrdersCsv(orders, language)], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `vendor-orders-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
