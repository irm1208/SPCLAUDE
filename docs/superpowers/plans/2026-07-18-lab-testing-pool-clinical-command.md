# Lab Testing Pool Clinical Command Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve five paired Lab Testing Pool concepts in the mockup sandbox and implement the selected Clinical Command design in the Organizer v2 and member-facing production pages without backend changes.

**Architecture:** A pure testing-pool model derives safe SVG geometry, threshold state, lifecycle state, and leaderboard percentages. Shared presentational React components consume those display models, while `TestingGroupsTab.tsx` and `GbTestingPool.tsx` keep ownership of their existing queries, mutations, eligibility, payments, voting, and result flows. The sandbox gallery is self-contained and uses representative local data.

**Tech Stack:** React 19, TypeScript, Vite, Framer Motion, TanStack React Query, Wouter, Lucide React, CSS, Node's built-in test runner.

---

## Working Constraints

- Work in the current workspace because the target Organizer v2 files contain user-owned in-progress changes that are not present in `HEAD`; a fresh worktree would silently omit those dependencies.
- Stage and commit only files listed in the active task.
- Do not edit `artifacts/mockup-sandbox/src/.generated/mockup-components.ts`. It is generated and currently has an unrelated unmerged conflict.
- Do not change API routes, database schema, authentication, or request payloads.
- The organizer will read the existing public `GET /api/group-buys/:gbId/testing` snapshot for totals, milestones, and votes. It continues using the authenticated organizer endpoint for configuration and saving.
- Do not add organizer contribution-verification buttons. The existing organizer endpoint exposes contribution counts, not individual review records or a verification mutation.

## File Map

### Create

- `artifacts/peps-anonymous/src/components/testing-pool/testing-pool-model.ts` — safe gauge geometry and display derivations.
- `artifacts/peps-anonymous/src/components/testing-pool/testing-pool-model.test.ts` — pure model unit tests.
- `artifacts/peps-anonymous/src/components/testing-pool/ClinicalPoolGauge.tsx` — shared responsive animated SVG gauge.
- `artifacts/peps-anonymous/src/components/testing-pool/ClinicalTestingPoolUi.tsx` — metric strip, lifecycle rail, threshold grid, leaderboard, and panel primitives.
- `artifacts/peps-anonymous/src/components/testing-pool/clinical-testing-pool.css` — shared Clinical Command styling and breakpoints.
- `artifacts/peps-anonymous/src/components/testing-pool/clinical-testing-pool-contract.test.ts` — shared, organizer, member, accessibility, and responsive source contracts.
- `artifacts/mockup-sandbox/src/components/mockups/lab-testing-pool-concepts/LabTestingPoolConcepts.tsx` — five paired interactive concepts.
- `artifacts/mockup-sandbox/src/components/mockups/lab-testing-pool-concepts/_lab-testing-pool-concepts.css` — fully scoped gallery styles.
- `artifacts/mockup-sandbox/src/components/mockups/lab-testing-pool-concepts/lab-testing-pool-concepts.test.ts` — gallery concept and accessibility contract.

### Modify

- `artifacts/peps-anonymous/src/pages/organiser-v2/api/organiser-api.ts` — add typed access to the existing testing snapshot endpoint.
- `artifacts/peps-anonymous/src/pages/organiser-v2/api/organiser-api.test.ts` — prove snapshot routing and credentials.
- `artifacts/peps-anonymous/src/pages/organiser-v2/TestingGroupsTab.tsx` — Clinical Command organizer adapter and composition.
- `artifacts/peps-anonymous/src/pages/GbTestingPool.tsx` — Clinical Command member adapter and preserved workflows.
- `artifacts/peps-anonymous/package.json` — add one focused testing-pool test command.

## Task 1: Build the Pure Testing-Pool Display Model

**Files:**
- Create: `artifacts/peps-anonymous/src/components/testing-pool/testing-pool-model.test.ts`
- Create: `artifacts/peps-anonymous/src/components/testing-pool/testing-pool-model.ts`

- [ ] **Step 1: Write the failing model tests**

Create `testing-pool-model.test.ts` with exact numeric and edge-case expectations:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGaugeModel,
  buildLeaderboardRows,
  getRoundStageIndex,
} from "./testing-pool-model.ts";

const milestones = [
  { label: "HPLC identity & purity", amount: 245, type: "test" as const },
  { label: "Sterility + endotoxin", amount: 360, type: "test" as const },
  { label: "10 additional vials", amount: 480, type: "vial" as const, vialNum: 10 },
];

test("buildGaugeModel derives cumulative segments, labels, and a safe endpoint", () => {
  const model = buildGaugeModel(318, milestones);

  assert.equal(model.goal, 480);
  assert.equal(model.progressPct, 66.25);
  assert.equal(model.segments.length, 3);
  assert.deepEqual(
    model.segments.map(segment => [segment.startAmount, segment.endAmount]),
    [[0, 245], [245, 360], [360, 480]],
  );
  assert.equal(model.thresholds[0].state, "unlocked");
  assert.equal(model.thresholds[1].state, "locked");
  assert.equal(model.thresholds[1].remaining, 42);
  assert.ok(Number.isFinite(model.endpoint.x));
  assert.ok(Number.isFinite(model.endpoint.y));
});

test("buildGaugeModel returns zero-safe geometry for missing or invalid milestones", () => {
  const model = buildGaugeModel(Number.NaN, [
    { label: "Invalid", amount: Number.NaN, type: "test" },
    { label: "Negative", amount: -20, type: "test" },
  ]);

  assert.equal(model.raised, 0);
  assert.equal(model.goal, 0);
  assert.equal(model.progressPct, 0);
  assert.equal(model.segments.length, 0);
  assert.equal(model.thresholds.length, 0);
  assert.match(model.trackPath, /^M /);
});

test("buildLeaderboardRows calculates rank and percentage against cast ballots", () => {
  const rows = buildLeaderboardRows([
    { peptideName: "BPC-157 5mg", totalVotes: 9, vials: {} },
    { peptideName: "TB-500 10mg", totalVotes: 6, vials: {} },
    { peptideName: "Semaglutide 5mg", totalVotes: 3, vials: {} },
  ], 18);

  assert.deepEqual(rows.map(row => [row.rank, row.totalVotes, row.percentage]), [
    [1, 9, 50],
    [2, 6, 33.3],
    [3, 3, 16.7],
  ]);
});

test("getRoundStageIndex maps every production status and defaults safely", () => {
  assert.equal(getRoundStageIndex("active"), 0);
  assert.equal(getRoundStageIndex("closed"), 1);
  assert.equal(getRoundStageIndex("sent_to_lab"), 2);
  assert.equal(getRoundStageIndex("results_received"), 3);
  assert.equal(getRoundStageIndex("unexpected"), 0);
});
```

- [ ] **Step 2: Run the test and confirm the module is missing**

Run:

```bash
cd artifacts/peps-anonymous
node --experimental-strip-types --test src/components/testing-pool/testing-pool-model.test.ts
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `testing-pool-model.ts`.

- [ ] **Step 3: Implement the model and SVG geometry**

Create `testing-pool-model.ts` with these complete exports:

