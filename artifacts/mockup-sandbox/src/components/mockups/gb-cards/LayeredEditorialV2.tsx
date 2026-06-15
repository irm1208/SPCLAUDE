import React from "react";
import { Info } from "lucide-react";

export function LayeredEditorialV2() {
  const accentColor = "#5B8DEF";

  return (
    <div className="min-h-[100dvh] bg-[#0A0B0F] flex items-center justify-center p-6 font-sans text-slate-200">
      {/* Card Container */}
      <div className="relative w-full max-w-[380px] bg-[#0D0F16] border border-white/5 shadow-2xl rounded-sm">
        {/* Accent Vertical Stripe */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-sm"
          style={{ backgroundColor: accentColor }}
        />

        <div className="p-8 pl-10">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-3xl font-serif font-bold text-white leading-tight mb-2 tracking-wide">
              Uther April Group Buy
            </h2>
            <div className="text-sm font-medium tracking-wide text-slate-400 uppercase">
              by Admin
            </div>
          </div>

          {/* Info Snippet */}
          <div className="flex items-start gap-3 p-3 bg-white/[0.03] border border-white/10 rounded-sm mb-8">
            <Info className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <p className="text-xs text-slate-300 leading-relaxed">
              Order will be made for peptides in stock
            </p>
          </div>

          {/* Editorial Data Sheet / Stat Block */}
          <div className="flex flex-col mb-8">
            <div className="flex items-center justify-between py-3.5 border-b border-white/10">
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500">
                Manufacturer
              </span>
              <span className="text-sm font-medium">Uther (UK)</span>
            </div>

            <div className="flex items-center justify-between py-3.5 border-b border-white/10">
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500">
                Products
              </span>
              <span className="text-sm font-medium">1 product</span>
            </div>

            <div className="flex items-center justify-between py-3.5 border-b border-white/10">
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500">
                Currency
              </span>
              <span className="text-sm font-medium">USD</span>
            </div>

            <div className="flex items-center justify-between py-3.5 border-b border-white/10">
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500">
                Status
              </span>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-sm font-medium">Active</span>
              </div>
            </div>

            <div className="flex items-center justify-between py-3.5 border-b border-white/10">
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500">
                Closes
              </span>
              <div className="text-right">
                <span className="text-sm font-medium">Apr 22</span>
                <span className="text-[10px] text-slate-400 ml-2 font-medium tracking-wide">
                  (8d left)
                </span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            className="w-full group relative overflow-hidden rounded-sm py-4 px-6 text-sm font-bold tracking-widest uppercase transition-all duration-300"
            style={{
              backgroundColor: `${accentColor}15`,
              color: accentColor,
              border: `1px solid ${accentColor}30`,
            }}
          >
            <div className="relative z-10 flex items-center justify-between">
              <span>Order</span>
              <span className="transition-transform duration-300 group-hover:translate-x-2">
                →
              </span>
            </div>
            {/* Hover effect fill */}
            <div
              className="absolute inset-0 z-0 origin-left scale-x-0 transition-transform duration-300 ease-out group-hover:scale-x-100"
              style={{ backgroundColor: `${accentColor}25` }}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
