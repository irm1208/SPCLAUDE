import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), "utf8");

test("GB Organiser V2 bootstraps from the authenticated organiser API", () => {
  const entry = read("../../GbOrganiserV2.tsx");

  assert.match(entry, /useAccount/);
  assert.match(entry, /organiserApi\.profile/);
  assert.match(entry, /organiserApi\.groupBuys/);
  assert.match(entry, /mapApiGroupBuy/);
  assert.match(entry, /\/login\?next=\/gborganiser-v2/);
  assert.match(entry, /<Workspace[\s\S]*groupBuy=/);
  assert.match(entry, /organiserName=/);
});

test("workspace receives a live group buy instead of selecting sample data", () => {
  const workspace = read("../Workspace.tsx");

  assert.doesNotMatch(workspace, /SAMPLE_GBS/);
  assert.match(workspace, /groupBuy:\s*SampleGB/);
  assert.match(workspace, /const gb = groupBuy/);
  assert.match(workspace, /organiserName:\s*string/);
});
