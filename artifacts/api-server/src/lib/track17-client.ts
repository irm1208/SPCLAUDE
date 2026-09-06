import {
  TRACKING_FAILURE_BACKOFF_MS,
  normalizeTrackingNumber,
  trackingRefreshKey,
} from "./tracking-refresh-policy";

const TRACK17_BASE = "https://api.17track.net/track/v2.4";
const FETCH_TIMEOUT_MS = 10_000;
const MAX_REMEMBERED_KEYS = 1_000;
let mutationTokenSequence = 0n;

function nextMutationToken(): string {
  mutationTokenSequence += 1n;
  return mutationTokenSequence.toString();
}

export type Track17Client = {
  getTrackingInfo(
    trackingNumber: string,
    carrierCode?: number,
    options?: Track17LookupOptions,
  ): Promise<unknown | null>;
  getTrackingInfoDetailed(
    trackingNumber: string,
    carrierCode?: number,
    options?: Track17LookupOptions,
  ): Promise<Track17DetailedResult>;
  changeCarrier(trackingNumber: string, oldCarrierCode: number, newCarrierCode: number): Promise<boolean>;
  revalidateAfterCarrierChange(
    trackingNumber: string,
    carrierCode: number,
    options?: Pick<Track17LookupOptions, "extraParams">,
  ): Promise<Track17DetailedResult>;
};

export type Track17LookupOptions = {
  force?: boolean;
  extraParams?: Record<string, string>;
  /** GB-only compatibility: expose a same-number alternate get-info carrier for correction. */
  allowAlternateTrackingCarrier?: boolean;
};

export type Track17DetailedResult =
  | { kind: "success"; accepted: unknown }
  | { kind: "registration_rejected" }
  | { kind: "info_unavailable" }
  | { kind: "provider_failure"; stage: "registration" | "tracking" };

type Track17Dependencies = {
  getApiKey: () => Promise<string | null>;
  fetch?: typeof fetch;
  now?: () => number;
};

type RegisterResponse = {
  data?: {
    accepted?: unknown[];
    rejected?: unknown[];
  };
};

type TrackingResponse = {
  data?: { accepted?: unknown[]; rejected?: unknown[] };
};

