import React from "react";
import { Info, X } from "lucide-react";

export function SportsDark() {
  return (
    <div className="flex justify-center items-center min-h-[100dvh] bg-[#0a0a0a] p-4 font-sans antialiased selection:bg-blue-500 selection:text-black">
      <div className="w-[370px] bg-[#111111] border-l-4 border-l-blue-600 relative overflow-hidden flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        {/* Decorative background slash */}
        <div className="absolute top-0 right-0 w-64 h-[150%] bg-gradient-to-l from-blue-600/10 to-transparent -skew-x-12 translate-x-24 -translate-y-10 pointer-events-none" />
        <div className="absolute top-0 right-0 w-1 h-full bg-blue-600/20 -skew-x-12 translate-x-8 pointer-events-none" />
        
        {/* Top bar */}
        <div className="p-6 pb-4 flex justify-between items-start relative z-10">
          <div className="flex flex-col gap-0.5">
            <span className="text-blue-500 font-black uppercase tracking-[0.2em] text-[10px]">Uther</span>
            <span className="text-neutral-500 font-bold text-[10px] uppercase tracking-widest">By Admin</span>
          </div>
          <div className="bg-blue-600 text-black font-black uppercase italic px-3 py-1 text-xs -skew-x-12 shadow-[0_0_10px_rgba(37,99,235,0.4)]">
            <span className="block skew-x-12 flex items-center gap-1.5 tracking-wider">
              <div className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
              Active
            </span>
          </div>
        </div>

        {/* Main Title */}
        <div className="px-6 py-2 relative z-10">
          <h2 className="text-4xl font-black uppercase italic tracking-tighter leading-[0.9] text-white">
            Uther April<br />
            <span className="text-neutral-300">Group Buy</span>
          </h2>
          <p className="text-neutral-400 text-sm font-medium mt-4 leading-snug max-w-[85%]">
            Order will be made for peptides in stock
          </p>
        </div>

        {/* Chips */}
        <div className="px-6 flex gap-2 relative z-10 mt-4 mb-2">
          <span className="bg-[#1a1a1a] border border-neutral-800 text-neutral-300 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 -skew-x-6">
            <span className="block skew-x-6">1 Product</span>
          </span>
          <span className="bg-[#1a1a1a] border border-neutral-800 text-neutral-300 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 -skew-x-6">
            <span className="block skew-x-6">USD</span>
          </span>
        </div>

        {/* Metadata grid */}
        <div className="px-6 py-5 grid grid-cols-2 gap-4 relative z-10 border-y border-neutral-800/50 mt-4 bg-gradient-to-r from-transparent via-neutral-900/30 to-transparent">
          <div>
            <div className="text-neutral-500 text-[10px] uppercase font-black tracking-widest mb-1">Close Date</div>
            <div className="text-white font-black text-2xl italic uppercase tracking-tight">Apr 22</div>
          </div>
          <div>
             <div className="text-neutral-500 text-[10px] uppercase font-black tracking-widest mb-1">Time Left</div>
             <div className="text-blue-500 font-black text-2xl italic uppercase tracking-tight drop-shadow-[0_0_8px_rgba(37,99,235,0.3)]">8d left</div>
          </div>
        </div>

        {/* CTA & Footer */}
        <div className="mt-auto relative z-10 p-6 pt-6 flex flex-col gap-4 bg-[#111111]">
          <button className="w-full bg-blue-600 hover:bg-blue-500 transition-colors text-black font-black uppercase italic text-xl py-4 -skew-x-12 relative group overflow-hidden">
            {/* button highlight slash */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] skew-x-12" />
            <span className="block skew-x-12 group-hover:scale-105 transition-transform duration-300 tracking-wider">
              Order ›
            </span>
          </button>
          
          <div className="flex justify-between items-center mt-2 px-1">
            <button className="text-neutral-600 hover:text-white transition-colors flex items-center justify-center -skew-x-6 group">
              <span className="block skew-x-6 bg-neutral-900 border border-neutral-800 p-2 rounded-sm group-hover:border-neutral-600 transition-colors">
                <Info className="w-4 h-4" />
              </span>
            </button>
            <button className="text-neutral-600 hover:text-white transition-colors flex items-center justify-center -skew-x-6 group">
              <span className="block skew-x-6 bg-neutral-900 border border-neutral-800 p-2 rounded-sm group-hover:border-neutral-600 transition-colors">
                <X className="w-4 h-4" />
              </span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Tailwind arbitrary values require keyframes to be globally defined, so adding inline style for shimmer if needed, 
          but usually we can rely on standard transitions. We'll add a simple CSS rule for the shimmer effect. */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}} />
    </div>
  );
}
