import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const organiserSource = readFileSync(new URL("../organiser.ts", import.meta.url), "utf8");
const reshipperSource = readFileSync(new URL("../organiser-reshippers.ts", import.meta.url), "utf8");

test("organiser order list exposes fulfilment routing fields", () => {
  assert.match(organiserSource, /routingType:\s*ordersTable\.routingType/);
  assert.match(organiserSource, /directShippingRequested:\s*ordersTable\.directShippingRequested/);
  assert.match(organiserSource, /batchLocked:\s*ordersTable\.batchLocked/);
  assert.match(organiserSource, /vendorShipping:\s*ordersTable\.vendorShipping/);
});

test("organiser routing mutation is ownership-scoped and guarded", () => {
  assert.match(reshipperSource, /orders\/:orderId\/route/);
  assert.match(reshipperSource, /requireOwnedGb\(req,\s*res,\s*gbId\)/);
  assert.match(reshipperSource, /VALID_ROUTING_TYPES/);
  assert.match(reshipperSource, /batch-locked/);
  assert.match(reshipperSource, /Reshipper is not assigned to this group buy/);
  assert.match(reshipperSource, /routingType,\s*reshipperUsername/);
});