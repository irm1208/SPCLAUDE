import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { SAMPLE_PRODUCTS } from "./data.ts";
import { classifyImportRows } from "./_shared/model.ts";

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
    /<h1[^>]*className="gbpr-visually-hidden"[^>]*id="gbpr-page-title"[^>]*tabIndex=\{-1\}[^>]*data-gbpr-focus-fallback[^>]*>\s*\{pageTitle\}\s*<\/h1>/s,
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

test("Command Grid exposes the complete standalone product workflow", () => {
  const grid = source("./CommandGrid.tsx");

  for (const label of [
    "Command Grid",
    "Select all products",
    "Search name, vendor, category",
    "Set price",
    "Set stock",
    "Columns",
    "Import CSV",
    "AI Price List",
  ]) {
    assert.match(grid, new RegExp(label));
  }

  assert.match(grid, /data-testid="bulk-toolbar"/);
  assert.match(grid, /aria-label=\{`Select product \$\{product\.name\}`\}/);
  assert.match(grid, /onBlur=/);
  assert.match(grid, /<ProductShell/);
  assert.match(grid, /filteredProducts\.length === 0/);
  assert.match(grid, /No products match/);
  assert.match(grid, /Clear filters/);
});

test("empty-catalogue imports retain duplicate and price-changed review statuses", () => {
  const grid = source("./CommandGrid.tsx");
  const existing = SAMPLE_PRODUCTS;
  const rows = classifyImportRows(existing, [
    {
      name: existing[0].name,
      vendor: existing[0].vendor,
      mgSize: existing[0].mgSize,
      price: existing[0].price,
    },
    {
      name: existing[1].name,
      vendor: existing[1].vendor,
      mgSize: existing[1].mgSize,
      price: existing[1].price + 5,
    },
    {
      name: "Empty catalogue new row",
      vendor: "QSC",
      mgSize: "10 mg",
      price: 64,
    },
  ]);

  assert.deepEqual(
    rows.map((row) => row.status),
    ["duplicate", "price-changed", "new"],
  );
  assert.match(
    grid,
    /const existing = products\.length \? products : SAMPLE_PRODUCTS/,
  );
  assert.match(grid, /classifyImportRows\(existing, incoming\)/);
});

