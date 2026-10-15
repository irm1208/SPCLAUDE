import assert from "node:assert/strict";
import test from "node:test";
import { submittedTimelineLabel, wholesaleStatusLabel } from "./wholesale-status-label";

test("wholesale and shared wholesale use the requested four milestone labels", () => {
  for (const type of ["wholesale", "wholesale_shared"]) {
    assert.deepEqual([
      submittedTimelineLabel(type), wholesaleStatusLabel("Processing", type),
      wholesaleStatusLabel("Shipped", type), wholesaleStatusLabel("Delivered", type),
    ], ["Submitted", "Order received by Vendor", "Shipped", "Delivered"]);
    assert.equal(wholesaleStatusLabel("Processed", type), "Order received by Vendor");
  }
});
test("partial shared-order progress keeps its counts", () => {
  assert.equal(wholesaleStatusLabel("Part processed (2/3)", "wholesale_shared"), "Part received by Vendor (2/3)");
});
test("other order types and statuses are unchanged", () => {
  for (const type of [null, undefined, "group_buy", "shop"]) {
    assert.equal(submittedTimelineLabel(type), "Ordered");
    assert.equal(wholesaleStatusLabel("Processing", type), "Processing");
  }
  for (const label of ["Submitted", "Shipped", "Delivered", "Cancelled", "Paid", "Part shipped (1/3)"]) {
    assert.equal(wholesaleStatusLabel(label, "wholesale_shared"), label);
  }
});
