import { useEffect, useState } from "react";

const CELLS = [
  { label: "COMPOUND", value: "Tirzepatide", span: 2, highlight: false },
  { label: "MASS (Da)", value: "4113.58", span: 1, highlight: false },
  { label: "BATCH", value: "ZE30-0319", span: 1, highlight: false },
  { label: "PURITY", value: "99.892%", span: 1, highlight: true },
  { label: "SUPPLIER", value: "UTHER", span: 1, highlight: false },
  { label: "SOURCE", value: "VENDOR", span: 1, highlight: false },
  { label: "ANALYSIS", value: "Mass & Purity", span: 1, highlight: false },
  { label: "METHOD", value: "LC-MS/MS", span: 1, highlight: false },
  { label: "ENDOTOXIN", value: "< 0.1 EU/v", span: 1, highlight: false },
  { label: "LAB", value: "Janoshik EU", span: 1, highlight: false },
  { label: "TESTED", value: "10 Apr 2026", span: 1, highlight: false },
];

export function DataMatrix() {
  const [lit, setLit] = useState<number[]>([]);
  useEffect(() => {
    CELLS.forEach((_, i) => {
      setTimeout(() => setLit(l => [...l, i]), i * 55 + 100);
    });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#04080f] p-4">
      <div
        className="w-full max-w-[280px] rounded-lg overflow-hidden"
        style={{
          background: "#080e1a",
          border: "1px solid rgba(56,189,248,0.2)",
          boxShadow: "0 0 40px rgba(56,189,248,0.05)",
        }}
      >
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(56,189,248,0.12)" }}>
          <div>
            <p className="text-[8px] tracking-[0.3em] text-sky-500 font-bold uppercase">ANALYTICAL RECORD</p>
            <p className="text-[11px] font-bold text-sky-200 mt-0.5">COA · PEPTIDE COMPOUND</p>
          </div>
          <div
            className="px-2 py-1 rounded font-mono text-[9px] font-bold"
            style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e" }}
          >
            ✓ PASS
          </div>
        </div>

        {/* Data grid */}
        <div className="p-3 grid grid-cols-2 gap-1.5">
          {CELLS.map((c, i) => (
            <div
              key={c.label}
              className={`rounded flex flex-col gap-0.5 px-2.5 py-2 transition-all duration-300 ${c.span === 2 ? "col-span-2" : ""}`}
              style={{
                background: lit.includes(i)
                  ? c.highlight
                    ? "rgba(34,197,94,0.1)"
                    : "rgba(56,189,248,0.05)"
                  : "rgba(255,255,255,0.02)",
                border: lit.includes(i)
                  ? c.highlight
                    ? "1px solid rgba(34,197,94,0.35)"
                    : "1px solid rgba(56,189,248,0.12)"
                  : "1px solid rgba(255,255,255,0.04)",
                opacity: lit.includes(i) ? 1 : 0.3,
              }}
            >
              <span className="text-[7px] tracking-[0.2em] font-bold uppercase" style={{ color: "rgba(56,189,248,0.5)" }}>
                {c.label}
              </span>
              <span
                className="text-[11px] font-bold font-mono leading-tight"
                style={{
                  color: c.highlight ? "#22c55e" : "rgba(224,242,254,0.9)",
                  textShadow: c.highlight ? "0 0 10px rgba(34,197,94,0.5)" : "none",
                }}
              >
                {c.value}
              </span>
            </div>
          ))}
        </div>

        {/* Purity bar */}
        <div className="px-3 pb-3">
          <div className="flex justify-between mb-1">
            <span className="text-[7px] text-sky-600 tracking-wider uppercase font-bold">Purity Index</span>
            <span className="text-[8px] text-sky-300 font-mono">99.892 / 100.000</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
            <div
              className="h-full rounded-full"
              style={{
                width: "99.892%",
                background: "linear-gradient(90deg, #0ea5e9, #22d3ee, #4ade80)",
                boxShadow: "0 0 10px rgba(34,211,238,0.6)",
                transition: "width 1s ease",
              }}
            />
          </div>
        </div>

        {/* Footer CTA */}
        <div className="px-3 pb-3">
          <button
            className="w-full py-2 rounded text-[9px] font-bold tracking-[0.15em] uppercase transition-all"
            style={{
              background: "rgba(56,189,248,0.08)",
              border: "1px solid rgba(56,189,248,0.25)",
              color: "#7dd3fc",
            }}
          >
            ▶ ACCESS FULL REPORT
          </button>
        </div>
      </div>
    </div>
  );
}
