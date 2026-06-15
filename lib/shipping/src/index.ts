// ─── @workspace/shipping ─────────────────────────────────────────────────────
// Main entry point. Exports types and provider factory.

export * from "./types.js";
export { StubCarrierProvider } from "./provider-stub.js";
export { Parcel2GoProvider } from "./provider-parcel2go.js";

import type { CarrierProvider } from "./types.js";
import { StubCarrierProvider } from "./provider-stub.js";
import { Parcel2GoProvider } from "./provider-parcel2go.js";

/**
 * Return the appropriate carrier provider based on available env vars.
 * Falls back to stub when Parcel2Go credentials are not present.
 */
export function getCarrierProvider(): CarrierProvider {
  const clientId = process.env["PARCEL2GO_CLIENT_ID"];
  const clientSecret = process.env["PARCEL2GO_CLIENT_SECRET"];
  if (clientId && clientSecret) {
    return new Parcel2GoProvider(clientId, clientSecret);
  }
  return new StubCarrierProvider();
}

/** Total weight of a shipment given per-unit weights */
export function computeWeightGrams(
  items: Array<{ quantity: number; weightGrams: number | null }>,
  defaultWeightGrams = 50,
): number {
  return items.reduce((sum, item) => sum + item.quantity * (item.weightGrams ?? defaultWeightGrams), 0);
}
