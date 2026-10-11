import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { OrderItemsSummary } from "./OrderItemsSummary";

Object.assign(globalThis, { React });

test("full-list order summary is collapsed by default and labels quantities in kits", () => {
  const html = renderToStaticMarkup(<OrderItemsSummary collapsed quantity={2.5} productCount={2}>
    <button>Remove product</button>
  </OrderItemsSummary>);
  assert.match(html, /<details/);
  assert.doesNotMatch(html, /<details[^>]*open/);
  assert.match(html, /Your order \(2\.5 kits\)/);
  assert.match(html, /2 products/);
  assert.match(html, /Remove product/);
});
test("picker mode does not hide its existing editing controls", () => {
  const html = renderToStaticMarkup(<OrderItemsSummary collapsed={false} quantity={1} productCount={1}>
    <input aria-label="Quantity" />
  </OrderItemsSummary>);
  assert.doesNotMatch(html, /details|summary/);
  assert.match(html, /aria-label="Quantity"/);
});
test("empty and single-item summaries remain clear", () => {
  assert.match(renderToStaticMarkup(<OrderItemsSummary collapsed quantity={0} productCount={0}>
    <p>Select products above to start your order.</p>
  </OrderItemsSummary>), /Your order \(0 kits\)/);
  assert.match(renderToStaticMarkup(<OrderItemsSummary collapsed quantity={1} productCount={1}>
    <p>Product</p>
  </OrderItemsSummary>), /Your order \(1 kit\)/);
});
