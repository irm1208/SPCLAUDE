import React from 'react';
import { ArrowRight } from 'lucide-react';

const teal = "#1B4D5C";
const tealLight = "#2A6B7E";
const gridLine = "rgba(255,255,255,0.12)";

export function AsgardCard() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: "#D6E5EA" }}>
      <div className="w-full max-w-[420px] relative rounded-2xl overflow-hidden select-none"
        style={{ background: teal, boxShadow: "0 24px 60px rgba(14,44,55,0.35)" }}>

        {/* Grid lines */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Horizontal thirds */}
          <div className="absolute left-0 right-0" style={{ top: "33.3%", height: 1, background: gridLine }} />
          <div className="absolute left-0 right-0" style={{ top: "66.6%", height: 1, background: gridLine }} />
          {/* Vertical thirds */}
          <div className="absolute top-0 bottom-0" style={{ left: "33.3%", width: 1, background: gridLine }} />
          <div className="absolute top-0 bottom-0" style={{ left: "66.6%", width: 1, background: gridLine }} />
        </div>

        {/* Corner marks */}
        {[
          { top: 14, left: 14 },
          { top: 14, right: 14 },
          { bottom: 14, left: 14 },
          { bottom: 14, right: 14 },
        ].map((pos, i) => (
          <span key={i} className="absolute text-[11px] font-bold" style={{ ...pos, color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>×</span>
        ))}

        <div className="relative px-7 pt-7 pb-6">

          {/* Top row — label + status */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: "rgba(255,255,255,0.4)" }}>Group Buy</p>
              <p className="text-[9px] font-medium" style={{ color: "rgba(255,255,255,0.25)" }}>Peptide Collective</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: "rgba(255,255,255,0.4)" }}>Status</p>
              <div className="flex items-center gap-1.5 justify-end mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#4ADE80" }} />
                <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "#4ADE80" }}>Active</p>
              </div>
            </div>
          </div>

          {/* Large name — like the "asgard" wordmark */}
          <div className="mb-8">
            <h2 className="font-black text-white leading-none mb-0.5" style={{ fontSize: 34, letterSpacing: "-0.03em" }}>
              Uther April
            </h2>
            <h2 className="font-black leading-none" style={{ fontSize: 34, letterSpacing: "-0.03em", color: "rgba(255,255,255,0.35)" }}>
              Group Buy
            </h2>
          </div>

          {/* Mid section — days + close date in grid cells */}
          <div className="grid grid-cols-2 gap-px mb-px" style={{ background: gridLine }}>
            <div className="py-4 pr-4" style={{ background: teal }}>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>Days Remaining</p>
              <p className="font-black text-white" style={{ fontSize: 52, letterSpacing: "-2px", lineHeight: 1 }}>8</p>
            </div>
            <div className="py-4 pl-4" style={{ background: teal }}>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>Closes</p>
              <p className="text-[22px] font-black text-white leading-tight">Apr 22</p>
              <p className="text-[11px] font-medium mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>2026</p>
            </div>
          </div>

          {/* Bottom info row */}
          <div className="grid grid-cols-2 gap-px mb-6" style={{ background: gridLine }}>
            <div className="py-3 pr-4" style={{ background: teal }}>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>Manufacturer</p>
              <p className="text-[12px] font-semibold text-white">Uther · UK</p>
            </div>
            <div className="py-3 pl-4" style={{ background: teal }}>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>Organiser</p>
              <p className="text-[12px] font-semibold text-white">Admin</p>
            </div>
          </div>

          {/* CTA */}
          <button className="w-full py-3 rounded-xl text-[13px] font-bold flex items-center justify-center gap-2"
            style={{ background: "rgba(255,255,255,0.1)", color: "white", border: "1px solid rgba(255,255,255,0.15)" }}>
            Order Now <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
