import assert from "node:assert/strict";
import test from "node:test";
import { vendorOrdersCsv } from "./vendor-orders-csv.ts";

const order = {
  reference: "12614", status: "Submitted", submittedAt: "2026-10-31T14:17:41Z", stale: false,
  currency: "USD", productCost: "138.00", shippingCost: "60.00", totalCost: "198.00",
  shipping: { name: 'Test "Recipient"', address: "17 Road, Birmingham, b73 6rg", country: "United Kingdom", phone: "+441234567890", email: "" },
  trackingNumber: null, carrier: null,
  items: [{ productName: "Product, one", quantity: 1, unitCost: "46.00", lineTotal: "46.00" }, { productName: "Product two", quantity: 2, unitCost: "46.00", lineTotal: "92.00" }],
};
test("exports one row per order with a multiline Order cell, date and supplier totals", () => {
  const csv = vendorOrdersCsv([order]);
  assert.ok(csv.startsWith('\uFEFF"Order reference","Status"'));
  assert.equal(csv.split('"12614"').length - 1, 1);
  assert.ok(csv.includes('"1x Product, one\n2x Product two"'));
  assert.ok(csv.includes('"Order"'));
  assert.ok(csv.includes('"Date"'));
  assert.ok(csv.includes('"12614","Paid"'));
  assert.ok(!csv.includes('"Submitted"'));
  assert.ok(csv.includes('"31/10/2026"'));
  assert.ok(csv.includes('"Test ""Recipient"""'));
  assert.ok(csv.includes('"17 Road\nBirmingham\nB73 6RG"'));
  assert.ok(!csv.includes('"Unit cost"'));
  assert.ok(!csv.includes('"Line cost"'));
  assert.ok(csv.includes('"138.00","60.00","198.00"'));
});
test("neutralises spreadsheet formulas and never exports extra private fields", () => {
  const csv = vendorOrdersCsv([{ ...order, shipping: { ...order.shipping, name: " =HYPERLINK(\"evil\")" }, adminNotes: "PRIVATE", grandTotal: "RETAIL" } as typeof order]);
  assert.ok(csv.includes('"\' =HYPERLINK'));
  assert.ok(csv.includes('"\'+441234567890"'));
  assert.ok(!csv.includes("PRIVATE"));
  assert.ok(!csv.includes("RETAIL"));
});
test("an empty export retains column headings", () => {
  assert.equal(vendorOrdersCsv([]).split("\r\n").length, 2);
});

test("multiple orders each occupy one CSV record and totals occur once per order", () => {
  const csv = vendorOrdersCsv([order, { ...order, reference: "12615", items: [{ ...order.items[0], productName: "Other product", quantity: 3 }] }]);
  assert.equal(csv.split("\r\n").filter(Boolean).length, 3);
  assert.equal(csv.split('"12614"').length - 1, 1);
  assert.equal(csv.split('"12615"').length - 1, 1);
  assert.ok(csv.includes('"3x Other product"'));
  assert.equal(csv.split('"198.00"').length - 1, 2);
});
test("uses London dates and leaves an unavailable date blank", () => {
  assert.ok(vendorOrdersCsv([{ ...order, submittedAt: "2026-07-01T23:30:00Z" }]).includes('"02/07/2026"'));
  assert.ok(!vendorOrdersCsv([{ ...order, submittedAt: "" }]).includes("Invalid Date"));
});
