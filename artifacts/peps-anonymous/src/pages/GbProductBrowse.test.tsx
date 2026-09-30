import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GbProductBrowse } from "./GbProductBrowse";

// The app uses Vite's automatic JSX runtime; tsx's node test runner uses the classic runtime.
Object.assign(globalThis, { React });

const product = { id: "alpha", name: "Alpha", category: "Oils", price: 12 };

function render(quantity: number, disabled = false) {
  return renderToStaticMarkup(React.createElement(GbProductBrowse, {
    products: [product],
    categoryOrder: [],
    quantities: new Map(quantity ? [[product.id, quantity]] : []),
    onAdjust: () => {},
    canIncrease: () => !disabled,
    formatPrice: price => `€${price}`,
    hidePrices: false,
    loading: false,
  }));
}

test("selected products show a wide inline quantity stepper instead of a disabled Added button", () => {
  const html = render(3);
  assert.match(html, /aria-label="Decrease Alpha quantity"/);
  assert.match(html, /aria-label="Increase Alpha quantity"/);
  assert.match(html, />3</);
  assert.doesNotMatch(html, />Added</);
});

test("reaching a group-buy limit disables increase but still lets members decrease", () => {
  const html = render(2, true);
  assert.match(html, /aria-label="Decrease Alpha quantity"/);
  assert.match(html, /disabled="" aria-label="Increase Alpha quantity"/);
  assert.doesNotMatch(html, /disabled="" aria-label="Decrease Alpha quantity"/);
});

test("products not yet in the draft show a wide Add button", () => {
  const html = render(0);
  assert.match(html, /aria-label="Add Alpha to order"/);
  assert.match(html, /> Add</);
});