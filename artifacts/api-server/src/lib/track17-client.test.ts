import { describe, expect, it, vi } from "vitest";
import { TRACKING_FAILURE_BACKOFF_MS } from "./tracking-refresh-policy";
import { createTrack17Client } from "./track17-client";

const acceptedRegistration = (number = "ABC123", carrier = 0) => new Response(JSON.stringify({
  data: { accepted: [{ number, carrier }], rejected: [] },
}), { status: 200 });

const acceptedTracking = (number = "ABC123", carrier = 0) => new Response(JSON.stringify({
  data: { accepted: [{ number, carrier, track_info: {} }], rejected: [] },
}), { status: 200 });

async function correlatedAccepted(url: string, init?: RequestInit): Promise<Response> {
  const [{ number, carrier = 0 }] = JSON.parse(String(init?.body)) as Array<{ number: string; carrier?: number }>;
  return url.endsWith("/register")
    ? acceptedRegistration(number, carrier)
    : acceptedTracking(number, carrier);
}

function requestBody(init: RequestInit | undefined): string {
  return String(init?.body);
}

describe("Track17Client", () => {
  it("deduplicates concurrent normalized number and carrier requests", async () => {
    let releaseInfo: (() => void) | undefined;
    const infoReady = new Promise<void>(resolve => { releaseInfo = resolve; });
    const fetchSpy = vi.fn(async (url: string) => {
      if (url.endsWith("/register")) return acceptedRegistration("ABC123", 3011);
      await infoReady;
      return acceptedTracking("ABC123", 3011);
    });
    const client = createTrack17Client({ getApiKey: async () => "test-key", fetch: fetchSpy });

    const requests = Promise.all([
      client.getTrackingInfo("ABC123", 3011),
      client.getTrackingInfo(" abc 123 ", 3011),
    ]);
    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));
    releaseInfo!();
    await requests;

    expect(fetchSpy.mock.calls.filter(([url]) => String(url).endsWith("/gettrackinfo"))).toHaveLength(1);
  });

  it("remembers successful registrations for sequential calls", async () => {
    const fetchSpy = vi.fn(async (url: string) =>
      url.endsWith("/register") ? acceptedRegistration("ABC123", 3011) : acceptedTracking("ABC123", 3011));
    const client = createTrack17Client({ getApiKey: async () => "test-key", fetch: fetchSpy });

    await client.getTrackingInfo("ABC123", 3011);
    await client.getTrackingInfo("ABC123", 3011);

    expect(fetchSpy.mock.calls.filter(([url]) => String(url).endsWith("/register"))).toHaveLength(1);
    expect(fetchSpy.mock.calls.filter(([url]) => String(url).endsWith("/gettrackinfo"))).toHaveLength(2);
  });

  it("treats the already-registered provider response as a successful registration", async () => {
    const fetchSpy = vi.fn(async (url: string) => {
      if (url.endsWith("/register")) {
        return new Response(JSON.stringify({
          data: { accepted: [], rejected: [{ number: "ABC123", carrier: 0, error: { code: -18019901 } }] },
        }));
      }
      return acceptedTracking();
    });
    const client = createTrack17Client({ getApiKey: async () => "test-key", fetch: fetchSpy });

    await client.getTrackingInfo("ABC123");
    await client.getTrackingInfo("ABC123");

    expect(fetchSpy.mock.calls.filter(([url]) => String(url).endsWith("/register"))).toHaveLength(1);
  });

  it("distinguishes registration rejection from unavailable tracking information", async () => {
    const rejectedFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: { accepted: [], rejected: [{ number: "REJECTED", carrier: 0, error: { code: -18010013 } }] },
    })));
    const rejectedClient = createTrack17Client({ getApiKey: async () => "test-key", fetch: rejectedFetch });
    expect(await rejectedClient.getTrackingInfoDetailed("REJECTED")).toEqual({ kind: "registration_rejected" });

    const unavailableFetch = vi.fn()
      .mockResolvedValueOnce(acceptedRegistration("WAITING"))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: {
          accepted: [],
          rejected: [{ number: "WAITING", carrier: 0, error: { code: -18010012 } }],
        },
      })));
    const unavailableClient = createTrack17Client({ getApiKey: async () => "test-key", fetch: unavailableFetch });
    expect(await unavailableClient.getTrackingInfoDetailed("WAITING")).toEqual({ kind: "info_unavailable" });
  });

  it("fails closed and backs off when registration response lists are malformed", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: { accepted: {}, rejected: {} },
    })));
    const client = createTrack17Client({ getApiKey: async () => "test-key", fetch: fetchSpy });

    expect(await client.getTrackingInfo("MALFORMED-REGISTER")).toBeNull();
    expect(await client.getTrackingInfo("MALFORMED-REGISTER")).toBeNull();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("fails closed and backs off when tracking accepted is malformed", async () => {
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce(acceptedRegistration("MALFORMED-TRACKING"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { accepted: {}, rejected: [] } })));
    const client = createTrack17Client({ getApiKey: async () => "test-key", fetch: fetchSpy });

    expect(await client.getTrackingInfo("MALFORMED-TRACKING")).toBeNull();
    expect(await client.getTrackingInfo("MALFORMED-TRACKING")).toBeNull();

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it.each([[["invalid"]], [[null]], [[{}]]])(
    "fails closed and backs off malformed registration accepted entries: %j",
    async (accepted) => {
      const fetchSpy = vi.fn().mockResolvedValue(new Response(JSON.stringify({
        data: { accepted, rejected: [] },
      })));
      const client = createTrack17Client({ getApiKey: async () => "test-key", fetch: fetchSpy });

      expect(await client.getTrackingInfo("MALFORMED-REGISTER-ENTRY")).toBeNull();
      expect(await client.getTrackingInfo("MALFORMED-REGISTER-ENTRY")).toBeNull();

      expect(fetchSpy).toHaveBeenCalledTimes(1);
    },
  );

  it.each([[["invalid"]], [[null]], [[{}]]])(
    "fails closed and backs off malformed tracking accepted entries: %j",
    async (accepted) => {
      const fetchSpy = vi.fn()
        .mockResolvedValueOnce(acceptedRegistration("MALFORMED-TRACKING-ENTRY"))
        .mockResolvedValueOnce(new Response(JSON.stringify({ data: { accepted, rejected: [] } })));
      const client = createTrack17Client({ getApiKey: async () => "test-key", fetch: fetchSpy });

      expect(await client.getTrackingInfo("MALFORMED-TRACKING-ENTRY")).toBeNull();
      expect(await client.getTrackingInfo("MALFORMED-TRACKING-ENTRY")).toBeNull();

      expect(fetchSpy).toHaveBeenCalledTimes(2);
    },
  );

  it("backs off provider failures even when the caller forces a refresh", async () => {
    let now = 1_000_000;
    const fetchSpy = vi.fn().mockRejectedValue(new Error("provider down"));
    const client = createTrack17Client({
      getApiKey: async () => "test-key",
      fetch: fetchSpy,
      now: () => now,
    });

    expect(await client.getTrackingInfo("FAIL1", 0)).toBeNull();
    expect(await client.getTrackingInfo("FAIL1", 0, { force: true })).toBeNull();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    now += TRACKING_FAILURE_BACKOFF_MS + 1;
    fetchSpy.mockImplementation(correlatedAccepted);
    expect(await client.getTrackingInfo("FAIL1", 0)).not.toBeNull();
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it("keeps carrier-specific requests separate", async () => {
    const fetchSpy = vi.fn(correlatedAccepted);
    const client = createTrack17Client({ getApiKey: async () => "test-key", fetch: fetchSpy });

    await client.getTrackingInfo("ABC123", 3011);
    await client.getTrackingInfo("ABC123", 100001);

    const registrations = (fetchSpy.mock.calls as unknown as Array<[string, RequestInit | undefined]>)
      .filter(([url]) => String(url).endsWith("/register"))
      .map(([, init]) => requestBody(init));
    expect(registrations).toHaveLength(2);
    expect(registrations[0]).toContain('"carrier":3011');
    expect(registrations[1]).toContain('"carrier":100001');
  });

  it("removes a failed request from flight after its backoff expires", async () => {
    let now = 1_000_000;
    const fetchSpy = vi.fn()
      .mockRejectedValueOnce(new Error("provider down"))
      .mockImplementation(correlatedAccepted);
    const client = createTrack17Client({
      getApiKey: async () => "test-key",
      fetch: fetchSpy,
      now: () => now,
    });

    expect(await client.getTrackingInfo("RETRY")).toBeNull();
    now += TRACKING_FAILURE_BACKOFF_MS + 1;
    expect(await client.getTrackingInfo("RETRY")).not.toBeNull();
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it("aborts a pending provider call after ten seconds and retries after backoff", async () => {
    vi.useFakeTimers();
    try {
      let now = 1_000_000;
      const signals: AbortSignal[] = [];
      const fetchSpy = vi.fn((url: string, init?: RequestInit) => {
        if (String(url).endsWith("/register") && signals.length === 0) {
          signals.push(init!.signal as AbortSignal);
          return new Promise<Response>((_resolve, reject) => {
            init!.signal!.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
          });
        }
        return Promise.resolve(correlatedAccepted(url, init));
      });
      const client = createTrack17Client({
        getApiKey: async () => "test-key",
        fetch: fetchSpy,
        now: () => now,
      });

      const pending = client.getTrackingInfo("TIMEOUT");
      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(10_000);
      expect(signals[0].aborted).toBe(true);
      await expect(pending).resolves.toBeNull();

      now += TRACKING_FAILURE_BACKOFF_MS + 1;
      expect(await client.getTrackingInfo("TIMEOUT")).not.toBeNull();
      expect(fetchSpy).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it("aborts a pending gettrackinfo call after successful registration", async () => {
    vi.useFakeTimers();
    try {
      let infoSignal: AbortSignal | undefined;
      const fetchSpy = vi.fn((url: string, init?: RequestInit) => {
        if (url.endsWith("/register")) return Promise.resolve(acceptedRegistration("INFO-TIMEOUT"));
        infoSignal = init!.signal as AbortSignal;
        return new Promise<Response>((_resolve, reject) => {
          init!.signal!.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
        });
      });
      const client = createTrack17Client({ getApiKey: async () => "test-key", fetch: fetchSpy });

      const pending = client.getTrackingInfo("INFO-TIMEOUT");
      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(10_000);

      expect(infoSignal?.aborted).toBe(true);
      await expect(pending).resolves.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([
    [{ number: "OTHER", carrier: 3011 }, "mismatched number"],
    [{ number: "ABC123", carrier: 100003 }, "mismatched carrier"],
  ])("fails closed and backs off an accepted registration with %s", async (entry) => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: { accepted: [entry], rejected: [] },
    })));
    const client = createTrack17Client({ getApiKey: async () => "test-key", fetch: fetchSpy });

    expect(await client.getTrackingInfo("ABC123", 3011)).toBeNull();
    expect(await client.getTrackingInfo("ABC123", 3011)).toBeNull();
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it("uses and validates the provider-resolved carrier for auto-detection", async () => {
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce(acceptedRegistration("ABC123", 100003))
      .mockResolvedValueOnce(acceptedTracking("ABC123", 100003));
    const client = createTrack17Client({ getApiKey: async () => "test-key", fetch: fetchSpy });

    const result = await client.getTrackingInfo("ABC123", 0);

    expect(result).toMatchObject({ number: "ABC123", carrier: 100003 });
    expect(requestBody(fetchSpy.mock.calls[1][1])).toContain('"carrier":100003');
  });

  it("exposes a same-number alternate get-info carrier only in explicit correction mode", async () => {
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce(acceptedRegistration("ABC123", 3011))
      .mockResolvedValueOnce(acceptedTracking("ABC123", 100003));
    const client = createTrack17Client({ getApiKey: async () => "test-key", fetch: fetchSpy });

    await expect(client.getTrackingInfoDetailed("ABC123", 3011, {
      allowAlternateTrackingCarrier: true,
    })).resolves.toEqual({
      kind: "success",
      accepted: { number: "ABC123", carrier: 100003, track_info: {} },
    });
  });

  it("never exposes a mismatched number to correction mode", async () => {
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce(acceptedRegistration("ABC123", 3011))
      .mockResolvedValueOnce(acceptedTracking("OTHER", 100003));
    const client = createTrack17Client({ getApiKey: async () => "test-key", fetch: fetchSpy });

    await expect(client.getTrackingInfoDetailed("ABC123", 3011, {
      allowAlternateTrackingCarrier: true,
    })).resolves.toEqual({ kind: "provider_failure", stage: "tracking" });
  });

  it.each([
    {
      accepted: [
        { number: "ABC123", carrier: 3011 },
        { number: "ABC123", carrier: 3011 },
      ],
      rejected: [],
    },
    {
      accepted: [{ number: "ABC123", carrier: 3011 }],
      rejected: [{ number: "ABC123", carrier: 3011, error: { code: -1 } }],
    },
    {
      accepted: [],
      rejected: [{ number: "ABC123", carrier: 3011 }],
    },
  ])("fails closed on duplicate, mixed, or malformed registration outcomes: %j", async (data) => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data })));
    const client = createTrack17Client({ getApiKey: async () => "test-key", fetch: fetchSpy });

    expect(await client.getTrackingInfo("ABC123", 3011)).toBeNull();
    expect(await client.getTrackingInfo("ABC123", 3011)).toBeNull();
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it.each([
    { accepted: [{ number: "OTHER", carrier: 3011, track_info: {} }], rejected: [] },
    { accepted: [{ number: "ABC123", carrier: 100003, track_info: {} }], rejected: [] },
    {
      accepted: [
        { number: "ABC123", carrier: 3011, track_info: {} },
        { number: "ABC123", carrier: 3011, track_info: {} },
      ],
      rejected: [],
    },
    {
      accepted: [{ number: "ABC123", carrier: 3011, track_info: {} }],
      rejected: [{ number: "ABC123", carrier: 3011, error: { code: -1 } }],
    },
    { accepted: [{ track_info: {} }], rejected: [] },
    { accepted: [], rejected: [{ number: "ABC123", carrier: 3011 }] },
  ])("fails closed and backs off invalid tracking identity/outcomes: %j", async (data) => {
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce(acceptedRegistration("ABC123", 3011))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data })));
    const client = createTrack17Client({ getApiKey: async () => "test-key", fetch: fetchSpy });

    expect(await client.getTrackingInfo("ABC123", 3011)).toBeNull();
    expect(await client.getTrackingInfo("ABC123", 3011)).toBeNull();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("deduplicates concurrent normalized carrier corrections and validates the response identity", async () => {
    let release: (() => void) | undefined;
    const pending = new Promise<void>(resolve => { release = resolve; });
    const fetchSpy = vi.fn(async (_url: string, init?: RequestInit) => {
      await pending;
      return new Response(JSON.stringify({
        data: { accepted: [{ number: "ABC123", carrier: 3011 }], rejected: [] },
      }));
    });
    const client = createTrack17Client({ getApiKey: async () => "test-key", fetch: fetchSpy });

    const corrections = Promise.all([
      client.changeCarrier("ABC123", 100003, 3011),
      client.changeCarrier(" abc 123 ", 100003, 3011),
    ]);
    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalledOnce());
    release!();

    await expect(corrections).resolves.toEqual([true, true]);
    expect(requestBody(fetchSpy.mock.calls[0][1]))
      .toBe('[{"number":"ABC123","carrier_old":100003,"carrier_new":3011}]');
  });

  it("fails closed and backs off a mismatched carrier-correction response", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: { accepted: [{ number: "OTHER", carrier: 3011 }], rejected: [] },
    })));
    const client = createTrack17Client({ getApiKey: async () => "test-key", fetch: fetchSpy });

    expect(await client.changeCarrier("ABC123", 100003, 3011)).toBe(false);
    expect(await client.changeCarrier("ABC123", 100003, 3011)).toBe(false);
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it.each([
    {
      accepted: [
        { number: "ABC123", carrier: 3011 },
        { number: "ABC123", carrier: 3011 },
      ],
      rejected: [],
    },
    {
      accepted: [{ number: "ABC123", carrier: 3011 }],
      rejected: [{ number: "ABC123", carrier: 3011, error: { code: -1 } }],
    },
    {
      accepted: [],
      rejected: [{ number: "ABC123", carrier: 3011 }],
    },
  ])("fails closed and backs off invalid carrier-correction outcomes: %j", async (data) => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data })));
    const client = createTrack17Client({ getApiKey: async () => "test-key", fetch: fetchSpy });

    expect(await client.changeCarrier("ABC123", 100003, 3011)).toBe(false);
    expect(await client.changeCarrier("ABC123", 100003, 3011)).toBe(false);
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it("times out a carrier correction and retries only after failure backoff", async () => {
    vi.useFakeTimers();
    try {
      let now = 1_000_000;
      let signal: AbortSignal | undefined;
      const fetchSpy = vi.fn((_url: string, init?: RequestInit) => {
        signal = init?.signal as AbortSignal;
        return new Promise<Response>((_resolve, reject) => {
          signal!.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
        });
      });
      const client = createTrack17Client({
        getApiKey: async () => "test-key",
        fetch: fetchSpy,
        now: () => now,
      });

      const correction = client.changeCarrier("ABC123", 100003, 3011);
      await vi.advanceTimersByTimeAsync(10_000);
      expect(signal?.aborted).toBe(true);
      await expect(correction).resolves.toBe(false);
      expect(await client.changeCarrier("ABC123", 100003, 3011)).toBe(false);
      expect(fetchSpy).toHaveBeenCalledOnce();

      now += TRACKING_FAILURE_BACKOFF_MS + 1;
      fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
        data: { accepted: [{ number: "ABC123", carrier: 3011 }], rejected: [] },
      })));
      expect(await client.changeCarrier("ABC123", 100003, 3011)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("backs off repeated failed post-mutation revalidation attempts", async () => {
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: { accepted: [{ number: "ABC123", carrier: 3011 }], rejected: [] },
      })))
      .mockResolvedValueOnce(acceptedRegistration("ABC123", 3011))
      .mockResolvedValueOnce(acceptedTracking("OTHER", 3011));
    const client = createTrack17Client({ getApiKey: async () => "test-key", fetch: fetchSpy });

    expect(await client.changeCarrier("ABC123", 100003, 3011)).toBe(true);
    expect(await client.revalidateAfterCarrierChange("ABC123", 3011)).toEqual({
      kind: "provider_failure",
      stage: "tracking",
    });
    expect(await client.revalidateAfterCarrierChange("ABC123", 3011)).toEqual({
      kind: "provider_failure",
      stage: "tracking",
    });
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it("never reuses an evicted identity's old mutation revalidation key", async () => {
    let getInfoCalls = 0;
    const fetchSpy = vi.fn(async (url: string, init?: RequestInit) => {
      const [{ number, carrier_new: carrierNew, carrier = 0 }] = JSON.parse(String(init?.body)) as Array<{
        number: string;
        carrier_new?: number;
        carrier?: number;
      }>;
      if (url.endsWith("/changecarrier")) {
        return new Response(JSON.stringify({
          data: { accepted: [{ number, carrier: carrierNew }], rejected: [] },
        }));
      }
      if (url.endsWith("/register")) return acceptedRegistration(number, carrier);
      getInfoCalls++;
      return getInfoCalls === 1
        ? acceptedTracking("OTHER", carrier)
        : acceptedTracking(number, carrier);
    });
    const client = createTrack17Client({ getApiKey: async () => "test-key", fetch: fetchSpy });

    expect(await client.changeCarrier("IDENTITY-A", 100003, 3011)).toBe(true);
    expect((await client.revalidateAfterCarrierChange("IDENTITY-A", 3011)).kind)
      .toBe("provider_failure");

    for (let index = 0; index <= 1_000; index++) {
      expect(await client.changeCarrier(`OTHER-${index}`, 100003, 3011)).toBe(true);
    }

    const callsBeforeEvictedProbe = fetchSpy.mock.calls.length;
    expect((await client.revalidateAfterCarrierChange("IDENTITY-A", 3011)).kind)
      .toBe("provider_failure");
    expect(fetchSpy).toHaveBeenCalledTimes(callsBeforeEvictedProbe);

    expect(await client.changeCarrier("IDENTITY-A", 100003, 3011)).toBe(true);
    const callsBeforeFreshRevalidation = fetchSpy.mock.calls.length;
    expect((await client.revalidateAfterCarrierChange("IDENTITY-A", 3011)).kind)
      .toBe("success");
    expect(fetchSpy).toHaveBeenCalledTimes(callsBeforeFreshRevalidation + 1);
    expect(getInfoCalls).toBe(2);
  });

  it("shares raw registration and tracking work without leaking alternate-carrier policy", async () => {
    let releaseRegistration: (() => void) | undefined;
    let releaseTracking: (() => void) | undefined;
    const registrationPending = new Promise<void>(resolve => { releaseRegistration = resolve; });
    const trackingPending = new Promise<void>(resolve => { releaseTracking = resolve; });
    let registrationCalls = 0;
    let trackingCalls = 0;
    const fetchSpy = vi.fn(async (url: string) => {
      if (url.endsWith("/register")) {
        registrationCalls++;
        await registrationPending;
        return acceptedRegistration("ABC123", 3011);
      }
      trackingCalls++;
      await trackingPending;
      return acceptedTracking("ABC123", 100003);
    });
    const client = createTrack17Client({ getApiKey: async () => "test-key", fetch: fetchSpy });

    const strict = client.getTrackingInfoDetailed("ABC123", 3011);
    const alternate = client.getTrackingInfoDetailed(" abc 123 ", 3011, {
      allowAlternateTrackingCarrier: true,
    });
    await vi.waitFor(() => expect(registrationCalls).toBeGreaterThan(0));
    releaseRegistration!();
    await vi.waitFor(() => expect(trackingCalls).toBeGreaterThan(0));
    releaseTracking!();

    await expect(strict).resolves.toEqual({ kind: "provider_failure", stage: "tracking" });
    await expect(alternate).resolves.toEqual({
      kind: "success",
      accepted: { number: "ABC123", carrier: 100003, track_info: {} },
    });
    expect(registrationCalls).toBe(1);
    expect(trackingCalls).toBe(1);
  });
});