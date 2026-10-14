import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source = readFileSync(new URL("../pages/Admin.tsx", import.meta.url), "utf8");
const tab = source.slice(source.indexOf("function AdminWholesaleSharesTab("), source.indexOf("function AdminWholesaleSharesTab(") + 60000);
test("shared rows show lifecycle pills and platform receipts without requiring expansion", () => {
  assert.match(tab, /row\.orderStatusPills\.map/);
  assert.match(tab, /row\.platformPaymentReceived/);
  assert.match(tab, /Platform payment received/);
  assert.match(tab, /Shared order total/);
  assert.match(tab, /Not recorded/);
});
test("manual platform confirmation records the received amount in USD", () => {
  assert.match(tab, /receivedAmountUsd/);
  assert.match(tab, /JSON\.stringify\(\{ receivedAmountUsd \}\)/);
});
