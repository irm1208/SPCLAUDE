import { describe, expect, it, vi } from "vitest";
import {
  parseStandaloneTrack17Response,
  refreshStandaloneShipmentIfAllowed,
} from "./standalone-shipment-refresh";

const now = Date.parse("2026-01-02T12:00:00.000Z");
const shipment = {
  id: "shipment-1",
  trackingNumber: "ABC123",
  carrier: "Auto" as string | null,
  status: "in_transit",
  lastChecked: new Date(now - 6 * 60_000),
};

describe("standalone shipment refresh", () => {
  it("preserves numeric z2 mapping and the existing masked cachedEvents shape", () => {
    expect(parseStandaloneTrack17Response({
      number: "ABC123",
      carrier: 0,
      track: {
        z2: 40,
        z1: [{ a: "2026-01-01", z: "Received by: Alice Smith", l: "Berlin, Germany" }],
        z3: { a: "2026-01-02", z: "Signed for by John Smith", l: "London, UK" },
      },
    })).toEqual({
      status: "delivered",
      statusCode: 40,
      events: [
        { date: "2026-01-02", status: "Signed for by John Smith", location: "United Kingdom" },
        { date: "2026-01-01", status: "Received", location: "Germany" },
      ],
    });
  });

  it.each([
    { status: "delivered", lastChecked: null },
    { status: "expired", lastChecked: null },
    { status: "in_transit", lastChecked: new Date(now - 60_000) },
  ])("performs no provider or persistence work for terminal/recent state %#", async state => {
    const client = { getTrackingInfo: vi.fn() };
    const persist = vi.fn();
    const result = await refreshStandaloneShipmentIfAllowed({
      shipment: { ...shipment, ...state },
      client,
      persist,
      now,
    });

    expect(result).toEqual({ kind: "skipped" });
    expect(client.getTrackingInfo).not.toHaveBeenCalled();
    expect(persist).not.toHaveBeenCalled();
  });

  it("fetches and persists a due active shipment with its observed identity", async () => {
    const accepted = { number: "ABC123", carrier: 0, track: { z2: 20, z1: [], z3: null } };
    const client = { getTrackingInfo: vi.fn().mockResolvedValue(accepted) };
    const persist = vi.fn().mockResolvedValue(true);

    const result = await refreshStandaloneShipmentIfAllowed({
      shipment,
      client,
      persist,
      now,
    });

    expect(result).toEqual({ kind: "updated" });
    expect(client.getTrackingInfo).toHaveBeenCalledWith("ABC123", 0);
    expect(persist).toHaveBeenCalledWith(
      { id: "shipment-1", trackingNumber: "ABC123", carrier: "Auto" },
      { status: "in_transit", statusCode: 20, cachedEvents: "[]", lastChecked: new Date(now) },
    );
  });

  it.each([
    ["same-ID tracking/carrier change", { ...shipment, trackingNumber: "NEW", carrier: "Royal Mail" }],
    ["deletion", null],
  ])("does not overwrite a delayed %s", async (_case, concurrentState) => {
    let release!: () => void;
    const delayed = new Promise<void>(resolve => { release = resolve; });
    let saved: typeof shipment | null = { ...shipment };
    const client = {
      getTrackingInfo: vi.fn(async () => {
        await delayed;
        return { number: "ABC123", carrier: 0, track: { z2: 20, z1: [] } };
      }),
    };
    const persist = vi.fn(async (identity, update) => {
      if (!saved
        || saved.id !== identity.id
        || saved.trackingNumber !== identity.trackingNumber
        || saved.carrier !== identity.carrier) return false;
      saved = { ...saved, ...update };
      return true;
    });

    const pending = refreshStandaloneShipmentIfAllowed({ shipment, client, persist, now });
    saved = concurrentState;
    release();

    await expect(pending).resolves.toEqual({ kind: "conflict" });
    expect(saved).toEqual(concurrentState);
  });
});