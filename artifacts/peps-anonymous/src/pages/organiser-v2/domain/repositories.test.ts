import assert from "node:assert/strict";
import test from "node:test";
import { createPrototypeOrganiserRepositories } from "./repositories.ts";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

test("repository bundle composes GB-scoped sample orders and events", () => {
  const storage = new MemoryStorage();
  const repositories = createPrototypeOrganiserRepositories({
    groupBuyId: "gb-1",
    storage,
  });

  assert.deepEqual(
    repositories.orders.getSnapshot().map(order => order.id),
    ["ORD-001", "ORD-002", "ORD-003", "ORD-004"],
  );

  repositories.orders.updateMany(
    ["ORD-002"],
    order => ({ ...order, status: "paid" }),
    { type: "order.bulk_paid", actorId: "organiser", summary: "Marked ORD-002 paid" },
  );

  assert.equal(repositories.events.list("gb-1")[0].type, "order.bulk_paid");
  assert.deepEqual(repositories.events.list("gb-2"), []);
});
