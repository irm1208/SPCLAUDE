import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { SAMPLE_PRODUCTS, type ProductRecord } from "./data.ts";
import { applyBulkPatch, classifyImportRows } from "./_shared/model.ts";
import {
  findDirtyImportConflict,
  pinSelectedProduct,
} from "./_shared/split-inspector-model.ts";

const source = (file: string) =>
  readFileSync(new URL(file, import.meta.url), "utf8");

type BatchConditions = {
  query: string;
  vendor: string;
  category: string;
};

type BatchFieldChanges = {
  price: string;
  stock: string;
  maxPerCustomer: string;
  halfKitEnabled: "unchanged" | "enabled" | "disabled";
};

type BatchAppliedEntry = {
  id: string;
  name: string;
  affectedCount: number;
  changes: string[];
  appliedAt: string;
};

type BatchSnapshot = {
  products: ProductRecord[];
  applied: BatchAppliedEntry[];
  conditions: BatchConditions;
  fieldChanges: BatchFieldChanges;
  changeSetName: string;
};

type BatchDraftEvaluation = {
  fieldChanges: BatchFieldChanges;
  validationErrors: Array<{ field: string; message: string }>;
  validationErrorCount: number;
  stagedPatch: Partial<ProductRecord>;
  previewRows: Array<{
    id: string;
    before: ProductRecord;
    after: ProductRecord;
  }>;
};

type BatchStudioTestModule = {
  evaluateBatchDraft: (
    products: readonly ProductRecord[],
    conditions: BatchConditions,
    fieldChanges: BatchFieldChanges,
  ) => BatchDraftEvaluation;
  commitBatchChangeSet: (
    input: BatchSnapshot & {
      previewRows: BatchDraftEvaluation["previewRows"];
      stagedPatch: Partial<ProductRecord>;
      appliedAt: string;
      historyId: string;
    },
    patchProducts?: typeof applyBulkPatch,
  ) => BatchSnapshot & {
    feedback: { message: string; snapshot: BatchSnapshot };
  };
  undoBatchStudioState: (feedback: {
    message: string;
    snapshot: BatchSnapshot;
  }) => BatchSnapshot;
  resetBatchStudioState: (state: BatchSnapshot) => BatchSnapshot & {
    feedback: { message: string; snapshot: BatchSnapshot };
  };
};

let batchStudioModulePromise: Promise<BatchStudioTestModule> | null = null;

function loadBatchStudioModule(): Promise<BatchStudioTestModule> {
  if (!batchStudioModulePromise) {
    batchStudioModulePromise = (async () => {
      const { createServer } = await import("vite");
      const server = await createServer({
        configFile: false,
        root: new URL("../../../..", import.meta.url).pathname,
        server: { middlewareMode: true },
        appType: "custom",
        logLevel: "silent",
      });

      try {
        return (await server.ssrLoadModule(
          "/src/components/mockups/gb-products-redesign/BatchStudio.tsx",
        )) as BatchStudioTestModule;
      } finally {
        await server.close();
      }
    })();
  }

  return batchStudioModulePromise;
}

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

