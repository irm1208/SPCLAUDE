import React, { useState } from "react";
import { RotateCcw, Info, Activity } from "lucide-react";

const CARD: React.CSSProperties = {
  background: "#FFFFFF",
  borderRadius: 16,
  border: "1px solid #E5E7EB",
  overflow: "hidden",
};
const DIVIDER = "#F3F4F6";

// ─── Formula ──────────────────────────────────────────────────────────────────
// HOMA-IR = (Fasting Glucose [mmol/L] × Fasting Insulin [mIU/L]) / 22.5

function calcHomaIR(glucoseMmol: number, insulinMIU: number): number {
  return (glucoseMmol * insulinMIU) / 22.5;
}

type RiskLevel = "optimal" | "normal" | "early" | "significant";

function getRisk(homa: number): RiskLevel {
  if (homa < 1.0) return "optimal";
  if (homa < 1.9) return "normal";
  if (homa <= 2.9) return "early";
  return "significant";
}

const RISK_META: Record<RiskLevel, {
  label: string; sub: string; detail: string;
  color: string; bg: string; border: string;
}> = {
  optimal: {
    label: "Excellent Sensitivity",
    sub: "Score < 1.0 — optimal insulin function",
    detail: "Your body is responding very well to insulin. Your pancreas doesn't need to work extra hard to maintain normal blood sugar. This reflects excellent metabolic health.",
    color: "#16A34A", bg: "rgba(22,163,74,0.07)", border: "rgba(22,163,74,0.25)",
  },
  normal: {
    label: "Normal Sensitivity",
    sub: "Score 1.0–1.9 — healthy insulin response",
    detail: "Your body is responding appropriately to insulin and your metabolic health appears in good shape. Maintaining healthy lifestyle habits will keep your score in this range.",
    color: "#0891B2", bg: "rgba(8,145,178,0.07)", border: "rgba(8,145,178,0.25)",
  },
  early: {
    label: "Early Insulin Resistance",
    sub: "Score 1.9–2.9 — early metabolic stress",
    detail: "Your score suggests early insulin resistance. Your cells are beginning to respond less efficiently to insulin. Lifestyle interventions — exercise, diet, sleep, and stress management — can reverse this at this stage.",
    color: "#D97706", bg: "rgba(217,119,6,0.07)", border: "rgba(217,119,6,0.25)",
  },
  significant: {
    label: "Significant Resistance",
    sub: "Score > 2.9 — elevated metabolic risk",
    detail: "Your score indicates significant insulin resistance. Research shows HOMA-IR in this range is associated with 3–5× higher risk of developing type 2 diabetes. Prompt lifestyle intervention and a clinical review is recommended.",
    color: "#DC2626", bg: "rgba(220,38,38,0.07)", border: "rgba(220,38,38,0.25)",
  },
};

// ─── UI helpers ───────────────────────────────────────────────────────────────

function NumInput({ label, value, onChange, unit, placeholder, hint }: {
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
        type="number" inputMode="decimal"
        value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full h-11 px-3.5 rounded-xl text-sm font-medium outline-none transition-all"
        style={{ background: "#F9FAFB", border: "1.5px solid #E5E7EB", color: "#111827" }}
        onFocus={e => { e.currentTarget.style.borderColor = "#2563EB"; e.currentTarget.style.background = "#EFF6FF"; }}
        onBlur={e =>  { e.currentTarget.style.borderColor = "#E5E7EB"; e.currentTarget.style.background = "#F9FAFB"; }}
      />
      {hint && <p className="text-[11px] mt-1" style={{ color: "#9CA3AF" }}>{hint}</p>}
    </div>
  );
}

// ─── Main content ─────────────────────────────────────────────────────────────

