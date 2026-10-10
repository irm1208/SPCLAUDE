import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { isLabTestFailed, failsLabTestPurity, labTestPurityThreshold } from "./lab-test-quality";

test("non-HGH purity fails strictly below 98%, including the former acceptable band", () => {
  for (const purityPct of [94, 95, 96, 97.99]) {
    assert.equal(failsLabTestPurity({ peptideName: "SS-31", purityPct }), true);
  }
  for (const purityPct of [98, 98.5, 99, 100]) {
    assert.equal(failsLabTestPurity({ peptideName: "SS-31", purityPct }), false);
  }
  assert.equal(labTestPurityThreshold("Unknown compound"), 98);
});

test("HGH and its existing aliases retain the 96% boundary", () => {
  for (const peptideName of ["HGH", "hgh", "Human Growth Hormone", "Growth Hormone", "Somatropin"]) {
    assert.equal(labTestPurityThreshold(peptideName), 96);
    assert.equal(failsLabTestPurity({ peptideName, purityPct: 95.99 }), true);
    assert.equal(failsLabTestPurity({ peptideName, purityPct: 96 }), false);
    assert.equal(failsLabTestPurity({ peptideName, purityPct: 97.99 }), false);
  }
  assert.equal(labTestPurityThreshold("HGH Frag 176-191"), 98);
});

test("unknown purity is not counted as a failure or a purity pass", () => {
  assert.equal(failsLabTestPurity({ peptideName: "SS-31", purityPct: null }), false);
  assert.equal(isLabTestFailed({ peptideName: "SS-31", purityPct: null, sterilityPass: null, endotoxinEuMg: null }), false);
});

test("sterility and endotoxin failure rules are unchanged", () => {
  const sample = { peptideName: "HGH", purityPct: 96, sterilityPass: true, endotoxinEuMg: 5 };
  assert.equal(isLabTestFailed(sample), false);
  assert.equal(isLabTestFailed({ ...sample, sterilityPass: false }), true);
  assert.equal(isLabTestFailed({ ...sample, endotoxinEuMg: 5.01 }), true);
});

test("all lab-test surfaces share the threshold instead of hardcoded fail cutoffs", async () => {
  for (const path of ["../pages/LabTests.tsx", "../pages/PrototypeLabTests.tsx",
    "../components/LabTestsTab.tsx", "../components/LabTestsPopup.tsx"]) {
    const source = await readFile(new URL(path, import.meta.url), "utf8");
    assert.ok(source.includes('from "@/lib/lab-test-quality"'), `${path} must share the quality policy`);
    assert.ok(!/purityPct\s*<\s*(?:99|95)\b/.test(source), `${path} has a stale failure cutoff`);
    assert.ok(!/purityPct\s*>=\s*(?:99|95)\b/.test(source), `${path} has a stale pass cutoff`);
    assert.ok(!/Good ≥99%|Low <99%/.test(source), `${path} has stale chart labels`);
  }
});
