import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./TestingPool.tsx", import.meta.url), "utf8");
const listSource = readFileSync(new URL("./PublicTestingPools.tsx", import.meta.url), "utf8");
let buildTestingPoolHeaders: ((code: string | null, headers?: HeadersInit) => Headers) | undefined;
try {
  ({ buildTestingPoolHeaders } = await import("./testing-pool-access"));
} catch {
  // The header helper does not exist until the implementation is written.
}

test("invite-only pool codes go in headers without dropping existing headers", () => {
  assert.equal(typeof buildTestingPoolHeaders, "function");
  const headers = buildTestingPoolHeaders!("private-code", { "Content-Type": "application/json" });
  assert.equal(headers.get("x-pool-access-code"), "private-code");
  assert.equal(headers.get("Content-Type"), "application/json");
  assert.equal(buildTestingPoolHeaders!(null).has("x-pool-access-code"), false);
});

test("pool details prompt for the code and include it on detail and contribution requests", () => {
  assert.match(source, /access_code_required/);
  assert.match(source, /testingPoolFetch\(slug, `\/api\/testing-pools\/\$\{slug\}`/);
  assert.match(source, /testingPoolFetch\(slug, `\/api\/testing-pools\/\$\{slug\}\/opt-in`/);
  assert.match(source, /pool\.inviteOnly[\s\S]*?Invite-only/);
});

test("private-pool payment and status requests also send the access code", () => {
  assert.doesNotMatch(source, /(?<!Pool)fetch\(`\/api\/testing-pools\/participants\//);
  assert.match(source, /testingPoolFetch\(pool\.slug, `\/api\/testing-pools\/participants\//);
});

test("pool goal includes extra costs and the named report displays its configured price", () => {
  assert.match(source, /pool\.vialCostUsd/);
  assert.match(source, /pool\.shippingCostUsd/);
  assert.match(source, /pool\.organiserTipUsd/);
  assert.match(source, /pool\.namedReportPriceUsd/);
});

test("public pool cards can show and search the chosen lab", () => {
  assert.match(listSource, /labName: string \| null/);
  assert.match(listSource, /p\.labName \? norm\(p\.labName\)/);
  assert.match(listSource, /\{pool\.labName\}/);
});