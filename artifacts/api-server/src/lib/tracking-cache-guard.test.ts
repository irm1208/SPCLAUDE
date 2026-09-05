import { describe, expect, it } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { unchangedTrackingCache } from "./tracking-cache-guard";

describe("tracking refresh compare-and-swap", () => {
  it("matches old numbers, pairing and cache before writing or sending alerts", () => {
    const { sql, params } = new PgDialect().sqlToQuery(unchangedTrackingCache({
      id: "order", trackingNumber: "INT", trackingNumbers: ["INT", "LOCAL"],
      trackingPackages: [{ id: "p", courier: "bmurfs", internationalTrackingNumber: "INT", localTrackingNumber: "LOCAL" }],
      trackingDetails: { INT: { status: "delivered" } },
    })!);
    for (const field of ["tracking_number", "tracking_numbers", "tracking_packages", "tracking_details", "tracking_status", "tracking_last_checked"]) {
      expect(sql).toContain(`"${field}" IS NOT DISTINCT FROM`);
    }
    expect(sql).toContain('"deleted_at" is null');
    expect(sql).toContain('"shared_order_id" is null');
    expect(params).toContain('["INT","LOCAL"]');
  });
});