test("imports require explicit confirmation before applying accepted rows", () => {
  const grid = source("./CommandGrid.tsx");

  assert.match(grid, /function requestImportConfirmation/);
  assert.match(
    grid,
    /setConfirmationState\(\{\s*kind: "import",\s*mode: importMode,\s*count: includedCount/s,
  );
  assert.match(grid, /onConfirm=\{requestImportConfirmation\}/);
  assert.match(grid, /confirmationState\.kind === "import"/);
  assert.match(
    grid,
    /confirmationState\.kind === "import"[\s\S]*?confirmImport\(\)/,
  );
  assert.match(grid, /Import \$\{confirmationState\.count\} products from/);
});

test("import previews generate a collision-free new candidate", () => {
  const grid = source("./CommandGrid.tsx");

  assert.match(grid, /function createNewImportCandidate/);
  assert.match(grid, /createNewImportCandidate\(mode, existing\)/);
  assert.match(
    grid,
    /existing\.some\(\(product\) => productIdentity\(product\) === productIdentity\(candidate\)\)/,
  );
  assert.match(grid, /status.*"new"|classifyImportRows\(existing, incoming\)/s);
});

test("import row edits reclassify status without replacing row IDs", () => {
  const grid = source("./CommandGrid.tsx");

  assert.match(grid, /function reclassifyImportRows/);
  assert.match(
    grid,
    /reclassifyImportRows\(products\.length \? products : SAMPLE_PRODUCTS, nextRows\)/,
  );
  assert.match(grid, /id: current\.id/);
  assert.match(
    grid,
    /included: next\.status === "duplicate" \? false : current\.included/,
  );
  assert.match(grid, /row\.id === rowId \? \{ \.\.\.row, \.\.\.patch \} : row/);
});

test("confirmation cleanup falls back when the trigger unmounts", () => {
  const tools = source("./_shared/ProductTools.tsx");
  const shell = source("./_shared/ProductShell.tsx");

  assert.match(tools, /previousFocus\?\.isConnected/);
  assert.match(
    tools,
    /querySelector<HTMLElement>\("#gbpr-page-title"\)/,
  );
  assert.match(tools, /focusFallback\?\.focus\(\)/);
  assert.match(
    shell,
    /<h1[^>]*id="gbpr-page-title"[^>]*tabIndex=\{-1\}[^>]*data-gbpr-focus-fallback/s,
  );
  assert.doesNotMatch(shell, /<span[^>]*data-gbpr-focus-fallback/);
});

test("Command Grid supports keyboard movement across editable cells", () => {
  const grid = source("./CommandGrid.tsx");

  assert.match(grid, /data-product-cell/);
  assert.match(grid, /event\.key === "ArrowDown"/);
  assert.match(grid, /event\.key === "ArrowUp"/);
  assert.match(grid, /event\.key === "ArrowLeft"/);
  assert.match(grid, /event\.key === "ArrowRight"/);
  assert.match(grid, /event\.key === "Enter"/);
  assert.match(grid, /event\.key === "Escape"/);
  assert.match(
    grid,
    /root\.querySelectorAll<HTMLElement>\("\[data-product-cell\]\[data-product-row\]"\)/,
  );
  assert.match(grid, /targetCell\?\.focus\(\)/);
  assert.match(grid, /if \(selectionStart !== selectionEnd\) return/);
  assert.match(grid, /onKeyDown=\{\(event\) => \{[\s\S]*?moveProductCell/);
});

test("catalogue mutations reconcile drafts, selection, live counts, and sort state", () => {
  const grid = source("./CommandGrid.tsx");

  assert.match(grid, /function commitProducts/);
  assert.match(grid, /type DraftClearSpec/);
  assert.match(grid, /function reconcileInlineDrafts/);
  assert.match(grid, /function clearDrafts/);
  assert.match(grid, /function createDraftClearSpec/);
  assert.match(
    grid,
    /saveInlineEdit[\s\S]*?createDraftClearSpec\(\[product\.id\], \[field\]\)/,
  );
  assert.doesNotMatch(
    grid,
    /function commitProducts[\s\S]*?setInlineValues\(\{\}\)/,
  );
  assert.match(
    grid,
    /const remainingSelection = new Set\(\[\.\.\.selectedIds\]\.filter\(\(id\) => id !== target\.id\)\)/,
  );
  assert.match(grid, /commitProducts\([\s\S]*?remainingSelection/);
  assert.match(grid, /Manage \{products\.length\} products/);
  assert.match(grid, /function toggleColumn/);
  assert.match(grid, /if \(!visible && sortKey === column\)/);
  assert.match(grid, /toggleColumn\(column\.key, event\.currentTarget\.checked\)/);
  assert.match(grid, /type ViewSnapshot/);
  assert.match(grid, /feedback\.view/);
  assert.match(grid, /const activeFilterSummary/);
  assert.match(grid, /activeFilterSummary[\s\S]*?No products match these filters/);
});

test("undo snapshots clear committed drafts while retaining unrelated drafts", () => {
  const grid = source("./CommandGrid.tsx");
  const commitStart = grid.indexOf("function commitProducts");
  const commitEnd = grid.indexOf("\n  function clearFilters", commitStart);
  const commitProducts = grid.slice(commitStart, commitEnd);
  const reconciliationMatch = commitProducts.match(
    /const reconciledDrafts = reconcileInlineDrafts\([\s\S]*?inlineValues,[\s\S]*?inlineErrors,[\s\S]*?draftClear,[\s\S]*?\)/,
  );
  const reconciliation = reconciliationMatch?.index ?? -1;
  const snapshot = commitProducts.indexOf("setFeedback({");

  assert.notEqual(commitStart, -1);
  assert.notEqual(commitEnd, -1);
  assert.notEqual(reconciliation, -1);
  assert.ok(
    reconciliation < snapshot,
    "commitProducts must reconcile affected drafts before creating its undo snapshot",
  );
  assert.match(
    commitProducts,
    /inlineValues: cloneInlineMap\(reconciledDrafts\.values\)/,
  );
  assert.match(
    commitProducts,
    /inlineErrors: cloneInlineMap\(reconciledDrafts\.errors\)/,
  );
  assert.match(
    commitProducts,
    /clearDrafts\(draftClear\)/,
  );
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

test("Category Workbench exposes category navigation and bulk workflows", () => {
  const workbench = source("./CategoryWorkbench.tsx");

  for (const label of [
    "Category Workbench",
    "Catalogue map",
    "Saved views",
    "Low stock",
    "Missing vendor",
    "Edit group",
    "Expand all",
  ]) {
    assert.match(workbench, new RegExp(label));
  }

  assert.match(workbench, /aria-label="Catalogue map"/);
  assert.match(workbench, /data-testid="category-bulk-action"/);
  assert.match(workbench, /aria-expanded=/);
});
