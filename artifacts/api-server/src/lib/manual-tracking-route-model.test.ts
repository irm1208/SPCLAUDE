import { describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { createTrack17Client } from "./track17-client";
import {
  gbManualRefreshUnavailableReason,
  unchangedGbParcelTrackingIdentity,
  unchangedTrackingLinkPackages,
  completeGbCarrierRefresh,
  casWriteConflicted,
  gbRefreshConflictResponse,
} from "./manual-tracking-route-model";

describe("manual tracking route persistence guards", () => {
  it("guards a GB write by same-ID provider identity", () => {
    const query = new PgDialect().sqlToQuery(unchangedGbParcelTrackingIdentity({
      id: "parcel-1",
      trackingNumber: "TRACK-1",
      carrier: null,
      trackingParams: { postal_code: "AB12" },
    })!);

    expect(query.sql).toContain("tracking_number");
    expect(query.sql).toContain("carrier");
    expect(query.sql).toContain("tracking_params");
    expect(query.sql).toContain("IS NOT DISTINCT FROM");
    expect(query.sql.match(/IS NOT DISTINCT FROM/g)).toHaveLength(3);
    expect(query.params).toContain("parcel-1");
    expect(query.params).toContain("TRACK-1");
    expect(query.params).toContain(JSON.stringify({ postal_code: "AB12" }));
  });

  it("guards a tracking-link write by the complete originally read package snapshot", () => {
    const packages = [{ id: "package-1", trackingNumber: "TRACK-1", status: "pending" }];
    const query = new PgDialect().sqlToQuery(unchangedTrackingLinkPackages("link-1", packages)!);

    expect(query.sql).toContain("packages");
    expect(query.sql).toContain("IS NOT DISTINCT FROM");
    expect(query.params).toContain("link-1");
    expect(query.params).toContain(JSON.stringify(packages));
  });

  it("treats a zero-row same-ID CAS update as a stale-write conflict", () => {
    expect(casWriteConflicted([])).toBe(true);
    expect(casWriteConflicted([{ id: "saved" }])).toBe(false);
  });

  it("changes GB predicates when number, carrier, or params change", () => {
    const dialect = new PgDialect();
    const query = (trackingNumber: string, carrier: string | null, trackingParams: unknown) =>
      dialect.sqlToQuery(unchangedGbParcelTrackingIdentity({
        id: "parcel-1", trackingNumber, carrier, trackingParams,
      })!).params;
    const observed = query("TRACK-1", null, { postal_code: "AB12" });
    expect(query("TRACK-2", null, { postal_code: "AB12" })).not.toEqual(observed);
    expect(query("TRACK-1", "Evri", { postal_code: "AB12" })).not.toEqual(observed);
    expect(query("TRACK-1", null, { postal_code: "ZZ99" })).not.toEqual(observed);
  });
});

describe("GB carrier refresh adapter", () => {
  it("falls back to auto-detection only when specific-carrier registration fails", async () => {
    const getTrackingInfoDetailed = vi.fn().mockResolvedValue({
      kind: "success",
      accepted: { number: "TRACK-1", carrier: 0, track_info: {} },
    });

    const result = await completeGbCarrierRefresh({
      initialResult: { kind: "registration_rejected" },
      trackingNumber: "TRACK-1",
      carrierCode: 3011,
      extraParams: { postal_code: "AB12" },
      getTrackingInfoDetailed,
      changeCarrier: vi.fn(),
      revalidateAfterCarrierChange: vi.fn(),
    });

    expect(getTrackingInfoDetailed).toHaveBeenCalledWith("TRACK-1", 0, {
      extraParams: { postal_code: "AB12" },
    });
    expect(result.carrierCode).toBe(0);
    expect(result.providerResult.kind).toBe("success");
  });

  it("changes a mismatched provider carrier and re-fetches the requested carrier", async () => {
    const getTrackingInfoDetailed = vi.fn().mockResolvedValue({
      kind: "success",
      accepted: { number: "TRACK-1", track_info: {}, carrier: 3011 },
    });
    const changeCarrier = vi.fn().mockResolvedValue(true);
    const revalidateAfterCarrierChange = vi.fn().mockResolvedValue({
      kind: "success",
      accepted: { number: "TRACK-1", track_info: {}, carrier: 3011 },
    });

    const result = await completeGbCarrierRefresh({
      initialResult: {
        kind: "success",
        accepted: { number: "TRACK-1", track_info: {}, carrier: 100003 },
      },
      trackingNumber: "TRACK-1",
      carrierCode: 3011,
      extraParams: {},
      getTrackingInfoDetailed,
      changeCarrier,
      revalidateAfterCarrierChange,
    });

    expect(changeCarrier).toHaveBeenCalledWith("TRACK-1", 100003, 3011);
    expect(revalidateAfterCarrierChange).toHaveBeenCalledWith("TRACK-1", 3011, { extraParams: {} });
    expect(result.providerResult).toEqual({
      kind: "success",
      accepted: { number: "TRACK-1", track_info: {}, carrier: 3011 },
    });
  });

  it("composes correction-mode lookup, protected carrier change, and strict refetch", async () => {
    const paths: string[] = [];
    const bodies: string[] = [];
    const fetchSpy = vi.fn(async (url: string, init?: RequestInit) => {
      const path = new URL(url).pathname.split("/").pop()!;
      paths.push(path);
      bodies.push(String(init?.body));
      if (path === "register") {
        return new Response(JSON.stringify({
          data: { accepted: [{ number: "TRACK-1", carrier: 3011 }], rejected: [] },
        }));
      }
      if (path === "changecarrier") {
        return new Response(JSON.stringify({
          data: { accepted: [{ number: "TRACK-1", carrier: 3011 }], rejected: [] },
        }));
      }
      const carrier = paths.filter(value => value === "gettrackinfo").length === 1 ? 100003 : 3011;
      return new Response(JSON.stringify({
        data: {
          accepted: [{ number: "TRACK-1", carrier, track_info: {} }],
          rejected: [],
        },
      }));
    });
    const client = createTrack17Client({ getApiKey: async () => "test-key", fetch: fetchSpy });
    const initialResult = await client.getTrackingInfoDetailed("TRACK-1", 3011, {
      allowAlternateTrackingCarrier: true,
    });

    const result = await completeGbCarrierRefresh({
      initialResult,
      trackingNumber: "TRACK-1",
      carrierCode: 3011,
      extraParams: {},
      getTrackingInfoDetailed: client.getTrackingInfoDetailed,
      changeCarrier: client.changeCarrier,
      revalidateAfterCarrierChange: client.revalidateAfterCarrierChange,
    });

    expect(paths).toEqual(["register", "gettrackinfo", "changecarrier", "gettrackinfo"]);
    expect(bodies[2]).toBe('[{"number":"TRACK-1","carrier_old":100003,"carrier_new":3011}]');
    expect(bodies[3]).toBe('[{"number":"TRACK-1","carrier":3011}]');
    expect(result.providerResult).toEqual({
      kind: "success",
      accepted: { number: "TRACK-1", carrier: 3011, track_info: {} },
    });
  });

  it("keeps registration carrier mismatch strict and falls back to auto-detection", async () => {
    const paths: string[] = [];
    const fetchSpy = vi.fn(async (url: string) => {
      const path = new URL(url).pathname.split("/").pop()!;
      paths.push(path);
      if (path === "register" && paths.length === 1) {
        return new Response(JSON.stringify({
          data: { accepted: [{ number: "TRACK-1", carrier: 100003 }], rejected: [] },
        }));
      }
      if (path === "register") {
        return new Response(JSON.stringify({
          data: { accepted: [{ number: "TRACK-1", carrier: 100003 }], rejected: [] },
        }));
      }
      return new Response(JSON.stringify({
        data: {
          accepted: [{ number: "TRACK-1", carrier: 100003, track_info: {} }],
          rejected: [],
        },
      }));
    });
    const client = createTrack17Client({ getApiKey: async () => "test-key", fetch: fetchSpy });
    const initialResult = await client.getTrackingInfoDetailed("TRACK-1", 3011, {
      allowAlternateTrackingCarrier: true,
    });
    const changeCarrier = vi.fn();

    const result = await completeGbCarrierRefresh({
      initialResult,
      trackingNumber: "TRACK-1",
      carrierCode: 3011,
      extraParams: {},
      getTrackingInfoDetailed: client.getTrackingInfoDetailed,
      changeCarrier,
      revalidateAfterCarrierChange: client.revalidateAfterCarrierChange,
    });

    expect(paths).toEqual(["register", "register", "gettrackinfo"]);
    expect(changeCarrier).not.toHaveBeenCalled();
    expect(result.carrierCode).toBe(0);
    expect(result.providerResult.kind).toBe("success");
  });

  it("never sends a mismatched tracking number to carrier correction", async () => {
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: { accepted: [{ number: "TRACK-1", carrier: 3011 }], rejected: [] },
      })))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: {
          accepted: [{ number: "OTHER", carrier: 100003, track_info: {} }],
          rejected: [],
        },
      })));
    const client = createTrack17Client({ getApiKey: async () => "test-key", fetch: fetchSpy });
    const initialResult = await client.getTrackingInfoDetailed("TRACK-1", 3011, {
      allowAlternateTrackingCarrier: true,
    });
    const changeCarrier = vi.fn();

    const result = await completeGbCarrierRefresh({
      initialResult,
      trackingNumber: "TRACK-1",
      carrierCode: 3011,
      extraParams: {},
      getTrackingInfoDetailed: client.getTrackingInfoDetailed,
      changeCarrier,
      revalidateAfterCarrierChange: client.revalidateAfterCarrierChange,
    });

    expect(changeCarrier).not.toHaveBeenCalled();
    expect(result.providerResult).toEqual({ kind: "provider_failure", stage: "tracking" });
  });

  it("revalidates freshly after correction despite a pre-mutation strict backoff", async () => {
    const paths: string[] = [];
    let getCount = 0;
    const fetchSpy = vi.fn(async (url: string) => {
      const path = new URL(url).pathname.split("/").pop()!;
      paths.push(path);
      if (path === "register") {
        return new Response(JSON.stringify({
          data: { accepted: [{ number: "TRACK-1", carrier: 3011 }], rejected: [] },
        }));
      }
      if (path === "changecarrier") {
        return new Response(JSON.stringify({
          data: { accepted: [{ number: "TRACK-1", carrier: 3011 }], rejected: [] },
        }));
      }
      getCount++;
      const carrier = getCount < 3 ? 100003 : 3011;
      return new Response(JSON.stringify({
        data: {
          accepted: [{ number: "TRACK-1", carrier, track_info: {} }],
          rejected: [],
        },
      }));
    });
    const client = createTrack17Client({ getApiKey: async () => "test-key", fetch: fetchSpy });
    expect(await client.getTrackingInfo("TRACK-1", 3011)).toBeNull();
    const initialResult = await client.getTrackingInfoDetailed("TRACK-1", 3011, {
      allowAlternateTrackingCarrier: true,
    });

    const result = await completeGbCarrierRefresh({
      initialResult,
      trackingNumber: "TRACK-1",
      carrierCode: 3011,
      extraParams: {},
      getTrackingInfoDetailed: client.getTrackingInfoDetailed,
      changeCarrier: client.changeCarrier,
      revalidateAfterCarrierChange: client.revalidateAfterCarrierChange,
    });

    expect(paths).toEqual(["register", "gettrackinfo", "gettrackinfo", "changecarrier", "gettrackinfo"]);
    expect(result.providerResult).toEqual({
      kind: "success",
      accepted: { number: "TRACK-1", carrier: 3011, track_info: {} },
    });
  });

  it("does not join a pre-mutation strict lookup still in flight when revalidating", async () => {
    let releaseOld: (() => void) | undefined;
    const oldPending = new Promise<void>(resolve => { releaseOld = resolve; });
    let getCount = 0;
    const fetchSpy = vi.fn(async (url: string) => {
      const path = new URL(url).pathname.split("/").pop()!;
      if (path === "register") {
        return new Response(JSON.stringify({
          data: { accepted: [{ number: "TRACK-1", carrier: 3011 }], rejected: [] },
        }));
      }
      if (path === "changecarrier") {
        return new Response(JSON.stringify({
          data: { accepted: [{ number: "TRACK-1", carrier: 3011 }], rejected: [] },
        }));
      }
      getCount++;
      if (getCount === 2) {
        await oldPending;
        return new Response(JSON.stringify({
          data: {
            accepted: [{ number: "TRACK-1", carrier: 3011, track_info: { stale: true } }],
            rejected: [],
          },
        }));
      }
      const carrier = getCount === 1 ? 100003 : 3011;
      return new Response(JSON.stringify({
        data: {
          accepted: [{ number: "TRACK-1", carrier, track_info: {} }],
          rejected: [],
        },
      }));
    });
    const client = createTrack17Client({ getApiKey: async () => "test-key", fetch: fetchSpy });
    const initialResult = await client.getTrackingInfoDetailed("TRACK-1", 3011, {
      allowAlternateTrackingCarrier: true,
    });
    const oldStrict = client.getTrackingInfo("TRACK-1", 3011);
    await vi.waitFor(() => expect(getCount).toBe(2));

    const corrected = await completeGbCarrierRefresh({
      initialResult,
      trackingNumber: "TRACK-1",
      carrierCode: 3011,
      extraParams: {},
      getTrackingInfoDetailed: client.getTrackingInfoDetailed,
      changeCarrier: client.changeCarrier,
      revalidateAfterCarrierChange: client.revalidateAfterCarrierChange,
    });

    expect(getCount).toBe(3);
    expect(corrected.providerResult.kind).toBe("success");
    releaseOld!();
    await expect(oldStrict).resolves.toBeNull();
  });
});

