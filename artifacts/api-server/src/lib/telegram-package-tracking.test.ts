import { describe, expect, it } from "vitest";
import type { TrackingPackageView } from "@workspace/shipping/tracking";
import {
  decodeWholesaleTrackingCallback,
  encodeWholesaleTrackingCallback,
  formatTrackingHistory,
  formatTrackingPackagePage,
  isDirectWholesaleTrackingOrder,
} from "./telegram-package-tracking";

const pairedView: TrackingPackageView = {
  id: "pkg-1",
  courier: "bmurfs",
  international: {
    trackingNumber: "SMEX6082643740",
    carrier: "BMURFS Express",
    status: "delivered",
    events: [
      { date: "2026-02-01T10:00:00Z", status: "Left hub", location: "Hong Kong" },
      { date: "2026-02-02T10:00:00Z", status: "International delivery complete", location: "London" },
    ],
    lastChecked: "2026-02-02T10:05:00Z",
  },
  local: null,
  status: "awaiting_local",
  waitingForLocal: true,
};

describe("Telegram wholesale tracking scope", () => {
  it("only admits non-deleted, non-GB, non-shared direct wholesale orders", () => {
    expect(isDirectWholesaleTrackingOrder({ orderType: "wholesale", groupBuyId: null, sharedOrderId: null, deletedAt: null })).toBe(true);
    expect(isDirectWholesaleTrackingOrder({ orderType: "wholesale_shared", groupBuyId: null, sharedOrderId: "share", deletedAt: null })).toBe(false);
    expect(isDirectWholesaleTrackingOrder({ orderType: "wholesale", groupBuyId: "gb", sharedOrderId: null, deletedAt: null })).toBe(false);
    expect(isDirectWholesaleTrackingOrder({ orderType: "wholesale", groupBuyId: null, sharedOrderId: null, deletedAt: new Date() })).toBe(false);
  });
});

describe("Telegram package display", () => {
  it("keeps paired legs together and does not call international delivery final", () => {
    const page = formatTrackingPackagePage("W-100", [pairedView], 0, 2);
    expect(page.text).toContain("Package 1");
    expect(page.text).toContain("International");
    expect(page.text).toContain("SMEX6082643740");
    expect(page.text).toContain("Waiting for local courier tracking");
    expect(page.text).not.toContain("Order delivered");
    expect(page.history).toEqual([{ packageIndex: 0, role: "international", eventCount: 2 }]);
  });

  it("escapes untrusted identifiers, statuses, carriers, and event text", () => {
    const malicious: TrackingPackageView = {
      ...pairedView,
      id: `"><script>`,
      courier: `<b>bad</b>`,
      international: {
        ...pairedView.international,
        trackingNumber: `ABC<&"'`,
        carrier: `<carrier>`,
        status: `<delivered>`,
        events: [{ date: "bad", status: `<img src=x>`, location: `A&B` }],
      },
    };
    const detail = formatTrackingPackagePage(`<order>`, [malicious], 0, 2);
    const history = formatTrackingHistory(`<order>`, malicious, 0, "international", 0, 5);
    expect(detail.text).not.toContain("<script>");
    expect(detail.text).not.toContain("<carrier>");
    expect(detail.text).toContain("&lt;order&gt;");
    expect(history.text).toContain("&lt;img src=x&gt;");
    expect(history.text).toContain("A&amp;B");
    expect(history.text).not.toContain("Invalid Date");
  });

  it("bounds detail and history pages at both ends", () => {
    const views = Array.from({ length: 5 }, (_, index) => ({
      ...pairedView,
      id: `pkg-${index}`,
      international: { ...pairedView.international, trackingNumber: `TRACK-${index}` },
    }));
    expect(formatTrackingPackagePage("W-100", views, -10, 2).page).toBe(0);
    const last = formatTrackingPackagePage("W-100", views, 999, 2);
    expect(last.page).toBe(2);
    expect(last.hasNext).toBe(false);
    expect(last.hasPrevious).toBe(true);

    const firstHistory = formatTrackingHistory("W-100", pairedView, 0, "international", -1, 1);
    expect(firstHistory.page).toBe(0);
    expect(firstHistory.hasPrevious).toBe(false);
    const lastHistory = formatTrackingHistory("W-100", pairedView, 0, "international", 99, 1);
    expect(lastHistory.page).toBe(1);
    expect(lastHistory.hasNext).toBe(false);
  });

  it("shows the newest dated update and sorts history without trusting array order", () => {
    const unordered: TrackingPackageView = {
      ...pairedView,
      international: {
        ...pairedView.international,
        events: [
          { date: "2026-02-03T10:00:00Z", status: "Newest update", location: "Newest place" },
          { date: "not-a-date", status: "Undated update", location: "Unknown" },
          { date: "2026-02-01T10:00:00Z", status: "Oldest update", location: "Old place" },
        ],
      },
    };
    const detail = formatTrackingPackagePage("W-100", [unordered], 0, 1);
    expect(detail.text).toContain("Newest update");
    expect(detail.text).toContain("Newest place");
    expect(detail.text).not.toContain("Oldest update");

    const history = formatTrackingHistory("W-100", unordered, 0, "international", 0, 5);
    expect(history.text.indexOf("Newest update")).toBeLessThan(history.text.indexOf("Oldest update"));
    expect(history.text.indexOf("Oldest update")).toBeLessThan(history.text.indexOf("Undated update"));
  });

  it("keeps a worst-case package page within Telegram's message limit", () => {
    const entities = `&"'`.repeat(100);
    const worst: TrackingPackageView = {
      ...pairedView,
      courier: entities,
      international: {
        trackingNumber: entities,
        carrier: entities,
        status: entities,
        lastChecked: "2026-02-03T10:00:00Z",
        events: [{ date: "2026-02-03T10:00:00Z", status: entities, location: entities }],
      },
      local: {
        trackingNumber: entities,
        carrier: entities,
        status: entities,
        lastChecked: "2026-02-03T10:00:00Z",
        events: [{ date: "2026-02-03T10:00:00Z", status: entities, location: entities }],
      },
    };
    const page = formatTrackingPackagePage(entities, [worst, worst], 0, 1);
    expect(page.text.length).toBeLessThanOrEqual(4096);
    expect(page.hasNext).toBe(true);
  });
});

describe("Telegram wholesale tracking callbacks", () => {
  it("round trips safe callback values and rejects malformed or oversized identifiers", () => {
    const callback = encodeWholesaleTrackingCallback({ kind: "detail", orderCode: "W: 100/α", page: 2 });
    expect(Buffer.byteLength(callback, "utf8")).toBeLessThanOrEqual(64);
    expect(decodeWholesaleTrackingCallback(callback)).toEqual({ kind: "detail", orderCode: "W: 100/α", page: 2 });
    expect(decodeWholesaleTrackingCallback("mn:wtd:not%base64:0")).toBeNull();
    expect(() => encodeWholesaleTrackingCallback({ kind: "detail", orderCode: "x".repeat(100), page: 0 })).toThrow(/64 bytes/);
  });
});