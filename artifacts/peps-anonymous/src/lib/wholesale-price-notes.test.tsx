import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { WholesalePriceNote } from "../components/WholesalePriceNote";

test("renders readable pricing explanations without interpreting HTML", () => {
  const html = renderToStaticMarkup(<WholesalePriceNote note={'Extra packaging <script>alert(1)</script>'} />);
  assert.match(html, /Price note:/);
  assert.match(html, /Extra packaging/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /whitespace-pre-wrap/);
});
test("products without a note do not take up extra space", () => {
  for (const note of [null, undefined, "", "  "]) {
    assert.equal(renderToStaticMarkup(<WholesalePriceNote note={note} />), "");
  }
});
test("notes are connected to both customer catalogues and the admin editor", () => {
  for (const page of ["WholesaleOrder", "WholesaleShared"]) {
    const source = readFileSync(new URL(`../pages/${page}.tsx`, import.meta.url), "utf8");
    assert.match(source, /<WholesalePriceNote note=\{(?:product|p)\.wholesalePriceNote\}/);
  }
  const admin = readFileSync(new URL("../pages/Admin.tsx", import.meta.url), "utf8");
  assert.match(admin, /JSON\.stringify\(\{ wholesalePriceNote:/);
  assert.match(admin, /Save note/);
  assert.match(admin, /if \(!res\.ok\) throw new Error/);
});
