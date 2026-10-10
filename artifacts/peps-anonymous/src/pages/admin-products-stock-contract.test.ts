import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const admin = await readFile(new URL("./Admin.tsx", import.meta.url), "utf8");
const source = admin.slice(admin.indexOf("function ProductsTab("), admin.indexOf("// ─── Shipping Tab"));

test("product selection exposes a stock action and opens an exact selection snapshot", () => {
  assert.match(source, /data-testid="button-bulk-product-stock"/);
  assert.match(source, /setStockSelection\(selectedProducts\.map/);
  assert.match(source, /<BulkProductStockDialog/);
  assert.match(source, /products=\{stockSelection\}/);
});

test("bulk stock results patch server-owned stock values into the product list", () => {
  assert.match(source, /result\.products\.map/);
  assert.match(source, /stock:\s*stockById\.get\(product\.id\)/);
  assert.match(source, /result\.skippedIds\.length/);
});
