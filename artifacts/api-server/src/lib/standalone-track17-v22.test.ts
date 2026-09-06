import { describe, expect, it, vi } from "vitest";
import { TRACKING_FAILURE_BACKOFF_MS } from "./tracking-refresh-policy";
import { createStandaloneTrack17V22Client } from "./standalone-track17-v22";

const registration = (number = "ABC123", carrier = 0) => new Response(JSON.stringify({
  code: 0,
  data: { accepted: [{ number, carrier }], rejected: [] },
}));

const tracking = (number = "ABC123", carrier = 0) => new Response(JSON.stringify({
  code: 0,
  data: {
    accepted: [{
      number,
      carrier,
      track: {
        z2: 20,
        z1: [{ a: "2026-01-01", z: "In transit", l: "London, UK" }],
        z3: { a: "2026-01-02", z: "Out for delivery", l: "London, UK" },
      },
    }],
    rejected: [],
  },
}));

function requestedIdentity(init?: RequestInit): { number: string; carrier: number } {
  return JSON.parse(String(init?.body)).data[0];
}

function matchingResponse(url: string, init?: RequestInit): Response {
  const { number, carrier } = requestedIdentity(init);
  return url.endsWith("/register")
    ? registration(number, carrier)
    : tracking(number, carrier);
}

