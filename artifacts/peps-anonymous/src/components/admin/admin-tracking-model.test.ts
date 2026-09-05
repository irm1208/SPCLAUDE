import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  bindTrackingPackagesDraft,
  canApplyReviewedShipment,
  parseBulkTrackingCsv,
  trackingPackageErrors,
} from "./admin-tracking-model.ts";

test("keeps the legacy code,tracking format", () => {
  assert.deepEqual(parseBulkTrackingCsv("ABC123, LEGACY-1"), [{ code: "ABC123", trackingNumber: "LEGACY-1" }]);
});

test("parses an explicitly labelled BMURFS pair as one package", () => {
  const [line] = parseBulkTrackingCsv("ABC123,BMURFS,SMEX6082643740,HD358713635GB");
  assert.equal(line.trackingPackages?.length, 1);
  assert.equal(line.trackingPackages?.[0].courier, "bmurfs");
  assert.equal(line.trackingPackages?.[0].internationalTrackingNumber, "SMEX6082643740");
  assert.equal(line.trackingPackages?.[0].localTrackingNumber, "HD358713635GB");
  assert.equal(line.trackingNumber, undefined);
});

test("never infers a pair from an unlabelled multi-column row", () => {
  assert.throws(
    () => parseBulkTrackingCsv("ABC123,other,SMEX6082643740,HD358713635GB"),
    /must use BMURFS/,
  );
});

test("requires explicit resolution when a non-BMURFS package retains local tracking", () => {
  assert.match(
    trackingPackageErrors([{
      id: "p1",
      courier: "DHL",
      internationalTrackingNumber: "INTL",
      localTrackingNumber: "LOCAL",
    }]).join(" "),
    /remove or unpair/,
  );
});

test("requires explicit acknowledgement for AI review warnings", () => {
  assert.equal(canApplyReviewedShipment(["Roles were not explicit"], false), false);
  assert.equal(canApplyReviewedShipment(["Roles were not explicit"], true), true);
  assert.equal(canApplyReviewedShipment([], false), true);
});

test("captures the persisted snapshot on first package edit and never replaces it", () => {
  const packages = [{
    id: "p1",
    courier: "bmurfs",
    internationalTrackingNumber: "SMEX6082643740",
    localTrackingNumber: null,
  }];
  const first = bindTrackingPackagesDraft({}, packages, "raw-snapshot-before-edit");
  const later = bindTrackingPackagesDraft(first, [{ ...packages[0], localTrackingNumber: "HD358713635GB" }], "new-poll-snapshot");
  assert.equal(first.expectedTrackingSnapshot, "raw-snapshot-before-edit");
  assert.equal(later.expectedTrackingSnapshot, "raw-snapshot-before-edit");
});

test("Admin binds the raw server snapshot to normal and AI package writes", () => {
  const source = readFileSync(new URL("../../pages/Admin.tsx", import.meta.url), "utf8");
  assert.match(source, /trackingSnapshot\?: string/);
  assert.match(source, /bindTrackingPackagesDraft\(prev\[order\.id\] \?\? \{\}, packages, order\.trackingSnapshot\)/);
  assert.match(source, /expectedTrackingSnapshot: s\.match\?\.currentTrackingSnapshot/);
});
