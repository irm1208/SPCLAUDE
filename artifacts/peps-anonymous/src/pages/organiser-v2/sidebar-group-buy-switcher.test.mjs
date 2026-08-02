import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = file => readFileSync(new URL(file, import.meta.url), "utf8");
const sidebar = read("./DashboardSidebar.tsx");
const workspace = read("./Workspace.tsx");

test("sidebar current-group-buy card opens the existing group-buy picker", () => {
  assert.match(sidebar, /onChooseGroupBuy\?:\s*\(\)\s*=>\s*void/);
  assert.match(sidebar, /className="ov2-active-gb-card"[\s\S]*?onClick=\{onChooseGroupBuy\}/);
  assert.match(sidebar, /aria-haspopup="dialog"/);
  assert.match(sidebar, /const cardKicker = "Select group buy"/);
  assert.doesNotMatch(
    sidebar,
    /className="ov2-active-gb-card"[\s\S]*?onClick=\{\(\)\s*=>\s*selectTab\("overview"\)\}/,
  );
  assert.match(
    workspace,
    /<DashboardSidebar[\s\S]*?onChooseGroupBuy=\{onChooseGroupBuy\}/,
  );
});