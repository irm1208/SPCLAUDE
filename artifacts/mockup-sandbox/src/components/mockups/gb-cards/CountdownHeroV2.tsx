import React from 'react';
import { ChevronRight, Info, Package, Users, FlaskConical, MapPin, X } from 'lucide-react';

export function CountdownHeroV2() {
  const accent = "#5B8DEF";
  const accentDim = "#5B8DEF30";
  const accentBorder = "#5B8DEF50";

  return (
    <div className="min-h-screen flex items-center justify-center p-6 font-sans"
      style={{ background: "#090A0F" }}>
      <div className="w-full max-w-[380px] rounded-3xl overflow-hidden shadow-2xl relative"
        style={{ background: "#111318", border: "1px solid rgba(255,255,255,0.06)" }}>

        {/* Ambient glow */}
        <div className="absolute top-0 left-0 right-0 h-48 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 50% -10%, ${accent}28 0%, transparent 70%)` }} />

        {/* ── Header: name + label ── */}
        <div className="relative px-5 pt-5 pb-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>

          {/* Label row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <FlaskConical className="w-3 h-3" style={{ color: accent }} />
              <span className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: accent }}>Group Buy</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                style={{ background: "#10B98120", border: "1px solid #10B98140" }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#10B981" }} />
                <span className="text-[10px] font-semibold" style={{ color: "#10B981" }}>Active</span>
              </div>
              <button className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.07)" }}>
                <X className="w-3 h-3" style={{ color: "rgba(255,255,255,0.4)" }} />
              </button>
            </div>
          </div>

          {/* GB Name — top, large */}
          <h2 className="text-[21px] font-bold text-white leading-snug tracking-tight mb-0.5">
            Uther April Group Buy
          </h2>

          {/* Sub-info row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.45)" }}>
              by <span style={{ color: "rgba(255,255,255,0.65)" }}>Admin</span>
            </span>
            <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
            <span className="flex items-center gap-0.5 text-[11px]" style={{ color: "rgba(255,255,255,0.45)" }}>
              <MapPin className="w-3 h-3" />UK
            </span>
            <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
            <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.45)" }}>
              Uther
            </span>
          </div>
        </div>

        {/* ── Countdown circle ── */}
        <div className="flex flex-col items-center justify-center py-5 relative">
          <div className="relative w-40 h-40 flex items-center justify-center">
            <svg className="w-full h-full absolute inset-0 -rotate-90">
              <circle cx="80" cy="80" r="72" fill="none"
                stroke="rgba(255,255,255,0.04)" strokeWidth="5" />
              <circle cx="80" cy="80" r="72" fill="none"
                stroke={accent} strokeWidth="5"
                strokeDasharray="452.4" strokeDashoffset="100"
                strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 8px ${accent}80)` }} />
            </svg>

            {/* Inner glow */}
            <div className="absolute inset-0 rounded-full"
              style={{ background: `radial-gradient(circle, ${accent}10 0%, transparent 70%)` }} />

            <div className="flex flex-col items-center z-10">
              <span className="text-5xl font-black text-white leading-none tracking-tight">22</span>
              <span className="text-sm font-bold tracking-[0.25em] uppercase mt-0.5"
                style={{ color: "rgba(255,255,255,0.6)" }}>APR</span>
              <span className="mt-2 text-[10px] font-bold tracking-widest uppercase px-2.5 py-0.5 rounded-full"
                style={{ background: accentDim, color: accent, border: `1px solid ${accentBorder}` }}>
                8d Left
              </span>
            </div>
          </div>
        </div>

        {/* ── Info section ── */}
        <div className="px-5 pb-5 space-y-3">
          {/* Info snippet */}
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "rgba(255,255,255,0.35)" }} />
            <p className="text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
              Order will be made for peptides in stock
            </p>
          </div>

          {/* Chips row */}
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium"
              style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <Package className="w-3 h-3" />1 product
            </span>
            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold"
              style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.07)" }}>
              USD
            </span>
          </div>

          {/* CTA */}
          <button className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl font-bold text-white text-sm"
            style={{ background: `linear-gradient(135deg, ${accent} 0%, #3B6ED4 100%)`, boxShadow: `0 6px 20px -6px ${accent}70` }}>
            Order
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Footer util row */}
          <div className="flex items-center justify-end gap-2 pt-0.5">
            <button className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.06)" }}>
              <Info className="w-3 h-3" style={{ color: "rgba(255,255,255,0.35)" }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
