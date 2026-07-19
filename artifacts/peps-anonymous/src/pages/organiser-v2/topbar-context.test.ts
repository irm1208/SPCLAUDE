import assert from "node:assert/strict";
import test from "node:test";
import { buildTopbarContext } from "./topbar-context.ts";

test("active context exposes the three option-A summary values", () => {
  assert.deepEqual(buildTopbarContext({
    status: "active",
    memberCount: 148,
    orderCount: 96,
  }), {
    statusLabel: "Open",
    statusTone: "active",
    memberLabel: "148",
    orderLabel: "96",
  });
});

test("draft context keeps zero counts visible", () => {
  assert.deepEqual(buildTopbarContext({ status: "draft" }), {
    statusLabel: "Draft",
    statusTone: "neutral",
    memberLabel: "—",
    orderLabel: "—",
  });
  assert.equal(buildTopbarContext({ status: "draft", memberCount: 0, orderCount: 0 }).memberLabel, "0");
  assert.equal(buildTopbarContext({ status: "draft", memberCount: 0, orderCount: 0 }).orderLabel, "0");
});

test("closed and archived statuses keep neutral presentation", () => {
  assert.equal(buildTopbarContext({ status: "closed", memberCount: 1, orderCount: 1 }).statusLabel, "Closed");
  assert.equal(buildTopbarContext({ status: "archived", memberCount: 1, orderCount: 1 }).statusLabel, "Archived");
});

test("invalid counts use a readable unavailable value", () => {
  const context = buildTopbarContext({ memberCount: -1, orderCount: Number.NaN });
  assert.equal(context.memberLabel, "—");
  assert.equal(context.orderLabel, "—");
});

test("unknown lifecycle values fall back without an active status tone", () => {
  assert.deepEqual(buildTopbarContext({ status: "paused" }), {
    statusLabel: "Group buy",
    statusTone: "neutral",
    memberLabel: "—",
    orderLabel: "—",
  });
});
