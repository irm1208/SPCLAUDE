import assert from "node:assert/strict";
import test from "node:test";

import {
  getSelectedProducts,
  toggleProductSelection,
  toggleVisibleSelection,
} from "./admin-product-selection.ts";

test("selects one product ID without mutating the input set", () => {
  const selectedIds = new Set(["one"]);

  const next = toggleProductSelection(selectedIds, "two");

  assert.deepEqual([...next], ["one", "two"]);
  assert.deepEqual([...selectedIds], ["one"]);
  assert.notStrictEqual(next, selectedIds);
});

test("deselects one product ID without mutating the input set", () => {
  const selectedIds = new Set(["one", "two"]);

  const next = toggleProductSelection(selectedIds, "one");

  assert.deepEqual([...next], ["two"]);
  assert.deepEqual([...selectedIds], ["one", "two"]);
  assert.notStrictEqual(next, selectedIds);
});

test("selects all visible product IDs", () => {
  const selectedIds = new Set(["hidden"]);

  const next = toggleVisibleSelection(selectedIds, ["one", "two"]);

  assert.deepEqual([...next], ["hidden", "one", "two"]);
});

test("clears visible IDs while preserving products hidden by the current filter", () => {
  const all = toggleVisibleSelection(new Set<string>(), ["one", "two"]);
  const afterChangingFilter = toggleVisibleSelection(all, ["three"]);

  assert.deepEqual([...afterChangingFilter], ["one", "two", "three"]);
  assert.deepEqual(
    [...toggleVisibleSelection(afterChangingFilter, ["three"])],
    ["one", "two"],
  );
});

test("leaves selection unchanged for an empty visible list", () => {
  const selectedIds = new Set(["one", "two"]);

  const next = toggleVisibleSelection(selectedIds, []);

  assert.deepEqual([...next], ["one", "two"]);
  assert.notStrictEqual(next, selectedIds);
});

test("does not mutate the input set when selecting visible IDs", () => {
  const selectedIds = new Set(["hidden"]);

  const next = toggleVisibleSelection(selectedIds, ["one"]);

  assert.deepEqual([...selectedIds], ["hidden"]);
  assert.notStrictEqual(next, selectedIds);
});

test("resolves selected product records in catalogue order", () => {
  const products = [
    { id: "two", name: "Second", vendor: "Vendor B" },
    { id: "one", name: "First", vendor: "Vendor A" },
    { id: "three", name: "Third", vendor: "Vendor C" },
  ];

  const selected = getSelectedProducts(products, new Set(["three", "one"]));

  assert.deepEqual(selected, [products[1], products[2]]);
});