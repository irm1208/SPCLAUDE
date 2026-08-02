import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = file => readFileSync(new URL(file, import.meta.url), "utf8");

test("order cards show a four-field compact summary and expand inline on click", () => {
  const compact = read("./CompactOrderList.tsx");
  const orders = read("./OrdersTab.tsx");
  const mobile = read("./OrdersMobileWorkspace.tsx");

  // Four column headers exist
  for (const label of ["User name", "QTY", "Total", "Date"]) {
    assert.match(compact, new RegExp(`>${label}<`));
  }
  // Quantity is summed across all products
  assert.match(compact, /products\.reduce\(\(sum,\s*product\)\s*=>\s*sum\s*\+\s*product\.quantity,\s*0\)/);

  // Accordion: clicking the summary row toggles expansion, not a side drawer
  assert.match(compact, /expandedId/);
  assert.match(compact, /data-expanded/);
  assert.match(compact, /aria-expanded/);
  assert.match(compact, /toggleExpand/);

  // Checkbox stopPropagation keeps selection separate from expand
  assert.match(compact, /event\.stopPropagation\(\)/);

  // Accessible header: select-all is not hidden from assistive technology
  assert.doesNotMatch(compact, /className="orders-compact-header"\s+aria-hidden="true"/);
  assert.match(compact, /aria-label="Select all orders"/);

  // Inline detail panel and callbacks wired
  assert.match(compact, /orders-compact-detail/);
  assert.match(compact, /onEditOrder/);
  assert.match(compact, /onSelectOrder/);

  // OrdersTab uses CompactOrderList with the accordion callbacks
  assert.match(orders, /<CompactOrderList/);
  assert.match(orders, /onEditOrder=\{openEditModal\}/);
  // QuickViewDrawer is still present (used for deep-link initial expand)
  assert.match(orders, /<AtlasQuickViewDrawer/);
  // Mobile also uses CompactOrderList
  assert.match(mobile, /<CompactOrderList/);
});

test("inline accordion retains full payment and delivery information", () => {
  const compact = read("./CompactOrderList.tsx");
  // Payment section
  assert.match(compact, /orders-compact-detail-section/);
  assert.match(compact, /paymentStatus/);
  assert.match(compact, /paymentProof/);
  // Delivery section
  assert.match(compact, /shippingOption/);
  assert.match(compact, /trackingNumber/);
  // Items section
  assert.match(compact, /orders-compact-detail-item/);
});
