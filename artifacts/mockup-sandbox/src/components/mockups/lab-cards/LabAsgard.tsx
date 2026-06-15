import React from "react";
import { ArrowRight, Plus } from "lucide-react";

export function LabAsgard() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#D6E5EA] font-sans selection:bg-[#1B4D5C] selection:text-white">
      <div className="relative w-full max-w-[440px] bg-[#1B4D5C] text-white rounded-none shadow-2xl overflow-hidden border border-[#2A6577]">
        
        {/* Corner Markers */}
        <div className="absolute top-0 left-0 p-2 text-[#468297] text-xs leading-none">
          <Plus className="w-3 h-3" />
        </div>
        <div className="absolute top-0 right-0 p-2 text-[#468297] text-xs leading-none">
          <Plus className="w-3 h-3" />
        </div>
        <div className="absolute bottom-0 left-0 p-2 text-[#468297] text-xs leading-none">
          <Plus className="w-3 h-3" />
        </div>
        <div className="absolute bottom-0 right-0 p-2 text-[#468297] text-xs leading-none">
          <Plus className="w-3 h-3" />
        </div>

        {/* Header */}
        <div className="pt-8 pb-6 px-8 border-b border-[#2A6577]">
          <div className="flex justify-between items-center mb-6">
            <span className="text-[10px] tracking-widest text-[#72A6B7] uppercase font-semibold">Blood Test</span>
            <span className="text-[10px] tracking-widest text-[#72A6B7] font-mono">15 MAR 2026</span>
          </div>
          <div className="flex flex-col">
            <h1 className="text-3xl font-bold tracking-tight text-white leading-none mb-1">Full Blood Count</h1>
            <span className="text-xl font-medium text-[#468297]">Trough</span>
          </div>
        </div>

        {/* Grid Stats */}
        <div className="grid grid-cols-2 border-b border-[#2A6577]">
          <div className="p-6 border-r border-[#2A6577]">
            <div className="text-[10px] tracking-widest text-[#72A6B7] uppercase mb-2">Markers</div>
            <div className="text-2xl font-light font-mono">24</div>
          </div>
          <div className="p-6">
            <div className="text-[10px] tracking-widest text-[#72A6B7] uppercase mb-2">Out of Range</div>
            <div className="text-2xl font-light font-mono text-amber-400">3</div>
          </div>
          <div className="p-6 border-t border-r border-[#2A6577]">
            <div className="text-[10px] tracking-widest text-[#72A6B7] uppercase mb-2">Lab</div>
            <div className="text-lg font-medium">Medichecks</div>
          </div>
          <div className="p-6 border-t border-[#2A6577]">
            <div className="text-[10px] tracking-widest text-[#72A6B7] uppercase mb-2">Type</div>
            <div className="text-lg font-medium">Trough</div>
          </div>
        </div>

        {/* Biomarkers */}
        <div className="p-8">
          <div className="text-[10px] tracking-widest text-[#72A6B7] uppercase mb-6">Key Biomarkers</div>
          <div className="space-y-4">
            
            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[#4ADE80]"></div>
                <span className="text-sm font-medium text-white">Testosterone</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-mono text-white">28.5 <span className="text-[10px] text-[#72A6B7]">nmol/L</span></span>
              </div>
            </div>

            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]"></div>
                <span className="text-sm font-medium text-white">LH</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-mono text-amber-400">0.2 <span className="text-[10px] text-[#72A6B7]">IU/L</span></span>
              </div>
            </div>

            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]"></div>
                <span className="text-sm font-medium text-white">FSH</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-mono text-amber-400">0.3 <span className="text-[10px] text-[#72A6B7]">IU/L</span></span>
              </div>
            </div>

            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]"></div>
                <span className="text-sm font-medium text-white">Haematocrit</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-mono text-amber-400">51.2 <span className="text-[10px] text-[#72A6B7]">%</span></span>
              </div>
            </div>

            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[#4ADE80]"></div>
                <span className="text-sm font-medium text-white">Haemoglobin</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-mono text-white">172 <span className="text-[10px] text-[#72A6B7]">g/L</span></span>
              </div>
            </div>

            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[#4ADE80]"></div>
                <span className="text-sm font-medium text-white">Total Cholesterol</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-mono text-white">4.2 <span className="text-[10px] text-[#72A6B7]">mmol/L</span></span>
              </div>
            </div>

            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[#4ADE80]"></div>
                <span className="text-sm font-medium text-white">Creatinine</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-mono text-white">88 <span className="text-[10px] text-[#72A6B7]">μmol/L</span></span>
              </div>
            </div>
            
          </div>
        </div>

        {/* Footer CTA */}
        <div className="p-6 pt-2">
          <button className="w-full flex items-center justify-center gap-2 py-4 bg-white/5 hover:bg-white/10 border border-[#2A6577] text-white text-sm font-medium tracking-wide transition-colors group">
            View Report
            <ArrowRight className="w-4 h-4 text-[#72A6B7] group-hover:text-white transition-colors group-hover:translate-x-1" />
          </button>
        </div>

      </div>
    </div>
  );
}
