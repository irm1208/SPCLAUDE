import React from 'react';
import { Activity, FileText } from 'lucide-react';

export function LabTrader() {
  const biomarkers = [
    { name: 'Testosterone', value: '28.5 nmol/L', ref: '8.0–29.0', inRange: true },
    { name: 'LH', value: '0.2 IU/L', ref: '1.7–8.6', inRange: false },
    { name: 'FSH', value: '0.3 IU/L', ref: '1.5–12.4', inRange: false },
    { name: 'Haematocrit', value: '51.2%', ref: '37–50%', inRange: false },
    { name: 'Haemoglobin', value: '172 g/L', ref: '130–180', inRange: true },
    { name: 'Total Cholesterol', value: '4.2 mmol/L', ref: '<5.2', inRange: true },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: '#08080F' }}>
      <div className="w-full max-w-sm rounded-3xl overflow-hidden relative shadow-2xl" style={{ backgroundColor: '#11111A', border: '1px solid rgba(255,255,255,0.05)' }}>
        
        {/* Banner */}
        <div className="h-32 relative" style={{ background: 'linear-gradient(135deg, #1B3A7A 0%, #7C3AED 100%)' }}>
          {/* Overlapping lab icon & details */}
          <div className="absolute -bottom-6 left-6 flex items-end gap-3">
            <div className="w-14 h-14 rounded-full flex items-center justify-center border-4 border-[#11111A] shadow-lg" style={{ backgroundColor: '#0B1B3D' }}>
              <Activity className="w-6 h-6 text-indigo-400" />
            </div>
            <div className="pb-1">
              <h2 className="text-white font-bold text-lg leading-tight tracking-tight">Medichecks</h2>
              <p className="text-indigo-200/80 text-xs font-medium tracking-wide">15 Mar 2026 • Trough</p>
            </div>
          </div>
        </div>

        <div className="pt-10 pb-6 px-6 relative">
          {/* Decorative Sparkline */}
          <div className="absolute top-12 right-0 left-0 h-32 opacity-30 pointer-events-none overflow-hidden mix-blend-screen">
             <svg viewBox="0 0 400 100" preserveAspectRatio="none" className="w-full h-full stroke-[#7C3AED] fill-none" strokeWidth="2">
               <path d="M0,50 Q40,80 80,40 T160,60 T240,30 T320,70 T400,40" />
               <path d="M0,70 Q40,30 80,70 T160,40 T240,80 T320,50 T400,60" className="opacity-40" strokeWidth="1" />
               <path d="M0,30 Q40,60 80,20 T160,80 T240,40 T320,90 T400,30" className="opacity-20" strokeWidth="1" />
             </svg>
          </div>

          <div className="relative z-10">
            <h1 className="text-gray-400 text-sm font-medium tracking-wide uppercase mb-2">Full Blood Count — Trough</h1>
            
            <div className="flex items-center gap-3 mt-2 mb-8">
              <div className="text-5xl font-black text-white tracking-tighter">3<span className="text-2xl text-gray-500 font-bold">/24</span><span className="text-xl text-white ml-2">OOR</span></div>
              <div className="px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold tracking-widest uppercase shadow-[0_0_15px_rgba(239,68,68,0.15)]">
                Out of Range
              </div>
            </div>

            <div className="space-y-4 mb-8">
              {biomarkers.map((marker) => (
                <div key={marker.name} className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${marker.inRange ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`} />
                    <div>
                      <div className="text-sm font-semibold text-gray-200">{marker.name}</div>
                      <div className="text-[10px] text-gray-500 font-medium font-mono tracking-wider">REF: {marker.ref}</div>
                    </div>
                  </div>
                  <div className={`text-base font-bold font-mono tracking-tight ${marker.inRange ? 'text-white' : 'text-red-400 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]'}`}>
                    {marker.value}
                  </div>
                </div>
              ))}
            </div>

            <button className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-white font-bold text-sm tracking-wide transition-all hover:opacity-90 active:scale-[0.98] shadow-[0_10px_30px_rgba(124,58,237,0.3)]" style={{ background: 'linear-gradient(to right, #7C3AED, #4F46E5)' }}>
              <FileText className="w-4 h-4" />
              VIEW FULL REPORT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
