import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { SharedOrderFulfilmentPills } from "./SharedOrderFulfilmentPills";

test("shows paid and processed statuses using established wholesale wording", () => {
  const html = renderToStaticMarkup(<SharedOrderFulfilmentPills statuses={["Paid", "Processed"]} shareStatus="submitted" />);
  assert.match(html, />Paid</);
  assert.match(html, /Order received by Vendor/);
});
test("retains partial shipping counts from the full server summary", () => {
  const html = renderToStaticMarkup(<SharedOrderFulfilmentPills statuses={["Paid", "Part shipped (2/5)"]} shareStatus="submitted" />);
  assert.match(html, /Part shipped \(2\/5\)/);
  assert.doesNotMatch(html, />Shipped</);
});
test("shows shipped and cancelled without fabricating another state", () => {
  assert.match(renderToStaticMarkup(<SharedOrderFulfilmentPills statuses={["Shipped"]} />), />Shipped</);
  const cancelled = renderToStaticMarkup(<SharedOrderFulfilmentPills statuses={["Cancelled"]} shareStatus="cancelled" />);
  assert.match(cancelled, />Cancelled</);
  assert.doesNotMatch(cancelled, />Paid</);
});
test("unprocessed orders still get a Submitted pill", () => {
  assert.match(renderToStaticMarkup(<SharedOrderFulfilmentPills statuses={[]} shareStatus="submitted" />), />Submitted</);
  const paid = renderToStaticMarkup(<SharedOrderFulfilmentPills statuses={["Paid"]} shareStatus="submitted" />);
  assert.match(paid, />Submitted</);
  assert.match(paid, />Paid</);
});
test("partial processing preserves counts and wholesale wording", () => {
  assert.match(renderToStaticMarkup(<SharedOrderFulfilmentPills statuses={["Part processed (1/3)"]} />), /Part received by Vendor \(1\/3\)/);
});
test("loading and refresh failure never guess an order status", () => {
  assert.match(renderToStaticMarkup(<SharedOrderFulfilmentPills />), /Checking status/);
  const failed = renderToStaticMarkup(<SharedOrderFulfilmentPills statuses={["Shipped"]} unavailable />);
  assert.match(failed, /Status unavailable/);
  assert.doesNotMatch(failed, />Shipped</);
});
