import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WholesaleJourney, getWholesaleNextStep, getWholesaleSummaryTotal, getWholesaleRegionIndex } from "./WholesaleJourney";

test("journey starts with supplier and shows the real review as the fourth stage", () => {
  const html = renderToStaticMarkup(createElement(WholesaleJourney, { step: 0, onStep: () => {} }));
  assert.match(html, /aria-current="step"/);
  assert.ok(html.indexOf("Supplier") < html.indexOf("Products"));
  assert.ok(html.indexOf("Products") < html.indexOf("Delivery"));
  assert.ok(html.indexOf("Delivery") < html.indexOf("Review"));
  assert.match(html, /disabled=""[^>]*>.*?03/s);
});

test("only previous or current steps are reachable from the step navigation", () => {
  const html = renderToStaticMarkup(createElement(WholesaleJourney, { step: 2, onStep: () => {} }));
  assert.equal((html.match(/disabled=""/g) ?? []).length, 1);
});

test("supplier and product continuation gates cannot skip required input", () => {
  assert.equal(getWholesaleNextStep(0, false, 0), 0);
  assert.equal(getWholesaleNextStep(0, true, 0), 1);
  assert.equal(getWholesaleNextStep(1, true, 0), 1);
  assert.equal(getWholesaleNextStep(1, true, 2), 2);
  assert.equal(getWholesaleNextStep(1, false, 2), 1);
  assert.equal(getWholesaleNextStep(2, true, 2), 2);
});

test("summary includes the tip but never treats unknown shipping as free", () => {
  assert.equal(getWholesaleSummaryTotal(150, 50, 12), 212);
  assert.equal(getWholesaleSummaryTotal(150, null, 12), null);
});

test("restored full country names select the supplier's ISO-code shipping region", () => {
  const regions = [{ countries: ["GB"] }, { countries: ["DE", "AT"] }];
  assert.equal(getWholesaleRegionIndex(regions, "United Kingdom"), 0);
  assert.equal(getWholesaleRegionIndex(regions, "UK"), 0);
  assert.equal(getWholesaleRegionIndex(regions, "Austria"), 1);
  assert.equal(getWholesaleRegionIndex(regions, "Canada"), -1);
  assert.equal(getWholesaleRegionIndex([{ countries: ["United Kingdom"] }], "GB"), 0);
  assert.equal(getWholesaleRegionIndex(regions, ""), -1);
});
