import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (file: string) => readFileSync(new URL(file, import.meta.url), "utf8");

test("concept gallery includes three distinct organiser directions and operational views", () => {
  const component = source("./GbOrganiserConcepts.tsx");
  const css = source("./_group.css");

  for (const concept of ["atlas", "signal", "ledger"]) {
    assert.match(component, new RegExp(`id: \\"${concept}\\"`));
    assert.match(css, new RegExp(`data-concept=\\"${concept}\\"`));
  }

  for (const view of ["overview", "orders", "dispatch"]) {
    assert.match(component, new RegExp(`id: \\"${view}\\"`));
  }

  assert.match(component, /ResponsiveContainer/);
  assert.match(component, /AnimatePresence/);
  assert.match(component, /Winter Peptide Run 2025/);
});

test("concept gallery exposes labelled interactive controls and reduced motion", () => {
  const component = source("./GbOrganiserConcepts.tsx");
  const css = source("./_group.css");
  assert.match(component, /aria-label="Choose concept"/);
  assert.match(component, /aria-label="Organiser sections"/);
  assert.match(component, /role="dialog"/);
  assert.match(css, /prefers-reduced-motion/);
});
