import { and, eq, isNull, type SQLWrapper } from "drizzle-orm";
import { wholesaleShareMembersTable } from "@workspace/db";

/** Matches the carrier observed before an asynchronous tracking lookup. */
export function nullableTrackingCarrierMatch(
  column: SQLWrapper,
  carrier: string | null | undefined,
) {
  return carrier == null ? isNull(column) : eq(column, carrier);
}


export function unchangedWholesaleOnwardIdentity(identity: {
  id: string;
  trackingNumber: string | null | undefined;
  carrier: string | null | undefined;
}) {
  return and(
    eq(wholesaleShareMembersTable.id, identity.id),
    nullableTrackingCarrierMatch(wholesaleShareMembersTable.onwardTrackingNumber, identity.trackingNumber),
    nullableTrackingCarrierMatch(wholesaleShareMembersTable.onwardCarrier, identity.carrier),
  );
}