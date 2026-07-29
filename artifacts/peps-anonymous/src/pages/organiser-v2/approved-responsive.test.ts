import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { WORKSPACE_GROUPS } from "./nav.ts";
import {
  WORKSPACE_PAGE_TREATMENT,
  workspaceUsesSharedHeader,
} from "./workspace-theme.ts";

const read = (file: string) => readFileSync(new URL(file, import.meta.url), "utf8");
const stylesheetUrl = new URL("./approved-tabs.css", import.meta.url);
const css = existsSync(stylesheetUrl) ? read("./approved-tabs.css") : "";
const entry = read("../GbOrganiserV2.tsx");
const liveOrganiser = read("../GbOrganiser.tsx");
const adminDispatch = read("../../components/AdminDispatch.tsx");
const atlasUi = read("./AtlasUi.tsx");
const packageJson = JSON.parse(read("../../../package.json")) as {
  scripts?: Record<string, string>;
};
const workspaceScreen = read("./WorkspaceScreen.tsx");
const APPROVED_WORKSPACE_TEST_COMMAND = "node --experimental-strip-types --test src/pages/organiser-v2/topbar-context.test.ts src/pages/organiser-v2/topbar-redesign-contract.test.ts src/pages/organiser-v2/approved-workspace.test.ts src/pages/organiser-v2/approved-selectors.test.ts src/pages/organiser-v2/typography-mobile-contract.test.ts src/pages/organiser-v2/organiser-mobile-contract.test.ts src/pages/organiser-v2/approved-responsive.test.ts";

function mediaBlock(maxWidth: number): string {
  const marker = `@media (max-width: ${maxWidth}px)`;
  const markerIndex = css.indexOf(marker);
  assert.notEqual(markerIndex, -1, `${marker} must exist`);
  const openingBrace = css.indexOf("{", markerIndex);
  let depth = 0;
  for (let index = openingBrace; index < css.length; index += 1) {
    if (css[index] === "{") depth += 1;
    if (css[index] === "}") depth -= 1;
    if (depth === 0) return css.slice(openingBrace + 1, index);
  }
  assert.fail(`${marker} must have a closing brace`);
}

test("all live destinations retain a treatment and deliberate header source", () => {
  const destinations = WORKSPACE_GROUPS.flatMap(group => group.tabs.map(tab => tab.id));
  assert.deepEqual(Object.keys(WORKSPACE_PAGE_TREATMENT).sort(), [...destinations].sort());
  assert.deepEqual(
    destinations.filter(page => !workspaceUsesSharedHeader(page)).sort(),
    ["members", "orders", "overview"],
  );
  assert.match(workspaceScreen, /workspaceUsesSharedHeader\(pageId\)/);
});

test("final routed-tab stylesheet loads after the shell and Orders layers", () => {
  assert.match(
    entry,
    /approved-orders\.css["'];\s*\nimport ["']\.\/organiser-v2\/approved-tabs\.css["'];/,
  );
});

test("every workflow treatment has a final scoped rule", () => {
  for (const treatment of [
    "dashboard",
    "board",
    "table",
    "composer",
    "logistics",
    "insight",
    "support",
    "configuration",
  ]) {
    assert.match(
      css,
      new RegExp(`\\.organiser-v2 \\.ov2-workspace-screen\\[data-treatment=["']${treatment}["']\\]\\s*\\{`),
    );
  }
});

test("every routed page has an explicit final treatment hook", () => {
  const destinations = WORKSPACE_GROUPS.flatMap(group => group.tabs.map(tab => tab.id));
  for (const destination of destinations) {
    assert.match(css, new RegExp(`data-page=["']${destination}["']`));
  }
});

test("responsive floor prevents viewport overflow and preserves touch targets", () => {
  assert.match(css, /overflow-wrap:\s*anywhere/);
  assert.match(css, /@media\s*\(max-width:\s*1023px\)/);
  assert.match(css, /@media\s*\(max-width:\s*767px\)/);
  assert.match(css, /@media\s*\(max-width:\s*420px\)/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /overflow-x:\s*auto/);
  assert.match(css, /max-width:\s*100%/);
});

test("horizontal scrollers preserve vertical gestures and focus remains high contrast", () => {
  const touchActions = [...css.matchAll(/touch-action:\s*([^;]+);/g)]
    .map(match => match[1].trim());
  assert.ok(touchActions.length > 0, "final layer must declare gesture-safe scrollers");
  assert.doesNotMatch(css, /touch-action:\s*pan-x\s*;/);
  for (const touchAction of touchActions) {
    assert.equal(touchAction, "pan-x pan-y pinch-zoom");
  }

  assert.match(
    css,
    /:focus-visible\s*\{[^}]*outline:\s*3px solid #2D6BCC\s*;[^}]*outline-offset:\s*2px\s*;/s,
  );
});

