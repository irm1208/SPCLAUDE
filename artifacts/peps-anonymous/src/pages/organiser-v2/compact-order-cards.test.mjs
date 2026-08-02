import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = file => readFileSync(new URL(file, import.meta.url), "utf8");

test("desktop and mobile use compact order summaries that open full details", () => {
  const compact = read("./CompactOrderList.tsx");
  const orders = read("./OrdersTab.tsx");
  const mobile = read("./OrdersMobileWorkspace.tsx");

  for (const label of ["User name", "QTY", "Total", "Date"]) {
    assert.match(compact, new RegExp(`>${label}<`));
  }
  assert.match(compact, /products\.reduce\(\(sum,\s*product\)\s*=>\s*sum\s*\+\s*product\.quantity,\s*0\)/);
  assert.match(compact, /onClick=\{\(\)\s*=>\s*onOpenOrder\(order\)\}/);
  assert.match(compact, /event\.stopPropagation\(\)/);
  assert.doesNotMatch(compact, /className="orders-compact-header"\s+aria-hidden="true"/);
  assert.match(compact, /aria-label="Select all orders"/);
  assert.match(orders, /<CompactOrderList[\s\S]*onOpenOrder=\{setQuickViewOrder\}/);
  assert.match(mobile, /<CompactOrderList[\s\S]*onOpenOrder=\{onOpenOrder\}/);
  assert.match(orders, /<AtlasQuickViewDrawer/);
});

test("full order drawer retains payment and delivery information", () => {
  const orders = read("./OrdersTab.tsx");
  assert.match(orders, /<AtlasDrawerSection title="Payment">/);
  assert.match(orders, /quickViewOrder\.paymentStatus/);
  assert.match(orders, /quickViewOrder\.paymentProof/);
  assert.match(orders, /<AtlasDrawerSection title="Delivery">/);
});