import assert from "node:assert/strict";
import { test } from "node:test";
import { canIncreaseBrowseQuantity, groupProductsForBrowse } from "./gb-product-browse";

const products = [
  { id: "a", name: "Alpha 10mg", category: "Peptides", price: 12 },
  { id: "b", name: "Beta", category: "Other", price: 8 },
  { id: "c", name: "Gamma", category: "Peptides", price: 10 },
  { id: "d", name: "Delta", category: null, price: 6 },
];

test("browse view shows the entire catalog, grouped in configured category order", () => {
  const groups = groupProductsForBrowse(products, "", ["Peptides", "Other"]);
  assert.deepEqual(groups.map(group => [group.category, group.products.map(p => p.id)]), [
    ["Peptides", ["a", "c"]],
    ["Other", ["b"]],
    ["Uncategorised", ["d"]],
  ]);
});

test("browse search matches product name and category without truncating the list", () => {
  assert.deepEqual(groupProductsForBrowse(products, "peptides", []).flatMap(g => g.products.map(p => p.id)), ["a", "c"]);
  assert.deepEqual(groupProductsForBrowse(products, "alpha", []).flatMap(g => g.products.map(p => p.id)), ["a"]);
  assert.deepEqual(groupProductsForBrowse(products, "missing", []), []);
});

test("inline quantity increases only when all group, customer and product limits permit the next step", () => {
  assert.equal(canIncreaseBrowseQuantity({ quantity: 0, groupRemaining: 1, customerRemaining: 1, productRemaining: 1 }), true);
  assert.equal(canIncreaseBrowseQuantity({ quantity: 1, groupRemaining: 0, customerRemaining: 5, productRemaining: 5 }), false);
  assert.equal(canIncreaseBrowseQuantity({ quantity: 1, groupRemaining: 5, customerRemaining: 0, productRemaining: 5 }), false);
  assert.equal(canIncreaseBrowseQuantity({ quantity: 1, groupRemaining: 5, customerRemaining: 5, productRemaining: 0 }), false);
  assert.equal(canIncreaseBrowseQuantity({ quantity: 0.5, groupRemaining: 0.5, customerRemaining: 0.5, productRemaining: 0.5 }), true);
  assert.equal(canIncreaseBrowseQuantity({ quantity: 1, groupRemaining: 0.5, customerRemaining: 5, productRemaining: 5 }), false);
  assert.equal(canIncreaseBrowseQuantity({ quantity: 0, groupRemaining: 5, customerRemaining: 5, productRemaining: 5, unavailable: true }), false);
});