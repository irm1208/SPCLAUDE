import React from "react";
import { Activity, AlertCircle, Building2, Calendar, ChevronRight } from "lucide-react";

export function LabFintechDark() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#070C14] text-slate-200 font-sans">
      <div className="w-full max-w-md rounded-3xl overflow-hidden bg-[#0D1724] border border-slate-800 shadow-2xl relative">
        {/* Glow effect */}
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none" />

        <div className="p-6 relative z-10">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="text-[10px] font-bold tracking-widest text-emerald-400 mb-1.5 uppercase">
                Blood Test
              </div>
              <h2 className="text-xl font-semibold text-white tracking-tight leading-tight">
                Full Blood Count — Trough
              </h2>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-800/50 flex items-center justify-center border border-slate-700/50 text-slate-400">
              <Activity className="w-5 h-5 text-emerald-400" />
            </div>
          </div>

          {/* Hero Stat & Arc */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-5xl font-bold text-white tracking-tighter">21</span>
                <span className="text-xl font-medium text-slate-500">/ 24</span>
              </div>
              <div className="text-sm font-medium text-slate-400 mt-1">
                markers in range
              </div>
            </div>
            
            {/* Mini arc */}
            <div className="relative w-20 h-20 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke="currentColor"
                  strokeWidth="10"
                  fill="transparent"
                  className="text-slate-800"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke="currentColor"
                  strokeWidth="10"
                  fill="transparent"
                  strokeDasharray="264"
                  strokeDashoffset={264 - (264 * 87.5) / 100}
                  strokeLinecap="round"
                  className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                />
              </svg>
              <div className="absolute text-xs font-bold text-emerald-400">87%</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between text-xs font-medium mb-2">
              <span className="text-slate-400">In range: 87.5%</span>
              <span className="text-emerald-400">Optimal</span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: '87.5%' }} />
            </div>
          </div>

          {/* Info Rows */}
          <div className="space-y-3 mb-8 bg-slate-900/40 rounded-2xl p-4 border border-slate-800/50">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2.5 text-slate-400">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span>Out of Range</span>
              </div>
              <span className="font-semibold text-red-400">3 markers</span>
            </div>
            <div className="h-px w-full bg-slate-800/50" />
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2.5 text-slate-400">
                <Building2 className="w-4 h-4" />
                <span>Organiser</span>
              </div>
              <span className="font-semibold text-slate-200">Medichecks</span>
            </div>
            <div className="h-px w-full bg-slate-800/50" />
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2.5 text-slate-400">
                <Calendar className="w-4 h-4" />
                <span>Type</span>
              </div>
              <span className="font-semibold text-slate-200">Trough · 15 Mar 2026</span>
            </div>
          </div>

          {/* OOR Highlight */}
          <div className="mb-8 relative overflow-hidden rounded-2xl bg-red-500/5 border border-red-500/20 p-4">
            <div className="absolute top-0 left-0 w-1 h-full bg-red-500 rounded-l-2xl" />
            <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-3">Attention Required</h4>
            <div className="space-y-2.5">
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-sm font-medium text-white">LH</div>
                  <div className="text-[10px] text-slate-500">ref 1.7–8.6</div>
                </div>
                <div className="text-sm font-bold text-red-400">0.2 <span className="text-[10px] text-slate-500 font-medium">IU/L</span></div>
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-sm font-medium text-white">FSH</div>
                  <div className="text-[10px] text-slate-500">ref 1.5–12.4</div>
                </div>
                <div className="text-sm font-bold text-red-400">0.3 <span className="text-[10px] text-slate-500 font-medium">IU/L</span></div>
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-sm font-medium text-white">Haematocrit</div>
                  <div className="text-[10px] text-slate-500">ref 37–50%</div>
                </div>
                <div className="text-sm font-bold text-red-400">51.2 <span className="text-[10px] text-slate-500 font-medium">%</span></div>
              </div>
            </div>
          </div>

          {/* Button */}
          <button className="w-full relative group overflow-hidden rounded-2xl bg-slate-800 border border-slate-700 transition-all hover:border-emerald-500/50">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-emerald-400/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-center justify-between px-6 py-4">
              <span className="font-semibold text-white">View Full Results</span>
              <ChevronRight className="w-5 h-5 text-emerald-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

        </div>
      </div>
    </div>
  );
}
