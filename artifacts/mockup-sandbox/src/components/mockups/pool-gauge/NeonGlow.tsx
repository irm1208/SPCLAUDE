import { useEffect, useState } from "react";

const POOL = 45;
const TIER1 = 120;
const TIER2 = 200;

function fmt(n: number) { return `$${n}`; }

function polarToXY(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export function NeonGlow() {
  const [prog, setProg] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setProg(1), 100);
    return () => clearTimeout(t);
  }, []);

  const SIZE = 280;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const R1 = 110;
  const R2 = 85;
  const SW = 12;

  const START = 135;
  const TOTAL = 270;
  const circ1 = 2 * Math.PI * R1;
  const circ2 = 2 * Math.PI * R2;

  const tier1Frac = Math.min(0.95, TIER1 / TIER2);
  const tier1EndDeg = START + tier1Frac * TOTAL;
  const arc1Span = tier1Frac * TOTAL;
  const arc2StartDeg = tier1EndDeg + 8;
  const arc2Span = Math.max(0, (START + TOTAL) - arc2StartDeg);

  const arc1Len = (arc1Span / 360) * circ1;
  const arc1Off = -(START / 360) * circ1;
  const arc2Len = (arc2Span / 360) * circ2;
  const arc2Off = -(arc2StartDeg / 360) * circ2;

  const fill1Frac = Math.min(1, POOL / TIER1) * prog;
  const fill1Len = fill1Frac * arc1Len;

  const fill2Frac = POOL > TIER1 ? Math.min(1, (POOL - TIER1) / (TIER2 - TIER1)) * prog : 0;
  const fill2Len = fill2Frac * arc2Len;

  const tipDeg = POOL < TIER1
    ? START + fill1Frac * arc1Span
    : arc2StartDeg + fill2Frac * arc2Span;
  const tipR = POOL < TIER1 ? R1 : R2;
  const tip = polarToXY(cx, cy, tipR, tipDeg);

  const pct = Math.round((POOL / TIER2) * 100);

  return (
    <div style={{
      background: "radial-gradient(ellipse at center, #0D0D1A 0%, #050508 100%)",
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "ui-monospace, monospace"
    }}>
      <div style={{ textAlign: "center" }}>
        <p style={{ color: "#374151", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>
          LAB TESTING POOL
        </p>

        <div style={{ position: "relative", width: SIZE, height: SIZE, margin: "0 auto" }}>
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ overflow: "visible" }}>
            <defs>
              <filter id="neon1" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="neon2" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="glowTip">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Arc 1 track */}
            <circle cx={cx} cy={cy} r={R1} fill="none" stroke="rgba(59,130,246,0.08)" strokeWidth={SW}
              strokeDasharray={`${arc1Len} ${circ1}`} strokeDashoffset={arc1Off} strokeLinecap="butt"
              transform={`rotate(-90 ${cx} ${cy})`} />
            {/* Arc 1 fill */}
            <circle cx={cx} cy={cy} r={R1} fill="none" stroke="#3B82F6" strokeWidth={SW}
              strokeDasharray={`${fill1Len} ${circ1}`} strokeDashoffset={arc1Off} strokeLinecap="butt"
              transform={`rotate(-90 ${cx} ${cy})`}
              filter="url(#neon1)"
              style={{ transition: "stroke-dasharray 1.4s cubic-bezier(0.22,1,0.36,1)" }}
            />

            {/* Arc 2 track */}
            <circle cx={cx} cy={cy} r={R2} fill="none" stroke="rgba(139,92,246,0.08)" strokeWidth={SW}
              strokeDasharray={`${arc2Len} ${circ2}`} strokeDashoffset={arc2Off} strokeLinecap="butt"
              transform={`rotate(-90 ${cx} ${cy})`} />
            {/* Arc 2 fill */}
            {fill2Len > 0 && (
              <circle cx={cx} cy={cy} r={R2} fill="none" stroke="#8B5CF6" strokeWidth={SW}
                strokeDasharray={`${fill2Len} ${circ2}`} strokeDashoffset={arc2Off} strokeLinecap="butt"
                transform={`rotate(-90 ${cx} ${cy})`}
                filter="url(#neon2)"
                style={{ transition: "stroke-dasharray 1s ease-out 0.4s" }}
              />
            )}

            {/* Tip glow dot */}
            {prog > 0 && (
              <circle cx={tip.x} cy={tip.y} r={6} fill={POOL < TIER1 ? "#60A5FA" : "#A78BFA"}
                filter="url(#glowTip)" />
            )}

            {/* Center text */}
            <text x={cx} y={cy - 14} textAnchor="middle" fill="#F9FAFB" fontSize={30} fontWeight="900">
              {fmt(POOL)}
            </text>
            <text x={cx} y={cy + 8} textAnchor="middle" fill="#374151" fontSize={10} letterSpacing="0.12em">
              {pct}% FUNDED
            </text>
            <text x={cx} y={cy + 26} textAnchor="middle" fill="#1F2937" fontSize={9} letterSpacing="0.1em">
              GOAL: {fmt(TIER2)}
            </text>
          </svg>
        </div>

        {/* Tier labels */}
        <div style={{ display: "flex", gap: 40, justifyContent: "center", marginTop: 8 }}>
          {[
            { label: "ENDOTOXIN TEST", goal: fmt(TIER1), color: "#3B82F6", glow: "rgba(59,130,246,0.4)" },
            { label: "MASS/PURITY", goal: fmt(TIER2), color: "#8B5CF6", glow: "rgba(139,92,246,0.4)" },
          ].map(t => (
            <div key={t.label} style={{ textAlign: "center" }}>
              <p style={{ fontSize: 8, letterSpacing: "0.15em", color: t.color, marginBottom: 3 }}>{t.label}</p>
              <p style={{ fontSize: 16, fontWeight: 800, color: t.color, textShadow: `0 0 12px ${t.glow}` }}>{t.goal}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
