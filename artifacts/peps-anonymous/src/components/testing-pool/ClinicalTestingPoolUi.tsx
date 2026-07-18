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

function money(value: number, currency: string): string {
  return `${currency}${value.toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}`;
}

export interface ClinicalPanelProps {
  title: string;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ClinicalPanel({
  title,
  meta,
  children,
  className = "",
}: ClinicalPanelProps) {
  return (
    <section className={`clinical-panel ${className}`.trim()}>
      <header className="clinical-panel__head">
        <h3>{title}</h3>
        {meta ? <div className="clinical-panel__meta">{meta}</div> : null}
      </header>
      <div className="clinical-panel__body">{children}</div>
    </section>
  );
}

export interface RoundMetric {
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "success" | "warning" | "info";
}

export function RoundMetricStrip({ metrics }: { metrics: RoundMetric[] }) {
  return (
    <section
      className="clinical-testing__metrics"
      aria-label="Testing pool summary"
    >
      {metrics.map(metric => (
        <article key={metric.label} data-tone={metric.tone ?? "default"}>
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
          <small>{metric.detail}</small>
        </article>
      ))}
    </section>
  );
}

const STAGES = [
  ["Pool opened", "Contribution rules published"],
  ["Fund & vote", "Contributors choose the test batch"],
  ["Sent to lab", "Sample and payment dispatched"],
  ["Results published", "Signed evidence shared"],
] as const;

export function RoundStatusRail({ status }: { status: string }) {
  const activeIndex = getRoundStageIndex(status);

  return (
    <ol
      className="clinical-testing__status-rail"
      aria-label="Testing round progress"
    >
      {STAGES.map(([label, detail], index) => {
        const state = index < activeIndex
          ? "complete"
          : index === activeIndex
            ? "active"
            : "future";

        return (
          <li
            key={label}
            data-state={state}
            aria-current={state === "active" ? "step" : undefined}
          >
            <span className="clinical-testing__stage-marker" aria-hidden="true">
              {state === "complete" ? <Check /> : index + 1}
            </span>
            <div>
              <strong>{label}</strong>
              <small>{detail}</small>
              <em>{state === "complete" ? "Complete" : state === "active" ? "Current stage" : "Upcoming"}</em>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export interface ThresholdStepGridProps {
  milestones: TestingMilestone[];
  raised: number;
  currency?: string;
}

export function ThresholdStepGrid({
  milestones,
  raised,
  currency = "$",
}: ThresholdStepGridProps) {
  const model = buildGaugeModel(raised, milestones);

  return (
    <div className="clinical-testing__threshold-grid">
      {model.thresholds.map((threshold, index) => {
        const unlocked = threshold.state === "unlocked";
        const stateLabel = unlocked ? "Unlocked" : "Locked";

        return (
          <article
            key={`${threshold.label}-${threshold.amount}`}
            data-state={threshold.state}
          >
            <div className="clinical-testing__threshold-head">
              <span>Step {String(index + 1).padStart(2, "0")} · {stateLabel}</span>
              {unlocked
                ? <Check aria-hidden="true" />
                : <LockKeyhole aria-hidden="true" />}
            </div>
            <strong>{threshold.label}</strong>
            <small>
              {unlocked
                ? `${money(threshold.amount, currency)} target reached`
                : `${money(threshold.remaining, currency)} remaining · target ${money(threshold.amount, currency)}`}
            </small>
          </article>
        );
      })}
    </div>
  );
}

export interface VoteLeaderboardProps {
  votes: TestingVoteSummary[];
  totalVotes: number;
  batches?: Record<string, string>;
}

export function VoteLeaderboard({
  votes,
  totalVotes,
  batches = {},
}: VoteLeaderboardProps) {
  const rows = buildLeaderboardRows(votes, totalVotes);

  return (
    <div className="clinical-testing__leaderboard" aria-label="Testing vote leaderboard">
      {rows.map(row => {
        const visualPercentage = Math.min(100, Math.max(0, row.percentage));

        return (
          <article key={`${row.peptideName}-${row.rank}`}>
            <span className="clinical-testing__rank">
              {String(row.rank).padStart(2, "0")}
            </span>
            <div className="clinical-testing__leader-name">
              <strong>{row.peptideName}</strong>
              {batches[row.peptideName]
                ? <small>Batch {batches[row.peptideName]}</small>
                : null}
            </div>
            <div
              className="clinical-testing__vote-bar"
              role="progressbar"
              aria-label={`${row.peptideName} share of votes`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={visualPercentage}
            >
              <i aria-hidden="true" style={{ width: `${visualPercentage}%` }} />
            </div>
            <span className="clinical-testing__vote-value">
              {row.totalVotes.toLocaleString("en-US")} votes · {row.percentage}%
            </span>
          </article>
        );
      })}
    </div>
  );
}
