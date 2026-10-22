import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./CustomerPortal.tsx", import.meta.url), "utf8");
const card = source.slice(source.indexOf("function OrderGridCard("), source.indexOf("function StatusBadge("));

test("My Orders cards use the shared receipt action with the actual order ID and saved timestamp", () => {
  assert.match(card, /order\.status === "Shipped"/);
  assert.match(card, /<OrderReceivedButton key=\{order\.id\} compact orderId=\{order\.id\} status=\{order\.status\}/);
  assert.match(card, /memberReceivedAt=\{order\.memberReceivedAt\} onReceived=\{onReceived\}/);
  assert.match(card, /!order\.current/);
});
test("confirmed receipt shows Received without relabelling unrelated completed orders", () => {
  assert.match(card, /order\.status === "Completed" && order\.memberReceivedAt \? "Received"/);
  assert.match(card, /order\.memberReceivedAt \? "Order received" : "Order completed"/);
});
test("receipt updates all cached order lists and refreshes server state without archiving the order", () => {
  const callback = source.slice(source.indexOf("onReceived={receipt =>"), source.indexOf("onReorder={c.kind"));
  assert.match(callback, /qc\.setQueriesData<Order\[\]>\(\{ queryKey: \["account", "orders"\] \}/);
  assert.match(callback, /order\.id === c\.order\.id \? \{ \.\.\.order, \.\.\.receipt \}/);
  assert.match(callback, /invalidateQueries\(\{ queryKey: \["account", "orders"\]/);
  assert.doesNotMatch(callback, /hideOrder|toggleHiddenOrder/);
});
