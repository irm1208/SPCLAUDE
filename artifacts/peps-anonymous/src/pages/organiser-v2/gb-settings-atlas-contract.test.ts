import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (file: string) => readFileSync(new URL(file, import.meta.url), "utf8");

test("GB Settings uses the five-section Atlas Clear control navigator", () => {
  const tab = source("./GbSettingsTab.tsx");

  assert.match(tab, /import "\.\/gb-settings-atlas\.css"/);
  assert.match(tab, /type SettingsSectionId = "identity" \| "lifecycle" \| "access" \| "cards" \| "danger"/);
  for (const label of ["Identity", "Lifecycle", "Access & fee", "Member cards", "Danger zone"]) {
    assert.match(tab, new RegExp(label));
  }
  assert.match(tab, /useState<SettingsSectionId>\("identity"\)/);
  assert.match(tab, /className="gb-settings-atlas"/);
  assert.match(tab, /aria-label="GB settings sections"/);
  assert.match(tab, /aria-current=\{isActive \? "page" : undefined\}/);
  assert.match(tab, /data-section-id=\{section\.id\}/);
});

test("Atlas metrics use live settings and retain production API behavior", () => {
  const tab = source("./GbSettingsTab.tsx");

  assert.match(tab, /settings\.inviteOnly/);
  assert.match(tab, /settings\.closeDate/);
  assert.match(tab, /settings\.maxMembers/);
  assert.doesNotMatch(tab, /42 of 60|WPR-25|31 Jul/);
  assert.match(tab, /organiserApi\.groupBuy/);
  assert.match(tab, /organiserApi\.updateGroupBuy/);
  assert.match(tab, /organiserApi\.archiveGroupBuy/);
  assert.match(tab, /invalidateQueries\(\{ queryKey: \["organiser", "group-buys"\] \}\)/);
  assert.doesNotMatch(tab, /onCancel|dirtySections|Save & continue/);
});

test("Atlas controls expose labels, live feedback, and named icon actions", () => {
  const tab = source("./GbSettingsTab.tsx");

  for (const id of [
    "gb-settings-name",
    "gb-settings-description",
    "gb-settings-currency",
    "gb-settings-close-date",
    "gb-settings-member-limit",
    "gb-settings-entry-fee",
    "gb-settings-fee-label",
  ]) {
    assert.match(tab, new RegExp(`htmlFor="${id}"`));
    assert.match(tab, new RegExp(`id="${id}"`));
  }
  assert.match(tab, /aria-live="polite"/);
  assert.match(tab, /aria-label=\{`Remove \$\{card\.title/);
  assert.match(tab, /role="switch"/);
});

test("Atlas stylesheet is scoped, responsive, focus-visible, and motion-safe", () => {
  const css = source("./gb-settings-atlas.css");

  assert.match(css, /\.gb-settings-atlas\s*\{/);
  assert.match(css, /grid-template-columns:\s*minmax\(210px, 232px\) minmax\(0, 1fr\)/);
  assert.match(css, /\.gb-settings-atlas :focus-visible/);
  assert.match(css, /outline:\s*3px solid/);
  assert.match(css, /@media \(max-width: 900px\)/);
  assert.match(css, /@media \(max-width: 600px\)/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /overflow-x:\s*auto/);
});
