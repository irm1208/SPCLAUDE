import { useEffect, useState } from "react";

const SPECS = [
  { param: "Identity", method: "LC-MS", spec: "Conforms", result: "Conforms", pass: true },
  { param: "Purity", method: "HPLC", spec: "≥ 98.0%", result: "99.892%", pass: true },
  { param: "Mass", method: "MS/MS", spec: "4113.60 Da", result: "4113.58 Da", pass: true },
  { param: "Endotoxin", method: "LAL", spec: "< 1.0 EU/vial", result: "< 0.1", pass: true },
  { param: "Appearance", method: "Visual", spec: "White powder", result: "Conforms", pass: true },
];

export function ClinicalGrade() {
  const [purity, setPurity] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => {
      setPurity(v => {
        if (v >= 99.892) { clearInterval(iv); return 99.892; }
        return Math.min(99.892, v + 1.8);
      });
    }, 18);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f6f9] p-4">
      <div
        className="w-full max-w-[280px] rounded-xl overflow-hidden"
        style={{
          background: "#ffffff",
          border: "1.5px solid #e0e7ef",
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        }}
      >
        {/* Status stripe */}
        <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #16a34a 0%, #22c55e 100%)" }} />

        {/* Header */}
        <div className="px-4 pt-3 pb-3 flex justify-between items-start" style={{ borderBottom: "1px solid #e0e7ef" }}>
          <div>
            <p className="text-[8px] tracking-[0.25em] font-bold uppercase text-slate-400 mb-0.5">Certificate of Analysis</p>
            <p className="text-[15px] font-black text-slate-800 leading-tight">Tirzepatide</p>
            <p className="text-[11px] text-slate-500 font-medium">5 mg · Vendor CoA</p>
          </div>
          <div
            className="flex flex-col items-center justify-center px-3 py-2 rounded-lg"
            style={{ background: "#f0fdf4", border: "1.5px solid #22c55e" }}
          >
            <span className="text-[8px] font-bold tracking-widest text-green-600 uppercase">Status</span>
            <span className="text-[13px] font-black text-green-600">PASS</span>
          </div>
        </div>

        {/* Purity gauge */}
        <div className="px-4 py-3" style={{ borderBottom: "1px solid #e0e7ef" }}>
          <div className="flex justify-between items-baseline mb-1.5">
            <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-slate-400">Purity</span>
            <span className="text-[18px] font-black text-slate-800">{purity.toFixed(purity >= 99 ? 3 : 1)}<span className="text-sm font-bold text-slate-500">%</span></span>
          </div>
          <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: "#e2e8f0" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${purity}%`,
                background: "linear-gradient(90deg, #16a34a, #4ade80)",
                boxShadow: "0 0 8px rgba(34,197,94,0.5)",
              }}
            />
          </div>
          <div className="flex justify-between mt-0.5">
            <span className="text-[7px] text-slate-300">0%</span>
            <span className="text-[7px] text-slate-400 font-semibold">Spec ≥ 98.0%</span>
            <span className="text-[7px] text-slate-300">100%</span>
          </div>
        </div>

        {/* Specs table */}
        <div className="px-4 py-3" style={{ borderBottom: "1px solid #e0e7ef" }}>
          <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-2">Analytical Data</p>
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left text-[7px] font-bold text-slate-300 pb-1 tracking-wider uppercase">Parameter</th>
                <th className="text-left text-[7px] font-bold text-slate-300 pb-1 tracking-wider uppercase">Method</th>
                <th className="text-right text-[7px] font-bold text-slate-300 pb-1 tracking-wider uppercase">Result</th>
              </tr>
            </thead>
            <tbody>
              {SPECS.map(s => (
                <tr key={s.param} style={{ borderTop: "1px solid #f1f5f9" }}>
                  <td className="py-[3px] text-[9px] font-semibold text-slate-700">{s.param}</td>
                  <td className="py-[3px] text-[8px] font-mono text-slate-400">{s.method}</td>
                  <td className="py-[3px] text-[9px] font-bold text-right" style={{ color: s.pass ? "#16a34a" : "#dc2626" }}>
                    {s.result}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Meta */}
        <div className="px-4 py-3 flex justify-between items-center">
          <div className="flex flex-col gap-0.5">
            <span className="text-[7px] text-slate-400 uppercase tracking-wider">Batch · Supplier</span>
            <span className="text-[10px] font-mono font-bold text-slate-700">ZE30-0319 · UTHER</span>
            <span className="text-[8px] text-slate-400">Janoshik · 10 Apr 2026</span>
          </div>
          <button
            className="px-3 py-2 rounded-lg text-[9px] font-bold text-white"
            style={{ background: "#1e40af" }}
          >
            View Report →
          </button>
        </div>
      </div>
    </div>
  );
}
