import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (file: string) => readFileSync(new URL(file, import.meta.url), "utf8");

test("Atlas workspace exposes the complete organiser-only navigation", () => {
  const nav = source("./nav.ts");
  const sidebar = source("./DashboardSidebar.tsx");
  const workspace = source("./Workspace.tsx");

  for (const destination of [
    "overview", "todos", "members", "orders", "broadcast", "parcels", "dispatch",
    "qrcodes", "reshippers", "legs", "shipping", "pnl", "labtests",
    "testinggroups", "summary", "tickets", "settings", "products", "rules",
  ]) {
    assert.match(nav, new RegExp(`\\"${destination}\\"`), `missing ${destination} destination`);
  }

  assert.match(sidebar, /Back to main dashboard/);
  assert.match(workspace, /MembersTab/);
});

test("Atlas shared primitives include professional table and drawer contracts", () => {
  const atlasUi = source("./AtlasUi.tsx");

  for (const component of [
    "AtlasPageHeader",
    "AtlasStatusBadge",
    "AtlasDataTable",
    "AtlasQuickViewDrawer",
    "AtlasEmptyState",
  ]) {
    assert.match(atlasUi, new RegExp(`export function ${component}`));
  }
});

test("Orders composes compact summaries and contextual quick view", () => {
  const orders = source("./OrdersTab.tsx");
  assert.match(orders, /CompactOrderList/);
  assert.match(orders, /AtlasQuickViewDrawer/);
  assert.match(orders, /atlas-orders-table-card/);
});

test("all seven setup steps remain represented in the Atlas flow", () => {
  const nav = source("./nav.ts");
  for (const label of [
    "Basics",
    "Products",
    "Shipping",
    "Accepting Payments",
    "Access",
    "Rules & Info",
    "Review & Launch",
  ]) {
    assert.match(nav, new RegExp(label.replace(/[&]/g, "\\&")));
  }
});

test("Atlas visual layer provides responsive and reduced-motion treatments", () => {
  const css = source("./peps-native.css");
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /data-page=\"members\"/);
  assert.match(css, /\.atlas-data-table/);
  assert.match(css, /\.atlas-quick-view/);
});

test("Overview command centre keeps Atlas attention and pipeline landmarks", () => {
  const overview = source("./OverviewTabV3.tsx");
  assert.match(overview, /ov2-attention-panel/);
  assert.match(overview, /ov2-pipeline-section/);
  assert.match(overview, /ov2-pulse-panel/);
});

test("Atlas route and setup boundaries remain explicit", () => {
  const screen = source("./WorkspaceScreen.tsx");
  const setup = source("./SetupWizard.tsx");
  assert.match(screen, /data-atlas-root/);
  assert.match(screen, /data-treatment/);
  assert.match(setup, /data-atlas-setup/);
});

test("Atlas interactive surfaces retain accessible semantics", () => {
  const ui = source("./AtlasUi.tsx");
  const sidebar = source("./DashboardSidebar.tsx");
  const shell = source("./OrganiserShell.tsx");
  assert.match(ui, /role="dialog"/);
  assert.match(ui, /aria-modal="true"/);
  assert.match(ui, /<table className="atlas-data-table" aria-label=/);
  assert.match(sidebar, /aria-current=/);
  assert.match(shell, /aria-label="Mobile organiser navigation"/);
});
