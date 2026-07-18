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

export interface GaugePoint {
  x: number;
  y: number;
}

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

function finitePositive(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function polarPoint(angle: number, radius: number = GAUGE.radius): GaugePoint {
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

export function buildGaugeModel(
  raisedInput: number,
  input: TestingMilestone[],
): GaugeModel {
  const milestones = input
    .map(milestone => ({
      ...milestone,
      amount: finitePositive(milestone.amount),
    }))
    .filter(milestone => milestone.amount > 0)
    .sort((left, right) => left.amount - right.amount);
  const raised = finitePositive(raisedInput);
  const goal = milestones.at(-1)?.amount ?? 0;
  const ratio = goal > 0 ? Math.min(raised / goal, 1) : 0;
  const progressPct = Math.round(ratio * 10_000) / 100;
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
    const horizontalPosition = Math.cos(((angle - 90) * Math.PI) / 180);

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
      textAnchor: horizontalPosition > 0.22
        ? "start" as const
        : horizontalPosition < -0.22
          ? "end" as const
          : "middle" as const,
    };
  });

  return {
    raised,
    goal,
    progressPct,
    trackPath: describeGaugeArc(
      GAUGE.startAngle,
      GAUGE.startAngle + GAUGE.sweepAngle,
    ),
    segments,
    thresholds,
    endpoint: polarPoint(endpointAngle),
  };
}

export function buildLeaderboardRows(
  votes: TestingVoteSummary[],
  totalVotes: number,
): LeaderboardRow[] {
  const denominator = finitePositive(totalVotes);

  return votes
    .map(vote => ({ ...vote, totalVotes: finitePositive(vote.totalVotes) }))
    .sort((left, right) => right.totalVotes - left.totalVotes)
    .map((vote, index) => ({
      rank: index + 1,
      peptideName: vote.peptideName,
      totalVotes: vote.totalVotes,
      percentage: denominator > 0
        ? Math.round((vote.totalVotes / denominator) * 1_000) / 10
        : 0,
      vials: vote.vials,
    }));
}

export function getRoundStageIndex(status: string): number {
  const stageByStatus: Record<RoundStatus, number> = {
    active: 0,
    closed: 1,
    sent_to_lab: 2,
    results_received: 3,
  };

  return stageByStatus[status as RoundStatus] ?? 0;
}
