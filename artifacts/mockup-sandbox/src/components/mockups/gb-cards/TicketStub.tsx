import React from "react";
import { Clock, Calendar, Box, Globe, ChevronRight, User, Fingerprint } from "lucide-react";

export function TicketStub() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#0B0F19] text-slate-200 font-sans">
      {/* Ticket Container */}
      <div 
        className="relative w-full max-w-[420px] rounded-xl flex shadow-2xl overflow-hidden group hover:scale-[1.01] transition-transform duration-500 ease-out"
        style={{
          boxShadow: "0 25px 50px -12px rgba(167, 139, 250, 0.15), 0 0 0 1px rgba(167, 139, 250, 0.1)"
        }}
      >
        {/* Left Color Bar */}
        <div className="w-3 bg-[#A78BFA] shrink-0 z-10" />

        {/* Main Ticket Body */}
        <div className="flex-1 flex flex-col bg-[#111827] relative">
          
          {/* Subtle Texture Overlay */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{
              backgroundImage: `repeating-linear-gradient(45deg, #A78BFA 0, #A78BFA 1px, transparent 1px, transparent 10px)`
            }}
          />

          {/* Top Half */}
          <div className="p-6 relative z-10">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] font-bold tracking-[0.2em] text-[#A78BFA] uppercase px-2 py-1 bg-[#A78BFA]/10 rounded border border-[#A78BFA]/20">
                Group Buy Entry
              </span>
              <Fingerprint className="w-5 h-5 text-slate-600" />
            </div>

            <h2 className="text-3xl font-bold tracking-tight text-white mb-6 leading-none">
              Uther April<br />Group Buy
            </h2>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                  <User className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Organiser</div>
                  <div className="text-sm font-medium text-slate-300">Admin</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                  <Globe className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Manufacturer</div>
                  <div className="text-sm font-medium text-slate-300">Uther <span className="text-slate-500 font-normal ml-1">UK</span></div>
                </div>
              </div>
            </div>
            
            <p className="text-xs text-slate-500 mt-6 italic border-l-2 border-slate-800 pl-3">
              "Order will be made for peptides in stock"
            </p>
          </div>

          {/* Perforated Divider */}
          <div className="relative h-8 flex items-center">
            <div className="absolute left-[-16px] w-6 h-6 rounded-full bg-[#0B0F19] z-20 shadow-inner" style={{ boxShadow: "inset -2px 0 4px rgba(0,0,0,0.5)" }} />
            <div className="w-full border-t-[3px] border-dashed border-slate-800/80 mx-4 z-10" />
            <div className="absolute right-[-12px] w-6 h-6 rounded-full bg-[#0B0F19] z-20 shadow-inner" style={{ boxShadow: "inset 2px 0 4px rgba(0,0,0,0.5)" }} />
          </div>

          {/* Bottom Stub */}
          <div className="p-6 pt-2 pb-0 relative z-10 flex flex-col">
            <div className="grid grid-cols-3 gap-4 mb-6">
              {/* Date */}
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Close
                </span>
                <span className="text-xl font-bold text-white font-mono tracking-tighter">APR 22</span>
              </div>
              
              {/* Time Left */}
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Ends In
                </span>
                <span className="text-xl font-bold text-[#A78BFA] font-mono tracking-tighter">8D LEFT</span>
              </div>

              {/* Status */}
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Status</span>
                <span className="text-xs font-bold text-[#10B981] bg-[#10B981]/10 px-2 py-1 rounded uppercase tracking-widest border border-[#10B981]/20">
                  Active
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center mb-6 pt-4 border-t border-slate-800/50">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Box className="w-3.5 h-3.5" />
                <span>1 Product</span>
              </div>
              <div className="text-xs font-medium text-slate-400 bg-slate-800/50 px-2 py-0.5 rounded">
                USD
              </div>
            </div>
          </div>

          {/* CTA */}
          <button className="w-full bg-[#A78BFA] hover:bg-[#8B5CF6] text-white py-5 px-6 font-bold tracking-widest uppercase text-sm flex items-center justify-between transition-colors z-10">
            <span>Secure Your Spot</span>
            <ChevronRight className="w-5 h-5" />
          </button>

        </div>
      </div>
    </div>
  );
}
