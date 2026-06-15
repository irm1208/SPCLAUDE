import React from "react";

export function CoaCompact() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 font-sans">
      {/* Card Container */}
      <div className="relative w-full max-w-[320px] bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden flex flex-col">
        {/* Top Strip */}
        <div className="h-1 w-full bg-[#2D6BCC]"></div>

        {/* Content Padding */}
        <div className="p-[10px] flex flex-col gap-3">
          
          {/* Header Area */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <h3 className="text-[14px] font-bold text-slate-900 leading-none m-0">Tirzepatide</h3>
              <div className="flex items-center bg-green-50 text-green-700 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border border-green-200 leading-none">
                PASS
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="bg-[#2D6BCC]/10 text-[#2D6BCC] px-1.5 py-0.5 rounded-sm text-[8px] font-bold uppercase leading-none">
                Uther
              </div>
              <div className="text-[12px] font-bold text-slate-900 leading-none">
                99.892%
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px w-full bg-[#E2E8F0]"></div>

          {/* Details Grid */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-[9px] font-mono">
              <span className="text-slate-400">BATCH</span>
              <span className="text-slate-700 font-medium">ZE30-0319</span>
            </div>
            <div className="flex justify-between items-center text-[9px] font-mono">
              <span className="text-slate-400">TYPE</span>
              <span className="text-slate-700 font-medium">Mass & Purity</span>
            </div>
            <div className="flex justify-between items-center text-[9px] font-mono">
              <span className="text-slate-400">DATE</span>
              <span className="text-slate-700 font-medium">10 Apr 2026</span>
            </div>
            <div className="flex justify-between items-center text-[9px] font-mono">
              <span className="text-slate-400">MASS</span>
              <span className="text-slate-700 font-medium">4,512 Da</span>
            </div>
            <div className="flex justify-between items-center text-[9px] font-mono">
              <span className="text-slate-400">LAB</span>
              <span className="text-slate-700 font-medium">Janoshik Analytical</span>
            </div>
          </div>

          {/* Action Button */}
          <button className="mt-1 w-full bg-slate-900 hover:bg-slate-800 text-white rounded-md py-1.5 flex items-center justify-center gap-1 text-[10px] font-medium transition-colors">
            View &rarr;
          </button>
          
        </div>
      </div>
    </div>
  );
}
