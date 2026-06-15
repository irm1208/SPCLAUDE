import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Info, X, ChevronRight } from "lucide-react";

export function BoldTypographic() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 font-sans text-zinc-100">
      <div className="w-[370px] bg-[#09090b] border border-zinc-800/50 rounded-[32px] overflow-hidden relative shadow-2xl flex flex-col h-[520px]">
        {/* Background Watermark Typography */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] select-none mix-blend-overlay">
          <h1 className="text-[180px] font-black leading-[0.75] tracking-tighter text-white -rotate-12 scale-[1.8] text-center word-break-all uppercase">
            UTHER
            <br />
            APRIL
            <br />
            GROUP
            <br />
            BUY
          </h1>
        </div>

        {/* Content Overlay */}
        <div className="relative z-10 flex flex-col h-full p-6 justify-between">
          {/* Top Section */}
          <div className="space-y-6">
            {/* Header & Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Active</span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-sm font-bold text-zinc-300">Apr 22</span>
                <span className="text-xs font-medium text-rose-400">8d left</span>
              </div>
            </div>

            {/* Main Identity */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-zinc-500">
                <span className="text-sm font-medium uppercase tracking-widest">Uther</span>
                <span className="w-1 h-1 rounded-full bg-zinc-700" />
                <span className="text-sm font-medium">by Admin</span>
              </div>
              <h2 className="text-3xl font-black tracking-tight text-white leading-none">
                Uther April<br />Group Buy
              </h2>
            </div>

            {/* Description & Chips */}
            <div className="space-y-4">
              <p className="text-sm text-zinc-400 leading-relaxed font-medium">
                Order will be made for peptides in stock. Ensure your wallet is funded.
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="bg-zinc-800/80 text-zinc-300 hover:bg-zinc-800 border-zinc-700/50">
                  1 product
                </Badge>
                <Badge variant="secondary" className="bg-zinc-800/80 text-zinc-300 hover:bg-zinc-800 border-zinc-700/50">
                  USD
                </Badge>
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="space-y-4 mt-auto pt-6">
            <Button className="w-full h-14 rounded-2xl bg-white hover:bg-zinc-200 text-black font-bold text-lg group transition-all duration-300 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_-15px_rgba(255,255,255,0.5)]">
              Order
              <ChevronRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
            </Button>
            
            <div className="flex items-center justify-center gap-6">
              <button className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors rounded-full hover:bg-zinc-800/50">
                <Info className="w-5 h-5" />
              </button>
              <button className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors rounded-full hover:bg-zinc-800/50">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
