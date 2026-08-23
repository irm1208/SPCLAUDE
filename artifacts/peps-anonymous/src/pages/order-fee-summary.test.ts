import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const customerOrderSource = readFileSync(new URL("./AccountOrderDetail.tsx", import.meta.url), "utf8");
const adminOrderSource = readFileSync(new URL("./Admin.tsx", import.meta.url), "utf8");

test("customer order summary displays organiser fee before vendor shipping", () => {
  const feeRow = customerOrderSource.indexOf("order.organiserFee ?? 0");
  const vendorShipping = customerOrderSource.indexOf("<span>Vendor Shipping</span>");

  assert.ok(feeRow >= 0, "customer summary should render an organiser fee row");
  assert.ok(vendorShipping > feeRow, "organiser fee should appear before vendor shipping");
});

test("admin order summary displays organiser fee before vendor shipping", () => {
  const feeRow = adminOrderSource.indexOf("order.organiserFee ?? 0");
  const vendorShipping = adminOrderSource.indexOf("<span>Vendor Shipping</span>");

  assert.ok(feeRow >= 0, "admin summary should render an organiser fee row");
  assert.ok(vendorShipping > feeRow, "organiser fee should appear before vendor shipping");
});