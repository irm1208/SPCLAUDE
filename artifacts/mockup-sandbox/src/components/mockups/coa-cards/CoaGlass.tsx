import React from 'react';
import { ShieldCheck, Calendar, Activity, ArrowRight, FileText } from 'lucide-react';

export function CoaGlass() {
  return (
    <div 
      className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden font-sans"
      style={{
        background: 'linear-gradient(135deg, #0F2044 0%, #2D1B69 100%)'
      }}
    >
      {/* Background Glow Blobs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-500/20 rounded-full blur-[100px] pointer-events-none mix-blend-screen" />
      <div className="absolute top-1/2 left-[40%] -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-purple-500/20 rounded-full blur-[80px] pointer-events-none mix-blend-screen" />
      
      {/* Card */}
      <div 
        className="relative w-full max-w-[320px] rounded-[20px] p-6 flex flex-col gap-5 border border-white/20 backdrop-blur-xl"
        style={{
          background: 'rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)'
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-start">
          <span className="text-[10px] font-bold tracking-widest text-white/60">
            CERTIFICATE OF ANALYSIS
          </span>
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
        </div>

        {/* Title & Vendor */}
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Tirzepatide 10 mg
          </h2>
          <div className="flex items-center gap-2">
             <div className="px-2.5 py-1 rounded-full bg-white/20 border border-white/10 backdrop-blur-md flex items-center gap-1.5">
               <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#2D6BCC' }} />
               <span className="text-xs font-medium text-white">Uther</span>
             </div>
             <div className="px-2.5 py-1 rounded-full border border-purple-400/40 bg-purple-500/10 backdrop-blur-md flex items-center gap-1">
               <span className="text-[10px] font-bold tracking-wide text-purple-300">THIRD PARTY</span>
             </div>
          </div>
        </div>

        {/* Purity Result */}
        <div className="py-2">
          <div className="text-4xl font-black text-white tracking-tight" style={{ textShadow: '0 0 20px rgba(16, 185, 129, 0.4)' }}>
            99.892<span className="text-2xl text-emerald-400">%</span>
          </div>
        </div>

        {/* Details Row */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold tracking-widest uppercase text-white/40">Batch</span>
            <span className="text-xs font-mono font-semibold text-white">ZE30-0319</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold tracking-widest uppercase text-white/40">Analysis</span>
            <span className="text-xs font-medium text-white/80">Mass & Purity</span>
          </div>
        </div>

        {/* Stat Chips */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
          <div className="px-2.5 py-1.5 rounded-lg border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 text-xs font-bold tracking-wide">
            PASS
          </div>
          <div className="px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white/90 text-xs font-medium flex items-center gap-1.5">
             <Activity className="w-3 h-3 text-blue-400" />
             4,512 Da
          </div>
          <div className="px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white/90 text-xs font-medium flex items-center gap-1.5">
             <Calendar className="w-3 h-3 text-purple-400" />
             10 Apr 2026
          </div>
        </div>

        <div className="text-[10px] text-white/40 flex items-center justify-between pt-1">
          <span>Tested by Janoshik Analytical</span>
        </div>

        {/* Action Button */}
        <button className="mt-2 w-full py-3 px-4 rounded-xl bg-white/15 hover:bg-white/25 border border-white/10 text-white text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 group backdrop-blur-md">
          <FileText className="w-4 h-4 text-white/70 group-hover:text-white transition-colors" />
          View Report
          <ArrowRight className="w-4 h-4 text-white/70 group-hover:translate-x-1 transition-all" />
        </button>

      </div>
    </div>
  );
}
