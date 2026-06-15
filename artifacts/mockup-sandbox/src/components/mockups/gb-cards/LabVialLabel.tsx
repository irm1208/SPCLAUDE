import React from "react";
import { Clock, Info } from "lucide-react";

export function LabVialLabel() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 font-mono">
      {/* Card Container */}
      <div className="relative w-full max-w-sm bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden">
        {/* Top Colored Band */}
        <div className="bg-[#22D3EE] px-4 py-1.5 flex justify-between items-center text-white">
          <span className="text-[10px] font-bold tracking-widest uppercase">
            Research Compound
          </span>
          <span className="text-[10px] font-medium opacity-90">
            LOT: GBU-2604-UTH
          </span>
        </div>

        {/* Content Area */}
        <div className="p-5 pt-6 relative">
          {/* Active Stamp */}
          <div className="absolute top-4 right-4 border-2 border-amber-500 text-amber-500 text-xs font-bold px-2 py-0.5 rounded-sm transform -rotate-6 opacity-80 uppercase tracking-widest select-none pointer-events-none">
            Active
          </div>

          {/* Main Title */}
          <h2 className="text-2xl font-black text-slate-900 leading-tight uppercase tracking-tight pr-16">
            Uther April<br />Group Buy
          </h2>
          
          <hr className="my-4 border-slate-200 border-dashed" />

          {/* Data Columns */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-6">
            <div className="flex flex-col">
              <span className="text-[9px] uppercase text-slate-400 font-bold tracking-wider mb-0.5">Manufacturer</span>
              <span className="text-sm font-semibold text-slate-800">Uther</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] uppercase text-slate-400 font-bold tracking-wider mb-0.5">Origin</span>
              <span className="text-sm font-semibold text-slate-800">UK</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] uppercase text-slate-400 font-bold tracking-wider mb-0.5">Organiser</span>
              <span className="text-sm font-semibold text-slate-800">Admin</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] uppercase text-slate-400 font-bold tracking-wider mb-0.5">Currency</span>
              <span className="text-sm font-semibold text-slate-800">USD</span>
            </div>
            <div className="flex flex-col col-span-2">
              <span className="text-[9px] uppercase text-slate-400 font-bold tracking-wider mb-0.5">Products Included</span>
              <span className="text-sm font-semibold text-slate-800">1 vial</span>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-slate-50 border border-slate-100 rounded p-2 mb-5 flex items-start gap-2">
            <Info className="w-3 h-3 text-slate-400 mt-0.5 flex-shrink-0" />
            <p className="text-[10px] text-slate-600 leading-relaxed uppercase">
              Order will be made for peptides in stock. For research purposes only.
            </p>
          </div>

          <div className="flex items-end justify-between mb-6">
            {/* Expiry */}
            <div className="flex flex-col">
              <span className="text-[9px] uppercase text-slate-400 font-bold tracking-wider mb-1">Expires</span>
              <div className="flex items-center gap-1.5 text-slate-800 font-bold text-sm bg-slate-100 px-2 py-1 rounded">
                <Clock className="w-3.5 h-3.5" />
                <span>22 APR <span className="text-slate-400 text-xs font-normal ml-1">8d left</span></span>
              </div>
            </div>

            {/* Faux Barcode */}
            <div 
              className="h-8 w-24 opacity-60"
              style={{
                background: `repeating-linear-gradient(
                  to right,
                  #0f172a 0, #0f172a 2px,
                  transparent 2px, transparent 4px,
                  #0f172a 4px, #0f172a 5px,
                  transparent 5px, transparent 8px,
                  #0f172a 8px, #0f172a 11px,
                  transparent 11px, transparent 13px,
                  #0f172a 13px, #0f172a 14px,
                  transparent 14px, transparent 16px,
                  #0f172a 16px, #0f172a 19px,
                  transparent 19px, transparent 22px
                )`,
                backgroundSize: '22px 100%'
              }}
            />
          </div>

          {/* Action Button */}
          <button className="w-full bg-slate-900 hover:bg-black text-white font-bold uppercase tracking-widest text-xs py-3.5 px-4 rounded transition-colors flex items-center justify-between group">
            <span>Place Order</span>
            <span className="text-[#22D3EE] group-hover:translate-x-1 transition-transform">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
