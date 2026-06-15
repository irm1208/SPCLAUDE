import React from "react";
import { FlaskConical, MapPin, ChevronRight, Info, Users, Calendar, Package } from "lucide-react";

export function NeonSignalV2() {
  const accentColor = "#5B8DEF";
  const glowShadow = `0 0 15px ${accentColor}40`;
  const strongGlowShadow = `0 0 20px ${accentColor}80`;
  const textGlow = `0 0 10px ${accentColor}60`;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#0A0B0F] font-sans antialiased">
      {/* Card Container */}
      <div 
        className="relative w-full max-w-[380px] bg-[#0F111A] rounded-2xl overflow-hidden border border-white/5 flex flex-col"
        style={{
          boxShadow: `0 10px 40px -10px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05), inset 0 0 20px ${accentColor}10`
        }}
      >
        {/* Top Accent Line */}
        <div 
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ 
            backgroundColor: accentColor,
            boxShadow: `0 0 15px 2px ${accentColor}`
          }}
        />

        {/* Header Section */}
        <div className="p-6 pb-4">
          <div className="flex justify-between items-start mb-4">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#151822] border border-white/10"
              style={{
                boxShadow: glowShadow,
                borderColor: `${accentColor}30`
              }}
            >
              <FlaskConical size={24} style={{ color: accentColor, filter: `drop-shadow(0 0 8px ${accentColor})` }} />
            </div>
            
            {/* Status Badge */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#151822] border border-white/5">
              <div className="relative flex items-center justify-center w-2 h-2">
                <span className="absolute w-full h-full bg-green-400 rounded-full animate-ping opacity-75"></span>
                <span className="relative w-2 h-2 bg-green-400 rounded-full" style={{ boxShadow: '0 0 8px #4ade80' }}></span>
              </div>
              <span className="text-xs font-medium text-white/90 uppercase tracking-wider">Active</span>
            </div>
          </div>

          <h2 
            className="text-2xl font-bold text-white mb-1 tracking-tight"
            style={{ textShadow: textGlow }}
          >
            Uther April Group Buy
          </h2>
          <div className="flex items-center gap-1.5 text-sm text-white/50 mb-5">
            <Users size={14} />
            <span>by Admin</span>
          </div>

          {/* Info Pills */}
          <div className="flex flex-wrap gap-2 mb-6">
            <div 
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#151822]/80 border backdrop-blur-sm"
              style={{ borderColor: `${accentColor}40`, boxShadow: `inset 0 0 10px ${accentColor}10` }}
            >
              <Calendar size={13} style={{ color: accentColor }} />
              <span className="text-xs font-medium text-white/80">Apr 22</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${accentColor}20`, color: accentColor }}>8d left</span>
            </div>

            <div 
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#151822]/80 border backdrop-blur-sm"
              style={{ borderColor: `${accentColor}40`, boxShadow: `inset 0 0 10px ${accentColor}10` }}
            >
              <Package size={13} style={{ color: accentColor }} />
              <span className="text-xs font-medium text-white/80">1 product</span>
            </div>

            <div 
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#151822]/80 border backdrop-blur-sm"
              style={{ borderColor: `${accentColor}40`, boxShadow: `inset 0 0 10px ${accentColor}10` }}
            >
              <span className="text-xs font-medium" style={{ color: accentColor }}>$</span>
              <span className="text-xs font-medium text-white/80">USD</span>
            </div>
          </div>

          {/* Manufacturer Info */}
          <div className="flex items-center justify-between py-3 border-y border-white/5">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Manufacturer</span>
              <span className="text-sm font-semibold text-white/90">Uther</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/5">
              <MapPin size={12} className="text-white/40" />
              <span className="text-xs font-medium text-white/70">UK</span>
            </div>
          </div>
        </div>

        {/* Footer Area */}
        <div className="px-6 pb-6 pt-2 mt-auto">
          {/* Info Snippet */}
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#151822] border border-white/5 mb-4">
            <Info size={14} className="text-white/40 mt-0.5 shrink-0" />
            <p className="text-xs text-white/60 leading-relaxed">
              Order will be made for peptides in stock
            </p>
          </div>

          {/* CTA Button */}
          <button 
            className="w-full relative group flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white transition-all duration-300 overflow-hidden"
            style={{
              backgroundColor: accentColor,
              boxShadow: strongGlowShadow
            }}
          >
            {/* Inner glow / gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent mix-blend-overlay"></div>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/10 transition-opacity duration-300"></div>
            
            <span className="relative z-10 flex items-center gap-2 tracking-wide" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
              Order Now
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
