import React from "react";
import { Copy, FlaskConical, ArrowRight } from "lucide-react";

export function CoaRevolut() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: "#D6E0F0" }}>
      <div className="w-[320px] bg-white rounded-[24px] shadow-lg overflow-hidden flex flex-col font-sans">
        <div className="p-6 flex flex-col">
          {/* Header Icon */}
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#2D6BCC] flex items-center justify-center mb-8">
            <FlaskConical size={24} strokeWidth={2.5} />
          </div>

          {/* Amount-style Result */}
          <div className="flex flex-col mb-10 gap-1">
            <span className="text-slate-500 text-sm font-medium">Purity result</span>
            <div className="flex items-center gap-3">
              <span className="text-4xl font-extrabold text-slate-900 tracking-tight">99.892%</span>
              <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded-md">PASS</span>
            </div>
          </div>

          {/* Batch Reference */}
          <div className="flex flex-col gap-2 mb-8">
            <span className="text-[11px] font-bold text-[#2D6BCC] tracking-widest uppercase">Batch Reference</span>
            <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
              <span className="text-slate-800 font-mono text-[15px] tracking-tight">ZE30-0319</span>
              <button className="text-slate-400 hover:text-slate-600 transition-colors">
                <Copy size={18} />
              </button>
            </div>
          </div>

          {/* Subtext info */}
          <div className="text-[13px] text-slate-500 mb-8 flex flex-col gap-1.5">
            <p>Tirzepatide · <span style={{ color: "#2D6BCC", fontWeight: 600 }}>Uther</span> · 10 Apr 2026</p>
            <p className="text-slate-400">Mass: 4,512 Da · Janoshik Analytical</p>
          </div>

          {/* Link */}
          <div className="pt-2 flex">
            <a href="#" className="text-[#2D6BCC] text-sm font-semibold flex items-center gap-1.5 hover:opacity-80 transition-opacity">
              View Report <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
