import { describe, expect, it } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { shipmentsTable } from "@workspace/db";
import { unchangedStandaloneShipmentIdentity } from "./standalone-shipment-cas";

describe("standalone shipment identity CAS", () => {
  it("matches id, tracking number, and non-null carrier", () => {
    const query = new PgDialect().sqlToQuery(unchangedStandaloneShipmentIdentity({
      id: "one",
      trackingNumber: "ABC",
      carrier: "Auto",
    }));
    expect(query.sql).toContain(`"${shipmentsTable.id.name}" = $1`);
    expect(query.sql).toContain(`"${shipmentsTable.trackingNumber.name}" = $2`);
    expect(query.sql).toContain(`"${shipmentsTable.carrier.name}" = $3`);
    expect(query.params).toEqual(["one", "ABC", "Auto"]);
  });

  it("uses IS NULL for an observed nullable carrier", () => {
    const query = new PgDialect().sqlToQuery(unchangedStandaloneShipmentIdentity({
      id: "one",
      trackingNumber: "ABC",
      carrier: null,
    }));
    expect(query.sql).toContain(`"${shipmentsTable.carrier.name}" is null`);
  });
});