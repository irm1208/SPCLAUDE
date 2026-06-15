import React from 'react';
import { FlaskConical, MapPin, ChevronRight, Package } from 'lucide-react';

const accent = "#5B8DEF";

export function CountdownFullBleed() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: "#060B14" }}>
      <div className="w-full max-w-[360px] rounded-2xl overflow-hidden relative" style={{ background: "linear-gradient(160deg, #0A1628 0%, #111F3A 100%)", boxShadow: "0 12px 40px rgba(0,0,0,0.55)" }}>

        {/* Giant ghost number — background texture */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
          style={{ top: -20 }}>
          <span className="font-black text-white" style={{ fontSize: 260, letterSpacing: "-16px", opacity: 0.04, lineHeight: 1 }}>8</span>
        </div>

        {/* Glow */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 50% 40%, ${accent}18 0%, transparent 55%)` }} />

        <div className="relative px-6 pt-7 pb-6">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-1.5">
              <FlaskConical className="w-3.5 h-3.5" style={{ color: accent }} />
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: accent }}>Group Buy</span>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: "#10B98118", color: "#10B981", border: "1px solid #10B98128" }}>● Active</span>
          </div>

          {/* Name */}
          <h3 className="text-[19px] font-bold text-white leading-snug mb-6">Uther April Group Buy</h3>

          {/* Number + label inline */}
          <div className="flex items-baseline gap-3 mb-1">
            <span className="font-black text-white" style={{ fontSize: 72, letterSpacing: "-4px", lineHeight: 1, textShadow: `0 0 60px ${accent}55` }}>8</span>
            <div>
              <p className="text-[14px] font-bold uppercase tracking-wider" style={{ color: accent }}>days</p>
              <p className="text-[12px] font-bold uppercase tracking-wider" style={{ color: accent }}>remaining</p>
            </div>
          </div>

          <p className="text-[11px] mb-6" style={{ color: "rgba(255,255,255,0.35)" }}>Closes Apr 22, 2026</p>

          <div style={{ height: 1, background: "rgba(255,255,255,0.07)" }} className="mb-4" />

          {/* Meta + info */}
          <p className="text-[12px] mb-3 leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
            Order will be made for peptides in stock
          </p>
          <div className="flex items-center gap-3 mb-4 text-[11px] flex-wrap" style={{ color: "rgba(255,255,255,0.4)" }}>
            <span><MapPin className="inline w-3 h-3 mr-0.5 -mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }} />Uther · UK</span>
            <span>by Admin</span>
            <span><Package className="inline w-3 h-3 mr-0.5" />1 · USD</span>
          </div>

          {/* CTA */}
          <button className="w-full py-2.5 rounded-xl text-[13px] font-bold flex items-center justify-center gap-1.5 text-white"
            style={{ background: accent, boxShadow: `0 4px 20px -6px ${accent}99` }}>
            Order Now <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
