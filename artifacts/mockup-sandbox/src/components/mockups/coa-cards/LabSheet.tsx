import { useEffect, useState } from "react";

const FIELDS = [
  { key: "COMPOUND_ID", val: "TIRZ-5-MG-001" },
  { key: "BATCH_NO", val: "ZE30-0319" },
  { key: "SUPPLIER", val: "UTHER" },
  { key: "SOURCE_TYPE", val: "VENDOR_COA" },
  { key: "METHOD", val: "LC-MS/MS + HPLC" },
  { key: "PURITY_PCT", val: "99.892" },
  { key: "MASS_CONFIRMED", val: "TRUE" },
  { key: "ENDOTOXIN", val: "< 1.0 EU/vial" },
  { key: "RESULT", val: "PASS" },
  { key: "DATE_TESTED", val: "2026-04-10" },
  { key: "LAB_ID", val: "JANOSHIK-EU" },
  { key: "COA_HASH", val: "a3f8c2d1..." },
];

export function LabSheet() {
  const [visible, setVisible] = useState(0);
  const [cursor, setCursor] = useState(true);

  useEffect(() => {
    if (visible < FIELDS.length) {
      const t = setTimeout(() => setVisible(v => v + 1), 60);
      return () => clearTimeout(t);
    }
  }, [visible]);

  useEffect(() => {
    const t = setInterval(() => setCursor(c => !c), 530);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050a05] p-4">
      <div
        className="w-full max-w-[280px] rounded-sm p-4 font-mono text-[11px] flex flex-col gap-1"
        style={{
          background: "#020802",
          border: "1px solid #1a4a1a",
          boxShadow: "0 0 30px rgba(0,200,0,0.08), inset 0 0 60px rgba(0,0,0,0.8)",
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 pb-2 mb-1" style={{ borderBottom: "1px solid #1a4a1a" }}>
          <div className="w-2 h-2 rounded-full bg-green-500" style={{ boxShadow: "0 0 6px #22c55e" }} />
          <span className="text-green-500 text-[9px] tracking-[0.3em] uppercase font-bold" style={{ textShadow: "0 0 8px #22c55e" }}>
            COA Terminal v2.1
          </span>
        </div>

        <p className="text-green-600 text-[9px] mb-1">$ query --compound tirzepatide --batch ZE30-0319</p>

        {/* Scan line effect */}
        <div className="relative">
          {FIELDS.slice(0, visible).map((f, i) => (
            <div key={f.key} className="flex justify-between items-baseline py-[3px]" style={{ borderBottom: "1px solid rgba(0,80,0,0.3)" }}>
              <span className="text-[9px] tracking-wide" style={{ color: "rgba(0,180,0,0.6)" }}>{f.key}</span>
              <span
                className="text-[10px] font-bold ml-2 text-right"
                style={{
                  color: f.key === "RESULT" ? (f.val === "PASS" ? "#22c55e" : "#ef4444")
                    : f.key === "PURITY_PCT" ? "#4ade80"
                    : "rgba(0,220,0,0.85)",
                  textShadow: f.key === "RESULT" || f.key === "PURITY_PCT" ? "0 0 8px currentColor" : "none",
                }}
              >
                {f.val}{f.key === "PURITY_PCT" ? "%" : ""}
              </span>
            </div>
          ))}
          {visible < FIELDS.length && (
            <div className="flex items-center gap-1 py-[3px]">
              <span className="text-green-700 text-[9px]">loading</span>
              <span className="text-green-500" style={{ textShadow: "0 0 6px #22c55e" }}>{cursor ? "█" : " "}</span>
            </div>
          )}
        </div>

        {visible >= FIELDS.length && (
          <button
            className="mt-2 w-full py-2 text-[10px] font-bold tracking-[0.2em] uppercase transition-all"
            style={{
              background: "rgba(0,80,0,0.35)",
              border: "1px solid #22c55e",
              color: "#22c55e",
              textShadow: "0 0 6px #22c55e",
              boxShadow: "0 0 12px rgba(34,197,94,0.2)",
            }}
          >
            ▶ VIEW FULL REPORT
          </button>
        )}
      </div>
    </div>
  );
}
