import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

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

  assert.match(source, /role="progressbar"/);
  assert.match(source, /aria-label=\{fundingLabel\}/);
  assert.match(source, /model\.raised/);
  assert.match(source, /model\.goal/);
  assert.match(source, /aria-valuemin=\{0\}/);
  assert.match(source, /aria-valuemax=\{100\}/);
  assert.match(source, /aria-valuenow=\{model\.progressPct\}/);
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
  assert.match(source, />\s*POOL TOTAL\s*</);
  assert.match(source, /contributorLabel/);
  assert.match(source, /statusLabel\.toUpperCase\(\)/);
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

  assert.match(source, /\bbuildLeaderboardRows\(votes, totalVotes\)/);
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
