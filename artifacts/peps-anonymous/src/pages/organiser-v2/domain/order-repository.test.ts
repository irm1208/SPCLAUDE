import assert from "node:assert/strict";
import test from "node:test";
import { createEventFactory, createPrototypeEventJournal } from "./events.ts";
import { createPrototypeOrderRepository } from "./order-repository.ts";
import { gbKey } from "../storage.ts";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const legacyOrder = {
  id: "ORD-001",
  memberUsername: "john_doe",
  memberName: "John D.",
  status: "pending",
  products: [{ name: "BPC-157", quantity: 1, price: 30 }],
  total: 30,
  paymentMethod: "Manual",
  country: "UK",
  createdAt: "2026-07-10T14:30:00Z",
  shippingOption: "UK Standard",
};

function setup() {
  const storage = new MemoryStorage();
  storage.setItem("orders", JSON.stringify([legacyOrder, { id: "broken" }]));
  const journal = createPrototypeEventJournal({ storage });
  const createEvent = createEventFactory({
    now: () => "2026-07-14T12:00:00.000Z",
    id: () => "evt-1",
  });
  const repository = createPrototypeOrderRepository({
    groupBuyId: "gb-1",
    storage,
    fallback: [],
    journal,
    createEvent,
  });
  return { storage, journal, repository };
}

test("repository normalizes the legacy fallback into its initial snapshot", () => {
  const { repository } = setup();
  assert.deepEqual(repository.getSnapshot().map(order => order.id), ["ORD-001"]);
  assert.deepEqual(repository.getReadIssues().map(issue => issue.index), [1]);
});

test("updateMany persists, emits one event, and notifies once", () => {
  const { storage, journal, repository } = setup();
  let notifications = 0;
  const unsubscribe = repository.subscribe(() => { notifications += 1; });

  repository.updateMany(
    ["ORD-001"],
    order => ({ ...order, status: "paid", paidAt: "2026-07-14T12:00:00.000Z" }),
    {
      type: "order.bulk_paid",
      actorId: "organiser",
      summary: "Marked 1 order as paid",
      correlationId: "bulk-1",
      causationId: "command-1",
      idempotencyKey: "gb-1:bulk-paid:command-1",
    },
  );
  unsubscribe();

  assert.equal(repository.getSnapshot()[0].status, "paid");
  assert.equal(notifications, 1);
  const event = journal.list("gb-1")[0];
  assert.equal(event.type, "order.bulk_paid");
  assert.equal(event.correlationId, "bulk-1");
  assert.equal(event.causationId, "command-1");
  assert.equal(event.idempotencyKey, "gb-1:bulk-paid:command-1");
  const stored = JSON.parse(storage.getItem(gbKey("gb-1", "orders"))!);
  assert.equal(stored.schemaVersion, 1);
  assert.equal(stored.data[0].status, "paid");
});

test("replaceOne updates one order and emits order.updated", () => {
  const { journal, repository } = setup();
  const original = repository.getSnapshot()[0];
  repository.replaceOne(
    { ...original, trackingNumber: "TRACK-2", internalNotes: "Updated" },
    { type: "order.updated", actorId: "organiser", summary: "Updated ORD-001" },
  );
  assert.equal(repository.getSnapshot()[0].trackingNumber, "TRACK-2");
  assert.equal(journal.list("gb-1")[0].type, "order.updated");
});

test("a mutation with no matching ids performs no write or event", () => {
  const { journal, repository } = setup();
  const before = repository.getSnapshot();
  const after = repository.updateMany(
    ["missing"],
    order => ({ ...order, status: "paid" }),
    { type: "order.bulk_paid", actorId: "organiser", summary: "No-op" },
  );
  assert.equal(after, before);
  assert.deepEqual(journal.list("gb-1"), []);
});
