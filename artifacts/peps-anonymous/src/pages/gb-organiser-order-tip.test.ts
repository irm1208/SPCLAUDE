import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./GbOrganiser.tsx", import.meta.url), "utf8");
const breakdownStart = source.indexOf("{/* Items — always visible */}");
const breakdownEnd = source.indexOf("{/* Reshipper */}", breakdownStart);
const breakdown = source.slice(breakdownStart, breakdownEnd);

test("organiser order breakdown renders a positive tip before the unchanged total", () => {
  const tipRow = breakdown.indexOf("{o.tip > 0 && (");
  const totalRow = breakdown.indexOf(">Total</span>");

  assert.ok(tipRow >= 0, "positive tips should have a conditional Tip row");
  assert.ok(totalRow > tipRow, "the Tip row should appear before Total");
  assert.match(breakdown.slice(tipRow, totalRow), /Tip/);
  assert.match(breakdown.slice(tipRow, totalRow), /\{gb\.currency\}\s*\{o\.tip\.toFixed\(2\)\}/);
});

test("organiser order breakdown does not render a row for zero tips", () => {
  assert.match(breakdown, /\{o\.tip > 0 && \(/);
});

test("tip display leaves the order grand total as its existing value", () => {
  assert.match(breakdown, /\{gb\.currency\}\s*\{o\.grandTotal\.toFixed\(2\)\}/);
});