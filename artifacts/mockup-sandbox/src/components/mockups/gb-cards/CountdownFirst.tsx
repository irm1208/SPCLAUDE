import React from "react";
import { Info, X, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function CountdownFirst() {
  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4 font-sans text-neutral-200">
      <div className="w-full max-w-[370px] bg-neutral-900 rounded-2xl overflow-hidden border border-red-900/30 shadow-2xl shadow-red-900/10 flex flex-col relative">
        
        {/* Top Urgency Section */}
        <div className="bg-gradient-to-b from-red-950/40 to-neutral-900 pt-6 pb-4 px-5 flex flex-col items-center border-b border-red-900/20 relative">
          
          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span className="text-[10px] font-bold tracking-widest uppercase text-red-500">Closing Soon</span>
          </div>

          <div className="absolute top-3 left-3">
             <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px] h-5 rounded-sm px-1.5 font-medium uppercase tracking-wider">
               Active
             </Badge>
          </div>

          <div className="text-center mt-4 w-full">
            <p className="text-red-400/80 text-[10px] uppercase tracking-widest font-semibold mb-2 flex items-center justify-center gap-1">
              <Clock className="w-3 h-3" /> Time Remaining
            </p>
            <div className="flex items-center justify-center gap-2 font-mono tabular-nums">
              <div className="flex flex-col items-center">
                <span className="bg-neutral-950 border border-red-900/50 text-red-500 text-4xl font-bold rounded-lg px-3 py-2 shadow-inner leading-none tracking-tighter">08</span>
                <span className="text-[9px] text-neutral-500 font-sans uppercase tracking-widest mt-1">Days</span>
              </div>
              <span className="text-red-600/50 text-2xl font-bold -mt-4">:</span>
              <div className="flex flex-col items-center">
                <span className="bg-neutral-950 border border-red-900/50 text-red-500 text-4xl font-bold rounded-lg px-3 py-2 shadow-inner leading-none tracking-tighter">04</span>
                <span className="text-[9px] text-neutral-500 font-sans uppercase tracking-widest mt-1">Hrs</span>
              </div>
              <span className="text-red-600/50 text-2xl font-bold -mt-4">:</span>
              <div className="flex flex-col items-center">
                <span className="bg-neutral-950 border border-red-900/50 text-red-500 text-4xl font-bold rounded-lg px-3 py-2 shadow-inner leading-none tracking-tighter">22</span>
                <span className="text-[9px] text-neutral-500 font-sans uppercase tracking-widest mt-1">Min</span>
              </div>
            </div>
            <div className="mt-3 text-xs text-neutral-500 font-medium">Closes Apr 22</div>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-5 flex flex-col gap-4">
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <h2 className="text-xl font-bold text-white tracking-tight leading-tight">Uther April Group Buy</h2>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-neutral-400 font-medium">Uther</span>
              <span className="text-neutral-600">•</span>
              <span className="text-neutral-500">by Admin</span>
            </div>
          </div>

          <p className="text-sm text-neutral-400 leading-snug">
            Order will be made for peptides in stock. Payment due immediately upon closing.
          </p>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="bg-neutral-800 text-neutral-300 hover:bg-neutral-800 rounded-sm font-medium border-0">1 product</Badge>
            <Badge variant="secondary" className="bg-neutral-800 text-neutral-300 hover:bg-neutral-800 rounded-sm font-medium border-0">USD</Badge>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-auto px-5 pb-5 pt-2 flex flex-col gap-3">
          <Button className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-6 text-lg rounded-xl shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-all border-0">
            Order Now <span className="ml-1 text-xl">›</span>
          </Button>
          
          <div className="flex justify-between items-center px-1 mt-1">
            <button className="text-neutral-500 hover:text-neutral-300 transition-colors flex items-center gap-1.5 text-xs font-medium">
              <Info className="w-4 h-4" /> Details
            </button>
            <button className="text-neutral-500 hover:text-neutral-300 transition-colors flex items-center gap-1.5 text-xs font-medium">
              <X className="w-4 h-4" /> Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
