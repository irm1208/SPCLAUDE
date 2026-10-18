import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./AccountOrderDetail.tsx", import.meta.url), "utf8");

test("member order details include their own group's published progress and updates", () => {
  assert.match(source, /import \{ CustomerGroupBuyUpdates \} from "@\/components\/group-buy-updates\/CustomerGroupBuyUpdates"/);
  assert.match(source, /order\.groupBuyId && !isAdminPreview && \(\s*<CustomerGroupBuyUpdates\s+key=\{order\.groupBuyId\}\s+gbId=\{order\.groupBuyId\}\s+enabled=\{isLoggedIn\}/);
  assert.equal((source.match(/<CustomerGroupBuyUpdates\b/g) ?? []).length, 1);
});

test("member order detail exposes invoice editing for paid orders", () => {
  assert.match(source, /InvoiceEditor/);
  assert.match(source, /invoiceEditing/);
  assert.match(source, /Edit invoice/);
  assert.match(source, /isPaidOrder && !refundActive/);
  assert.match(source, /access=\{\{\s*kind:\s*"member"\s*\}\}/);
});

test("invoice editing is blocked while a refund is active", () => {
  const actions = source.slice(source.indexOf("{\/\* Actions \*\/}"), source.indexOf("{\/\* Delete order"));
  assert.match(actions, /refundActive/);
  assert.match(actions, /Refund request active/);
});

test("known zero vendor shipping is omitted from order details and receipt PDFs", () => {
  assert.match(source, /vendorShippingIsTbd:\s*boolean/);
  assert.match(source, /const vendorShippingIsTbd = order\?\.vendorShippingIsTbd === true/);
  assert.match(source, /showVendorShipping/);
  assert.match(source, /vendorShippingAmount:\s*vendorShippingIsTbd\s*\?\s*null/);
});

test("receipt confirmation is member-only and refreshes both order detail and account lists", () => {
  assert.match(source, /!isAdminPreview && !refundActive && \(\s*<OrderReceivedButton/);
  assert.match(source, /status=\{order.status\} memberReceivedAt=\{order.memberReceivedAt\}/);
  assert.match(source, /setOrder\(previous => previous \? \{ \.\.\.previous, \.\.\.receipt \}/);
  assert.match(source, /invalidateQueries\(\{ queryKey: \["account", "orders"\]/);
});