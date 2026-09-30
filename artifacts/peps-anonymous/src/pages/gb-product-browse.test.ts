import assert from "node:assert/strict";
import { test } from "node:test";
import { groupProductsForBrowse } from "./gb-product-browse";

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