export function InsulinResistanceContent() {
  const [glucoseUnit, setGlucoseUnit] = useState<"mmol" | "mgdl">("mmol");
  const [glucose,  setGlucose]  = useState("");
  const [insulin,  setInsulin]  = useState("");

  const glucoseN  = parseFloat(glucose);
  const insulinN  = parseFloat(insulin);

  const glucoseMmol = !isNaN(glucoseN) && glucoseN > 0
    ? glucoseUnit === "mgdl" ? glucoseN / 18.0 : glucoseN
    : null;

  const allFilled = glucoseMmol !== null && !isNaN(insulinN) && insulinN > 0;
  const homa   = allFilled ? calcHomaIR(glucoseMmol!, insulinN) : null;
  const risk   = homa != null ? getRisk(homa) : null;
  const meta   = risk ? RISK_META[risk] : null;

  // Gauge: cap at 5 for display
  const gaugePercent = homa != null ? Math.min(100, (homa / 5) * 100) : 0;

  function reset() { setGlucose(""); setInsulin(""); }

  return (
    <div className="space-y-4 pb-6">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Activity className="w-4 h-4" style={{ color: "#0891B2" }} />
          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>Metabolic Health</p>
        </div>
        <h2 className="text-xl font-bold" style={{ color: "#111827" }}>Insulin Resistance Score</h2>
        <p className="text-[12px] mt-1 leading-relaxed" style={{ color: "#6B7280" }}>
          Evaluate your metabolic risk using fasting blood test results to estimate insulin resistance.
          Based on the HOMA-IR model.
        </p>
      </div>

      {/* Info card */}
      <div className="px-4 py-3 rounded-xl flex gap-3" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
        <Info className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#2563EB" }} />
        <div>
          <p className="text-[12px] font-bold mb-0.5" style={{ color: "#1E40AF" }}>What is HOMA-IR?</p>
          <p className="text-[11px] leading-relaxed" style={{ color: "#3B82F6" }}>
            The Homeostatic Model Assessment of Insulin Resistance is a clinically validated tool to
            measure insulin resistance using fasting glucose and insulin levels. Valid for adults only —
            results require proper fasting for 8–12 hours before blood draw.
          </p>
        </div>
      </div>

      {/* Inputs */}
      <div style={CARD}>
        <div className="px-4 py-3" style={{ borderBottom: `1px solid ${DIVIDER}` }}>
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>Fasting Blood Test Values</p>
        </div>
        <div className="px-4 py-4 space-y-4">

          {/* Glucose with unit toggle */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-semibold" style={{ color: "#374151" }}>Fasting Glucose</label>
              <div className="flex gap-0.5 p-0.5 rounded-lg" style={{ background: "#F3F4F6", border: "1px solid #E5E7EB" }}>
                {(["mmol", "mgdl"] as const).map(u => (
                  <button
                    key={u}
                    onClick={() => setGlucoseUnit(u)}
                    className="px-2.5 py-1 rounded-md text-[11px] font-bold transition-all"
                    style={{
                      background: glucoseUnit === u ? "#fff" : "transparent",
                      color: glucoseUnit === u ? "#111827" : "#9CA3AF",
                      boxShadow: glucoseUnit === u ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                    }}
                  >
                    {u === "mmol" ? "mmol/L" : "mg/dL"}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="number" inputMode="decimal"
              value={glucose} onChange={e => setGlucose(e.target.value)}
              placeholder={glucoseUnit === "mmol" ? "e.g. 5.2" : "e.g. 94"}
              className="w-full h-11 px-3.5 rounded-xl text-sm font-medium outline-none transition-all"
              style={{ background: "#F9FAFB", border: "1.5px solid #E5E7EB", color: "#111827" }}
              onFocus={e => { e.currentTarget.style.borderColor = "#2563EB"; e.currentTarget.style.background = "#EFF6FF"; }}
              onBlur={e =>  { e.currentTarget.style.borderColor = "#E5E7EB"; e.currentTarget.style.background = "#F9FAFB"; }}
            />
            <p className="text-[11px] mt-1" style={{ color: "#9CA3AF" }}>
              {glucoseUnit === "mmol" ? "Normal fasting: 3.9–5.5 mmol/L" : "Normal fasting: 70–99 mg/dL"}
            </p>
          </div>

          <NumInput
            label="Fasting Insulin"
            value={insulin} onChange={setInsulin}
            unit="mIU/L" placeholder="e.g. 8"
            hint="Normal fasting: 3–25 mIU/L"
          />
        </div>
      </div>

      {/* Formula */}
      <div className="px-4 py-3 rounded-xl" style={{ background: "#F8FAFC", border: "1px solid #E5E7EB" }}>
        <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#9CA3AF" }}>Formula</p>
        <p className="text-[13px] font-mono font-semibold" style={{ color: "#374151" }}>
          HOMA-IR = (Glucose [mmol/L] × Insulin [mIU/L]) ÷ 22.5
        </p>
        {homa != null && glucoseMmol != null && (
          <p className="text-[12px] font-mono mt-1" style={{ color: "#6B7280" }}>
            = ({glucoseMmol.toFixed(2)} × {insulinN}) ÷ 22.5
            &nbsp;= <span className="font-bold" style={{ color: meta!.color }}>{homa.toFixed(2)}</span>
          </p>
        )}
      </div>

      {/* Result */}
      {homa != null && meta && (
        <div className="rounded-2xl p-5 space-y-4" style={{ background: meta.bg, border: `1.5px solid ${meta.border}` }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold" style={{ color: meta.color }}>{homa.toFixed(2)}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider mt-0.5" style={{ color: meta.color }}>HOMA-IR Score</p>
            </div>
            <div className="text-right">
              <p className="text-base font-bold leading-tight" style={{ color: meta.color }}>{meta.label}</p>
              <p className="text-[11px] mt-0.5" style={{ color: meta.color, opacity: 0.8 }}>{meta.sub}</p>
            </div>
          </div>

          {/* Gauge */}
          <div>
            <div className="relative h-3 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.06)" }}>
              <div
                className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                style={{ width: `${gaugePercent}%`, background: meta.color }}
              />
              <div className="absolute top-0 bottom-0 w-[0.5px]" style={{ left: "20%",  background: "rgba(0,0,0,0.2)" }} />
              <div className="absolute top-0 bottom-0 w-[0.5px]" style={{ left: "38%",  background: "rgba(0,0,0,0.2)" }} />
              <div className="absolute top-0 bottom-0 w-[0.5px]" style={{ left: "58%",  background: "rgba(0,0,0,0.2)" }} />
            </div>
            <div className="flex justify-between mt-1 text-[10px] font-semibold" style={{ color: "rgba(0,0,0,0.4)" }}>
              <span>0</span><span>1.0</span><span>1.9</span><span>2.9</span><span>5+</span>
            </div>
          </div>

          {/* Detail */}
          <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.65)" }}>
            <p className="text-[12px] leading-relaxed" style={{ color: "#374151" }}>{meta.detail}</p>
          </div>
        </div>
      )}

      {/* Reference table */}
      <div style={CARD}>
        <div className="px-4 py-3" style={{ borderBottom: `1px solid ${DIVIDER}` }}>
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>HOMA-IR Reference Ranges</p>
        </div>
        <div className="divide-y divide-gray-50">
          {[
            { range: "< 1.0",    label: "Excellent Sensitivity", color: "#16A34A", bg: "rgba(22,163,74,0.04)"  },
            { range: "1.0–1.9",  label: "Normal Sensitivity",    color: "#0891B2", bg: "rgba(8,145,178,0.04)"  },
            { range: "1.9–2.9",  label: "Early Resistance",      color: "#D97706", bg: "rgba(217,119,6,0.04)"  },
            { range: "> 2.9",    label: "Significant Resistance", color: "#DC2626", bg: "rgba(220,38,38,0.04)"  },
          ].map(({ range, label, color, bg }) => (
            <div key={range} className="flex items-center gap-3 px-4 py-3" style={{ background: bg }}>
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
              <span className="text-sm font-bold font-mono w-16 shrink-0" style={{ color }}>{range}</span>
              <span className="text-[12px] font-semibold" style={{ color: "#374151" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Marker reference */}
      <div style={CARD}>
        <div className="px-4 py-3" style={{ borderBottom: `1px solid ${DIVIDER}` }}>
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>About the Markers</p>
        </div>
        <div className="divide-y divide-gray-50">
          {[
            { name: "Fasting Glucose", desc: "Amount of sugar in your blood after 8–12 hours of not eating. The body's primary energy source.", normal: "3.9–5.5 mmol/L" },
            { name: "Fasting Insulin", desc: "Insulin level in your blood after fasting. This hormone regulates glucose uptake and storage.",  normal: "3–25 mIU/L" },
          ].map(({ name, desc, normal }) => (
            <div key={name} className="px-4 py-3.5">
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <p className="text-[13px] font-bold" style={{ color: "#374151" }}>{name}</p>
                <span className="text-[10px] font-semibold shrink-0" style={{ color: "#9CA3AF" }}>Normal: {normal}</span>
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: "#9CA3AF" }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={reset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: "#F3F4F6", color: "#6B7280", border: "1px solid #E5E7EB" }}>
          <RotateCcw className="w-3 h-3" /> Reset
        </button>
      </div>

      <p className="text-[11px] text-center leading-relaxed" style={{ color: "#9CA3AF" }}>
        For educational use only. HOMA-IR is not valid for children, pregnant women, the elderly,
        or people on insulin therapy. Always consult a clinician before making lifestyle changes.
      </p>
    </div>
  );
}
