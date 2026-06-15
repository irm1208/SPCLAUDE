import React from 'react';
import { ChevronRight } from 'lucide-react';

const SIZE = 200;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 78;
const TICK_R_OUTER = 92;
const TICK_R_INNER = 86;
const CIRC = 2 * Math.PI * R;

// 270° arc starting from 7:30 (bottom-left)
const ARC_DEG = 270;
const ARC = (ARC_DEG / 360) * CIRC;
const GAP = CIRC - ARC;
// rotate -225° puts the stroke start at the 7:30 position
const ROT = -225;

const daysLeft = 8;
const totalDays = 30;
const elapsed = (totalDays - daysLeft) / totalDays;
const elapsedArc = elapsed * ARC;
const remainingArc = (1 - elapsed) * ARC;

function polarXY(angleDeg: number, r: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

// Handle positions: start at 225° (7:30), end at 225+270=495°→135° (4:30)
const handleStart = polarXY(225, R);
const handleEnd = polarXY(135, R);

// Tick marks — 48 ticks over the 270° arc
const ticks = Array.from({ length: 49 }).map((_, i) => {
  const angleDeg = 225 + (i / 48) * 270;
  const outer = polarXY(angleDeg, TICK_R_OUTER);
  const inner = polarXY(angleDeg, i % 4 === 0 ? TICK_R_INNER - 3 : TICK_R_INNER + 1);
  return { outer, inner, major: i % 4 === 0 };
});

const bgColor = "#1E2756";
const accentBlue = "#5B8DEF";
const accentPurple = "#C084FC";
const dimColor = "rgba(255,255,255,0.08)";

export function DialCard() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#161E42" }}>
      <div className="w-full max-w-[340px] rounded-3xl overflow-hidden" style={{ background: bgColor }}>
        <div className="px-6 pt-7 pb-6">

          {/* Title */}
          <div className="mb-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>TITLE</p>
            <p className="text-[17px] font-bold text-white leading-snug pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
              Uther April Group Buy
            </p>
          </div>

          {/* Dial */}
          <div className="flex justify-center my-4">
            <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>

              {/* Tick marks */}
              {ticks.map((t, i) => (
                <line key={i}
                  x1={t.outer.x} y1={t.outer.y}
                  x2={t.inner.x} y2={t.inner.y}
                  stroke={t.major ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.12)"}
                  strokeWidth={t.major ? 1.5 : 0.8}
                  strokeLinecap="round"
                />
              ))}

              {/* Track (full 270° arc, dim) */}
              <circle cx={CX} cy={CY} r={R}
                fill="none" stroke={dimColor} strokeWidth={7}
                strokeDasharray={`${ARC} ${GAP}`}
                strokeLinecap="round"
                transform={`rotate(${ROT} ${CX} ${CY})`}
              />

              {/* Elapsed arc — blue */}
              <circle cx={CX} cy={CY} r={R}
                fill="none" stroke={accentBlue} strokeWidth={7}
                strokeDasharray={`${elapsedArc} ${CIRC - elapsedArc}`}
                strokeLinecap="round"
                transform={`rotate(${ROT} ${CX} ${CY})`}
              />

              {/* Remaining arc — purple, offset after elapsed */}
              <circle cx={CX} cy={CY} r={R}
                fill="none" stroke={accentPurple} strokeWidth={7}
                strokeDasharray={`${remainingArc - 4} ${CIRC - remainingArc + 4}`}
                strokeDashoffset={-elapsedArc + 2}
                strokeLinecap="round"
                transform={`rotate(${ROT} ${CX} ${CY})`}
              />

              {/* Handle at start (7:30) */}
              <circle cx={handleStart.x} cy={handleStart.y} r={9} fill="white" />
              <circle cx={handleStart.x} cy={handleStart.y} r={5} fill="#3B4DBF" />

              {/* Handle at remaining/end boundary */}
              {(() => {
                const elapsedDeg = (elapsed * ARC_DEG);
                const handleMid = polarXY(225 + elapsedDeg, R);
                return (
                  <>
                    <circle cx={handleMid.x} cy={handleMid.y} r={9} fill="white" />
                    <circle cx={handleMid.x} cy={handleMid.y} r={5} fill="#7C3AED" />
                  </>
                );
              })()}

              {/* Center */}
              <circle cx={CX} cy={CY} r={50} fill="#192245" />
              <text x={CX} y={CY - 7} textAnchor="middle" fill="white"
                fontSize="26" fontWeight="900" fontFamily="system-ui, sans-serif"
                style={{ letterSpacing: "-1px" }}>
                {daysLeft}
              </text>
              <text x={CX} y={CY + 7} textAnchor="middle"
                fill="rgba(255,255,255,0.45)" fontSize="8.5" fontFamily="system-ui, sans-serif">
                days left
              </text>
              <text x={CX} y={CY + 18} textAnchor="middle"
                fill="rgba(255,255,255,0.25)" fontSize="7.5" fontFamily="system-ui, sans-serif">
                of {totalDays}
              </text>
            </svg>
          </div>

          {/* Info rows */}
          <div className="space-y-0">
            {[
              { label: "Closes", value: "Apr 22, 2026" },
              { label: "Organiser", value: "Admin" },
              { label: "Manufacturer", value: "Uther · UK" },
              { label: "Status", value: "● Active", green: true },
            ].map((row, i, arr) => (
              <div key={i} className="flex items-center justify-between py-3"
                style={{ borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.07)" : "none" }}>
                <span className="text-[12px]" style={{ color: "rgba(255,255,255,0.4)" }}>{row.label}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-semibold" style={{ color: row.green ? "#4ADE80" : "rgba(255,255,255,0.85)" }}>{row.value}</span>
                  <ChevronRight className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.2)" }} />
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button className="w-full py-3 rounded-2xl text-[13px] font-bold text-white mt-4"
            style={{ background: "linear-gradient(135deg, #3B4DBF, #5B6EF0)", boxShadow: "0 6px 24px -6px rgba(91,110,240,0.6)" }}>
            Order Now
          </button>
        </div>
      </div>
    </div>
  );
}
