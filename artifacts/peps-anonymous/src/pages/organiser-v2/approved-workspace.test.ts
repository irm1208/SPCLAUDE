import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const read = (name: string) => readFileSync(new URL(name, import.meta.url), "utf8");

function hasJsxClassName(sourceText: string, hook: string): boolean {
  const sourceFile = ts.createSourceFile(
    "contract.tsx",
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const component = sourceFile.statements.find(
    (statement) => ts.isFunctionDeclaration(statement)
      && statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword),
  );
  if (!component || !ts.isFunctionDeclaration(component) || !component.body) return false;
  const componentBody = component.body;

  const returnedExpressions: ts.Expression[] = [];
  function collectComponentReturns(node: ts.Node) {
    if (node !== componentBody && ts.isFunctionLike(node)) return;
    if (ts.isReturnStatement(node)) {
      if (node.expression) returnedExpressions.push(node.expression);
      return;
    }
    ts.forEachChild(node, collectComponentReturns);
  }
  collectComponentReturns(componentBody);

  return returnedExpressions.length > 0
    && returnedExpressions.every((expression) => rootHasClassName(expression, sourceFile, hook));
}

function rootHasClassName(
  expression: ts.Expression,
  sourceFile: ts.SourceFile,
  hook: string,
): boolean {
  let root = expression;
  while (ts.isParenthesizedExpression(root)) root = root.expression;

  const attributes = ts.isJsxElement(root)
    ? root.openingElement.attributes
    : ts.isJsxSelfClosingElement(root)
      ? root.attributes
      : null;
  if (!attributes) return false;

  return attributes.properties.some(
    (property) => ts.isJsxAttribute(property)
      && property.name.getText(sourceFile) === "className"
      && property.initializer?.getText(sourceFile).includes(hook),
  );
}

