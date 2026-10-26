import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GroupBuyMoqProgress } from "./GroupBuyMoqProgress";
import { parseGroupBuyMoq } from "../../lib/group-buy-moq";

Object.assign(globalThis, { React });
const base = {
  enabled: true, showToMembers: true, targetKits: null, updatedAt: null,
  orderedKits: 65, paidKits: 34, met: false, remainingKits: null, countMode: "both",
  products: [{ productId: "hgh36", name: "HGH 36IU", targetKits: 50, orderedKits: 65, paidKits: 34 }],
};
const render = (countMode: string) => renderToStaticMarkup(React.createElement(GroupBuyMoqProgress, {
  moq: parseGroupBuyMoq({ ...base, countMode }),
}));
test("both mode shows separate active/paid product progress and overall summaries", () => {
  const html = render("both");
  assert.match(html, /HGH 36IU/);
  assert.match(html, /65 \/ 50 kits ordered/);
  assert.match(html, /34 \/ 50 kits paid/);
  assert.match(html, /16 kits to reach MOQ/);
  assert.match(html, /1 of 1 product MOQs reached.*active/i);
  assert.match(html, /0 of 1 product MOQs reached.*paid/i);
});
test("organiser mode controls which figures members see", () => {
  assert.doesNotMatch(render("active"), /kits paid/);
  assert.doesNotMatch(render("paid"), /kits ordered/);
  assert.match(render("paid"), /34 \/ 50 kits paid/);
});
test("disabled or private per-product targets are never rendered", () => {
  for (const change of [{ enabled: false }, { showToMembers: false }]) {
    assert.equal(renderToStaticMarkup(React.createElement(GroupBuyMoqProgress, {
      moq: parseGroupBuyMoq({ ...base, ...change }),
    })), "");
  }
});
