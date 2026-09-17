import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./Reshipper.tsx", import.meta.url), "utf8");

test("reshipper dashboard exposes a fulfilment manifest tab", () => {
  assert.match(source, /type RTab = [^;]*"fulfilment"/);
  assert.match(source, /\{ id: "fulfilment",\s+label: "Fulfilment"/);
  assert.match(source, /function FulfilmentManifestTab/);
  assert.match(source, /activeTab === "fulfilment"/);
});

test("fulfilment manifest only counts orders assigned to the signed-in reshipper", () => {
  const manifest = source.slice(
    source.indexOf("function FulfilmentManifestTab"),
    source.indexOf("// ─── QR Tab"),
  );
  assert.match(manifest, /assignment\.reshipperUsername/);
  assert.match(manifest, /filterAssignedFulfilmentOrders/);
  assert.match(manifest, /lineItems/);
  assert.match(manifest, /All items assigned to you/);
});

test("switching group buys clears old orders and ignores stale order responses", () => {
  assert.match(source, /ordersRequestRef/);
  assert.match(source, /setOrders\(\[\]\)/);
  assert.match(source, /requestId === ordersRequestRef\.current/);
  assert.match(source, /<FulfilmentManifestTab key=\{selectedGbId\}/);
});

test("reselecting the active group buy does not clear its manifest", () => {
  assert.match(source, /if \(a\.gbId === selectedGbId\) return;/);
});