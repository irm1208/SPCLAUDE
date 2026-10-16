import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { compareOrderAmounts } from "./order-amount-sort.ts";

test("sorts amounts numerically in either direction, including numeric strings and zero", () => {
  const amounts = [100, "20.50", 0, 9.75];
  assert.deepEqual([...amounts].sort((a, b) => compareOrderAmounts(a, b, "asc")), [0, 9.75, "20.50", 100]);
  assert.deepEqual([...amounts].sort((a, b) => compareOrderAmounts(a, b, "desc")), [100, "20.50", 9.75, 0]);
});
test("unknown amounts stay last and equal amounts retain their original order", () => {
  for (const direction of ["asc", "desc"] as const) {
    assert.ok(compareOrderAmounts(null, 10, direction) > 0);
    assert.ok(compareOrderAmounts(10, undefined, direction) < 0);
    assert.equal(compareOrderAmounts("bad", "", direction), 0);
    assert.equal(compareOrderAmounts(10, "10", direction), 0);
  }
});

test("both organiser dashboards expose amount sorting, without country grouping overriding it", () => {
  const legacy = readFileSync(new URL("../pages/GbOrganiser.tsx", import.meta.url), "utf8");
  assert.match(legacy, /value="amount_asc">Amount: smallest first/);
  assert.match(legacy, /value="amount_desc">Amount: largest first/);
  assert.match(legacy, /compareOrderAmounts\(a\.grandTotal, b\.grandTotal/);
  assert.match(legacy, /const showCountryHeaders[\s\S]*?&& sortBy !== "amount_asc" && sortBy !== "amount_desc"/);
  const modern = readFileSync(new URL("../pages/organiser-v2/OrdersTab.tsx", import.meta.url), "utf8");
  assert.equal((modern.match(/value="amount-asc"/g) || []).length, 2);
  assert.equal((modern.match(/value="amount-desc"/g) || []).length, 2);
});
