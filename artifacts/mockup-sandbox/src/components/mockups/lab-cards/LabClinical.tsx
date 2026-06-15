import React from "react";
import { FlaskConical, Check, X, ArrowRight } from "lucide-react";

export function LabClinical() {
  const biomarkers = [
    { name: "Testosterone", value: "28.5", unit: "nmol/L", refRange: "8.0–29.0", inRange: true },
    { name: "LH", value: "0.2", unit: "IU/L", refRange: "1.7–8.6", inRange: false },
    { name: "FSH", value: "0.3", unit: "IU/L", refRange: "1.5–12.4", inRange: false },
    { name: "Haematocrit", value: "51.2", unit: "%", refRange: "37–50%", inRange: false },
    { name: "Haemoglobin", value: "172", unit: "g/L", refRange: "130–180", inRange: true },
    { name: "Total Cholesterol", value: "4.2", unit: "mmol/L", refRange: "<5.2", inRange: true },
    { name: "HDL", value: "1.1", unit: "mmol/L", refRange: ">1.0", inRange: true },
    { name: "LDL", value: "2.6", unit: "mmol/L", refRange: "<3.4", inRange: true },
    { name: "Creatinine", value: "88", unit: "μmol/L", refRange: "60–110", inRange: true },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#F1F5F9] font-sans">
      <div className="w-full max-w-lg bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden" style={{ borderLeft: '4px solid #2D6BCC' }}>
        {/* Header */}
        <div className="p-5 pb-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-blue-50 flex items-center justify-center text-[#2D6BCC]">
                <FlaskConical size={20} strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 leading-tight">Full Blood Count — Trough</h2>
                <p className="text-sm text-slate-500 font-medium">Medichecks</p>
              </div>
            </div>
            <div className="text-sm text-slate-500 font-medium tracking-tight">
              15 Mar 2026
            </div>
          </div>
          
          {/* Stats row */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
              24 markers
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">
              3 out of range
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-slate-100"></div>

        {/* Biomarkers List */}
        <div className="flex flex-col">
          {/* Table Header */}
          <div className="flex items-center justify-between px-5 py-2 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>Biomarker</span>
            <div className="flex items-center space-x-12">
              <span className="w-16 text-right">Result</span>
              <span className="w-20 text-right">Range</span>
            </div>
          </div>
          
          <div className="divide-y divide-slate-100/50">
            {biomarkers.map((marker, idx) => (
              <div 
                key={marker.name} 
                className={`flex items-center justify-between px-5 py-3 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
              >
                <div className="flex items-center gap-2.5 flex-1">
                  <div className={`flex items-center justify-center w-4 h-4 rounded-full ${marker.inRange ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                    {marker.inRange ? <Check size={10} strokeWidth={3} /> : <X size={10} strokeWidth={3} />}
                  </div>
                  <span className={`text-sm font-medium ${marker.inRange ? 'text-slate-700' : 'text-red-700'}`}>
                    {marker.name}
                  </span>
                </div>
                
                <div className="flex items-center space-x-12 text-sm">
                  <div className="w-16 text-right">
                    <span className={`font-semibold ${marker.inRange ? 'text-slate-900' : 'text-red-700'}`}>
                      {marker.value}
                    </span>
                    <span className="text-xs text-slate-500 ml-1">{marker.unit}</span>
                  </div>
                  <div className="w-20 text-right text-xs text-slate-500 font-medium">
                    {marker.refRange}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">Uploaded 15 Mar 2026</span>
          <button className="flex items-center gap-1 text-sm font-semibold text-[#2D6BCC] hover:text-blue-800 transition-colors">
            View Full Report <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
