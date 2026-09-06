import { describe, expect, it } from "vitest";
import { PgDialect, pgTable, text } from "drizzle-orm/pg-core";
import { nullableTrackingCarrierMatch } from "./tracking-carrier-cas";
import { unchangedWholesaleOnwardIdentity } from "./tracking-carrier-cas";

const cache = pgTable("tracking_cache", {
  carrier: text("carrier"),
});


describe("nullableTrackingCarrierMatch", () => {
  it("rejects a same-number stale write after its carrier changes", () => {
    const dialect = new PgDialect();
    const observed = dialect.sqlToQuery(nullableTrackingCarrierMatch(cache.carrier, "Royal Mail"));
    const changed = dialect.sqlToQuery(nullableTrackingCarrierMatch(cache.carrier, "Evri"));

    expect(observed.sql).toContain('"tracking_cache"."carrier" = $1');
    expect(observed.params).toEqual(["Royal Mail"]);
    expect(changed.params).not.toEqual(observed.params);
  });

  it("uses IS NULL for an observed auto-detect carrier", () => {
    const query = new PgDialect().sqlToQuery(nullableTrackingCarrierMatch(cache.carrier, null));
    expect(query.sql).toContain('"tracking_cache"."carrier" is null');
  });

  it("guards onward writes by ID, number, and nullable carrier", () => {
    const query = new PgDialect().sqlToQuery(unchangedWholesaleOnwardIdentity({
      id: "member-1",
      trackingNumber: "TRACK-1",
      carrier: "Royal Mail",
    })!);
    expect(query.sql).toContain("onward_tracking_number");
    expect(query.sql).toContain("onward_carrier");
    expect(query.params).toEqual(expect.arrayContaining(["member-1", "TRACK-1", "Royal Mail"]));
  });
});