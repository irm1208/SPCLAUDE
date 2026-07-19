import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file: string) => readFileSync(new URL(file, import.meta.url), "utf8");
const workspaceCss = read("./approved-workspace.css");
const ordersCss = read("./approved-orders.css");

test("approved organiser exposes the selected Inter type ramp", () => {
  assert.match(workspaceCss, /--approved-type-label:\s*11px\s*;/);
  assert.match(workspaceCss, /--approved-type-meta:\s*12px\s*;/);
  assert.match(workspaceCss, /--approved-type-body:\s*14px\s*;/);
  assert.match(workspaceCss, /--approved-type-control:\s*13px\s*;/);
  assert.match(workspaceCss, /--approved-type-row-title:\s*14px\s*;/);
  assert.match(workspaceCss, /--approved-type-section:\s*16px\s*;/);
  assert.match(workspaceCss, /--approved-type-page-title:\s*29px\s*;/);
  assert.match(workspaceCss, /--approved-type-mobile-page-title:\s*24px\s*;/);
  assert.match(workspaceCss, /--approved-type-metric:\s*24px\s*;/);
  assert.match(workspaceCss, /--approved-type-mobile-metric:\s*21px\s*;/);
});

test("final approved layers contain no literal font size below 11px", () => {
  for (const [name, css] of [["workspace", workspaceCss], ["orders", ordersCss]] as const) {
    const sizes = [...css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px\s*;/g)]
      .map(match => Number(match[1]));
    assert.equal(
      sizes.filter(size => size < 11).length,
      0,
      `${name} contains a sub-11px font size`,
    );
  }
});

test("final approved layers use only loaded Inter weights", () => {
  const weights = [...`${workspaceCss}\n${ordersCss}`.matchAll(/font-weight:\s*(\d+)\s*;/g)]
    .map(match => Number(match[1]));
  for (const weight of weights) {
    assert.ok([400, 500, 600, 700].includes(weight), `unsupported weight ${weight}`);
  }
});

test("mobile type roles use the approved line heights", () => {
  assert.match(workspaceCss, /--approved-leading-page:\s*34px\s*;/);
  assert.match(workspaceCss, /--approved-leading-mobile-page:\s*29px\s*;/);
  assert.match(workspaceCss, /--approved-leading-body:\s*21px\s*;/);
  assert.match(workspaceCss, /@media\s*\(max-width:\s*767px\)[\s\S]*--approved-type-page-title:\s*var\(--approved-type-mobile-page-title\)/);
});
