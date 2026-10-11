import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { OrderPanelContents } from "./OrderSidePanel";

Object.assign(globalThis, { React });
const items = [{ id: "1", productName: "SS31 50mg", quantity: 2.5, lineTotal: 125 }];
const formatPrice = (value: number) => `$${value.toFixed(2)}`;

test("side panel shows selected items, kit quantities and the same estimated total", () => {
  const html = renderToStaticMarkup(<OrderPanelContents items={items} total={132} formatPrice={formatPrice} hidePrices={false} hideTotal={false} shippingPending={false} />);
  assert.match(html, /SS31 50mg/);
  assert.match(html, /2\.5 kits/);
  assert.match(html, /\$125\.00/);
  assert.match(html, /Estimated total/);
  assert.match(html, /\$132\.00/);
  assert.match(html, /credits and discounts/i);
});

test("side panel respects hidden prices and totals", () => {
  const html = renderToStaticMarkup(<OrderPanelContents items={items} total={132} formatPrice={formatPrice} hidePrices hideTotal shippingPending={false} />);
  assert.match(html, /SS31 50mg/);
  assert.doesNotMatch(html, /\$|Estimated total/);
});

test("side panel handles an empty order and unquoted shipping", () => {
  const html = renderToStaticMarkup(<OrderPanelContents items={[]} total={0} formatPrice={formatPrice} hidePrices={false} hideTotal={false} shippingPending />);
  assert.match(html, /No products added yet/);
  assert.match(html, /\$0\.00/);
  assert.match(html, /shipping has not been quoted/i);
});
