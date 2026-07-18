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

test("shared shell owns one defaultable page heading for its label contract", () => {
  const shell = source("./_shared/ProductShell.tsx");
  const styles = source("./_group.css");

  assert.match(shell, /pageTitle\?:\s*string/);
  assert.match(shell, /pageTitle = "Products"/);
  assert.match(
    shell,
    /<h1 className="gbpr-visually-hidden" id="gbpr-page-title">\s*\{pageTitle\}\s*<\/h1>/s,
  );
  assert.equal([...shell.matchAll(/id="gbpr-page-title"/g)].length, 1);
  assert.match(
    styles,
    /\.gbpr-visually-hidden\s*\{[^}]*position:\s*absolute\s*!important;[^}]*clip-path:\s*inset\(50%\)\s*!important;/s,
  );
});

test("product form focuses the first invalid control in rendered DOM order", () => {
  const tools = source("./_shared/ProductTools.tsx");
  const submitStart = tools.indexOf("function handleSubmit");
  const submitEnd = tools.indexOf("\n  return (", submitStart);
  const handleSubmit = tools.slice(submitStart, submitEnd);

  assert.notEqual(submitStart, -1);
  assert.notEqual(submitEnd, -1);
  assert.match(handleSubmit, /Object\.values\(nextErrors\)\.some\(Boolean\)/);
  assert.match(
    handleSubmit,
    /querySelector<HTMLElement>\('\[aria-invalid="true"\]'\)/,
  );
  assert.doesNotMatch(handleSubmit, /Object\.keys\(nextErrors\)\[0\]/);
});

test("controlled import rows and callbacks use immutable row IDs", () => {
  const data = source("./data.ts");
  const tools = source("./_shared/ProductTools.tsx");

  assert.match(data, /ImportReviewRow[\s\S]*?id:\s*string/);
  assert.match(tools, /onToggle:\s*\(rowId:\s*ImportReviewRow\["id"\]\)/);
  assert.match(tools, /onEdit:\s*\(\s*rowId:\s*ImportReviewRow\["id"\]/);
  assert.match(tools, /key=\{row\.id\}/);
  assert.match(tools, /onToggle\(row\.id\)/);
  assert.match(tools, /onEdit\(row\.id,/);
  assert.doesNotMatch(tools, /key=\{index\}/);
  assert.doesNotMatch(tools, /on(?:Toggle|Edit)\(index/);
});

test("import checkboxes keep a stable accessible name for their checked state", () => {
  const tools = source("./_shared/ProductTools.tsx");

  assert.match(tools, /aria-label=\{`Include \$\{rowName\}`\}/);
  assert.match(tools, /row\.included \? "Include" : "Skip"/);
});

test("import price drafts preserve intermediate values by immutable row ID", () => {
  const tools = source("./_shared/ProductTools.tsx");

  assert.match(
    tools,
    /type ImportPriceDrafts = Record<ImportReviewRow\["id"\], string>/,
  );
  assert.match(tools, /useState<ImportPriceDrafts>/);
  assert.match(tools, /priceDrafts\[row\.id\]/);
  assert.match(tools, /event\.currentTarget\.value/);
  assert.doesNotMatch(tools, /valueAsNumber/);
});

test("included import rows guard confirmation and focus the first invalid field", () => {
  const tools = source("./_shared/ProductTools.tsx");

  assert.match(tools, /if \(!row\.included\) continue/);
  assert.match(tools, /!row\.name\.trim\(\)/);
  assert.match(tools, /!row\.vendor\.trim\(\)/);
  assert.match(
    tools,
    /!priceDraft\.trim\(\) \|\| !Number\.isFinite\(price\) \|\| price < 0/,
  );
  assert.match(
    tools,
    /const nextErrors = validateImportRows\(rows, priceDrafts\)/,
  );
  assert.match(
    tools,
    /querySelector<HTMLElement>\('\[aria-invalid="true"\]'\)/,
  );
  assert.match(tools, /aria-invalid=\{rowErrors\.(?:name|price|vendor)/);
  assert.match(tools, /className="gbpr-table-error"/);
  assert.match(tools, /if \(Object\.keys\(nextErrors\)\.length > 0\)[\s\S]*?return;[\s\S]*?onConfirm\(\)/);
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

test("confirmation dialog wraps Tab and Shift+Tab inside its focusable controls", () => {
  const tools = source("./_shared/ProductTools.tsx");

  assert.match(tools, /const FOCUSABLE_SELECTOR/);
  assert.match(tools, /event\.key === "Tab"/);
  assert.match(
    tools,
    /querySelectorAll<HTMLElement>\(FOCUSABLE_SELECTOR\)/,
  );
  assert.match(tools, /event\.shiftKey/);
  assert.match(tools, /firstFocusable\.focus\(\)/);
  assert.match(tools, /lastFocusable\.focus\(\)/);
  assert.match(tools, /ref=\{dialogRef\}/);
  assert.match(tools, /closeRef\.current\?\.focus\(\)/);
});

test("confirmation dialog restores document scrolling during lifecycle cleanup", () => {
  const tools = source("./_shared/ProductTools.tsx");

  assert.match(
    tools,
    /const previousBodyOverflow = document\.body\.style\.overflow/,
  );
  assert.match(tools, /document\.body\.style\.overflow = "hidden"/);
  assert.match(
    tools,
    /document\.body\.style\.overflow = previousBodyOverflow/,
  );
  assert.match(
    tools,
    /document\.documentElement\.style\.overflow = previousRootOverflow/,
  );
});

test("confirmation overlay contains overscroll", () => {
  const styles = source("./_group.css");

  assert.match(
    styles,
    /\.gbpr-modal-layer\s*\{[^}]*overscroll-behavior:\s*contain;/s,
  );
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
