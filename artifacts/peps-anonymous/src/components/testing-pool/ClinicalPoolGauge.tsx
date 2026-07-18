import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import {
  buildGaugeModel,
  describeGaugeArc,
  type TestingMilestone,
} from "./testing-pool-model";
import "./clinical-testing-pool.css";

const SEGMENT_COLORS = ["#2D6BCC", "#6E91D0", "#E9A020", "#16A34A"];
const THRESHOLD_LABEL_MIN_X = 116;
const THRESHOLD_LABEL_MAX_X = 304;
const THRESHOLD_LABEL_MAX_CHARS = 20;

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
  return `${currency}${value.toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}`;
}

function constrainThresholdLabelX(
  x: number,
  textAnchor: "start" | "middle" | "end",
): number {
  if (textAnchor === "end") return Math.max(THRESHOLD_LABEL_MIN_X, x);
  if (textAnchor === "start") return Math.min(THRESHOLD_LABEL_MAX_X, x);
  return Math.min(
    THRESHOLD_LABEL_MAX_X,
    Math.max(THRESHOLD_LABEL_MIN_X, x),
  );
}

function truncateThresholdLabel(label: string): string {
  const normalized = label.trim();
  if (normalized.length <= THRESHOLD_LABEL_MAX_CHARS) return normalized;
  return `${normalized.slice(0, THRESHOLD_LABEL_MAX_CHARS - 1).trimEnd()}…`;
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
  const descriptionId = useId();
  const reduceMotion = useReducedMotion();
  const model = buildGaugeModel(raised, milestones);
  const contributors = Number.isFinite(contributorCount)
    ? Math.max(0, Math.trunc(contributorCount))
    : 0;
  const contributorLabel = `${contributors} ${contributors === 1 ? "CONTRIBUTOR" : "CONTRIBUTORS"}`;
  const accessibleContributorLabel = `${contributors} ${contributors === 1 ? "contributor" : "contributors"}`;
  const fundingLabel = `Testing pool funding: ${money(model.raised, currency)} of ${money(model.goal, currency)}`;
  const progressValueText = `${money(model.raised, currency)} of ${money(model.goal, currency)} funded; ${model.progressPct}% funded; ${accessibleContributorLabel}; ${statusLabel}`;
  const thresholdSummary = model.thresholds.map(threshold => {
    const target = money(threshold.amount, currency);
    if (threshold.state === "unlocked") {
      return `${threshold.label}, ${target} target unlocked`;
    }
    return `${threshold.label}, ${target} target locked with ${money(threshold.remaining, currency)} remaining`;
  }).join(". ");

  return (
    <div
      className="clinical-pool-gauge"
      data-compact={compact || undefined}
    >
      <div
        className="clinical-pool-gauge__progress"
        role="progressbar"
        aria-label={fundingLabel}
        aria-describedby={descriptionId}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={model.progressPct}
        aria-valuetext={progressValueText}
      >
        <svg viewBox="0 0 420 380" aria-hidden="true">
          <path className="clinical-pool-gauge__track" d={model.trackPath} />

          {model.segments.map((segment, index) => {
            if (segment.filledEndAngle <= segment.startAngle) return null;

            return (
              <motion.path
                key={`${segment.endAmount}-${index}`}
                className="clinical-pool-gauge__fill"
                d={describeGaugeArc(segment.startAngle, segment.filledEndAngle)}
                stroke={SEGMENT_COLORS[index % SEGMENT_COLORS.length]}
                initial={reduceMotion ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{
                  duration: 0.9,
                  delay: reduceMotion ? 0 : index * 0.08,
                  ease: [0.22, 1, 0.36, 1],
                }}
              />
            );
          })}

          {model.thresholds.map((threshold, index) => {
            const labelX = constrainThresholdLabelX(
              threshold.labelPoint.x,
              threshold.textAnchor,
            );
            const labelY = threshold.labelPoint.y;
            const cueX = threshold.textAnchor === "start"
              ? labelX
              : threshold.textAnchor === "end"
                ? labelX - 14
                : labelX - 7;

            return (
              <g
                key={`${threshold.label}-${threshold.amount}-${index}`}
                className="clinical-pool-gauge__threshold"
                data-state={threshold.state}
              >
                <line
                  className="clinical-pool-gauge__guide"
                  x1={threshold.tickEnd.x}
                  y1={threshold.tickEnd.y}
                  x2={labelX}
                  y2={labelY - 7}
                />
                <line
                  className="clinical-pool-gauge__tick"
                  x1={threshold.tickStart.x}
                  y1={threshold.tickStart.y}
                  x2={threshold.tickEnd.x}
                  y2={threshold.tickEnd.y}
                />
                <circle
                  className="clinical-pool-gauge__marker"
                  data-state={threshold.state}
                  cx={threshold.marker.x}
                  cy={threshold.marker.y}
                  r="5"
                />
                <text
                  className="clinical-pool-gauge__threshold-label"
                  x={labelX}
                  y={labelY}
                  textAnchor={threshold.textAnchor}
                >
                  {money(threshold.amount, currency)}
                </text>
                <text
                  className="clinical-pool-gauge__threshold-name"
                  x={labelX}
                  y={labelY + 14}
                  textAnchor={threshold.textAnchor}
                >
                  {truncateThresholdLabel(threshold.label)}
                </text>
                {threshold.state === "unlocked" ? (
                  <CheckCircle2
                    className="clinical-pool-gauge__check"
                    x={cueX}
                    y={labelY + 19}
                    width="14"
                    height="14"
                    strokeWidth="2.5"
                  />
                ) : null}
              </g>
            );
          })}

          {active && model.goal > 0 ? (
            <circle
              className="clinical-pool-gauge__endpoint"
              data-animated={!reduceMotion || undefined}
              cx={model.endpoint.x}
              cy={model.endpoint.y}
              r="7"
            />
          ) : null}

          <text
            className="clinical-pool-gauge__eyebrow"
            x="210"
            y="162"
            textAnchor="middle"
          >
            POOL TOTAL
          </text>
          <text
            className="clinical-pool-gauge__total"
            x="210"
            y="202"
            textAnchor="middle"
          >
            {money(model.raised, currency)}
          </text>
          <text
            className="clinical-pool-gauge__contributors"
            x="210"
            y="226"
            textAnchor="middle"
          >
            {contributorLabel}
          </text>
          <text
            className="clinical-pool-gauge__status"
            x="210"
            y="245"
            textAnchor="middle"
          >
            {statusLabel.toUpperCase()} · {model.progressPct}% FUNDED
          </text>
        </svg>
      </div>

      <span id={descriptionId} className="clinical-testing__sr-only">
        {money(model.raised, currency)} raised toward {money(model.goal, currency)} from {accessibleContributorLabel}. {statusLabel}.
        {thresholdSummary ? ` Thresholds: ${thresholdSummary}.` : ""}
      </span>
    </div>
  );
}
