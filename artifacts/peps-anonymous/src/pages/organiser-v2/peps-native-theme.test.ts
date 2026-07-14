import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PEPS_NATIVE, V2_VARS } from "./theme.ts";

const stylesheet = readFileSync(new URL("./peps-native.css", import.meta.url), "utf8");
const shippingTab = readFileSync(new URL("./ShippingTab.tsx", import.meta.url), "utf8");
const todoTab = readFileSync(new URL("./TodoTab.tsx", import.meta.url), "utf8");
const overviewTab = readFileSync(new URL("./OverviewTabV3.tsx", import.meta.url), "utf8");

test("Peps Native exposes the approved brand and surface palette", () => {
  assert.equal(PEPS_NATIVE.deepNavy, "#1B3164");
  assert.equal(PEPS_NATIVE.navy, "#1B3A7A");
  assert.equal(PEPS_NATIVE.blue, "#2D6BCC");
  assert.equal(PEPS_NATIVE.amber, "#E9A020");
  assert.equal(PEPS_NATIVE.canvas, "#F4F6F9");
  assert.equal(PEPS_NATIVE.text, "#0F1F38");
  assert.equal(PEPS_NATIVE.border, "#D0DAE4");
});

test("V2 variables use the approved compact shell", () => {
  assert.equal(V2_VARS["--ov2-canvas" as string], "#F4F6F9");
  assert.equal(V2_VARS["--ov2-primary" as string], "#1B3A7A");
  assert.equal(V2_VARS["--ov2-sidebar-width" as string], "236px");
  assert.equal(V2_VARS["--ov2-topbar-height" as string], "64px");
});

test("Peps Native defines every operational page treatment", () => {
  for (const treatment of ["logistics", "insight", "composer", "support", "configuration"]) {
    assert.match(stylesheet, new RegExp(`\\[data-treatment=["']${treatment}["']\\]`));
  }

  assert.match(stylesheet, /--dispatch-green:\s*#2d6bcc/i);
  assert.match(stylesheet, /--dispatch-green-deep:\s*#1b3a7a/i);
  assert.match(stylesheet, /--dispatch-amber:\s*#e9a020/i);
});

test("Peps Native defines setup, responsive, and reduced-motion states", () => {
  for (const selector of [
    ".ov2-setup-nav",
    ".ov2-setup-link",
    ".ov2-step-number",
    ".ov2-form-panel",
    ".ov2-launch-dialog",
    ".ov2-visibility-options",
  ]) {
    assert.match(stylesheet, new RegExp(selector.replace(".", "\\.")));
  }

  assert.match(stylesheet, /@media\s*\(max-width:\s*1023px\)/);
  assert.match(stylesheet, /@media\s*\(max-width:\s*767px\)/);
  assert.match(stylesheet, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.doesNotMatch(stylesheet, /\.min-w-\[/);
});

test("Shipping split keeps nested controls semantically valid", () => {
  assert.doesNotMatch(
    shippingTab,
    /<button\s+onClick=\{\(\) => toggleSection\("shipping-split"\)\}/,
  );
  assert.match(shippingTab, /aria-expanded=\{expandedSection === "shipping-split"\}/);
  assert.match(shippingTab, /role="switch"/);
});

test("Todo list uses the Peps Native typography hierarchy", () => {
  for (const className of [
    "ov2-todo-workspace",
    "ov2-todo-header",
    "ov2-todo-task-title",
    "ov2-todo-task-meta",
    "ov2-todo-group-label",
    "ov2-todo-check",
  ]) {
    assert.match(todoTab, new RegExp(className));
    assert.match(stylesheet, new RegExp(`\\.${className}`));
  }

  assert.match(stylesheet, /--ov2-todo-section-size:\s*14px/);
  assert.match(stylesheet, /--ov2-todo-task-size:\s*13px/);
  assert.match(stylesheet, /--ov2-todo-meta-size:\s*10px/);
  assert.match(stylesheet, /\.ov2-todo-check\s*\{[^}]*min-height:\s*18px\s*!important/s);
  assert.match(
    stylesheet,
    /\.ov2-workspace-screen\[data-page="todos"\]\s+\.ov2-todo-check\s*\{[^}]*border-radius:\s*50%\s*!important/s,
  );
  assert.match(
    stylesheet,
    /\.ov2-workspace-screen\[data-page="todos"\]\s*>\s*\.ov2-page-header\s*\+\s*\.ov2-todo-workspace\s*\{[^}]*border-radius:\s*15px\s*!important/s,
  );
  assert.doesNotMatch(todoTab, /#2564CF|#323130|#605E5C|#FAF9F8|#EDEBE9/);
});

test("Atlas overview exposes a visibly distinct operations command centre", () => {
  for (const className of [
    "ov2-command-hero",
    "ov2-command-metrics",
    "ov2-attention-panel",
    "ov2-pulse-panel",
    "ov2-pipeline-heading",
  ]) {
    assert.match(overviewTab, new RegExp(className));
    assert.match(stylesheet, new RegExp(`\\.${className}`));
  }

  assert.match(stylesheet, /\.ov2-command-hero\s*\{[^}]*linear-gradient\(135deg,\s*#1b3164/s);
  assert.match(stylesheet, /\.ov2-command-metric\s*\{[^}]*border-radius:\s*16px/s);
  assert.match(stylesheet, /\.ov2-attention-row\[data-severity="urgent"\]/);
});
