import React from 'react';
import { Dna, MapPin, ChevronRight, Package, Calendar } from 'lucide-react';

const accent = "#A78BFA";

export function LayoutSideFlag() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: "#0A0812" }}>
      <div className="w-full max-w-[380px] rounded-2xl overflow-hidden flex" style={{ background: "#12111E", boxShadow: "0 12px 40px rgba(0,0,0,0.5)" }}>

        {/* Thin left accent bar */}
        <div className="w-1 shrink-0 rounded-l-2xl" style={{ background: `linear-gradient(180deg, ${accent} 0%, ${accent}44 100%)` }} />

        {/* Content */}
        <div className="flex-1 px-5 py-5 space-y-4">

          {/* Top row: icon label + status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Dna className="w-3.5 h-3.5" style={{ color: accent }} />
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: accent }}>Group Buy</span>
            </div>
            <span className="flex items-center gap-1.5 text-[10px] font-semibold" style={{ color: "#10B981" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#10B981" }} />Active
            </span>
          </div>

          {/* Name */}
          <div>
            <h3 className="text-[20px] font-bold text-white leading-tight">Uther April Group Buy</h3>
            <div className="flex items-center gap-1.5 mt-1">
              <MapPin className="w-3 h-3" style={{ color: "rgba(255,255,255,0.3)" }} />
              <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>Uther · UK · by Admin</span>
            </div>
          </div>

          <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />

          {/* Metadata grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
            {[
              { label: "Closes", value: "Apr 22" },
              { label: "Days Left", value: "8 days" },
              { label: "Products", value: "1 product" },
              { label: "Currency", value: "USD" },
            ].map((item, i) => (
              <div key={i}>
                <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{item.label}</p>
                <p className="text-[13px] font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>

          <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />

          {/* Info */}
          <p className="text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
            Order will be made for peptides in stock
          </p>

          {/* CTA */}
          <button className="w-full py-2.5 rounded-xl text-[13px] font-bold flex items-center justify-center gap-1.5 text-white"
            style={{ background: `linear-gradient(90deg, ${accent}CC, ${accent}88)`, border: `1px solid ${accent}44` }}>
            Place Order <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
