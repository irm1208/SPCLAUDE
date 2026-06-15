import React from 'react';
import { HeartPulse, MapPin, ChevronRight, Package, Calendar, User } from 'lucide-react';

const accent = "#F472B6";

export function CountdownSplitScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: "#0D0509" }}>
      <div className="w-full max-w-[360px] rounded-2xl overflow-hidden" style={{ boxShadow: "0 12px 40px rgba(0,0,0,0.55)" }}>

        {/* Top half — countdown hero */}
        <div className="relative flex flex-col items-center justify-center pt-8 pb-7 overflow-hidden"
          style={{ background: "linear-gradient(160deg, #2A0A1A 0%, #1A0510 100%)" }}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 50% 80%, ${accent}22 0%, transparent 60%)` }} />
          <div className="absolute top-3 right-3">
            <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: "#10B98120", color: "#10B981", border: "1px solid #10B98130" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#10B981" }} />Active
            </span>
          </div>
          <div className="flex items-center gap-1.5 mb-2 relative">
            <HeartPulse className="w-3.5 h-3.5" style={{ color: accent }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: accent }}>Group Buy</span>
          </div>
          <div className="relative text-center">
            <p className="font-black text-white leading-none" style={{ fontSize: 80, letterSpacing: "-4px", textShadow: `0 0 40px ${accent}44` }}>8</p>
            <p className="text-[13px] font-bold uppercase tracking-widest -mt-1" style={{ color: accent }}>days left</p>
          </div>
          <p className="relative text-[11px] mt-2" style={{ color: "rgba(255,255,255,0.3)" }}>Closes Apr 22</p>
        </div>

        {/* Bottom half — info */}
        <div className="px-5 py-5 space-y-3" style={{ background: "#140A10" }}>
          <h3 className="text-[17px] font-bold text-white leading-snug">Uther April Group Buy</h3>

          <div className="space-y-2">
            {[
              { icon: <MapPin className="w-3 h-3" />, text: "Uther · UK" },
              { icon: <User className="w-3 h-3" />, text: "by Admin" },
              { icon: <Package className="w-3 h-3" />, text: "1 product · USD" },
            ].map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <span style={{ color: `${accent}99` }}>{row.icon}</span>
                <span className="text-[12px]" style={{ color: "rgba(255,255,255,0.5)" }}>{row.text}</span>
              </div>
            ))}
          </div>

          <p className="text-[11px] leading-relaxed pt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
            Order will be made for peptides in stock
          </p>

          <button className="w-full py-2.5 rounded-xl text-[13px] font-bold flex items-center justify-center gap-1.5 text-white mt-1"
            style={{ background: `linear-gradient(90deg, ${accent}BB, ${accent})`, boxShadow: `0 4px 20px -6px ${accent}88` }}>
            Place Order <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
