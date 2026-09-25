import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("generated API validators use Zod 3-compatible schemas", () => {
  const generatedApi = readFileSync(
    new URL("../api-zod/src/generated/api.ts", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(generatedApi, /\bzod\.(?:int|url)\(\)/);
});

test("generated type barrel excludes names already exported as Zod schemas", () => {
  const generatedTypesIndex = readFileSync(
    new URL("../api-zod/src/generated/types/index.ts", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(
    generatedTypesIndex,
    /^export \* from ['"]\.\/(?:adminAddLabTestBody|adminUpdateLabTestBody|adminUpdateTicketStatusBody)['"];?$/m,
  );
});