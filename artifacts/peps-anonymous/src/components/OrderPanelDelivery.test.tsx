import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { OrderPanelDelivery } from "./OrderPanelDelivery";

Object.assign(globalThis, { React });
const props = {
  options: [
    { id: "royal", name: "Royal Mail", price: 7 },
    { id: "inpost", name: "InPost", price: 0 },
    { id: "__direct_shipping", name: "Direct to Home", price: null, requiresAddress: true },
  ],
  selectedId: "royal",
  onSelect: () => {},
  formatPrice: (price: number) => `$${price.toFixed(2)}`,
};
test("shows delivery choices with selected state, fees, free and unquoted shipping", () => {
  const html = renderToStaticMarkup(<OrderPanelDelivery {...props} />);
  assert.match(html, /Delivery/);
  assert.match(html, /checked=""[^>]*value="royal"/);
  assert.match(html, /\$7\.00/);
  assert.match(html, /Free/);
  assert.match(html, /Quote required/);
  assert.match(html, /shipping details on the main form/i);
});
test("top-ups keep their parent's delivery, without selectable alternatives", () => {
  const html = renderToStaticMarkup(<OrderPanelDelivery {...props} lockedName="Parent delivery" />);
  assert.match(html, /Parent delivery/);
  assert.match(html, /Included from your previous order/);
  assert.doesNotMatch(html, /type="radio"/);
});
test("preview is read-only, hidden prices stay hidden, and loading or missing options are explicit", () => {
  const html = renderToStaticMarkup(<OrderPanelDelivery {...props} disabled hidePrices />);
  assert.match(html, /disabled=""/);
  assert.doesNotMatch(html, /\$7\.00|Free|Quote required/);
  assert.match(renderToStaticMarkup(<OrderPanelDelivery {...props} loading />), /Loading delivery options/);
  assert.match(renderToStaticMarkup(<OrderPanelDelivery {...props} options={[]} />), /No delivery options available/);
});