```ts
export type RoundStatus = "active" | "closed" | "sent_to_lab" | "results_received";

export interface TestingMilestone {
  label: string;
  amount: number;
  type: "test" | "vial";
  vialNum?: number;
}

export interface TestingVoteSummary {
  peptideName: string;
  totalVotes: number;
  vials: Record<string, number>;
}

export interface GaugePoint { x: number; y: number }

export interface GaugeSegmentModel {
  startAmount: number;
  endAmount: number;
  startAngle: number;
  endAngle: number;
  filledEndAngle: number;
}

export interface GaugeThresholdModel {
  label: string;
  amount: number;
  remaining: number;
  state: "unlocked" | "locked";
  angle: number;
  marker: GaugePoint;
  tickStart: GaugePoint;
  tickEnd: GaugePoint;
  labelPoint: GaugePoint;
  textAnchor: "start" | "middle" | "end";
}

export interface GaugeModel {
  raised: number;
  goal: number;
  progressPct: number;
  trackPath: string;
  segments: GaugeSegmentModel[];
  thresholds: GaugeThresholdModel[];
  endpoint: GaugePoint;
}

export interface LeaderboardRow {
  rank: number;
  peptideName: string;
  totalVotes: number;
  percentage: number;
  vials: Record<string, number>;
}

export const GAUGE = {
  centerX: 210,
  centerY: 190,
  radius: 126,
  startAngle: 135,
  sweepAngle: 270,
} as const;

function finiteNonNegative(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function polarPoint(angle: number, radius = GAUGE.radius): GaugePoint {
  const radians = ((angle - 90) * Math.PI) / 180;
  return {
    x: GAUGE.centerX + radius * Math.cos(radians),
    y: GAUGE.centerY + radius * Math.sin(radians),
  };
}

export function describeGaugeArc(startAngle: number, endAngle: number): string {
  const start = polarPoint(startAngle);
  const end = polarPoint(endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${GAUGE.radius} ${GAUGE.radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

export function buildGaugeModel(raisedInput: number, input: TestingMilestone[]): GaugeModel {
  const milestones = input
    .map(milestone => ({ ...milestone, amount: finiteNonNegative(milestone.amount) }))
    .filter(milestone => milestone.amount > 0)
    .sort((left, right) => left.amount - right.amount);
  const raised = finiteNonNegative(raisedInput);
  const goal = milestones.at(-1)?.amount ?? 0;
  const ratio = goal > 0 ? Math.min(raised / goal, 1) : 0;
  const progressPct = Math.round(ratio * 10000) / 100;
  const endpointAngle = GAUGE.startAngle + ratio * GAUGE.sweepAngle;
  let previousAmount = 0;

  const segments = milestones.map(milestone => {
    const startAmount = previousAmount;
    const endAmount = milestone.amount;
    previousAmount = endAmount;
    const startAngle = GAUGE.startAngle + (startAmount / goal) * GAUGE.sweepAngle;
    const endAngle = GAUGE.startAngle + (endAmount / goal) * GAUGE.sweepAngle;
    const filledRatio = endAmount === startAmount
      ? 0
      : Math.min(Math.max((raised - startAmount) / (endAmount - startAmount), 0), 1);
    return {
      startAmount,
      endAmount,
      startAngle,
      endAngle,
      filledEndAngle: startAngle + (endAngle - startAngle) * filledRatio,
    };
  });

  const thresholds = milestones.map(milestone => {
    const angle = GAUGE.startAngle + (milestone.amount / goal) * GAUGE.sweepAngle;
    const marker = polarPoint(angle);
    const labelPoint = polarPoint(angle, GAUGE.radius + 44);
    const cosine = Math.cos(((angle - 90) * Math.PI) / 180);
    return {
      label: milestone.label,
      amount: milestone.amount,
      remaining: Math.max(milestone.amount - raised, 0),
      state: raised >= milestone.amount ? "unlocked" as const : "locked" as const,
      angle,
      marker,
      tickStart: polarPoint(angle, GAUGE.radius - 12),
      tickEnd: polarPoint(angle, GAUGE.radius + 12),
      labelPoint,
      textAnchor: cosine > 0.22 ? "start" as const : cosine < -0.22 ? "end" as const : "middle" as const,
    };
  });

  return {
    raised,
    goal,
    progressPct,
    trackPath: describeGaugeArc(GAUGE.startAngle, GAUGE.startAngle + GAUGE.sweepAngle),
    segments,
    thresholds,
    endpoint: polarPoint(endpointAngle),
  };
}

export function buildLeaderboardRows(votes: TestingVoteSummary[], totalVotes: number): LeaderboardRow[] {
  const denominator = finiteNonNegative(totalVotes);
  return [...votes]
    .sort((left, right) => right.totalVotes - left.totalVotes)
    .map((vote, index) => ({
      rank: index + 1,
      peptideName: vote.peptideName,
      totalVotes: vote.totalVotes,
      percentage: denominator > 0 ? Math.round((vote.totalVotes / denominator) * 1000) / 10 : 0,
      vials: vote.vials,
    }));
}

export function getRoundStageIndex(status: string): number {
  return ({ active: 0, closed: 1, sent_to_lab: 2, results_received: 3 } as Record<string, number>)[status] ?? 0;
}
```

- [ ] **Step 4: Run the model test and confirm it passes**

Run the command from Step 2.

Expected: 4 tests PASS.

- [ ] **Step 5: Commit the model slice**

```bash
git add artifacts/peps-anonymous/src/components/testing-pool/testing-pool-model.ts artifacts/peps-anonymous/src/components/testing-pool/testing-pool-model.test.ts
git commit -m "feat: add testing pool display model"
```

## Task 2: Build the Shared Clinical Command UI

**Files:**
- Create: `artifacts/peps-anonymous/src/components/testing-pool/ClinicalPoolGauge.tsx`
- Create: `artifacts/peps-anonymous/src/components/testing-pool/ClinicalTestingPoolUi.tsx`
- Create: `artifacts/peps-anonymous/src/components/testing-pool/clinical-testing-pool.css`
- Create: `artifacts/peps-anonymous/src/components/testing-pool/clinical-testing-pool-contract.test.ts`
- Modify: `artifacts/peps-anonymous/package.json`

- [ ] **Step 1: Write a failing source and CSS contract**

Create `clinical-testing-pool-contract.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file: string) => readFileSync(new URL(file, import.meta.url), "utf8");

test("shared Clinical Command UI exposes gauge, thresholds, stages, and leaderboard", () => {
  const gauge = read("./ClinicalPoolGauge.tsx");
  const ui = read("./ClinicalTestingPoolUi.tsx");

  assert.match(gauge, /role="progressbar"/);
  assert.match(gauge, /aria-valuenow=\{model\.progressPct\}/);
  assert.match(gauge, /clinical-pool-gauge__threshold-label/);
  assert.match(gauge, /useReducedMotion/);
  for (const name of ["RoundMetricStrip", "RoundStatusRail", "ThresholdStepGrid", "VoteLeaderboard", "ClinicalPanel"]) {
    assert.match(ui, new RegExp(`export function ${name}`));
  }
});

test("Clinical Command CSS owns responsive, focus, and reduced-motion behavior", () => {
  const css = read("./clinical-testing-pool.css");
  assert.match(css, /\.clinical-testing/);
  assert.match(css, /\.clinical-testing__member-grid/);
  assert.match(css, /\.clinical-testing__organizer-grid/);
  assert.match(css, /@media\s*\(max-width:\s*1023px\)/);
  assert.match(css, /@media\s*\(max-width:\s*767px\)/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /min-height:\s*44px/);
});
```

- [ ] **Step 2: Run the contract and confirm missing files fail**

```bash
cd artifacts/peps-anonymous
node --experimental-strip-types --test src/components/testing-pool/clinical-testing-pool-contract.test.ts
```

Expected: FAIL with `ENOENT` for `ClinicalPoolGauge.tsx`.

- [ ] **Step 3: Implement the shared gauge**

Create `ClinicalPoolGauge.tsx`. The implementation must:

