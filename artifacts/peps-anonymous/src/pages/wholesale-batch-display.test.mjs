import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pagePath = new URL("./WholesaleOrder.tsx", import.meta.url);

test("Wholesale Order accepts and conditionally displays an authorized batch code", async () => {
  const source = await readFile(pagePath, "utf8");

  assert.match(source, /interface ProductWithMeta\s*\{[\s\S]*?\bbatchCode\?: string;/);
  assert.match(
    source,
    /\{product\.batchCode && \(\s*<p[^>]*>\s*Batch:\s*<span[^>]*>\s*\{product\.batchCode\}/,
  );
});