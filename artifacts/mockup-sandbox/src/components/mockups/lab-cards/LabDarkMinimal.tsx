import React from 'react';
import { Activity } from 'lucide-react';

export function LabDarkMinimal() {
  const inRangeCount = 21;
  const outOfRangeCount = 3;
  
  // Create an array for dots
  const dots = [
    ...Array(inRangeCount).fill('in'),
    ...Array(outOfRangeCount).fill('out')
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: '#0A0A12', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
      <div 
        className="w-full max-w-sm rounded-[24px] overflow-hidden flex flex-col"
        style={{ 
          backgroundColor: '#111119',
          boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.06)'
        }}
      >
        <div className="p-6 pb-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold tracking-[0.15em] text-blue-500">BLOOD TEST</span>
            <Activity className="w-4 h-4 text-white/20" />
          </div>
          
          <h2 className="text-2xl font-bold text-white tracking-tight leading-tight mb-1.5">
            Full Blood Count
          </h2>
          <div className="text-sm text-[#8E8E93] font-medium flex items-center gap-1.5">
            <span>Medichecks</span>
            <span>&middot;</span>
            <span>15 Mar 2026</span>
          </div>
        </div>

        <div className="px-6 py-2">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {dots.map((status, i) => (
              <div 
                key={i} 
                className={`w-2 h-2 rounded-full ${status === 'in' ? 'bg-[#32D74B]' : 'bg-[#FF453A]'}`}
                style={{
                  boxShadow: status === 'out' ? '0 0 8px rgba(255, 69, 58, 0.5)' : 'none'
                }}
              />
            ))}
          </div>
          <div className="text-xs font-medium text-[#8E8E93]">
            <span>21 in range</span>
            <span className="mx-2">&middot;</span>
            <span>3 out of range</span>
          </div>
        </div>

        <div className="px-6 py-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold text-[#FF453A]">LH</span>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-bold text-[#FF453A]">0.2</span>
                <span className="text-[10px] font-medium text-[#FF453A]/70 uppercase tracking-wider">IU/L</span>
              </div>
            </div>
            
            <div className="w-full h-px bg-white/5"></div>
            
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold text-[#FF453A]">FSH</span>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-bold text-[#FF453A]">0.3</span>
                <span className="text-[10px] font-medium text-[#FF453A]/70 uppercase tracking-wider">IU/L</span>
              </div>
            </div>
            
            <div className="w-full h-px bg-white/5"></div>
            
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold text-[#FF453A]">Haematocrit</span>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-bold text-[#FF453A]">51.2</span>
                <span className="text-[10px] font-medium text-[#FF453A]/70 uppercase tracking-wider">%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-2 border-t border-white/5 p-4 px-6 flex items-center justify-between" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
          <div className="text-[11px] font-medium text-[#8E8E93]">
            Trough &middot; 15 Mar 2026 &middot; Medichecks
          </div>
          <button className="flex items-center justify-center bg-white/[0.08] hover:bg-white/[0.12] transition-colors rounded-full px-4 py-1.5 text-xs font-semibold text-white">
            Full Results
          </button>
        </div>
      </div>
    </div>
  );
}
