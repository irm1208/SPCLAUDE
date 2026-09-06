import type { Track17Client, Track17DetailedResult, Track17LookupOptions } from "./track17-client";
import { isManualTrackingRefreshAllowed } from "./tracking-refresh-policy";

export type ManualTrackingRefreshResult =
  | { kind: "skipped" }
  | { kind: "fetched"; result: Track17DetailedResult };

export async function refreshManuallyIfAllowed({
  trackingNumber,
  carrierCode = 0,
  status,
  lastChecked,
  client,
  options,
  now,
}: {
  trackingNumber: string;
  carrierCode?: number;
  status: string | null | undefined;
  lastChecked: Date | string | null | undefined;
  client: Track17Client;
  options?: Track17LookupOptions;
  now?: number;
}): Promise<ManualTrackingRefreshResult> {
  if (!isManualTrackingRefreshAllowed(lastChecked, status, now)) return { kind: "skipped" };
  return {
    kind: "fetched",
    result: await client.getTrackingInfoDetailed(trackingNumber, carrierCode, options),
  };
}