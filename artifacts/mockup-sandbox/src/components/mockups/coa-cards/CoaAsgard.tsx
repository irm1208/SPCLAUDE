import React from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

export function CoaAsgard() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 font-sans selection:bg-white/20" style={{ backgroundColor: '#C8DCDE' }}>
      <div 
        className="relative w-full max-w-[320px] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10"
        style={{ backgroundColor: '#1B4D5C' }}
      >
        {/* Subtle grid lines background inside the card */}
        <div 
          className="absolute inset-0 pointer-events-none mix-blend-overlay"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
            backgroundPosition: '0 0'
          }}
        />

        {/* 4 Corner Markers */}
        <div className="absolute top-4 left-4 text-[12px] leading-none text-white/70 font-mono select-none">×</div>
        <div className="absolute top-4 right-4 text-[12px] leading-none text-white/70 font-mono select-none">×</div>
        <div className="absolute bottom-4 left-4 text-[12px] leading-none text-white/70 font-mono select-none">×</div>
        <div className="absolute bottom-4 right-4 text-[12px] leading-none text-white/70 font-mono select-none">×</div>

        {/* Card Content */}
        <div className="relative z-10 flex flex-col h-full p-8 pt-10 pb-8">
          
          {/* Top Row */}
          <div className="flex justify-between items-center mb-8 w-full">
            <span className="text-[10px] font-bold tracking-[0.2em] text-white/60 uppercase">
              CERTIFICATE
            </span>
            <span className="text-[10px] font-mono tracking-wide text-white/60 uppercase">
              10 APR 2026
            </span>
          </div>

          {/* Title & Vendor Badge */}
          <div className="mb-8 flex flex-col items-start">
            <h1 className="text-3xl font-extrabold tracking-tight text-white mb-3">
              Tirzepatide
            </h1>
            <div 
              className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold tracking-[0.15em] uppercase text-white shadow-sm ring-1 ring-white/10"
              style={{ backgroundColor: '#2D6BCC' }}
            >
              UTHER
            </div>
          </div>

          {/* 2x2 Grid for Specs */}
          <div className="grid grid-cols-2 border-t border-l border-white/10 mb-0 bg-black/10 backdrop-blur-sm">
            
            {/* Top Left: Batch */}
            <div className="p-3.5 border-r border-b border-white/10">
              <div className="text-[9px] font-bold tracking-[0.1em] text-white/40 uppercase mb-1">
                BATCH
              </div>
              <div className="text-xs font-mono text-white/90">
                ZE30-0319
              </div>
            </div>
            
            {/* Top Right: Analysis */}
            <div className="p-3.5 border-b border-white/10">
              <div className="text-[9px] font-bold tracking-[0.1em] text-white/40 uppercase mb-1">
                ANALYSIS
              </div>
              <div className="text-xs font-medium text-white/90 truncate">
                Mass & Purity
              </div>
            </div>

            {/* Bottom Left: Purity */}
            <div className="p-3.5 border-r border-b border-white/10 bg-white/[0.02]">
              <div className="text-[9px] font-bold tracking-[0.1em] text-white/40 uppercase mb-1">
                PURITY
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-mono font-bold text-[#4ADE80]">99.892%</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#4ADE80]" />
              </div>
            </div>

            {/* Bottom Right: Lab */}
            <div className="p-3.5 border-b border-white/10 bg-white/[0.02]">
              <div className="text-[9px] font-bold tracking-[0.1em] text-white/40 uppercase mb-1">
                LAB
              </div>
              <div className="text-xs font-medium text-white/90 truncate" title="Janoshik Analytical">
                Janoshik
              </div>
            </div>
            
          </div>

          {/* Extra Mass Row */}
          <div className="mb-8 flex items-center justify-between px-3.5 py-2.5 bg-black/10 border-l border-r border-b border-white/10 backdrop-blur-sm">
            <span className="text-[9px] font-bold tracking-[0.1em] text-white/40 uppercase">MASS</span>
            <span className="text-xs font-mono text-white/90">4,512 Da</span>
          </div>

          {/* Action Button */}
          <div className="mt-auto">
            <button className="w-full group flex items-center justify-between px-4 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-xl transition-all duration-300">
              <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-white/90 group-hover:text-white transition-colors">
                View Report
              </span>
              <ArrowRight className="w-4 h-4 text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all duration-300" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
