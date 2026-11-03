import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { OrderSupplierBadges } from "./OrderSupplierBadges";
test("shows both suppliers without duplicate or mobile-hidden badges", () => {
  const html = renderToStaticMarkup(<OrderSupplierBadges labels={["Uther", "JBG/YT", "Uther"]} />);
  assert.equal((html.match(/title="Supplier: Uther"/g) ?? []).length, 1);
  assert.ok(html.includes("JBG/YT"));
  assert.ok(!html.includes("hidden"));
});
test("does not substitute Uther for an unknown supplier", () => {
  const html = renderToStaticMarkup(<OrderSupplierBadges labels={["Supplier not recorded"]} />);
  assert.ok(html.includes("Supplier not recorded"));
  assert.ok(!html.includes("Uther"));
});
test("wires badges into individual rows and the combined shared-order header", () => {
  const page = readFileSync(new URL("../../pages/Admin.tsx", import.meta.url), "utf8");
  assert.ok(page.includes("<OrderSupplierBadges labels={order.supplierLabels}"));
  assert.ok(page.includes("<OrderSupplierBadges labels={group.members.flatMap"));
});
