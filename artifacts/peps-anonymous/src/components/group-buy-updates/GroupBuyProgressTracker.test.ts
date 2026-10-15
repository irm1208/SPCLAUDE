import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GroupBuyProgressCompact, GroupBuyProgressTracker } from "./GroupBuyProgressTracker";
import { GB_STAGES, GB_STAGE_LABEL } from "../../lib/group-buy-updates";

// The node/tsx runner uses classic JSX for the app's preserve setting; Vite uses
// the automatic runtime. Supply the classic namespace only in this test process.
Object.assign(globalThis, { React });

test("all six approved stages render with exactly one accessible current stage", () => {
  for (const stage of GB_STAGES) {
    const html = renderToStaticMarkup(createElement(GroupBuyProgressTracker, { stage }));
    for (const label of Object.values(GB_STAGE_LABEL)) assert.ok(html.includes(label));
    assert.equal((html.match(/aria-current="step"/g) ?? []).length, 1);
    assert.ok(html.includes("grid-cols-6"));
  }
});
test("an unloaded tracker does not mark any stage as current or completed", () => {
  const html = renderToStaticMarkup(createElement(GroupBuyProgressTracker, {}));
  assert.ok(!html.includes('aria-current="step"'));
  assert.ok(html.includes("Loading"));
});
test("compact card progress renders the selected stage as text, not colour alone", () => {
  const html = renderToStaticMarkup(createElement(GroupBuyProgressCompact, { stage: "in_transit", gbId: "GB1" }));
  assert.ok(html.includes("In transit"));
  assert.ok(html.includes("step 4 of 6"));
  assert.ok(html.includes('data-testid="gb-progress-compact-GB1"'));
});
