import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import { ALL_CARRIERS_17TRACK, CARRIER_GROUPS } from "./carriers17track";
import { CARRIERS_17TRACK } from "../lib/carriers";

test("SXW Wuli is selectable in both carrier lists with its 17TRACK code", () => {
  assert.ok(ALL_CARRIERS_17TRACK.includes("SXW Wuli"));
  assert.ok(CARRIER_GROUPS.find(group => group.label === "China & Asia")?.carriers.includes("sxw wuli"));
  assert.deepEqual(CARRIERS_17TRACK.find(carrier => carrier.label === "SXW Wuli"), {
    label: "SXW Wuli", code: 192203, region: "China",
  });
});

test("tracking resolves SXW Wuli case-insensitively to 192203, not auto-detect", () => {
  // Exercise the real resolver without loading the router's database and timers.
  const source = readFileSync(new URL("../../../api-server/src/routes/gb-parcels.ts", import.meta.url), "utf8");
  const resolverSource = source.slice(source.indexOf("export function resolveCarrierCode("), source.indexOf("\nasync function refreshParcel("));
  const compiled = ts.transpileModule(resolverSource.replace("export function", "function"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const resolve = runInNewContext(`${compiled}\nresolveCarrierCode;`);
  for (const name of ["SXW Wuli", "sxw wuli", " SXW WULI "]) {
    assert.equal(resolve(name), 192203);
  }
  assert.equal(resolve("Auto Detect"), 0);
});
