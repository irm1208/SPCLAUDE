import React from "react";
import { Download } from "lucide-react";

export function CoaCertificate() {
  return (
    <div 
      className="min-h-screen flex items-center justify-center p-6" 
      style={{ backgroundColor: "#F0EAD8" }}
    >
      <div 
        className="w-full max-w-[320px] rounded-xl shadow-sm border overflow-hidden flex flex-col font-serif"
        style={{ 
          backgroundColor: "#FDF8F0", 
          borderColor: "#E5E0D8",
          boxShadow: "0 4px 20px -2px rgba(0,0,0,0.05), 0 0 3px rgba(0,0,0,0.02)" 
        }}
      >
        {/* Letterhead Strip */}
        <div className="px-5 py-3 flex justify-between items-center" style={{ backgroundColor: "#F4F7F9" }}>
          <span className="text-[10px] font-bold tracking-widest text-slate-700">JANOSHIK ANALYTICAL</span>
          <span className="text-[10px] italic text-slate-500 font-sans">Certificate of Analysis</span>
        </div>
        
        {/* Double Rule */}
        <div className="w-full h-px bg-slate-300"></div>
        <div className="w-full h-px bg-slate-200 mt-[2px]"></div>

        <div className="p-5 flex flex-col gap-5">
          
          {/* Product Info */}
          <div className="flex flex-col gap-2 font-sans text-sm">
            <div className="flex justify-between items-end border-b border-dashed border-[#E5E0D8] pb-1">
              <span className="text-slate-500 text-xs uppercase tracking-wider">Product</span>
              <span className="font-medium text-slate-900">Tirzepatide</span>
            </div>
            <div className="flex justify-between items-end border-b border-dashed border-[#E5E0D8] pb-1">
              <span className="text-slate-500 text-xs uppercase tracking-wider">Supplier</span>
              <span className="font-semibold" style={{ color: "#2D6BCC" }}>Uther</span>
            </div>
            <div className="flex justify-between items-end border-b border-dashed border-[#E5E0D8] pb-1">
              <span className="text-slate-500 text-xs uppercase tracking-wider">Batch</span>
              <span className="font-mono text-slate-700 text-xs">ZE30-0319</span>
            </div>
          </div>

          {/* Results Section */}
          <div className="flex flex-col gap-3 mt-2">
            <div className="flex items-center gap-2">
              <div className="h-px bg-[#E5E0D8] flex-grow"></div>
              <span className="text-[10px] font-bold tracking-widest text-slate-400">TEST RESULTS</span>
              <div className="h-px bg-[#E5E0D8] flex-grow"></div>
            </div>

            <div className="bg-white rounded-lg p-3 border border-[#E5E0D8] flex flex-col gap-2 relative overflow-hidden">
              {/* Subtle background pattern/watermark could go here if needed */}
              <div className="flex justify-between items-center z-10 relative">
                <span className="text-sm font-medium text-slate-800 font-sans">Mass & Purity</span>
                
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center border border-green-600 rounded-full px-2 py-0.5 transform -rotate-6">
                    <span className="text-[9px] font-bold text-green-700 tracking-widest">PASS</span>
                  </div>
                  <span className="text-lg font-bold text-slate-900 font-mono tracking-tight">99.892%</span>
                </div>
              </div>
              
              <div className="text-right z-10 relative mt-1">
                <span className="font-mono italic text-[11px] text-slate-500">
                  4,512 Da observed mass
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col items-center gap-4 mt-4">
            <span className="text-xs text-slate-500 font-sans">
              Date of Analysis: <span className="font-medium text-slate-700">10 April 2026</span>
            </span>
            
            <button className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors font-sans pb-1 border-b border-transparent hover:border-slate-800">
              <Download className="w-3.5 h-3.5" />
              Download PDF
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
