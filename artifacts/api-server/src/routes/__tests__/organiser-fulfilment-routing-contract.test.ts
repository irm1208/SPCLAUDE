import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const organiserSource = readFileSync(new URL("../organiser.ts", import.meta.url), "utf8");
const reshipperSource = readFileSync(new URL("../organiser-reshippers.ts", import.meta.url), "utf8");
const adminReshipperSource = readFileSync(new URL("../reshipper-admin.ts", import.meta.url), "utf8");
const adminSource = readFileSync(new URL("../admin.ts", import.meta.url), "utf8");

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

test("manual reshipper assignment keeps routing fields synchronized", () => {
  const organiserReassign = reshipperSource.slice(
    reshipperSource.indexOf("orders/:orderId/reassign-reshipper"),
    reshipperSource.indexOf("reshipper-invite-code"),
  );
  assert.match(organiserReassign, /set\(\{\s*reshipperUsername,\s*routingType:\s*"reshipper"/);
  assert.match(organiserReassign, /reshipperUsername:\s*null,\s*routingType:\s*"unrouted"/);

  const adminReassign = adminReshipperSource.slice(
    adminReshipperSource.indexOf("/admin/orders/:orderId/reassign-reshipper"),
    adminReshipperSource.indexOf("/admin/gb-assignments"),
  );
  assert.match(adminReassign, /reshipperUsername,\s*routingType:\s*"reshipper"/);
  assert.match(adminReassign, /reshipperUsername:\s*clearing\s*\?\s*null\s*:\s*reshipperUsername,[\s\S]*routingType:\s*clearing\s*\?\s*"unrouted"\s*:\s*"reshipper"/);
});

test("admin fulfilment honours an assigned reshipper over a stale routing type", () => {
  const groupKeyStart = adminSource.indexOf("function getGroupKey");
  const groupKeyEnd = adminSource.indexOf("\n    }\n\n    type BoardOrder", groupKeyStart);
  const groupKey = adminSource.slice(groupKeyStart, groupKeyEnd);
  assert.ok(groupKey.indexOf("if (o.reshipperUsername)") < groupKey.indexOf('if (o.routingType === "direct")'));
});