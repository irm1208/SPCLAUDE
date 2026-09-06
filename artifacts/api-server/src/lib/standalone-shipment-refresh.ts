import type { MaskedEvent } from "@workspace/db";
import type {
  StandaloneTrack17Accepted,
  StandaloneTrack17V22Client,
} from "./standalone-track17-v22";
import { isManualTrackingRefreshAllowed } from "./tracking-refresh-policy";

const COUNTRY_MAP: [string, string][] = [
  ["hong kong", "China"], ["china", "China"], [", cn", "China"],
  ["united kingdom", "United Kingdom"], ["england", "United Kingdom"],
  ["scotland", "United Kingdom"], [", uk", "United Kingdom"],
  ["united states", "United States"], [", usa", "United States"], [", us", "United States"],
  ["germany", "Germany"], ["france", "France"], ["netherlands", "Netherlands"],
  ["belgium", "Belgium"], ["poland", "Poland"], ["sweden", "Sweden"],
  ["norway", "Norway"], ["denmark", "Denmark"], ["finland", "Finland"],
  ["spain", "Spain"], ["italy", "Italy"], ["portugal", "Portugal"],
  ["switzerland", "Switzerland"], ["austria", "Austria"],
  ["australia", "Australia"], ["canada", "Canada"],
  ["japan", "Japan"], ["south korea", "South Korea"], ["singapore", "Singapore"],
  ["taiwan", "China"], ["thailand", "Thailand"], ["india", "India"],
];

const STATUS_CODE_MAP: Record<number, string> = {
  0: "pending", 10: "pending", 20: "in_transit", 30: "out_for_delivery",
  35: "attempted", 40: "delivered", 50: "exception", 60: "expired",
};

function maskLocation(location: string): string {
  const lower = location.toLowerCase();
  return COUNTRY_MAP.find(([key]) => lower.includes(key))?.[1] ?? "";
}

function maskStatus(status: string): string {
  return status
    .replace(/signed\s+(for\s+)?by[:\s]+[A-Z][a-zA-Z]+(\s+[A-Z][a-zA-Z]+)*/g, "Signed for")
    .replace(/received\s+by[:\s]+[A-Z][a-zA-Z]+(\s+[A-Z][a-zA-Z]+)*/gi, "Received")
    .replace(/\d{1,5}\s+[A-Z][a-zA-Z]+(\s+[A-Z][a-zA-Z]*)*(St|Ave|Blvd|Rd|Dr|Ln|Ct|Pl|Way|Street|Avenue|Road)/gi, "")
    .trim();
}

export function parseStandaloneTrack17Response(
  accepted: StandaloneTrack17Accepted,
): { status: string; statusCode: number; events: MaskedEvent[] } {
  const { track } = accepted;
  const raw = track.z3 ? [track.z3, ...(track.z1 ?? [])] : (track.z1 ?? []);
  const events = raw
    .map(event => ({
      date: event.a ?? "",
      status: maskStatus(event.z ?? ""),
      location: maskLocation(event.l ?? ""),
    }))
    .filter(event => event.status);
  return {
    status: STATUS_CODE_MAP[track.z2] ?? "pending",
    statusCode: track.z2,
    events,
  };
}

export type StandaloneShipmentSnapshot = {
  id: string;
  trackingNumber: string;
  carrier: string | null;
  status: string | null;
  lastChecked: Date | string | null;
};

export type StandaloneShipmentUpdate = {
  status: string;
  statusCode: number;
  cachedEvents: string;
  lastChecked: Date;
};

export async function refreshStandaloneShipmentIfAllowed({
  shipment,
  client,
  persist,
  now = Date.now(),
}: {
  shipment: StandaloneShipmentSnapshot;
  client: StandaloneTrack17V22Client;
  persist: (
    identity: Pick<StandaloneShipmentSnapshot, "id" | "trackingNumber" | "carrier">,
    update: StandaloneShipmentUpdate,
  ) => Promise<boolean>;
  now?: number;
}): Promise<StandaloneShipmentRefreshResult> {
  if (!isManualTrackingRefreshAllowed(shipment.lastChecked, shipment.status, now)) {
    return { kind: "skipped" };
  }
  const accepted = await client.getTrackingInfo(shipment.trackingNumber, 0);
  if (!accepted) return { kind: "unavailable" };

  const parsed = parseStandaloneTrack17Response(accepted);
  const updated = await persist(
    {
      id: shipment.id,
      trackingNumber: shipment.trackingNumber,
      carrier: shipment.carrier,
    },
    {
      status: parsed.status,
      statusCode: parsed.statusCode,
      cachedEvents: JSON.stringify(parsed.events),
      lastChecked: new Date(now),
    },
  );
  return { kind: updated ? "updated" : "conflict" };
}

export type StandaloneShipmentRefreshResult = {
  kind: "skipped" | "unavailable" | "updated" | "conflict";
};