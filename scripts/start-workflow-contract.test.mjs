import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const startScript = readFileSync(new URL("../start.sh", import.meta.url), "utf8");

test("canonical workflow starts the API on port 8080 regardless of inherited PORT", () => {
  assert.match(
    startScript,
    /PORT=8080 NODE_ENV=development pnpm --filter @workspace\/api-server run dev/,
  );
});