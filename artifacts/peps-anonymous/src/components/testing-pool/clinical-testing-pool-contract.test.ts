import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

function readSibling(fileName: string): string {
  return readFileSync(new URL(fileName, import.meta.url), "utf8");
}

test("ClinicalPoolGauge keeps its typed, presentation-only public contract", () => {
  const source = readSibling("ClinicalPoolGauge.tsx");

  assert.match(source, /export interface ClinicalPoolGaugeProps\s*\{/);
  for (const prop of [
    /raised:\s*number;/,
    /milestones:\s*TestingMilestone\[\];/,
    /contributorCount:\s*number;/,
    /statusLabel:\s*string;/,
    /active\?:\s*boolean;/,
    /compact\?:\s*boolean;/,
    /currency\?:\s*string;/,
  ]) {
    assert.match(source, prop);
  }

  assert.match(source, /\bbuildGaugeModel\(raised, milestones\)/);
  assert.match(source, /\bdescribeGaugeArc\(/);
  assert.match(source, /\buseReducedMotion\(\)/);
  assert.doesNotMatch(
    source,
    /\b(?:fetch|axios|useQuery|useMutation|mutate|mutateAsync)\b/,
  );
});

test("ClinicalPoolGauge exposes accessible progress and complete SVG telemetry", () => {
  const source = readSibling("ClinicalPoolGauge.tsx");

  assert.match(source, /\buseId\(\)/);
  assert.match(source, /className="clinical-pool-gauge__progress"/);
  assert.match(source, /role="progressbar"/);
  assert.match(source, /aria-label=\{fundingLabel\}/);
  assert.match(source, /aria-describedby=\{descriptionId\}/);
  assert.match(source, /model\.raised/);
  assert.match(source, /model\.goal/);
  assert.match(source, /aria-valuemin=\{hasGoal \? 0 : undefined\}/);
  assert.match(source, /aria-valuemax=\{hasGoal \? 100 : undefined\}/);
  assert.match(source, /aria-valuenow=\{hasGoal \? model\.progressPct : undefined\}/);
  assert.match(source, /aria-valuetext=/);
  assert.match(source, /viewBox="0 0 420 380"/);
  assert.match(source, /model\.segments\.map/);
  assert.match(source, /describeGaugeArc\(segment\.startAngle, segment\.filledEndAngle\)/);
  assert.match(source, /model\.thresholds\.map/);

  for (const hook of [
    "clinical-pool-gauge__track",
    "clinical-pool-gauge__fill",
    "clinical-pool-gauge__guide",
    "clinical-pool-gauge__tick",
    "clinical-pool-gauge__marker",
    "clinical-pool-gauge__threshold-label",
    "clinical-pool-gauge__threshold-name",
    "clinical-pool-gauge__check",
    "clinical-pool-gauge__endpoint",
    "clinical-pool-gauge__eyebrow",
    "clinical-pool-gauge__total",
    "clinical-pool-gauge__contributors",
    "clinical-pool-gauge__status",
    "clinical-testing__sr-only",
  ]) {
    assert.ok(source.includes(hook), `missing gauge hook ${hook}`);
  }

  assert.match(source, /textAnchor=\{threshold\.textAnchor\}/);
  assert.match(source, /threshold\.state === "unlocked"/);
  assert.match(source, /active && model\.goal > 0/);
  assert.match(source, /\{hasGoal \? "POOL TOTAL" : "FUNDING TARGET"\}/);
  assert.match(source, /contributorLabel/);
  assert.match(source, /const visualStatusLabel = truncateSvgLabel\(/);
});

test("ClinicalTestingPoolUi exports typed clinical command primitives", () => {
  const source = readSibling("ClinicalTestingPoolUi.tsx");

  for (const component of [
    "ClinicalPanel",
    "RoundMetricStrip",
    "RoundStatusRail",
    "ThresholdStepGrid",
    "VoteLeaderboard",
  ]) {
    assert.match(source, new RegExp(`export function ${component}\\b`));
  }

  assert.match(source, /export interface ClinicalPanelProps\s*\{/);
  assert.match(source, /metrics\s*}:\s*\{\s*metrics:\s*RoundMetric\[\]/);
  assert.match(source, /status\s*}:\s*\{\s*status:\s*string\s*\}/);
  assert.match(source, /export interface ThresholdStepGridProps\s*\{/);
  assert.match(source, /export interface VoteLeaderboardProps\s*\{/);
  assert.match(source, /meta != null/);
});

test("status, threshold, and leaderboard primitives expose their visible states", () => {
  const source = readSibling("ClinicalTestingPoolUi.tsx");

  for (const stage of [
    "Pool opened",
    "Fund & vote",
    "Sent to lab",
    "Results published",
  ]) {
    assert.ok(source.includes(stage), `missing lifecycle stage ${stage}`);
  }
  assert.match(source, /\bgetRoundStageIndex\(status\)/);
  assert.match(source, /aria-current=\{state === "active" \? "step" : undefined\}/);

  assert.match(source, /\bbuildGaugeModel\(raised, milestones\)/);
  assert.match(source, /"Unlocked"/);
  assert.match(source, /"Locked"/);
  assert.match(source, /threshold\.remaining/);
  assert.match(source, /target \$\{money\(threshold\.amount, currency\)\}/);
  assert.match(source, /key=\{`\$\{threshold\.label\}-\$\{threshold\.amount\}-\$\{index\}`\}/);

  assert.match(source, /\bbuildLeaderboardRows\(votes, totalVotes\)/);
  assert.match(source, /<ol\s+className="clinical-testing__leaderboard"/);
  assert.match(source, /<li key=\{`\$\{row\.peptideName\}-\$\{row\.rank\}`\}>/);
  assert.match(source, /\{visualPercentage\}%/);
  for (const hook of [
    "row.rank",
    "row.peptideName",
    "batches[row.peptideName]",
    "clinical-testing__vote-bar",
    "row.totalVotes",
    "row.percentage",
  ]) {
    assert.ok(source.includes(hook), `missing leaderboard hook ${hook}`);
  }
});

test("clinical testing pool styles are Peps-branded and component-scoped", () => {
  const source = readSibling("clinical-testing-pool.css");

  for (const token of [
    "#1B3A7A",
    "#2D6BCC",
    "#1B3164",
    "#0F1F38",
    "#F8FAFC",
    "#E9A020",
    "#64748B",
    "#15803D",
    "#92400E",
  ]) {
    assert.ok(source.includes(token), `missing Peps brand token ${token}`);
  }

  for (const selector of [
    ".clinical-testing",
    ".clinical-testing__member-grid",
    ".clinical-testing__organizer-grid",
    ".clinical-testing__metrics",
    ".clinical-panel",
    ".clinical-pool-gauge",
    ".clinical-pool-gauge__track",
    ".clinical-pool-gauge__fill",
    ".clinical-pool-gauge__tick",
    ".clinical-pool-gauge__marker",
    ".clinical-pool-gauge__guide",
    ".clinical-pool-gauge__endpoint",
    ".clinical-testing__status-rail",
    ".clinical-testing__threshold-grid",
    ".clinical-testing__leaderboard",
  ]) {
    assert.ok(source.includes(selector), `missing scoped selector ${selector}`);
  }

  assert.doesNotMatch(source, /(?:^|[{}])\s*(?:html\b|body\b|:root\b|\*\s*(?:,|\{))[^{}]*\{/);
  assert.doesNotMatch(
    source,
    /(?:^|[{}])\s*(?:button|a|input|select|textarea|svg|path|section|article|ol|li|h[1-6])(?=[\s,.:#\[{])[^{}]*\{/,
  );
  assert.match(source, /\.clinical-pool-gauge__progress\s*>\s*svg\s*\{/);
  assert.doesNotMatch(source, /\.clinical-pool-gauge\s+svg\s*\{/);
  assert.match(
    source,
    /\.clinical-pool-gauge__check\s*\{[^}]*width:\s*14px;[^}]*height:\s*14px;/s,
  );
  assert.match(
    source,
    /\.clinical-testing__leaderboard\s*\{[^}]*list-style:\s*none;/s,
  );
  assert.match(source, /\.clinical-testing__leaderboard li\s*\{/);
  assert.doesNotMatch(source, /\.clinical-testing__leaderboard article/);
});

test("clinical testing pool styles own responsive, focus, target, and motion behavior", () => {
  const source = readSibling("clinical-testing-pool.css");

  assert.match(source, /:focus-visible/);
  assert.match(source, /@media\s*\(max-width:\s*1023px\)/);
  assert.match(source, /@media\s*\(max-width:\s*767px\)/);
  assert.match(source, /min-height:\s*44px/);
  assert.match(source, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(source, /animation-duration:\s*0\.01ms\s*!important/);
  assert.match(source, /transition-duration:\s*0\.01ms\s*!important/);
});

test("SSR markup preserves progress descriptions, bounded labels, and list semantics", async t => {
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { createServer } = await import("vite");
  const server = await createServer({
    root: fileURLToPath(new URL("../../../", import.meta.url)),
    configFile: false,
    esbuild: { jsx: "automatic" },
    logLevel: "silent",
    server: { middlewareMode: true },
    appType: "custom",
  });
  t.after(() => server.close());

  const gaugeModule = await server.ssrLoadModule(
    "/src/components/testing-pool/ClinicalPoolGauge.tsx",
  );
  const uiModule = await server.ssrLoadModule(
    "/src/components/testing-pool/ClinicalTestingPoolUi.tsx",
  );
  const longLabel = "Independent identity purity sterility endotoxin confirmation panel";
  const milestones = [
    { label: longLabel, amount: 100, type: "test" },
    { label: "Secondary verification", amount: 200, type: "test" },
    { label: "Additional vials", amount: 300, type: "vial", vialNum: 10 },
  ];
  const gaugeMarkup = renderToStaticMarkup(createElement(
    gaugeModule.ClinicalPoolGauge,
    {
      raised: 150,
      milestones,
      contributorCount: 23,
      statusLabel: "Funding and voting open",
      active: true,
    },
  ));

  const descriptionId = gaugeMarkup.match(/aria-describedby="([^"]+)"/)?.[1];
  assert.ok(descriptionId, "progressbar must reference a description");
  assert.ok(gaugeMarkup.includes(`id="${descriptionId}"`));
  const progressMarkup = gaugeMarkup.match(
    /<div class="clinical-pool-gauge__progress"[\s\S]*?<\/div>/,
  )?.[0];
  assert.ok(progressMarkup, "missing dedicated progress element");
  assert.match(progressMarkup, /role="progressbar"/);
  assert.doesNotMatch(progressMarkup, /clinical-testing__sr-only/);
  assert.match(
    progressMarkup,
    /aria-valuetext="\$150 of \$300 funded; 50% funded; 23 contributors; Funding and voting open"/,
  );
  assert.ok(gaugeMarkup.includes(longLabel), "full threshold label must remain accessible");

  const visualLabels = [...gaugeMarkup.matchAll(
    /<text class="clinical-pool-gauge__threshold-name" x="([^"]+)"[^>]*>([^<]*)<\/text>/g,
  )];
  assert.equal(visualLabels.length, milestones.length);
  for (const [, x] of visualLabels) {
    assert.ok(Number(x) >= 116 && Number(x) <= 304, `label x ${x} is outside safe bounds`);
  }
  assert.ok(
    visualLabels.some(([, , label]) => label.endsWith("…")),
    "a long visual label must be truncated",
  );
  assert.ok(visualLabels.every(([, , label]) => label !== longLabel));

  const pendingStatus = "Configuration pending while laboratory scope and funding target are reviewed";
  const emptyGaugeMarkup = renderToStaticMarkup(createElement(
    gaugeModule.ClinicalPoolGauge,
    {
      raised: 0,
      milestones: [],
      contributorCount: 0,
      statusLabel: pendingStatus,
    },
  ));
  const emptyProgressMarkup = emptyGaugeMarkup.match(
    /<div class="clinical-pool-gauge__progress"[\s\S]*?<\/div>/,
  )?.[0];
  assert.ok(emptyProgressMarkup, "missing zero-target progress element");
  assert.match(
    emptyProgressMarkup,
    /aria-label="Testing pool funding: target not configured"/,
  );
  assert.match(
    emptyProgressMarkup,
    /aria-valuetext="Testing pool target not configured; \$0 raised; 0 contributors; Configuration pending while laboratory scope and funding target are reviewed"/,
  );
  assert.doesNotMatch(emptyProgressMarkup, /aria-value(?:min|max|now)=/);
  assert.match(emptyGaugeMarkup, />TARGET PENDING<\/text>/);
  assert.match(emptyGaugeMarkup, /TARGET NOT CONFIGURED/);
  assert.doesNotMatch(emptyGaugeMarkup, /0% FUNDED/);
  assert.ok(emptyGaugeMarkup.includes(pendingStatus));
  const pendingVisualStatus = emptyGaugeMarkup.match(
    /<text class="clinical-pool-gauge__status"[^>]*>([^<]*)<\/text>/,
  )?.[1];
  assert.ok(pendingVisualStatus?.includes("…"));
  assert.ok(!pendingVisualStatus?.includes(pendingStatus));

  const leaderboardMarkup = renderToStaticMarkup(createElement(
    uiModule.VoteLeaderboard,
    {
      votes: [{ peptideName: "BPC-157 5mg", totalVotes: 3, vials: {} }],
      totalVotes: 2,
    },
  ));
  assert.match(
    leaderboardMarkup,
    /^<ol class="clinical-testing__leaderboard" aria-label="Testing vote leaderboard">/,
  );
  assert.match(leaderboardMarkup, /<li>/);
  assert.doesNotMatch(leaderboardMarkup, /<article>/);
  assert.match(leaderboardMarkup, /aria-valuenow="100"/);
  assert.match(leaderboardMarkup, />3 votes · 100%<\/span>/);

  const panelMarkup = renderToStaticMarkup(createElement(
    uiModule.ClinicalPanel,
    { title: "Round health", meta: "", children: "Ready" },
  ));
  assert.match(panelMarkup, /<div class="clinical-panel__meta"><\/div>/);
});
