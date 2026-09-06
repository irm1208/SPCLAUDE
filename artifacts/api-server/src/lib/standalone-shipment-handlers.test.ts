import { describe, expect, it, vi } from "vitest";
import {
  createManualShipmentRefreshHandler,
  createPublicShipmentsHandler,
} from "./standalone-shipment-handlers";

function responseRecorder() {
  const state = { status: 200, body: undefined as unknown };
  return {
    state,
    response: {
      status(code: number) {
        state.status = code;
        return this;
      },
      json(body: unknown) {
        state.body = body;
        return this;
      },
    },
  };
}

const savedShipment = {
  id: "one",
  label: "Parcel",
  carrier: "Auto",
  trackingNumber: "SECRET-TRACKING",
  status: "in_transit",
  statusCode: 20,
  origin: "China",
  estimatedDelivery: null,
  cachedEvents: JSON.stringify([{ date: "2026-01-01", status: "Moving", location: "China" }]),
  lastChecked: new Date("2026-01-01T00:00:00.000Z"),
  notes: "private",
  active: true,
  createdAt: new Date("2025-12-31T00:00:00.000Z"),
};

describe("standalone shipment handlers", () => {
  it("serves saved masked GET output without invoking the provider dependency", async () => {
    const provider = { getTrackingInfo: vi.fn(() => { throw new Error("GET called provider"); }) };
    const handler = createPublicShipmentsHandler({
      loadShipments: vi.fn().mockResolvedValue([savedShipment]),
      provider,
    });
    const { state, response } = responseRecorder();

    await handler({}, response);

    expect(state.status).toBe(200);
    expect(state.body).toEqual([{
      id: "one",
      label: "Parcel",
      carrier: "Auto",
      status: "in_transit",
      origin: "China",
      estimatedDelivery: null,
      events: [{ date: "2026-01-01", status: "Moving", location: "China" }],
      lastChecked: savedShipment.lastChecked,
      createdAt: savedShipment.createdAt,
    }]);
    expect(provider.getTrackingInfo).not.toHaveBeenCalled();
  });

  it("returns a non-success warning when provider refresh is unavailable", async () => {
    const handler = createManualShipmentRefreshHandler({
      loadShipment: vi.fn().mockResolvedValue(savedShipment),
      hasApiKey: vi.fn().mockResolvedValue(true),
      refreshShipment: vi.fn().mockResolvedValue({ kind: "unavailable" }),
    });
    const { state, response } = responseRecorder();

    await handler({ params: { id: "one" } }, response);

    expect(state.status).toBe(502);
    expect(state.body).toEqual({
      error: "17track tracking data unavailable; saved shipment was not changed",
    });
  });

  it("preserves missing-key and successful-update response contracts", async () => {
    const noKey = createManualShipmentRefreshHandler({
      loadShipment: vi.fn().mockResolvedValue(savedShipment),
      hasApiKey: vi.fn().mockResolvedValue(false),
      refreshShipment: vi.fn(),
    });
    const missing = responseRecorder();
    await noKey({ params: { id: "one" } }, missing.response);
    expect(missing.state).toEqual({
      status: 422,
      body: { error: "17track API key not configured" },
    });

    const updated = { ...savedShipment, status: "delivered" };
    const success = createManualShipmentRefreshHandler({
      loadShipment: vi.fn()
        .mockResolvedValueOnce(savedShipment)
        .mockResolvedValueOnce(updated),
      hasApiKey: vi.fn().mockResolvedValue(true),
      refreshShipment: vi.fn().mockResolvedValue({ kind: "updated" }),
    });
    const completed = responseRecorder();
    await success({ params: { id: "one" } }, completed.response);
    expect(completed.state).toEqual({ status: 200, body: updated });
  });

  it("returns 404 for deletion and 409 with current saved data for identity conflict", async () => {
    const deletion = createManualShipmentRefreshHandler({
      loadShipment: vi.fn()
        .mockResolvedValueOnce(savedShipment)
        .mockResolvedValueOnce(undefined),
      hasApiKey: vi.fn().mockResolvedValue(true),
      refreshShipment: vi.fn().mockResolvedValue({ kind: "conflict" }),
    });
    const deleted = responseRecorder();
    await deletion({ params: { id: "one" } }, deleted.response);
    expect(deleted.state).toEqual({ status: 404, body: { error: "Not found" } });

    const changed = { ...savedShipment, trackingNumber: "CHANGED" };
    const conflict = createManualShipmentRefreshHandler({
      loadShipment: vi.fn()
        .mockResolvedValueOnce(savedShipment)
        .mockResolvedValueOnce(changed),
      hasApiKey: vi.fn().mockResolvedValue(true),
      refreshShipment: vi.fn().mockResolvedValue({ kind: "conflict" }),
    });
    const conflicted = responseRecorder();
    await conflict({ params: { id: "one" } }, conflicted.response);
    expect(conflicted.state).toEqual({
      status: 409,
      body: { error: "Shipment changed during refresh", shipment: changed },
    });
  });
});