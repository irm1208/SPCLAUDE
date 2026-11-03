import { describe, expect, it } from "vitest";
import { coaConfig, coaDetails, csvCell, holdsCoaPlace, coaCanClaim, publicCoaRequest } from "./coa-rules";

describe("separate group-buy COA commitments", () => {
  it("counts invites and payment evidence, but expires public unpaid reservations", () => {
    const expired = { source: "public", status: "reserved", expiresAt: new Date(0), txHash: null, reference: null };
    expect(holdsCoaPlace(expired)).toBe(false);
    expect(holdsCoaPlace({ ...expired, txHash: "evidence" })).toBe(true);
    expect(holdsCoaPlace({ ...expired, source: "invited", status: "invited" })).toBe(true);
    expect(holdsCoaPlace({ ...expired, status: "paid" })).toBe(true);
    expect(holdsCoaPlace({ ...expired, status: "withdrawn" })).toBe(false);
  });
  it("converting an invitation consumes no second place; public claims respect mode and cap", () => {
    expect(coaCanClaim("selected", 0, true)).toBe(true);
    expect(coaCanClaim("open", 0, false)).toBe(false);
    expect(coaCanClaim("selected", 4, false)).toBe(false);
    expect(coaCanClaim("disabled", 4, false)).toBe(false);
    expect(coaCanClaim("open", 1, false)).toBe(true);
  });
  it("requires exact settings and every field, rejecting silent defaults", () => {
    const valid = { mode: "open", fee: 30, currency: "USD", cap: 5, rails: [], manualInstructions: "Pay by arrangement" };
    expect(coaConfig(valid).fee).toBe(30);
    for (const change of [{ cap: 0 }, { fee: -1 }, { fee: 2.345 }, { currency: "USDT" }, { mode: "other" }, { manualInstructions: "" }])
      expect(() => coaConfig({ ...valid, ...change })).toThrow();
    expect(coaDetails({ client: " a ", sample: "b", manufacturer: "c", batch: "d" }).client).toBe("a");
    expect(() => coaDetails({ client: "a", sample: "b", manufacturer: "c" })).toThrow();
  });
  it("removes Admin notes and neutralises spreadsheet formulas", () => {
    expect(publicCoaRequest({ id: "a", internalNotes: "private", createdBy: "staff", confirmedBy: "staff", confirmationNote: "bank evidence" }))
      .toEqual({ id: "a", certificate: null });
    for (const value of ["=SUM(1)", "+cmd", "-1", "@evil", "\t=CMD", "\n+CMD"])
      expect(csvCell(value)).toMatch(/^"'/);
    expect(csvCell('a"b')).toBe('"a""b"');
  });
});
