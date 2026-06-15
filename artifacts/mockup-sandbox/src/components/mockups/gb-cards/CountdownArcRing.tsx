import React from 'react';
import { Dna, MapPin, ChevronRight, Package } from 'lucide-react';

const accent = "#A78BFA";
const total = 30;
const remaining = 8;
const SIZE = 140;
const STROKE = 8;
const R = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;
const progress = ((total - remaining) / total) * CIRC;

export function CountdownArcRing() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: "#080512" }}>
      <div className="w-full max-w-[360px] rounded-2xl overflow-hidden" style={{ background: "linear-gradient(160deg, #0F0A1E 0%, #1D1040 100%)", boxShadow: "0 12px 40px rgba(0,0,0,0.55)" }}>

        <div className="relative px-6 pt-7 pb-6">
          <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 50% 30%, ${accent}18 0%, transparent 60%)` }} />

          {/* Label */}
          <div className="flex items-center gap-1.5 mb-5">
            <Dna className="w-3.5 h-3.5" style={{ color: accent }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: accent }}>Group Buy</span>
          </div>

          {/* Name */}
          <h3 className="text-[18px] font-bold text-white leading-snug mb-5">Uther April Group Buy</h3>

          {/* SVG arc ring + number */}
          <div className="flex justify-center mb-4">
            <div className="relative flex items-center justify-center" style={{ width: SIZE, height: SIZE }}>
              <svg width={SIZE} height={SIZE} className="absolute inset-0" style={{ transform: "rotate(-90deg)" }}>
                {/* Track */}
                <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={STROKE} />
                {/* Progress (elapsed) */}
                <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke={`${accent}40`} strokeWidth={STROKE}
                  strokeDasharray={`${progress} ${CIRC}`} strokeLinecap="round" />
                {/* Remaining */}
                <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke={accent} strokeWidth={STROKE}
                  strokeDasharray={`${CIRC - progress} ${CIRC}`} strokeDashoffset={-progress} strokeLinecap="round" />
              </svg>
              <div className="relative text-center">
                <p className="text-[42px] font-black text-white leading-none" style={{ letterSpacing: "-2px" }}>8</p>
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: accent }}>days</p>
              </div>
            </div>
          </div>

          <p className="text-center text-[11px] mb-5" style={{ color: "rgba(255,255,255,0.35)" }}>Closes Apr 22, 2026 · {total - remaining} of {total} days elapsed</p>

          <div style={{ height: 1, background: "rgba(255,255,255,0.07)" }} className="mb-4" />

          {/* Meta */}
          <div className="flex items-center justify-center gap-4 mb-4 flex-wrap text-[11px]" style={{ color: "rgba(255,255,255,0.45)" }}>
            <span><MapPin className="inline w-3 h-3 mr-0.5 -mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }} />Uther · UK</span>
            <span>by Admin</span>
            <span><Package className="inline w-3 h-3 mr-0.5" />1 · USD</span>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold shrink-0" style={{ color: "#10B981" }}>
              <span className="w-2 h-2 rounded-full" style={{ background: "#10B981" }} />Active
            </span>
            <button className="flex-1 py-2.5 rounded-xl text-[13px] font-bold flex items-center justify-center gap-1.5 text-white"
              style={{ background: `linear-gradient(90deg, ${accent}CC, ${accent})`, boxShadow: `0 4px 20px -6px ${accent}99` }}>
              Order Now <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
