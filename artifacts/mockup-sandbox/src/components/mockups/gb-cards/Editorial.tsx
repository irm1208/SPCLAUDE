import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Info, X } from 'lucide-react';

export function Editorial() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050505] p-4 font-sans text-stone-200">
      <div className="relative w-[370px] min-h-[500px] overflow-hidden bg-[#0a0a0a] border border-white/10 p-8 flex flex-col group">
        
        {/* Top Header */}
        <div className="flex justify-between items-center text-[10px] uppercase tracking-[0.25em] font-medium text-stone-400">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Active</span>
          </div>
          <span>Apr 22</span>
        </div>

        {/* Hero Title */}
        <div className="flex flex-col mt-16 mb-12 flex-1">
          <div className="text-[10px] uppercase tracking-[0.3em] text-stone-500 font-medium mb-4 flex gap-2 items-center">
            <span>Uther</span>
            <span className="w-4 h-[1px] bg-stone-700"></span>
            <span>by Admin</span>
          </div>
          <h2 className="text-[56px] font-serif leading-[0.85] tracking-[-0.04em] text-stone-100 uppercase">
            Uther<br />
            April<br />
            Group<br />
            Buy.
          </h2>
        </div>

        {/* Details & Actions */}
        <div className="flex flex-col gap-6 mt-auto">
          <div className="border-t border-white/10 pt-6">
            <p className="text-xs text-stone-400 leading-relaxed font-serif italic tracking-wide mb-4">
              "Order will be made for peptides in stock."
            </p>
            
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-500 font-bold mr-2">8d left</span>
              <Badge variant="outline" className="rounded-none border-white/20 text-stone-300 text-[9px] font-medium uppercase tracking-widest px-2 py-0.5 bg-transparent">1 product</Badge>
              <Badge variant="outline" className="rounded-none border-white/20 text-stone-300 text-[9px] font-medium uppercase tracking-widest px-2 py-0.5 bg-transparent">USD</Badge>
            </div>
          </div>
          
          <Button className="w-full bg-stone-100 hover:bg-white text-stone-950 rounded-none h-14 text-[11px] uppercase tracking-[0.2em] font-bold transition-all group relative overflow-hidden">
            <span className="relative z-10 flex items-center gap-2">
              Order Now <span className="text-stone-400 group-hover:translate-x-1 transition-transform">›</span>
            </span>
          </Button>
          
          <div className="flex justify-center items-center gap-6 mt-2">
            <button className="w-8 h-8 rounded-full border border-white/10 text-stone-500 hover:text-stone-300 hover:border-white/30 transition-all flex items-center justify-center">
              <Info className="w-3.5 h-3.5" />
            </button>
            <button className="w-8 h-8 rounded-full border border-white/10 text-stone-500 hover:text-stone-300 hover:border-white/30 transition-all flex items-center justify-center">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
