import React from "react";
import { Info, X, ChevronRight } from "lucide-react";

export function EventPoster() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 font-sans selection:bg-emerald-500/30">
      {/* Card Wrapper */}
      <div className="w-full max-w-[370px] flex relative rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 shadow-2xl">
        
        {/* Left Stub */}
        <div className="w-20 shrink-0 bg-zinc-900 border-r-2 border-dashed border-zinc-700/50 flex flex-col items-center py-6 relative">
          {/* Ticket Cutouts */}
          <div className="absolute -top-3 -right-3 w-6 h-6 bg-black rounded-full border-b border-l border-zinc-800"></div>
          <div className="absolute -bottom-3 -right-3 w-6 h-6 bg-black rounded-full border-t border-l border-zinc-800"></div>

          <div className="flex flex-col items-center gap-1 mb-auto">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">APR</span>
            <span className="text-2xl font-black text-white leading-none">22</span>
          </div>

          <div className="flex-1 flex items-center justify-center rotate-180 my-8" style={{ writingMode: 'vertical-rl' }}>
            <span className="text-emerald-400 font-black uppercase tracking-[0.3em] text-sm whitespace-nowrap">
              8 Days Left
            </span>
          </div>
          
          {/* Barcode decorative element */}
          <div className="w-full px-2 flex justify-between h-8 opacity-40 mt-auto">
            <div className="w-1 bg-white h-full"></div>
            <div className="w-0.5 bg-white h-full"></div>
            <div className="w-1.5 bg-white h-full"></div>
            <div className="w-0.5 bg-white h-full"></div>
            <div className="w-1 bg-white h-full"></div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-5 flex flex-col relative bg-gradient-to-br from-zinc-900 to-zinc-950">
          <div className="space-y-6 flex-1">
            {/* Top row: Status & Chips */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 bg-black border border-zinc-800/80 px-2 py-1 rounded-full">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">Active</span>
              </div>
              <div className="flex gap-1.5 flex-wrap justify-end">
                <span className="text-[10px] font-medium px-2 py-1 rounded-md bg-zinc-800 text-zinc-400 uppercase tracking-wider">
                  1 Product
                </span>
                <span className="text-[10px] font-medium px-2 py-1 rounded-md bg-zinc-800 text-zinc-400 uppercase tracking-wider">
                  USD
                </span>
              </div>
            </div>

            {/* Title Area */}
            <div>
              <h2 className="text-[28px] font-black text-white uppercase tracking-tighter leading-[0.9] mb-3">
                Uther April<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600">Group Buy</span>
              </h2>
              
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
                <span className="flex items-center gap-1">
                  <span className="text-zinc-600">MFR</span>
                  <span className="text-zinc-300">Uther</span>
                </span>
                <span className="text-zinc-700">•</span>
                <span className="text-zinc-400">By Admin</span>
              </div>
            </div>

            {/* Description */}
            <div className="bg-black/40 border-l-2 border-emerald-500/50 pl-3 py-1 my-2">
              <p className="text-sm text-zinc-400 italic leading-snug">
                "Order will be made for peptides in stock"
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="mt-8 flex items-center gap-3">
            <div className="flex gap-2 shrink-0">
              <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors border border-zinc-700/50 hover:border-zinc-600">
                <Info size={18} strokeWidth={2} />
              </button>
              <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors border border-zinc-700/50 hover:border-zinc-600">
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            
            <button className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-[0.2em] text-sm py-3 px-4 rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] flex items-center justify-between group h-10">
              <span className="pl-2">Order</span>
              <ChevronRight size={18} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
