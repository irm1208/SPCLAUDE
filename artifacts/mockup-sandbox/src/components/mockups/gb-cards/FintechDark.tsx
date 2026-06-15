import React from 'react';
import { MapPin, ArrowRight, Calendar, User, ChevronDown } from 'lucide-react';

const green = "#22C55E";

export function FintechDark() {
  const daysLeft = 8;
  const totalDays = 30;
  const pct = Math.round(((totalDays - daysLeft) / totalDays) * 100);

  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: "#070C14" }}>
      <div className="w-full max-w-[360px] rounded-3xl overflow-hidden" style={{ background: "#0D1724", boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)" }}>

        {/* Header */}
        <div className="px-6 pt-6 pb-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>Group Buy</span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
              style={{ background: `${green}18`, color: green, border: `1px solid ${green}30` }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: green }} />Active
            </span>
          </div>
          <h3 className="text-[22px] font-bold text-white leading-tight mb-2">Uther April Group Buy</h3>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3 h-3" style={{ color: "rgba(255,255,255,0.25)" }} />
            <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>Uther · UK · by Admin</span>
          </div>
        </div>

        {/* Days + progress */}
        <div className="px-6 pt-5 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>Time Remaining</p>
              <div className="flex items-baseline gap-1.5">
                <span className="font-black text-white" style={{ fontSize: 56, letterSpacing: "-3px", lineHeight: 1 }}>{daysLeft}</span>
                <span className="text-[16px] font-semibold mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>days</span>
              </div>
            </div>
            {/* Mini arc */}
            <svg width="64" height="64" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
              <circle cx="32" cy="32" r="26" fill="none" stroke={green} strokeWidth="6"
                strokeDasharray={`${((daysLeft / totalDays) * 163).toFixed(1)} 163`}
                strokeLinecap="round" />
            </svg>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-[10px] mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>
              <span>Elapsed</span><span>{pct}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, #166534, ${green})` }} />
            </div>
          </div>
        </div>

        {/* Info rows */}
        <div className="px-6 py-4 space-y-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          {[
            { icon: <Calendar className="w-3.5 h-3.5" />, label: "Closes", value: "Apr 22, 2026" },
            { icon: <User className="w-3.5 h-3.5" />, label: "Organiser", value: "Admin" },
          ].map((row, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.05)" }}>
                <span style={{ color: green }}>{row.icon}</span>
              </div>
              <span className="text-[11px] w-20 shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>{row.label}</span>
              <span className="text-[13px] font-semibold text-white">{row.value}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="px-6 py-4">
          <button className="w-full py-3 rounded-2xl text-[14px] font-bold flex items-center justify-center gap-2 text-white"
            style={{ background: `linear-gradient(135deg, #166534, ${green})`, boxShadow: `0 6px 24px -6px ${green}55` }}>
            Order Now <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
