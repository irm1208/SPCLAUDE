import React from "react";
import { Info, X, ChevronRight } from "lucide-react";

export function GlassPanelV3() {
  return (
    <div className="min-h-[100dvh] w-full bg-neutral-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Decorative blurred background elements - Premium Version */}
      <div className="absolute top-[20%] left-[10%] w-72 h-72 bg-indigo-700/25 rounded-full filter blur-[90px] animate-pulse"></div>
      <div className="absolute bottom-[20%] right-[10%] w-80 h-80 bg-violet-800/20 rounded-full filter blur-[90px] animate-pulse" style={{ animationDelay: '2s' }}></div>

      {/* The Glass Card Wrapper (gradient border) */}
      <div className="relative w-full max-w-[370px] p-[1px] rounded-[33px] bg-gradient-to-br from-white/20 via-white/5 to-transparent shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] transition-transform hover:scale-[1.02] duration-500">
        
        {/* Inner Card */}
        <div className="bg-[#0a0a12]/90 backdrop-blur-2xl rounded-[32px] overflow-hidden flex flex-col w-full h-full relative">
          
          {/* Subtle top inner shadow/highlight */}
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent z-10"></div>
          
          <div className="p-7 flex flex-col gap-5 relative z-10">
            {/* Header */}
            <div className="flex justify-between items-start gap-4">
              <div className="flex flex-col">
                <span className="text-white/50 text-[11px] font-semibold tracking-widest uppercase mb-1.5 flex items-center gap-1.5">
                  Uther <span className="w-1 h-1 rounded-full bg-white/20"></span> by Admin
                </span>
                <h2 className="text-[24px] font-bold text-white/95 tracking-tight leading-tight">Uther April Group Buy</h2>
              </div>
              <div className="flex items-center bg-black/20 px-2.5 py-1.5 rounded-full border border-white/[0.08] shadow-inner backdrop-blur-md shrink-0 mt-1">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-1.5 shadow-[0_0_8px_rgba(52,211,153,0.6)]"></div>
                <span className="text-white/80 text-[11px] font-medium tracking-wide uppercase">Active</span>
              </div>
            </div>

            {/* Key Info Text */}
            <p className="text-white/60 text-sm leading-relaxed font-light">
              Order will be made for peptides in stock. Secure your items before the deadline.
            </p>

            {/* Stats Row */}
            <div className="flex gap-3">
              <div className="flex-1 bg-amber-500/[0.04] rounded-2xl p-4 border border-amber-500/10 backdrop-blur-md">
                <div className="text-white/40 text-[10px] font-semibold uppercase tracking-widest mb-1.5">Closes</div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-white/90 font-semibold text-base">Apr 22</span>
                  <span className="text-amber-400/80 text-[11px] font-medium">8d left</span>
                </div>
              </div>
              <div className="flex-1 bg-black/40 rounded-2xl p-4 border border-white/[0.05] backdrop-blur-md">
                <div className="text-white/40 text-[10px] font-semibold uppercase tracking-widest mb-1.5">Includes</div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-white/90 font-semibold text-base">1 product</span>
                  <span className="text-white/50 text-[11px] font-medium">USD</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button className="w-[52px] h-[52px] rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-white/50 transition-colors hover:bg-white/10 hover:text-white">
                <Info className="w-5 h-5" />
              </button>
              <button className="flex-1 h-[52px] bg-white text-neutral-900 font-semibold text-sm rounded-2xl flex items-center justify-center gap-1.5 shadow-[0_0_24px_rgba(255,255,255,0.15)] transition-transform active:scale-95">
                Order Now <ChevronRight className="w-4 h-4 text-neutral-500" />
              </button>
              <button className="w-[52px] h-[52px] rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-white/50 transition-colors hover:bg-white/10 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
