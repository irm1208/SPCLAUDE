import { describe, expect, it } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { unchangedTrackingWriteFields } from "./tracking-write-cas";

describe("unchangedTrackingWriteFields", () => {
  it("binds JSON snapshots as JSON strings and timestamps as timestamptz values", () => {
    const query = new PgDialect().sqlToQuery(unchangedTrackingWriteFields({
      trackingNumber: "INTL",
      trackingNumbers: ["INTL", "LOCAL"],
      trackingPackages: [{
        id: "p1", courier: "bmurfs",
        internationalTrackingNumber: "INTL", localTrackingNumber: "LOCAL",
      }],
      trackingDetails: { INTL: { status: "in_transit" } },
      trackingStatus: "in_transit",
      trackingLastChecked: new Date("2026-01-01T00:00:00.000Z"),
      trackingEvents: [{ date: "2026", status: "Accepted", location: "CN" }],
      trackingShippedItems: { INTL: [{ name: "Contents", qty: 1 }] },
    })!);

    expect(query.sql.match(/::jsonb/g)).toHaveLength(5);
    expect(query.sql).toContain("::timestamptz");
    expect(query.params).toContain(JSON.stringify(["INTL", "LOCAL"]));
    expect(query.params).toContain(JSON.stringify({ INTL: { status: "in_transit" } }));
    expect(query.params).toContain("2026-01-01T00:00:00.000Z");
    expect(query.params.some(Array.isArray)).toBe(false);
  });
});