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
  return `${currency}${value.toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}`;
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
  const contributors = Number.isFinite(contributorCount)
    ? Math.max(0, Math.trunc(contributorCount))
    : 0;
  const contributorLabel = `${contributors} ${contributors === 1 ? "CONTRIBUTOR" : "CONTRIBUTORS"}`;
  const fundingLabel = `Testing pool funding: ${money(model.raised, currency)} of ${money(model.goal, currency)}`;

  return (
    <div
      className="clinical-pool-gauge"
      data-compact={compact || undefined}
      role="progressbar"
      aria-label={fundingLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={model.progressPct}
      aria-valuetext={`${money(model.raised, currency)} of ${money(model.goal, currency)} funded`}
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

        {model.thresholds.map(threshold => {
          const cueX = threshold.textAnchor === "start"
            ? threshold.labelPoint.x
            : threshold.textAnchor === "end"
              ? threshold.labelPoint.x - 14
              : threshold.labelPoint.x - 7;

          return (
            <g
              key={`${threshold.label}-${threshold.amount}`}
              className="clinical-pool-gauge__threshold"
              data-state={threshold.state}
            >
              <line
                className="clinical-pool-gauge__guide"
                x1={threshold.tickEnd.x}
                y1={threshold.tickEnd.y}
                x2={threshold.labelPoint.x}
                y2={threshold.labelPoint.y - 7}
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
                x={threshold.labelPoint.x}
                y={threshold.labelPoint.y}
                textAnchor={threshold.textAnchor}
              >
                {money(threshold.amount, currency)}
              </text>
              <text
                className="clinical-pool-gauge__threshold-name"
                x={threshold.labelPoint.x}
                y={threshold.labelPoint.y + 14}
                textAnchor={threshold.textAnchor}
              >
                {threshold.label}
              </text>
              {threshold.state === "unlocked" ? (
                <CheckCircle2
                  className="clinical-pool-gauge__check"
                  x={cueX}
                  y={threshold.labelPoint.y + 19}
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

      <span className="clinical-testing__sr-only">
        {money(model.raised, currency)} raised toward {money(model.goal, currency)} from {contributors} {contributors === 1 ? "contributor" : "contributors"}. {statusLabel}.
      </span>
    </div>
  );
}
