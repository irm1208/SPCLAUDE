import React from 'react';
import { Microscope, MapPin, ArrowRight, Package } from 'lucide-react';

const accent = "#38BDF8";

export function CountdownMinimalMono() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: "#F0F4F8" }}>
      <div className="w-full max-w-[360px] rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", boxShadow: "0 4px 24px rgba(0,0,0,0.10)", border: "1px solid #E2E8F0" }}>

        <div className="px-6 pt-6 pb-6">

          {/* Top: label + status */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1.5">
              <Microscope className="w-3.5 h-3.5" style={{ color: accent }} />
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: accent, fontFamily: "monospace" }}>GROUP BUY</span>
            </div>
            <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: "#10B981", fontFamily: "monospace" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#10B981" }} />ACTIVE
            </span>
          </div>

          {/* Name */}
          <h3 className="text-[17px] font-bold leading-snug mb-5" style={{ color: "#0F172A", fontFamily: "monospace" }}>
            Uther April Group Buy
          </h3>

          {/* Big number */}
          <div className="mb-4 pb-4" style={{ borderBottom: "1px solid #E2E8F0" }}>
            <div className="flex items-baseline gap-2">
              <span className="font-black" style={{ fontSize: 80, letterSpacing: "-4px", lineHeight: 1, color: accent, fontFamily: "monospace" }}>8</span>
              <div style={{ fontFamily: "monospace" }}>
                <p className="text-[13px] font-bold uppercase" style={{ color: "#475569" }}>days</p>
                <p className="text-[11px]" style={{ color: "#94A3B8" }}>remaining</p>
              </div>
            </div>
            <p className="text-[11px] mt-1" style={{ color: "#94A3B8", fontFamily: "monospace" }}>— closes Apr 22, 2026</p>
          </div>

          {/* Data rows */}
          <div className="space-y-2 mb-4 pb-4" style={{ borderBottom: "1px solid #E2E8F0" }}>
            {[
              { label: "MFTR", value: "Uther · UK" },
              { label: "ORG", value: "Admin" },
              { label: "PROD", value: "1 product" },
              { label: "CCY", value: "USD" },
            ].map((row, i) => (
              <div key={i} className="flex items-center gap-3" style={{ fontFamily: "monospace" }}>
                <span className="text-[10px] font-bold w-12 shrink-0" style={{ color: "#94A3B8" }}>{row.label}</span>
                <span className="text-[12px] font-medium" style={{ color: "#334155" }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* Info */}
          <p className="text-[11px] mb-4 leading-relaxed" style={{ color: "#94A3B8", fontFamily: "monospace" }}>
            // Order will be made for peptides in stock
          </p>

          {/* CTA */}
          <button className="w-full py-2.5 rounded-xl text-[13px] font-bold flex items-center justify-center gap-1.5"
            style={{ background: accent, color: "#FFFFFF", boxShadow: `0 4px 16px -4px ${accent}80` }}>
            Place Order <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
