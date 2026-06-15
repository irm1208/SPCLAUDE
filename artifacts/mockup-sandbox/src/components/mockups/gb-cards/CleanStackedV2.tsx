import React from 'react';
import { FlaskConical, MapPin, ChevronRight, Info, Users, Calendar, Package } from 'lucide-react';

export function CleanStackedV2() {
  const accentColor = "#5B8DEF";

  return (
    <div className="min-h-screen bg-[#0A0B0F] flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-[380px] rounded-xl overflow-hidden shadow-2xl flex flex-col ring-1 ring-white/10">
        
        {/* Zone 1: Dark Header Band */}
        <div className="bg-gradient-to-b from-zinc-900 to-black p-6 relative overflow-hidden">
          <div 
            className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-20 blur-3xl pointer-events-none translate-x-1/3 -translate-y-1/3"
            style={{ backgroundColor: accentColor }}
          />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/5 backdrop-blur-md ring-1 ring-white/10 shadow-lg"
              >
                <FlaskConical size={20} style={{ color: accentColor }} />
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-medium text-zinc-200 backdrop-blur-md">
                <Calendar size={12} className="opacity-70" />
                Apr 22
                <span className="text-zinc-500 mx-1">•</span>
                <span style={{ color: accentColor }}>8d left</span>
              </div>
            </div>
            
            <h2 className="text-[22px] leading-tight font-bold text-white tracking-tight">
              Uther April Group Buy
            </h2>
          </div>
        </div>

        {/* Zone 2: Light Middle Section */}
        <div className="bg-white px-6 py-6">
          <div className="flex gap-6">
            {/* Left Column: Details */}
            <div className="flex-1 flex flex-col gap-5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <FlaskConical size={14} className="text-zinc-500" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">Manufacturer</span>
                  <div className="flex items-center gap-1.5 text-[14px] font-semibold text-zinc-900">
                    Uther <span className="text-zinc-500 font-medium flex items-center text-[13px]"><MapPin size={12} className="mr-0.5" /> UK</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Users size={14} className="text-zinc-500" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">Organiser</span>
                  <div className="text-[14px] font-semibold text-zinc-900">
                    by Admin
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50/50 rounded-lg p-3 text-[13px] text-zinc-700 leading-snug border border-blue-100/50 flex gap-2.5 items-start mt-1">
                <Info size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
                <p>Order will be made for peptides in stock</p>
              </div>
            </div>
            
            {/* Right Column: Stats */}
            <div className="w-28 flex flex-col gap-6 border-l border-zinc-100 pl-6 shrink-0 pt-1">
              <div>
                <div className="flex items-center gap-1.5 text-zinc-400 mb-1.5">
                  <Package size={12} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Products</span>
                </div>
                <div className="text-2xl font-bold text-zinc-900 leading-none tracking-tight">1</div>
              </div>
              
              <div>
                <div className="flex items-center gap-1.5 text-zinc-400 mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Currency</span>
                </div>
                <div className="text-lg font-bold text-zinc-900 leading-none tracking-tight">USD</div>
              </div>
            </div>
          </div>
        </div>

        {/* Zone 3: Footer */}
        <div className="bg-zinc-50 px-6 py-5 border-t border-zinc-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-zinc-700">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
              </span>
              Active
            </div>
          </div>
          
          <button 
            className="w-full py-3.5 px-4 rounded-xl text-white font-bold text-[15px] flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-blue-900/20"
            style={{ backgroundColor: accentColor }}
          >
            Order <ChevronRight size={18} />
          </button>
        </div>
        
      </div>
    </div>
  );
}
