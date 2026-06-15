import React from 'react';
import { Leaf, MapPin, ChevronRight, Package, Calendar } from 'lucide-react';

const accent = "#34D399";

export function LayoutCompactRow() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: "#030A05" }}>
      <div className="w-full max-w-[560px] space-y-3">

        {/* Card row — imagine 3 of these stacked */}
        {[
          { name: "Uther April Group Buy", days: 8, date: "Apr 22", status: "active" },
          { name: "Gonadorelin Spring Run", days: 3, date: "Apr 17", status: "active" },
          { name: "BPC-157 Bulk Order", days: 14, date: "Apr 28", status: "active" },
        ].map((gb, i) => (
          <div key={i} className="rounded-xl flex items-center gap-0 overflow-hidden" style={{ background: "#0E2414", border: "1px solid rgba(52,211,153,0.12)", boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>

            {/* Left: accent bar + days */}
            <div className="flex flex-col items-center justify-center px-4 py-4 shrink-0" style={{ minWidth: 72, borderRight: "1px solid rgba(52,211,153,0.1)" }}>
              <p className="text-[26px] font-black text-white leading-none">{gb.days}</p>
              <p className="text-[9px] font-bold uppercase tracking-wider mt-0.5" style={{ color: accent }}>days</p>
            </div>

            {/* Center: name + meta */}
            <div className="flex-1 px-4 py-3 min-w-0">
              <p className="text-[14px] font-bold text-white truncate">{gb.name}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="flex items-center gap-1 text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                  <Leaf className="w-3 h-3" style={{ color: accent }} />Uther · UK
                </span>
                <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>·</span>
                <span className="flex items-center gap-1 text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                  <Calendar className="w-3 h-3" />{gb.date}
                </span>
                <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>·</span>
                <span className="flex items-center gap-1 text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                  <Package className="w-3 h-3" />1 · USD
                </span>
              </div>
            </div>

            {/* Right: status + CTA */}
            <div className="flex items-center gap-2 pr-4 shrink-0">
              <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full" style={{ background: "#10B98120", color: "#10B981", border: "1px solid #10B98130" }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#10B981" }} />Active
              </span>
              <button className="flex items-center gap-1 px-3 py-2 rounded-lg text-[12px] font-bold"
                style={{ background: accent, color: "#031A0A", boxShadow: `0 2px 12px -4px ${accent}80` }}>
                Order <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}

        <p className="text-center text-[11px]" style={{ color: "rgba(255,255,255,0.2)" }}>← This layout shows multiple GBs in a list</p>
      </div>
    </div>
  );
}
