import { and, eq } from "drizzle-orm";
import { shipmentsTable } from "@workspace/db";
import { nullableTrackingCarrierMatch } from "./tracking-carrier-cas";

export function unchangedStandaloneShipmentIdentity(identity: {
  id: string;
  trackingNumber: string;
  carrier: string | null;
}) {
  return and(
    eq(shipmentsTable.id, identity.id),
    eq(shipmentsTable.trackingNumber, identity.trackingNumber),
    nullableTrackingCarrierMatch(shipmentsTable.carrier, identity.carrier),
  )!;
}