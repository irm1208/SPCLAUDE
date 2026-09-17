import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./GbOrganiser.tsx", import.meta.url), "utf8");

test("organiser dashboard exposes fulfilment with list and board views", () => {
  assert.match(source, /\| "fulfilment"/);
  assert.match(source, /id: "fulfilment", label: "Fulfilment"/);
  assert.match(source, /function FulfilmentTab/);
  assert.match(source, /setView\("list"\)/);
  assert.match(source, /setView\("board"\)/);
  assert.match(source, /activeTab === "fulfilment"[\s\S]*<FulfilmentTab[^>]*gb=\{selectedGb\}/);
});

test("fulfilment uses organiser-scoped order data", () => {
  assert.match(source, /organiser\/group-buys\/\$\{gb\.id\}\/orders/);
  assert.doesNotMatch(source, /function FulfilmentTab[\s\S]*?\/api\/admin\//);
});

test("fulfilment supports real drag-and-drop routing", () => {
  assert.match(source, /draggable/);
  assert.match(source, /onDragStart/);
  assert.match(source, /onDrop/);
  assert.match(source, /orders\/\$\{orderId\}\/route/);
  assert.match(source, /Drop orders here/);
});

test("organiser board uses a browser-compatible drag payload and explains the interaction", () => {
  const fulfilment = source.slice(source.indexOf("function FulfilmentTab"), source.indexOf("function OrdersTab"));
  assert.match(fulfilment, /setData\("text\/plain",\s*order\.id\)/);
  assert.match(fulfilment, /getData\("text\/order-id"\)\s*\|\|\s*event\.dataTransfer\.getData\("text\/plain"\)/);
  assert.match(fulfilment, /Drag orders between columns/);
});

test("reshippers tab exposes a totals modal", () => {
  assert.match(source, /Reshipper totals/);
  assert.match(source, /reshipperTotalsOpen/);
  assert.match(source, /Combined kits/);
  assert.match(source, /Order total/);
});

test("organiser fulfilment tab exposes the per-reshipper totals modal", () => {
  const fulfilment = source.slice(source.indexOf("function FulfilmentTab"), source.indexOf("function OrdersTab"));
  assert.match(fulfilment, /setReshipperTotalsOpen\(true\)/);
  assert.match(fulfilment, /Reshipper totals/);
  assert.match(fulfilment, /<ReshipperTotalsModal/);
});

test("reshipper totals canonicalise usernames and exclude cancelled or refunded orders", () => {
  const modal = source.slice(source.indexOf("function ReshipperTotalsModal"), source.indexOf("function FulfilmentTab"));
  assert.match(modal, /usernameMap/);
  assert.match(modal, /canonicalReshipperUsername/);
  assert.match(modal, /filterAssignedFulfilmentOrders/);
});

test("organiser fulfilment ignores stale loads when the selected group buy changes", () => {
  const fulfilment = source.slice(source.indexOf("function FulfilmentTab"), source.indexOf("function OrdersTab"));
  assert.match(fulfilment, /loadRequestRef/);
  assert.match(source, /<FulfilmentTab key=\{selectedGb\.id\} gb=\{selectedGb\}/);
});

test("explicit organiser routing wins over the customer's original direct request", () => {
  const fulfilmentStart = source.indexOf("function FulfilmentTab");
  const groupingStart = source.indexOf("for (const order of visibleOrders)", fulfilmentStart);
  const groupingEnd = source.indexOf("return [...map.values()]", groupingStart);
  const grouping = source.slice(groupingStart, groupingEnd);
  assert.ok(grouping.indexOf('order.routingType === "unrouted"') < grouping.indexOf("order.directShippingRequested"));
});

test("an existing reshipper assignment wins over a stale direct routing marker", () => {
  const fulfilmentStart = source.indexOf("function FulfilmentTab");
  const groupingStart = source.indexOf("for (const order of visibleOrders)", fulfilmentStart);
  const groupingEnd = source.indexOf("return [...map.values()]", groupingStart);
  const grouping = source.slice(groupingStart, groupingEnd);
  assert.ok(grouping.indexOf("order.reshipperUsername") < grouping.indexOf('order.routingType === "direct"'));
});

test("fulfilment card formats delivery in the group buy currency", () => {
  const fulfilment = source.slice(source.indexOf("function FulfilmentTab"), source.indexOf("function OrdersTab"));
  assert.match(fulfilment, /moneySymbol\}\{Number\(order\.deliveryPrice/);
});

test("fulfilment displays stablecoin amounts with a dollar symbol", () => {
  const fulfilment = source.slice(source.indexOf("function FulfilmentTab"), source.indexOf("function OrdersTab"));
  assert.match(fulfilment, /gb\.currency === "USDT"/);
  assert.match(fulfilment, /gb\.currency === "USDC"/);
});