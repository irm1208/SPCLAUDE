import { useEffect, useState } from "react";

const PEAKS = [
  { label: "Main", ret: "12.84", area: 99.892, color: "#2563eb" },
  { label: "Imp A", ret: "9.21", area: 0.063, color: "#94a3b8" },
  { label: "Imp B", ret: "14.60", area: 0.045, color: "#94a3b8" },
];

export function ChromoPanel() {
  const [fill, setFill] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      let v = 0;
      const iv = setInterval(() => {
        v = Math.min(1, v + 0.025);
        setFill(v);
        if (v >= 1) clearInterval(iv);
      }, 16);
      return () => clearInterval(iv);
    }, 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f2f5] p-4">
      <div
        className="w-full max-w-[280px] rounded-lg overflow-hidden flex flex-col"
        style={{
          background: "#fff",
          border: "1px solid #d1d9e0",
          boxShadow: "0 2px 16px rgba(0,0,0,0.10)",
        }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2.5" style={{ background: "#1e3a5f", color: "#fff" }}>
          <div>
            <p className="text-[8px] tracking-[0.25em] uppercase text-blue-300 font-bold">Certificate of Analysis</p>
            <p className="text-sm font-bold text-white mt-0.5">Tirzepatide 5 mg</p>
          </div>
          <div className="text-right">
            <p className="text-[8px] text-blue-300">BATCH</p>
            <p className="text-[11px] font-mono font-bold text-white">ZE30-0319</p>
          </div>
        </div>

        {/* Chromatogram trace */}
        <div className="px-4 pt-3 pb-1">
          <p className="text-[8px] uppercase tracking-[0.2em] font-bold text-slate-400 mb-1.5">HPLC Chromatogram</p>
          <div className="relative h-14 w-full" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 4 }}>
            {/* Baseline */}
            <div className="absolute bottom-2 left-0 right-0 h-px bg-slate-200" />
            {/* Peaks */}
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
              {/* Main compound peak */}
              <path
                d={`M 52% 90% Q 58% ${10 + (1 - fill) * 80}% 64% 90%`}
                fill="rgba(37,99,235,0.15)" stroke="#2563eb" strokeWidth="1.5"
              />
              {/* Impurity A */}
              <path
                d={`M 32% 90% Q 35% ${78 + (1 - fill) * 20}% 38% 90%`}
                fill="rgba(148,163,184,0.2)" stroke="#94a3b8" strokeWidth="1"
              />
              {/* Impurity B */}
              <path
                d={`M 74% 90% Q 77% ${82 + (1 - fill) * 18}% 80% 90%`}
                fill="rgba(148,163,184,0.2)" stroke="#94a3b8" strokeWidth="1"
              />
              <text x="58%" y="22%" fontSize="7" fill="#2563eb" textAnchor="middle" fontFamily="monospace">99.89%</text>
            </svg>
            <div className="absolute bottom-0.5 left-1 right-1 flex justify-between">
              <span className="text-[7px] text-slate-300 font-mono">0 min</span>
              <span className="text-[7px] text-slate-300 font-mono">20 min</span>
            </div>
          </div>
        </div>

        {/* Peak table */}
        <div className="px-4 pb-3">
          <table className="w-full text-[9px]">
            <thead>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                <th className="py-1 text-left font-bold text-slate-400 tracking-wider">PEAK</th>
                <th className="py-1 text-right font-bold text-slate-400 tracking-wider">RT (min)</th>
                <th className="py-1 text-right font-bold text-slate-400 tracking-wider">AREA %</th>
              </tr>
            </thead>
            <tbody>
              {PEAKS.map(p => (
                <tr key={p.label} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td className="py-1 font-semibold" style={{ color: p.color }}>{p.label}</td>
                  <td className="py-1 text-right font-mono text-slate-600">{p.ret}</td>
                  <td className="py-1 text-right font-mono font-bold" style={{ color: p.color }}>{p.area.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Fields */}
        <div className="mx-4 mb-3 p-3 rounded-md flex flex-col gap-1.5" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
          {[
            ["Method", "LC-MS/MS + HPLC"],
            ["Specification", "≥ 98.0%"],
            ["Result", "PASS — Conforms"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between items-center">
              <span className="text-[8px] font-bold text-slate-400 tracking-wider uppercase">{k}</span>
              <span className="text-[10px] font-semibold" style={{ color: k === "Result" ? "#16a34a" : "#1e293b" }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5" style={{ background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
          <div>
            <p className="text-[8px] text-slate-400">Tested by</p>
            <p className="text-[10px] font-bold text-slate-700">Janoshik · 10 Apr 2026</p>
          </div>
          <button
            className="px-3 py-1.5 rounded text-[9px] font-bold text-white tracking-wide"
            style={{ background: "#1e3a5f" }}
          >
            VIEW REPORT →
          </button>
        </div>
      </div>
    </div>
  );
}