function importPosition(sourceText: string, moduleName: string): number {
  const sourceFile = ts.createSourceFile(
    "entry.tsx",
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const declaration = sourceFile.statements.find(
    (statement) => ts.isImportDeclaration(statement)
      && ts.isStringLiteral(statement.moduleSpecifier)
      && statement.moduleSpecifier.text === moduleName,
  );
  return declaration?.getStart(sourceFile) ?? -1;
}

function hasAccessibleButtonWithClass(sourceText: string, hook: string): boolean {
  const sourceFile = ts.createSourceFile(
    "button-contract.tsx",
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  let found = false;

  function visit(node: ts.Node) {
    const opening = ts.isJsxElement(node)
      ? node.openingElement
      : ts.isJsxSelfClosingElement(node)
        ? node
        : null;
    if (opening?.tagName.getText(sourceFile) === "button") {
      const attributes = opening.attributes.properties;
      const hasClass = attributes.some(
        (property) => ts.isJsxAttribute(property)
          && property.name.getText(sourceFile) === "className"
          && property.initializer?.getText(sourceFile).includes(hook),
      );
      const hasLabel = attributes.some(
        (property) => ts.isJsxAttribute(property)
          && property.name.getText(sourceFile) === "aria-label"
          && property.initializer !== undefined,
      );
      if (hasClass && hasLabel) found = true;
    }
    if (!found) ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return found;
}

test("approved class hooks must be on every returned component root", () => {
  const hook = "approved-example-root";
  const nestedOnly = `
    export default function Example() {
      const dead = <aside className="${hook}" />;
      return <main><section className="${hook}" /></main>;
    }
  `;
  const everyRoot = `
    export default function Example({ alternate }: { alternate: boolean }) {
      if (alternate) return <aside className="${hook}" />;
      return <main className="page ${hook}" />;
    }
  `;

  assert.equal(hasJsxClassName(nestedOnly, hook), false);
  assert.equal(hasJsxClassName(everyRoot, hook), true);
});

test("approved organiser maps the five pictures to production tabs", () => {
  const contracts = [
    ["./OverviewTabV3.tsx", "approved-command-overview"],
    ["./OrdersTab.tsx", "approved-order-desk"],
    ["./dispatch/DispatchControlDesk.tsx", "approved-dispatch-flow"],
    ["./GbProductsTab.tsx", "approved-inventory-allocation"],
    ["./MembersTab.tsx", "approved-member-hub"],
  ] as const;

  for (const [file, hook] of contracts) {
    assert.ok(hasJsxClassName(read(file), hook), `${file} must use ${hook} in a JSX className`);
  }
});

test("approved shell stylesheet loads after the native organiser layer", () => {
  const entry = read("../GbOrganiserV2.tsx");
  const nativeImport = importPosition(entry, "./organiser-v2/peps-native.css");
  const approvedImport = importPosition(entry, "./organiser-v2/approved-workspace.css");
  assert.ok(nativeImport >= 0, "GbOrganiserV2.tsx must import peps-native.css");
  assert.ok(approvedImport >= 0, "GbOrganiserV2.tsx must import approved-workspace.css");
  assert.ok(approvedImport > nativeImport);
});

test("approved shell locks the picture dimensions and Peps palette", () => {
  assert.ok(
    existsSync(new URL("./approved-workspace.css", import.meta.url)),
    "approved-workspace.css must exist",
  );
  const css = read("./approved-workspace.css");
  assert.match(css, /--ov2-sidebar-width:\s*236px\s*;/i);
  assert.match(css, /--ov2-responsive-topbar-height:\s*108px\s*;/i);
  assert.match(css, /--ov2-context-rail-height:\s*38px\s*;/i);
  assert.match(css, /--ov2-workbar-height:\s*70px\s*;/i);
  assert.match(css, /#F4F6F9/i);
  assert.match(css, /#1B3164/i);
  assert.match(css, /#1B3A7A/i);
  assert.match(css, /#2D6BCC/i);
  assert.match(css, /#0F1F38/i);
});

test("approved shell supports the drawer, small screens, and reduced motion", () => {
  const css = read("./approved-workspace.css");
  assert.match(css, /@media\s*\(max-width:\s*1023px\)/);
  assert.match(css, /@media\s*\(max-width:\s*767px\)/);
  assert.match(css, /prefers-reduced-motion/);
});

test("approved shell typography matches the main dashboard", () => {
  const css = read("./approved-workspace.css");
  const organiserRule = css.match(/\.organiser-v2\s*\{([^}]*)\}/)?.[1] ?? "";

  assert.match(
    organiserRule,
    /font-family:\s*['"]Inter['"],\s*['"]Salesforce Sans['"],\s*['"]Helvetica Neue['"],\s*Arial,\s*sans-serif\s*;/,
  );
  assert.match(organiserRule, /font-size:\s*var\(--approved-type-body\)\s*;/);
  assert.match(css, /\.organiser-v2 \.ov2-nav-link\s*\{[^}]*font-size:\s*var\(--approved-type-body\)\s*;/s);
  assert.match(css, /\.organiser-v2 \.ov2-search-trigger\s*\{[^}]*font-size:\s*var\(--approved-type-control\)\s*;/s);
  assert.doesNotMatch(css, /font-size:\s*(?:7|8|9|10)px\s*;/);

  const approvedWeights = new Set([400, 500, 600, 700]);
  const weights = [...css.matchAll(/font-weight:\s*(\d+)\s*;/g)].map(match => Number(match[1]));
  assert.ok(weights.length > 0, "approved shell must declare its typography hierarchy");
  for (const weight of weights) {
    assert.ok(approvedWeights.has(weight), `unsupported approved shell font weight: ${weight}`);
  }
});

test("approved workspace uses one readable typography scale", () => {
  const css = read("./approved-workspace.css");
  const organiserRule = css.match(/\.organiser-v2\s*\{([^}]*)\}/)?.[1] ?? "";

  assert.match(organiserRule, /--approved-type-label:\s*11px\s*;/);
  assert.match(organiserRule, /--approved-type-micro:\s*var\(--approved-type-label\)\s*;/);
  assert.match(organiserRule, /--approved-type-meta:\s*12px\s*;/);
  assert.match(organiserRule, /--approved-type-body:\s*14px\s*;/);
  assert.match(organiserRule, /--approved-type-control:\s*13px\s*;/);
  assert.match(organiserRule, /--approved-type-row-title:\s*14px\s*;/);
  assert.match(organiserRule, /--approved-type-section:\s*16px\s*;/);
  assert.match(organiserRule, /--approved-type-card-title:\s*var\(--approved-type-section\)\s*;/);
  assert.match(organiserRule, /--approved-type-page-title:\s*29px\s*;/);
  assert.match(organiserRule, /--approved-type-mobile-page-title:\s*24px\s*;/);
  assert.match(organiserRule, /font-size:\s*var\(--approved-type-body\)\s*;/);

  assert.match(css, /\.organiser-v2 \.ov2-command-hero h1\s*\{[^}]*font-size:\s*var\(--approved-type-page-title\)/s);
  assert.match(css, /\.organiser-v2 \.ov2-attention-row strong\s*\{[^}]*font-size:\s*var\(--approved-type-body\)/s);
  assert.match(css, /\.organiser-v2 \.atlas-page-header h1\s*\{[^}]*font-size:\s*var\(--approved-type-page-title\)/s);
  assert.match(css, /\.organiser-v2 \.atlas-data-table td\s*\{[^}]*font-size:\s*var\(--approved-type-body\)/s);
  assert.match(css, /\.organiser-v2 \.ov2-setup-link small\s*\{[^}]*color:\s*rgba\(255,\s*255,\s*255,\s*0\.75\)/s);
  assert.doesNotMatch(css, /font-size:\s*(?:7|8|9|10)px\s*;/);
});

test("approved overview pipeline keeps a compact balanced hierarchy", () => {
  const css = read("./approved-workspace.css");

  assert.match(css, /\.organiser-v2 \.ov2-workspace-screen\[data-treatment\] \.ov2-pipeline-heading h2\s*\{[^}]*font-size:\s*15px/s);
  assert.match(css, /\.organiser-v2 \.ov2-workspace-screen\[data-treatment\] \.ov2-pipeline-heading p\s*\{[^}]*font-size:\s*12px/s);
  assert.match(css, /\.organiser-v2 \.ov2-workspace-screen\[data-treatment\] \.ov2-board-column > header h2\s*\{[^}]*font-size:\s*14px/s);
  assert.match(css, /\.organiser-v2 \.ov2-workspace-screen\[data-treatment\] \.ov2-order-card h3\s*\{[^}]*font-size:\s*var\(--approved-type-control\)/s);
  assert.match(css, /\.organiser-v2 \.ov2-workspace-screen\[data-treatment\] \.ov2-order-card > p\s*\{[^}]*font-size:\s*11px/s);
  assert.match(css, /\.organiser-v2 \.ov2-workspace-screen\[data-treatment\] \.ov2-order-meta\s*\{[^}]*font-size:\s*var\(--approved-type-label\)/s);
  assert.match(css, /\.organiser-v2 \.ov2-workspace-screen\[data-treatment\] \.ov2-order-due\s*\{[^}]*font-size:\s*var\(--approved-type-label\)/s);
  assert.match(css, /\.organiser-v2 \.ov2-workspace-screen\[data-treatment\] \.ov2-order-card footer\s*\{[^}]*font-size:\s*var\(--approved-type-label\)/s);
  assert.match(css, /\.organiser-v2 \.ov2-workspace-screen\[data-treatment\] \.ov2-order-card footer strong\s*\{[^}]*font-size:\s*12px/s);
  assert.match(css, /\.organiser-v2 \.ov2-workspace-screen\[data-treatment\] \.ov2-view-switcher button\s*\{[^}]*font-size:\s*var\(--approved-type-meta\)/s);
  assert.match(css, /\.organiser-v2 \.ov2-workspace-screen\[data-treatment\] \.ov2-toolbar-action\s*\{[^}]*font-size:\s*var\(--approved-type-meta\)/s);
  assert.match(css, /\.organiser-v2 \.ov2-workspace-screen\[data-treatment\] \.ov2-board-column > header span\s*\{[^}]*font-size:\s*var\(--approved-type-label\)/s);
});

test("approved Order Desk exposes the collapsed draft-and-apply Filter Studio", () => {
  const orders = read("./OrdersTab.tsx");
  const ordersFilterSurface = read("./OrdersFilterSurface.tsx");
  const entry = read("../GbOrganiserV2.tsx");

  assert.ok(hasJsxClassName(orders, "approved-order-desk"));
  assert.match(orders, /filterStudioOpen[^\n]*useState\(false\)/);
  assert.match(orders, /aria-expanded=\{filterStudioOpen\}/);
  assert.match(orders, /aria-controls="orders-filter-studio"/);
  assert.match(orders, /<OrdersFilterSurface/);
  assert.match(ordersFilterSurface, /id="orders-filter-studio"/);
  assert.match(orders, /Apply filters/);
  assert.match(orders, />Cancel</);
  assert.match(orders, />Reset</);
  assert.match(orders, /cloneOrderFilters/);
  assert.match(orders, /validateOrderFilterDates/);

  const shared = importPosition(entry, "./organiser-v2/approved-workspace.css");
  const ordersCss = importPosition(entry, "./organiser-v2/approved-orders.css");
  assert.ok(ordersCss > shared);
  assert.ok(existsSync(new URL("./approved-orders.css", import.meta.url)));
});

test("approved Order Desk uses the full width without a Saved Views card", () => {
  const orders = read("./OrdersTab.tsx");

  assert.doesNotMatch(orders, /SavedViewsSidebar/);
  assert.doesNotMatch(orders, /useSavedViews/);
  assert.doesNotMatch(orders, /Saved Views Sidebar/);
  assert.match(orders, /className="orders-main-content space-y-4"/);
});

test("approved Order Desk keeps long statuses inside their table column", () => {
  const orders = read("./OrdersTab.tsx");
  const css = read("./approved-orders.css");

  assert.match(orders, /id:\s*"member"[\s\S]*?width:\s*"20%"/);
  assert.match(orders, /id:\s*"status"[\s\S]*?width:\s*"20%"/);
  assert.match(orders, /id:\s*"items"[\s\S]*?width:\s*"21%"/);
  assert.match(orders, /id:\s*"total"[\s\S]*?width:\s*"9%"/);
  assert.match(orders, /id:\s*"payment"[\s\S]*?width:\s*"12%"/);
  assert.match(orders, /id:\s*"created"[\s\S]*?width:\s*"11%"/);
  assert.match(css, /\.atlas-orders-table-card \.atlas-data-table\s*\{[^}]*min-width:\s*780px/s);
  assert.match(css, /\.atlas-orders-table-card \.atlas-data-table td\s*\{[^}]*overflow:\s*hidden/s);
  assert.match(css, /\.atlas-orders-table-card \.atlas-status-badge\s*\{[^}]*max-width:\s*100%[^}]*text-overflow:\s*ellipsis/s);
});

test("approved shell sidebar keeps every destination and exposes the active group buy", () => {
  const sidebar = read("./DashboardSidebar.tsx");
  assert.ok(
    hasAccessibleButtonWithClass(sidebar, "ov2-active-gb-card"),
    "DashboardSidebar must expose an accessible ov2-active-gb-card button",
  );
  assert.match(sidebar, /WORKSPACE_GROUPS\.map\s*\(/);
  assert.match(sidebar, /group\.tabs\.map\s*\(/);
  assert.match(sidebar, /gbName\?:\s*string/);
  assert.match(sidebar, /\{gbName\}/);
});

test("approved shell topbar labels search and organiser profile controls", () => {
  const topbar = read("./OrganiserTopbar.tsx");
  assert.match(topbar, /aria-label="Search[^"]*"/);
  assert.doesNotMatch(topbar, /aria-label="Notifications"/);
  assert.match(topbar, /Open organiser profile for/);
});

test("approved shell keeps mobile group context and primary actions reachable", () => {
  const css = read("./approved-workspace.css");
  const topbar = read("./OrganiserTopbar.tsx");
  const workspace = read("./Workspace.tsx");
  const setup = read("./SetupWizard.tsx");

  assert.match(
    css,
    /@media\s*\(max-width:\s*767px\)[\s\S]*?\.organiser-v2 \.ov2-topbar\s*\{[^}]*display:\s*block/s,
  );
  assert.match(
    css,
    /@media\s*\(max-width:\s*767px\)[\s\S]*?\.organiser-v2 \.ov2-topbar-context-rail\s*\{[^}]*display:\s*none/s,
  );
  assert.match(
    css,
    /@media\s*\(max-width:\s*767px\)[\s\S]*?\.organiser-v2 \.ov2-mobile-group-context\s*\{[^}]*display:\s*grid/s,
  );
  assert.match(
    css,
    /@media\s*\(max-width:\s*767px\)[\s\S]*?\.organiser-v2 \.ov2-copy-toast\s*\{[^}]*top:\s*calc\(var\(--ov2-topbar-height\) \+ 48px\)/s,
  );
  assert.match(
    css,
    /@media\s*\(max-width:\s*767px\)[\s\S]*?\.organiser-v2 \.ov2-primary-button\s*\{[^}]*min-height:\s*44px/s,
  );
  assert.doesNotMatch(topbar, /className="ov2-action-label">Share/);
  assert.match(topbar, /className="ov2-menu-glyph"/);
  assert.match(workspace, /className="ov2-action-label">Manage/);
  assert.match(setup, /className="ov2-action-label">Save draft/);
  assert.match(setup, /className="ov2-action-label">Preview/);
});

test("approved shell collapsed controls and setup steps keep accessible names", () => {
  const css = read("./approved-workspace.css");
  const sidebar = read("./DashboardSidebar.tsx");

  assert.ok(hasAccessibleButtonWithClass(sidebar, "ov2-dashboard-exit"));
  assert.ok(hasAccessibleButtonWithClass(sidebar, "ov2-setup-switch"));
  assert.ok(hasAccessibleButtonWithClass(sidebar, "ov2-setup-link"));
  assert.match(css, /\.is-sidebar-collapsed \.ov2-setup-switch span/);
});

test("approved shell renders optional controls only with functional workspace handlers", () => {
  const topbar = read("./OrganiserTopbar.tsx");
  const workspace = read("./Workspace.tsx");
  const setup = read("./SetupWizard.tsx");

  for (const handler of ["onBack", "onProfile"]) {
    assert.match(topbar, new RegExp(`\\{${handler} \\? \\(`), `${handler} must guard its control`);
  }
  assert.doesNotMatch(topbar, /onShare|onNotifications/);
  assert.match(workspace, /onProfile=\{\(\) => window\.location\.assign\("\/account"\)\}/);
  assert.match(
    setup,
    /onBack=\{current > 0 \? \(\) => setCurrent\(value => value - 1\) : undefined\}/,
    "SetupWizard must omit the Back control on the initial step",
  );
});

test("approved shell supplies contextual primary navigation on every workspace tab", () => {
  const workspace = read("./Workspace.tsx");

  for (const [tab, label, target] of [
    ["overview", "Create order", "orders"],
    ["orders", "Open dispatch", "dispatch"],
    ["dispatch", "View QR codes", "qrcodes"],
    ["members", "View orders", "orders"],
    ["products", "Open dispatch", "dispatch"],
  ]) {
    assert.match(
      workspace,
      new RegExp(`${tab}: \\{ label: "${label}", target: "${target}" \\}`),
    );
  }
  assert.match(workspace, /label: "Edit setup", onClick: onModeChange/);
  assert.match(workspace, /primaryAction=\{primaryAction\}/);
});
