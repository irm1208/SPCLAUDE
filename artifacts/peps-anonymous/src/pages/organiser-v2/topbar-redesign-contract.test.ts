import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file: string) => readFileSync(new URL(file, import.meta.url), "utf8");
const topbar = read("./OrganiserTopbar.tsx");
const shell = read("./OrganiserShell.tsx");
const workspace = read("./Workspace.tsx");
const setup = read("./SetupWizard.tsx");
const approvedCss = read("./approved-workspace.css");

test("topbar renders option A as a semantic quiet summary rail", () => {
  for (const hook of [
    "ov2-topbar-context-rail",
    "ov2-topbar-context-kicker",
    "ov2-topbar-context-metrics",
    "ov2-topbar-context-metric",
    "ov2-topbar-status",
    "ov2-topbar-workbar",
    "ov2-page-context",
    "ov2-menu-glyph",
  ]) assert.match(topbar, new RegExp(hook));
  for (const label of ["Status", "Members", "Orders"]) {
    assert.match(topbar, new RegExp(`<dt>${label}</dt>`));
  }
  assert.match(topbar, /Search orders, members, parcels…/);
  assert.match(topbar, /buildTopbarContext/);
  assert.doesNotMatch(topbar, /currency|closeDate|currencyLabel|closeLabel/);
});

test("desktop and drawer menu controls keep distinct behaviour and names", () => {
  assert.match(topbar, /ov2-menu-button-desktop/);
  assert.match(topbar, /sidebarCollapsed \? "Open navigation" : "Collapse navigation"/);
  assert.match(topbar, /ov2-menu-button-drawer/);
  assert.match(topbar, /aria-label="Open navigation"/);
  assert.match(shell, /onToggleSidebar/);
  assert.match(shell, /onOpenDrawer/);
});

test("topbar omits Share and the standalone notification control", () => {
  assert.doesNotMatch(topbar, /Share2|Bell|onShare|onNotifications|ov2-notification-button|ov2-share-action/);
  assert.doesNotMatch(workspace, /handleShare|shareCopied|onShare=|onNotifications=/);
});

test("workspace supplies live member and order totals and preserves existing actions", () => {
  assert.match(workspace, /groupStatus=\{gb\.status\}/);
  assert.match(workspace, /queryKey:\s*\["organiser",\s*"members",\s*gb\.id\]/);
  assert.match(workspace, /queryFn:\s*\(\)\s*=>\s*organiserApi\.members\(gb\.id\)/);
  assert.match(workspace, /mergeMemberDirectory\(repositoryOrders,\s*membersQuery\.data\s*\?\?\s*\[\]\)\.length/);
  assert.match(workspace, /memberCount=\{memberCount\}/);
  assert.match(workspace, /orderCount=\{repositoryOrders\.length\}/);
  assert.match(workspace, /secondaryActions=\{onModeChange/);
  assert.match(workspace, /primaryAction=\{primaryAction\}/);
  assert.match(workspace, /onProfile=\{\(\) => window\.location\.assign\("\/account"\)\}/);
});

test("setup supplies draft context and retains every setup action", () => {
  assert.match(setup, /groupStatus="draft"/);
  assert.match(setup, /memberCount=\{0\}/);
  assert.match(setup, /orderCount=\{0\}/);
  for (const label of ["Save draft", "Preview", "Launch group buy", "Continue"]) {
    assert.match(setup, new RegExp(label));
  }
});

test("approved option-A dimensions keep a quiet context rail and wide search", () => {
  assert.match(approvedCss, /--ov2-responsive-topbar-height:\s*108px/);
  assert.match(approvedCss, /--ov2-context-rail-height:\s*38px/);
  assert.match(approvedCss, /--ov2-workbar-height:\s*70px/);
  assert.match(approvedCss, /\.ov2-topbar\s*\{[^}]*padding:\s*0\s*!important/s);
  assert.match(approvedCss, /\.ov2-topbar-context-rail\s*\{[^}]*height:\s*100%/s);
  assert.match(approvedCss, /\.ov2-topbar-context-rail\s*\{[^}]*margin:\s*0/s);
  assert.match(approvedCss, /\.ov2-topbar-context-rail\s*\{[^}]*border-bottom:\s*1px solid #DCE4EC/s);
  assert.match(approvedCss, /\.ov2-topbar-context-rail\s*\{[^}]*background:\s*#F8FAFC/s);
  assert.doesNotMatch(approvedCss, /\.ov2-topbar-context-rail\s*\{[^}]*linear-gradient/s);
  assert.match(approvedCss, /\.ov2-topbar-context-kicker\s*\{[^}]*text-transform:\s*uppercase/s);
  assert.match(approvedCss, /\.ov2-topbar-context-metric\s*\+\s*\.ov2-topbar-context-metric\s*\{[^}]*border-left:\s*1px solid #DCE4EC/s);
  assert.match(approvedCss, /\.ov2-menu-button[^}]*width:\s*44px[^}]*height:\s*44px/s);
  assert.match(approvedCss, /\.ov2-search-trigger\s*\{[^}]*min-width:\s*440px[^}]*flex:\s*1 1 440px/s);
  assert.match(approvedCss, /\.ov2-primary-button\s*\{[^}]*background:\s*var\(--approved-blue\)/s);
  assert.match(approvedCss, /\.ov2-topbar :where\(button\):active:not\(:disabled\)/);
  assert.match(approvedCss, /\.ov2-topbar :where\(button\):disabled/);
});

test("responsive rules keep tablet context and restore compact mobile navigation", () => {
  assert.match(approvedCss, /@media\s*\(max-width:\s*1399px\)[\s\S]*\.ov2-search-trigger\s*\{[^}]*min-width:\s*260px/s);
  assert.match(approvedCss, /@media\s*\(max-width:\s*1023px\)[\s\S]*\.ov2-menu-button-desktop\s*\{[^}]*display:\s*none/s);
  assert.match(approvedCss, /@media\s*\(max-width:\s*1023px\)[\s\S]*\.ov2-menu-button-drawer\s*\{[^}]*display:\s*inline-flex/s);
  assert.match(approvedCss, /@media\s*\(max-width:\s*900px\)[\s\S]*\.ov2-search-trigger\s*\{[^}]*min-width:\s*200px/s);
  assert.match(approvedCss, /@media\s*\(max-width:\s*767px\)[\s\S]*--ov2-responsive-topbar-height:\s*64px/s);
  assert.match(approvedCss, /@media\s*\(max-width:\s*767px\)[\s\S]*\.ov2-topbar-context-rail\s*\{[^}]*display:\s*none/s);
});
