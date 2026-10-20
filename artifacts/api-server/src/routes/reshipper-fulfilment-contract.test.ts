import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./reshipper.ts", import.meta.url), "utf8");

test("reshipper orders endpoint matches assigned usernames across legacy case and @ variants", () => {
  const route = source.slice(
    source.indexOf('router.get("/reshipper/gb/:gbId/orders"'),
    source.indexOf('router.get("/reshipper/gb/:gbId/unclaimed-orders"'),
  );

  assert.match(route, /assignedToReshipper/);
  assert.match(route, /lower\(ltrim\(btrim\(/);
  assert.match(route, /assignment\.reshipperUsername\.trim\(\)\.replace\(\/\^@\/,\s*""\)\.toLowerCase\(\)/);
  assert.doesNotMatch(route, /eq\(ordersTable\.reshipperUsername,\s*assignment\.reshipperUsername\)/);
});

test("single and bulk claims use the same atomic country-pool service and returning result", () => {
  const single = source.slice(source.indexOf('router.post("/reshipper/gb/:gbId/orders/:orderId/claim"'), source.indexOf('router.post("/reshipper/gb/:gbId/orders/claim-bulk"'));
  const bulk = source.slice(source.indexOf('router.post("/reshipper/gb/:gbId/orders/claim-bulk"'), source.indexOf('router.get("/reshipper/gb/:gbId/orders/:orderId"'));
  assert.match(single, /const \[order\] = await claimReshipperOrders/);
  assert.match(single, /res\.status\(409\)/);
  assert.match(bulk, /await claimReshipperOrders/);
  assert.match(bulk, /claimedRows\.map/);
  assert.match(bulk, /ids\.filter\(id => !claimedSet\.has\(id\)\)/);
  assert.doesNotMatch(single + bulk, /No country leg configured/);
});

test("claimed order detail and editing are restricted to the current owner", () => {
  const detail = source.slice(source.indexOf('router.get("/reshipper/gb/:gbId/orders/:orderId"'), source.indexOf('// ── GET /api/reshipper/gb/:gbId/product-names'));
  assert.match(detail, /reshipperOwnedWhere\(gbId, assignment\.reshipperUsername\)/);
  assert.match(detail, /\.where\(refundMutableOrderWhere\(and\([\s\S]*reshipperOwnedWhere/);
});