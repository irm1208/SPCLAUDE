import { describe, expect, it } from "vitest";
import { isClosedAt, issueInput, settingsInput, publicSettings } from "./vendor-portal-extras";
import { VendorPortalError } from "./vendor-portal-model";

const now = new Date("2026-10-31T12:00:00Z");
const status = (fn: () => unknown) => { try { fn(); return 200; } catch (e) { return (e as VendorPortalError).status; } };

describe("vendor settings", () => {
  it("defaults an open-ended closure to start now and clears it when no end date is given", () => {
    const closed = settingsInput({ closedUntil: "2026-11-07T00:00:00Z", closedNote: "  Annual  stocktake " }, now);
    expect(closed.closedFrom).toEqual(now);
    expect(closed.closedNote).toBe("Annual stocktake");
    const open = settingsInput({ closedFrom: "2026-11-01", closedNote: "ignored", handlingDays: "2", defaultCarrier: " Royal Mail " }, now);
    expect(open).toEqual({ closedFrom: null, closedUntil: null, closedNote: null, handlingDays: 2, defaultCarrier: "Royal Mail" });
  });
  it("rejects closures in the past, inverted windows, absurd lengths and bad handling times", () => {
    expect(status(() => settingsInput({ closedUntil: "2026-10-30T00:00:00Z" }, now))).toBe(400);
    expect(status(() => settingsInput({ closedFrom: "2026-11-09", closedUntil: "2026-11-08" }, now))).toBe(400);
    expect(status(() => settingsInput({ closedUntil: "2027-06-01" }, now))).toBe(400);
    expect(status(() => settingsInput({ handlingDays: 1.5 }, now))).toBe(400);
    expect(status(() => settingsInput({ handlingDays: 31 }, now))).toBe(400);
    expect(status(() => settingsInput({ closedUntil: "not a date" }, now))).toBe(400);
  });
  it("is only closed inside the window, and reports that in the public shape", () => {
    const row = { closedFrom: "2026-11-01T00:00:00Z", closedUntil: "2026-11-08T00:00:00Z" };
    expect(isClosedAt(row, new Date("2026-10-31T23:00:00Z"))).toBe(false);
    expect(isClosedAt(row, new Date("2026-11-03T00:00:00Z"))).toBe(true);
    expect(isClosedAt(row, new Date("2026-11-08T00:00:00Z"))).toBe(false);
    expect(isClosedAt(null)).toBe(false);
    expect(publicSettings(null, "vendor-a").closedNow).toBe(false);
    expect(publicSettings({ ...row, updatedBy: "v" }, "vendor-a", new Date("2026-11-03T00:00:00Z"))).toMatchObject({ vendorId: "vendor-a", closedNow: true, updatedBy: "v" });
  });
});

describe("order problem reports", () => {
  it("accepts a known type and trims the note", () => {
    expect(issueInput({ type: "partial_stock", note: "  Only 3 of 5  kits  " })).toEqual({ type: "partial_stock", note: "Only 3 of 5 kits" });
    expect(issueInput({ type: "out_of_stock" })).toEqual({ type: "out_of_stock", note: null });
  });
  it("requires a description for 'other' and rejects unknown types or oversized notes", () => {
    expect(status(() => issueInput({ type: "other" }))).toBe(400);
    expect(status(() => issueInput({ type: "price_too_low" }))).toBe(400);
    expect(status(() => issueInput({ type: "damaged", note: "x".repeat(1001) }))).toBe(400);
    expect(status(() => issueInput(null))).toBe(400);
  });
});
