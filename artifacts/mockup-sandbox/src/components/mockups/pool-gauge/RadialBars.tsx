import { useEffect, useState } from "react";

const POOL = 45;
const TIER1 = 120;
const TIER2 = 200;
const SEGMENTS = 32;

function fmt(n: number) {
  return `$${n}`;
}

export function RadialBars() {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 100); return () => clearTimeout(t); }, []);

  const SIZE = 280;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const outerR = 110;
  const innerR = 60;
  const barW = 10;

  const tier1Seg = Math.round((TIER1 / TIER2) * SEGMENTS);
  const filledSeg = Math.round((POOL / TIER2) * SEGMENTS);

  const totalArcDeg = 260;
  const startDeg = 140;

  function segRect(i: number) {
    const frac = i / SEGMENTS;
    const deg = startDeg + frac * totalArcDeg;
    const rad = (deg * Math.PI) / 180;
    const isFilled = animated && i < filledSeg;
    const isTier1Zone = i < tier1Seg;
    const color = isFilled
      ? (isTier1Zone ? "#3B82F6" : "#8B5CF6")
      : isTier1Zone
        ? "rgba(59,130,246,0.12)"
        : "rgba(139,92,246,0.12)";

    const midR = (outerR + innerR) / 2;
    const halfW = barW / 2;
    const angle = deg - 90;
    const angleRad = (angle * Math.PI) / 180;

    const x1 = cx + Math.cos(rad - Math.PI / 2) * innerR;
    const y1 = cy + Math.sin(rad - Math.PI / 2) * innerR;
    const x2 = cx + Math.cos(rad - Math.PI / 2) * outerR;
    const y2 = cy + Math.sin(rad - Math.PI / 2) * outerR;

    return { x1, y1, x2, y2, color };
  }

  return (
    <div style={{ background: "#0f1117", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "ui-monospace, monospace" }}>
      <div style={{ textAlign: "center" }}>
        <p style={{ color: "#6B7280", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 8 }}>LAB TESTING POOL</p>
        <div style={{ position: "relative", width: SIZE, height: SIZE, margin: "0 auto" }}>
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ overflow: "visible" }}>
            {Array.from({ length: SEGMENTS }, (_, i) => {
              const s = segRect(i);
              return (
                <line
                  key={i}
                  x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
                  stroke={s.color}
                  strokeWidth={7}
                  strokeLinecap="round"
                  style={{ transition: `stroke 0.05s ${i * 20}ms` }}
                />
              );
            })}
            <text x={cx} y={cy - 10} textAnchor="middle" fill="#F9FAFB" fontSize={28} fontWeight="800">
              {fmt(POOL)}
            </text>
            <text x={cx} y={cy + 14} textAnchor="middle" fill="#6B7280" fontSize={9} fontWeight="700" letterSpacing="0.14em">
              OF {fmt(TIER2)} GOAL
            </text>
            <text x={cx} y={cy + 30} textAnchor="middle" fill="#4B5563" fontSize={8} letterSpacing="0.1em">
              {Math.round((POOL / TIER2) * 100)}% FUNDED
            </text>
          </svg>
        </div>

        <div style={{ display: "flex", gap: 32, justifyContent: "center", marginTop: 12 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, justifyContent: "center" }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: "#3B82F6" }} />
              <span style={{ color: "#6B7280", fontSize: 9, letterSpacing: "0.1em" }}>ENDOTOXIN</span>
            </div>
            <p style={{ color: "#F9FAFB", fontSize: 14, fontWeight: 700, marginTop: 2 }}>{fmt(TIER1)}</p>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, justifyContent: "center" }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: "#8B5CF6" }} />
              <span style={{ color: "#6B7280", fontSize: 9, letterSpacing: "0.1em" }}>MASS/PURITY</span>
            </div>
            <p style={{ color: "#F9FAFB", fontSize: 14, fontWeight: 700, marginTop: 2 }}>{fmt(TIER2)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
