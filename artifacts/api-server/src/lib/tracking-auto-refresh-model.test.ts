import { describe, expect, it } from "vitest";
import {
  mergeWholesaleParcelResults,
  parcelNeedsRefresh,
  selectWholesaleCompatibilityFields,
  reconcileWholesaleTrackingCache,
  shouldSkipWholesaleRefresh,
} from "./tracking-auto-refresh-model";

const prior = {
  FIRST: { trackingNumber: "FIRST", status: "in_transit", events: [{ date: "old", status: "Old", location: "" }], lastChecked: "old" },
  SECOND: { trackingNumber: "SECOND", status: "pending", events: [], lastChecked: "old" },
};

describe("direct wholesale parcel refresh model", () => {
  it("keeps distinct successful results for multiple tracking numbers", () => {
    const merged = mergeWholesaleParcelResults(prior, {
      FIRST: { trackingNumber: "FIRST", status: "delivered", statusCode: "40", events: [], lastChecked: "new" },
      SECOND: { trackingNumber: "SECOND", status: "in_transit", statusCode: "10", events: [], lastChecked: "new" },
    });
    expect(merged.FIRST.status).toBe("delivered");
    expect(merged.SECOND.status).toBe("in_transit");
  });

  it("preserves a previous parcel when that lookup is unavailable", () => {
    const merged = mergeWholesaleParcelResults(prior, {
      FIRST: { trackingNumber: "FIRST", status: "delivered", events: [], lastChecked: "new" },
    });
    expect(merged.SECOND).toEqual(prior.SECOND);
  });

  it("skips a terminal parcel while refreshing a missing or nonterminal sibling", () => {
    expect(parcelNeedsRefresh({ ...prior.FIRST, status: "delivered" })).toBe(false);
    expect(parcelNeedsRefresh(prior.SECOND)).toBe(true);
    expect(parcelNeedsRefresh(undefined)).toBe(true);
  });

  it("selects legacy compatibility fields from the canonical primary parcel", () => {
    expect(selectWholesaleCompatibilityFields(["SECOND", "FIRST"], {
      FIRST: prior.FIRST,
      SECOND: { trackingNumber: "SECOND", status: "delivered", events: [], lastChecked: "2026-01-02T00:00:00Z" },
    }, { trackingStatus: "pending", trackingEvents: [], trackingLastChecked: null })).toEqual({
      trackingStatus: "delivered", trackingEvents: [], trackingLastChecked: new Date("2026-01-02T00:00:00Z"),
    });
  });

  it("reconciles replaced tracking numbers without retaining stale history", () => {
    expect(reconcileWholesaleTrackingCache(["FIRST", "SECOND"], ["NEW", "SECOND"], prior)).toEqual({
      trackingDetails: { SECOND: prior.SECOND },
      trackingStatus: null, trackingEvents: null, trackingLastChecked: null,
    });
  });

  it("removes a deleted secondary but preserves cache and legacy fields for an unchanged list", () => {
    expect(reconcileWholesaleTrackingCache(["FIRST", "SECOND"], ["FIRST"], prior).trackingDetails).toEqual({ FIRST: prior.FIRST });
    expect(reconcileWholesaleTrackingCache(["FIRST", "SECOND"], ["FIRST", "SECOND"], prior)).toEqual({
      trackingDetails: prior,
    });
  });

  it("skips a fully terminal complete cache but not a missing sibling", () => {
    expect(shouldSkipWholesaleRefresh(["FIRST", "SECOND"], {
      FIRST: { ...prior.FIRST, status: "delivered" },
      SECOND: { ...prior.SECOND, status: "expired" },
    })).toBe(true);
    expect(shouldSkipWholesaleRefresh(["FIRST", "SECOND"], {
      FIRST: { ...prior.FIRST, status: "delivered" },
    })).toBe(false);
  });
});