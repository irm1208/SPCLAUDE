import React from "react";
import { Package, User, MapPin, Tag, ArrowRight } from "lucide-react";

export function PolaroidCard() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#E8E4DC] font-sans">
      
      {/* Polaroid Outer Frame */}
      <div 
        className="w-[320px] bg-[#FAFAF8] p-4 pb-6 shadow-[0_10px_30px_rgba(0,0,0,0.08),_0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.12)] transition-shadow duration-500 rounded-[2px]"
        style={{ transform: "rotate(1.5deg)" }}
      >
        
        {/* Photo Area (Top 55%) */}
        <div className="h-[280px] w-full bg-gradient-to-br from-slate-800 via-indigo-950 to-slate-900 relative overflow-hidden flex flex-col justify-between p-5 shadow-inner">
          
          {/* Noise texture overlay for photo realism */}
          <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay" 
               style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}>
          </div>

          {/* Timestamp */}
          <div className="w-full flex justify-end">
            <span className="font-mono text-xs font-semibold tracking-widest text-[#F59E0B] opacity-90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] relative z-10">
              APR 22
            </span>
          </div>

          {/* Title overlaid on photo */}
          <h2 className="text-white font-bold text-3xl leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] relative z-10 max-w-[90%]">
            Uther April Group Buy
          </h2>
        </div>

        {/* Bottom Strip (White area) */}
        <div className="mt-6 flex flex-col gap-3 px-2">
          
          {/* Handwritten Casual Title */}
          <div className="flex justify-between items-start mb-2">
            <h3 
              className="text-2xl text-slate-800 leading-none"
              style={{ fontFamily: '"Caveat", cursive', fontStyle: 'italic', transform: 'rotate(-2deg)' }}
            >
              Uther April GB
            </h3>

            {/* Status */}
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 rounded border border-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Active</span>
              </div>
              <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                8d Left
              </span>
            </div>
          </div>

          {/* Printed Details */}
          <div className="grid grid-cols-2 gap-y-3 gap-x-4 mt-1 text-[11px] text-slate-500 font-medium">
            <div className="flex items-center gap-2">
              <Package className="w-3.5 h-3.5 text-slate-400" />
              <span className="truncate">Mfg: <span className="text-slate-800">Uther</span></span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>Loc: <span className="text-slate-800">UK</span></span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span className="truncate">Org: <span className="text-slate-800">Admin</span></span>
            </div>
            <div className="flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              <span>1 Product (USD)</span>
            </div>
          </div>

          {/* Info snippet */}
          <div className="mt-2 pl-2 border-l-2 border-slate-200">
            <p className="text-[11px] text-slate-500 italic">
              "Order will be made for peptides in stock"
            </p>
          </div>

          {/* Action Button */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex justify-end">
            <button className="bg-[#0f172a] text-white text-xs font-semibold px-5 py-2.5 rounded-[2px] flex items-center gap-1.5 hover:bg-[#1e293b] transition-colors group">
              Order
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
