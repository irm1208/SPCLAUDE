import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Info, X, ChevronRight, Circle } from "lucide-react";

export function HorizontalSplit() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 font-sans">
      <div className="w-[370px] bg-zinc-950 border border-zinc-800/60 rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex flex-row stretch">
          {/* Left Column - 65% */}
          <div className="w-[65%] p-5 pr-4 flex flex-col justify-between gap-5">
            <div className="space-y-4">
              {/* Top Row: Status + Organiser */}
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-2 py-0.5 rounded-full text-xs font-medium tracking-wide flex items-center gap-1.5">
                  <Circle className="w-1.5 h-1.5 fill-current" />
                  Active
                </Badge>
                <span className="text-xs text-zinc-500 font-medium tracking-wide">
                  by Admin
                </span>
              </div>

              {/* Title & Desc */}
              <div className="space-y-1.5">
                <div className="space-y-0.5">
                  <h3 className="text-lg font-semibold leading-tight text-zinc-100 tracking-tight">
                    Uther April Group Buy
                  </h3>
                  <p className="text-xs font-medium text-zinc-400">
                    Uther
                  </p>
                </div>
                <p className="text-sm text-zinc-400 leading-snug line-clamp-2">
                  Order will be made for peptides in stock
                </p>
              </div>

              {/* Chips */}
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300">
                  1 product
                </span>
                <span className="inline-flex items-center px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300">
                  USD
                </span>
              </div>
            </div>

            {/* CTA */}
            <Button className="w-full bg-zinc-100 hover:bg-white text-zinc-950 font-semibold group mt-2 transition-all">
              Order
              <ChevronRight className="w-4 h-4 ml-1 opacity-70 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </div>

          {/* Right Column - 35% */}
          <div className="w-[35%] bg-gradient-to-b from-zinc-900/40 to-zinc-900/10 border-l border-zinc-800/60 p-4 flex flex-col items-center justify-center text-center relative overflow-hidden">
            {/* Subtle background glow */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="space-y-3 z-10">
              <div className="space-y-1">
                <span className="block text-[10px] font-bold tracking-widest uppercase text-zinc-500">
                  Closes
                </span>
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-light tracking-tighter text-zinc-100">
                    Apr
                  </span>
                  <span className="text-4xl font-semibold tracking-tighter text-zinc-100 leading-none">
                    22
                  </span>
                </div>
              </div>
              
              <div className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
                <span className="text-xs font-semibold text-blue-400">
                  8d left
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-4 py-3 bg-zinc-950 border-t border-zinc-800/60">
          <button className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-colors">
            <Info className="w-4 h-4" />
          </button>
          <button className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
