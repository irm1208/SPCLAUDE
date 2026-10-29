import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
const source = readFileSync(new URL("./Admin.tsx", import.meta.url), "utf8");
it("uses selected lines for profit and resets the table identity when the data scope changes", () => {
  const section = source.slice(source.indexOf("const selectionEnrichedRows = useMemo"), source.indexOf("const selectionCombinedRows = useMemo"));
  expect(section).toContain("displayedRoutingOrders.filter(o => selectedOrderIds.has(o.id))");
  expect(section).toContain("aggregateFs3Orders(selected, supplierProducts, makeCostLookup(costs))");
  expect(source).toContain('key={selectionEnrichedRows ? "selected-orders" : filteredRoutingEnrichedRows ? "filtered-orders" : "all-orders"}');
  expect(source).toContain("key={fs3ProfitRowKey(r, rowIndex)}");
});
it("filters the visible order list and prunes hidden selections before bulk actions", () => {
  expect(source).toContain("base.filter(o => matchesFs3Order(o, filterPayment, filterOrderStatus))");
  expect(source).toContain("[...previous].filter(id => visible.has(id))");
  expect(source).toContain("<Fs3WholesaleFilters payment={filterPayment} status={filterOrderStatus}");
  expect(source).toContain('setFilterPayment(""); setFilterOrderStatus("");');
});
it("uses one supplier-aware export path for individual and selected wholesale downloads", () => {
  expect(source).toContain("await exportWholesaleOrders([o])");
  expect(source).toContain("await exportWholesaleOrders(supplierSelected)");
  expect(source).toContain("supplierVendorId || inferFs3Supplier(orders, supplierProducts, supplierVendors)");
  const panel = source.slice(source.indexOf("{/* Routing orders panel */}"), source.indexOf("{/* Product profit table */}"));
  expect(panel).toContain('aria-label="Supplier for wholesale TXT"');
  expect(panel).toContain('role="alert"');
  expect(panel).toContain("supplierExportBusy");
});
