import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fulfilmentCollisionDetection } from "../lib/fulfilment-board-dnd.ts";

const source = readFileSync(new URL("./AdminGbFulfilment.tsx", import.meta.url), "utf8");
const rect = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height });
const args = (pointerCoordinates) => ({
  active: { id: "order1" },
  collisionRect: rect(100, 400, 260, 120),
  droppableRects: new Map([["grp:direct", rect(0, 0, 260, 600)], ["grp:reshipper:fazi28", rect(275, 0, 260, 600)]]),
  droppableContainers: [{ id: "grp:direct" }, { id: "grp:reshipper:fazi28" }],
  pointerCoordinates,
});

test("pointer over the empty reshipper column takes precedence over dragged-card overlap", () => {
  // The card still overlaps Direct Shipping more, but the pointer is in the reshipper column.
  assert.equal(fulfilmentCollisionDetection(args({ x: 280, y: 480 }))[0]?.id, "grp:reshipper:fazi28");
});
test("dropping outside all columns does not accidentally assign an order", () => {
  assert.deepEqual(fulfilmentCollisionDetection(args({ x: 900, y: 900 })), []);
});
test("non-pointer dragging retains rectangle collision detection", () => {
  assert.equal(fulfilmentCollisionDetection(args(null))[0]?.id, "grp:direct");
});
test("the complete column, not only its short empty-state message, is droppable", () => {
  const group = source.slice(source.indexOf("function RoutingGroupCard("), source.indexOf("// ── Warning Panel"));
  assert.match(group, /<div ref=\{setNodeRef\} className=\{wrapperCls\}/);
  assert.equal((group.match(/ref=\{setNodeRef\}/g) ?? []).length, 1);
});
test("drag overlay does not register a second draggable with the same order ID", () => {
  const overlay = source.slice(source.indexOf("<DragOverlay"), source.indexOf("</DragOverlay>"));
  assert.doesNotMatch(overlay, /<DraggableOrderCard/);
  assert.match(overlay, /<OrderCard/);
  assert.match(source, /collisionDetection=\{fulfilmentCollisionDetection\}/);
});
test("dropping still uses the persisted routing endpoint, not a visual-only move", () => {
  assert.match(source, /await handleQuickRoute\(orderId, routingType, reshipperUsername\)/);
  assert.match(source, /\/admin\/orders\/\$\{orderId\}\/routing/);
  assert.match(source, /JSON\.stringify\(\{ routingType, reshipperUsername:/);
});
