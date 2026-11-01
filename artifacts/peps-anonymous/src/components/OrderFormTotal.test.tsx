import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { OrderFormTotal } from "./OrderFormTotal";

Object.assign(globalThis, { React });
const base = {
  total: 88.5, products: 85.5, delivery: 3, vendorShipping: 0,
  adminFee: 0, adminFeeLabel: null, tip: 0, testing: 0,
  shippingPending: false, formatPrice: (amount: number) => `$${amount.toFixed(2)}`, hidden: false,
};

test("93 HGH kits include free delivery without an outstanding quote", () => {
  const html = renderToStaticMarkup(<OrderFormTotal {...base} products={13950} total={13950} delivery={0} deliveryFree />);
  assert.match(html, /FREE/);
  assert.match(html, /\$13950\.00/);
  assert.match(html, /Direct-to-home shipping is free/);
  assert.doesNotMatch(html, /Shipping still to be quoted/);
  assert.doesNotMatch(html, /Final shipping is confirmed/);
});

test("shows the current total and breakdown before reviewing", () => {
  const html = renderToStaticMarkup(<OrderFormTotal {...base} />);
  assert.match(html, /Estimated total/);
  assert.match(html, /\$88\.50/);
  assert.match(html, /Products/);
  assert.match(html, /\$85\.50/);
  assert.match(html, /Delivery/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /credits and discounts/);
});
test("updates when totals change and warns when shipping is not yet quoted", () => {
  const html = renderToStaticMarkup(<OrderFormTotal {...base}
    total={130.5} products={100.5} vendorShipping={10} adminFee={5}
    adminFeeLabel="Organiser fee" tip={2} testing={10} shippingPending />);
  assert.match(html, /\$130\.50/);
  for (const label of ["Vendor shipping", "Organiser fee", "Testing contribution", "Tip", "Shipping still to be quoted is not included"]) {
    assert.ok(html.includes(label));
  }
});
test("does not expose totals when group-buy prices or total are hidden", () => {
  assert.equal(renderToStaticMarkup(<OrderFormTotal {...base} hidden />), "");
});
