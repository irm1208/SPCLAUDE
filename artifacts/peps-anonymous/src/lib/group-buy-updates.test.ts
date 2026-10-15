import { test } from "node:test";
import assert from "node:assert/strict";
import {
  displayStage, progressLinkHref, staleUserKeys, GBU_ANCHOR,
  GB_STAGES, GB_STAGE_LABEL, buildUpdateFormData, fallbackStage, gbuKeys, parseProgressResponse, parseUpdatesResponse,
  resolveStage, stepStates, validateDraft, validateImage,
} from "./group-buy-updates";

test("exactly six ordered stages with approved labels", () => {
  assert.deepEqual([...GB_STAGES], ["open", "closed", "ordered", "in_transit", "with_reshipper", "dispatched"]);
  assert.equal(GB_STAGE_LABEL.ordered, "Ordered from vendor");
  assert.equal(GB_STAGE_LABEL.with_reshipper, "With reshipper");
});
test("step states: completed before, one current, upcoming after; none when loading", () => {
  assert.deepEqual(stepStates("in_transit"), ["complete", "complete", "complete", "current", "upcoming", "upcoming"]);
  assert.ok(stepStates(undefined).every(s => s === "upcoming"));
});
test("fallback only derives Open or Closed, never later stages", () => {
  assert.equal(fallbackStage("active"), "open");
  assert.equal(fallbackStage("shipped"), "closed");
  assert.equal(fallbackStage(undefined), undefined);
  assert.equal(resolveStage({ a: { stage: "dispatched", stageUpdatedAt: null } }, "a", "active"), "dispatched");
  assert.equal(resolveStage({}, "b", "closed"), "closed");
});
test("parsers reject invalid stages and sort newest first", () => {
  assert.deepEqual(parseProgressResponse({ progress: { b: { stage: "open", stageUpdatedAt: null } } }), { b: { stage: "open", stageUpdatedAt: null } });
  const r = parseUpdatesResponse({ groupBuy: { id: "g", name: "G" }, stage: "closed", stageUpdatedAt: null, updates: [
    { id: 1, groupBuyId: "g", note: "old", published: true, kind: "note", imageUrl: null, createdAt: "2024-01-01T00:00:00Z", updatedAt: "2024-01-01T00:00:00Z" },
    { id: 2, groupBuyId: "g", note: "new", published: false, kind: "status", stage: "closed", imageUrl: "/x?v=1", createdAt: "2024-02-01T00:00:00Z", updatedAt: "2024-02-01T00:00:00Z" },
  ] });
  assert.equal(r?.updates[0].note, "new");
  assert.equal(r?.updates[0].imageUrl, "/x?v=1");
  assert.throws(() => parseUpdatesResponse({ stage: "nope" }));
});
test("draft + image validation", () => {
  assert.equal(validateDraft("", "  "), "Note is required");
  assert.ok(validateDraft("x".repeat(121), "n"));
  assert.ok(validateDraft("", "x".repeat(5001)));
  assert.equal(validateDraft("", "ok"), null);
  assert.ok(validateImage({ type: "image/svg+xml", size: 10 }));
  assert.ok(validateImage({ type: "image/png", size: 5 * 1024 * 1024 + 1 }));
  assert.equal(validateImage({ type: "image/webp", size: 100 }), null);
});
test("form data contract", () => {
  const fd = buildUpdateFormData({ title: " T ", note: "n", published: false, removeImage: true });
  assert.equal(fd.get("sendTelegramAlert"), "false");
  assert.equal(fd.get("title"), "T");
  assert.equal(fd.get("published"), "false");
  assert.equal(fd.get("removeImage"), "true");
  assert.equal(fd.get("image"), null);
});
test("progress key is scoped by username", () => {
  assert.notDeepEqual(gbuKeys.progress("alice"), gbuKeys.progress("bob"));
});

test("invalid shapes are explicit errors, not empty fallbacks", () => {
  assert.throws(() => parseProgressResponse({}));
  assert.throws(() => parseProgressResponse(null));
  assert.throws(() => parseProgressResponse({ progress: [] }));
  assert.throws(() => parseProgressResponse({ progress: { a: { stage: "bogus" } } }));
  const base = { groupBuy: { id: "g", name: "G" }, stage: "open", stageUpdatedAt: null };
  assert.throws(() => parseUpdatesResponse({ ...base, updates: undefined }));
  assert.throws(() => parseUpdatesResponse({ stage: "open", stageUpdatedAt: null, updates: [] }));
  assert.throws(() => parseUpdatesResponse({ ...base, updates: [{ id: "1" }] }));
  assert.equal(parseUpdatesResponse({ ...base, updates: [] }).updates.length, 0);
});
test("auth change removes only the previous user's keys", () => {
  assert.deepEqual(staleUserKeys("alice", "alice"), []);
  const keys = staleUserKeys("alice", "bob").map(k => JSON.stringify(k));
  assert.ok(keys.every(k => k.includes("alice") && !k.includes("bob")));
  assert.ok(!keys.includes(JSON.stringify(gbuKeys.progress("bob"))));
  assert.deepEqual(staleUserKeys(null, null), []);
});
test("no Open fallback while loading or after a failed first load; keeps loaded data", () => {
  assert.equal(displayStage({ isLoading: true, isError: false, enabled: true }, "a", "active"), undefined);
  assert.equal(displayStage({ isLoading: false, isError: true, enabled: true }, "a", "active"), undefined);
  assert.equal(displayStage({ data: { a: { stage: "ordered", stageUpdatedAt: null } }, isLoading: false, isError: true, enabled: true }, "a", "active"), "ordered");
  assert.equal(displayStage({ data: {}, isLoading: false, isError: false, enabled: true }, "x", "active"), "open");
  assert.equal(displayStage({ isLoading: false, isError: false, enabled: false }, "x", "closed"), "closed");
});
test("progress link targets the order page section anchor", () => {
  assert.equal(progressLinkHref("gb 1"), "/order?gbId=gb%201#group-buy-updates");
  assert.equal(GBU_ANCHOR, "group-buy-updates");
});
