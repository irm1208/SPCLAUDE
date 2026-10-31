import { expect, it } from "vitest";
import { vendorPackingSlipHtml } from "./vendor-packing-slip";

const order = {
  reference: "JBG1030-11", shipping: { name: "Benjamin Bateman", phone: "+6112345", address: "55 High Street, Cabramatta West, NSW, 2166", country: "Australia", email: "" },
  items: [{ productName: "RT10", quantity: 6 }, { productName: "Pep <script>", quantity: 2 }],
};
it("prints a compact English delivery block and product quantities without prices", () => {
  const html = vendorPackingSlipHtml(order);
  expect(html).toContain("JBG1030-11");
  expect(html).toContain("Recipient:");
  expect(html).toContain("Phone:");
  expect(html).toContain("Address:");
  expect(html).toContain("Country:");
  expect(html).toContain("55 High Street<br>Cabramatta West<br>NSW<br>2166");
  expect(html).toContain("Quantity");
  expect(html).toContain('<td class="quantity">6</td>');
  expect(html).not.toContain("Email:");
  expect(html).not.toContain("Packed by");
  expect(html).not.toContain("cost");
});
it("escapes customer and product data and includes email only when provided", () => {
  const html = vendorPackingSlipHtml({ ...order, shipping: { ...order.shipping, name: '<img src=x onerror="alert(1)">', email: "test@example.com" } });
  expect(html).not.toContain("<img");
  expect(html).not.toContain("Pep <script>");
  expect(html).toContain("Pep &lt;script&gt;");
  expect(html).toContain("Email:");
  expect(html).toContain("test@example.com");
});

it("prints Chinese labels and retains escaped English products and delivery data", () => {
  const html = vendorPackingSlipHtml({ ...order, shipping: { ...order.shipping, phone: "", email: "test@example.com" } }, "zh");
  expect(html).toContain('<html lang="zh-CN">');
  for (const label of ["装箱单", "收件人:", "电话:", "地址:", "国家:", "邮箱:", "产品", "数量", "未提供"]) expect(html).toContain(label);
  expect(html).toContain("Benjamin Bateman");
  expect(html).toContain("Australia");
  expect(html).toContain("Pep &lt;script&gt;");
});
