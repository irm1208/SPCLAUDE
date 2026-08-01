import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (file: string) =>
  readFileSync(new URL(file, import.meta.url), "utf8");

test("icon gallery exposes five distinct Salt&Peps small-size directions", () => {
  const component = source("./SaltPepsIconConcepts.tsx");

  for (const concept of [
    "interlock",
    "peptide",
    "aperture",
    "signal",
    "orbit",
  ]) {
    assert.match(component, new RegExp(`id: [\\\"]${concept}[\\\"]`));
  }

  assert.match(component, /spic-concept--\$\{concept\}/);

  assert.match(component, /Salt&Peps/);
  assert.match(component, /viewBox="0 0 64 64"/);
  assert.match(component, /aria-label="Choose icon concept"/);
  assert.match(component, /aria-label="Proof mode"/);
});

test("icon gallery exposes size proofs and accessibility safeguards", () => {
  const component = source("./SaltPepsIconConcepts.tsx");
  const css = source("./_group.css");

  for (const mode of ["light", "reverse", "mono"]) {
    assert.match(component, new RegExp(`id: [\\\"]${mode}[\\\"]`));
    assert.match(css, new RegExp(`spic-proof--${mode}`));
  }

  for (const size of [16, 24, 32, 48, 64]) {
    assert.ok(component.includes(`size={${size}}`));
  }

  assert.match(component, /role="tablist"/);
  assert.match(component, /aria-pressed=/);
  assert.match(component, /role="status"/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /@media \(max-width: 760px\)/);
});
