import { describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
vi.mock("@workspace/db", async () => import("../../../../lib/db/src/schema/index"));
import { broadcastBatchOrderIds, broadcastBatchUsernames } from "./broadcast-batch-filter";

function database(batch?: any) {
  const limit = vi.fn(async () => batch ? [batch] : []);
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));
  return { select: vi.fn(() => ({ from })), where };
}
describe("existing broadcast batch filter", () => {
  it("keeps unfiltered broadcasts unchanged", async () => {
    const db = database();
    expect(await broadcastBatchOrderIds(db, "gb", undefined)).toBeNull();
    expect(db.select).not.toHaveBeenCalled();
  });
  it("uses allocated order IDs, not stale snapshot usernames, and deduplicates", async () => {
    const db = database({ state: "ordered", snapshot: { orders: [{ id: "one" }, { id: "one" }, { id: "two" }] } });
    expect(await broadcastBatchOrderIds(db, "gb", "batch")).toEqual(["one", "two"]);
    expect(db.where).toHaveBeenCalledOnce();
    expect(new PgDialect().sqlToQuery(db.where.mock.calls[0][0]).params).toEqual(["batch", "gb"]);
  });
  it("never falls back to all members for missing, released or empty batches", async () => {
    await expect(broadcastBatchOrderIds(database(), "gb", "missing")).rejects.toMatchObject({ status: 400 });
    await expect(broadcastBatchOrderIds(database({ state: "released" }), "gb", "released")).rejects.toMatchObject({ status: 400 });
    expect(await broadcastBatchOrderIds(database({ state: "prepared", snapshot: { orders: [] } }), "gb", "empty")).toEqual([]);
  });
  it("rejects malformed batch selection", async () => {
    for (const input of [null, "", [], {}, 5]) {
      await expect(broadcastBatchOrderIds(database(), "gb", input)).rejects.toMatchObject({ status: 400 });
    }
  });
  it("queries current undeleted, non-cancelled order ownership in this group only", async () => {
    const db = database({ state: "ordered", snapshot: { orders: [{ id: "one", username: "old-handle" }] } });
    const where = vi.fn(async () => [{ username: "@NEW-HANDLE" }]);
    db.select.mockImplementationOnce(() => ({ from: () => ({ where: db.where }) }))
      .mockImplementationOnce(() => ({ from: () => ({ where }) }) as any);
    expect(await broadcastBatchUsernames(db, "gb", "batch")).toEqual(new Set(["new-handle"]));
    const query = new PgDialect().sqlToQuery(where.mock.calls[0][0]);
    expect(query.params).toEqual(["gb", "Cancelled", "one"]);
    expect(query.sql).toContain('"deleted_at" is null');
  });
});
