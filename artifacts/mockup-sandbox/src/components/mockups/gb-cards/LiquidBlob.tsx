import React from "react";
import { Clock, MapPin, Package, Info, ChevronRight, User, ShieldCheck } from "lucide-react";

export function LiquidBlob() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#07080F] overflow-hidden relative">
      {/* Background ambient noise for texture */}
      <div 
        className="absolute inset-0 opacity-[0.015] pointer-events-none z-0"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}
      />

      <div className="relative w-full max-w-[400px] group z-10">
        
        {/* Blob 1: Deep Purple -> Indigo */}
        <div className="absolute -top-16 -left-12 w-64 h-64 bg-gradient-to-br from-[#7C3AED] to-[#4338CA] rounded-[40%_60%_70%_30%/40%_50%_60%_50%] opacity-40 blur-[40px] mix-blend-screen pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:opacity-50 group-hover:rotate-6 z-0" />
        
        {/* Blob 2: Teal -> Cyan */}
        <div className="absolute top-1/4 -right-16 w-56 h-56 bg-gradient-to-bl from-[#0D9488] to-[#06B6D4] rounded-[60%_40%_30%_70%/60%_30%_70%_40%] opacity-45 blur-[40px] mix-blend-screen pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:opacity-50 group-hover:-rotate-6 z-0 delay-75" />
        
        {/* Blob 3: Rose -> Orange */}
        <div className="absolute -bottom-16 left-1/4 w-72 h-60 bg-gradient-to-tr from-[#DB2777] to-[#F97316] rounded-[50%_50%_60%_40%/40%_60%_50%_60%] opacity-35 blur-[40px] mix-blend-screen pointer-events-none transition-transform duration-700 group-hover:scale-105 group-hover:opacity-45 group-hover:translate-x-4 z-0 delay-150" />

        {/* Glass Card Overlay */}
        <div className="relative backdrop-blur-[20px] bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-6 overflow-hidden z-10 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
          
          {/* Inner Light Reflection */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent opacity-50 rounded-2xl pointer-events-none" />

          {/* Header Section */}
          <div className="flex flex-col gap-3 relative z-10">
            <div className="flex justify-between items-start">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/5 shadow-sm">
                <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <span className="text-xs font-semibold tracking-wide text-white/90 uppercase">Active</span>
              </div>
            </div>
            
            <h2 className="text-[26px] leading-tight font-bold text-white tracking-tight">
              Uther April Group Buy
            </h2>
            
            {/* Meta Row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-1">
              <div className="flex items-center gap-1.5 text-white/60">
                <User className="w-3.5 h-3.5" />
                <span className="text-sm font-medium">Admin</span>
              </div>
              <div className="flex items-center gap-1.5 text-white/60">
                <MapPin className="w-3.5 h-3.5" />
                <span className="text-sm font-medium">Uther, UK</span>
              </div>
            </div>
          </div>

          {/* Huge Countdown Pill */}
          <div className="relative z-10">
            <div className="flex items-center gap-3 py-4 px-5 rounded-[20px] bg-white/10 border border-white/10 shadow-inner backdrop-blur-md w-full overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent pointer-events-none" />
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 shadow-inner relative z-10">
                <Clock className="w-5 h-5 text-rose-300" />
              </div>
              <span className="text-lg sm:text-xl font-bold tracking-tight text-white relative z-10">
                APR 22 · 8d left
              </span>
            </div>
          </div>

          {/* Info snippet */}
          <div className="flex items-start gap-2.5 relative z-10 bg-white/5 rounded-xl p-3.5 border border-white/5">
            <Info className="w-4 h-4 text-white/40 mt-0.5 shrink-0" />
            <p className="text-sm text-white/60 italic leading-relaxed">
              "Order will be made for peptides in stock"
            </p>
          </div>

          {/* Footer & CTA */}
          <div className="flex items-center justify-between pt-2 relative z-10 mt-2">
            {/* Mini chips */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 border border-white/5 backdrop-blur-md shadow-sm">
                <Package className="w-3.5 h-3.5 text-white/70" />
                <span className="text-xs font-semibold text-white/90">1</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 border border-white/5 backdrop-blur-md shadow-sm">
                <span className="text-xs font-semibold text-white/90">USD</span>
              </div>
            </div>

            {/* CTA: Gradient Border Button */}
            <div className="relative p-[1px] rounded-xl bg-gradient-to-br from-[#7C3AED] via-[#0D9488] to-[#DB2777] overflow-hidden group/btn cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-[#7C3AED] via-[#0D9488] to-[#DB2777] opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300 blur-sm" />
              <button className="relative flex items-center gap-2 px-5 py-2.5 bg-[#0a0a14] group-hover/btn:bg-transparent rounded-[11px] transition-colors duration-300">
                <span className="text-sm font-bold text-white">Join Buy</span>
                <ChevronRight className="w-4 h-4 text-white/70 group-hover/btn:translate-x-1 group-hover/btn:text-white transition-all" />
              </button>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
