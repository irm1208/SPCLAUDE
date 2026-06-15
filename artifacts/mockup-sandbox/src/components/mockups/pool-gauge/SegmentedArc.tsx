import { useEffect, useState } from "react";

const POOL = 45;
const TIER1 = 120;
const TIER2 = 200;
const TOTAL_SEGS = 40;

function fmt(n: number) { return `$${n}`; }

function polarToXY(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export function SegmentedArc() {
  const [animProg, setAnimProg] = useState(0);
  useEffect(() => {
    let start: number;
    function tick(ts: number) {
      if (!start) start = ts;
      const p = Math.min(1, (ts - start) / 1200);
      setAnimProg(p < 1 ? p : 1);
      if (p < 1) requestAnimationFrame(tick);
    }
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);

  const SIZE = 280;
  const cx = SIZE / 2;
  const cy = SIZE / 2 + 20;
  const R = 100;
  const START = 150;
  const END = 390;
  const TOTAL = END - START;

  const tier1Segs = Math.round((TIER1 / TIER2) * TOTAL_SEGS);
  const filledSegs = Math.round((POOL / TIER2) * TOTAL_SEGS * animProg);

  const segGap = 3;
  const segArc = TOTAL / TOTAL_SEGS - segGap;

  return (
    <div style={{
      background: "#FAFAFA", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "system-ui, sans-serif"
    }}>
      <div style={{ textAlign: "center" }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ overflow: "visible" }}>
          <defs>
            <linearGradient id="blueGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#2563EB" />
            </linearGradient>
            <linearGradient id="purpleGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#A78BFA" />
              <stop offset="100%" stopColor="#7C3AED" />
            </linearGradient>
          </defs>

          {Array.from({ length: TOTAL_SEGS }, (_, i) => {
            const segStart = START + i * (TOTAL / TOTAL_SEGS);
            const segEnd = segStart + segArc;
            const filled = i < filledSegs;
            const isTier1 = i < tier1Segs;
            const color = filled
              ? (isTier1 ? "#3B82F6" : "#8B5CF6")
              : "#E5E7EB";

            const s = polarToXY(cx, cy, R, segStart);
            const e = polarToXY(cx, cy, R, segEnd);
            const large = segArc > 180 ? 1 : 0;

            return (
              <path
                key={i}
                d={`M ${s.x} ${s.y} A ${R} ${R} 0 ${large} 1 ${e.x} ${e.y}`}
                fill="none"
                stroke={color}
                strokeWidth={10}
                strokeLinecap="round"
              />
            );
          })}

          {/* Divider between tier zones */}
          {(() => {
            const divDeg = START + (tier1Segs / TOTAL_SEGS) * TOTAL;
            const p = polarToXY(cx, cy, R, divDeg);
            const po = polarToXY(cx, cy, R - 18, divDeg);
            return <line x1={p.x} y1={p.y} x2={po.x} y2={po.y} stroke="#D1D5DB" strokeWidth={2} />;
          })()}

          <text x={cx} y={cy - 14} textAnchor="middle" fill="#111827" fontSize={30} fontWeight="900">
            {fmt(POOL)}
          </text>
          <text x={cx} y={cy + 10} textAnchor="middle" fill="#9CA3AF" fontSize={10} letterSpacing="0.1em">
            {Math.round((POOL / TIER2) * 100)}% OF GOAL
          </text>
        </svg>

        <div style={{ display: "flex", gap: 32, justifyContent: "center", marginTop: -16 }}>
          {[
            { label: "Endotoxin", goal: fmt(TIER1), color: "#3B82F6", filled: POOL >= TIER1 },
            { label: "Mass/Purity", goal: fmt(TIER2), color: "#8B5CF6", filled: POOL >= TIER2 },
          ].map(t => (
            <div key={t.label} style={{ textAlign: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, justifyContent: "center" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: t.color }} />
                <span style={{ color: "#9CA3AF", fontSize: 10 }}>{t.label}</span>
              </div>
              <p style={{ color: "#111827", fontWeight: 700, fontSize: 15, marginTop: 2 }}>{t.goal}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
