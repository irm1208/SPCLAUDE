import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const source = readFileSync(new URL("./Reshipper.tsx", import.meta.url), "utf8");
test("explains shared ownership and excludes supplier Direct Shipping", () => {
  assert.match(source, /Shared claim pool for your assigned countries/);
  assert.match(source, /the first successful claim owns it/);
  assert.match(source, /Supplier Direct Shipping is excluded/);
});
test("refreshes the pool after a lost claim and does not conceal loading failures", () => {
  const claim = source.slice(source.indexOf("const claimOrder = useCallback"), source.indexOf("const claimOrdersBulk = useCallback"));
  assert.match(claim, /await loadUnclaimed\(selectedGbId\)/);
  assert.match(source, /setUnclaimedError/);
  assert.match(source, /Retry shared claim pool/);
  assert.match(source, /requestId === unclaimedRequestRef\.current/);
});
test("limits bulk selection to the maximum the claim endpoint accepts", () => {
  assert.match(source, /unclaimedOrders\.slice\(0, 100\)/);
  assert.match(source, /selected\.size >= 100/);
});
