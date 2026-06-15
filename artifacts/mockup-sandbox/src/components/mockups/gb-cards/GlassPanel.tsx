import React from "react";
import { Info, X, ChevronRight } from "lucide-react";

export function GlassPanel() {
  return (
    <div className="min-h-[100dvh] w-full bg-neutral-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Decorative blurred background elements to show off glass effect */}
      <div className="absolute top-[20%] left-[10%] w-72 h-72 bg-purple-600/30 rounded-full mix-blend-screen filter blur-[80px] animate-pulse"></div>
      <div className="absolute bottom-[20%] right-[10%] w-80 h-80 bg-blue-600/30 rounded-full mix-blend-screen filter blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/20 rounded-full mix-blend-screen filter blur-[80px] animate-pulse" style={{ animationDelay: '4s' }}></div>

      {/* The Glass Card */}
      <div className="relative w-full max-w-[370px] bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[32px] overflow-hidden shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] flex flex-col transition-transform hover:scale-[1.02] duration-500">
        {/* Subtle top inner shadow/highlight */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        
        <div className="p-6 flex flex-col gap-6">
          {/* Header */}
          <div className="flex justify-between items-start gap-4">
            <div className="flex flex-col">
              <span className="text-white/50 text-[11px] font-semibold tracking-widest uppercase mb-1.5 flex items-center gap-1.5">
                Uther <span className="w-1 h-1 rounded-full bg-white/20"></span> by Admin
              </span>
              <h2 className="text-2xl font-medium text-white/95 tracking-tight leading-tight">Uther April Group Buy</h2>
            </div>
            <div className="flex items-center bg-black/20 px-2.5 py-1.5 rounded-full border border-white/[0.08] shadow-inner backdrop-blur-md shrink-0">
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
            <div className="flex-1 bg-black/40 rounded-2xl p-3.5 border border-white/[0.05] backdrop-blur-md relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="text-white/40 text-[10px] font-semibold uppercase tracking-widest mb-1.5">Closes</div>
              <div className="text-white/90 font-medium text-sm flex items-center justify-between">
                Apr 22
                <span className="text-emerald-400/90 text-xs font-medium bg-emerald-400/10 px-1.5 py-0.5 rounded text-center">8d left</span>
              </div>
            </div>
            <div className="flex-1 bg-black/40 rounded-2xl p-3.5 border border-white/[0.05] backdrop-blur-md relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="text-white/40 text-[10px] font-semibold uppercase tracking-widest mb-1.5">Includes</div>
              <div className="flex gap-1.5 items-center h-[24px]">
                <span className="bg-white/[0.08] text-white/80 text-[11px] px-2 py-1 rounded-md font-medium">1 product</span>
                <span className="bg-white/[0.08] text-white/80 text-[11px] px-2 py-1 rounded-md font-medium">USD</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-white/50 hover:text-white/90 hover:bg-white/[0.1] hover:border-white/[0.15] transition-all shadow-sm">
              <Info className="w-5 h-5" />
            </button>
            <button className="flex-1 h-12 bg-white/90 text-neutral-950 font-semibold text-sm rounded-2xl flex items-center justify-center gap-1.5 hover:bg-white transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-[1.02] active:scale-[0.98]">
              Order Now <ChevronRight className="w-4 h-4 text-neutral-500" />
            </button>
            <button className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-white/50 hover:text-white/90 hover:bg-white/[0.1] hover:border-white/[0.15] transition-all shadow-sm">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
