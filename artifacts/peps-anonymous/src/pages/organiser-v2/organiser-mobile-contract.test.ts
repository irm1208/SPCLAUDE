import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (file: string) => readFileSync(new URL(file, import.meta.url), "utf8");
const readOptional = (file: string) => {
  const url = new URL(file, import.meta.url);
  return existsSync(url) ? readFileSync(url, "utf8") : "";
};

test("mobile organiser drawer uses the accessible shared Sheet", () => {
  const shell = read("./OrganiserShell.tsx");
  assert.match(shell, /from\s+["']@\/components\/ui\/sheet["']/);
  assert.match(shell, /<Sheet\s+open=\{mobileOpen\}\s+onOpenChange=\{setMobileOpen\}/);
  assert.match(shell, /<SheetContent[^>]*side=["']left["']/);
  assert.match(shell, /<SheetTitle[^>]*>Organiser navigation<\/SheetTitle>/);
  assert.match(shell, /<SheetDescription/);
});

test("mobile topbar exposes the active group buy", () => {
  const topbar = read("./OrganiserTopbar.tsx");
  assert.match(topbar, /className=["']ov2-mobile-group-context["']/);
  assert.match(topbar, /Active group buy/);
  assert.match(topbar, /\{groupName\}/);
});

test("mobile bottom navigation exposes the approved destinations", () => {
  const nav = read("./OrganiserMobileNavigation.tsx");
  const config = read("./nav.ts");
  for (const label of ["Overview", "Orders", "Dispatch", "Members"]) {
    assert.match(config, new RegExp(`label: ["']${label}["']`));
  }
  assert.match(nav, />More</);
  assert.match(nav, /aria-current=\{isActive \? ["']page["']/);
  assert.match(nav, /aria-haspopup=["']dialog["']/);
  assert.match(nav, /onOpenMore/);
});

test("workspace wires the mobile navigation to the existing drawer", () => {
  const workspace = read("./Workspace.tsx");
  assert.match(workspace, /mobileNavigation=\{onOpenMore =>/);
  assert.match(workspace, /onOpenMore=\{onOpenMore\}/);
});

test("mobile Orders renders the selected action-first landmarks", () => {
  const mobile = read("./OrdersMobileWorkspace.tsx");
  assert.match(mobile, /orders need attention/);
  assert.match(mobile, /Chase payment/);
  assert.match(mobile, /Ready to dispatch/);
  for (const label of ["Needs action", "All orders", "Completed"]) assert.match(mobile, new RegExp(label));
  assert.match(mobile, /order\.code \?\? order\.id/);
  assert.match(mobile, /onOpenOrder\(order\)/);
});

test("Orders keeps desktop and mobile renderers on one repository snapshot", () => {
  const orders = read("./OrdersTab.tsx");
  assert.match(orders, /buildMobileOrdersModel\(orders/);
  assert.match(orders, /className="orders-mobile-view"/);
  assert.match(orders, /className="orders-desktop-view"/);
  assert.match(orders, /onOpenOrder=\{setQuickViewOrder\}/);
});

test("mobile Filter Studio uses the shared Vaul drawer and restores focus", () => {
  const surface = readOptional("./OrdersFilterSurface.tsx");
  const orders = read("./OrdersTab.tsx");
  assert.match(surface, /@\/components\/ui\/drawer/);
  assert.match(surface, /<Drawer\s+open=\{open\}/);
  assert.match(surface, /<DrawerTitle\b/);
  assert.match(surface, /<DrawerDescription\b/);
  assert.match(orders, /<OrdersFilterSurface\b/);
  assert.match(orders, /filterToggleRef/);
  assert.match(orders, /filterToggleRef\.current\?\.focus\(\)/);
});

test("mobile Filter Studio keeps its focus target mounted across a desktop resize", () => {
  const orders = read("./OrdersTab.tsx");
  assert.match(
    orders,
    /if\s*\(isMobile && filterStudioOpen && mobileView !== ["']all["']\)\s*\{\s*setMobileView\(["']all["']\);?\s*\}/,
  );
});

test("mobile Filter Studio is a bounded, scrollable safe-area sheet", () => {
  const css = read("./approved-orders.css");
  assert.match(css, /\.organiser-v2\.orders-filter-sheet\s*\{[^}]*min-height:\s*0;?[^}]*max-height:\s*min\(88dvh,\s*760px\)/);
  assert.match(css, /\.organiser-v2\.orders-filter-sheet\s*\{[\s\S]*max-height:\s*min\(88dvh,\s*760px\)/);
  assert.match(css, /\.organiser-v2\.orders-filter-sheet\s*\{[\s\S]*border-radius:\s*18px\s+18px\s+0\s+0/);
  assert.match(css, /\.orders-filter-sheet[\s\S]*\.orders-filter-studio-grid\s*\{[\s\S]*overflow-y:\s*auto/);
  assert.match(css, /\.orders-filter-sheet[\s\S]*\.orders-filter-date-pair\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(css, /\.orders-filter-sheet[\s\S]*\.orders-filter-studio-footer\s*\{[\s\S]*env\(safe-area-inset-bottom\)/);
  assert.match(css, /\.orders-filter-sheet[\s\S]*\.orders-filter-apply\s*\{[\s\S]*min-height:\s*44px/);
});
