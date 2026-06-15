import { useEffect, useState } from "react";

const POOL = 45;
const TIER1 = 120;
const TIER2 = 200;

function fmt(n: number) { return `$${n}`; }

export function LiquidFill() {
  const [fill, setFill] = useState(0);
  useEffect(() => { const t = setTimeout(() => setFill(1), 200); return () => clearTimeout(t); }, []);

  const tubeH = 200;
  const tubeW = 60;
  const tubeX = 50;
  const tubeY = 20;
  const borderR = 10;

  const maxH = tubeH - 4;
  const tier1Y = tubeH * (1 - TIER1 / TIER2);
  const fillH = Math.min(maxH, (POOL / TIER2) * maxH) * fill;
  const fillY = tubeH - fillH;

  const tier1Hit = POOL >= TIER1;
  const fillColor = tier1Hit ? "#10B981" : POOL > TIER1 * 0.5 ? "#3B82F6" : "#60A5FA";

  return (
    <div style={{ background: "linear-gradient(135deg, #0A0F1E 0%, #0D1B2A 100%)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "ui-monospace, monospace" }}>
      <div style={{ display: "flex", gap: 48, alignItems: "center" }}>
        <div style={{ position: "relative" }}>
          <svg width={160} height={tubeH + tubeY * 2 + 40} viewBox={`0 0 160 ${tubeH + tubeY * 2 + 40}`} style={{ overflow: "visible" }}>
            <defs>
              <clipPath id="tubeClip">
                <rect x={tubeX} y={tubeY} width={tubeW} height={tubeH} rx={borderR} />
              </clipPath>
              <linearGradient id="liqGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#60A5FA" />
                <stop offset="100%" stopColor="#2563EB" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            <rect x={tubeX} y={tubeY} width={tubeW} height={tubeH} rx={borderR} fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)" strokeWidth={1.5} />

            <rect
              x={tubeX + 2} y={tubeY + fillY} width={tubeW - 4} height={fillH}
              fill={fillColor} clipPath="url(#tubeClip)"
              style={{ transition: "height 1.6s cubic-bezier(0.22,1,0.36,1), y 1.6s cubic-bezier(0.22,1,0.36,1)" }}
              rx={6}
            />

            <rect x={tubeX - 12} y={tubeY + tier1Y} width={tubeW + 24} height={1.5} fill="#3B82F6" opacity={0.6} />
            <text x={tubeX + tubeW + 16} y={tubeY + tier1Y + 1} fill="#60A5FA" fontSize={9} dominantBaseline="middle" fontWeight="700" letterSpacing="0.08em">
              {fmt(TIER1)} ENDOTOXIN
            </text>

            <rect x={tubeX - 12} y={tubeY + 2} width={tubeW + 24} height={1.5} fill="#8B5CF6" opacity={0.6} />
            <text x={tubeX + tubeW + 16} y={tubeY + 2} fill="#A78BFA" fontSize={9} dominantBaseline="middle" fontWeight="700" letterSpacing="0.08em">
              {fmt(TIER2)} MASS/PURITY
            </text>

            <text x={tubeX + tubeW / 2} y={tubeY + tubeH + 20} textAnchor="middle" fill="#F9FAFB" fontSize={22} fontWeight="800">
              {fmt(POOL)}
            </text>
            <text x={tubeX + tubeW / 2} y={tubeY + tubeH + 38} textAnchor="middle" fill="#4B5563" fontSize={9} letterSpacing="0.12em">
              RAISED
            </text>
          </svg>
        </div>

        <div style={{ color: "#F9FAFB" }}>
          <p style={{ color: "#6B7280", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 12 }}>Lab Testing Pool</p>
          <p style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 4 }}>STEP 01 — ENDOTOXIN TEST</p>
          <div style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)", borderRadius: 6, padding: "8px 12px", marginBottom: 12 }}>
            <p style={{ fontSize: 20, fontWeight: 800, color: "#3B82F6" }}>{fmt(TIER1)}</p>
            <p style={{ fontSize: 9, color: "#6B7280", letterSpacing: "0.1em" }}>{Math.round((POOL / TIER1) * 100)}% FILLED</p>
          </div>
          <p style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 4 }}>STEP 02 — MASS/PURITY</p>
          <div style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: 6, padding: "8px 12px" }}>
            <p style={{ fontSize: 20, fontWeight: 800, color: "#8B5CF6" }}>{fmt(TIER2)}</p>
            <p style={{ fontSize: 9, color: "#6B7280", letterSpacing: "0.1em" }}>LOCKED</p>
          </div>
        </div>
      </div>
    </div>
  );
}
