import React from 'react';
import { ChevronRight, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

export function LabDial() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#1E2756] text-white font-sans">
      <div className="w-full max-w-sm bg-[#171F46] rounded-[32px] p-8 shadow-2xl border border-white/5 relative overflow-hidden">
        {/* Top Header */}
        <div className="mb-8">
          <div className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase mb-2">TITLE</div>
          <h2 className="text-xl font-medium tracking-tight">Full Blood Count — Trough</h2>
          <div className="w-8 h-[2px] bg-blue-500 mt-4 rounded-full"></div>
        </div>

        {/* Dial / Arc Clock */}
        <div className="relative w-48 h-48 mx-auto mb-8">
          <svg className="w-full h-full -rotate-[225deg]" viewBox="0 0 240 240">
            {/* Tick marks */}
            <circle 
              cx="120" 
              cy="120" 
              r="105" 
              fill="none" 
              stroke="#ffffff" 
              strokeWidth="2" 
              strokeDasharray="2 14.49" 
              strokeDashoffset="0"
              strokeOpacity="0.1"
              pathLength="100"
            />
            {/* The gap in tick marks (90 degrees = 25% of circle) -> hide the bottom quarter */}
            <circle 
              cx="120" 
              cy="120" 
              r="106" 
              fill="none" 
              stroke="#171F46" 
              strokeWidth="4" 
              strokeDasharray="25 100" 
              strokeDashoffset="-75"
              pathLength="100"
            />

            {/* Red background arc (represents OOR portion, placed full then covered by green) */}
            <circle 
              cx="120" 
              cy="120" 
              r="90" 
              fill="none" 
              stroke="#EF4444" 
              strokeWidth="14" 
              strokeDasharray="75 100" 
              strokeDashoffset="0"
              strokeLinecap="round"
              pathLength="100"
            />
            
            {/* Green foreground arc (represents in-range portion) */}
            {/* 21/24 * 75% = 65.625% */}
            <circle 
              cx="120" 
              cy="120" 
              r="90" 
              fill="none" 
              stroke="#10B981" 
              strokeWidth="14" 
              strokeDasharray="65.625 100" 
              strokeDashoffset="0"
              strokeLinecap="round"
              pathLength="100"
            />

            {/* White handle dots at start, boundary, and end */}
            <circle cx="210" cy="120" r="4" fill="#ffffff" />
            <circle cx="120" cy="30" r="4" fill="#ffffff" />
            <circle cx="70" cy="45.17" r="4" fill="#ffffff" />
            
          </svg>

          {/* Center Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
            <div className="text-5xl font-light tracking-tighter text-white leading-none">21</div>
            <div className="text-sm font-medium text-white/50 mt-1">of 24</div>
            <div className="text-xs font-bold text-[#EF4444] mt-2 tracking-wide uppercase">3 OOR</div>
          </div>
        </div>

        {/* Info Rows */}
        <div className="space-y-1 mb-8">
          <div className="flex items-center justify-between py-3 border-b border-white/5 group cursor-pointer transition-colors">
            <div className="text-sm text-white/50">Lab</div>
            <div className="flex items-center text-sm font-medium text-white group-hover:text-blue-400 transition-colors">
              Medichecks <ChevronRight className="w-4 h-4 ml-1 opacity-50" />
            </div>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-white/5 group cursor-pointer transition-colors">
            <div className="text-sm text-white/50">Date</div>
            <div className="flex items-center text-sm font-medium text-white group-hover:text-blue-400 transition-colors">
              15 Mar 2026 <ChevronRight className="w-4 h-4 ml-1 opacity-50" />
            </div>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-white/5 group cursor-pointer transition-colors">
            <div className="text-sm text-white/50">Type</div>
            <div className="flex items-center text-sm font-medium text-white group-hover:text-blue-400 transition-colors">
              Trough <ChevronRight className="w-4 h-4 ml-1 opacity-50" />
            </div>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-white/5 group cursor-pointer transition-colors">
            <div className="text-sm text-white/50">Status</div>
            <div className="flex items-center text-sm font-medium text-[#EF4444]">
              ● 3 OOR <ChevronRight className="w-4 h-4 ml-1 opacity-50 text-white/50" />
            </div>
          </div>
        </div>

        {/* Biomarkers list */}
        <div className="mb-8 space-y-4">
          <div className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase mb-4">Key Markers</div>
          
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-medium text-white">Testosterone</div>
              <div className="text-xs text-white/50">ref 8.0–29.0</div>
            </div>
            <div className="flex flex-col items-end">
              <div className="text-sm font-medium text-[#10B981]">28.5 nmol/L</div>
              <CheckCircle2 className="w-3 h-3 text-[#10B981] mt-1" />
            </div>
          </div>

          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-medium text-white">LH</div>
              <div className="text-xs text-white/50">ref 1.7–8.6</div>
            </div>
            <div className="flex flex-col items-end">
              <div className="text-sm font-medium text-[#EF4444]">0.2 IU/L</div>
              <AlertCircle className="w-3 h-3 text-[#EF4444] mt-1" />
            </div>
          </div>

          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-medium text-white">FSH</div>
              <div className="text-xs text-white/50">ref 1.5–12.4</div>
            </div>
            <div className="flex flex-col items-end">
              <div className="text-sm font-medium text-[#EF4444]">0.3 IU/L</div>
              <AlertCircle className="w-3 h-3 text-[#EF4444] mt-1" />
            </div>
          </div>

          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-medium text-white">Haematocrit</div>
              <div className="text-xs text-white/50">ref 37–50%</div>
            </div>
            <div className="flex flex-col items-end">
              <div className="text-sm font-medium text-[#EF4444]">51.2%</div>
              <AlertCircle className="w-3 h-3 text-[#EF4444] mt-1" />
            </div>
          </div>

          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-medium text-white">Haemoglobin</div>
              <div className="text-xs text-white/50">ref 130–180</div>
            </div>
            <div className="flex flex-col items-end">
              <div className="text-sm font-medium text-[#10B981]">172 g/L</div>
              <CheckCircle2 className="w-3 h-3 text-[#10B981] mt-1" />
            </div>
          </div>

          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-medium text-white">Total Cholesterol</div>
              <div className="text-xs text-white/50">ref {'<5.2'}</div>
            </div>
            <div className="flex flex-col items-end">
              <div className="text-sm font-medium text-[#10B981]">4.2 mmol/L</div>
              <CheckCircle2 className="w-3 h-3 text-[#10B981] mt-1" />
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button className="w-full relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-60 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-medium text-sm rounded-2xl py-4 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
            <FileText className="w-4 h-4 mr-2" />
            View Report
          </div>
        </button>
      </div>
    </div>
  );
}
