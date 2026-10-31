import { getVendorLanguage, type VendorLanguage } from "./vendor-language";
import { vendorAddressLines } from "./vendor-address";

type PackingOrder = {
  reference: string;
  shipping: { name: string; phone: string; address: string; country: string; email?: string };
  items: { productName: string; quantity: number }[];
};
const escapeHtml = (value: string | number) => String(value).replace(/[&<>"']/g,
  character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);

const chineseLabels: Record<string, string> = {
  "Packing slip": "装箱单", "Recipient": "收件人", "Phone": "电话", "Address": "地址", "Country": "国家",
  "Email": "邮箱", "Not provided": "未提供", "Order items": "订单商品", "Product": "产品", "Quantity": "数量",
};

/** Compact supplier packing slip: delivery information and quantities only. */
export function vendorPackingSlipHtml(order: PackingOrder, language: VendorLanguage = getVendorLanguage()): string {
  const label = (text: string) => language === "zh" ? chineseLabels[text] ?? text : text;
  const shipping = order.shipping;
  const row = (text: string, value: string) => `<div class="detail"><dt>${escapeHtml(label(text))}:</dt><dd>${escapeHtml(value)}</dd></div>`;
  return `<!doctype html><html lang="${language === "zh" ? "zh-CN" : "en"}"><head><meta charset="utf-8"><title>${label("Packing slip")} ${escapeHtml(order.reference)}</title>
<style>
@page{margin:10mm}
*{box-sizing:border-box}
body{margin:0;padding:20px;font:14px/1.4 Arial,Helvetica,"Microsoft YaHei","PingFang SC","Noto Sans CJK SC",sans-serif;color:#111;background:#fff}
main{width:100%;max-width:360px}
h1{font-size:15px;line-height:1.4;margin:0 0 4px;overflow-wrap:anywhere}
dl{margin:0} .detail{display:flex;gap:4px;align-items:baseline}
dt{font-weight:700;flex-shrink:0}dd{margin:0;overflow-wrap:anywhere}
table{border-collapse:collapse;margin-top:20px;width:100%;font-size:14px}
th{text-align:left;font-size:11px;padding:0 12px 5px 0;color:#444}
td{padding:1px 12px 1px 0;vertical-align:top;overflow-wrap:anywhere}
.quantity{width:65px;text-align:right;font-variant-numeric:tabular-nums;padding-right:0}
tr{break-inside:avoid}
@media print{body{padding:0}main{max-width:360px}}
</style></head><body><main aria-label="${label("Packing slip")}">
<h1>${escapeHtml(order.reference)}</h1><dl>
${row("Recipient", shipping.name)}
${row("Phone", shipping.phone || label("Not provided"))}
<div class="detail"><dt>${label("Address")}:</dt><dd>${vendorAddressLines(shipping.address, shipping.country).map(escapeHtml).join("<br>")}</dd></div>
${row("Country", shipping.country)}
${shipping.email?.trim() ? row("Email", shipping.email.trim()) : ""}
</dl><table aria-label="${label("Order items")}"><thead><tr><th>${label("Product")}</th><th class="quantity">${label("Quantity")}</th></tr></thead><tbody>
${order.items.map(item => `<tr><td>${escapeHtml(item.productName)}</td><td class="quantity">${escapeHtml(item.quantity)}</td></tr>`).join("\n")}
</tbody></table></main></body></html>`;
}
