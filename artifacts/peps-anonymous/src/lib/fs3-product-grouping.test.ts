import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// Exercise the real selected-order aggregation without mounting the admin page.
const source = readFileSync(new URL("../pages/Admin.tsx", import.meta.url), "utf8");
const section = source.slice(source.indexOf("const selectionEnrichedRows = useMemo"));
const loop = section.slice(section.indexOf("for (const order of selected)"), section.indexOf("return [...productMap.values()]"));
const aggregate = new Function("selected", `const productMap = new Map(); ${loop} return [...productMap.values()];`);

test("legacy edited items with empty IDs stay separated by product", () => {
  const rows = aggregate([{ lineItems: [
    { productId: "", productName: "BPC 157 10mg", quantity: 2, unitPrice: 50 },
    { productId: "", productName: "GHK-CU 50mg", quantity: 3, unitPrice: 40 },
  ] }]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].revenue, 100);
  assert.equal(rows[1].revenue, 120);
});

test("linked and legacy versions of the same product aggregate together", () => {
  const rows = aggregate([{ lineItems: [
    { productId: "p1", productName: "BPC 157 10mg", quantity: 2, unitPrice: 50 },
    { productId: "", productName: " bpc 157 10mg ", quantity: 1, unitPrice: 45 },
  ] }]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].qty, 3);
  assert.equal(rows[0].revenue, 145);
});

test("custom products and different strengths do not merge", () => {
  const rows = aggregate([{ lineItems: [
    { productId: null, productName: "Custom kit", quantity: 1, unitPrice: 0 },
    { productId: null, productName: "BPC 157 5mg", quantity: 2, unitPrice: 30 },
    { productId: null, productName: "BPC 157 10mg", quantity: 1, unitPrice: 50 },
  ] }]);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].revenue, 0);
});
