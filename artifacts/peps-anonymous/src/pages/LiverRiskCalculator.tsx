import React, { useState } from "react";
import { RotateCcw, Activity, Info } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { SiteAnnouncements } from "@/components/SiteAnnouncements";

const PAGE_BG   = "#F9FAFB";
const CARD_STYLE: React.CSSProperties = {
  background: "#FFFFFF",
  borderRadius: 16,
  border: "1px solid #E5E7EB",
  overflow: "hidden",
};
const DIVIDER = "#F3F4F6";

function NumInput({
  label, value, onChange, unit, placeholder, hint,
}: {
  label: string; value: string; onChange: (v: string) => void;
  unit: string; placeholder: string; hint?: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="text-sm font-semibold" style={{ color: "#374151" }}>{label}</label>
        <span className="text-[11px] font-medium" style={{ color: "#9CA3AF" }}>{unit}</span>
      </div>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 px-3.5 rounded-xl text-sm font-medium outline-none transition-all"
        style={{
          background: "#F9FAFB",
          border: "1.5px solid #E5E7EB",
          color: "#111827",
        }}
        onFocus={e => { e.currentTarget.style.borderColor = "#2563EB"; e.currentTarget.style.background = "#EFF6FF"; }}
        onBlur={e =>  { e.currentTarget.style.borderColor = "#E5E7EB"; e.currentTarget.style.background = "#F9FAFB"; }}
      />
      {hint && <p className="text-[11px] mt-1" style={{ color: "#9CA3AF" }}>{hint}</p>}
    </div>
  );
}

function calcFib4(age: number, ast: number, platelets: number, alt: number): number {
  if (alt <= 0 || platelets <= 0) return 0;
  return (age * ast) / (platelets * Math.sqrt(alt));
}

type RiskLevel = "low" | "indeterminate" | "high";

function getRisk(fib4: number): RiskLevel {
  if (fib4 < 1.30) return "low";
  if (fib4 <= 2.67) return "indeterminate";
  return "high";
}

const RISK_META: Record<RiskLevel, { label: string; sublabel: string; color: string; bg: string; border: string; fibrosis: string }> = {
  low: {
    label: "Low Risk",
    sublabel: "Advanced fibrosis is unlikely",
    color: "#16A34A",
    bg: "rgba(22,163,74,0.07)",
    border: "rgba(22,163,74,0.25)",
    fibrosis: "F0–F1 (minimal to no fibrosis)",
  },
  indeterminate: {
    label: "Indeterminate",
    sublabel: "Further evaluation may be warranted",
    color: "#D97706",
    bg: "rgba(217,119,6,0.07)",
    border: "rgba(217,119,6,0.25)",
    fibrosis: "F1–F3 (borderline — specialist review advised)",
  },
  high: {
    label: "High Risk",
    sublabel: "Significant fibrosis or cirrhosis is likely",
    color: "#DC2626",
    bg: "rgba(220,38,38,0.07)",
    border: "rgba(220,38,38,0.25)",
    fibrosis: "F3–F4 (advanced fibrosis — prompt review required)",
  },
};

const MARKERS = [
  { key: "ast",   label: "AST",            unit: "U/L",   note: "Aspartate aminotransferase — normal: 10–40 U/L" },
  { key: "alt",   label: "ALT",            unit: "U/L",   note: "Alanine aminotransferase — normal: 7–56 U/L" },
  { key: "plt",   label: "Platelets",      unit: "×10⁹/L",note: "Normal: 150–400 ×10⁹/L" },
];

