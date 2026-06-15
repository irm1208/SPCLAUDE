import { useEffect, useState } from "react";

const POOL = 45;
const TIER1 = 120;
const TIER2 = 200;

function fmt(n: number) { return `$${n}`; }
function polarToXY(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const s = polarToXY(cx, cy, r, startDeg);
  const e = polarToXY(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

export function ConcentricRings() {
  const [prog, setProg] = useState(0);
  useEffect(() => { const t = setTimeout(() => setProg(1), 150); return () => clearTimeout(t); }, []);

  const SIZE = 280;
  const cx = SIZE / 2;
  const cy = SIZE / 2;

  const START = 135;
  const END = 405;
  const TOTAL = END - START;

  const r1 = 110;
  const r2 = 80;
  const sw = 14;

  const frac1 = Math.min(1, POOL / TIER1) * prog;
  const frac2 = POOL > TIER1 ? Math.min(1, (POOL - TIER1) / (TIER2 - TIER1)) * prog : 0;

  const end1 = START + frac1 * TOTAL;
  const end2 = START + frac2 * TOTAL;

  const tip1 = polarToXY(cx, cy, r1, end1);
  const tip2 = frac2 > 0 ? polarToXY(cx, cy, r2, end2) : null;

  return (
    <div style={{ background: "#F8F9FA", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <p style={{ color: "#9CA3AF", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>Pool Progress</p>

        <div style={{ position: "relative", width: SIZE, height: SIZE, margin: "0 auto" }}>
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ overflow: "visible" }}>
            <defs>
              <filter id="shadow1">
                <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#3B82F6" floodOpacity="0.5" />
              </filter>
              <filter id="shadow2">
                <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#8B5CF6" floodOpacity="0.5" />
              </filter>
            </defs>

            <path d={describeArc(cx, cy, r1, START, END)} fill="none" stroke="#E5E7EB" strokeWidth={sw} strokeLinecap="round" />
            <path
              d={describeArc(cx, cy, r1, START, end1)}
              fill="none" stroke={frac1 >= 1 ? "#10B981" : "#3B82F6"} strokeWidth={sw} strokeLinecap="round"
              filter={frac1 > 0 ? "url(#shadow1)" : undefined}
              style={{ transition: "stroke-dasharray 1.2s cubic-bezier(0.22,1,0.36,1)" }}
            />
            {frac1 > 0 && <circle cx={tip1.x} cy={tip1.y} r={7} fill={frac1 >= 1 ? "#10B981" : "#3B82F6"} />}

            <path d={describeArc(cx, cy, r2, START, END)} fill="none" stroke="#E5E7EB" strokeWidth={sw} strokeLinecap="round" />
            {frac2 > 0 && <>
              <path
                d={describeArc(cx, cy, r2, START, end2)}
                fill="none" stroke={frac2 >= 1 ? "#10B981" : "#8B5CF6"} strokeWidth={sw} strokeLinecap="round"
                filter="url(#shadow2)"
              />
              <circle cx={tip2!.x} cy={tip2!.y} r={7} fill={frac2 >= 1 ? "#10B981" : "#8B5CF6"} />
            </>}

            <text x={cx} y={cy - 12} textAnchor="middle" fill="#111827" fontSize={26} fontWeight="800">{fmt(POOL)}</text>
            <text x={cx} y={cy + 10} textAnchor="middle" fill="#9CA3AF" fontSize={11}>collected</text>
          </svg>
        </div>

        <div style={{ display: "flex", gap: 24, justifyContent: "center", marginTop: 8 }}>
          {[
            { label: "Endotoxin", goal: TIER1, color: "#3B82F6", r: r1 },
            { label: "Mass/Purity", goal: TIER2, color: "#8B5CF6", r: r2 },
          ].map((t) => (
            <div key={t.label} style={{ textAlign: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}>
                <div style={{ width: 8, height: 3, borderRadius: 9, background: t.color }} />
                <span style={{ color: "#6B7280", fontSize: 10 }}>{t.label}</span>
              </div>
              <p style={{ color: "#374151", fontWeight: 700, fontSize: 15, marginTop: 2 }}>{fmt(t.goal)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
