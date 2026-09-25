import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const source = await readFile(new URL("./Admin.tsx", import.meta.url), "utf8");

test("products expose controlled product-specific selection and visible selection controls", () => {
  assert.match(source, /type="checkbox"/);
  assert.match(source, /checked=\{isSelected\}/);
  assert.match(source, /aria-label=\{`Select \$\{product\.name\}`\}/);
  assert.match(source, /Select visible/);
  assert.match(source, /selectedCount/);
  assert.match(source, /Clear selection/);
});

test("bulk confirmation lists exact selected product names and vendors", () => {
  assert.match(source, /getSelectedProducts\(products, selectedIds\)/);
  assert.match(source, /selectedProduct\.name/);
  assert.match(source, /selectedProduct\.vendor/);
  assert.match(source, /Cancel/);
});

test("bulk confirmation sends one products DELETE request", () => {
  assert.match(source, /fetch\(apiUrl\("\/admin\/products"\), \{\s*method: "DELETE"/);
  assert.match(source, /body: JSON\.stringify\(\{ ids: \[\.\.\.selectedIds\] \}\)/);
  assert.match(source, /deletedIds/);
});