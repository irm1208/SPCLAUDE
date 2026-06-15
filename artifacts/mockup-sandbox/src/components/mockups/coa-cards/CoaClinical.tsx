import React from 'react';
import { FlaskConical, Hash, Microscope, Calendar, ArrowRight, CheckCircle2 } from 'lucide-react';

export function CoaClinical() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#F1F5F9] font-sans">
      {/* Card Container */}
      <div className="w-[320px] bg-white rounded-xl shadow-sm border border-slate-200 relative overflow-hidden flex flex-col">
        {/* Left Blue Accent Border */}
        <div className="absolute top-0 left-0 bottom-0 w-1 bg-[#2D6BCC]" />

        <div className="p-5 flex flex-col gap-4 pl-6">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#2D6BCC] flex items-center justify-center shrink-0">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">Tirzepatide</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Uther · Janoshik Analytical</p>
            </div>
          </div>

          {/* Primary Result */}
          <div className="bg-slate-50 rounded-lg p-3 flex items-center justify-between border border-slate-100 mt-1">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Tested Purity</span>
              <span className="text-xl font-bold text-slate-900">99.892%</span>
            </div>
            <div className="bg-green-100 text-green-700 flex items-center gap-1.5 px-2.5 py-1 rounded-md font-bold text-xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
              PASS
            </div>
          </div>

          {/* Details Grid */}
          <div className="flex flex-col gap-2.5 mt-1">
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2 text-slate-500">
                <Hash className="w-3.5 h-3.5" />
                <span>Batch</span>
              </div>
              <span className="font-semibold text-slate-900">ZE30-0319</span>
            </div>
            
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2 text-slate-500">
                <Microscope className="w-3.5 h-3.5" />
                <span>Analysis</span>
              </div>
              <span className="font-semibold text-slate-900">Mass & Purity</span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2 text-slate-500">
                <Calendar className="w-3.5 h-3.5" />
                <span>Date</span>
              </div>
              <span className="font-medium text-slate-900">10 Apr 2026</span>
            </div>
          </div>

          <div className="h-px bg-slate-100 w-full my-1"></div>

          {/* Mass Spec */}
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">Mass Spec</span>
            <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200">
              Observed: 4,512 Da
            </span>
          </div>

          {/* Action */}
          <button className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-lg py-2.5 flex items-center justify-center gap-2 text-sm font-semibold transition-colors mt-2">
            View Report
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
