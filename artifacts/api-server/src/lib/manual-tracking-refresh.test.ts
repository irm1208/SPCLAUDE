import { describe, expect, it, vi } from "vitest";
import { refreshManuallyIfAllowed } from "./manual-tracking-refresh";

describe("refreshManuallyIfAllowed", () => {
  const now = Date.parse("2025-01-01T12:00:00.000Z");

  it.each([
    ["GB parcel", { status: "delivered", lastChecked: null }],
    ["tracking-link package", { status: "expired", lastChecked: null }],
    ["GB parcel", { status: "in_transit", lastChecked: new Date(now - 60_000) }],
    ["tracking-link package", { status: "pending", lastChecked: new Date(now - 60_000).toISOString() }],
  ])("does not fetch a terminal or recently manual-refreshed %s", async (_path, record) => {
    const getTrackingInfoDetailed = vi.fn();

    const result = await refreshManuallyIfAllowed({
      trackingNumber: " ab c123 ",
      carrierCode: 3011,
      status: record.status,
      lastChecked: record.lastChecked,
      client: {
        getTrackingInfo: vi.fn(),
        getTrackingInfoDetailed,
        changeCarrier: vi.fn(),
        revalidateAfterCarrierChange: vi.fn(),
      },
      now,
    });

    expect(result).toEqual({ kind: "skipped" });
    expect(getTrackingInfoDetailed).not.toHaveBeenCalled();
  });

  it.each(["GB parcel", "tracking-link package"])("uses the coordinator for a due active %s", async (_path) => {
    const getTrackingInfoDetailed = vi.fn().mockResolvedValue({
      kind: "success",
      accepted: { number: "ABC123", carrier: 3011, track_info: {} },
    });

    const result = await refreshManuallyIfAllowed({
      trackingNumber: " ab c123 ",
      carrierCode: 3011,
      status: "in_transit",
      lastChecked: new Date(now - 5 * 60_000),
      client: {
        getTrackingInfo: vi.fn(),
        getTrackingInfoDetailed,
        changeCarrier: vi.fn(),
        revalidateAfterCarrierChange: vi.fn(),
      },
      now,
    });

    expect(result).toEqual({
      kind: "fetched",
      result: {
        kind: "success",
        accepted: { number: "ABC123", carrier: 3011, track_info: {} },
      },
    });
    expect(getTrackingInfoDetailed).toHaveBeenCalledOnce();
    expect(getTrackingInfoDetailed).toHaveBeenCalledWith(" ab c123 ", 3011, undefined);
  });
});