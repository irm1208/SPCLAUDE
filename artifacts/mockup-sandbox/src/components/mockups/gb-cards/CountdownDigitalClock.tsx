import React from 'react';
import { Activity, MapPin, ChevronRight, Package } from 'lucide-react';

const accent = "#22D3EE";

function Segment({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex gap-0.5">
        {value.split('').map((d, i) => (
          <div key={i} className="flex items-center justify-center rounded-lg font-black text-white"
            style={{ width: 36, height: 48, fontSize: 28, letterSpacing: "-1px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)", fontFamily: "monospace", textShadow: `0 0 20px ${accent}88` }}>
            {d}
          </div>
        ))}
      </div>
      <p className="text-[9px] font-bold uppercase tracking-widest mt-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>{label}</p>
    </div>
  );
}

export function CountdownDigitalClock() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: "#03090E" }}>
      <div className="w-full max-w-[360px] rounded-2xl overflow-hidden" style={{ background: "linear-gradient(160deg, #061419 0%, #0D2530 100%)", boxShadow: "0 12px 40px rgba(0,0,0,0.55)" }}>

        <div className="relative px-6 pt-7 pb-6">
          <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 50% 40%, ${accent}14 0%, transparent 60%)` }} />

          {/* Label */}
          <div className="flex items-center justify-between mb-4 relative">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" style={{ color: accent }} />
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: accent }}>Group Buy</span>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: "#10B98118", color: "#10B981", border: "1px solid #10B98128" }}>● Active</span>
          </div>

          <h3 className="text-[17px] font-bold text-white leading-snug mb-5 relative">Uther April Group Buy</h3>

          {/* Digital clock segments */}
          <div className="flex items-center justify-center gap-2 mb-2 relative">
            <Segment value="08" label="Days" />
            <span className="text-[28px] font-black mb-5" style={{ color: `${accent}60` }}>:</span>
            <Segment value="14" label="Hours" />
            <span className="text-[28px] font-black mb-5" style={{ color: `${accent}60` }}>:</span>
            <Segment value="32" label="Mins" />
          </div>

          <p className="text-center text-[11px] mb-5" style={{ color: "rgba(255,255,255,0.3)" }}>Closes Apr 22, 2026</p>

          <div style={{ height: 1, background: "rgba(255,255,255,0.07)" }} className="mb-4" />

          <div className="flex items-center justify-center gap-4 mb-4 flex-wrap text-[11px]" style={{ color: "rgba(255,255,255,0.45)" }}>
            <span><MapPin className="inline w-3 h-3 mr-0.5 -mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }} />Uther · UK</span>
            <span>by Admin</span>
            <span><Package className="inline w-3 h-3 mr-0.5" />1 · USD</span>
          </div>

          <button className="w-full py-2.5 rounded-xl text-[13px] font-bold flex items-center justify-center gap-1.5"
            style={{ background: accent, color: "#001A20", boxShadow: `0 4px 20px -6px ${accent}88` }}>
            Order Now <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
