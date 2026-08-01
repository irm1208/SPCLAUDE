import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (file: string) =>
  readFileSync(new URL(file, import.meta.url), "utf8");

test("wordmark gallery exposes five distinct Salt&Peps directions", () => {
  const component = source("./SaltPepsWordmarkConcepts.tsx");
  const css = source("./_group.css");

  for (const concept of [
    "precision",
    "clinical",
    "editorial",
    "lab",
    "signal",
  ]) {
    assert.match(component, new RegExp(`id: [\\\"]${concept}[\\\"]`));
    assert.match(css, new RegExp(`swc-wordmark--${concept}`));
  }

  assert.match(component, /Salt&Peps/);
  assert.match(component, /aria-label="Choose wordmark concept"/);
  assert.match(component, /aria-label="Proof mode"/);
});

test("wordmark gallery keeps proof contexts and accessibility safeguards", () => {
  const component = source("./SaltPepsWordmarkConcepts.tsx");
  const css = source("./_group.css");

  for (const mode of ["light", "reverse", "mono"]) {
    assert.match(component, new RegExp(`id: [\\\"]${mode}[\\\"]`));
    assert.match(css, new RegExp(`swc-proof--${mode}`));
  }

  assert.match(component, /role="tablist"/);
  assert.match(component, /aria-pressed=/);
  assert.match(component, /role="status"/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /@media \(max-width: 760px\)/);
});