test("final routed-tab layer raises legacy text and weights to the approved floor", () => {
  for (const size of ["7px", "8px", "9px", "9.5px", "10px", "10.5px"]) {
    const escapedClass = `\\.text-\\\\\\[${size.replace(".", "\\\\\\.")}\\\\\\]`;
    assert.match(
      css,
      new RegExp(`${escapedClass}[^{]*\\{[^}]*font-size:\\s*var\\(--approved-type-label\\)\\s*!important[^}]*line-height:\\s*var\\(--approved-leading-label\\)\\s*!important`, "s"),
      `.text-[${size}] must use the approved label size and line height`,
    );
  }

  for (const legacyWeight of ["font-black", "font-extrabold"]) {
    assert.match(
      css,
      new RegExp(`\\.${legacyWeight}[^{]*\\{[^}]*font-weight:\\s*700\\s*!important`, "s"),
      `.${legacyWeight} must use the approved 700 weight`,
    );
  }

  const literalSizes = [...css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px\s*;/g)]
    .map(match => Number(match[1]));
  assert.equal(literalSizes.filter(size => size < 11).length, 0);

  const weights = [...css.matchAll(/font-weight:\s*(\d+)\s*(?:!important)?\s*;/g)]
    .map(match => Number(match[1]));
  for (const weight of weights) {
    assert.ok([400, 500, 600, 700].includes(weight), `unsupported weight ${weight}`);
  }
});

test("tablet metrics and support panes collapse without losing workflow structure", () => {
  const tablet = mediaBlock(1023);

  assert.match(
    tablet,
    /\.organiser-v2 \.ov2-workspace-screen\[data-treatment="insight"\] :where\(\.grid-cols-4\)[^{]*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s,
  );
  assert.match(
    tablet,
    /\.organiser-v2 \.ov2-workspace-screen\[data-treatment="support"\] > \.flex\.flex-col\s*\{[^}]*flex-direction:\s*column/s,
  );
  assert.match(
    tablet,
    /\.organiser-v2 \.ov2-workspace-screen\[data-treatment="support"\] > \.flex\.flex-col > \*\s*\{[^}]*width:\s*100%[^}]*max-width:\s*100%/s,
  );
});

test("the semantic data-table scroll wrapper is the only bounded table viewport", () => {
  assert.match(
    atlasUi,
    /className="atlas-data-table-shell"[\s\S]*?className="atlas-data-table-scroll"[\s\S]*?<table className="atlas-data-table"/,
  );
  assert.match(
    css,
    /\.organiser-v2 \.ov2-workspace-screen\[data-treatment="table"\] \.atlas-data-table-scroll\s*\{[^}]*max-height:[^;]+;[^}]*overflow:\s*auto\s*;[^}]*overscroll-behavior:\s*contain\s*;/s,
  );

  for (const [maxWidth, expectedHeight] of [[1023, "min(62dvh, 680px)"], [767, "min(58dvh, 600px)"]] as const) {
    const responsive = mediaBlock(maxWidth);
    assert.match(
      responsive,
      new RegExp(`\\.organiser-v2 \\.ov2-workspace-screen\\[data-treatment="table"\\] \\.atlas-data-table-scroll\\s*\\{[^}]*max-height:\\s*${expectedHeight.replace(/[()]/g, "\\$&").replace(" ", "\\s*")}[^}]*overflow:\\s*auto`, "s"),
    );
  }

  for (const outerSelector of ["orders-desktop-view", "atlas-orders-table-card", "atlas-table-workspace"]) {
    assert.doesNotMatch(
      css,
      new RegExp(`\\.${outerSelector}[^{]*\\{[^}]*(?:max-height|overflow(?:-x|-y)?|overscroll-behavior)`, "s"),
      `.${outerSelector} must remain outside the table viewport`,
    );
  }
});

