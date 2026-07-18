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
