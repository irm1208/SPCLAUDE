import React from 'react';
import { Activity, MapPin, ChevronRight, Package, User, DollarSign, Calendar } from 'lucide-react';

const accent = "#22D3EE";

export function LayoutBanner() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: "#05111A" }}>
      <div className="w-full max-w-[380px] rounded-2xl overflow-hidden" style={{ boxShadow: "0 12px 40px rgba(0,0,0,0.5)" }}>

        {/* Banner header */}
        <div className="px-6 pt-6 pb-5 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #061E2A 0%, #0D3545 100%)" }}>
          <div className="absolute inset-0 opacity-10" style={{ background: `radial-gradient(circle at 80% 50%, ${accent}, transparent 60%)` }} />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${accent}22`, border: `1px solid ${accent}33` }}>
                <Activity className="w-4.5 h-4.5" style={{ color: accent }} />
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ background: "#10B98122", color: "#10B981", border: "1px solid #10B98133" }}>● Active</span>
            </div>
            <h3 className="text-[20px] font-bold text-white leading-snug">Uther April Group Buy</h3>
            <p className="text-[11px] mt-1" style={{ color: `${accent}BB` }}>Group Buy · Closes Apr 22</p>
          </div>
        </div>

        {/* Data rows */}
        <div className="divide-y" style={{ background: "#0C1824", borderColor: "rgba(255,255,255,0.05)" }}>
          {[
            { icon: <MapPin className="w-3.5 h-3.5" />, label: "Manufacturer", value: "Uther · UK" },
            { icon: <User className="w-3.5 h-3.5" />, label: "Organiser", value: "Admin" },
            { icon: <Calendar className="w-3.5 h-3.5" />, label: "Closes", value: "Apr 22 · 8 days left" },
            { icon: <Package className="w-3.5 h-3.5" />, label: "Products", value: "1 product" },
            { icon: <DollarSign className="w-3.5 h-3.5" />, label: "Currency", value: "USD" },
          ].map((row, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3">
              <span style={{ color: accent }}>{row.icon}</span>
              <span className="text-[11px] w-24 shrink-0" style={{ color: "rgba(255,255,255,0.35)" }}>{row.label}</span>
              <span className="text-[12px] font-medium text-white">{row.value}</span>
            </div>
          ))}
        </div>

        {/* Info + CTA */}
        <div className="px-5 py-4" style={{ background: "#0C1824", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="text-[11px] mb-3 leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
            Order will be made for peptides in stock
          </p>
          <button className="w-full py-2.5 rounded-xl text-[13px] font-bold flex items-center justify-center gap-1.5"
            style={{ background: `linear-gradient(90deg, ${accent}CC, ${accent})`, color: "#001A20" }}>
            Place Order <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
