import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (file: string) =>
  readFileSync(new URL(file, import.meta.url), "utf8");

test("shared shell preserves the approved organiser context", () => {
  const shell = source("./_shared/ProductShell.tsx");

  for (const label of [
    "Peps Anonymous",
    "GB Organiser",
    "Winter Peptide Run 2025",
    "Workspace",
    "Fulfilment",
    "Communication",
    "Group Buy",
    "Products",
  ]) {
    assert.match(shell, new RegExp(label));
  }
});

test("shared tools expose the complete product and import vocabulary", () => {
  const tools = source("./_shared/ProductTools.tsx");

  for (const label of [
    "Add Product",
    "CSV Import",
    "AI Price List",
    "Vendor",
    "Size / mg",
    "Stock",
    "Max per customer",
    "Half kits",
    "Delete product",
    "New",
    "Duplicate",
    "Price changed",
    "Include",
    "Skip",
    "Existing price",
    "Undo",
  ]) {
    assert.match(tools, new RegExp(label));
  }
});

test("shared shell navigation and topbar controls are explicitly labelled", () => {
  const shell = source("./_shared/ProductShell.tsx");

  assert.match(shell, /<nav aria-label="Organiser navigation"/);
  assert.match(shell, /<nav aria-label="Breadcrumb"/);
  assert.match(shell, /aria-label="Search this group buy"/);
  assert.match(shell, /aria-label="Notifications"/);
  assert.match(shell, /aria-label="Open profile menu"/);
  assert.match(shell, /aria-labelledby="gbpr-page-title"/);
  assert.match(shell, /aria-label=\{item\.label\}/);
  assert.match(shell, /aria-current=\{item\.active \? "page" : undefined\}/);
});

test("controlled import rows keep their identity while editable names change", () => {
  const tools = source("./_shared/ProductTools.tsx");

  assert.doesNotMatch(tools, /key=\{`\$\{index\}-\$\{row\.name\}`\}/);
  assert.match(tools, /<tr key=\{index\} data-included=\{row\.included\}>/);
});

test("import checkboxes keep a stable accessible name for their checked state", () => {
  const tools = source("./_shared/ProductTools.tsx");

  assert.match(tools, /aria-label=\{`Include \$\{rowName\}`\}/);
  assert.match(tools, /row\.included \? "Include" : "Skip"/);
});

test("confirmation dialog provides labelled dismissal and keyboard escape routes", () => {
  const tools = source("./_shared/ProductTools.tsx");

  assert.match(tools, /role="dialog"/);
  assert.match(tools, /aria-modal="true"/);
  assert.match(tools, /aria-labelledby=/);
  assert.match(tools, /aria-describedby=/);
  assert.match(tools, /aria-label="Close confirmation"/);
  assert.match(tools, /event\.key === "Escape"/);
  assert.match(tools, /removeEventListener\("keydown"/);
});

test("confirmation dialog keeps its listener stable across callback changes", () => {
  const tools = source("./_shared/ProductTools.tsx");

  assert.match(tools, /const onCancelRef = useRef\(onCancel\)/);
  assert.match(tools, /onCancelRef\.current = onCancel/);
  assert.match(tools, /onCancelRef\.current\(\)/);
  assert.doesNotMatch(tools, /\[open, onCancel\]/);
});

test("shared styles retain the complete approved Peps token set", () => {
  const styles = source("./_group.css");

  for (const token of [
    "#F4F6F9",
    "#FFFFFF",
    "#D0DAE4",
    "#E9EEF4",
    "#0F1F38",
    "#6B7280",
    "#8A9AAA",
    "#1B3A7A",
    "#1B3164",
    "#2D6BCC",
    "#E9A020",
  ]) {
    assert.match(styles, new RegExp(token));
  }
});

test("shared layout contains scrolling inside the workspace", () => {
  const styles = source("./_group.css");

  assert.match(
    styles,
    /\.gbpr-main\s*\{[^}]*height:\s*100dvh;[^}]*overflow-y:\s*auto;/s,
  );
});

test("feedback actions retain 44 pixel targets", () => {
  const styles = source("./_group.css");

  assert.match(
    styles,
    /\.gbpr-feedback > button:not\(\.gbpr-feedback-dismiss\)\s*\{[^}]*min-height:\s*44px;/s,
  );
  assert.match(
    styles,
    /\.gbpr-feedback-dismiss\s*\{[^}]*width:\s*44px;[^}]*height:\s*44px;[^}]*min-height:\s*44px;/s,
  );
  assert.doesNotMatch(
    styles,
    /\.gbpr-feedback(?:-dismiss|\s*>\s*button:not\([^)]*\))\s*\{[^}]*\b(?:width|height|min-height):\s*38px;/s,
  );
});

test("shared styles provide visible focus", () => {
  const styles = source("./_group.css");

  assert.match(styles, /:focus-visible/);
  assert.match(styles, /outline:\s*3px solid #2D6BCC/);
});

test("reduced motion suppresses effects on elements and pseudo-elements", () => {
  const styles = source("./_group.css");
  const mediaStart = styles.indexOf("@media (prefers-reduced-motion: reduce)");

  assert.notEqual(mediaStart, -1);
  const reducedMotion = styles.slice(mediaStart);

  for (const selector of [
    ".gbpr-shell *::before",
    ".gbpr-shell *::after",
    ".gbpr-modal-layer *::before",
    ".gbpr-modal-layer *::after",
    ".gbpr-feedback *::before",
    ".gbpr-feedback *::after",
  ]) {
    assert.ok(
      reducedMotion.includes(selector),
      `Reduced-motion styles must cover ${selector}`,
    );
  }

  for (const declaration of [
    "scroll-behavior: auto !important;",
    "animation-duration: 0.01ms !important;",
    "animation-iteration-count: 1 !important;",
    "transition-duration: 0.01ms !important;",
  ]) {
    assert.ok(
      reducedMotion.includes(declaration),
      `Reduced-motion styles must include ${declaration}`,
    );
  }
});