export function LiverRiskContent() {
  const [age, setAge]   = useState("");
  const [ast, setAst]   = useState("");
  const [alt, setAlt]   = useState("");
  const [plt, setPlt]   = useState("");

  const ageN = parseFloat(age);
  const astN = parseFloat(ast);
  const altN = parseFloat(alt);
  const pltN = parseFloat(plt);

  const allFilled = age && ast && alt && plt &&
    !isNaN(ageN) && !isNaN(astN) && !isNaN(altN) && !isNaN(pltN) &&
    ageN > 0 && astN > 0 && altN > 0 && pltN > 0;

  const fib4   = allFilled ? calcFib4(ageN, astN, pltN, altN) : null;
  const risk   = fib4 != null ? getRisk(fib4) : null;
  const meta   = risk ? RISK_META[risk] : null;

  function reset() { setAge(""); setAst(""); setAlt(""); setPlt(""); }

  const gaugePercent = fib4 != null ? Math.min(100, (fib4 / 4) * 100) : 0;

  return (
    <main className="flex-1 px-4 pt-2 pb-6 max-w-2xl mx-auto w-full space-y-3">

      {/* Header */}
      <div className="flex items-center justify-between py-2">
        <div>
          <h1 className="text-lg font-bold" style={{ color: "#111827" }}>Liver Risk Score</h1>
          <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>FIB-4 Index — liver fibrosis risk assessment</p>
        </div>
        <button onClick={reset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
          style={{ background: "#F3F4F6", color: "#6B7280", border: "1px solid #E5E7EB" }}>
          <RotateCcw className="w-3 h-3" /> Reset
        </button>
      </div>

      {/* How it works info card */}
      <div className="rounded-xl px-4 py-3 flex gap-3" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
        <Info className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#2563EB" }} />
        <div>
          <p className="text-[12px] font-bold mb-0.5" style={{ color: "#1E40AF" }}>What is the FIB-4 Index?</p>
          <p className="text-[11px] leading-relaxed" style={{ color: "#3B82F6" }}>
            A validated, non-invasive score that estimates the likelihood of significant liver fibrosis using routine blood tests.
            Widely used to assess liver health in people taking hepatotoxic substances (oral steroids, AAS, alcohol).
          </p>
        </div>
      </div>

      {/* Inputs */}
      <div style={CARD_STYLE}>
        <div className="px-4 py-3" style={{ borderBottom: `1px solid ${DIVIDER}` }}>
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>Blood Test Values</p>
        </div>
        <div className="px-4 py-4 space-y-4">
          <NumInput label="Age" value={age} onChange={setAge} unit="years" placeholder="e.g. 32" hint="18–100 years" />
          <div className="grid grid-cols-2 gap-3">
            <NumInput label="AST" value={ast} onChange={setAst} unit="U/L" placeholder="e.g. 35" hint="Normal: 10–40" />
            <NumInput label="ALT" value={alt} onChange={setAlt} unit="U/L" placeholder="e.g. 28" hint="Normal: 7–56" />
          </div>
          <NumInput label="Platelet Count" value={plt} onChange={setPlt} unit="×10⁹/L" placeholder="e.g. 220" hint="Normal: 150–400" />
        </div>
      </div>

      {/* Formula */}
      <div className="px-4 py-3 rounded-xl" style={{ background: "#F8FAFC", border: "1px solid #E5E7EB" }}>
        <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#9CA3AF" }}>Formula</p>
        <p className="text-[13px] font-mono font-semibold" style={{ color: "#374151" }}>
          FIB-4 = (Age × AST) ÷ (Platelets × √ALT)
        </p>
        {fib4 != null && (
          <p className="text-[12px] font-mono mt-1" style={{ color: "#6B7280" }}>
            = ({ageN} × {astN}) ÷ ({pltN} × √{altN})
            &nbsp;= <span className="font-bold" style={{ color: meta!.color }}>{fib4.toFixed(2)}</span>
          </p>
        )}
      </div>

      {/* Result */}
      {fib4 != null && meta && (
        <div className="rounded-2xl p-5 space-y-4" style={{ background: meta.bg, border: `1.5px solid ${meta.border}` }}>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold" style={{ color: meta.color }}>{fib4.toFixed(2)}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider mt-0.5" style={{ color: meta.color }}>FIB-4 Score</p>
            </div>
            <div className="text-right">
              <p className="text-base font-bold" style={{ color: meta.color }}>{meta.label}</p>
              <p className="text-[11px] mt-0.5" style={{ color: meta.color, opacity: 0.8 }}>{meta.sublabel}</p>
            </div>
          </div>

          {/* Gauge bar */}
          <div>
            <div className="relative h-3 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.06)" }}>
              <div
                className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${gaugePercent}%`,
                  background: risk === "low" ? "#16A34A" : risk === "indeterminate" ? "#D97706" : "#DC2626",
                }}
              />
              {/* Zone markers */}
              <div className="absolute top-0 bottom-0 w-[0.5px]" style={{ left: "32.5%", background: "rgba(0,0,0,0.2)" }} />
              <div className="absolute top-0 bottom-0 w-[0.5px]" style={{ left: "66.75%", background: "rgba(0,0,0,0.2)" }} />
            </div>
            <div className="flex justify-between mt-1 text-[10px] font-semibold" style={{ color: "rgba(0,0,0,0.4)" }}>
              <span>0</span>
              <span>1.30</span>
              <span>2.67</span>
              <span>4.0+</span>
            </div>
          </div>

          <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.6)" }}>
            <p className="text-[11px] font-bold mb-0.5" style={{ color: "#374151" }}>Likely fibrosis stage</p>
            <p className="text-[12px]" style={{ color: "#6B7280" }}>{meta.fibrosis}</p>
          </div>
        </div>
      )}

      {/* Reference table */}
      <div style={CARD_STYLE}>
        <div className="px-4 py-3" style={{ borderBottom: `1px solid ${DIVIDER}` }}>
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>FIB-4 Reference Ranges</p>
        </div>
        <div className="divide-y divide-gray-50">
          {[
            { range: "< 1.30", label: "Low Risk",      detail: "Advanced fibrosis unlikely (F0–F1)", color: "#16A34A", bg: "rgba(22,163,74,0.05)" },
            { range: "1.30–2.67", label: "Indeterminate", detail: "Borderline — consider specialist review (F1–F3)", color: "#D97706", bg: "rgba(217,119,6,0.05)" },
            { range: "> 2.67", label: "High Risk",     detail: "Advanced fibrosis likely (F3–F4) — prompt action needed", color: "#DC2626", bg: "rgba(220,38,38,0.05)" },
          ].map(({ range, label, detail, color, bg }) => (
            <div key={range} className="flex items-center gap-3 px-4 py-3" style={{ background: bg }}>
              <div className="w-1.5 h-1.5 rounded-full shrink-0 mt-0.5" style={{ background: color }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-bold font-mono" style={{ color }}>{range}</span>
                  <span className="text-xs font-semibold" style={{ color }}>{label}</span>
                </div>
                <p className="text-[11px] mt-0.5" style={{ color: "#6B7280" }}>{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* What to do section */}
      <div style={CARD_STYLE}>
        <div className="px-4 py-3" style={{ borderBottom: `1px solid ${DIVIDER}` }}>
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>Marker Reference</p>
        </div>
        <div className="divide-y divide-gray-50">
          {MARKERS.map(m => (
            <div key={m.key} className="flex items-center gap-3 px-4 py-3">
              <Activity className="w-3.5 h-3.5 shrink-0" style={{ color: "#94A3B8" }} />
              <div>
                <p className="text-[12px] font-bold" style={{ color: "#374151" }}>{m.label} <span className="text-[10px] font-normal" style={{ color: "#9CA3AF" }}>({m.unit})</span></p>
                <p className="text-[11px]" style={{ color: "#9CA3AF" }}>{m.note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-center pb-2 leading-relaxed" style={{ color: "#9CA3AF" }}>
        For educational use only. The FIB-4 Index is a screening tool — not a diagnosis.
        Always discuss abnormal results with a qualified clinician.
      </p>
    </main>
  );
}

export default function LiverRiskCalculator() {
  return (
    <PageLayout>
      <div className="flex-1 flex flex-col" style={{ background: PAGE_BG, minHeight: "100%" }}>
        <SiteAnnouncements />
        <LiverRiskContent />
      </div>
    </PageLayout>
  );
}
