import { describe, expect, it } from "vitest";
import { projectMemberParcels, parcelDestination } from "./member-gb-parcels";

const orders = [
  { id: "a", reshipperUsername: "@ALPHA", routingType: "direct", directShippingRequested: true },
  { id: "b", reshipperUsername: "beta", routingType: "reshipper" },
];
const lines = [
  { orderId: "a", productName: "Shared product", quantity: "2" },
  { orderId: "b", productName: "Other product", quantity: "1" },
];
const parcel = (reshipperUsername: string | null, label = "Package 1 - AJ") => ({
  id: label, reshipperUsername, label, trackingNumber: "SECRET123", status: "in_transit",
  items: [{ name: "Shared product", qty: 99 }, { name: "Private product", qty: 20 }],
  cachedEvents: [{ date: "today", status: "In transit", location: "China" }],
  trackingUrl: "https://carrier.test/SECRET123",
});

describe("member parcel destination privacy", () => {
  it("reproduces an organiser parcel hidden until staff explicitly assign its destination", () => {
    expect(projectMemberParcels([parcel(null)], orders, lines, ["alpha", "beta"])).toEqual([]);
    const result = projectMemberParcels([parcel(" @Alpha ")], orders, lines, ["alpha", "beta"]);
    expect(result).toHaveLength(1);
    expect(result[0].items).toEqual([{ name: "Shared product", qty: 2 }]);
    expect(result[0].events).toHaveLength(1);
    expect(JSON.stringify(result)).not.toContain("SECRET123");
  });
  it("does not mix products from another order's route or infer AJ/Ghost labels", () => {
    expect(projectMemberParcels([parcel("beta"), parcel(null, "Ghost")], orders, lines, ["alpha", "beta"])).toEqual([]);
    expect(projectMemberParcels([parcel(null, " @ALPHA ")], orders, lines, ["alpha", "beta"])).toHaveLength(1);
  });
  it("does not show same-product parcels to unrouted or direct members", () => {
    for (const order of [{ id: "a" }, { id: "a", routingType: "direct", directShippingRequested: true }]) {
      expect(projectMemberParcels([parcel("alpha"), parcel(null)], [order], lines, ["alpha"])).toEqual([]);
    }
  });
  it("shows genuine direct orders only from their own tracking and own items", () => {
    const result = projectMemberParcels([], [
      ...orders, { id: "direct", routingType: "direct", directShippingRequested: true, trackingNumber: "OWN123", status: "Shipped" },
    ], [...lines, { orderId: "direct", productName: "Direct only", quantity: "3" }], ["alpha", "beta"]);
    expect(result).toHaveLength(1);
    expect(result[0].maskedTrackingNumber).toBe("OWN123");
    expect(result[0].items).toEqual([{ name: "Direct only", qty: 3 }]);
  });
  it("validates group-scoped destinations, canonicalizes names and preserves omitted edits", () => {
    expect(parcelDestination(undefined, ["alpha"])).toBeUndefined();
    expect(parcelDestination(null, ["alpha"])).toBeNull();
    expect(parcelDestination(" @AlPhA ", ["alpha"])).toBe("alpha");
    expect(() => parcelDestination("foreign", ["alpha"])).toThrow();
    expect(() => parcelDestination(7, ["alpha"])).toThrow();
  });
  it("masks addresses, signatories, tracking tokens and arbitrary event metadata at read time", () => {
    const p = parcel("alpha");
    p.cachedEvents = [{
      date: "today", status: "SECRET123 Signed for by Jane Smith",
      location: "Private depot, London, United Kingdom",
      ...{ internal: "private metadata" },
    }];
    const view = projectMemberParcels([p], orders, lines, ["alpha"]);
    expect(view[0].events).toEqual([{ date: "", status: "Delivery update", location: "United Kingdom" }]);
    expect(p.cachedEvents[0].status).toContain("Jane Smith"); // stored history is untouched
  });
  it("never returns arbitrary carrier descriptions or date text, including unknown PII formats", () => {
    const p = parcel("alpha");
    const descriptions = [
      "Delivered to Jane Smith", "Recipient: Jane Smith at Flat 9, 12 Private Lane",
      "Parcel left with neighbour J. Smith, door code 1234",
      "Unknown carrier text: Jane Smith <private@example.test> SECRET123",
      "Not delivered: Jane Smith unavailable", "Signed by: 张伟",
    ];
    p.cachedEvents = descriptions.map(status => ({ date: "Jane Smith", status, location: "Jane Smith" }));
    const events = projectMemberParcels([p], orders, lines, ["alpha"])[0].events;
    expect(events.every(event => ["Delivery update", "Tracking update", "Delivery attempted"].includes(event.status))).toBe(true);
    expect(events.every(event => event.date === "" && event.location === "")).toBe(true);
    for (const raw of ["Jane", "Smith", "1234", "SECRET123", "张伟", "private@", "Private Lane"]) {
      expect(JSON.stringify(events)).not.toContain(raw);
    }
    expect(p.cachedEvents[0].status).toEqual(descriptions[0]);
  });
});