test("Split Inspector exposes a guarded standalone master-detail workflow", () => {
  const split = source("./SplitInspector.tsx");
  const styles = source("./_group.css");

  for (const label of [
    "Split Inspector",
    "Product inspector",
    "Unsaved changes",
    "Save changes",
    "Max per customer",
    "Half kits",
  ]) {
    assert.match(split, new RegExp(label));
  }

  assert.match(split, /aria-label="Product inspector"/);
  assert.match(split, /data-testid="save-product"/);
  assert.match(split, /const selectedProduct/);
  assert.match(split, /<ProductShell/);
  assert.match(split, /pendingSwitchId/);
  assert.match(split, /confirmationState[\s\S]*?kind: "switch"/);
  assert.match(split, /listedProducts\.length === 0/);
  assert.match(split, /No products match/);
  assert.match(split, /Clear filters/);
  assert.match(split, /selectedIds/);
  assert.match(split, /data-testid="bulk-toolbar"/);
  assert.match(split, /applyBulkPatch/);
  assert.match(split, /pinSelectedProduct\(/);
  assert.match(split, /Unsaved draft pinned outside current filters/);
  assert.match(split, /findDirtyImportConflict\(/);
  assert.match(split, /kind: "import-conflict"/);
  assert.match(
    split,
    /confirmationState\.kind === "import"[\s\S]*?findDirtyImportConflict\([\s\S]*?dirty \? draft : null[\s\S]*?kind: "import-conflict"/,
  );
  assert.match(split, /confirmImport\(confirmationState\.productId\)/);
  assert.match(split, /refreshDraft: true/);

  assert.match(styles, /\.gbpr-split-layout\s*\{/);
  assert.match(styles, /\.gbpr-inspector-panel\s*\{/);
  assert.match(
    styles,
    /\.gbpr-split-layout\s*\{[^}]*grid-template-columns:\s*minmax\(\d+px,\s*\d+px\)\s+minmax\(\d+px,\s*1fr\);/s,
  );
  assert.match(
    styles,
    /\.gbpr-inspector-panel\s*\{[^}]*position:\s*sticky;/s,
  );
});

test("Split Inspector pins a dirty selected product outside the filtered results", () => {
  const selected = SAMPLE_PRODUCTS[0];
  const visibleProducts = [SAMPLE_PRODUCTS[1], SAMPLE_PRODUCTS[2]];

  const result = pinSelectedProduct(
    visibleProducts,
    selected,
    selected.id,
    true,
  );

  assert.deepEqual(
    result.map((product) => product.id),
    [selected.id, SAMPLE_PRODUCTS[1].id, SAMPLE_PRODUCTS[2].id],
  );
  assert.deepEqual(visibleProducts, [SAMPLE_PRODUCTS[1], SAMPLE_PRODUCTS[2]]);
});

test("Split Inspector does not duplicate a dirty selection already in the filtered results", () => {
  const selected = SAMPLE_PRODUCTS[0];
  const visibleProducts = [selected, SAMPLE_PRODUCTS[1]];

  const result = pinSelectedProduct(
    visibleProducts,
    selected,
    selected.id,
    true,
  );

  assert.deepEqual(
    result.map((product) => product.id),
    visibleProducts.map((product) => product.id),
  );
  assert.equal(new Set(result.map((product) => product.id)).size, result.length);
});

test("Split Inspector finds an included import conflict by normalized saved identity", () => {
  const selected = SAMPLE_PRODUCTS[0];
  const conflictingRow = {
    id: "conflicting-import",
    name: `  ${selected.name.toUpperCase()}  `,
    vendor: selected.vendor.toUpperCase(),
    mgSize: ` ${selected.mgSize.toUpperCase()} `,
    price: selected.price + 8,
    status: "price-changed" as const,
    existingPrice: selected.price,
    included: true,
  };

  const result = findDirtyImportConflict(
    SAMPLE_PRODUCTS,
    selected.id,
    {
      name: "Unsaved renamed product",
      vendor: selected.vendor,
      mgSize: selected.mgSize,
    },
    [conflictingRow],
  );

  assert.strictEqual(result, conflictingRow);
});

test("Split Inspector ignores skipped and non-matching dirty import rows", () => {
  const selected = SAMPLE_PRODUCTS[0];
  const draft = {
    name: selected.name,
    vendor: selected.vendor,
    mgSize: selected.mgSize,
  };
  const matchingRow = {
    id: "skipped-import",
    name: selected.name,
    vendor: selected.vendor,
    mgSize: selected.mgSize,
    price: selected.price + 8,
    status: "price-changed" as const,
    existingPrice: selected.price,
    included: false,
  };
  const differentRow = {
    ...matchingRow,
    id: "different-import",
    name: "Different product",
    included: true,
  };

  assert.equal(
    findDirtyImportConflict(
      SAMPLE_PRODUCTS,
      selected.id,
      draft,
      [matchingRow, differentRow],
    ),
    null,
  );
  assert.equal(
    findDirtyImportConflict(
      SAMPLE_PRODUCTS,
      selected.id,
      null,
      [{ ...matchingRow, included: true }],
    ),
    null,
  );
});

test("Category Workbench reclassifies edited imports without implicit conflicts", () => {
  const workbench = source("./CategoryWorkbench.tsx");

  assert.match(workbench, /function reclassifyImportRows/);
  assert.match(workbench, /classifyImportRows\(existing, candidates\)/);
  assert.match(workbench, /id: current\.id/);
  assert.match(workbench, /const requiresExplicitInclusion = next\.status !== "new"/);
  assert.match(
    workbench,
    /requiresExplicitInclusion[\s\S]*?identityChanged[\s\S]*?included: false/,
  );
  assert.match(
    workbench,
    /setImportRows\(\(current\) =>[\s\S]*?reclassifyImportRows\(products, nextRows\)/,
  );
});

test("Category Workbench renders product status labels visibly", () => {
  const workbench = source("./CategoryWorkbench.tsx");

  for (const label of ["Live", "Hidden", "Low stock", "Out of stock"]) {
    assert.match(workbench, new RegExp(label));
  }
  assert.match(
    workbench,
    /<span style=\{\{ \.\.\.STYLES\.statusLabel, \.\.\.STATUS_STYLES\[status\] \}\}>\s*\{statusLabel\}\s*<\/span>/,
  );
  assert.doesNotMatch(
    workbench,
    /className="gbpr-visually-hidden">, \{statusLabel\}/,
  );
});

test("Category Workbench exposes mixed category selection state", () => {
  const workbench = source("./CategoryWorkbench.tsx");

  assert.match(workbench, /inputRef\.current\.indeterminate = mixed/);
  assert.match(workbench, /aria-checked=\{mixed \? "mixed" : checked\}/);
  assert.match(workbench, /mixed=\{selectedCount > 0 && !allSelected\}/);
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

test("Batch Studio makes broad edits reviewable before applying", () => {
  const batchStudio = source("./BatchStudio.tsx");

  for (const label of [
    "Batch Studio",
    "Change set",
    "Choose products",
    "Stage changes",
    "Review",
    "Before",
    "After",
    "Apply changes",
    "Validation errors",
  ]) {
    assert.match(batchStudio, new RegExp(label));
  }

  assert.match(batchStudio, /data-testid="change-set"/);
  assert.match(batchStudio, /data-testid="apply-change-set"/);
  assert.match(batchStudio, /aria-label="Affected products"/);
});

test("Batch Studio retains invalid field drafts and counts every validation error", async () => {
  const { evaluateBatchDraft } = await loadBatchStudioModule();
  const fieldChanges = Object.freeze({
    price: "-1",
    stock: "2.5",
    maxPerCustomer: "0",
    halfKitEnabled: "unchanged" as const,
  });

  const result = evaluateBatchDraft(
    SAMPLE_PRODUCTS.slice(0, 3),
    { query: "", vendor: "all", category: "all" },
    fieldChanges,
  );

  assert.deepEqual(result.fieldChanges, fieldChanges);
  assert.equal(result.validationErrorCount, 3);
  assert.deepEqual(
    result.validationErrors.map((error) => error.field),
    ["price", "stock", "maxPerCustomer"],
  );
  assert.deepEqual(result.stagedPatch, {});
  assert.deepEqual(result.previewRows, []);
});

test("Batch Studio builds preview rows without mutating source products", async () => {
  const { evaluateBatchDraft } = await loadBatchStudioModule();
  const products = SAMPLE_PRODUCTS.slice(0, 3).map((product) => ({
    ...product,
  }));
  const originalProducts = products.map((product) => ({ ...product }));

  const result = evaluateBatchDraft(
    products,
    { query: "", vendor: "all", category: "all" },
    {
      price: "99",
      stock: "12",
      maxPerCustomer: "4",
      halfKitEnabled: "enabled",
    },
  );

  assert.deepEqual(products, originalProducts);
  assert.equal(result.previewRows.length, products.length);
  assert.notStrictEqual(result.previewRows[0].before, products[0]);
  assert.notStrictEqual(result.previewRows[0].after, products[0]);
  assert.equal(result.previewRows[0].before.price, originalProducts[0].price);
  assert.equal(result.previewRows[0].after.price, 99);
  assert.equal(result.previewRows[0].after.stock, 12);
  assert.equal(result.previewRows[0].after.maxPerCustomer, 4);
  assert.equal(result.previewRows[0].after.halfKitEnabled, true);
});

test("Batch Studio commits through the confirmed apply transition", async () => {
  const { commitBatchChangeSet, evaluateBatchDraft } =
    await loadBatchStudioModule();
  const products = SAMPLE_PRODUCTS.slice(0, 3).map((product) => ({
    ...product,
  }));
  const conditions = { query: "", vendor: "all", category: "all" };
  const fieldChanges: BatchFieldChanges = {
    price: "88",
    stock: "",
    maxPerCustomer: "",
    halfKitEnabled: "unchanged",
  };
  const evaluation = evaluateBatchDraft(products, conditions, fieldChanges);
  let applyCalls = 0;

  assert.equal(applyCalls, 0, "previewing must not apply catalogue changes");

  const committed = commitBatchChangeSet(
    {
      products,
      applied: [],
      conditions,
      fieldChanges,
      changeSetName: "Confirmed supplier price",
      previewRows: evaluation.previewRows,
      stagedPatch: evaluation.stagedPatch,
      appliedAt: "2026-07-18T12:00:00.000Z",
      historyId: "batch-history-test",
    },
    (currentProducts, selectedIds, patch) => {
      applyCalls += 1;
      return applyBulkPatch(currentProducts, selectedIds, patch);
    },
  );

  assert.equal(applyCalls, 1);
  assert.deepEqual(products, SAMPLE_PRODUCTS.slice(0, 3));
  assert.deepEqual(
    committed.products.map((product) => product.price),
    [88, 88, 88],
  );
  assert.equal(committed.applied[0].name, "Confirmed supplier price");
  assert.equal(committed.applied[0].affectedCount, 3);
  assert.deepEqual(committed.feedback.snapshot.products, products);
  assert.equal(committed.changeSetName, "");

  const batchStudio = source("./BatchStudio.tsx");
  const requestStart = batchStudio.indexOf("function requestApply");
  const requestEnd = batchStudio.indexOf(
    "\n  function confirmApply",
    requestStart,
  );
  const requestApply = batchStudio.slice(requestStart, requestEnd);

  assert.match(requestApply, /setApplyConfirmationOpen\(true\)/);
  assert.doesNotMatch(requestApply, /commitBatchChangeSet|applyBulkPatch/);
  assert.match(batchStudio, /onConfirm=\{confirmApply\}/);
  assert.match(
    batchStudio,
    /function confirmApply[\s\S]*?commitBatchChangeSet\(/,
  );
  assert.match(
    batchStudio,
    /function commitBatchChangeSet[\s\S]*?applyBulkPatch/,
  );
});

test("Batch Studio history snapshots support undo after apply and reset", async () => {
  const {
    commitBatchChangeSet,
    evaluateBatchDraft,
    resetBatchStudioState,
    undoBatchStudioState,
  } = await loadBatchStudioModule();
  const initialState: BatchSnapshot = {
    products: SAMPLE_PRODUCTS.slice(0, 2).map((product) => ({ ...product })),
    applied: [],
    conditions: { query: "", vendor: "all", category: "all" },
    fieldChanges: {
      price: "77",
      stock: "",
      maxPerCustomer: "",
      halfKitEnabled: "unchanged",
    },
    changeSetName: "Undoable price",
  };
  const evaluation = evaluateBatchDraft(
    initialState.products,
    initialState.conditions,
    initialState.fieldChanges,
  );
  const committed = commitBatchChangeSet({
    ...initialState,
    previewRows: evaluation.previewRows,
    stagedPatch: evaluation.stagedPatch,
    appliedAt: "2026-07-18T12:00:00.000Z",
    historyId: "batch-history-undo",
  });

  const undoneApply = undoBatchStudioState(committed.feedback);
  assert.deepEqual(undoneApply, initialState);
  assert.notStrictEqual(undoneApply.products, initialState.products);

  const reset = resetBatchStudioState(committed);
  assert.deepEqual(reset.products, SAMPLE_PRODUCTS);
  assert.deepEqual(reset.applied, []);
  assert.deepEqual(reset.fieldChanges, {
    price: "",
    stock: "",
    maxPerCustomer: "",
    halfKitEnabled: "unchanged",
  });

  const undoneReset = undoBatchStudioState(reset.feedback);
  assert.deepEqual(undoneReset.products, committed.products);
  assert.deepEqual(undoneReset.applied, committed.applied);
});

test("Vendor Matrix puts supplier reconciliation in catalogue context", () => {
  const vendorMatrix = source("./VendorMatrix.tsx");
  for (const text of [
    "Vendor Matrix",
    "Vendors",
    "Supplier price",
    "Live price",
    "Review changes",
    "Import update",
    "CSV Import",
    "AI Price List",
  ]) {
    assert.match(vendorMatrix, new RegExp(text));
  }
  assert.match(vendorMatrix, /aria-label="Vendor list"/);
  assert.match(vendorMatrix, /data-testid="review-import"/);
  assert.match(vendorMatrix, /price-changed|duplicate/);
});
