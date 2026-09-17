import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./AdminGbFulfilment.tsx", import.meta.url), "utf8");

test("admin fulfilment recognises stablecoin currencies as dollar-denominated", () => {
  const symbolSection = source.slice(
    source.indexOf("const currSymbol"),
    source.indexOf("// ── Responsive"),
  );
  assert.match(symbolSection, /currSym\(currency\)/);
});