import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Info, X, ChevronRight } from "lucide-react";

export function NeonGlow() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4 font-sans text-slate-200">
      <Card className="w-full max-w-[370px] bg-[#12121a] border-[#00f0ff]/30 shadow-[0_0_15px_rgba(0,240,255,0.15)] relative overflow-hidden rounded-xl">
        {/* Top glow accent */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#00f0ff] to-transparent shadow-[0_0_10px_#00f0ff]" />
        
        <CardHeader className="pb-2 pt-6 relative">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00f0ff] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00f0ff]"></span>
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-[#00f0ff] drop-shadow-[0_0_5px_rgba(0,240,255,0.8)]">Active</span>
            </div>
            <div className="flex bg-[#00f0ff]/10 border border-[#00f0ff]/30 text-[#00f0ff] text-xs px-2 py-1 rounded-full items-center gap-1.5 shadow-[0_0_10px_rgba(0,240,255,0.1)]">
              <span className="font-semibold">Apr 22</span>
              <span className="opacity-50">•</span>
              <span className="font-bold">8d left</span>
            </div>
          </div>
          
          <h2 className="text-2xl font-black text-white tracking-tight leading-tight mt-1 mb-1">
            Uther April Group Buy
          </h2>
          <div className="flex items-center text-sm text-slate-400 gap-2">
            <span className="text-slate-300 font-medium">Uther</span>
            <span className="w-1 h-1 rounded-full bg-slate-600"></span>
            <span>by Admin</span>
          </div>
        </CardHeader>
        
        <CardContent className="pb-4">
          <p className="text-sm text-slate-300 mb-4 leading-relaxed bg-white/5 p-3 rounded-lg border border-white/5">
            Order will be made for peptides in stock
          </p>
          
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-[#1a1a24] text-slate-300 border-white/10 hover:bg-[#222230]">
              1 product
            </Badge>
            <Badge variant="outline" className="bg-[#1a1a24] text-slate-300 border-white/10 hover:bg-[#222230]">
              USD
            </Badge>
          </div>
        </CardContent>
        
        <div className="px-6 pb-4">
          <Button className="w-full bg-[#00f0ff] hover:bg-[#00f0ff]/90 text-black font-bold text-base h-12 shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all hover:shadow-[0_0_25px_rgba(0,240,255,0.6)] hover:scale-[1.02] active:scale-[0.98]">
            Order <ChevronRight className="ml-1 w-5 h-5" />
          </Button>
        </div>
        
        <CardFooter className="pt-2 pb-4 flex justify-between border-t border-white/5">
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-[#00f0ff] hover:bg-[#00f0ff]/10 h-8 px-2 gap-1.5 transition-colors">
            <Info className="w-4 h-4" />
            <span className="text-xs">Info</span>
          </Button>
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-red-400 hover:bg-red-400/10 h-8 px-2 gap-1.5 transition-colors">
            <span className="text-xs">Dismiss</span>
            <X className="w-4 h-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
