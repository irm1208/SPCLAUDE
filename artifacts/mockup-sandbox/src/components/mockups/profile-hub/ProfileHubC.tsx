import {
  Package,
  Syringe,
  Beaker,
  Scale,
  Boxes,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { Shell } from "./Shell";

// LAYOUT C — Index + canvas.
// Hypothesis: metrics don't deserve hero treatment — they're a
// reference. Drop them into a narrow vertical index on the right
// (list rows, not cards) so the main column can give the activity /
// trend area real space. Inverts weight distribution from A/B.

export function ProfileHubC() {
  return (
    <Shell>
      <section
        className="px-6 pb-6 grid gap-5"
        style={{ gridTemplateColumns: "1fr 280px" }}
      >
        {/* LEFT — activity canvas owns the space */}
        <div
          className="rounded-2xl p-6 flex flex-col"
          style={{
            background: "#FFFFFF",
            border: "1px solid #E5E7EB",
          }}
        >
          <div className="flex items-end justify-between">
            <div>
              <div className="text-[10px] tracking-[0.22em] uppercase font-semibold text-slate-400">
                This month
              </div>
              <h2 className="text-[22px] font-semibold tracking-tight text-slate-900 mt-1">
                Your activity
              </h2>
            </div>
            <div className="text-right">
              <div
                className="text-[11px] font-semibold inline-flex items-center gap-1"
                style={{ color: "#047857" }}
              >
                <TrendingUp className="w-3 h-3" />
                +18% vs last month
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                orders & GB participation
              </div>
            </div>
          </div>

          {/* Sparkline */}
          <div className="mt-6">
            <Sparkline />
            <div className="mt-1 flex justify-between text-[10px] text-slate-400 font-mono">
              {["Nov", "Dec", "Jan", "Feb", "Mar", "Apr"].map(m => (
                <span key={m}>{m}</span>
              ))}
            </div>
          </div>

          {/* Highlights */}
          <div className="mt-auto pt-6">
            <div className="text-[10px] tracking-[0.22em] uppercase font-semibold text-slate-400">
              Highlights
            </div>
            <ul className="mt-3 space-y-2.5">
              <Highlight
                dot="#2E5BFF"
                title="Joined 3 group buys"
                meta="Tirzepatide · BPC-157 · Retatrutide"
              />
              <Highlight
                dot="#047857"
                title="Order #1182 delivered on time"
                meta="Uther · 2 days ahead of estimate"
              />
              <Highlight
                dot="#B45309"
                title="New batch assay published"
                meta="ZE30-0319 · 99.89% — best in 12 mo"
              />
            </ul>
          </div>
        </div>

        {/* RIGHT — metrics index */}
        <aside
          className="rounded-2xl flex flex-col"
          style={{
            background: "#FFFFFF",
            border: "1px solid #E5E7EB",
          }}
        >
          <div
            className="px-4 py-3 flex items-center justify-between"
            style={{ borderBottom: "1px solid #F1F5F9" }}
          >
            <span className="text-[10px] tracking-[0.22em] uppercase font-semibold text-slate-500">
              Overview
            </span>
          </div>
          <IndexRow
            icon={<Package className="w-3.5 h-3.5" />}
            label="My orders"
            value="12"
            active
          />
          <IndexRow
            icon={<Syringe className="w-3.5 h-3.5" />}
            label="Active compounds"
            value="0"
          />
          <IndexRow
            icon={<Beaker className="w-3.5 h-3.5" />}
            label="Blood tests"
            value="0"
          />
          <IndexRow
            icon={<Scale className="w-3.5 h-3.5" />}
            label="GLP-1 entries"
            value="0"
          />

          <div
            className="px-4 py-3 flex items-center justify-between mt-1"
            style={{
              borderTop: "1px solid #F1F5F9",
              borderBottom: "1px solid #F1F5F9",
              background: "#F8FAFC",
            }}
          >
            <span className="text-[10px] tracking-[0.22em] uppercase font-semibold text-slate-500 flex items-center gap-1.5">
              <Boxes className="w-3 h-3" />
              Group buys
            </span>
            <span className="text-[10px] font-semibold text-[#2E5BFF] flex items-center gap-0.5">
              Organiser
              <ArrowRight className="w-3 h-3" />
            </span>
          </div>
          <IndexRow label="Active" value="3" accent="#047857" compact />
          <IndexRow label="Draft" value="0" compact />
          <IndexRow label="Total" value="3" compact last />
        </aside>
      </section>
    </Shell>
  );
}

function IndexRow({
  icon,
  label,
  value,
  active,
  accent,
  compact,
  last,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  active?: boolean;
  accent?: string;
  compact?: boolean;
  last?: boolean;
}) {
  const v0 = value === "0";
  return (
    <div
      className={`flex items-center gap-3 px-4 ${
        compact ? "py-2" : "py-3"
      }`}
      style={{
        borderBottom: last ? undefined : "1px solid #F1F5F9",
        background: active ? "#F8FAFF" : undefined,
      }}
    >
      {icon && (
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
          style={{
            background: v0 ? "#F3F4F6" : "#EEF2FF",
            color: v0 ? "#94A3B8" : "#2E5BFF",
          }}
        >
          {icon}
        </div>
      )}
      <span
        className="text-[12px] flex-1 min-w-0 truncate"
        style={{
          color: v0 ? "#94A3B8" : "#334155",
          paddingLeft: !icon && compact ? 30 : 0,
        }}
      >
        {label}
      </span>
      <span
        className="font-semibold tabular-nums"
        style={{
          fontSize: compact ? 14 : 18,
          color: v0 ? "#94A3B8" : accent ?? "#0F172A",
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </span>
      {!compact && <ArrowRight className="w-3.5 h-3.5 text-slate-300" />}
    </div>
  );
}

function Highlight({
  dot,
  title,
  meta,
}: {
  dot: string;
  title: string;
  meta: string;
}) {
  return (
    <li className="flex items-start gap-2.5">
      <span
        className="mt-[7px] w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: dot }}
      />
      <div className="min-w-0">
        <div className="text-[13px] font-semibold text-slate-900 leading-tight">
          {title}
        </div>
        <div className="text-[11px] text-slate-500 leading-tight mt-0.5">
          {meta}
        </div>
      </div>
    </li>
  );
}

function Sparkline() {
  // 6 months of orders + GB participation trend
  const orders = [2, 3, 3, 4, 5, 7];
  const gbs = [0, 1, 1, 2, 2, 3];
  const W = 560;
  const H = 160;
  const max = 8;
  const toX = (i: number) => (i / (orders.length - 1)) * (W - 20) + 10;
  const toY = (v: number) => H - 20 - (v / max) * (H - 40);
  const pts = (arr: number[]) =>
    arr.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height: 160 }}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="sp-orders-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2E5BFF" stopOpacity="0.22" />
          <stop offset="1" stopColor="#2E5BFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Gridlines */}
      {[0, 2, 4, 6, 8].map(g => (
        <line
          key={g}
          x1={10}
          x2={W - 10}
          y1={toY(g)}
          y2={toY(g)}
          stroke="#F1F5F9"
          strokeWidth="1"
        />
      ))}
      {/* Orders area */}
      <path
        d={`M ${pts(orders)
          .split(" ")
          .map((p, i) => (i === 0 ? p : `L ${p}`))
          .join(" ")} L ${toX(orders.length - 1)},${H - 20} L ${toX(0)},${H - 20} Z`}
        fill="url(#sp-orders-fill)"
      />
      <polyline
        points={pts(orders)}
        fill="none"
        stroke="#2E5BFF"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <polyline
        points={pts(gbs)}
        fill="none"
        stroke="#047857"
        strokeWidth="1.5"
        strokeDasharray="4 3"
      />
      {/* End nodes */}
      <circle cx={toX(orders.length - 1)} cy={toY(orders[orders.length - 1])} r={4} fill="#2E5BFF" stroke="#fff" strokeWidth="2" />
      <circle cx={toX(gbs.length - 1)} cy={toY(gbs[gbs.length - 1])} r={3.5} fill="#047857" stroke="#fff" strokeWidth="2" />
      {/* Legend */}
      <g transform={`translate(${W - 180}, 12)`}>
        <circle cx={6} cy={6} r={3} fill="#2E5BFF" />
        <text x={15} y={9} fill="#475569" fontSize="10" fontFamily="Inter">
          orders
        </text>
        <circle cx={72} cy={6} r={3} fill="#047857" />
        <text x={81} y={9} fill="#475569" fontSize="10" fontFamily="Inter">
          group buys
        </text>
      </g>
    </svg>
  );
}
