import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./Reshipper.tsx", import.meta.url), "utf8");

test("Settings is placed immediately after Broadcast", () => {
  assert.match(source, /id: "broadcast", label: "Broadcast"[^}]*},\s*{ id: "settings", label: "Settings"/);
  assert.match(source, /settings: "Your saved supplier delivery/);
});

test("delivery settings appear only in tab content and do not require a group buy selection", () => {
  const content = source.slice(source.indexOf("{/* ── Content ── */}"));
  assert.equal((source.match(/<SupplierDeliveryDetails\b/g) ?? []).length, 1);
  assert.match(content, /activeTab === "settings" \? \([\s\S]*?<SupplierDeliveryDetails[\s\S]*?\) : currentAssignment \?/);
  assert.doesNotMatch(source.slice(0, source.indexOf("{/* ── Tab bar ── */}")), /<SupplierDeliveryDetails/);
});
