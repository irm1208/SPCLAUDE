import {
  TRACKING_FAILURE_BACKOFF_MS,
  normalizeTrackingNumber,
  trackingRefreshKey,
} from "./tracking-refresh-policy";

const TRACK17_V22_BASE = "https://api.17track.net/track/v2.2";
const FETCH_TIMEOUT_MS = 10_000;
const MAX_REMEMBERED_KEYS = 1_000;

export type StandaloneTrack17V22Client = {
  getTrackingInfo(trackingNumber: string, carrier?: number): Promise<StandaloneTrack17Accepted | null>;
};

export type StandaloneTrack17Event = {
  a?: string;
  z?: string;
  l?: string;
};

export type StandaloneTrack17Accepted = {
  number: string;
  carrier: number;
  track: {
    z2: number;
    z1?: StandaloneTrack17Event[];
    z3?: StandaloneTrack17Event | null;
  };
};

type Dependencies = {
  getApiKey: () => Promise<string | null>;
  fetch?: typeof fetch;
  now?: () => number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEvent(value: unknown): value is StandaloneTrack17Event {
  if (!isRecord(value)) return false;
  return (value.a === undefined || typeof value.a === "string")
    && (value.z === undefined || typeof value.z === "string")
    && (value.l === undefined || typeof value.l === "string");
}

function isValidCarrier(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function hasValidIdentity(
  value: unknown,
): value is Record<string, unknown> & { number: string; carrier: number } {
  return isRecord(value)
    && typeof value.number === "string"
    && normalizeTrackingNumber(value.number).length > 0
    && isValidCarrier(value.carrier);
}

function identityMatches(
  value: { number: string; carrier: number },
  trackingNumber: string,
  carrier: number,
  allowResolvedCarrier = false,
): boolean {
  return normalizeTrackingNumber(value.number) === trackingNumber
    && (value.carrier === carrier || (allowResolvedCarrier && carrier === 0 && value.carrier > 0));
}

function isAcceptedTracking(
  value: unknown,
  trackingNumber: string,
  carrier: number,
): value is StandaloneTrack17Accepted {
  if (!hasValidIdentity(value)
    || !identityMatches(value, trackingNumber, carrier)
    || !isRecord(value.track)) return false;
  const { z2, z1, z3 } = value.track;
  return typeof z2 === "number"
    && Number.isSafeInteger(z2)
    && (z1 === undefined || (Array.isArray(z1) && z1.every(isEvent)))
    && (z3 === undefined || z3 === null || isEvent(z3));
}

function isRejectedEntry(
  value: unknown,
  trackingNumber: string,
  carrier: number,
): value is { number: string; carrier: number; error: { code: number } } {
  return hasValidIdentity(value)
    && identityMatches(value, trackingNumber, carrier)
    && isRecord(value.error)
    && typeof value.error.code === "number"
    && Number.isSafeInteger(value.error.code);
}

function remember<T>(map: Map<string, T>, key: string, value: T): void {
  map.delete(key);
  map.set(key, value);
  if (map.size > MAX_REMEMBERED_KEYS) {
    const oldest = map.keys().next().value;
    if (oldest !== undefined) map.delete(oldest);
  }
}

export function createStandaloneTrack17V22Client({
  getApiKey,
  fetch: fetchImplementation = globalThis.fetch,
  now = Date.now,
}: Dependencies): StandaloneTrack17V22Client {
  const inFlight = new Map<string, Promise<StandaloneTrack17Accepted | null>>();
  const registrations = new Map<string, number>();
  const failures = new Map<string, number>();

  async function post(path: string, number: string, carrier: number, apiKey: string): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetchImplementation(`${TRACK17_V22_BASE}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "17token": apiKey },
        body: JSON.stringify({ data: [{ number, carrier }] }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`17TRACK ${response.status}`);
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  async function run(
    key: string,
    trackingNumber: string,
    carrier: number,
  ): Promise<StandaloneTrack17Accepted | null> {
    try {
      const apiKey = await getApiKey();
      if (!apiKey) throw new Error("17TRACK API key missing");

      if (!registrations.has(key)) {
        const payload = await post("register", trackingNumber, carrier, apiKey);
        if (!isRecord(payload) || (payload.code !== 0 && payload.code !== -2) || !isRecord(payload.data)
          || !Array.isArray(payload.data.accepted) || !Array.isArray(payload.data.rejected)) {
          throw new Error("Malformed 17TRACK v2.2 registration response");
        }
        const accepted = payload.data.accepted;
        const rejected = payload.data.rejected;
        if (!accepted.every(item =>
          hasValidIdentity(item) && identityMatches(item, trackingNumber, carrier, true))
          || !rejected.every(item =>
            hasValidIdentity(item)
            && identityMatches(item, trackingNumber, carrier, true)
            && isRecord(item.error)
            && typeof item.error.code === "number"
            && Number.isSafeInteger(item.error.code))) {
          throw new Error("Malformed 17TRACK v2.2 registration entry");
        }
        const acceptedOutcome = payload.code === 0 && accepted.length === 1 && rejected.length === 0;
        const rejectedOutcome = payload.code === -2 && accepted.length === 0 && rejected.length === 1;
        if (!acceptedOutcome && !rejectedOutcome) {
          throw new Error("Contradictory 17TRACK v2.2 registration response");
        }
        const alreadyRegistered = payload.code === -2
          && isRecord(rejected[0])
          && isRecord(rejected[0].error)
          && rejected[0].error.code === -18019901;
        if (!acceptedOutcome && !alreadyRegistered) {
          remember(failures, key, now());
          return null;
        }
        const effectiveCarrier = accepted.length > 0
          ? accepted[0].carrier
          : rejected[0].carrier;
        remember(registrations, key, effectiveCarrier);
      }

      const effectiveCarrier = registrations.get(key) ?? carrier;
      const payload = await post("gettrackinfo", trackingNumber, effectiveCarrier, apiKey);
      if (!isRecord(payload) || (payload.code !== 0 && payload.code !== -2) || !isRecord(payload.data)
        || !Array.isArray(payload.data.accepted) || !Array.isArray(payload.data.rejected)) {
        throw new Error("Malformed 17TRACK v2.2 tracking response");
      }
      if (!payload.data.accepted.every(item =>
        isAcceptedTracking(item, trackingNumber, effectiveCarrier))
        || !payload.data.rejected.every(item =>
          isRejectedEntry(item, trackingNumber, effectiveCarrier))) {
        throw new Error("Malformed 17TRACK v2.2 accepted entry");
      }
      const acceptedOutcome = payload.code === 0
        && payload.data.accepted.length === 1
        && payload.data.rejected.length === 0;
      const rejectedOutcome = payload.code === -2
        && payload.data.accepted.length === 0
        && payload.data.rejected.length === 1;
      if (!acceptedOutcome && !rejectedOutcome) {
        throw new Error("Contradictory 17TRACK v2.2 tracking response");
      }
      const accepted = payload.data.accepted[0];
      if (accepted === undefined) {
        remember(failures, key, now());
        return null;
      }
      failures.delete(key);
      return accepted;
    } catch {
      remember(failures, key, now());
      return null;
    }
  }

  return {
    getTrackingInfo(trackingNumber, carrier = 0) {
      const key = trackingRefreshKey("standalone-v22", trackingNumber, carrier);
      const failedAt = failures.get(key);
      if (failedAt !== undefined && now() - failedAt < TRACKING_FAILURE_BACKOFF_MS) {
        return Promise.resolve(null);
      }
      const existing = inFlight.get(key);
      if (existing) return existing;

      const work = run(key, normalizeTrackingNumber(trackingNumber), carrier)
        .finally(() => inFlight.delete(key));
      inFlight.set(key, work);
      return work;
    },
  };
}