```tsx
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import {
  buildGaugeModel,
  describeGaugeArc,
  type TestingMilestone,
} from "./testing-pool-model";
import "./clinical-testing-pool.css";

const SEGMENT_COLORS = ["#2D6BCC", "#6E91D0", "#E9A020", "#16A34A"];

export interface ClinicalPoolGaugeProps {
  raised: number;
  milestones: TestingMilestone[];
  contributorCount: number;
  statusLabel: string;
  active?: boolean;
  compact?: boolean;
  currency?: string;
}

function money(value: number, currency: string): string {
  return `${currency}${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function ClinicalPoolGauge({
  raised,
  milestones,
  contributorCount,
  statusLabel,
  active = false,
  compact = false,
  currency = "$",
}: ClinicalPoolGaugeProps) {
  const reduceMotion = useReducedMotion();
  const model = buildGaugeModel(raised, milestones);

  return (
    <div
      className="clinical-pool-gauge"
      data-compact={compact || undefined}
      role="progressbar"
      aria-label={`Testing pool funding: ${money(model.raised, currency)} of ${money(model.goal, currency)}`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={model.progressPct}
    >
      <svg viewBox="0 0 420 380" aria-hidden="true">
        <path className="clinical-pool-gauge__track" d={model.trackPath} />
        {model.segments.map((segment, index) => segment.filledEndAngle > segment.startAngle ? (
          <motion.path
            key={`${segment.endAmount}-${index}`}
            className="clinical-pool-gauge__fill"
            d={describeGaugeArc(segment.startAngle, segment.filledEndAngle)}
            stroke={SEGMENT_COLORS[index % SEGMENT_COLORS.length]}
            initial={reduceMotion ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.9, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
          />
        ) : null)}
        {model.thresholds.map((threshold, index) => (
          <g key={`${threshold.label}-${threshold.amount}`}>
            <line className="clinical-pool-gauge__tick" x1={threshold.tickStart.x} y1={threshold.tickStart.y} x2={threshold.tickEnd.x} y2={threshold.tickEnd.y} />
            <circle className="clinical-pool-gauge__marker" data-state={threshold.state} cx={threshold.marker.x} cy={threshold.marker.y} r="5" />
            <text className="clinical-pool-gauge__threshold-label" x={threshold.labelPoint.x} y={threshold.labelPoint.y} textAnchor={threshold.textAnchor}>
              {money(threshold.amount, currency)}
            </text>
            <text className="clinical-pool-gauge__threshold-name" x={threshold.labelPoint.x} y={threshold.labelPoint.y + 13} textAnchor={threshold.textAnchor}>
              {threshold.label}
            </text>
            {threshold.state === "unlocked" ? <CheckCircle2 className="clinical-pool-gauge__check" x={threshold.labelPoint.x - 7} y={threshold.labelPoint.y + 18} width="14" height="14" /> : null}
            {index === model.thresholds.length - 1 ? null : <line className="clinical-pool-gauge__guide" x1={threshold.tickEnd.x} y1={threshold.tickEnd.y} x2={threshold.labelPoint.x} y2={threshold.labelPoint.y - 5} />}
          </g>
        ))}
        {active && model.goal > 0 ? <circle className="clinical-pool-gauge__endpoint" data-animated={!reduceMotion || undefined} cx={model.endpoint.x} cy={model.endpoint.y} r="7" /> : null}
        <text className="clinical-pool-gauge__eyebrow" x="210" y="162" textAnchor="middle">POOL TOTAL</text>
        <text className="clinical-pool-gauge__total" x="210" y="202" textAnchor="middle">{money(model.raised, currency)}</text>
        <text className="clinical-pool-gauge__contributors" x="210" y="226" textAnchor="middle">{contributorCount} CONTRIBUTORS</text>
        <text className="clinical-pool-gauge__status" x="210" y="245" textAnchor="middle">{statusLabel.toUpperCase()} · {model.progressPct}% FUNDED</text>
      </svg>
      <span className="clinical-testing__sr-only">{money(model.raised, currency)} raised toward {money(model.goal, currency)} from {contributorCount} contributors. {statusLabel}.</span>
    </div>
  );
}
```

- [ ] **Step 4: Implement the shared panels**

Create `ClinicalTestingPoolUi.tsx` with the following exports and exact public prop contracts:

```tsx
import type { ReactNode } from "react";
import { Check, LockKeyhole } from "lucide-react";
import {
  buildGaugeModel,
  buildLeaderboardRows,
  getRoundStageIndex,
  type TestingMilestone,
  type TestingVoteSummary,
} from "./testing-pool-model";
import "./clinical-testing-pool.css";

export function ClinicalPanel({ title, meta, children, className = "" }: { title: string; meta?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`clinical-panel ${className}`.trim()}><header className="clinical-panel__head"><h3>{title}</h3>{meta ? <div>{meta}</div> : null}</header><div className="clinical-panel__body">{children}</div></section>;
}

export interface RoundMetric { label: string; value: string; detail: string; tone?: "default" | "success" | "warning" | "info" }

export function RoundMetricStrip({ metrics }: { metrics: RoundMetric[] }) {
  return <section className="clinical-testing__metrics" aria-label="Testing pool summary">{metrics.map(metric => <article key={metric.label} data-tone={metric.tone ?? "default"}><span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.detail}</small></article>)}</section>;
}

const STAGES = [
  ["Pool opened", "Contribution rules published"],
  ["Fund & vote", "Contributors choose the test batch"],
  ["Sent to lab", "Sample and payment dispatched"],
  ["Results published", "Signed evidence shared"],
] as const;

export function RoundStatusRail({ status }: { status: string }) {
  const activeIndex = getRoundStageIndex(status);
  return <ol className="clinical-testing__status-rail" aria-label="Testing round progress">{STAGES.map(([label, detail], index) => <li key={label} data-state={index < activeIndex ? "complete" : index === activeIndex ? "active" : "future"}><span>{index < activeIndex ? <Check aria-hidden="true" /> : index + 1}</span><div><strong>{label}</strong><small>{detail}</small></div></li>)}</ol>;
}

export function ThresholdStepGrid({ milestones, raised, currency = "$" }: { milestones: TestingMilestone[]; raised: number; currency?: string }) {
  const model = buildGaugeModel(raised, milestones);
  return <div className="clinical-testing__threshold-grid">{model.thresholds.map((threshold, index) => <article key={`${threshold.label}-${threshold.amount}`} data-state={threshold.state}><div><span>Step {String(index + 1).padStart(2, "0")}</span>{threshold.state === "unlocked" ? <Check aria-hidden="true" /> : <LockKeyhole aria-hidden="true" />}</div><strong>{threshold.label}</strong><small>{threshold.state === "unlocked" ? `${currency}${threshold.amount} funded` : `${currency}${threshold.remaining} remaining · target ${currency}${threshold.amount}`}</small></article>)}</div>;
}

export function VoteLeaderboard({ votes, totalVotes, batches = {} }: { votes: TestingVoteSummary[]; totalVotes: number; batches?: Record<string, string> }) {
  const rows = buildLeaderboardRows(votes, totalVotes);
  return <div className="clinical-testing__leaderboard">{rows.map(row => <article key={row.peptideName}><span className="clinical-testing__rank">{String(row.rank).padStart(2, "0")}</span><div className="clinical-testing__leader-name"><strong>{row.peptideName}</strong>{batches[row.peptideName] ? <small>Batch {batches[row.peptideName]}</small> : null}</div><div className="clinical-testing__vote-bar"><i style={{ width: `${row.percentage}%` }} /></div><span className="clinical-testing__vote-value">{row.totalVotes} · {row.percentage}%</span></article>)}</div>;
}
```

- [ ] **Step 5: Add the scoped Clinical Command CSS**

Create `clinical-testing-pool.css`. It must define the selectors asserted by the test and these layout rules:

```css
.clinical-testing {
  --clinical-navy: #1b3a7a;
  --clinical-blue: #2d6bcc;
  --clinical-deep: #1b3164;
  --clinical-ink: #0f1f38;
  --clinical-muted: #6b7280;
  --clinical-subtle: #8a9aaa;
  --clinical-border: #d0dae4;
  --clinical-canvas: #f8fafc;
  color: var(--clinical-ink);
}

.clinical-testing__sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
.clinical-testing :focus-visible { outline: 3px solid #2d6bcc; outline-offset: 2px; }
.clinical-testing__metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.clinical-testing__metrics article { min-width: 0; padding: 16px; border: 1px solid var(--clinical-border); border-radius: 14px; background: #fff; }
.clinical-testing__metrics span { display: block; color: var(--clinical-subtle); font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.clinical-testing__metrics strong { display: block; margin-top: 7px; color: var(--clinical-ink); font-size: 20px; font-variant-numeric: tabular-nums; }
.clinical-testing__metrics small { display: block; margin-top: 3px; color: var(--clinical-muted); font-size: 11px; }
.clinical-testing__member-grid { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(340px, .85fr); gap: 20px; align-items: start; }
.clinical-testing__organizer-grid { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(320px, .75fr); gap: 16px; align-items: start; }
.clinical-panel { overflow: hidden; border: 1px solid var(--clinical-border); border-radius: 14px; background: #fff; box-shadow: 0 8px 28px rgba(15, 31, 56, .06); }
.clinical-panel__head { display: flex; min-height: 48px; align-items: center; justify-content: space-between; gap: 12px; padding: 0 16px; border-bottom: 1px solid var(--clinical-border); background: #f8fafc; }
.clinical-panel__head h3 { margin: 0; font-size: 13px; }
.clinical-panel__body { padding: 16px; }
.clinical-pool-gauge { width: 100%; max-width: 560px; margin-inline: auto; }
.clinical-pool-gauge svg { display: block; width: 100%; overflow: visible; }
.clinical-pool-gauge__track, .clinical-pool-gauge__fill { fill: none; stroke-width: 20; }
.clinical-pool-gauge__track { stroke: #e6edf4; }
.clinical-pool-gauge__fill { stroke-linecap: round; }
.clinical-pool-gauge__tick, .clinical-pool-gauge__guide { stroke: #9aabba; stroke-width: 1; }
.clinical-pool-gauge__marker { fill: #fff; stroke: #94a3b8; stroke-width: 3; }
.clinical-pool-gauge__marker[data-state="unlocked"] { fill: #16a34a; stroke: #fff; }
.clinical-pool-gauge__endpoint { fill: #2d6bcc; transform-box: fill-box; transform-origin: center; filter: drop-shadow(0 0 8px rgba(45, 107, 204, .5)); }
.clinical-pool-gauge__endpoint[data-animated] { animation: clinical-endpoint-pulse 1.7s ease-in-out infinite; }
.clinical-pool-gauge__eyebrow, .clinical-pool-gauge__contributors, .clinical-pool-gauge__status { fill: #6b7280; font-size: 10px; font-weight: 700; letter-spacing: .12em; }
.clinical-pool-gauge__total { fill: #0f1f38; font-family: "SFMono-Regular", Consolas, monospace; font-size: 38px; font-weight: 800; letter-spacing: -.05em; }
.clinical-pool-gauge__threshold-label { fill: #0f1f38; font-family: "SFMono-Regular", Consolas, monospace; font-size: 11px; font-weight: 800; }
.clinical-pool-gauge__threshold-name { fill: #6b7280; font-size: 9px; font-weight: 700; }
.clinical-testing__status-rail { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin: 0; padding: 12px; list-style: none; border: 1px solid var(--clinical-border); border-radius: 12px; background: #fff; }
.clinical-testing__status-rail li { display: flex; min-width: 0; align-items: center; gap: 8px; color: var(--clinical-subtle); }
.clinical-testing__status-rail li > span { display: grid; width: 26px; height: 26px; flex: 0 0 26px; place-items: center; border-radius: 50%; background: #edf2f7; font-size: 10px; font-weight: 800; }
.clinical-testing__status-rail li[data-state="active"] { color: var(--clinical-blue); }
.clinical-testing__status-rail li[data-state="complete"] { color: #15803d; }
.clinical-testing__status-rail strong, .clinical-testing__status-rail small { display: block; }
.clinical-testing__status-rail strong { font-size: 11px; }
.clinical-testing__status-rail small { margin-top: 2px; font-size: 9px; color: var(--clinical-subtle); }
.clinical-testing__threshold-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 9px; }
.clinical-testing__threshold-grid article { padding: 12px; border: 1px solid var(--clinical-border); border-radius: 11px; background: #fff; }
.clinical-testing__threshold-grid article[data-state="unlocked"] { border-color: #a7dfb6; background: #f5fff7; }
.clinical-testing__threshold-grid article > div { display: flex; align-items: center; justify-content: space-between; color: var(--clinical-subtle); font-size: 9px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
.clinical-testing__threshold-grid strong, .clinical-testing__threshold-grid small { display: block; }
.clinical-testing__threshold-grid strong { margin-top: 9px; font-size: 12px; }
.clinical-testing__threshold-grid small { margin-top: 4px; color: var(--clinical-muted); font-size: 10px; }
.clinical-testing__leaderboard article { display: grid; grid-template-columns: 28px minmax(110px, 1fr) minmax(80px, 1.4fr) 64px; gap: 10px; align-items: center; padding: 10px 0; border-bottom: 1px solid #e6edf4; }
.clinical-testing__leaderboard article:last-child { border-bottom: 0; }
.clinical-testing__rank { color: var(--clinical-subtle); font-family: "SFMono-Regular", Consolas, monospace; font-size: 10px; font-weight: 800; }
.clinical-testing__leader-name strong, .clinical-testing__leader-name small { display: block; }
.clinical-testing__leader-name strong { font-size: 11px; }
.clinical-testing__leader-name small { margin-top: 2px; color: var(--clinical-muted); font-size: 9px; }
.clinical-testing__vote-bar { height: 7px; overflow: hidden; border-radius: 999px; background: #e8eef5; }
.clinical-testing__vote-bar i { display: block; height: 100%; border-radius: inherit; background: #2d6bcc; transition: width .7s ease; }
.clinical-testing__vote-value { color: var(--clinical-muted); font-family: "SFMono-Regular", Consolas, monospace; font-size: 9px; text-align: right; }

@keyframes clinical-endpoint-pulse { 50% { opacity: .35; transform: scale(.72); } }

@media (max-width: 1023px) {
  .clinical-testing__metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .clinical-testing__member-grid, .clinical-testing__organizer-grid { grid-template-columns: 1fr; }
  .clinical-pool-gauge { max-width: 620px; }
}

@media (max-width: 767px) {
  .clinical-testing :where(button, a[href]) { min-height: 44px; }
  .clinical-testing__metrics, .clinical-testing__threshold-grid { grid-template-columns: 1fr; }
  .clinical-testing__status-rail { grid-template-columns: 1fr; }
  .clinical-testing__leaderboard article { grid-template-columns: 24px minmax(0, 1fr) 58px; }
  .clinical-testing__vote-bar { grid-column: 2 / -1; }
  .clinical-panel__body { padding: 13px; }
}

@media (prefers-reduced-motion: reduce) {
  .clinical-testing *, .clinical-testing *::before, .clinical-testing *::after { scroll-behavior: auto !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }
}
```

- [ ] **Step 6: Add the focused package script and run both tests**

Add to `artifacts/peps-anonymous/package.json`:

```json
"test:testing-pool": "node --experimental-strip-types --test src/components/testing-pool/testing-pool-model.test.ts src/components/testing-pool/clinical-testing-pool-contract.test.ts"
```

Run:

```bash
pnpm --filter @workspace/peps-anonymous run test:testing-pool
```

Expected: 6 tests PASS.

- [ ] **Step 7: Commit the shared UI slice**

```bash
git add artifacts/peps-anonymous/package.json artifacts/peps-anonymous/src/components/testing-pool
git commit -m "feat: add clinical testing pool UI"
```

## Task 3: Add the Existing Public Snapshot to the Organizer Client

**Files:**
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/api/organiser-api.test.ts`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/api/organiser-api.ts`

- [ ] **Step 1: Extend the API test first**

In `createOrganiserApi exposes the replacement workspace resource endpoints`, add:

```ts
await api.testingPoolSnapshot("gb / one");
```

and insert this expected request immediately after the organizer testing request:

```ts
{ url: "/api/group-buys/gb%20%2F%20one/testing", method: "GET" },
```

Update the fake response selection so both testing URLs return an object with the snapshot fields:

```ts
const body = url.includes("/tickets") ? { tickets: [] }
  : url.includes("/testing") ? {
      round: null,
      products: [],
      labTests: [],
      contributions: { pending: 0, confirmed: 0, rejected: 0, total: 0 },
      poolTotal: 0,
      contributorCount: 0,
      totalVotes: 0,
      milestones: [],
      votes: [],
      testVotes: {},
    }
  : [];
```

- [ ] **Step 2: Run the API test and verify the missing method failure**

```bash
cd artifacts/peps-anonymous
node --experimental-strip-types --test src/pages/organiser-v2/api/organiser-api.test.ts
```

Expected: FAIL because `testingPoolSnapshot` is not defined.

- [ ] **Step 3: Add snapshot types and the client method**

Add after `ApiTestingPool`:

```ts
export interface ApiTestingMilestone {
  label: string;
  amount: number;
  type: "test" | "vial";
  vialNum?: number;
}

export interface ApiTestingVoteSummary {
  peptideName: string;
  totalVotes: number;
  vials: Record<string, number>;
}

export interface ApiTestingPoolSnapshot {
  round: ApiTestingRound | null;
  poolTotal: number;
  contributorCount: number;
  totalVotes: number;
  milestones: ApiTestingMilestone[];
  votes: ApiTestingVoteSummary[];
  testVotes: Record<string, number>;
  peptideBatches?: Record<string, string>;
}
```

Add beside `testingPool` in `createOrganiserApi`:

```ts
testingPoolSnapshot: (groupBuyId: string) => request<ApiTestingPoolSnapshot>(
  `/group-buys/${encodeURIComponent(groupBuyId)}/testing`,
),
```

- [ ] **Step 4: Run the API and focused testing-pool tests**

Run:

```bash
node --experimental-strip-types --test src/pages/organiser-v2/api/organiser-api.test.ts
pnpm run test:testing-pool
```

Expected: all API tests and 6 testing-pool tests PASS.

- [ ] **Step 5: Commit the API adapter**

```bash
git add artifacts/peps-anonymous/src/pages/organiser-v2/api/organiser-api.ts artifacts/peps-anonymous/src/pages/organiser-v2/api/organiser-api.test.ts
git commit -m "feat: expose testing pool snapshot to organiser"
```

## Task 4: Recompose the Organizer v2 Lab Testing Pool

**Files:**
- Modify: `artifacts/peps-anonymous/src/components/testing-pool/clinical-testing-pool-contract.test.ts`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/TestingGroupsTab.tsx`
- Modify: `artifacts/peps-anonymous/src/components/testing-pool/clinical-testing-pool.css`

- [ ] **Step 1: Add failing organizer source contracts**

Append:

```ts
test("Organizer v2 composes live configuration and snapshot data without fake review actions", () => {
  const organizer = read("../../pages/organiser-v2/TestingGroupsTab.tsx");
  assert.match(organizer, /organiserApi\.testingPoolSnapshot/);
  assert.match(organizer, /className="clinical-testing clinical-testing--organizer"/);
  assert.match(organizer, /<RoundMetricStrip/);
  assert.match(organizer, /<ClinicalPoolGauge/);
  assert.match(organizer, /<ThresholdStepGrid/);
  assert.match(organizer, /<VoteLeaderboard/);
  assert.match(organizer, /<ClinicalPanel title="Round controls"/);
  assert.match(organizer, /Pending contributions/);
  assert.doesNotMatch(organizer, />Verify contribution</);
});
```

- [ ] **Step 2: Run the contract and confirm it fails**

```bash
pnpm --filter @workspace/peps-anonymous run test:testing-pool
```

Expected: FAIL on missing `testingPoolSnapshot` usage and Clinical Command classes.

- [ ] **Step 3: Add the snapshot query and derived display data**

In `TestingGroupsTab.tsx`:

```tsx
import { ClinicalPoolGauge } from "@/components/testing-pool/ClinicalPoolGauge";
import {
  ClinicalPanel,
  RoundMetricStrip,
  RoundStatusRail,
  ThresholdStepGrid,
  VoteLeaderboard,
  type RoundMetric,
} from "@/components/testing-pool/ClinicalTestingPoolUi";
import "@/components/testing-pool/clinical-testing-pool.css";
```

Add a second query beside the existing query:

```tsx
const snapshotQuery = useQuery({
  queryKey: ["organiser", "testing-snapshot", selectedGbId],
  queryFn: () => organiserApi.testingPoolSnapshot(selectedGbId!),
  enabled: Boolean(selectedGbId),
  staleTime: 15_000,
  refetchInterval: 30_000,
});
```

After `const pool = query.data`, derive:

```tsx
const snapshot = snapshotQuery.data;
const milestones = snapshot?.milestones ?? [];
const goal = milestones.at(-1)?.amount ?? 0;
const statusLabel = pool?.round
  ? STATUS_OPTIONS.find(option => option.value === pool.round?.status)?.label ?? pool.round.status
  : "Not configured";
const metrics: RoundMetric[] = [
  {
    label: "Pool funding",
    value: goal > 0 ? `$${snapshot?.poolTotal ?? 0} / $${goal}` : "$0",
    detail: goal > 0 ? `$${Math.max(goal - (snapshot?.poolTotal ?? 0), 0)} remaining` : "Waiting for vote milestones",
    tone: "info",
  },
  {
    label: "Contributors",
    value: String(snapshot?.contributorCount ?? pool?.contributions.total ?? 0),
    detail: `${pool?.contributions.pending ?? 0} pending · ${pool?.contributions.confirmed ?? 0} confirmed`,
    tone: pool?.contributions.pending ? "warning" : "success",
  },
  {
    label: "Votes cast",
    value: String(snapshot?.totalVotes ?? 0),
    detail: `${snapshot?.votes.length ?? 0} products in the standing`,
  },
  { label: "Round status", value: statusLabel, detail: pool?.round ? "Live workflow" : "Create the first round" },
];
```

Update `save()` so both data sources refresh after a successful create/update:

```tsx
await Promise.all([query.refetch(), snapshotQuery.refetch()]);
```

- [ ] **Step 4: Replace the organizer composition with Clinical Command**

The returned root must be:

```tsx
<div className="clinical-testing clinical-testing--organizer">
  <section className="clinical-testing__organizer-intro">
    <div>
      <span>Independent testing · Live round</span>
      <h2>Lab testing pool</h2>
      <p>Coordinate funding, product voting, thresholds, and linked lab evidence.</p>
    </div>
    <button type="button" className="ov2-secondary-button" onClick={() => Promise.all([query.refetch(), snapshotQuery.refetch()])}>
      <RefreshCw aria-hidden="true" /> Refresh
    </button>
  </section>
  {saveError ? <div className="ov2-data-notice" data-tone="error" role="alert">{saveError}</div> : null}
  <RoundMetricStrip metrics={metrics} />
  {pool?.round ? <RoundStatusRail status={pool.round.status} /> : null}
  <div className="clinical-testing__organizer-grid">
    <div className="clinical-testing__organizer-primary">
      <ClinicalPanel title="Round health" meta={<span>{snapshotQuery.isFetching ? "Syncing…" : "Live snapshot"}</span>}>
        <ClinicalPoolGauge raised={snapshot?.poolTotal ?? 0} milestones={milestones} contributorCount={snapshot?.contributorCount ?? 0} statusLabel={statusLabel} active={pool?.round?.status === "active"} compact />
        <ThresholdStepGrid milestones={milestones} raised={snapshot?.poolTotal ?? 0} />
      </ClinicalPanel>
      <ClinicalPanel title="Products in the ballot" meta={<span>{selectedProducts.length} selected</span>}>
        <div className="clinical-testing__product-grid">{(pool?.products ?? []).map(product => <label key={product.id} className="clinical-testing__product-option"><input type="checkbox" checked={selectedProducts.includes(product.name)} onChange={() => toggleProduct(product.name)} /><span><strong>{product.name}</strong><small>{product.vendor || product.category || "Group-buy product"}</small></span></label>)}</div>
        {pool?.products.length === 0 ? <p className="clinical-testing__empty-copy">Add products in the Products tab before configuring a vote.</p> : null}
      </ClinicalPanel>
      <ClinicalPanel title="Linked lab reports" meta={<span>{pool?.labTests.length ?? 0} reports</span>}>
        <div className="clinical-testing__evidence-list">{(pool?.labTests ?? []).map(test => <article key={test.id}><span aria-hidden="true">✓</span><div><strong>{test.peptideName}</strong><small>{[test.labName, test.batchCode, test.purityPct ? `${test.purityPct}%` : null].filter(Boolean).join(" · ") || "Lab report"}</small></div>{test.url ? <a href={test.url} target="_blank" rel="noreferrer" aria-label={`Open ${test.peptideName} report`}>Open</a> : null}</article>)}</div>
        {pool?.labTests.length === 0 ? <p className="clinical-testing__empty-copy">Approved or pending reports linked to this group buy will appear here.</p> : null}
      </ClinicalPanel>
    </div>
    <aside className="clinical-testing__organizer-aside">
      <form onSubmit={event => { event.preventDefault(); void save(); }}>
        <ClinicalPanel title="Round controls" meta={<span>Publishes to members</span>}>
          <div className="clinical-testing__control-grid"><label><span>Contribution amount</span><input type="number" min="0.01" step="0.01" value={contributionAmount} onChange={event => setContributionAmount(event.target.value)} disabled={anyContribution} /></label><label><span>Workflow status</span><select value={status} onChange={event => setStatus(event.target.value)} disabled={!pool?.round}>{STATUS_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label></div>
          <label className="clinical-testing__switch"><input type="checkbox" checked={anyContribution} onChange={event => setAnyContribution(event.target.checked)} /> Allow any contribution amount</label>
          <label className="clinical-testing__control-field"><span>Funding note</span><textarea rows={3} value={fundingNote} onChange={event => setFundingNote(event.target.value)} placeholder="Explain what the pool is funding and any deadlines." /></label>
          <button type="submit" className="ov2-primary-button" disabled={saving}>{saving ? "Saving…" : pool?.round ? "Save pool" : "Create pool"}</button>
        </ClinicalPanel>
      </form>
      <ClinicalPanel title="Ballot standing" meta={<span>{snapshot?.totalVotes ?? 0} votes</span>}>
        {snapshot?.votes.length ? <VoteLeaderboard votes={snapshot.votes} totalVotes={snapshot.totalVotes} batches={snapshot.peptideBatches} /> : <p className="clinical-testing__empty-copy">No votes have been cast yet.</p>}
      </ClinicalPanel>
      <ClinicalPanel title="Contribution status" meta={<span>{pool?.contributions.total ?? 0} records</span>}>
        <dl className="clinical-testing__contribution-counts"><div><dt>Pending contributions</dt><dd>{pool?.contributions.pending ?? 0}</dd></div><div><dt>Confirmed</dt><dd>{pool?.contributions.confirmed ?? 0}</dd></div><div><dt>Rejected</dt><dd>{pool?.contributions.rejected ?? 0}</dd></div></dl>
      </ClinicalPanel>
    </aside>
  </div>
</div>
```

Move the existing product, lab-report, and round-control markup into the named panels shown above; do not change its event handlers, native inputs, labels, or empty-state copy.

- [ ] **Step 5: Add organizer-only CSS hooks**

Append concrete rules for `.clinical-testing--organizer`, `.clinical-testing__organizer-intro`, `.clinical-testing__organizer-primary`, `.clinical-testing__organizer-aside`, `.clinical-testing__product-grid`, `.clinical-testing__evidence-list`, and `.clinical-testing__contribution-counts`. Use `position: sticky; top: 16px` only for the desktop organizer aside, and reset it to `position: static` inside the 1023px media query.

- [ ] **Step 6: Run focused and existing organizer contracts**

```bash
pnpm --filter @workspace/peps-anonymous run test:testing-pool
pnpm --filter @workspace/peps-anonymous run test:approved-workspace
```

Expected: both commands PASS.

- [ ] **Step 7: Commit the organizer redesign**

```bash
git add artifacts/peps-anonymous/src/pages/organiser-v2/TestingGroupsTab.tsx artifacts/peps-anonymous/src/components/testing-pool/clinical-testing-pool.css artifacts/peps-anonymous/src/components/testing-pool/clinical-testing-pool-contract.test.ts
git commit -m "feat: redesign organiser testing pool"
```

## Task 5: Recompose the Member-Facing Testing Pool

**Files:**
- Modify: `artifacts/peps-anonymous/src/components/testing-pool/clinical-testing-pool-contract.test.ts`
- Modify: `artifacts/peps-anonymous/src/pages/GbTestingPool.tsx`
- Modify: `artifacts/peps-anonymous/src/components/testing-pool/clinical-testing-pool.css`

- [ ] **Step 1: Add failing member-page contracts**

Append:

```ts
test("member testing pool uses the shared gauge-first composition and preserves workflows", () => {
  const member = read("../../pages/GbTestingPool.tsx");
  assert.match(member, /className="clinical-testing clinical-testing--member"/);
  assert.match(member, /<ClinicalPoolGauge/);
  assert.match(member, /<RoundStatusRail/);
  assert.match(member, /<ThresholdStepGrid/);
  assert.match(member, /<VoteLeaderboard/);
  assert.match(member, /setInterval\(\(\) => void load\(\), 30_000\)/);
  assert.doesNotMatch(member, /function PoolGauge\(/);
  assert.doesNotMatch(member, /function MilestoneCard\(/);
  for (const preserved of ["VoteForm", "ExistingVoteCard", "LateContributionForm", "PendingContributionCard", "resultPdfUrl", "publicVotes", "vialVotes"]) {
    assert.match(member, new RegExp(preserved));
  }
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run `pnpm --filter @workspace/peps-anonymous run test:testing-pool`.

Expected: FAIL because the member page still owns `PoolGauge` and `MilestoneCard`.

- [ ] **Step 3: Replace local display components with shared imports**

Import:

```tsx
import { useReducedMotion } from "framer-motion";
import { ClinicalPoolGauge } from "@/components/testing-pool/ClinicalPoolGauge";
import {
  ClinicalPanel,
  RoundStatusRail,
  ThresholdStepGrid,
  VoteLeaderboard,
} from "@/components/testing-pool/ClinicalTestingPoolUi";
import "@/components/testing-pool/clinical-testing-pool.css";
```

Merge `useReducedMotion` into the existing Framer Motion import rather than adding a duplicate import. Delete only these obsolete local definitions and constants:

- `GaugeSegment`
- `PoolGauge`
- `MilestoneCard`
- `polarToXY`
- `describeArc`
- `ARC1`, `ARC2`, `ARC3`, `ARC4`, and `STEP_COLORS`

Keep `HIT`, `VoteForm`, `ExistingVoteCard`, `PendingContributionCard`, `LateContributionForm`, all API types, and all workflow functions.

- [ ] **Step 4: Add quiet auto-refresh and a retryable error state**

After the existing load effect, add:

```tsx
useEffect(() => {
  if (!gbId || !isLoggedIn) return;
  const timer = window.setInterval(() => void load(), 30_000);
  return () => window.clearInterval(timer);
}, [gbId, isLoggedIn, load]);
```

Add a retry button to the error state:

```tsx
<button type="button" onClick={() => { setLoading(true); setError(null); void load(); }} className="btn-primary mt-4">
  Try again
</button>
```

Use the application's existing primary-button class if `btn-primary` is not defined in `index.css`; do not introduce an unstyled class.

- [ ] **Step 5: Build the approved gauge-first member composition**

At the top of the component body, add:

```tsx
const reduceMotion = useReducedMotion();
```

Replace the page wrapper and above-the-fold layout with:

```tsx
<GbPoolLayout title={`${gbName ? gbName + " · " : ""}Testing Pool`}>
  <motion.div
    initial={reduceMotion ? false : { opacity: 0 }}
    animate={{ opacity: 1 }}
    className="clinical-testing clinical-testing--member"
  >
    <header className="clinical-testing__member-header">
      <div>
        <button type="button" onClick={() => setLocation("/account?s=lab-pool")} className="clinical-testing__back-link"><ChevronLeft aria-hidden="true" /> Testing pools</button>
        <span>Independent test round · {round.id.slice(0, 8).toUpperCase()}</span>
        <h1>{gbName || "Group Buy"} · Lab Testing Pool</h1>
        <p>{round.fundingNote || "Community-funded independent testing for the winning product batch."}</p>
      </div>
      <div className="clinical-testing__member-header-actions"><span data-status={round.status}>{STATUS_LABELS[round.status] ?? round.status}</span><button type="button" onClick={() => setRefreshKey(key => key + 1)} aria-label="Refresh testing pool"><RefreshCw aria-hidden="true" /></button></div>
    </header>
    <RoundStatusRail status={round.status} />
    <div className="clinical-testing__member-grid">
      <div className="clinical-testing__member-primary">
        <ClinicalPanel title="Pool progress" meta={<span>{progressPct.toFixed(1)}% funded</span>}>
          <ClinicalPoolGauge raised={poolTotal} milestones={milestones} contributorCount={contributorCount} statusLabel={STATUS_LABELS[round.status] ?? round.status} active={round.status === "active"} />
          <ThresholdStepGrid milestones={milestones} raised={poolTotal} />
        </ClinicalPanel>
      </div>
      <aside className="clinical-testing__member-aside">
        {pendingContribution ? <PendingContributionCard pc={pendingContribution} /> : null}
        {isOptedIn && !isAdminView && !isClosed && !hasVoted ? <VoteForm gbId={gbId} peptideOptions={peptideOptions} testOptions={round.testOptions} maxVials={data.maxVials} maxCompoundVotes={round.maxCompoundVotes ?? 1} maxTestVotes={round.maxTestVotes ?? 1} onDone={() => { setLoading(true); void load(); }} /> : null}
        {hasVoted && existingVote ? <ExistingVoteCard vote={existingVote} /> : null}
        <ClinicalPanel title="Live leaderboard" meta={<span>{totalVotes} votes cast</span>}>
          {votes.length ? <VoteLeaderboard votes={votes} totalVotes={totalVotes} batches={peptideBatches} /> : <p className="clinical-testing__empty-copy">No votes have been cast yet.</p>}
        </ClinicalPanel>
      </aside>
    </div>
  </motion.div>
</GbPoolLayout>
```

Insert the member grid immediately before the existing community-result block. Keep the existing community result, funded-tests, late-opt-in, public-vote list, vial breakdown, and result-evidence JSX after the grid in its current conditional order. The final source must contain every preserved identifier asserted by the contract test.

- [ ] **Step 6: Add member-specific responsive styling**

Append `.clinical-testing--member`, `.clinical-testing__member-header`, `.clinical-testing__member-header-actions`, `.clinical-testing__back-link`, `.clinical-testing__member-primary`, and `.clinical-testing__member-aside`. Set the member page to `max-width: 1240px; margin-inline: auto; padding: 20px 16px 36px; overflow-x: hidden`. On mobile, stack header actions, keep the gauge SVG at `width: 100%`, and ensure labels stay inside the 420-by-380 view box.

- [ ] **Step 7: Run focused tests, typecheck, and build**

```bash
pnpm --filter @workspace/peps-anonymous run test:testing-pool
pnpm --filter @workspace/peps-anonymous run typecheck
pnpm --filter @workspace/peps-anonymous run build
```

Expected: all commands PASS. If typecheck or build fails in a pre-existing unrelated file, record the exact path and error, then prove no new testing-pool file appears in the error list.

- [ ] **Step 8: Commit the member redesign**

```bash
git add artifacts/peps-anonymous/src/pages/GbTestingPool.tsx artifacts/peps-anonymous/src/components/testing-pool/clinical-testing-pool.css artifacts/peps-anonymous/src/components/testing-pool/clinical-testing-pool-contract.test.ts
git commit -m "feat: redesign member testing pool"
```

## Task 6: Preserve All Five Paired Concepts in the Sandbox

**Files:**
- Create: `artifacts/mockup-sandbox/src/components/mockups/lab-testing-pool-concepts/lab-testing-pool-concepts.test.ts`
- Create: `artifacts/mockup-sandbox/src/components/mockups/lab-testing-pool-concepts/LabTestingPoolConcepts.tsx`
- Create: `artifacts/mockup-sandbox/src/components/mockups/lab-testing-pool-concepts/_lab-testing-pool-concepts.css`

- [ ] **Step 1: Write the failing gallery contract**

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file: string) => readFileSync(new URL(file, import.meta.url), "utf8");

test("gallery contains five paired legitimate Lab Testing Pool concepts", () => {
  const component = read("./LabTestingPoolConcepts.tsx");
  for (const id of ["clinical", "ledger", "timeline", "cockpit", "ballot"]) {
    assert.match(component, new RegExp(`id: \\"${id}\\"`));
  }
  for (const surface of ["organizer", "member"]) {
    assert.match(component, new RegExp(`value=\\"${surface}\\"`));
  }
  for (const content of ["Contribution amount", "Products in the ballot", "Pool progress", "Cast your community vote", "Live leaderboard", "Linked lab reports"]) {
    assert.match(component, new RegExp(content));
  }
});

test("gallery is interactive, labelled, responsive, and reduced-motion safe", () => {
  const component = read("./LabTestingPoolConcepts.tsx");
  const css = read("./_lab-testing-pool-concepts.css");
  assert.match(component, /aria-label="Choose a Lab Testing Pool concept"/);
  assert.match(component, /aria-label="Choose a surface"/);
  assert.match(component, /onClick=\{\(\) => setConcept/);
  assert.match(component, /onClick=\{\(\) => setSurface/);
  assert.match(css, /@media\s*\(max-width:\s*1023px\)/);
  assert.match(css, /@media\s*\(max-width:\s*767px\)/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});
```

- [ ] **Step 2: Run the contract and confirm the component is absent**

```bash
cd artifacts/mockup-sandbox
node --experimental-strip-types --test src/components/mockups/lab-testing-pool-concepts/lab-testing-pool-concepts.test.ts
```

Expected: FAIL with `ENOENT`.

- [ ] **Step 3: Implement the concept and surface controller**

Create `LabTestingPoolConcepts.tsx` with:

```tsx
import { useMemo, useState } from "react";
import { Check, FlaskConical, RefreshCw, Search, Settings2 } from "lucide-react";
import "./_lab-testing-pool-concepts.css";

type ConceptId = "clinical" | "ledger" | "timeline" | "cockpit" | "ballot";
type SurfaceId = "organizer" | "member";

const CONCEPTS: Array<{ id: ConceptId; number: string; name: string; detail: string }> = [
  { id: "clinical", number: "01", name: "Clinical Command", detail: "Calm pharma operations · selected" },
  { id: "ledger", number: "02", name: "Evidence Ledger", detail: "Audit and record led" },
  { id: "timeline", number: "03", name: "Round Timeline", detail: "Workflow and stage led" },
  { id: "cockpit", number: "04", name: "Funding Cockpit", detail: "Dense live telemetry" },
  { id: "ballot", number: "05", name: "Community Ballot", detail: "Participation and vote led" },
];

const SURFACES: Array<{ value: SurfaceId; label: string }> = [
  { value: "organizer", label: "Organizer v2" },
  { value: "member", label: "Member view" },
];

const ROUND = {
  raised: 318,
  goal: 480,
  contributors: 23,
  pending: 2,
  votes: 18,
  products: ["BPC-157 5mg", "TB-500 10mg", "Semaglutide 5mg"],
};

function OrganizerSurface({ concept }: { concept: ConceptId }) {
  return <div className="ltpc-organizer" data-concept={concept}><aside className="ltpc-sidebar"><strong>Peps Anonymous</strong><span>GB Organiser</span><nav><b>Workspace</b><a>Overview</a><a>Orders</a><a>Members</a><b>Fulfilment</b><a>Products</a><a className="active">Lab testing pool</a><a>Vendor COAs</a><b>Group buy</b><a>Profit & loss</a></nav></aside><section className="ltpc-workspace"><header><span>Independent testing · Live round</span><h2>Lab testing pool</h2><p>Coordinate funding, ballot choices, contribution status, and linked reports.</p></header><div className="ltpc-metrics"><article><small>Pool funding</small><strong>$318 / $480</strong><span>66% funded</span></article><article><small>Contributors</small><strong>23</strong><span>2 pending review</span></article><article><small>Votes cast</small><strong>18</strong><span>78% participation</span></article><article><small>Round status</small><strong>Voting open</strong><span>Active workflow</span></article></div><div className="ltpc-organizer-grid"><section className="ltpc-panel"><header><strong>Round health</strong><span>Live snapshot</span></header><div className="ltpc-organizer-health"><div className="ltpc-ring"><strong>$318</strong><small>of $480</small></div><ol><li><b>01</b><span>HPLC identity & purity<small>Unlocked · $245</small></span><em>Funded</em></li><li><b>02</b><span>Sterility + endotoxin<small>$42 remaining</small></span><em>$360</em></li><li><b>03</b><span>10 additional vials<small>$162 remaining</small></span><em>$480</em></li></ol></div></section><section className="ltpc-panel"><header><strong>Round controls</strong><span>Publishes to members</span></header><label>Contribution amount<input value="$15.00" readOnly /></label><label>Workflow status<select defaultValue="active"><option value="active">Voting & funding open</option></select></label><label>Funding note<textarea defaultValue="Independent HPLC, sterility, and endotoxin testing for the winning batch." rows={3} /></label><button type="button" className="ltpc-primary">Save pool</button></section></div><div className="ltpc-lower-grid"><section className="ltpc-panel"><header><strong>Products in the ballot</strong><span>3 selected</span></header><ul className="ltpc-product-list">{ROUND.products.map(product => <li key={product}><input type="checkbox" defaultChecked={product !== "Semaglutide 5mg"} /><span>{product}<small>Group-buy product · batch linked</small></span></li>)}</ul></section><section className="ltpc-panel"><header><strong>Ballot standing</strong><span>18 votes</span></header><div className="ltpc-bars"><p><b>BPC-157 5mg</b><i style={{ width: "50%" }} /><span>9 · 50%</span></p><p><b>TB-500 10mg</b><i style={{ width: "33%" }} /><span>6 · 33%</span></p><p><b>Semaglutide 5mg</b><i style={{ width: "17%" }} /><span>3 · 17%</span></p></div></section></div></section></div>;
}

function MemberSurface({ concept }: { concept: ConceptId }) {
  return <div className="ltpc-member" data-concept={concept}><header className="ltpc-member-head"><div><span>Independent test round · LR-2025-04</span><h2>Winter Peptide Run · Lab Testing Pool</h2><p>Community-funded independent testing for the winning product batch.</p></div><b>Funding & voting open</b></header><ol className="ltpc-rail"><li>✓ Pool opened</li><li className="active">2 · Fund & vote</li><li>3 · Sent to lab</li><li>4 · Results published</li></ol><div className="ltpc-member-grid"><section className="ltpc-panel ltpc-gauge-panel"><header><strong>Pool progress</strong><span>Active</span></header><div className="ltpc-large-gauge"><div className="ltpc-gauge-circle"><strong>$318</strong><small>23 contributors · 66% funded</small></div><b className="ltpc-arc-label ltpc-arc-one">$245 · HPLC</b><b className="ltpc-arc-label ltpc-arc-two">$360 · Sterility</b><b className="ltpc-arc-label ltpc-arc-three">$480 · Vials</b></div><div className="ltpc-thresholds"><article data-state="unlocked"><small>Step 01 · Unlocked</small><strong>HPLC identity & purity</strong><span>$245 funded ✓</span></article><article><small>Step 02 · $42 to go</small><strong>Sterility + endotoxin</strong><span>Target $360</span></article><article><small>Step 03 · Locked</small><strong>10 additional vials</strong><span>Target $480</span></article></div></section><aside><section className="ltpc-panel ltpc-vote"><header><strong>Cast your community vote</strong><span>Choose 1 compound</span></header><label className="selected"><input type="radio" name={`compound-${concept}`} defaultChecked />BPC-157 5mg<small>Batch BPC-0711 · current leader</small></label><label><input type="radio" name={`compound-${concept}`} />TB-500 10mg<small>Batch TB-0725</small></label><label><input type="radio" name={`compound-${concept}`} />Semaglutide 5mg<small>Batch SEM-0726</small></label><div className="ltpc-chips"><button type="button" className="active">HPLC</button><button type="button">Sterility</button><button type="button">Endotoxin</button></div><button type="button" className="ltpc-primary">Cast vote securely</button></section><section className="ltpc-panel"><header><strong>Live leaderboard</strong><span>18 votes cast</span></header><div className="ltpc-bars"><p><b>01 · BPC-157 5mg</b><i style={{ width: "50%" }} /><span>9 · 50%</span></p><p><b>02 · TB-500 10mg</b><i style={{ width: "33%" }} /><span>6 · 33%</span></p><p><b>03 · Semaglutide 5mg</b><i style={{ width: "17%" }} /><span>3 · 17%</span></p></div></section></aside></div><div className="ltpc-result"><strong>✓ HPLC identity & purity is fully funded</strong><span>The next $42 unlocks sterility and endotoxin testing; signed results will be published here.</span></div></div>;
}

export default function LabTestingPoolConcepts() {
  const [concept, setConcept] = useState<ConceptId>("clinical");
  const [surface, setSurface] = useState<SurfaceId>("organizer");
  const selected = useMemo(() => CONCEPTS.find(item => item.id === concept)!, [concept]);
  return <div className="ltpc-gallery" data-concept={concept}><header className="ltpc-gallery-head"><div><span>Peps Anonymous · Lab Testing Pool</span><h1>Five paired redesigns</h1><p>{selected.detail}</p></div><nav aria-label="Choose a Lab Testing Pool concept">{CONCEPTS.map(item => <button type="button" key={item.id} data-active={concept === item.id || undefined} onClick={() => setConcept(item.id)}><span>{item.number}</span><strong>{item.name}</strong>{concept === item.id ? <Check aria-hidden="true" /> : null}</button>)}</nav><div className="ltpc-surface-switch" role="group" aria-label="Choose a surface">{SURFACES.map(item => <button type="button" key={item.value} value={item.value} data-active={surface === item.value || undefined} onClick={() => setSurface(item.value)}>{item.label}</button>)}</div></header><main className="ltpc-browser-frame">{surface === "organizer" ? <OrganizerSurface concept={concept} /> : <MemberSurface concept={concept} />}</main></div>;
}
```

The two surface functions above are the minimum complete structure. Expand their panels with the shown static controls and `ROUND` values, using React state and scoped class names. Each organizer concept must show the actual V2 navigation and controls; each member concept must show the labelled gauge, threshold steps, vote panel, leaderboard, and results/evidence treatment.

- [ ] **Step 4: Implement five visibly distinct CSS treatments**

Create `_lab-testing-pool-concepts.css` with `.ltpc-gallery` as the root scope. Define base organizer/member shells and concept overrides:

- `[data-concept="clinical"]`: white clinical cards, Peps navy sidebar, blue progress.
- `[data-concept="ledger"]`: squared paper-like panels, serif report titles, audit stamps.
- `[data-concept="timeline"]`: rounded stage rail and lifecycle-forward composition.
- `[data-concept="cockpit"]`: deep navy canvas, light text, blue telemetry glow.
- `[data-concept="ballot"]`: warm white canvas, amber selected ballot, community avatars.

Include `@media (max-width: 1023px)`, `@media (max-width: 767px)`, focus-visible rules, 44px mobile targets, and reduced-motion rules. Do not use selectors outside `.ltpc-gallery`.

- [ ] **Step 5: Run the gallery contract**

Run the command from Step 2.

Expected: 2 tests PASS.

- [ ] **Step 6: Do not touch the generated registry**

Run:

```bash
git diff -- artifacts/mockup-sandbox/src/.generated/mockup-components.ts
git status --short artifacts/mockup-sandbox/src/.generated/mockup-components.ts
```

Expected: the pre-existing `UU` status remains and no new diff authored by this task appears. Do not start the sandbox plugin because it would overwrite the generated conflict.

- [ ] **Step 7: Commit only the gallery source**

```bash
git add artifacts/mockup-sandbox/src/components/mockups/lab-testing-pool-concepts
git commit -m "feat: add lab testing pool concept gallery"
```

## Task 7: Final Integration Verification

**Files:**
- Modify only if a verification failure identifies a testing-pool regression in a task-owned file.

- [ ] **Step 1: Run all focused testing-pool and API tests**

```bash
pnpm --filter @workspace/peps-anonymous run test:testing-pool
cd artifacts/peps-anonymous
node --experimental-strip-types --test src/pages/organiser-v2/api/organiser-api.test.ts src/pages/organiser-v2/api/organiser-resources.test.ts
cd ../mockup-sandbox
node --experimental-strip-types --test src/components/mockups/lab-testing-pool-concepts/lab-testing-pool-concepts.test.ts
```

Expected: all tests PASS.

- [ ] **Step 2: Run existing Organizer v2 regression suites**

```bash
pnpm --filter @workspace/peps-anonymous run test:approved-workspace
pnpm --filter @workspace/peps-anonymous run test:workspace-theme
pnpm --filter @workspace/peps-anonymous run test:peps-native-theme
```

Expected: all commands PASS.

- [ ] **Step 3: Run production typecheck and build**

```bash
pnpm --filter @workspace/peps-anonymous run typecheck
pnpm --filter @workspace/peps-anonymous run build
```

Expected: both commands PASS. Record any unrelated pre-existing failures separately with their exact paths.

- [ ] **Step 4: Record the sandbox conflict as pre-existing without overwriting it**

Do not run the full mockup-sandbox typecheck while `src/.generated/mockup-components.ts` is `UU`; TypeScript cannot parse conflict markers. Verify the gallery with its direct Node contract test and record the full sandbox typecheck as blocked by that exact pre-existing file.

- [ ] **Step 5: Perform visual checks on both production routes**

Start the existing Peps Anonymous dev server and verify:

- `/gborganiser-v2` → Lab Testing Pool at 1440px, 900px, 768px, 390px.
- `/testing/:gbId` at the same widths.
- Active, unconfigured, closed, sent-to-lab, results, existing-vote, and late-opt-in states using available seeded data or browser request overrides.
- Gauge threshold labels remain inside the SVG view box.
- Keyboard focus reaches refresh, settings, product checks, vote choices, test chips, result links, and save actions.
- Reduced-motion emulation removes the gauge draw, endpoint pulse, and bar transitions.

- [ ] **Step 6: Inspect the final diff for scope and whitespace**

```bash
git diff --check
git status --short
git diff --stat
```

Expected: no whitespace errors; only task-owned files are staged or committed; unrelated user changes remain untouched.

- [ ] **Step 7: Commit any task-owned verification fixes**

If Step 1–6 required a fix, stage only the affected testing-pool files and commit:

```bash
git commit -m "fix: complete testing pool verification"
```

If no fixes were needed, do not create an empty commit.

## Plan Self-Review

### Spec coverage

| Spec requirement | Plan coverage |
| --- | --- |
| Five paired mockups | Task 6 creates five concept IDs, two surface renderers, and a gallery contract. |
| Clinical Command organizer | Task 3 supplies live snapshot metrics; Task 4 composes the organizer panels and status counts. |
| Clinical Command member gauge | Tasks 1, 2, and 5 cover geometry, SVG labels/ticks, active endpoint, threshold cards, and placement. |
| Existing API and workflow preservation | Working constraints, Tasks 3–5, and the preserved identifier contract keep endpoints, payloads, eligibility, payments, votes, and results intact. |
| Responsive layout | Shared CSS and Task 5 include desktop, tablet, mobile, overflow, and 44px target rules. |
| Accessibility and motion | Tasks 2 and 6 test focus, progress semantics, labelled controls, reduced motion, and persistent text states. |
| Loading, error, empty, and unconfigured states | Task 4 retains organizer query branches; Task 5 retains member branches and adds retry; visual verification exercises each state. |
| No backend or unrelated-file changes | Working constraints and Task 7 explicitly prohibit route/schema changes and generated-registry edits. |

### Placeholder and ambiguity scan

- No task uses `TBD`, `TODO`, `FIXME`, or an unresolved design decision.
- Every created or modified file has a named responsibility.
- Every test command has an expected result.
- The only intentionally unavailable verification is the full mockup-sandbox typecheck while the pre-existing generated file is `UU`; the direct gallery contract test remains runnable.

### Type consistency check

- `TestingMilestone` and `TestingVoteSummary` are defined once in `testing-pool-model.ts` and consumed by `ClinicalPoolGauge`, `ThresholdStepGrid`, and `VoteLeaderboard`.
- `ApiTestingMilestone` and `ApiTestingVoteSummary` are the API adapter types; page adapters pass structurally compatible values into the shared model types.
- `RoundStatusRail` receives the existing `round.status` string and delegates normalization to `getRoundStageIndex`.
- Organizer uses `snapshot.poolTotal`, `snapshot.contributorCount`, `snapshot.totalVotes`, `snapshot.milestones`, and `snapshot.votes`; member uses its existing variables with the same prop names.
- The five gallery IDs are exactly `clinical`, `ledger`, `timeline`, `cockpit`, and `ballot`; surface IDs are exactly `organizer` and `member`.
