import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GroupBuyMoqProgress } from "./GroupBuyMoqProgress";
import { parseGroupBuyMoq, type GroupBuyMoq } from "../../lib/group-buy-moq";
import { parseProgressResponse, parseUpdatesResponse, saveMoqSettings } from "../../lib/group-buy-updates";

Object.assign(globalThis, { React });
const moq: GroupBuyMoq = {
  enabled: true, targetKits: 100, showToMembers: true, orderedKits: 65.5,
  remainingKits: 34.5, met: false, updatedAt: "2026-10-20T09:00:00.000Z",
};
const render = (value: GroupBuyMoq | null, staff = false) =>
  renderToStaticMarkup(React.createElement(GroupBuyMoqProgress, { moq: value, staff }));

test("members see MOQ quantities and an accessible progress bar only when enabled and public", () => {
  assert.equal(render(null), "");
  assert.equal(render({ ...moq, enabled: false }), "");
  assert.equal(render({ ...moq, showToMembers: false }), "");
  const html = render(moq);
  assert.match(html, /65.5 \/ 100 kits ordered/);
  assert.match(html, /34.5 kits to reach MOQ/);
  assert.match(html, /role="progressbar"/);
  assert.match(html, /aria-valuenow="65.5"/);
  assert.match(render({ ...moq, showToMembers: false }, true), /65.5 \/ 100/);
});

test("quantities above MOQ remain accurate while the bar stops at the target", () => {
  const html = render({ ...moq, orderedKits: 120.5, remainingKits: 0, met: true });
  assert.match(html, /120.5 \/ 100 kits ordered/);
  assert.match(html, /MOQ reached/);
  assert.match(html, /width:100%/);
  assert.match(html, /aria-valuenow="100"/);
});

test("both API parsers retain the MOQ and do not invent it for older responses", () => {
  const detail = { groupBuy: { id: "GB1", name: "Group" }, stage: "open", stageUpdatedAt: null, updates: [], moq };
  assert.deepEqual(parseUpdatesResponse(detail).moq, moq);
  assert.deepEqual(parseProgressResponse({ progress: { GB1: { stage: "open", stageUpdatedAt: null, moq } } }).GB1.moq, moq);
  assert.equal(parseUpdatesResponse({ ...detail, moq: null }).moq, null);
  assert.equal(parseGroupBuyMoq(undefined), null);
  assert.throws(() => parseGroupBuyMoq({ ...moq, orderedKits: NaN }));
  assert.throws(() => parseGroupBuyMoq({ ...moq, targetKits: 0 }));
});

test("saving MOQ sends explicit switches, kit target and the concurrency version", async () => {
  const original = globalThis.fetch;
  let url = "";
  let options: RequestInit | undefined;
  globalThis.fetch = async (input, init) => {
    url = String(input); options = init;
    return new Response(JSON.stringify({
      groupBuy: { id: "GB1", name: "Group" }, stage: "open", stageUpdatedAt: null, updates: [], moq,
    }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    await saveMoqSettings("organiser", "GB1", { enabled: true, targetKits: 100, showToMembers: false }, null);
    assert.equal(url, "/api/organiser/group-buys/GB1/moq");
    assert.equal(options?.method, "PUT");
    assert.equal(options?.credentials, "include");
    assert.deepEqual(JSON.parse(String(options?.body)), {
      enabled: true, targetKits: 100, showToMembers: false, expectedUpdatedAt: null,
    });
    await saveMoqSettings("admin", "GB1", { enabled: false, targetKits: null, showToMembers: false }, moq.updatedAt);
    assert.equal(url, "/api/admin/group-buys/GB1/moq");
  } finally { globalThis.fetch = original; }
});

test("MOQ appears outside the minimized progress disclosure and in shared staff controls and cards", () => {
  const customer = readFileSync(new URL("./CustomerGroupBuyUpdates.tsx", import.meta.url), "utf8");
  const manager = readFileSync(new URL("./GroupBuyUpdatesManager.tsx", import.meta.url), "utf8");
  const card = readFileSync(new URL("./GroupBuyStageBadge.tsx", import.meta.url), "utf8");
  assert.ok(customer.indexOf("<GroupBuyMoqProgress") < customer.indexOf("<details"));
  assert.match(manager, /<GroupBuyMoqSettings moq=\{d\.moq\}/);
  assert.match(card, /<GroupBuyMoqProgress moq=\{moq\} dark compact/);
});
