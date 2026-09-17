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