describe("standalone 17TRACK v2.2 client", () => {
  it("preserves the v2.2 URL, authorization, request envelope, and accepted track response", async () => {
    const fetchSpy = vi.fn(async (url: string, init?: RequestInit) => matchingResponse(url, init));
    const client = createStandaloneTrack17V22Client({
      getApiKey: async () => "secret-key",
      fetch: fetchSpy,
    });

    const accepted = await client.getTrackingInfo(" ab c123 ", 0);

    expect(accepted).toMatchObject({ track: { z2: 20 } });
    for (const [url, init] of fetchSpy.mock.calls as unknown as Array<[string, RequestInit]>) {
      expect(url).toMatch(/^https:\/\/api\.17track\.net\/track\/v2\.2\//);
      expect(init?.headers).toEqual({ "Content-Type": "application/json", "17token": "secret-key" });
      expect(JSON.parse(String(init?.body))).toEqual({ data: [{ number: "ABC123", carrier: 0 }] });
    }
  });

  it("deduplicates normalized number and carrier requests while keeping carriers separate", async () => {
    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    const fetchSpy = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/register")) return matchingResponse(url, init);
      await pending;
      return matchingResponse(url, init);
    });
    const client = createStandaloneTrack17V22Client({ getApiKey: async () => "key", fetch: fetchSpy });

    const first = client.getTrackingInfo("AB C123", 0);
    const duplicate = client.getTrackingInfo(" abc123 ", 0);
    const otherCarrier = client.getTrackingInfo("ABC123", 3011);
    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(4));
    release();
    await Promise.all([first, duplicate, otherCarrier]);

    expect(fetchSpy.mock.calls.filter(([url]) => url.endsWith("/gettrackinfo"))).toHaveLength(2);
  });

  it("remembers successful registrations for sequential requests", async () => {
    const fetchSpy = vi.fn(async (url: string, init?: RequestInit) => matchingResponse(url, init));
    const client = createStandaloneTrack17V22Client({ getApiKey: async () => "key", fetch: fetchSpy });

    await client.getTrackingInfo("ABC123", 0);
    await client.getTrackingInfo("ABC123", 0);

    expect(fetchSpy.mock.calls.filter(([url]) => url.endsWith("/register"))).toHaveLength(1);
    expect(fetchSpy.mock.calls.filter(([url]) => url.endsWith("/gettrackinfo"))).toHaveLength(2);
  });

  it("bounds successful-registration memory", async () => {
    const fetchSpy = vi.fn(async (url: string, init?: RequestInit) => matchingResponse(url, init));
    const client = createStandaloneTrack17V22Client({ getApiKey: async () => "key", fetch: fetchSpy });

    for (let index = 0; index <= 1_000; index += 1) {
      await client.getTrackingInfo(`TRACK-${index}`, 0);
    }
    await client.getTrackingInfo("TRACK-0", 0);

    expect(fetchSpy.mock.calls.filter(([url]) => url.endsWith("/register"))).toHaveLength(1_002);
  });

  it("fails closed on a malformed registration payload", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: 0,
      data: { accepted: {}, rejected: [] },
    })));
    const client = createStandaloneTrack17V22Client({ getApiKey: async () => "key", fetch: fetchSpy });

    expect(await client.getTrackingInfo("BAD-REGISTER", 0)).toBeNull();
    expect(await client.getTrackingInfo("BAD-REGISTER", 0)).toBeNull();
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it("accepts the v2.2 outer -2 already-registered result after process-memory reset", async () => {
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        code: -2,
        data: {
          accepted: [],
          rejected: [{
            number: "ABC123",
            carrier: 0,
            error: { code: -18019901 },
          }],
        },
      })))
      .mockResolvedValueOnce(tracking());
    const resetClient = createStandaloneTrack17V22Client({
      getApiKey: async () => "key",
      fetch: fetchSpy,
    });

    await expect(resetClient.getTrackingInfo(" ab c123 ", 0)).resolves.toMatchObject({
      track: { z2: 20 },
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("uses one provider-resolved carrier as the effective auto-detect carrier", async () => {
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce(registration("ABC123", 3011))
      .mockResolvedValueOnce(tracking("ABC123", 3011));
    const client = createStandaloneTrack17V22Client({ getApiKey: async () => "key", fetch: fetchSpy });

    await expect(client.getTrackingInfo("ABC123", 0)).resolves.toMatchObject({
      number: "ABC123",
      carrier: 3011,
    });
    const calls = fetchSpy.mock.calls as unknown as Array<[string, RequestInit]>;
    expect(requestedIdentity(calls[0][1])).toEqual({ number: "ABC123", carrier: 0 });
    expect(requestedIdentity(calls[1][1])).toEqual({ number: "ABC123", carrier: 3011 });
  });

  it.each([
    {
      code: 0,
      data: { accepted: [], rejected: [] },
    },
    {
      code: -2,
      data: {
        accepted: [],
        rejected: [{
          number: "ABC123",
          carrier: 0,
          error: { code: -18019902 },
        }],
      },
    },
    {
      code: 0,
      data: {
        accepted: [],
        rejected: [{
          number: "ABC123",
          carrier: 0,
          error: { code: -18019902 },
        }],
      },
    },
  ])("backs off a valid no-result lookup outcome %#", async lookupPayload => {
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce(registration())
      .mockResolvedValueOnce(new Response(JSON.stringify(lookupPayload)));
    const client = createStandaloneTrack17V22Client({ getApiKey: async () => "key", fetch: fetchSpy });

    await expect(client.getTrackingInfo("ABC123", 0)).resolves.toBeNull();
    await expect(client.getTrackingInfo("ABC123", 0)).resolves.toBeNull();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["registration number", registration("OTHER", 0), undefined, 0],
    ["registration carrier", registration("ABC123", 0), undefined, 3011],
    ["tracking number", registration(), tracking("OTHER", 0), 0],
    ["tracking carrier", registration("ABC123", 3011), tracking("ABC123", 0), 3011],
  ])("fails closed on mismatched %s identity", async (_case, firstResponse, secondResponse, carrier) => {
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce(firstResponse);
    if (secondResponse) fetchSpy.mockResolvedValueOnce(secondResponse);
    const client = createStandaloneTrack17V22Client({ getApiKey: async () => "key", fetch: fetchSpy });

    await expect(client.getTrackingInfo("ABC123", carrier)).resolves.toBeNull();
    await expect(client.getTrackingInfo("ABC123", carrier)).resolves.toBeNull();
    expect(fetchSpy).toHaveBeenCalledTimes(secondResponse ? 2 : 1);
  });

  it.each([
    ["duplicate registration accepted", {
      code: 0,
      data: {
        accepted: [
          { number: "ABC123", carrier: 0 },
          { number: "ABC123", carrier: 0 },
        ],
        rejected: [],
      },
    }, undefined],
    ["mixed registration outcomes", {
      code: 0,
      data: {
        accepted: [{ number: "ABC123", carrier: 0 }],
        rejected: [{ number: "ABC123", carrier: 0, error: { code: -1 } }],
      },
    }, undefined],
    ["registration outer code contradiction", {
      code: -2,
      data: {
        accepted: [{ number: "ABC123", carrier: 0 }],
        rejected: [],
      },
    }, undefined],
    ["duplicate registration rejected", {
      code: -2,
      data: {
        accepted: [],
        rejected: [
          { number: "ABC123", carrier: 0, error: { code: -18019901 } },
          { number: "ABC123", carrier: 0, error: { code: -18019901 } },
        ],
      },
    }, undefined],
    ["duplicate lookup accepted", {
      code: 0,
      data: {
        accepted: [
          { number: "ABC123", carrier: 0, track: { z2: 20, z1: [] } },
          { number: "ABC123", carrier: 0, track: { z2: 20, z1: [] } },
        ],
        rejected: [],
      },
    }, registration()],
    ["mixed lookup outcomes", {
      code: 0,
      data: {
        accepted: [{ number: "ABC123", carrier: 0, track: { z2: 20, z1: [] } }],
        rejected: [{ number: "ABC123", carrier: 0, error: { code: -1 } }],
      },
    }, registration()],
    ["lookup outer code contradiction", {
      code: -2,
      data: {
        accepted: [{ number: "ABC123", carrier: 0, track: { z2: 20, z1: [] } }],
        rejected: [],
      },
    }, registration()],
    ["duplicate lookup rejected", {
      code: -2,
      data: {
        accepted: [],
        rejected: [
          { number: "ABC123", carrier: 0, error: { code: -1 } },
          { number: "ABC123", carrier: 0, error: { code: -1 } },
        ],
      },
    }, registration()],
  ])("rejects %s", async (_case, payload, initialResponse) => {
    const fetchSpy = vi.fn();
    if (initialResponse) fetchSpy.mockResolvedValueOnce(initialResponse);
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify(payload)));
    const client = createStandaloneTrack17V22Client({ getApiKey: async () => "key", fetch: fetchSpy });

    await expect(client.getTrackingInfo("ABC123", 0)).resolves.toBeNull();
    await expect(client.getTrackingInfo("ABC123", 0)).resolves.toBeNull();
    expect(fetchSpy).toHaveBeenCalledTimes(initialResponse ? 2 : 1);
  });

  it.each([
    ["registration rejected list missing", {
      code: 0,
      data: { accepted: [{ number: "ABC123", carrier: 0 }] },
    }, undefined],
    ["registration rejected list", {
      code: 0,
      data: { accepted: [{ number: "ABC123", carrier: 0 }], rejected: {} },
    }, undefined],
    ["registration rejected entry", {
      code: 0,
      data: { accepted: [{ number: "ABC123", carrier: 0 }], rejected: [{}] },
    }, undefined],
    ["tracking rejected list missing", {
      code: 0,
      data: {
        accepted: [{ number: "ABC123", carrier: 0, track: { z2: 20, z1: [] } }],
      },
    }, registration()],
    ["tracking rejected list", {
      code: 0,
      data: {
        accepted: [{ number: "ABC123", carrier: 0, track: { z2: 20, z1: [] } }],
        rejected: {},
      },
    }, registration()],
    ["tracking rejected entry", {
      code: 0,
      data: {
        accepted: [{ number: "ABC123", carrier: 0, track: { z2: 20, z1: [] } }],
        rejected: [{}],
      },
    }, registration()],
  ])("fails closed on malformed %s", async (_case, payload, initialResponse) => {
    const fetchSpy = vi.fn();
    if (initialResponse) fetchSpy.mockResolvedValueOnce(initialResponse);
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify(payload)));
    const client = createStandaloneTrack17V22Client({ getApiKey: async () => "key", fetch: fetchSpy });

    await expect(client.getTrackingInfo("ABC123", 0)).resolves.toBeNull();
    await expect(client.getTrackingInfo("ABC123", 0)).resolves.toBeNull();
    expect(fetchSpy).toHaveBeenCalledTimes(initialResponse ? 2 : 1);
  });

  it.each([
    {},
    { code: "0", data: { accepted: [] } },
    { code: 0, data: { accepted: {} } },
    { code: 0, data: { accepted: [{ track: { z2: "20", z1: [] } }] } },
    {
      code: 0,
      data: {
        accepted: [{ number: "BAD", carrier: 0, track: { z2: 20.5, z1: [] } }],
        rejected: [],
      },
    },
    { code: 0, data: { accepted: [{ track: { z2: 20, z1: {} } }] } },
    { code: 0, data: { accepted: [{ track: { z2: 20, z1: [{ a: 1, z: "x", l: "" }] } }] } },
  ])("fails closed and backs off malformed v2.2 tracking payload %#", async payload => {
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce(registration("BAD"))
      .mockResolvedValue(new Response(JSON.stringify(payload)));
    const client = createStandaloneTrack17V22Client({ getApiKey: async () => "key", fetch: fetchSpy });

    expect(await client.getTrackingInfo("BAD", 0)).toBeNull();
    expect(await client.getTrackingInfo("BAD", 0)).toBeNull();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("bounds provider failure backoff to thirty minutes", async () => {
    let now = 10_000;
    const fetchSpy = vi.fn()
      .mockRejectedValueOnce(new Error("down"))
      .mockResolvedValueOnce(registration("RETRY"))
      .mockResolvedValueOnce(tracking("RETRY"));
    const client = createStandaloneTrack17V22Client({
      getApiKey: async () => "key",
      fetch: fetchSpy,
      now: () => now,
    });

    expect(await client.getTrackingInfo("RETRY", 0)).toBeNull();
    expect(await client.getTrackingInfo("RETRY", 0)).toBeNull();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    now += TRACKING_FAILURE_BACKOFF_MS;
    expect(await client.getTrackingInfo("RETRY", 0)).not.toBeNull();
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it("aborts after ten seconds and cleans up in-flight state", async () => {
    vi.useFakeTimers();
    try {
      let now = 10_000;
      let signal: AbortSignal | undefined;
      const fetchSpy = vi.fn((url: string, init?: RequestInit) => {
        if (fetchSpy.mock.calls.length === 1) {
          signal = init?.signal as AbortSignal;
          return new Promise<Response>((_resolve, reject) => {
            signal!.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
          });
        }
        return Promise.resolve(matchingResponse(url, init));
      });
      const client = createStandaloneTrack17V22Client({
        getApiKey: async () => "key",
        fetch: fetchSpy,
        now: () => now,
      });

      const request = client.getTrackingInfo("TIMEOUT", 0);
      await vi.advanceTimersByTimeAsync(10_000);
      expect(signal?.aborted).toBe(true);
      await expect(request).resolves.toBeNull();

      now += TRACKING_FAILURE_BACKOFF_MS;
      await expect(client.getTrackingInfo("TIMEOUT", 0)).resolves.not.toBeNull();
      expect(fetchSpy).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });
});