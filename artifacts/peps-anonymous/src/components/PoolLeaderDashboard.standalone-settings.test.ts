import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./PoolLeaderDashboard.tsx", import.meta.url), "utf8");

test("leader create modal sends standalone fields and supports independent custom tests", () => {
  const create = source.slice(source.indexOf("function CreatePoolModal"), source.indexOf("// ─── Edit Pool Modal"));
  for (const field of ["labName", "namedReportPriceUsd", "vialCostUsd", "shippingCostUsd", "organiserTipUsd", "inviteOnly", "accessCode"]) {
    assert.match(create, field === "inviteOnly" ? /\binviteOnly[,}]/ : new RegExp(`\\b${field}\\s*:`), `create payload missing ${field}`);
  }
  assert.match(create, /useState\("30"\)/, "named report fee should default to $30");
  assert.match(create, /Add Custom Test/);
  assert.match(create, /catalogId:\s*undefined/);
  assert.match(create, /Total target/);
  assert.match(create, /additionalCosts/);
  assert.match(create, /accessCodeRequired/);
});

test("leader edit modal preserves write-only codes and updates standalone fields and tests", () => {
  const edit = source.slice(source.indexOf("function EditPoolModal"));
  for (const field of ["labName", "namedReportPriceUsd", "vialCostUsd", "shippingCostUsd", "organiserTipUsd", "inviteOnly"]) {
    assert.match(edit, field === "inviteOnly" ? /\binviteOnly[,}]/ : new RegExp(`\\b${field}\\s*:`), `edit payload missing ${field}`);
  }
  assert.match(edit, /accessCode:\s*accessCode\.trim\(\)\s*\|\|\s*undefined/);
  assert.match(edit, /\.\.\.\(inviteOnly && pool\.inviteOnly && !accessCode\.trim\(\) \? \{\} : \{ inviteOnly \}\)/);
  assert.match(edit, /accessCodeRequired/);
  assert.match(edit, /\/tests/);
  assert.match(edit, /Add Custom Test/);
  assert.match(edit, /value=\{accessCode\}/);
  assert.match(edit, /Goal preview/);
  assert.doesNotMatch(edit, /pool\.accessCode/);
});

test("leader test editing preserves API test ids and catalog identity through replacement payload", () => {
  const edit = source.slice(source.indexOf("function EditPoolModal"));
  assert.match(edit, /id:\s*t\.id/, "GET detail id must be retained in editor state");
  assert.match(edit, /catalogId:\s*t\.catalogId/, "GET detail catalogId must be retained in editor state");
  assert.match(edit, /JSON\.stringify\(editedTests\s*\?\s*\{\s*tests:\s*editedTests,\s*poolUpdates\s*\}/, "replacement PUT must send retained test identities and pool updates");
  assert.match(source, /type PendingTest\s*=\s*\{\s*id\?:\s*string;/, "test editor model must carry stable IDs");
});

test("leader goal preview follows selected tests and one first-selected vial surcharge", () => {
  const edit = source.slice(source.indexOf("function EditPoolModal"));
  assert.match(edit, /tests\.filter\(test => test\.selected !== false\)/, "unselected tests must not increase the target");
  assert.match(edit, /selectedTests\[0\].quantity/, "extra vials are based on the first selected test quantity");
  assert.match(edit, /Math\.max\(0,\s*selectedTests\[0\]\.quantity\s*-\s*1\)\s*\*\s*60/, "charge $60 once per extra vial");
  assert.match(edit, /Number\(vialCostUsd \|\| 0\)\s*\+\s*Number\(shippingCostUsd \|\| 0\)\s*\+\s*Number\(organiserTipUsd \|\| 0\)/, "additional pool costs are included");
});

test("leader edit submits pool updates atomically with changed tests and patches only when unchanged", () => {
  const edit = source.slice(source.indexOf("function EditPoolModal"));
  assert.match(edit, /const poolUpdates\s*=\s*\{/);
  assert.match(edit, /method:\s*editedTests\s*\?\s*"PUT"\s*:\s*"PATCH"/);
  assert.match(edit, /editedTests\s*\?\s*\{ tests:\s*editedTests,\s*poolUpdates \}\s*:\s*poolUpdates/);
  assert.doesNotMatch(edit, /fetch\(`\/api\/account\/pool-leader\/pools\/\$\{pool\.id\}\/tests`/);
  assert.doesNotMatch(edit, /const testsResponse/);
});

test("pool pricing keeps goal costs together and named reports outside the goal", () => {
  const create = source.slice(source.indexOf("function CreatePoolModal"), source.indexOf("// ─── Edit Pool Modal"));
  const edit = source.slice(source.indexOf("function EditPoolModal"));
  const summary = source.slice(source.indexOf("function PoolGoalBreakdown"), source.indexOf("function CreatePoolModal"));

  for (const modal of [create, edit]) {
    const tests = modal.indexOf("Pool Tests") >= 0 ? modal.indexOf("Pool Tests") : modal.indexOf("Payment Order");
    const costs = modal.indexOf("Pool-wide costs");
    const goal = modal.indexOf("<PoolGoalBreakdown");
    const addOn = modal.indexOf("Contributor Add-ons");
    assert.ok(tests >= 0 && tests < costs && costs < goal && goal < addOn, "tests, costs, goal, and optional report must appear in that order");
    assert.match(modal, /Vial Cost[\s\S]*Shipping Cost[\s\S]*Organiser Tip/);
  }
  for (const label of ["Test prices", "Extra vials", "Vial cost", "Shipping", "Organiser tip", "Funding goal"]) {
    assert.ok(summary.includes(label), `itemised goal missing ${label}`);
  }
  assert.match(summary, /already included in the test price/);
  assert.match(summary, /Named reports are optional and charged separately/);
  assert.doesNotMatch(summary, /namedReportPriceUsd/);
});