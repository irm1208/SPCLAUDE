import React from "react";
import { ArrowRight, Copy, CheckCircle2, XCircle } from "lucide-react";

export function LabRevolut() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#E8EEF6] font-sans">
      <div className="w-full max-w-sm bg-white rounded-[28px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        
        {/* Top Section */}
        <div className="p-8 pb-6 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1c64f2" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round">
              <path d="M10 2v7.31"></path>
              <path d="M14 9.3V1.99"></path>
              <path d="M8.5 2h7"></path>
              <path d="M14 9.3a6.5 6.5 0 1 1-4 0"></path>
              <path d="M5.5 16.5h13"></path>
            </svg>
          </div>
          <span className="text-[11px] font-bold tracking-widest text-[#1c64f2] uppercase mb-2">
            Lab Results
          </span>
          <h1 className="text-4xl font-extrabold text-[#0a1930] tracking-tight mb-1">
            3 <span className="text-2xl text-[#5c6e8a] font-semibold">out of range</span>
          </h1>
          <p className="text-[13px] text-[#5c6e8a] font-medium">
            out of 24 markers tested
          </p>
        </div>

        <div className="px-6">
          <div className="h-[1px] w-full bg-[#f0f3f8]"></div>
        </div>

        {/* Middle Section */}
        <div className="p-6 pt-5">
          <h2 className="text-[12px] font-semibold text-[#5c6e8a] uppercase tracking-wider mb-3">
            Test Reference
          </h2>
          
          <div className="bg-[#f5f7fa] rounded-2xl p-4 mb-3 flex items-center justify-between group cursor-pointer hover:bg-[#edf1f5] transition-colors">
            <span className="text-[15px] font-semibold text-[#0a1930]">
              Full Blood Count — Trough
            </span>
            <Copy className="w-4 h-4 text-[#8b9bb4] group-hover:text-[#1c64f2] transition-colors" />
          </div>
          
          <p className="text-[13px] text-[#5c6e8a] font-medium text-center mb-6">
            Medichecks · 15 Mar 2026 · Trough
          </p>

          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-4 h-4 text-[#e02424]" />
                <span className="text-[13px] font-bold text-[#e02424]">Attention Required (3)</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="inline-flex items-center px-3 py-1.5 bg-[#fdf2f2] text-[#e02424] rounded-xl text-[13px] font-semibold border border-[#fde8e8]">
                  LH
                </div>
                <div className="inline-flex items-center px-3 py-1.5 bg-[#fdf2f2] text-[#e02424] rounded-xl text-[13px] font-semibold border border-[#fde8e8]">
                  FSH
                </div>
                <div className="inline-flex items-center px-3 py-1.5 bg-[#fdf2f2] text-[#e02424] rounded-xl text-[13px] font-semibold border border-[#fde8e8]">
                  Haematocrit
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2 mt-4">
                <CheckCircle2 className="w-4 h-4 text-[#057a55]" />
                <span className="text-[13px] font-bold text-[#057a55]">In Range (5)</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="inline-flex items-center px-3 py-1.5 bg-[#f3faf7] text-[#057a55] rounded-xl text-[13px] font-medium border border-[#def7ec]">
                  Testosterone
                </div>
                <div className="inline-flex items-center px-3 py-1.5 bg-[#f3faf7] text-[#057a55] rounded-xl text-[13px] font-medium border border-[#def7ec]">
                  Haemoglobin
                </div>
                <div className="inline-flex items-center px-3 py-1.5 bg-[#f3faf7] text-[#057a55] rounded-xl text-[13px] font-medium border border-[#def7ec]">
                  Total Cholesterol
                </div>
                <div className="inline-flex items-center px-3 py-1.5 bg-[#f3faf7] text-[#057a55] rounded-xl text-[13px] font-medium border border-[#def7ec]">
                  HDL
                </div>
                <div className="inline-flex items-center px-3 py-1.5 bg-[#f3faf7] text-[#057a55] rounded-xl text-[13px] font-medium border border-[#def7ec]">
                  LDL
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="p-6 pt-2">
          <button className="w-full flex items-center justify-between px-5 py-4 bg-[#1c64f2] hover:bg-[#1a56cc] active:bg-[#174ab5] text-white rounded-2xl font-semibold text-[15px] transition-colors shadow-[0_4px_12px_rgba(28,100,242,0.2)]">
            <span>View detailed results</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

      </div>
    </div>
  );
}
