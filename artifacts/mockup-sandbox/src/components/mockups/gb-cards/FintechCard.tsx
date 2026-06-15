import React from 'react';
import { MapPin, ArrowRight, TrendingDown, Calendar } from 'lucide-react';

export function FintechCard() {
  const daysLeft = 8;
  const totalDays = 30;
  const pct = Math.round(((totalDays - daysLeft) / totalDays) * 100);

  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: "#EEF2F7" }}>
      <div className="w-full max-w-[360px] rounded-3xl overflow-hidden" style={{ background: "#FFFFFF", boxShadow: "0 8px 40px rgba(0,0,0,0.10)" }}>

        {/* Green gradient header */}
        <div className="relative px-6 pt-6 pb-5 overflow-hidden" style={{ background: "linear-gradient(135deg, #14532D 0%, #166534 50%, #15803D 100%)" }}>
          {/* Decorative squares — like the Mullet app */}
          <div className="absolute right-4 top-3 opacity-20">
            <div className="grid grid-cols-3 gap-1">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="w-3 h-3 rounded-sm" style={{ background: i % 2 === 0 ? "#4ADE80" : "transparent", border: "1px solid #4ADE8044" }} />
              ))}
            </div>
          </div>

          <div className="relative">
            {/* Status badge */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold mb-3"
              style={{ background: "rgba(74,222,128,0.2)", color: "#4ADE80", border: "1px solid rgba(74,222,128,0.3)" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#4ADE80" }} />
              Active
            </span>

            <p className="text-[11px] font-medium mb-1" style={{ color: "rgba(255,255,255,0.55)" }}>Group Buy</p>
            <h3 className="text-[20px] font-bold text-white leading-snug">Uther April Group Buy</h3>

            <div className="flex items-center gap-1.5 mt-1.5">
              <MapPin className="w-3 h-3" style={{ color: "rgba(255,255,255,0.4)" }} />
              <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.55)" }}>Uther · UK · by Admin</span>
            </div>
          </div>
        </div>

        {/* Main stats area */}
        <div className="px-6 pt-5 pb-4">

          {/* Days remaining — hero stat */}
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#94A3B8" }}>Days Remaining</p>
              <div className="flex items-baseline gap-2">
                <span className="font-black" style={{ fontSize: 52, letterSpacing: "-2px", color: "#0F172A", lineHeight: 1 }}>
                  {daysLeft}
                </span>
                <span className="text-[14px] font-semibold" style={{ color: "#64748B" }}>days</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: "#FEF3C7" }}>
              <TrendingDown className="w-3.5 h-3.5" style={{ color: "#D97706" }} />
              <span className="text-[12px] font-bold" style={{ color: "#D97706" }}>-{pct}%</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-5">
            <div className="flex justify-between text-[10px] font-medium mb-1.5" style={{ color: "#94A3B8" }}>
              <span>Time elapsed</span>
              <span>{pct}%</span>
            </div>
            <div className="w-full rounded-full h-1.5" style={{ background: "#F1F5F9" }}>
              <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg, #166534, #22C55E)" }} />
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "#F1F5F9" }} className="mb-4" />

          {/* Close date row */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#F0FDF4" }}>
                <Calendar className="w-4 h-4" style={{ color: "#16A34A" }} />
              </div>
              <div>
                <p className="text-[10px] font-semibold" style={{ color: "#94A3B8" }}>Closes</p>
                <p className="text-[13px] font-bold" style={{ color: "#0F172A" }}>Apr 22, 2026</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold" style={{ color: "#94A3B8" }}>Info</p>
              <p className="text-[12px] font-medium" style={{ color: "#475569" }}>Peptides in stock</p>
            </div>
          </div>

          {/* CTA */}
          <button className="w-full py-3 rounded-2xl text-[14px] font-bold flex items-center justify-center gap-2 text-white"
            style={{ background: "linear-gradient(135deg, #166534, #16A34A)", boxShadow: "0 4px 20px -4px rgba(22,101,52,0.45)" }}>
            Order Now <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
