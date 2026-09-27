import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./AdminTestingPools.tsx", import.meta.url), "utf8");

test("pool settings form exposes configurable named report and separate pool costs", () => {
  for (const field of [
    "labName",
    "namedReportPriceUsd",
    "vialCostUsd",
    "shippingCostUsd",
    "organiserTipUsd",
    "inviteOnly",
    "accessCode",
  ]) {
    assert.match(source, new RegExp(`\\b${field}\\s*:`), `missing form state for ${field}`);
  }
  assert.match(source, /Named Report Fee/);
  assert.match(source, /Vial Cost/);
  assert.match(source, /Shipping Cost/);
  assert.match(source, /Organiser Tip/);
  assert.match(source, /Invite-only/);
  assert.match(source, /Share this access code/);
  assert.match(source, /Custom Lab/);
});

test("create and edit map the standalone settings while blank edit codes are omitted", () => {
  assert.match(source, /namedReportPriceUsd: "30", vialCostUsd: "0", shippingCostUsd: "0", organiserTipUsd: "0"/);
  assert.match(source, /labName:\s*data\.labName\s*\?\?\s*""/);
  assert.match(source, /namedReportPriceUsd:\s*String\(/);
  assert.match(source, /vialCostUsd:\s*String\(/);
  assert.match(source, /shippingCostUsd:\s*String\(/);
  assert.match(source, /organiserTipUsd:\s*String\(/);
  assert.match(source, /if\s*\(form\.accessCode\.trim\(\)\)\s*patchBody\.accessCode/);
  assert.match(source, /labName:\s*form\.labName\.trim\(\)\s*\|\|\s*null/);
  assert.match(source, /inviteOnly:\s*form\.inviteOnly/);
  assert.match(source, /namedReportPriceUsd:/);
  assert.match(source, /vialCostUsd:/);
  assert.match(source, /shippingCostUsd:/);
  assert.match(source, /organiserTipUsd:/);
  assert.match(source, /accessCode:\s*form\.inviteOnly\s*\?\s*form\.accessCode\.trim\(\)\s*:\s*undefined/);
  assert.match(source, /inviteOnly:\s*form\.inviteOnly/);
  assert.match(source, /if\s*\(form\.accessCode\.trim\(\)\)\s*patchBody\.accessCode\s*=\s*form\.accessCode\.trim\(\)/);
  assert.match(source, /const accessCodeRequired = form\.inviteOnly && \(isCreate \|\| !initialForm\.inviteOnly\) && !form\.accessCode\.trim\(\)/);
});

test("custom tests can be added independently of catalog entries", () => {
  assert.match(source, /Add Custom Test/);
  assert.match(source, /catalogId:\s*null/);
  assert.match(source, /newTestCode/);
  assert.match(source, /newTestName/);
  assert.match(source, /newTestPrice/);
});

test("changed pool tests use one atomic combined PUT with pool updates", () => {
  assert.match(source, /function poolTestRowsEqual\(/);
  const editMutation = source.slice(source.indexOf("const editPool = useMutation"));
  const changedBranch = editMutation.match(/if\s*\(!poolTestRowsEqual\(tests,\s*originalTests\)\)\s*\{([\s\S]*?)\}\s*else\s*\{/);
  assert.ok(changedBranch, "changed and unchanged rows must use separate request branches");
  assert.match(changedBranch![1], /fetch\(`\/api\/admin\/testing-pools\/\$\{id\}\/tests`,[\s\S]*?method:\s*"PUT"[\s\S]*?JSON\.stringify\(\{\s*tests,\s*poolUpdates:\s*patchBody\s*\}\)/);
  assert.doesNotMatch(changedBranch![1], /method:\s*"PATCH"/);
});

test("unchanged pool tests use PATCH only", () => {
  const editMutation = source.slice(source.indexOf("const editPool = useMutation"));
  assert.match(editMutation, /else\s*\{[\s\S]*?fetch\(`\/api\/admin\/testing-pools\/\$\{id\}`, \{\s*method:\s*"PATCH"[\s\S]*?JSON\.stringify\(patchBody\)/);
  assert.equal((editMutation.match(/fetch\(`\/api\/admin\/testing-pools\/\$\{id\}\/tests`/g) ?? []).length, 1);
});

test("editing preserves an existing invite code when blank and validates monetary fields", () => {
  assert.match(source, /if\s*\(form\.accessCode\.trim\(\)\)\s*patchBody\.accessCode\s*=\s*form\.accessCode\.trim\(\)/);
  assert.match(source, /fixedFeeInvalid[\s\S]*?Number\(form\.fixedOptInFeeUsd\)\s*<\s*1/);
  assert.match(source, /Fixed opt-in fee must be at least \$1\.00/);
  assert.match(source, /amountsInvalid[\s\S]*?Number\(value\)\s*<\s*0/);
  assert.match(source, /Pool cost and named-report amounts must be nonnegative/);
});