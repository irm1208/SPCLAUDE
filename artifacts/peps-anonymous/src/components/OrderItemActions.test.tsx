import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { OrderItemActions } from "./OrderItemActions";

Object.assign(globalThis, { React });

test("quantity, price and removal controls can wrap without the hint forcing the row wider", () => {
  const html = renderToStaticMarkup(
    <OrderItemActions hints={<p>Quantity is in kits. Half kits are allowed (e.g. 0.5).</p>}>
      <input aria-label="Quantity" defaultValue="1" />
      <span>$345.00</span>
      <button>Remove</button>
    </OrderItemActions>,
  );
  assert.match(html, /flex-wrap/);
  assert.match(html, /aria-label="Quantity"/);
  assert.match(html, /\$345\.00/);
  assert.match(html, /Remove/);
  assert.match(html, /Remove<\/button><\/div><div[^>]*min-w-0[^>]*><p>Quantity/);
});

test("does not add an empty hint row when half kits and limits do not apply", () => {
  const html = renderToStaticMarkup(<OrderItemActions><button>Increase</button></OrderItemActions>);
  assert.match(html, /Increase/);
  assert.equal((html.match(/<div/g) ?? []).length, 2);
});
