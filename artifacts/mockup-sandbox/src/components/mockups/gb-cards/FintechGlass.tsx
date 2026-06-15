import React from 'react';
import { MapPin, ArrowRight, Calendar, TrendingDown } from 'lucide-react';

const green = "#4ADE80";

export function FintechGlass() {
  const daysLeft = 8;
  const totalDays = 30;
  const pct = Math.round(((totalDays - daysLeft) / totalDays) * 100);

  return (
    <div className="min-h-screen flex items-center justify-center p-8 relative overflow-hidden"
      style={{ background: "linear-gradient(145deg, #052E16 0%, #14532D 40%, #166534 100%)" }}>

      {/* Background blobs */}
      <div className="absolute w-64 h-64 rounded-full pointer-events-none" style={{ background: "rgba(74,222,128,0.15)", filter: "blur(60px)", top: "5%", right: "5%" }} />
      <div className="absolute w-48 h-48 rounded-full pointer-events-none" style={{ background: "rgba(34,197,94,0.12)", filter: "blur(40px)", bottom: "10%", left: "0%" }} />

      {/* Glass card */}
      <div className="w-full max-w-[360px] rounded-3xl relative overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.08)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.15)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)"
        }}>

        {/* Inner top highlight */}
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)" }} />

        <div className="px-6 pt-6 pb-6">

          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.5)" }}>Group Buy</span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
              style={{ background: "rgba(74,222,128,0.2)", color: green, border: "1px solid rgba(74,222,128,0.3)" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: green }} />Active
            </span>
          </div>

          <h3 className="text-[22px] font-bold text-white leading-tight mb-1.5">Uther April Group Buy</h3>
          <div className="flex items-center gap-1.5 mb-5">
            <MapPin className="w-3 h-3" style={{ color: "rgba(255,255,255,0.4)" }} />
            <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>Uther · UK · by Admin</span>
          </div>

          {/* Frosted stat box */}
          <div className="rounded-2xl px-5 py-4 mb-4"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div className="flex items-end justify-between mb-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.45)" }}>Days Remaining</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-black text-white" style={{ fontSize: 52, letterSpacing: "-2px", lineHeight: 1 }}>{daysLeft}</span>
                  <span className="text-[14px] font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>days</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: "rgba(0,0,0,0.25)" }}>
                <TrendingDown className="w-3.5 h-3.5" style={{ color: green }} />
                <span className="text-[12px] font-bold" style={{ color: green }}>-{pct}%</span>
              </div>
            </div>

            {/* Progress */}
            <div>
              <div className="flex justify-between text-[10px] mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                <span>Time elapsed</span><span>{pct}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.12)" }}>
                <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, #16A34A, ${green})` }} />
              </div>
            </div>
          </div>

          {/* Close date pill row */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex items-center gap-2 flex-1 px-4 py-2.5 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <Calendar className="w-3.5 h-3.5" style={{ color: green }} />
              <div>
                <p className="text-[9px] font-bold uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>Closes</p>
                <p className="text-[12px] font-bold text-white">Apr 22, 2026</p>
              </div>
            </div>
            <div className="flex-1 px-4 py-2.5 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <p className="text-[9px] font-bold uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>Info</p>
              <p className="text-[12px] font-medium text-white">Peptides in stock</p>
            </div>
          </div>

          {/* CTA */}
          <button className="w-full py-3 rounded-2xl text-[14px] font-bold flex items-center justify-center gap-2 text-white"
            style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", backdropFilter: "blur(4px)" }}>
            Order Now <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
