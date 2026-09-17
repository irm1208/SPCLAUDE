import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./GbOrganiser.tsx", import.meta.url), "utf8");

test("organiser dashboard exposes fulfilment with list and board views", () => {
  assert.match(source, /\| "fulfilment"/);
  assert.match(source, /id: "fulfilment", label: "Fulfilment"/);
  assert.match(source, /function FulfilmentTab/);
  assert.match(source, /setView\("list"\)/);
  assert.match(source, /setView\("board"\)/);
  assert.match(source, /activeTab === "fulfilment"[\s\S]*<FulfilmentTab gb=\{selectedGb\}/);
});

test("fulfilment uses organiser-scoped order data", () => {
  assert.match(source, /organiser\/group-buys\/\$\{gb\.id\}\/orders/);
  assert.doesNotMatch(source, /function FulfilmentTab[\s\S]*?\/api\/admin\//);
});