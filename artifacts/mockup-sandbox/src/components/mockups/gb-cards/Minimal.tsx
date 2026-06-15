import React from 'react';
import { Info, X } from 'lucide-react';

export function Minimal() {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 font-sans antialiased">
      {/* 
        Minimal Hypothesis:
        Extreme restraint. White text on near-black, maximum whitespace, typography only,
        delicate borders, generous line-height.
      */}
      <div className="w-full max-w-[370px] bg-[#0A0A0A] border border-white/10 rounded-sm p-8 flex flex-col gap-8 text-white/90">
        
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] uppercase tracking-[0.2em] text-white/60">Active</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs font-medium text-white/80">Apr 22</span>
            <span className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">8d left</span>
          </div>
        </div>

        {/* Identity */}
        <div className="space-y-4">
          <h2 className="text-2xl font-light tracking-tight leading-snug">
            Uther April Group Buy
          </h2>
          <div className="flex items-center gap-2 text-xs font-light text-white/50 tracking-wide">
            <span>Uther</span>
            <span className="text-white/20">|</span>
            <span>by Admin</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm font-light leading-relaxed text-white/60">
          Order will be made for peptides in stock.
        </p>

        {/* Metadata Chips */}
        <div className="flex gap-3">
          <span className="text-[10px] uppercase tracking-widest text-white/40 border border-white/10 px-3 py-1.5 rounded-sm">
            1 product
          </span>
          <span className="text-[10px] uppercase tracking-widest text-white/40 border border-white/10 px-3 py-1.5 rounded-sm">
            USD
          </span>
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-white/10 flex flex-col gap-6">
          <button className="w-full bg-white text-black h-12 text-sm font-medium tracking-wide rounded-sm flex items-center justify-center gap-2 hover:bg-white/90 transition-colors">
            Order <span className="font-light text-black/60 translate-y-[1px]">›</span>
          </button>
          
          <div className="flex items-center justify-between px-2">
            <button className="flex items-center gap-2 text-white/40 hover:text-white transition-colors group">
              <Info className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
              <span className="text-[11px] uppercase tracking-widest">Info</span>
            </button>
            <button className="flex items-center gap-2 text-white/40 hover:text-white transition-colors group">
              <span className="text-[11px] uppercase tracking-widest">Dismiss</span>
              <X className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
