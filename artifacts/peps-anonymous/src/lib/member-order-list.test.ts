import assert from "node:assert/strict";
import test from "node:test";
import { filterMemberOrderCards } from "./member-order-list";

const cards = [
  { kind: "gb", title: "HGH group", order: { id: "gb", status: "Submitted", code: "123", lineItems: [{ productName: "HGH" }] } },
  { kind: "shared", title: "Shared order", order: { id: "shared", status: "Shipped", code: "456", lineItems: [{ productName: "BPC" }] } },
  { kind: "wholesale", title: "Wholesale", order: { id: "wholesale", status: "Completed", code: "789", lineItems: [] } },
  { kind: "shop", title: "Shop", order: { id: "shop", status: "Cancelled", code: "987", lineItems: [] } },
];
const completedIds = new Set(["shared"]);
const select = (options = {}) => filterMemberOrderCards(cards, completedIds, {
  section: "active", type: "all", status: "all", search: "", ...options,
});

test("All shows every order type in the active section without personally completed orders", () => {
  assert.deepEqual(select().map(c => c.order.id), ["gb", "wholesale", "shop"]);
});
test("Completed contains only personally moved orders, not orders with a Completed fulfilment status", () => {
  assert.deepEqual(select({ section: "completed" }).map(c => c.order.id), ["shared"]);
});
test("type filters work in both active and completed sections", () => {
  assert.deepEqual(select({ type: "gb" }).map(c => c.order.id), ["gb"]);
  assert.equal(select({ type: "shared" }).length, 0);
  assert.equal(select({ section: "completed", type: "shared" }).length, 1);
});
test("search and fulfilment filters still apply within a section", () => {
  assert.equal(select({ search: "123" }).length, 1);
  assert.equal(select({ search: "hgh" }).length, 1);
  assert.equal(select({ section: "completed", search: "bpc", status: "Shipped" }).length, 1);
  assert.equal(select({ section: "completed", status: "Submitted" }).length, 0);
});
test("restoring returns an order to the active section without mutating the order", () => {
  const before = structuredClone(cards);
  const restored = filterMemberOrderCards(cards, new Set(), { section: "active", type: "all", status: "all", search: "" });
  assert.equal(restored.length, 4);
  assert.deepEqual(cards, before);
});
