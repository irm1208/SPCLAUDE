import React from 'react';
import { Beaker, Calendar, Hash, FlaskConical, ArrowRight } from 'lucide-react';

export function CoaFintechDark() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 font-sans antialiased" style={{ backgroundColor: '#070C14' }}>
      {/* Card Container */}
      <div 
        className="w-[320px] rounded-[24px] p-6 flex flex-col relative overflow-hidden border border-emerald-500/10" 
        style={{ 
          backgroundColor: '#0D1724', 
          boxShadow: 'inset 0 1px 0 0 rgba(16, 185, 129, 0.1), 0 20px 40px -10px rgba(0, 0, 0, 0.5), 0 0 40px -10px rgba(16, 185, 129, 0.05)'
        }}
      >
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-[100px] rounded-full blur-[50px] opacity-20 pointer-events-none" style={{ backgroundColor: '#10B981' }}></div>

        {/* Header */}
        <div className="flex justify-between items-start mb-8 relative z-10">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">COA</span>
            <h2 className="text-2xl font-bold text-white tracking-tight leading-none">Tirzepatide</h2>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(45,107,204,0.6)]" style={{ backgroundColor: '#2D6BCC' }}></span>
              <span className="text-xs text-slate-400 font-medium">Uther <span className="opacity-50">·</span> Janoshik</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[10px] font-bold text-emerald-400 tracking-wide">PASS</span>
          </div>
        </div>

        {/* Hero Stat & Arc */}
        <div className="flex flex-col items-center justify-center mb-6 relative z-10">
          <div className="text-[52px] font-bold text-white leading-[1] tracking-tighter tabular-nums drop-shadow-md">
            99.892<span className="text-2xl text-slate-500 ml-1">%</span>
          </div>
          <div className="text-[10px] font-bold tracking-widest text-slate-400 mt-2 mb-4">PURITY</div>
          
          {/* Half-circle Arc */}
          <div className="relative w-[120px] h-[60px] -mt-2">
            <svg viewBox="0 0 120 60" className="w-full h-full overflow-visible">
              <path 
                d="M 10 60 A 50 50 0 0 1 110 60" 
                fill="none" 
                stroke="rgba(255,255,255,0.05)" 
                strokeWidth="8" 
                strokeLinecap="round"
              />
              <path 
                d="M 10 60 A 50 50 0 0 1 110 60" 
                fill="none" 
                stroke="#10B981" 
                strokeWidth="8" 
                strokeLinecap="round"
                strokeDasharray="157.08"
                strokeDashoffset={157.08 * (1 - 0.99892)}
                className="drop-shadow-[0_0_6px_rgba(16,185,129,0.4)]"
              />
            </svg>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex flex-col gap-2 mb-6 w-full z-10 bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
          <div className="flex justify-between items-end">
            <span className="text-xs text-slate-400 font-medium">Purity</span>
            <span className="text-xs font-bold text-emerald-400">99.892%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden shadow-inner">
            <div className="h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)] relative" style={{ width: '99.892%' }}>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20"></div>
            </div>
          </div>
        </div>

        {/* Info Rows */}
        <div className="flex flex-col gap-3 mb-6 z-10">
          <div className="flex items-center">
            <Hash className="w-4 h-4 text-slate-500 mr-2.5" />
            <span className="text-[13px] text-slate-400">Batch</span>
            <span className="text-[13px] text-white font-mono ml-auto tracking-tight">ZE30-0319</span>
          </div>
          <div className="flex items-center">
            <FlaskConical className="w-4 h-4 text-slate-500 mr-2.5" />
            <span className="text-[13px] text-slate-400">Analysis</span>
            <span className="text-[13px] text-white font-medium ml-auto">Mass & Purity</span>
          </div>
          <div className="flex items-center">
            <Beaker className="w-4 h-4 text-slate-500 mr-2.5" />
            <span className="text-[13px] text-slate-400">Mass</span>
            <span className="text-[13px] text-white font-medium ml-auto">4,512 Da</span>
          </div>
          <div className="flex items-center">
            <Calendar className="w-4 h-4 text-slate-500 mr-2.5" />
            <span className="text-[13px] text-slate-400">Date</span>
            <span className="text-[13px] text-white font-medium ml-auto">10 Apr 2026</span>
          </div>
        </div>

        {/* Button */}
        <button className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 text-slate-900 font-bold text-sm shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)] hover:shadow-[0_0_25px_-3px_rgba(16,185,129,0.6)] transition-all z-10 hover:-translate-y-0.5">
          View Report
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
