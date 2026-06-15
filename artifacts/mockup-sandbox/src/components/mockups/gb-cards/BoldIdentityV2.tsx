import React from 'react';
import { FlaskConical, MapPin, ChevronRight, Users, Calendar, Package } from 'lucide-react';

export function BoldIdentityV2() {
  const accentColor = "#5B8DEF";

  return (
    <div className="min-h-screen bg-[#0A0B0F] flex items-center justify-center p-6 font-sans">
      <div className="w-[380px] flex flex-col rounded-[2rem] overflow-hidden shadow-2xl border border-white/5 relative">
        
        {/* Header - Full Saturated Band */}
        <div style={{ backgroundColor: accentColor }} className="pt-8 px-8 pb-14 text-black relative">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-2 bg-black/15 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-sm">
              <div className="w-2 h-2 rounded-full bg-[#34D399] shadow-[0_0_8px_rgba(52,211,153,0.5)]"></div>
              Active
            </div>
            <div className="font-bold text-xs bg-black/15 px-3 py-1.5 rounded-full uppercase tracking-widest backdrop-blur-sm">
              8d left
            </div>
          </div>
          
          <h2 className="text-[2.5rem] font-black uppercase leading-[1.05] tracking-tighter">
            Uther April<br/>Group Buy
          </h2>
          
          {/* Centerpiece Icon */}
          <div className="absolute -bottom-8 right-8 w-16 h-16 bg-[#0A0B0F] rounded-2xl flex items-center justify-center shadow-2xl rotate-3 border border-white/10 z-10">
            <FlaskConical className="w-8 h-8" style={{ color: accentColor }} strokeWidth={2.5} />
          </div>
        </div>

        {/* Body */}
        <div className="bg-[#12141A] p-8 pt-12 flex flex-col gap-8">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/[0.03] border border-white/[0.05] p-4 rounded-2xl flex flex-col gap-1.5 hover:bg-white/[0.05] transition-colors">
              <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Manufacturer</span>
              <div className="flex items-center gap-1.5 text-white text-sm font-semibold">
                <MapPin className="w-3.5 h-3.5 text-white/40" strokeWidth={2.5} />
                Uther, UK
              </div>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.05] p-4 rounded-2xl flex flex-col gap-1.5 hover:bg-white/[0.05] transition-colors">
              <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Organiser</span>
              <div className="flex items-center gap-1.5 text-white text-sm font-semibold">
                <Users className="w-3.5 h-3.5 text-white/40" strokeWidth={2.5} />
                by Admin
              </div>
            </div>
          </div>

          <div 
            className="pl-5 py-1 text-sm text-white/70 leading-relaxed font-medium" 
            style={{ borderLeft: `3px solid ${accentColor}` }}
          >
            Order will be made for peptides in stock
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white p-8">
          <div className="flex items-center justify-between text-black/50 text-xs font-bold uppercase tracking-widest mb-8 px-1">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-black/40" />
              Apr 22
            </div>
            <div className="flex items-center gap-1.5">
              <Package className="w-4 h-4 text-black/40" />
              1 product
            </div>
            <div className="flex items-center gap-1.5 text-black/30">
              USD
            </div>
          </div>

          <button 
            style={{ backgroundColor: accentColor }}
            className="w-full py-4 rounded-2xl font-black text-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-lg"
          >
            Order
            <ChevronRight className="w-5 h-5" strokeWidth={3} />
          </button>
        </div>

      </div>
    </div>
  );
}
