import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { SupplierCarrierSelect } from "./SupplierCarrierSelect";

test("offers named carriers and auto-detect with numeric provider values", () => {
  const html = renderToStaticMarkup(<SupplierCarrierSelect value="192203" onChange={() => {}} />);
  assert.match(html, /<select/);
  assert.match(html, /value="0"[^>]*>Auto-detect/);
  assert.match(html, /value="192203" selected="">SXW Wuli/);
  assert.match(html, />UPS</);
});

test("preserves an existing carrier absent from the saved list", () => {
  const html = renderToStaticMarkup(<SupplierCarrierSelect value="999999" onChange={() => {}} />);
  assert.match(html, /value="999999" selected="">Existing carrier \(999999\)/);
});

test("both package creation and tracking edits use the dropdown", () => {
  const source = readFileSync(new URL("./SupplierBatchFulfilment.tsx", import.meta.url), "utf8");
  assert.equal((source.match(/<SupplierCarrierSelect\b/g) || []).length, 2);
  assert.doesNotMatch(source, /type="number" min=\{0\} step=\{1\} value=\{carrier\}/);
});
