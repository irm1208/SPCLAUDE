import assert from "node:assert/strict";
import test from "node:test";
import { createEventFactory, createMemoryEventJournal, createPrototypeEventJournal } from "./events.ts";
import { gbKey } from "../storage.ts";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

test("event factory creates deterministic scoped events", () => {
  const createEvent = createEventFactory({
    now: () => "2026-07-14T12:00:00.000Z",
    id: () => "evt-1",
  });
  const event = createEvent({
    groupBuyId: "gb-1",
    type: "order.bulk_paid",
    entityType: "order",
    entityIds: ["ORD-001", "ORD-002"],
    actorId: "organiser",
    summary: "Marked 2 orders as paid",
    correlationId: "bulk-1",
    causationId: "command-1",
    idempotencyKey: "gb-1:bulk-paid:command-1",
  });

  assert.equal(event.id, "evt-1");
  assert.equal(event.schemaVersion, 1);
  assert.equal(event.occurredAt, "2026-07-14T12:00:00.000Z");
  assert.deepEqual(event.entityIds, ["ORD-001", "ORD-002"]);
  assert.equal(event.correlationId, "bulk-1");
  assert.equal(event.causationId, "command-1");
  assert.equal(event.idempotencyKey, "gb-1:bulk-paid:command-1");
});

test("memory journal keeps live-session events out of browser storage", () => {
  const journal = createMemoryEventJournal();
  const createEvent = createEventFactory({ now: () => "2026-07-15T12:00:00.000Z", id: () => "evt-live" });
  journal.append(createEvent({ groupBuyId: "gb-live", type: "order.updated", entityType: "order", entityIds: ["order-1"], actorId: "organiser", summary: "Updated order" }));
  assert.deepEqual(journal.list("gb-live").map(event => event.id), ["evt-live"]);
  assert.deepEqual(journal.list("other"), []);
});

test("prototype journal is GB scoped and newest first", () => {
  const storage = new MemoryStorage();
  const journal = createPrototypeEventJournal({ storage, maxEvents: 2 });
  const createEvent = createEventFactory({
    now: () => "2026-07-14T12:00:00.000Z",
    id: (() => { let value = 0; return () => `evt-${++value}`; })(),
  });

  for (const summary of ["one", "two", "three"]) {
    journal.append(createEvent({
      groupBuyId: "gb-1",
      type: "order.updated",
      entityType: "order",
      entityIds: ["ORD-001"],
      actorId: "organiser",
      summary,
    }));
  }

  assert.deepEqual(journal.list("gb-1").map(event => event.summary), ["three", "two"]);
  assert.deepEqual(journal.list("gb-2"), []);
  assert.ok(storage.getItem(gbKey("gb-1", "operationEvents")));
});
