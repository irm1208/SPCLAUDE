import React from 'react';
import { FlaskConical, ChevronRight, MapPin, Package, Info, Calendar } from 'lucide-react';

const accent = "#5B8DEF";

export function LayoutHorizontal() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: "#0A0F1A" }}>
      <div className="w-full max-w-[480px] rounded-2xl overflow-hidden flex" style={{ boxShadow: "0 12px 40px rgba(0,0,0,0.5)" }}>

        {/* Left panel — accent column */}
        <div className="flex flex-col items-center justify-between py-6 px-5 shrink-0" style={{ width: 120, background: "linear-gradient(180deg, #0D2050 0%, #061230 100%)" }}>
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(91,141,239,0.2)" }}>
              <FlaskConical className="w-5 h-5" style={{ color: accent }} />
            </div>
            <span className="text-[9px] font-bold uppercase tracking-widest text-center leading-tight" style={{ color: "rgba(255,255,255,0.4)" }}>Group<br />Buy</span>
          </div>

          <div className="flex flex-col items-center text-center">
            <p className="text-[42px] font-black leading-none text-white">8</p>
            <p className="text-[11px] font-semibold mt-0.5" style={{ color: accent }}>days left</p>
            <div className="mt-3 flex items-center gap-1">
              <Calendar className="w-3 h-3" style={{ color: "rgba(255,255,255,0.3)" }} />
              <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>Apr 22</span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: "#10B981" }} />
            <span className="text-[9px] font-bold" style={{ color: "#10B981" }}>Active</span>
          </div>
        </div>

        {/* Right panel — content */}
        <div className="flex-1 flex flex-col" style={{ background: "#111827" }}>
          <div className="px-5 pt-5 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <h3 className="text-[18px] font-bold text-white leading-snug">Uther April Group Buy</h3>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.45)" }}>Uther</span>
              <MapPin className="w-2.5 h-2.5" style={{ color: "rgba(255,255,255,0.25)" }} />
              <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.45)" }}>UK</span>
              <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
              <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.45)" }}>by Admin</span>
            </div>
          </div>

          <div className="px-5 py-4 flex-1 space-y-3">
            <p className="text-[12px] leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
              Order will be made for peptides in stock
            </p>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <Package className="w-3 h-3" />1 product
              </span>
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.07)" }}>
                USD
              </span>
            </div>
          </div>

          <div className="px-5 pb-5 pt-1" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <button className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-bold text-white"
              style={{ background: accent, boxShadow: `0 4px 20px -6px ${accent}90` }}>
              Place Order <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
