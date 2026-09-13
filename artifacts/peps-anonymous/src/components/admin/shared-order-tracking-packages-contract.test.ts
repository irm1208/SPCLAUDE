import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../../pages/Admin.tsx", import.meta.url), "utf8");

test("shared order headers use the multi-package editor", () => {
  assert.match(source, /sharedTracking[\s\S]*Record<string, TrackingPackage\[\]>/);
  assert.match(source, /<TrackingPackageEditor[\s\S]*value=\{trackingDraft\}/);
  assert.match(source, /onChange=\{packages => setSharedTracking/);
});

test("shared package saves preserve each member concurrency snapshot", () => {
  assert.match(source, /trackingPackages: packages/);
  assert.match(source, /expectedTrackingSnapshot: m\.trackingSnapshot/);
});