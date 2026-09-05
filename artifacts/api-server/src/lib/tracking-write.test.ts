import { describe, expect, it } from "vitest";
import { prepareTrackingWrite } from "./tracking-write";

const pair = {
  id: "parcel-a",
  courier: "bmurfs",
  internationalTrackingNumber: "SMEX6082643740",
  localTrackingNumber: "HD358713635GB",
};

describe("prepareTrackingWrite", () => {
  it("persists an explicit BMURFS pair without duplicating shipped items onto its local leg", () => {
    const items = [{ name: "Example", qty: 2 }];
    const result = prepareTrackingWrite(
      {
        trackingNumber: "SMEX6082643740",
        trackingNumbers: ["SMEX6082643740", "HD358713635GB"],
        trackingPackages: null,
        trackingDetails: {},
        trackingShippedItems: {
          SMEX6082643740: items,
          HD358713635GB: items,
        },
      },
      { trackingPackages: [pair], items },
    );

    expect(result.updates).toMatchObject({
      trackingNumber: "SMEX6082643740",
      trackingNumbers: ["SMEX6082643740", "HD358713635GB"],
      trackingPackages: [pair],
      trackingShippedItems: { SMEX6082643740: items },
    });
    expect(result.numbersChanged).toBe(false);
    expect(result.groupingChanged).toBe(true);
    expect(result.shouldNotify).toBe(false);
  });

  it("rejects local legs for non-BMURFS couriers", () => {
    expect(() => prepareTrackingWrite(
      { trackingNumber: null, trackingNumbers: null, trackingPackages: null },
      {
        trackingPackages: [{
          ...pair,
          courier: "Royal Mail",
        }],
      },
    )).toThrow(/BMURFS/i);
  });

  it("rejects conflicting flat and structured tracking payloads", () => {
    expect(() => prepareTrackingWrite(
      { trackingNumber: null, trackingNumbers: null, trackingPackages: null },
      {
        trackingPackages: [pair],
        trackingNumbers: ["DIFFERENT"],
      },
    )).toThrow(/conflict/i);
  });

  it("merges bulk amendments only by stable id or exact international number", () => {
    const unrelated = {
      id: "parcel-b",
      courier: "DHL",
      internationalTrackingNumber: "DHL-ONE",
      localTrackingNumber: null,
    };
    const result = prepareTrackingWrite(
      {
        trackingNumber: pair.internationalTrackingNumber,
        trackingNumbers: [pair.internationalTrackingNumber, unrelated.internationalTrackingNumber],
        trackingPackages: [{ ...pair, localTrackingNumber: null }, unrelated],
      },
      { trackingPackages: [pair] },
      { mergePackages: true },
    );

    expect(result.updates.trackingPackages).toEqual([pair, unrelated]);
  });

  it("can explicitly pair two legacy entries without retaining a duplicate local package", () => {
    const result = prepareTrackingWrite(
      {
        trackingNumber: pair.internationalTrackingNumber,
        trackingNumbers: [pair.internationalTrackingNumber, pair.localTrackingNumber],
        trackingPackages: null,
      },
      { trackingPackages: [pair] },
      { mergePackages: true },
    );

    expect(result.updates.trackingPackages).toEqual([pair]);
  });

  it("rejects consuming the local leg of an existing structured pair from another package", () => {
    expect(() => prepareTrackingWrite(
      {
        trackingNumber: "A",
        trackingNumbers: ["A", "B"],
        trackingPackages: [{
          id: "existing", courier: "bmurfs",
          internationalTrackingNumber: "A", localTrackingNumber: "B",
        }],
      },
      { trackingPackages: [{
        id: "new", courier: "bmurfs",
        internationalTrackingNumber: "C", localTrackingNumber: "B",
      }] },
      { mergePackages: true },
    )).toThrow(/already belongs/i);
  });

  it("preserves stable identity and local leg when a bulk retry supplies the same international", () => {
    const result = prepareTrackingWrite(
      {
        trackingNumber: "INTL",
        trackingNumbers: ["INTL", "LOCAL"],
        trackingPackages: [{
          id: "stable-id", courier: "bmurfs",
          internationalTrackingNumber: "INTL", localTrackingNumber: "LOCAL",
        }],
      },
      { trackingPackages: [{
        id: "random-import-id", courier: "bmurfs",
        internationalTrackingNumber: "INTL", localTrackingNumber: null,
      }] },
      { mergePackages: true },
    );

    expect(result.updates.trackingPackages).toEqual([{
      id: "stable-id", courier: "bmurfs",
      internationalTrackingNumber: "INTL", localTrackingNumber: "LOCAL",
    }]);
  });

  it("rejects flat membership edits when structured pairing exists", () => {
    expect(() => prepareTrackingWrite(
      {
        trackingNumber: "INTL",
        trackingNumbers: ["INTL", "LOCAL"],
        trackingPackages: [{
          id: "stable-id", courier: "bmurfs",
          internationalTrackingNumber: "INTL", localTrackingNumber: "LOCAL",
        }],
      },
      { trackingNumbers: ["INTL"] },
    )).toThrow(/package editor/i);
  });

  it("maps bulk items only to incoming packages and preserves unrelated mappings", () => {
    const unrelatedItems = [{ name: "Unrelated", qty: 1 }];
    const incomingItems = [{ name: "Incoming", qty: 2 }];
    const result = prepareTrackingWrite(
      {
        trackingNumber: "OLD",
        trackingNumbers: ["OLD"],
        trackingPackages: [{
          id: "old", courier: "DHL",
          internationalTrackingNumber: "OLD", localTrackingNumber: null,
        }],
        trackingShippedItems: { OLD: unrelatedItems },
      },
      { trackingPackages: [{
        id: "new", courier: "UPS",
        internationalTrackingNumber: "NEW", localTrackingNumber: null,
      }], items: incomingItems },
      { mergePackages: true },
    );

    expect(result.updates.trackingShippedItems).toEqual({
      OLD: unrelatedItems,
      NEW: incomingItems,
    });
  });

  it("moves a sole legacy local item association to the paired international", () => {
    const localItems = [{ name: "Contents", qty: 3 }];
    const result = prepareTrackingWrite(
      {
        trackingNumber: "INTL",
        trackingNumbers: ["INTL", "LOCAL"],
        trackingPackages: null,
        trackingShippedItems: { LOCAL: localItems },
      },
      { trackingPackages: [{
        id: "paired", courier: "bmurfs",
        internationalTrackingNumber: "INTL", localTrackingNumber: "LOCAL",
      }] },
      { mergePackages: true },
    );

    expect(result.updates.trackingShippedItems).toEqual({ INTL: localItems });
  });

  it("rejects stale expected snapshots", () => {
    expect(() => prepareTrackingWrite(
      { trackingNumber: "OLD", trackingNumbers: ["OLD"], trackingPackages: null },
      { trackingNumbers: ["NEW"], expectedTrackingSnapshot: "stale" },
    )).toThrow(/changed by another/i);
  });

  it("snapshots the legacy primary history before changing number order", () => {
    const result = prepareTrackingWrite(
      {
        trackingNumber: "OLD",
        trackingNumbers: ["OLD", "SECOND"],
        trackingPackages: null,
        trackingDetails: {},
        trackingStatus: "In transit",
        trackingEvents: [{ date: "2026-01-01", status: "Accepted", location: "CN" }],
        trackingLastChecked: "2026-01-02",
      },
      { trackingNumbers: ["SECOND", "OLD"] },
    );

    expect(result.updates.trackingDetails).toMatchObject({
      OLD: {
        status: "In transit",
        events: [{ date: "2026-01-01", status: "Accepted", location: "CN" }],
      },
    });
  });
});