describe("GB manual refresh response selection", () => {
  it("preserves registration rejection and temporary unavailability messages", () => {
    expect(gbManualRefreshUnavailableReason({ kind: "registration_rejected" }))
      .toBe("Tracking number not recognised by 17track — try specifying the carrier");
    expect(gbManualRefreshUnavailableReason({ kind: "info_unavailable" }))
      .toBe("Registered with 17track — data not available yet (may take a few minutes)");
    expect(gbManualRefreshUnavailableReason({ kind: "provider_failure", stage: "tracking" }))
      .toBe("Registered with 17track — data not available yet (may take a few minutes)");
  });
});

describe.each(["admin", "organiser"])("%s GB manual refresh conflict response", (_actor) => {
  it("returns 404 when a concurrent delete leaves no parcel to reload", () => {
    expect(gbRefreshConflictResponse(
      { ok: false, conflict: true, reason: "Tracking details changed while refresh was in progress" },
      undefined,
    )).toEqual({ status: 404, body: { error: "Parcel not found" } });
  });

  it("returns 409 with the current parcel after a concurrent identity change", () => {
    const current = { id: "parcel-1", trackingNumber: "NEW-NUMBER", status: "pending" };
    expect(gbRefreshConflictResponse(
      { ok: false, conflict: true, reason: "Tracking details changed while refresh was in progress" },
      current,
    )).toEqual({
      status: 409,
      body: {
        ...current,
        _refreshWarning: "Tracking details changed while refresh was in progress",
      },
    });
  });
});