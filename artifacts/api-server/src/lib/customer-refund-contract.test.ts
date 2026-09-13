import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const view = readFileSync(new URL("./customer-refund-view.ts", import.meta.url), "utf8");
const routes = readFileSync(new URL("../routes/account.ts", import.meta.url), "utf8");
const refundRoutes = readFileSync(new URL("../routes/group-buy-refunds.ts", import.meta.url), "utf8");

test("customer refund view remains owner-scoped and safe", () => {
  assert.match(view, /ownerPredicate\(accountId\)/);
  assert.match(view, /preferredAsset/);
  assert.match(view, /verificationErrorCode/);
  assert.doesNotMatch(view, /outbox|processor|attempts/i);
});
test("legacy lookup and POST use shared customer formatter", () => {
  assert.match(routes, /getCustomerRefundView\(order\.id, tg\)/);
  assert.match(routes, /\.\.\.refundView/);
  assert.match(refundRoutes, /res\.status\(201\)\.json\(await getCustomerRefundView/);
});
test("preferred asset is derived from verified persisted payment proof", () => {
  assert.match(view, /referenceSource === "payment"/);
  assert.match(view, /txKind === "crypto"/);
  assert.match(view, /proof\.currency/);
});