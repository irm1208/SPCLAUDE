import React from 'react';
import { Zap, MapPin, ChevronRight } from 'lucide-react';

const accent = "#F59E0B";

export function LayoutCountdown() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: "#0E0900" }}>
      <div className="w-full max-w-[360px] rounded-2xl overflow-hidden text-center relative" style={{ background: "linear-gradient(160deg, #1A1208 0%, #2A1C0A 100%)", boxShadow: "0 12px 40px rgba(0,0,0,0.55)" }}>

        {/* Radial glow */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 50% 35%, ${accent}22 0%, transparent 65%)` }} />

        <div className="relative px-6 pt-7 pb-6">

          {/* GB label */}
          <div className="flex items-center justify-center gap-1.5 mb-3">
            <Zap className="w-3.5 h-3.5" style={{ color: accent }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: accent }}>Group Buy</span>
          </div>

          {/* Name — centred, prominent */}
          <h3 className="text-[20px] font-bold text-white leading-snug mb-5">Uther April Group Buy</h3>

          {/* BIG countdown */}
          <div className="mb-1">
            <p className="font-black text-white leading-none" style={{ fontSize: 88, letterSpacing: "-4px", textShadow: `0 0 60px ${accent}55` }}>8</p>
          </div>
          <p className="text-[13px] font-bold uppercase tracking-widest mb-1" style={{ color: accent }}>days remaining</p>

          {/* End date */}
          <p className="text-[12px] mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>Closes Apr 22, 2026</p>

          {/* Key info pill */}
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-medium"
              style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <MapPin className="w-3 h-3" style={{ color: "rgba(255,255,255,0.3)" }} />
              Uther · UK · by Admin
            </span>
          </div>

          {/* Status + CTA */}
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold shrink-0" style={{ color: "#10B981" }}>
              <span className="w-2 h-2 rounded-full" style={{ background: "#10B981" }} />Active
            </span>
            <button className="flex-1 py-2.5 rounded-xl text-[13px] font-bold flex items-center justify-center gap-1.5"
              style={{ background: accent, boxShadow: `0 4px 20px -6px ${accent}99`, color: "#1A0F00" }}>
              Order Now <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
