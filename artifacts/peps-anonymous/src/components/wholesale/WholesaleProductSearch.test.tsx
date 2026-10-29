import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WholesaleProductSearch } from "./WholesaleProductSearch";

test("floating catalogue search is accessible and retains the current query", () => {
  const html = renderToStaticMarkup(createElement(WholesaleProductSearch, { value: "HGH", onChange: () => {} }));
  assert.match(html, /role="search"/);
  assert.match(html, /class="whj-floating-search"/);
  assert.match(html, /aria-label="Search supplier products"/);
  assert.match(html, /value="HGH"/);
  assert.match(html, /aria-label="Clear product search"/);
});

test("empty search does not show an unnecessary clear button", () => {
  const html = renderToStaticMarkup(createElement(WholesaleProductSearch, { value: "", onChange: () => {} }));
  assert.doesNotMatch(html, /Clear product search/);
});