type RegistrationResult =
  | { kind: "ready"; carrier: number }
  | { kind: "rejected" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function identityCarrier(
  value: unknown,
  trackingNumber: string,
  expectedCarrier: number,
  allowResolvedCarrier = false,
): number | null {
  if (!isRecord(value) || typeof value.number !== "string"
    || normalizeTrackingNumber(value.number) !== trackingNumber
    || typeof value.carrier !== "number" || !Number.isInteger(value.carrier) || value.carrier < 0) {
    return null;
  }
  if (!allowResolvedCarrier && value.carrier !== expectedCarrier) return null;
  return value.carrier;
}

function rejectedCarrier(
  value: unknown,
  trackingNumber: string,
  expectedCarrier: number,
  allowResolvedCarrier = false,
): number | null {
  const carrier = identityCarrier(value, trackingNumber, expectedCarrier, allowResolvedCarrier);
  if (carrier === null || !isRecord(value) || !isRecord(value.error)
    || typeof value.error.code !== "number" || !Number.isFinite(value.error.code)) {
    return null;
  }
  return carrier;
}

function remember<T>(map: Map<string, T>, key: string, value: T): void {
  map.set(key, value);
  if (map.size > MAX_REMEMBERED_KEYS) {
    const oldest = map.keys().next().value;
    if (oldest !== undefined) map.delete(oldest);
  }
}

export function createTrack17Client({
  getApiKey,
  fetch: fetchImplementation = globalThis.fetch,
  now = Date.now,
}: Track17Dependencies): Track17Client {
  const inFlight = new Map<string, Promise<Track17DetailedResult>>();
  const registrations = new Map<string, { at: number; carrier: number }>();
  const registrationInFlight = new Map<string, Promise<RegistrationResult>>();
  const trackingInFlight = new Map<string, Promise<TrackingResponse>>();
  const failures = new Map<string, { at: number; result: Track17DetailedResult }>();
  const changeInFlight = new Map<string, Promise<boolean>>();
  const changeFailures = new Map<string, number>();
  const latestMutationTokens = new Map<string, string>();

  async function post(path: string, entry: Record<string, unknown>, apiKey: string): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetchImplementation(`${TRACK17_BASE}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "17token": apiKey },
        body: JSON.stringify([entry]),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`17TRACK ${response.status}`);
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  async function refresh(
    key: string,
    registrationKey: string,
    providerWorkKey: string,
    mutationIdentityKey: string,
    mutationTokenAtStart: string | undefined,
    trackingNumber: string,
    carrierCode: number,
    extraParams: Record<string, string>,
    allowAlternateTrackingCarrier: boolean,
  ): Promise<Track17DetailedResult> {
    let stage: "registration" | "tracking" = "registration";
    try {
      const apiKey = await getApiKey();
      if (!apiKey) return { kind: "provider_failure", stage };
      let effectiveCarrier = carrierCode;
      const registrationEntry = carrierCode > 0
        ? { number: trackingNumber, carrier: carrierCode }
        : { number: trackingNumber };
      Object.assign(registrationEntry, extraParams);

      const rememberedRegistration = registrations.get(registrationKey);
      if (rememberedRegistration) {
        effectiveCarrier = rememberedRegistration.carrier;
      } else {
        let registrationWork = registrationInFlight.get(providerWorkKey);
        if (!registrationWork) {
          registrationWork = (async (): Promise<RegistrationResult> => {
            const registration = await post("/register", registrationEntry, apiKey) as RegisterResponse;
            const accepted = registration.data?.accepted;
            const rejected = registration.data?.rejected;
            if (!Array.isArray(accepted) || !Array.isArray(rejected)) {
              throw new Error("Malformed 17TRACK registration response");
            }
            if (accepted.length + rejected.length !== 1) {
              throw new Error("Ambiguous 17TRACK registration response");
            }
            if (accepted.length === 1) {
              const resolved = identityCarrier(accepted[0], trackingNumber, carrierCode, carrierCode === 0);
              if (resolved === null) throw new Error("Mismatched 17TRACK registration identity");
              remember(registrations, registrationKey, { at: now(), carrier: resolved });
              return { kind: "ready", carrier: resolved };
            }
            const resolved = rejectedCarrier(rejected[0], trackingNumber, carrierCode, carrierCode === 0);
            if (resolved === null) throw new Error("Malformed 17TRACK registration rejection");
            const errorCode = (rejected[0] as { error: { code: number } }).error.code;
            if (errorCode !== -18019901) return { kind: "rejected" };
            remember(registrations, registrationKey, { at: now(), carrier: resolved });
            return { kind: "ready", carrier: resolved };
          })().finally(() => registrationInFlight.delete(providerWorkKey));
          registrationInFlight.set(providerWorkKey, registrationWork);
        }
        const registrationResult = await registrationWork;
        if (registrationResult.kind === "rejected") {
          const result = { kind: "registration_rejected" } as const;
          if (latestMutationTokens.get(mutationIdentityKey) === mutationTokenAtStart) {
            remember(failures, key, { at: now(), result });
          }
          return latestMutationTokens.get(mutationIdentityKey) === mutationTokenAtStart
            ? result
            : { kind: "provider_failure", stage };
        }
        effectiveCarrier = registrationResult.carrier;
      }

      stage = "tracking";
      const trackingEntry = effectiveCarrier > 0
        ? { number: trackingNumber, carrier: effectiveCarrier }
        : { number: trackingNumber };
      Object.assign(trackingEntry, extraParams);
      const rawTrackingKey = `${providerWorkKey}:carrier=${effectiveCarrier}`;
      let trackingWork = trackingInFlight.get(rawTrackingKey);
      if (!trackingWork) {
        trackingWork = (post("/gettrackinfo", trackingEntry, apiKey) as Promise<TrackingResponse>)
          .finally(() => trackingInFlight.delete(rawTrackingKey));
        trackingInFlight.set(rawTrackingKey, trackingWork);
      }
      const tracking = await trackingWork;
      if (!Array.isArray(tracking.data?.accepted) || !Array.isArray(tracking.data?.rejected)) {
        throw new Error("Malformed 17TRACK tracking response");
      }
      if (tracking.data.accepted.length + tracking.data.rejected.length !== 1) {
        throw new Error("Ambiguous 17TRACK tracking response");
      }
      if (tracking.data.accepted.length === 1) {
        const accepted = tracking.data.accepted[0];
        const exactCarrier = identityCarrier(accepted, trackingNumber, effectiveCarrier);
        const observedCarrier = allowAlternateTrackingCarrier
          ? identityCarrier(accepted, trackingNumber, effectiveCarrier, true)
          : null;
        if ((exactCarrier === null && (observedCarrier === null || observedCarrier <= 0))
          || !isRecord(accepted) || !isRecord(accepted.track_info)) {
          throw new Error("Malformed 17TRACK tracking identity");
        }
        if (latestMutationTokens.get(mutationIdentityKey) !== mutationTokenAtStart) {
          return { kind: "provider_failure", stage };
        }
        failures.delete(key);
        return { kind: "success", accepted };
      }
      if (rejectedCarrier(tracking.data.rejected[0], trackingNumber, effectiveCarrier) === null) {
        throw new Error("Malformed 17TRACK tracking rejection");
      }
      if (latestMutationTokens.get(mutationIdentityKey) !== mutationTokenAtStart) {
        return { kind: "provider_failure", stage };
      }
      failures.delete(key);
      return { kind: "info_unavailable" };
    } catch {
      const result = { kind: "provider_failure", stage } as const;
      if (latestMutationTokens.get(mutationIdentityKey) === mutationTokenAtStart) {
        remember(failures, key, { at: now(), result });
      }
      return result;
    }
  }

  function getTrackingInfoDetailed(
    trackingNumber: string,
    carrierCode = 0,
    options?: Track17LookupOptions,
  ): Promise<Track17DetailedResult> {
    return getTrackingInfoDetailedWithKey(trackingNumber, carrierCode, options);
  }

  function getTrackingInfoDetailedWithKey(
    trackingNumber: string,
    carrierCode: number,
    options: Track17LookupOptions | undefined,
    keyVariant?: string,
  ): Promise<Track17DetailedResult> {
    const extraParams = options?.extraParams ?? {};
    const extraKey = JSON.stringify(
      Object.entries(extraParams).sort(([left], [right]) => left.localeCompare(right)),
    );
    const registrationKey = `${trackingRefreshKey("track17", trackingNumber, carrierCode)}:${extraKey}`;
    const normalizedNumber = normalizeTrackingNumber(trackingNumber);
    const mutationIdentityKey = trackingRefreshKey("track17-mutation", normalizedNumber, 0);
    const mutationTokenAtStart = latestMutationTokens.get(mutationIdentityKey);
    const ordinaryMutationToken = mutationTokenAtStart ?? "none";
    const key = keyVariant
      ? `${registrationKey}:${keyVariant}`
      : `${registrationKey}:alternate=${options?.allowAlternateTrackingCarrier === true ? 1 : 0}:mutation=${ordinaryMutationToken}`;
    const previousFailure = failures.get(key);
    if (previousFailure !== undefined
      && now() - previousFailure.at < TRACKING_FAILURE_BACKOFF_MS) {
      return Promise.resolve(previousFailure.result);
    }

    const existing = inFlight.get(key);
    if (existing) return existing;

    const providerWorkKey = keyVariant
      ? `${registrationKey}:raw:${keyVariant}`
      : `${registrationKey}:raw:ordinary:mutation=${ordinaryMutationToken}`;
    const work = refresh(
      key,
      registrationKey,
      providerWorkKey,
      mutationIdentityKey,
      mutationTokenAtStart,
      normalizedNumber,
      carrierCode,
      extraParams,
      options?.allowAlternateTrackingCarrier === true,
    ).finally(() => {
      inFlight.delete(key);
    });
    inFlight.set(key, work);
    return work;
  }

  return {
    async getTrackingInfo(trackingNumber, carrierCode = 0, options) {
      const result = await getTrackingInfoDetailed(trackingNumber, carrierCode, options);
      return result.kind === "success" ? result.accepted : null;
    },
    getTrackingInfoDetailed,
    changeCarrier(trackingNumber, oldCarrierCode, newCarrierCode) {
      const normalizedNumber = normalizeTrackingNumber(trackingNumber);
      const key = `${trackingRefreshKey("track17-change", normalizedNumber, newCarrierCode)}:${oldCarrierCode}`;
      const previousFailure = changeFailures.get(key);
      if (previousFailure !== undefined && now() - previousFailure < TRACKING_FAILURE_BACKOFF_MS) {
        return Promise.resolve(false);
      }
      const existing = changeInFlight.get(key);
      if (existing) return existing;

      const work = (async () => {
        try {
          const apiKey = await getApiKey();
          if (!apiKey) return false;
          const response = await post("/changecarrier", {
            number: normalizedNumber,
            carrier_old: oldCarrierCode,
            carrier_new: newCarrierCode,
          }, apiKey) as RegisterResponse;
          const accepted = response.data?.accepted;
          const rejected = response.data?.rejected;
          if (!Array.isArray(accepted) || !Array.isArray(rejected)
            || accepted.length !== 1 || rejected.length !== 0
            || identityCarrier(accepted[0], normalizedNumber, newCarrierCode) === null) {
            throw new Error("Malformed 17TRACK carrier-change response");
          }
          changeFailures.delete(key);
          const generationKey = trackingRefreshKey("track17-mutation", normalizedNumber, 0);
          remember(latestMutationTokens, generationKey, nextMutationToken());
          return true;
        } catch {
          remember(changeFailures, key, now());
          return false;
        }
      })().finally(() => changeInFlight.delete(key));
      changeInFlight.set(key, work);
      return work;
    },
    revalidateAfterCarrierChange(trackingNumber, carrierCode, options) {
      const normalizedNumber = normalizeTrackingNumber(trackingNumber);
      const generationKey = trackingRefreshKey("track17-mutation", normalizedNumber, 0);
      const mutationToken = latestMutationTokens.get(generationKey);
      if (mutationToken === undefined) {
        return Promise.resolve({ kind: "provider_failure", stage: "tracking" });
      }
      return getTrackingInfoDetailedWithKey(
        normalizedNumber,
        carrierCode,
        { extraParams: options?.extraParams },
        `mutation=${mutationToken}`,
      );
    },
  };
}