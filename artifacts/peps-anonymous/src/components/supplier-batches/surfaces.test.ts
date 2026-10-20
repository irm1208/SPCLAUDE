import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
test("Admin and both organiser dashboards expose Supplier batches", () => {
  for (const p of ["admin/group-buys/GbDetailShell.tsx", "../pages/GbOrganiser.tsx", "../pages/organiser-v2/Workspace.tsx"]) {
    const text=read(p);
    assert.match(text, /SupplierBatchManager/);
    assert.match(text, /supplier-batches/);
  }
});
test("all three order lists apply batch filtering and display batch references", () => {
  for (const p of ["admin/group-buys/panels/OrdersPanel.tsx","../pages/GbOrganiser.tsx","../pages/organiser-v2/OrdersTab.tsx"]) {
    const text=read(p);
    assert.match(text,/useOrderBatches/);assert.match(text,/OrderBatchFilter/);
    assert.match(text,/supplierBatches\.matches\(/);
    assert.match(text,/OrderBatchBadge|batchLabels=/);
  }
});
