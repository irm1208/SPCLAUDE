import { describe, expect, it } from "vitest";
import {
  TERMINAL_TRACKING_STATUSES,
  TRACKING_FAILURE_BACKOFF_MS,
  TRACKING_MANUAL_REFRESH_COOLDOWN_MS,
  TRACKING_SCHEDULER_INTERVAL_MS,
  TRACKING_STALE_AFTER_MS,
  isTrackingRefreshDue,
  isManualTrackingRefreshAllowed,
  normalizeTrackingNumber,
  trackingRefreshKey,
} from "./tracking-refresh-policy";

describe("tracking refresh policy", () => {
  const now = Date.UTC(2026, 0, 2, 12);

  it("defines the six-hour refresh interval and scheduler timings", () => {
    expect(TRACKING_STALE_AFTER_MS).toBe(6 * 60 * 60 * 1000);
    expect(TRACKING_SCHEDULER_INTERVAL_MS).toBe(60 * 60 * 1000);
    expect(TRACKING_FAILURE_BACKOFF_MS).toBe(30 * 60 * 1000);
    expect(TRACKING_MANUAL_REFRESH_COOLDOWN_MS).toBe(5 * 60 * 1000);
  });

  it("treats missing, invalid, and stale timestamps as due for active tracking", () => {
    expect(isTrackingRefreshDue(null, "in_transit", now)).toBe(true);
    expect(isTrackingRefreshDue("not a timestamp", "in_transit", now)).toBe(true);
    expect(isTrackingRefreshDue(new Date(now - TRACKING_STALE_AFTER_MS - 1), "in_transit", now)).toBe(true);
  });

  it("treats noncanonical Date.parse-accepted strings as invalid", () => {
    const septemberNow = Date.UTC(2026, 8, 6, 12);
    expect(isTrackingRefreshDue("09/06/2026 12:00:00", "in_transit", septemberNow)).toBe(true);
  });

  it("does not refresh a timestamp that is less than six hours old", () => {
    expect(isTrackingRefreshDue(new Date(now - TRACKING_STALE_AFTER_MS + 1), "in_transit", now)).toBe(false);
  });

  it("never refreshes terminal tracking, even with missing timestamps", () => {
    for (const status of TERMINAL_TRACKING_STATUSES) {
      expect(isTrackingRefreshDue(null, status, now)).toBe(false);
    }
  });

  it("suppresses terminal and recently manually checked tracking", () => {
    expect(isManualTrackingRefreshAllowed(null, "delivered", now)).toBe(false);
    expect(isManualTrackingRefreshAllowed(new Date(now - 4 * 60 * 1000), "in_transit", now)).toBe(false);
    expect(isManualTrackingRefreshAllowed(new Date(now - TRACKING_MANUAL_REFRESH_COOLDOWN_MS), "in_transit", now)).toBe(true);
    expect(isManualTrackingRefreshAllowed(null, "in_transit", now)).toBe(true);
  });

  it("normalizes tracking numbers and creates carrier-specific refresh keys", () => {
    expect(normalizeTrackingNumber(" ab 123 ")).toBe("AB123");
    expect(trackingRefreshKey("orders", " ab 123 ", 3011)).toBe("orders:AB123:3011");
    expect(trackingRefreshKey("orders", "ab 123")).toBe("orders:AB123:0");
  });
});