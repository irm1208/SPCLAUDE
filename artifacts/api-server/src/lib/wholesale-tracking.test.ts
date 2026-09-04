import { describe, expect, it } from "vitest";
import {
  classifyTrackingStatus,
  hasWholesaleTrackingOptIn,
  isWholesaleTrackingAlertStatus,
  shouldApplyWholesaleTrackingClassification,
  toggleWholesaleTrackingPreference,
} from "./wholesale-tracking";

describe("wholesale tracking status classification", () => {
  it("lets explicit redirected, seized, and return-to-sender events override Track17's generic status", () => {
    expect(classifyTrackingStatus("in_transit", [{ date: "2026-01-01T10:00:00Z", description: "Shipment redirected to a new address" }])).toBe("redirected");
    expect(classifyTrackingStatus("exception", [{ date: "2026-01-01T10:00:00Z", description: "Package seized by customs" }])).toBe("seized");
    expect(classifyTrackingStatus("exception", [{ date: "2026-01-01T10:00:00Z", description: "Parcel is being returned to sender" }])).toBe("return_to_sender");
  });

  it("keeps uncertain customs wording as an exception", () => {
    expect(classifyTrackingStatus("exception", [{ date: "2026-01-01T10:00:00Z", description: "Held by customs for inspection" }])).toBe("exception");
  });

  it("keeps a later delivered base status ahead of historical special event wording", () => {
    expect(classifyTrackingStatus("delivered", [
      { date: "2026-01-01T10:00:00Z", description: "Shipment redirected to a new address" },
      { date: "2026-01-02T10:00:00Z", description: "Delivered to recipient" },
    ])).toBe("delivered");
  });

  it("does not let an old special event override a newer in-transit event", () => {
    expect(classifyTrackingStatus("in_transit", [
      { date: "2026-01-01T10:00:00Z", description: "Parcel returned to sender" },
      { date: "2026-01-02T10:00:00Z", description: "Departed sorting facility" },
    ])).toBe("in_transit");
  });

  it("does not classify negated or unrelated current wording as special", () => {
    expect(classifyTrackingStatus("in_transit", [{ date: "", description: "Package not redirected" }])).toBe("in_transit");
    expect(classifyTrackingStatus("exception", [{ date: "", description: "Package not seized by customs" }])).toBe("exception");
    expect(classifyTrackingStatus("in_transit", [{ date: "", description: "Address details updated" }])).toBe("in_transit");
  });

  it("falls back to Track17 when dated events are mixed with undated events", () => {
    expect(classifyTrackingStatus("in_transit", [
      { date: "2026-01-01T10:00:00Z", description: "Shipment redirected to a new address" },
      { date: "", description: "Departed sorting facility" },
    ])).toBe("in_transit");
  });

  it("falls back to Track17 when tied newest events disagree", () => {
    expect(classifyTrackingStatus("exception", [
      { date: "2026-01-02T10:00:00Z", description: "Package seized by customs" },
      { date: "2026-01-02T10:00:00Z", description: "Shipment redirected to a new address" },
    ])).toBe("exception");
  });

  it("only allows important direct wholesale alert statuses", () => {
    expect(isWholesaleTrackingAlertStatus("delivered")).toBe(true);
    expect(isWholesaleTrackingAlertStatus("redirected")).toBe(true);
    expect(isWholesaleTrackingAlertStatus("seized")).toBe(true);
    expect(isWholesaleTrackingAlertStatus("return_to_sender")).toBe(true);
    expect(isWholesaleTrackingAlertStatus("exception")).toBe(false);
    expect(isWholesaleTrackingAlertStatus("in_transit")).toBe(false);
  });

  it("requires an explicit wholesale tracking opt-in", () => {
    expect(hasWholesaleTrackingOptIn(undefined)).toBe(false);
    expect(hasWholesaleTrackingOptIn({})).toBe(false);
    expect(hasWholesaleTrackingOptIn({ wholesale_tracking: false })).toBe(false);
    expect(hasWholesaleTrackingOptIn({ wholesale_tracking: true })).toBe(true);
  });

  it("turns a missing wholesale tracking preference on when toggled", () => {
    expect(toggleWholesaleTrackingPreference({ status: true })).toMatchObject({
      status: true,
      wholesale_tracking: true,
    });
  });

  it("limits special classification to direct wholesale orders", () => {
    expect(shouldApplyWholesaleTrackingClassification("wholesale")).toBe(true);
    expect(shouldApplyWholesaleTrackingClassification("wholesale_shared")).toBe(false);
    expect(shouldApplyWholesaleTrackingClassification(null)).toBe(false);
  });
});