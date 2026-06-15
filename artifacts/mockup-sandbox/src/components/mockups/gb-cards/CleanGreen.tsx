import React from 'react';
import { Leaf, MapPin, ChevronRight, Info, Package } from 'lucide-react';

const accent = "#34D399";
const bg = "linear-gradient(135deg, #061209 0%, #0E2414 100%)";
const blob = "rgba(52,211,153,0.14)";

export function CleanGreen() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#030A05" }}>
      <div className="w-full max-w-[360px] rounded-2xl overflow-hidden relative" style={{ background: bg, boxShadow: "0 8px 32px rgba(0,0,0,0.45)" }}>

        <div className="absolute top-0 right-0 w-44 h-44 rounded-full pointer-events-none -translate-y-20 translate-x-20" style={{ background: blob, filter: "blur(32px)" }} />

        <div className="relative px-5 pt-5 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-2">
                <Leaf className="w-3.5 h-3.5 shrink-0" style={{ color: accent }} />
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: accent }}>Group Buy</span>
              </div>
              <h3 className="text-[19px] font-bold text-white leading-snug tracking-tight">Uther April Group Buy</h3>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>Uther</span>
                <MapPin className="w-2.5 h-2.5" style={{ color: "rgba(255,255,255,0.3)" }} />
                <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>UK</span>
                <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
                <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>by Admin</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[22px] font-bold text-white leading-tight">Apr 22</p>
              <p className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>8d left</p>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 space-y-3">
          <p className="text-[12px] leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
            Order will be made for peptides in stock
          </p>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium"
              style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <Package className="w-3 h-3" />1 product
            </span>
            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold"
              style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.08)" }}>
              USD
            </span>
          </div>
        </div>

        <div className="px-5 pb-5 pt-1 flex items-center justify-between gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: "#10B981" }} />
            <span className="text-[11px] font-semibold" style={{ color: "rgba(255,255,255,0.6)" }}>Active</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)" }}>
              <Info className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.4)" }} />
            </button>
            <button className="flex items-center gap-1 px-4 py-2 rounded-full text-[12px] font-bold text-white"
              style={{ background: accent, boxShadow: `0 4px 16px -4px ${accent}80` }}>
              Order <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
