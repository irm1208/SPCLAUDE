import React from 'react';
import { ExternalLink, CheckCircle2 } from 'lucide-react';

export function CoaTrader() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: '#0A0A14' }}>
      {/* Card Container */}
      <div 
        className="relative w-full max-w-[320px] rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{ 
          backgroundColor: '#0F0F1A',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}
      >
        {/* Banner */}
        <div 
          className="h-20 w-full relative"
          style={{
            background: 'linear-gradient(135deg, #1B3A7A 0%, #7C3AED 100%)',
          }}
        >
          {/* Uther Chip */}
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/30 backdrop-blur-md border border-white/10 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#2D6BCC' }}></div>
            <span className="text-[10px] font-bold tracking-wider text-white uppercase">Uther</span>
          </div>
        </div>

        {/* Profile / Lab Section */}
        <div className="px-5 pb-5 relative flex-1 flex flex-col">
          
          {/* Overlapping Avatar */}
          <div className="flex items-end gap-3 -mt-6 mb-4 relative z-10">
            <div className="w-12 h-12 rounded-full bg-[#1A1A24] border-2 border-[#0F0F1A] flex items-center justify-center text-xl shadow-lg">
              🧪
            </div>
            <div className="pb-1">
              <div className="text-white font-bold text-sm tracking-wide">Janoshik Analytical</div>
              <div className="text-[#8E8E9F] text-[10px] font-medium uppercase tracking-wider">Independent Lab</div>
            </div>
          </div>

          {/* Product Title */}
          <div className="mb-4">
            <h2 className="text-2xl font-black text-white tracking-tight">Tirzepatide</h2>
          </div>

          {/* Sparkline Wave (Decorative) */}
          <div className="w-full h-12 mb-4 opacity-70">
            <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-full">
              <defs>
                <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#2D6BCC" stopOpacity="0.2" />
                </linearGradient>
                <linearGradient id="waveFill" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path 
                d="M0,20 C15,20 20,5 35,15 C50,25 60,10 75,20 C85,26 95,15 100,18 L100,30 L0,30 Z" 
                fill="url(#waveFill)" 
              />
              <path 
                d="M0,20 C15,20 20,5 35,15 C50,25 60,10 75,20 C85,26 95,15 100,18" 
                fill="none" 
                stroke="url(#waveGrad)" 
                strokeWidth="2" 
                strokeLinecap="round" 
              />
            </svg>
          </div>

          {/* Primary Stat (Purity) */}
          <div className="mb-6 flex items-start gap-2">
            <div>
              <div className="text-[#8E8E9F] text-[10px] font-bold tracking-widest uppercase mb-1">Purity</div>
              <div className="text-4xl font-black text-white tracking-tighter tabular-nums leading-none">
                99.892<span className="text-xl text-[#7C3AED]">%</span>
              </div>
            </div>
            <div className="mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#1B3A7A]/30 text-[#4D9BFF] border border-[#2D6BCC]/30 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              PASS
            </div>
          </div>

          {/* Data Rows */}
          <div className="space-y-3 mb-8">
            <div className="flex justify-between items-center pb-3 border-b border-white/5">
              <span className="text-xs text-[#8E8E9F] font-medium">Batch</span>
              <span className="text-xs font-bold text-white font-mono">ZE30-0319</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-white/5">
              <span className="text-xs text-[#8E8E9F] font-medium">Analysis</span>
              <span className="text-xs font-bold text-white">Mass & Purity</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-white/5">
              <span className="text-xs text-[#8E8E9F] font-medium">Mass</span>
              <span className="text-xs font-bold text-white font-mono">4,512 Da</span>
            </div>
            <div className="flex justify-between items-center pb-1">
              <span className="text-xs text-[#8E8E9F] font-medium">Date</span>
              <span className="text-xs font-bold text-white">10 Apr 2026</span>
            </div>
          </div>

          {/* Button */}
          <button 
            className="w-full mt-auto py-3.5 rounded-xl text-sm font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(90deg, #7C3AED 0%, #2D6BCC 100%)',
            }}
          >
            View Report
            <ExternalLink className="w-4 h-4 opacity-70" />
          </button>
          
        </div>
      </div>
    </div>
  );
}
