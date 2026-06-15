import React from "react";
import { Activity, AlertCircle, ArrowRight, FileText } from "lucide-react";

export function LabBadges() {
  const biomarkers = [
    { name: "TEST", value: "28.5", unit: "nmol/L", refRange: "8.0–29.0", status: "in-range" },
    { name: "LH", value: "0.2", unit: "IU/L", refRange: "1.7–8.6", status: "out-of-range" },
    { name: "FSH", value: "0.3", unit: "IU/L", refRange: "1.5–12.4", status: "out-of-range" },
    { name: "HCT", value: "51.2", unit: "%", refRange: "37–50%", status: "out-of-range" },
    { name: "HGB", value: "172", unit: "g/L", refRange: "130–180", status: "in-range" },
    { name: "CHOL", value: "4.2", unit: "mmol/L", refRange: "<5.2", status: "in-range" },
    { name: "HDL", value: "1.1", unit: "mmol/L", refRange: ">1.0", status: "in-range" },
    { name: "LDL", value: "2.6", unit: "mmol/L", refRange: "<3.4", status: "in-range" },
    { name: "CREAT", value: "88", unit: "μmol/L", refRange: "60–110", status: "in-range" },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
        {/* Header Section */}
        <div className="p-6 pb-4">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
              <FileText className="w-6 h-6" />
            </div>
            <div className="flex flex-col items-end">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-100">
                <AlertCircle className="w-3.5 h-3.5 mr-1" />
                3 out of range
              </span>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-1">Full Blood Count</h2>
          <p className="text-sm text-gray-500 font-medium">
            15 Mar 2026 &middot; Medichecks &middot; Trough
          </p>

          <div className="mt-4 flex items-center space-x-2 text-sm text-gray-600">
            <Activity className="w-4 h-4 text-blue-500" />
            <span className="font-medium text-gray-700">24 markers tested</span>
          </div>
        </div>

        {/* Badges Grid */}
        <div className="px-6 py-2 pb-6">
          <div className="flex flex-wrap gap-2.5">
            {biomarkers.map((marker) => {
              const isOOR = marker.status === "out-of-range";
              return (
                <div
                  key={marker.name}
                  className={`
                    flex flex-col justify-center px-3.5 py-2.5 rounded-2xl border
                    ${isOOR 
                      ? "bg-red-50/80 border-red-200" 
                      : "bg-emerald-50/80 border-emerald-200"
                    }
                  `}
                  style={{ minWidth: '4.8rem' }}
                >
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <span className={`text-[11px] font-bold tracking-wider ${isOOR ? "text-red-700" : "text-emerald-700"}`}>
                      {marker.name}
                    </span>
                    {isOOR ? (
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    ) : null}
                  </div>
                  <div className="flex items-baseline space-x-1">
                    <span className={`text-base font-bold leading-none ${isOOR ? "text-red-900" : "text-emerald-900"}`}>
                      {marker.value}
                    </span>
                  </div>
                </div>
              );
            })}
            
            {/* +15 more indicator */}
            <div className="flex flex-col items-center justify-center px-3.5 py-2.5 rounded-2xl border border-gray-200 bg-gray-50 text-gray-500">
              <span className="text-[11px] font-bold tracking-wider text-gray-400 mb-1">MORE</span>
              <span className="text-base font-bold text-gray-600">+15</span>
            </div>
          </div>
        </div>

        {/* Footer / CTA */}
        <div className="p-6 pt-0">
          <button className="w-full py-4 px-4 bg-[#0F172A] hover:bg-[#1E293B] transition-colors text-white text-sm font-semibold rounded-2xl flex items-center justify-center space-x-2 group">
            <span>See Details</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}
