import React from "react";
import { FlaskConical, ArrowRight } from "lucide-react";

export function LabProgress() {
  const biomarkers = [
    {
      name: "Testosterone",
      value: "28.5",
      unit: "nmol/L",
      ref: "8.0–29.0",
      status: "in-range",
      percent: 92, // high normal
    },
    {
      name: "LH",
      value: "0.2",
      unit: "IU/L",
      ref: "1.7–8.6",
      status: "oor",
      percent: 5, // very low (below 0) relative to track
    },
    {
      name: "FSH",
      value: "0.3",
      unit: "IU/L",
      ref: "1.5–12.4",
      status: "oor",
      percent: 5, // very low
    },
    {
      name: "Haematocrit",
      value: "51.2",
      unit: "%",
      ref: "37–50",
      status: "oor",
      percent: 100, // high (past edge)
    },
    {
      name: "Haemoglobin",
      value: "172",
      unit: "g/L",
      ref: "130–180",
      status: "in-range",
      percent: 84, // high normal
    },
    {
      name: "Total Cholesterol",
      value: "4.2",
      unit: "mmol/L",
      ref: "<5.2",
      status: "in-range",
      percent: 80, // normal
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#030712] font-sans">
      <div className="w-full max-w-md bg-[#111827] rounded-xl overflow-hidden border border-white/5 shadow-2xl">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-[#10B981]/10 flex items-center justify-center text-[#10B981] shrink-0">
              <FlaskConical size={24} />
            </div>
            <div className="flex-1 pt-1">
              <h2 className="text-white font-semibold text-lg leading-tight mb-2">Full Blood Count — Trough</h2>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[#10B981] text-xs font-medium bg-[#10B981]/10 px-2 py-1 rounded">Medichecks</span>
                <span className="text-gray-400 text-sm">15 Mar 2026</span>
              </div>
            </div>
          </div>

          {/* Summary Chips */}
          <div className="flex items-center gap-3 mb-8">
            <div className="px-3 py-1.5 rounded bg-white/5 text-gray-300 text-sm font-medium">
              24 markers
            </div>
            <div className="px-3 py-1.5 rounded bg-[#EF4444]/10 text-[#EF4444] text-sm font-medium flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#EF4444]"></div>
              3 OOR
            </div>
          </div>

          {/* Biomarkers List */}
          <div className="space-y-5">
            {biomarkers.map((marker, i) => {
              const isOOR = marker.status === "oor";
              const colorClass = isOOR ? "bg-[#EF4444]" : "bg-[#10B981]";
              const textClass = isOOR ? "text-[#EF4444]" : "text-white";
              const barColorClass = isOOR ? "bg-[#EF4444]" : "bg-[#10B981]";

              return (
                <div key={i} className="flex flex-col gap-2">
                  <div className="flex items-end justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${isOOR ? 'text-[#EF4444]' : 'text-gray-200'}`}>
                        {marker.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-semibold ${textClass}`}>
                        {marker.value}
                      </span>
                      <span className="text-gray-500 text-xs ml-1">{marker.unit}</span>
                    </div>
                  </div>
                  
                  {/* Progress Bar Visualizer */}
                  <div className="relative w-full">
                    {/* Track */}
                    <div className="h-1.5 w-full rounded-full bg-[rgba(255,255,255,0.08)]"></div>
                    
                    {/* Fill */}
                    <div 
                      className={`absolute top-0 left-0 h-1.5 rounded-full ${barColorClass}`}
                      style={{ width: `${Math.min(marker.percent, 100)}%` }}
                    ></div>

                    {/* Marker Line */}
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 bg-white shadow-sm rounded-full"
                      style={{ left: `calc(${Math.min(Math.max(marker.percent, 0), 100)}% - 1px)` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Button */}
          <button className="w-full mt-8 py-3.5 bg-[#10B981]/10 hover:bg-[#10B981]/20 transition-colors border border-[#10B981]/20 rounded-lg text-[#10B981] text-sm font-medium flex items-center justify-center gap-2">
            Full Report
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