test("mobile ranges, P and L metrics, and detail sheets keep their scoped layouts", () => {
  const mobile = mediaBlock(767);
  const compact = mediaBlock(420);

  assert.match(
    mobile,
    /\.organiser-v2 \.ov2-workspace-screen\[data-page\] input\[type="range"\]\s*\{[^}]*min-height:\s*44px/s,
  );
  assert.match(
    mobile,
    /\.organiser-v2 \.ov2-workspace-screen\[data-page="pnl"\] > \.space-y-5 > \.grid-cols-2[^{]*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s,
  );
  assert.match(
    compact,
    /\.organiser-v2 \.ov2-workspace-screen\[data-page="pnl"\] > \.space-y-5 > \.grid-cols-2[^{]*\{[^}]*grid-template-columns:\s*1fr/s,
  );

  assert.match(mobile, /\.organiser-v2 \.ov2-workspace-screen\[data-page\] \.ov2-todo-detail,/);
  assert.match(mobile, /\.organiser-v2 \.ov2-workspace-screen\[data-page\] \.atlas-drawer,/);
  assert.match(mobile, /\.organiser-v2 \.ov2-workspace-screen\[data-page\] \[role="dialog"\] > :where\(\.rounded-xl, \.rounded-2xl\)/);
  assert.doesNotMatch(mobile, /(?:^|\n)\s*\.organiser-v2 \.ov2-todo-detail,/);
  assert.doesNotMatch(mobile, /(?:^|\n)\s*\.organiser-v2 \.atlas-drawer,/);
  assert.doesNotMatch(mobile, /(?:^|\n)\s*\.organiser-v2 \[role="dialog"\]/);
});

test("mobile commands expose 44 by 44 targets without enlarging native checks", () => {
  const mobile = mediaBlock(767);

  assert.match(
    mobile,
    /\.organiser-v2 \.ov2-workspace-screen\[data-page\] :where\(button, a\[href\]\)\s*\{[^}]*min-width:\s*44px\s*;[^}]*min-height:\s*44px\s*;/s,
  );
  assert.match(
    mobile,
    /:where\(input\[type="checkbox"\], input\[type="radio"\]\)\s*\{[^}]*width:\s*18px\s*;[^}]*height:\s*18px\s*;/s,
  );
});

test("live Broadcast, Products, and Dispatch structures own their final selectors", () => {
  assert.match(liveOrganiser, /<SectionCard className="organiser-broadcast-composer">/);
  assert.match(liveOrganiser, /<div className="organiser-broadcast-audience">/);
  assert.match(liveOrganiser, /<div className="organiser-broadcast-message">/);
  assert.match(
    liveOrganiser,
    /export function ProductsTab[\s\S]*?return \(\s*<div className="space-y-4">/,
  );
  assert.match(
    adminDispatch,
    /function DispatchManagerInner\(\)[\s\S]*?<div className="max-w-5xl mx-auto p-4 space-y-4">[\s\S]*?<div className="flex flex-nowrap gap-1 p-1 rounded-xl bg-muted max-w-full overflow-x-auto">/,
  );

  assert.match(css, /\[data-page="broadcast"\] \.organiser-broadcast-composer\s*\{/);
  assert.match(css, /\[data-page="broadcast"\] \.organiser-broadcast-audience\s*\{/);
  assert.match(css, /\[data-page="broadcast"\] \.organiser-broadcast-message\s*\{/);
  assert.doesNotMatch(css, /\[data-treatment="composer"\] > \.space-y-4 > \.rounded-2xl/);
  assert.match(css, /\[data-page="products"\] > \.space-y-4 > \.flex\.items-center\.justify-between/);
  assert.match(css, /\[data-page="dispatch"\] > \.max-w-5xl > \.flex\.flex-nowrap/);

  const tablet = mediaBlock(1023);
  assert.match(
    tablet,
    /\.organiser-v2 \.ov2-workspace-screen\[data-page="broadcast"\] \.organiser-broadcast-composer\s*\{[^}]*display:\s*block/s,
  );
});

test("mobile grid collapse is limited to workflow treatments and Orders filters", () => {
  const mobile = mediaBlock(767);
  assert.doesNotMatch(
    mobile,
    /\.organiser-v2 \.ov2-workspace-screen\[data-page\] :where\([^{}]*\[class~="grid-cols-2"\]/s,
  );
  for (const treatment of ["composer", "logistics", "insight", "support", "configuration"]) {
    assert.match(
      mobile,
      new RegExp(`\\.organiser-v2 \\.ov2-workspace-screen\\[data-treatment="${treatment}"\\] :where\\(`),
    );
  }
  assert.match(
    mobile,
    /\.organiser-v2 \.ov2-workspace-screen\[data-page="orders"\] \.orders-filter-studio-grid/,
  );
});

test("final Peps surfaces include compact white rounded panels", () => {
  assert.match(
    css,
    /\.organiser-v2 \.ov2-workspace-screen\[data-page\] :where\([\s\S]*?\.rounded-lg\.bg-white,[\s\S]*?\)\s*\{[^}]*background:\s*#FFFFFF\s*!important/s,
  );
});

test("final layer preserves reduced motion and bounded data surfaces", () => {
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /overscroll-behavior-inline:\s*contain/);
  assert.match(css, /touch-action:\s*pan-x pan-y pinch-zoom/);
});

test("approved workspace script registers every routed responsive contract", () => {
  assert.equal(
    packageJson.scripts?.["test:approved-workspace"],
    APPROVED_WORKSPACE_TEST_COMMAND,
  );
});
