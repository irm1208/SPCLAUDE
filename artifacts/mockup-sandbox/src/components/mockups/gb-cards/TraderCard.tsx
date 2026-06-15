import React from 'react';
import { Users, FlaskConical } from 'lucide-react';

// Simple SVG wave path points
const WAVE = `M0,28 C20,10 40,45 60,30 C80,15 100,40 120,25 C140,10 160,35 180,20 C200,5 220,30 240,18 C260,6 280,28 300,15 L300,60 L0,60 Z`;

const rows = [
  { label: "Closes",       value: "Apr 22, 2026" },
  { label: "Organiser",   value: "Admin" },
  { label: "Manufacturer", value: "Uther · UK" },
  { label: "Info",         value: "Peptides in stock" },
];

export function TraderCard() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#08080F" }}>
      <div className="w-full max-w-[320px] rounded-2xl overflow-hidden"
        style={{ background: "#10101E", border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>

        {/* Gradient banner */}
        <div className="relative h-28 overflow-hidden" style={{ background: "linear-gradient(135deg, #F59E0B 0%, #F97316 50%, #EA580C 100%)" }}>
          {/* Abstract wave shape inside banner */}
          <div className="absolute inset-0 opacity-20" style={{ background: "radial-gradient(circle at 80% 30%, #FDE68A, transparent 60%)" }} />
          <div className="absolute bottom-0 left-0 right-0 h-10 opacity-30"
            style={{ background: "linear-gradient(to top, #10101E, transparent)" }} />
        </div>

        {/* Avatar row — overlaps banner */}
        <div className="px-4 -mt-5 mb-3 flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "#1E1E35", border: "2px solid #10101E", boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>
            <FlaskConical className="w-5 h-5" style={{ color: "#F59E0B" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-white truncate leading-tight">Uther April Group Buy</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Users className="w-3 h-3" style={{ color: "rgba(255,255,255,0.35)" }} />
            <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>8/30d</span>
          </div>
        </div>

        {/* Sparkline wave */}
        <div className="px-1 mb-1">
          <svg width="100%" height="60" viewBox="0 0 300 60" preserveAspectRatio="none">
            <defs>
              <linearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={WAVE} fill="url(#waveGrad)" />
            <path d="M0,28 C20,10 40,45 60,30 C80,15 100,40 120,25 C140,10 160,35 180,20 C200,5 220,30 240,18 C260,6 280,28 300,15"
              fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        {/* Big stat */}
        <div className="px-4 mb-1">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>Days Remaining</p>
          <div className="flex items-baseline gap-2">
            <span className="font-black text-white" style={{ fontSize: 38, letterSpacing: "-2px", lineHeight: 1 }}>8 days</span>
            <span className="text-[12px] font-semibold" style={{ color: "#4ADE80" }}>● Active</span>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-4 my-3" style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />

        {/* Data rows */}
        <div className="px-4 space-y-2.5 mb-4">
          {rows.map((row, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>{row.label}</span>
              <span className="text-[12px] font-semibold" style={{ color: "rgba(255,255,255,0.8)" }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* CTA button */}
        <div className="px-4 pb-5">
          <button className="w-full py-3 rounded-xl text-[14px] font-bold text-white"
            style={{ background: "linear-gradient(90deg, #7C3AED, #A855F7, #7C3AED)", boxShadow: "0 4px 20px -4px rgba(124,58,237,0.6)" }}>
            Order Now
          </button>
        </div>
      </div>
    </div>
  );
}
