import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./GuestContribution.tsx", import.meta.url), "utf8");

test("guest contribution status uses the shared pool access-code fetch helper", () => {
  assert.match(source, /import\s*\{\s*saveTestingPoolAccessCode,\s*testingPoolFetch\s*\}\s*from\s*"\.\/testing-pool-access"/);
  assert.match(source, /testingPoolFetch\(params\.slug,\s*`\/api\/testing-pools\/participants\/\$\{params\.participantId\}\/status`,\s*\{\s*credentials:\s*"include"\s*\}\)/);
});

test("guest contribution prompts on access-code-required and saves then refetches", () => {
  assert.match(source, /access_code_required/);
  assert.match(source, /saveTestingPoolAccessCode\(params\.slug,\s*accessCodeInput\)/);
  assert.match(source, /await refetch\(\)/);
  assert.match(source, /Access code/);
  assert.match(source, /That code did not work/);
});

test("the guest contribution code is not added to the URL", () => {
  assert.doesNotMatch(source, /participantId\}\/status[^`]*accessCode|status\?[^`]*accessCode/);
});