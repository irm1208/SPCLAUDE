import { describe, expect, it } from "vitest";
import {
  normalizeTrackingPackages, getTrackingPackages, flattenTrackingPackages,
  projectTrackingPackages, getOrderTrackingStatus, trackingSnapshot,
  trackingCarrierCode, trackingNumbersChanged,
} from "@workspace/shipping/tracking";

const pair = { id: "package-1", courier: "bmurfs", internationalTrackingNumber: "SMEX6082643740", localTrackingNumber: "HD358713635GB" };
const detail = (trackingNumber: string, status: string) => ({ trackingNumber, status, events: [], lastChecked: "2026-09-05T12:00:00Z" });
const source = (international: string, local?: string) => ({
  trackingPackages: [pair], trackingNumbers: flattenTrackingPackages([pair]),
  trackingDetails: {
    [pair.internationalTrackingNumber]: detail(pair.internationalTrackingNumber, international),
    ...(local ? { [pair.localTrackingNumber]: detail(pair.localTrackingNumber, local) } : {}),
  },
});

describe("explicit physical package tracking", () => {
  it("validates the BMURFS example as one package and preserves both identifiers", () => {
    expect(normalizeTrackingPackages([pair])).toEqual([pair]);
    expect(projectTrackingPackages(source("in_transit", "pending"))).toHaveLength(1);
    expect(flattenTrackingPackages([pair])).toEqual(["SMEX6082643740", "HD358713635GB"]);
  });
  it("normalizes only explicit courier aliases, not number prefixes", () => {
    expect(normalizeTrackingPackages([{ ...pair, courier: "BMURFS Express" }])[0].courier).toBe("bmurfs");
    const old = getTrackingPackages({ trackingNumbers: ["SMEX6082643740", "HD358713635GB"] });
    expect(old).toHaveLength(2);
    expect(old.every(p => p.courier !== "bmurfs" && !p.localTrackingNumber)).toBe(true);
  });
  it("rejects forged local legs, duplicate identifiers and invalid shapes", () => {
    expect(() => normalizeTrackingPackages([{ ...pair, courier: "Royal Mail" }])).toThrow(/BMURFS/);
    expect(() => normalizeTrackingPackages([pair, { ...pair, id: "two" }])).toThrow(/duplicate/i);
    expect(() => normalizeTrackingPackages([{ ...pair, internationalTrackingNumber: "" }])).toThrow();
    expect(() => normalizeTrackingPackages([{ ...pair, id: "__proto__" }])).toThrow();
    expect(() => normalizeTrackingPackages("bad")).toThrow();
  });
  it("does not invent a delivery at the international handover", () => {
    expect(projectTrackingPackages(source("delivered", "in_transit"))[0].status).toBe("in_transit");
    expect(projectTrackingPackages(source("delivered"))[0].status).not.toBe("delivered");
    const noLocal = { ...source("delivered"), trackingPackages: [{ ...pair, localTrackingNumber: null }], trackingNumbers: [pair.internationalTrackingNumber] };
    expect(projectTrackingPackages(noLocal)[0]).toMatchObject({ status: "awaiting_local", waitingForLocal: true, local: null });
  });
  it("local delivery wins over an old international exception", () => {
    expect(projectTrackingPackages(source("seized", "delivered"))[0].status).toBe("delivered");
    expect(getOrderTrackingStatus(projectTrackingPackages(source("seized", "delivered")))).toBe("delivered");
  });
  it("all physical packages must finish before order delivery", () => {
    const completed = projectTrackingPackages(source("delivered", "delivered"));
    const unknown = projectTrackingPackages({ trackingNumber: "OTHER" });
    expect(getOrderTrackingStatus([...completed, ...unknown])).not.toBe("delivered");
    expect(getOrderTrackingStatus([...completed, ...projectTrackingPackages({ trackingNumber: "OTHER", trackingStatus: "exception" })])).toBe("exception");
  });
  it("keeps legacy history only on the original first identifier", () => {
    const old = { trackingNumbers: ["FIRST", "SECOND"], trackingStatus: "delivered", trackingEvents: [{ date: "2026-09-05", status: "Delivered", location: "UK" }], trackingLastChecked: new Date("2026-09-05") };
    const views = projectTrackingPackages(old);
    expect(views[0].international.events).toHaveLength(1);
    expect(views[1].international.events).toEqual([]);
    expect(views[1].status).toBeNull();
  });
  it("ignores stale or malformed grouping without dropping existing numbers", () => {
    const packages = getTrackingPackages({ trackingNumbers: ["NEW", "HD358713635GB"], trackingPackages: [pair] });
    expect(flattenTrackingPackages(packages)).toEqual(["NEW", "HD358713635GB"]);
    expect(packages.every(p => !p.localTrackingNumber)).toBe(true);
  });
  it("ignores mismatched cache keys and never copies the international history to local", () => {
    const views = projectTrackingPackages({ ...source("delivered"), trackingDetails: { [pair.localTrackingNumber]: detail(pair.internationalTrackingNumber, "delivered") } });
    expect(views[0].local?.status).toBeNull();
    expect(views[0].status).not.toBe("delivered");
  });
  it("pins only international BMURFS to its 17track carrier code", () => {
    expect(trackingCarrierCode(pair, "international")).toBe(190843);
    expect(trackingCarrierCode(pair, "local")).toBeUndefined();
    expect(trackingCarrierCode({ ...pair, courier: "other", localTrackingNumber: null }, "international")).toBeUndefined();
  });
  it("treats re-pairing the same identifiers as a no-op for tracking-added alerts", () => {
    expect(trackingNumbersChanged(["A", "B"], ["B", "A"])).toBe(false);
    expect(trackingNumbersChanged(["A"], ["A", "B"])).toBe(true);
    expect(trackingSnapshot(source("delivered", "pending"))).not.toBe(trackingSnapshot({ ...source("delivered", "pending"), trackingPackages: [{ ...pair, localTrackingNumber: null }] }));
  });
});