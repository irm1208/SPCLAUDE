import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./GbOrganiser.tsx", import.meta.url), "utf8");

test("successful organiser deletion updates the actual orders state", () => {
  const start = source.indexOf("const deleteOrgOrder = async");
  const end = source.indexOf("const saveEdit = async", start);
  const handler = source.slice(start, end);

  assert.match(handler, /setOrders\(prev => prev\.filter/);
  assert.doesNotMatch(handler, /setGbOrders/);
});

test("bulk delete is permission-gated and uses the authenticated organiser endpoint", () => {
  const start = source.indexOf("const deleteSelectedOrgOrders = async");
  const end = source.indexOf("const saveEdit = async", start);
  const handler = source.slice(start, end);

  assert.match(handler, /!gb\.organiserCanDeleteOrders/);
  assert.match(handler, /\/api\/organiser\/group-buys\/\$\{gb\.id\}\/orders\/\$\{orderId\}/);
  assert.match(handler, /credentials: "include"/);
  assert.doesNotMatch(handler, /\/api\/admin\/orders/);
  assert.doesNotMatch(handler, /\/api\/reshipper\//);
});

test("bulk delete requires explicit confirmation and reports partial failures", () => {
  assert.match(source, /Confirm delete \$\{selectedOrderIds\.size\}/);
  assert.match(source, /failures\.length.*could not be deleted/);
  assert.match(source, /setOrders\(prev => prev\.filter\(order => !deleted\.has\(order\.id\)\)\)/);
});