import assert from "node:assert/strict";
import { test } from "vitest";
import { defaultMoqSettings, moqSnapshot, parseMoqInput, readMoqSettings } from "./group-buy-moq-model";

test("MOQ defaults to disabled and private", () => {
  assert.deepEqual(defaultMoqSettings(), {
    enabled: false, targetKits: null, showToMembers: false, updatedAt: null,
  });
});

test("MOQ accepts whole and half-kit targets, with an explicit member visibility choice", () => {
  for (const targetKits of [0.5, 100, 100.5]) {
    assert.equal(parseMoqInput({
      enabled: true, targetKits, showToMembers: false, expectedUpdatedAt: null,
    }).targetKits, targetKits);
  }
  for (const targetKits of [null, 0, -1, 0.25, Infinity, "100", 100_000_001]) {
    assert.throws(() => parseMoqInput({
      enabled: true, targetKits, showToMembers: false, expectedUpdatedAt: null,
    }));
  }
  assert.throws(() => parseMoqInput({ enabled: "false", targetKits: 100, showToMembers: false, expectedUpdatedAt: null }));
  assert.throws(() => parseMoqInput({ enabled: true, targetKits: 100, showToMembers: "false", expectedUpdatedAt: null }));
  assert.throws(() => parseMoqInput({ enabled: true, targetKits: 100, showToMembers: false }));
});

test("disabled MOQ can preserve a target without making it public", () => {
  const settings = { enabled: false, targetKits: 100, showToMembers: true, updatedAt: null };
  assert.equal(parseMoqInput({ ...settings, expectedUpdatedAt: null }).targetKits, 100);
  assert.equal(moqSnapshot(settings, 65, false), null);
  assert.equal(moqSnapshot(settings, 65, true)?.enabled, false);
});

test("private MOQ never discloses its target or count to members", () => {
  const settings = { enabled: true, targetKits: 100, showToMembers: false, updatedAt: null };
  assert.equal(moqSnapshot(settings, 65.5, false), null);
  const staff = moqSnapshot(settings, 65.5, true)!;
  assert.equal(staff.orderedKits, 65.5);
  assert.equal(staff.remainingKits, 34.5);
  assert.equal(staff.met, false);
});

test("public MOQ handles zero orders, half kits and quantities above the target", () => {
  const settings = { enabled: true, targetKits: 100, showToMembers: true, updatedAt: null };
  assert.equal(moqSnapshot(settings, 0, false)?.remainingKits, 100);
  assert.equal(moqSnapshot(settings, 99.5, false)?.remainingKits, 0.5);
  assert.equal(moqSnapshot(settings, 100, false)?.met, true);
  assert.equal(moqSnapshot(settings, 125.5, false)?.orderedKits, 125.5);
  assert.equal(moqSnapshot(settings, 125.5, false)?.remainingKits, 0);
});

test("stored configuration is validated, not silently replaced with defaults", () => {
  const settings = { enabled: true, targetKits: 100, showToMembers: true, updatedAt: "2026-10-20T09:00:00.000Z" };
  assert.deepEqual(readMoqSettings(JSON.stringify(settings)), settings);
  assert.throws(() => readMoqSettings('{"enabled":true}'));
  assert.throws(() => readMoqSettings("not json"));
});
