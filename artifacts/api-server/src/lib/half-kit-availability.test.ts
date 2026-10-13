import { describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
vi.mock("@workspace/db", () => ({ db: {} }));
import { halfKitAvailability } from "./half-kit-availability";

describe("half-kit availability", () => {
  it("returns per-group counts in one query, scoped to the account's accessible groups", async () => {
    const execute = vi.fn().mockResolvedValue({ rows: [{ groupId: "g1", count: 2 }, { groupId: "g2", count: 1 }] });
    expect(await halfKitAvailability("@MEMBER", { execute })).toEqual({ counts: { g1: 2, g2: 1 } });
    expect(execute).toHaveBeenCalledTimes(1);
    const query = new PgDialect().sqlToQuery(execute.mock.calls[0][0]);
    expect(query.params).toContain("member");
    for (const requirement of ["account_group_buys", "organiser_id", "telegram_username", "h.published = true", "h.currency = g.currency", "gbp.active = true", "'active', 'closed'", "'Draft', 'Cancelled'", "o.deleted_at IS NULL", "0.5"]) {
      expect(query.sql).toContain(requirement);
    }
  });
  it("returns no badges when no published halves remain", async () => {
    expect(await halfKitAvailability("member", { execute: async () => ({ rows: [] }) })).toEqual({ counts: {} });
  });
  it("propagates database failures instead of pretending no offers exist", async () => {
    await expect(halfKitAvailability("member", { execute: async () => { throw new Error("unavailable"); } })).rejects.toThrow("unavailable");
  });
});
