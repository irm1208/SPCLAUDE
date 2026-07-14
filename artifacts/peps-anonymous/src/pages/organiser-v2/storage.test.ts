import assert from "node:assert/strict";
import test from "node:test";
import { gbKey, readGb, writeGb } from "./storage.ts";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

test("readGb reads the existing raw JSON shape", () => {
  const storage = new MemoryStorage();
  storage.setItem(gbKey("gb-1", "orders"), JSON.stringify([{ id: "raw" }]));
  assert.deepEqual(readGb(storage, "gb-1", "orders", []), [{ id: "raw" }]);
});

test("readGb unwraps a versioned envelope", () => {
  const storage = new MemoryStorage();
  storage.setItem(gbKey("gb-1", "orders"), JSON.stringify({ schemaVersion: 1, data: [{ id: "wrapped" }] }));
  assert.deepEqual(readGb(storage, "gb-1", "orders", []), [{ id: "wrapped" }]);
});

test("readGb keeps the existing legacy fallback", () => {
  const storage = new MemoryStorage();
  storage.setItem("orders", JSON.stringify([{ id: "legacy" }]));
  assert.deepEqual(readGb(storage, "gb-1", "orders", [], "orders"), [{ id: "legacy" }]);
});

test("writeGb stores a versioned envelope when a schema version is supplied", () => {
  const storage = new MemoryStorage();
  writeGb(storage, "gb-1", "orders", [{ id: "saved" }], 1);
  assert.deepEqual(JSON.parse(storage.getItem(gbKey("gb-1", "orders"))!), {
    schemaVersion: 1,
    data: [{ id: "saved" }],
  });
});

test("readGb returns the fallback for malformed JSON", () => {
  const storage = new MemoryStorage();
  storage.setItem(gbKey("gb-1", "orders"), "not-json");
  assert.deepEqual(readGb(storage, "gb-1", "orders", [{ id: "fallback" }]), [{ id: "fallback" }]);
});
