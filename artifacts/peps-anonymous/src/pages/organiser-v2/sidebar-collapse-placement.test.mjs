import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = file => readFileSync(new URL(file, import.meta.url), "utf8");
const sidebar = read("./DashboardSidebar.tsx");
const css = read("./approved-workspace.css");

test("collapse control lives beside the wordmark instead of in sidebar utilities", () => {
  const brandStart = sidebar.indexOf('<div className="ov2-brand-block">');
  const utilitiesStart = sidebar.indexOf('<div className="ov2-sidebar-utilities">');
  const profileStart = sidebar.indexOf('<div className="ov2-profile-block">');
  const brandBlock = sidebar.slice(brandStart, utilitiesStart);
  const utilities = sidebar.slice(utilitiesStart, profileStart);

  assert.match(brandBlock, /ov2-brand-copy[\s\S]*ov2-sidebar-collapse/);
  assert.doesNotMatch(utilities, /ov2-sidebar-collapse/);
  assert.match(css, /\.ov2-brand-block > \.ov2-sidebar-collapse/);
  assert.match(css, /\.is-sidebar-collapsed \.ov2-brand-icon-rail[\s\S]*display:\s*none/);
});