import { and, eq, sql } from "drizzle-orm";
import { gbParcelsTable, trackingLinksTable } from "@workspace/db";
import type { Track17DetailedResult } from "./track17-client";

export function unchangedGbParcelTrackingIdentity(parcel: {
  id: string;
  trackingNumber: string;
  carrier: string | null;
  trackingParams: unknown;
}) {
  const params = parcel.trackingParams == null ? null : JSON.stringify(parcel.trackingParams);
  return and(
    eq(gbParcelsTable.id, parcel.id),
    sql`${gbParcelsTable.trackingNumber} IS NOT DISTINCT FROM ${parcel.trackingNumber}`,
    sql`${gbParcelsTable.carrier} IS NOT DISTINCT FROM ${parcel.carrier}`,
    sql`${gbParcelsTable.trackingParams} IS NOT DISTINCT FROM ${params}::jsonb`,
  );
}

export function unchangedTrackingLinkPackages(id: string, packages: unknown) {
  return and(
    eq(trackingLinksTable.id, id),
    sql`${trackingLinksTable.packages} IS NOT DISTINCT FROM ${JSON.stringify(packages)}::jsonb`,
  );
}

export function casWriteConflicted(savedRows: readonly unknown[]): boolean {
  return savedRows.length === 0;
}

export function gbRefreshConflictResponse<T extends Record<string, unknown>>(
  result: { ok: boolean; conflict?: boolean; reason?: string },
  reloadedParcel: T | undefined,
): { status: 404 | 409; body: Record<string, unknown> } | null {
  if (!reloadedParcel) return { status: 404, body: { error: "Parcel not found" } };
  if (!result.conflict) return null;
  return {
    status: 409,
    body: {
      ...reloadedParcel,
      _refreshWarning: result.reason ?? "Tracking details changed while refresh was in progress",
    },
  };
}

export function gbManualRefreshUnavailableReason(result: Exclude<Track17DetailedResult, { kind: "success" }>): string {
  if (result.kind === "info_unavailable"
    || (result.kind === "provider_failure" && result.stage === "tracking")) {
    return "Registered with 17track — data not available yet (may take a few minutes)";
  }
  return "Tracking number not recognised by 17track — try specifying the carrier";
}

export async function completeGbCarrierRefresh({
  initialResult,
  trackingNumber,
  carrierCode,
  extraParams,
  getTrackingInfoDetailed,
  changeCarrier,
  revalidateAfterCarrierChange,
}: {
  initialResult: Track17DetailedResult;
  trackingNumber: string;
  carrierCode: number;
  extraParams: Record<string, string>;
  getTrackingInfoDetailed: (
    trackingNumber: string,
    carrierCode: number,
    options: { extraParams: Record<string, string> },
  ) => Promise<Track17DetailedResult>;
  changeCarrier: (trackingNumber: string, oldCode: number, newCode: number) => Promise<boolean>;
  revalidateAfterCarrierChange: (
    trackingNumber: string,
    carrierCode: number,
    options: { extraParams: Record<string, string> },
  ) => Promise<Track17DetailedResult>;
}): Promise<{ providerResult: Track17DetailedResult; carrierCode: number }> {
  let providerResult = initialResult;
  let effectiveCarrierCode = carrierCode;
  const registrationFailed = providerResult.kind === "registration_rejected"
    || (providerResult.kind === "provider_failure" && providerResult.stage === "registration");
  if (registrationFailed && carrierCode > 0) {
    providerResult = await getTrackingInfoDetailed(trackingNumber, 0, { extraParams });
    if (providerResult.kind === "success") effectiveCarrierCode = 0;
  }

  if (providerResult.kind === "success" && effectiveCarrierCode > 0) {
    const registeredCarrier = (providerResult.accepted as { carrier?: number }).carrier ?? 0;
    if (registeredCarrier > 0 && registeredCarrier !== effectiveCarrierCode
      && await changeCarrier(trackingNumber, registeredCarrier, effectiveCarrierCode)) {
      providerResult = await revalidateAfterCarrierChange(
        trackingNumber,
        effectiveCarrierCode,
        { extraParams },
      );
    }
  }
  return { providerResult, carrierCode: effectiveCarrierCode };
}