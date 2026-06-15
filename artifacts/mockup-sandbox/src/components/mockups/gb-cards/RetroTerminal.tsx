import React, { useEffect, useState } from "react";
import { Terminal, Database, ShieldAlert, Cpu } from "lucide-react";

export function RetroTerminal() {
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setCursorVisible((v) => !v);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-6 font-mono selection:bg-[#39FF14] selection:text-[#050A05]"
      style={{
        backgroundColor: "#050A05",
        backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.15), rgba(0,0,0,0.15) 1px, transparent 1px, transparent 2px)",
        backgroundSize: "100% 2px",
      }}
    >
      <div 
        className="w-full max-w-2xl border-2 border-[#39FF14]/30 rounded p-6 relative overflow-hidden"
        style={{
          boxShadow: "inset 0 0 20px rgba(57,255,20,0.1), 0 0 10px rgba(57,255,20,0.2)",
          color: "#39FF14",
          textShadow: "0 0 5px rgba(57,255,20,0.6)",
        }}
      >
        {/* Screen glare effect */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/[0.02] to-transparent rounded z-10" />
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6 pb-2 border-b border-[#39FF14]/30 border-dashed">
          <div className="flex items-center gap-2">
            <Terminal size={18} />
            <span className="font-bold tracking-wider">
              {">"} GB_SYSTEM v2.4 [ACTIVE]<span className={cursorVisible ? "opacity-100" : "opacity-0"}>_</span>
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs opacity-80">
            <div className="flex items-center gap-1"><ShieldAlert size={12} /> SECURE</div>
            <div className="flex items-center gap-1"><Cpu size={12} /> ON-LINE</div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-3 text-sm md:text-base leading-relaxed tracking-wide">
          <div className="flex">
            <span className="w-32 opacity-70">NAME.....:</span>
            <span>UTHER APRIL GROUP BUY</span>
          </div>
          <div className="flex">
            <span className="w-32 opacity-70">MFCT.....:</span>
            <span>UTHER / UK</span>
          </div>
          <div className="flex">
            <span className="w-32 opacity-70">ORGANISER:</span>
            <span>ADMIN</span>
          </div>
          <div className="flex">
            <span className="w-32 opacity-70">CLOSES...:</span>
            <span>22-APR  [08 DAYS]</span>
          </div>
          <div className="flex">
            <span className="w-32 opacity-70">PRODUCTS.:</span>
            <span>001</span>
          </div>
          <div className="flex">
            <span className="w-32 opacity-70">CURRENCY.:</span>
            <span>USD</span>
          </div>
          <div className="flex">
            <span className="w-32 opacity-70">STATUS...:</span>
            <span className="flex items-center gap-2">
              <span>[■■■■■■■■░░]</span>
              <span className="animate-pulse">ACTIVE</span>
            </span>
          </div>
          <div className="flex">
            <span className="w-32 opacity-70">INFO.....:</span>
            <span>PEPTIDES IN STOCK</span>
          </div>
        </div>

        {/* Separator */}
        <div className="my-6 text-[#39FF14]/50 overflow-hidden whitespace-nowrap">
          ─────────────────────────────────────────────────────────────────────────────────
        </div>

        {/* Action */}
        <div className="flex justify-end">
          <button 
            className="group relative px-6 py-2 border border-[#39FF14] hover:bg-[#39FF14] hover:text-[#050A05] transition-colors duration-200 uppercase tracking-widest font-bold"
            style={{
              textShadow: "none"
            }}
          >
            <span className="absolute -inset-1 border border-[#39FF14]/30 group-hover:border-transparent transition-colors"></span>
            [ SUBMIT ORDER ]
          </button>
        </div>
        
        {/* Subtle scanline overlay specific to content box */}
        <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(0,0,0,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] z-20" />
      </div>
    </div>
  );
}
