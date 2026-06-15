import React, { useState } from "react";
import { RotateCcw, Info, Heart, ChevronRight } from "lucide-react";

const CARD: React.CSSProperties = {
  background: "#FFFFFF",
  borderRadius: 16,
  border: "1px solid #E5E7EB",
  overflow: "hidden",
};
const DIVIDER = "#F3F4F6";

// ─── Shared UI ────────────────────────────────────────────────────────────────

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

function CheckRow({ label, sublabel, checked, onChange }: {
  label: string; sublabel?: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-start gap-3 p-3.5 rounded-xl text-left w-full transition-all"
      style={{
        background: checked ? "rgba(37,99,235,0.06)" : "#F9FAFB",
        border: `1.5px solid ${checked ? "#2563EB" : "#E5E7EB"}`,
      }}
    >
      <div className="mt-0.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all"
        style={{ background: checked ? "#2563EB" : "#fff", border: `1.5px solid ${checked ? "#2563EB" : "#D1D5DB"}` }}>
        {checked && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <div>
        <p className="text-[13px] font-semibold leading-snug" style={{ color: "#374151" }}>{label}</p>
        {sublabel && <p className="text-[11px] mt-0.5" style={{ color: "#9CA3AF" }}>{sublabel}</p>}
      </div>
    </button>
  );
}

function RadioRow({ label, sublabel, points, selected, onSelect }: {
  label: string; sublabel?: string; points: number; selected: boolean; onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex items-center gap-3 p-3.5 rounded-xl text-left w-full transition-all"
      style={{
        background: selected ? "rgba(37,99,235,0.06)" : "#F9FAFB",
        border: `1.5px solid ${selected ? "#2563EB" : "#E5E7EB"}`,
      }}
    >
      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all"
        style={{ border: `1.5px solid ${selected ? "#2563EB" : "#D1D5DB"}`, background: selected ? "#2563EB" : "#fff" }}>
        {selected && <div className="w-2 h-2 rounded-full bg-white" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold leading-snug" style={{ color: "#374151" }}>{label}</p>
        {sublabel && <p className="text-[11px] mt-0.5" style={{ color: "#9CA3AF" }}>{sublabel}</p>}
      </div>
      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: "#EFF6FF", color: "#2563EB" }}>
        +{points} pt{points !== 1 ? "s" : ""}
      </span>
    </button>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#2563EB" }} />
      <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#6B7280" }}>{children}</p>
    </div>
  );
}

// ─── Simon Broome ─────────────────────────────────────────────────────────────

type SimonResult = "definite" | "possible" | "unlikely";

function simonClassify(
  ldl: number,
  tc: number,
  xanthomaPatient: boolean,
  xanthomaRelative: boolean,
  dnaMutation: boolean,
  famPrematureMI: boolean,
  famRaisedTC: boolean,
): SimonResult | null {
  const hasLDL = ldl > 0;
  const hasTC  = tc > 0;

  const cholCriteria = (hasLDL && ldl >= 4.9) || (hasTC && tc >= 7.5);
  if (!cholCriteria) return null;

  if (xanthomaPatient || xanthomaRelative || dnaMutation) return "definite";
  if (famPrematureMI || famRaisedTC) return "possible";
  return "unlikely";
}

const SIMON_RESULT_META: Record<SimonResult, { label: string; sub: string; color: string; bg: string; border: string }> = {
  definite: { label: "Definite FH",  sub: "High likelihood of Familial Hypercholesterolaemia", color: "#DC2626", bg: "rgba(220,38,38,0.06)",  border: "rgba(220,38,38,0.25)" },
  possible: { label: "Possible FH",  sub: "Cannot be excluded — further evaluation recommended",  color: "#D97706", bg: "rgba(217,119,6,0.06)",   border: "rgba(217,119,6,0.25)"  },
  unlikely: { label: "FH Unlikely",  sub: "Cholesterol criteria met but no supporting features",  color: "#6B7280", bg: "rgba(107,114,128,0.06)", border: "rgba(107,114,128,0.2)" },
};

function SimonBroomeTab() {
  const [ldl, setLdl] = useState("");
  const [tc,  setTc]  = useState("");
  const [xanthomaPatient,  setXanthomaPatient]  = useState(false);
  const [xanthomaRelative, setXanthomaRelative] = useState(false);
  const [dnaMutation,      setDnaMutation]      = useState(false);
  const [famPrematureMI,   setFamPrematureMI]   = useState(false);
  const [famRaisedTC,      setFamRaisedTC]      = useState(false);

  const ldlN = parseFloat(ldl);
  const tcN  = parseFloat(tc);

  const hasInput = (ldl && !isNaN(ldlN) && ldlN > 0) || (tc && !isNaN(tcN) && tcN > 0);
  const result = hasInput
    ? simonClassify(ldlN || 0, tcN || 0, xanthomaPatient, xanthomaRelative, dnaMutation, famPrematureMI, famRaisedTC)
    : null;
  const meta = result ? SIMON_RESULT_META[result] : null;

  function reset() {
    setLdl(""); setTc("");
    setXanthomaPatient(false); setXanthomaRelative(false);
    setDnaMutation(false); setFamPrematureMI(false); setFamRaisedTC(false);
  }

  return (
    <div className="space-y-4">
      <div className="px-4 py-3 rounded-xl flex gap-3" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
        <Info className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#2563EB" }} />
        <p className="text-[11px] leading-relaxed" style={{ color: "#3B82F6" }}>
          Enter at least one cholesterol value, then tick any relevant clinical findings. A result appears automatically.
        </p>
      </div>

      {/* Cholesterol */}
      <div style={CARD}>
        <div className="px-4 py-3" style={{ borderBottom: `1px solid ${DIVIDER}` }}>
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>Cholesterol — enter at least one</p>
        </div>
        <div className="px-4 py-4 grid grid-cols-2 gap-3">
          <NumInput label="LDL-C"            value={ldl} onChange={setLdl} unit="mmol/L" placeholder="e.g. 5.2" hint="FH threshold: ≥4.9" />
          <NumInput label="Total Cholesterol" value={tc}  onChange={setTc}  unit="mmol/L" placeholder="e.g. 8.0" hint="FH threshold: ≥7.5" />
        </div>
      </div>

      {/* Physical / genetic */}
      <div style={CARD}>
        <div className="px-4 py-3" style={{ borderBottom: `1px solid ${DIVIDER}` }}>
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>Clinical &amp; Genetic Features</p>
        </div>
        <div className="px-4 py-4 space-y-2.5">
          <SectionHeading>Definite FH indicators</SectionHeading>
          <CheckRow
            label="Tendon xanthomata in patient"
            sublabel="Cholesterol deposits on tendons (typically Achilles or hand extensors)"
            checked={xanthomaPatient} onChange={setXanthomaPatient}
          />
          <CheckRow
            label="Tendon xanthomata in 1st or 2nd degree relative"
            checked={xanthomaRelative} onChange={setXanthomaRelative}
          />
          <CheckRow
            label="Positive DNA mutation (LDLR / APOB / PCSK9)"
            sublabel="Confirmed pathogenic variant on genetic testing"
            checked={dnaMutation} onChange={setDnaMutation}
          />
          <div className="pt-1">
            <SectionHeading>Possible FH indicators</SectionHeading>
          </div>
          <CheckRow
            label="Family history of premature heart disease"
            sublabel="MI in 1st degree relative <60 yrs, or 2nd degree relative <50 yrs"
            checked={famPrematureMI} onChange={setFamPrematureMI}
          />
          <CheckRow
            label="Family history of raised cholesterol"
            sublabel="TC >7.5 mmol/L in 1st or 2nd degree relative"
            checked={famRaisedTC} onChange={setFamRaisedTC}
          />
        </div>
      </div>

      {/* Result */}
      {meta && (
        <div className="rounded-2xl p-5" style={{ background: meta.bg, border: `1.5px solid ${meta.border}` }}>
          <p className="text-xl font-bold" style={{ color: meta.color }}>{meta.label}</p>
          <p className="text-[12px] mt-1" style={{ color: meta.color, opacity: 0.85 }}>{meta.sub}</p>
          {result === "definite" && (
            <p className="text-[11px] mt-3 leading-relaxed" style={{ color: "#6B7280" }}>
              Meets Simon Broome <strong>Definite FH</strong> criteria. Referral to a lipid specialist and consideration of statin therapy is strongly recommended.
            </p>
          )}
          {result === "possible" && (
            <p className="text-[11px] mt-3 leading-relaxed" style={{ color: "#6B7280" }}>
              Meets Simon Broome <strong>Possible FH</strong> criteria. Further clinical assessment, cascade testing, and discussion with a clinician is recommended.
            </p>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={reset} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
          style={{ background: "#F3F4F6", color: "#6B7280", border: "1px solid #E5E7EB" }}>
          <RotateCcw className="w-3 h-3" /> Reset
        </button>
      </div>
    </div>
  );
}

// ─── Dutch Lipid Clinic Network ───────────────────────────────────────────────

type DutchResult = "definite" | "probable" | "possible" | "unlikely";

function dutchClassify(score: number): DutchResult {
  if (score > 8) return "definite";
  if (score >= 6) return "probable";
  if (score >= 3) return "possible";
  return "unlikely";
}

const DUTCH_RESULT_META: Record<DutchResult, { label: string; sub: string; color: string; bg: string; border: string }> = {
  definite: { label: "Definite FH",  sub: "Score >8 — highly consistent with FH",              color: "#DC2626", bg: "rgba(220,38,38,0.06)",  border: "rgba(220,38,38,0.25)"  },
  probable: { label: "Probable FH",  sub: "Score 6–8 — likely FH",                             color: "#EA580C", bg: "rgba(234,88,12,0.06)",   border: "rgba(234,88,12,0.25)"  },
  possible: { label: "Possible FH",  sub: "Score 3–5 — cannot be excluded",                    color: "#D97706", bg: "rgba(217,119,6,0.06)",   border: "rgba(217,119,6,0.25)"  },
  unlikely: { label: "FH Unlikely",  sub: "Score <3 — low likelihood of familial origin",       color: "#16A34A", bg: "rgba(22,163,74,0.06)",   border: "rgba(22,163,74,0.25)"  },
};

function DutchCriteriaTab() {
  const [ldl, setLdl] = useState("");

  // Family history: only highest-scoring option applies
  const [famHistory,    setFamHistory]    = useState<string>("none");
  // Clinical history: only highest-scoring option applies
  const [clinHistory,   setClinHistory]   = useState<string>("none");
  // Physical exam: only highest-scoring option applies
  const [physExam,      setPhysExam]      = useState<string>("none");
  // DNA analysis
  const [dna,           setDna]           = useState<string>("none");

  const ldlN = parseFloat(ldl);
  const ldlScore = (() => {
    if (!ldl || isNaN(ldlN) || ldlN <= 0) return 0;
    if (ldlN >= 8.5) return 8;
    if (ldlN >= 6.5) return 5;
    if (ldlN >= 5.0) return 3;
    if (ldlN >= 4.0) return 1;
    return 0;
  })();

  const famScore  = famHistory  === "xanthoma-relative" ? 2 : famHistory  === "ldl-child"   ? 2 : famHistory  === "premature-cvd" ? 1 : famHistory  === "ldl-relative" ? 1 : 0;
  const clinScore = clinHistory === "premature-cad"     ? 2 : clinHistory === "premature-pvd"? 1 : 0;
  const physScore = physExam    === "xanthoma"          ? 6 : physExam    === "corneal-arcus"? 4 : 0;
  const dnaScore  = dna         === "mutation"          ? 8 : 0;

  const total = famScore + clinScore + physScore + ldlScore + dnaScore;
  const hasAnyInput = ldl || famHistory !== "none" || clinHistory !== "none" || physExam !== "none" || dna !== "none";

  const result = hasAnyInput ? dutchClassify(total) : null;
  const meta   = result ? DUTCH_RESULT_META[result] : null;

  const gaugePercent = Math.min(100, (total / 12) * 100);

  function reset() {
    setLdl(""); setFamHistory("none"); setClinHistory("none"); setPhysExam("none"); setDna("none");
  }

  const FAM_OPTIONS = [
    { id: "none",             label: "None of the below",                                        sublabel: undefined,                                                    pts: 0 },
    { id: "premature-cvd",    label: "1st-degree relative with premature CVD",                   sublabel: "Coronary or vascular disease <55 (male) / <60 (female)",     pts: 1 },
    { id: "ldl-relative",     label: "1st-degree relative with LDL-C >95th percentile",          sublabel: undefined,                                                    pts: 1 },
    { id: "xanthoma-relative",label: "1st-degree relative with tendon xanthomata / corneal arcus",sublabel: undefined,                                                    pts: 2 },
    { id: "ldl-child",        label: "Child <18 with LDL-C >95th percentile",                    sublabel: undefined,                                                    pts: 2 },
  ];
  const CLIN_OPTIONS = [
    { id: "none",         label: "None of the below",                              sublabel: undefined,                         pts: 0 },
    { id: "premature-pvd",label: "Premature cerebral / peripheral vascular disease", sublabel: undefined,                         pts: 1 },
    { id: "premature-cad",label: "Premature coronary artery disease (CAD)",          sublabel: "<55 male / <60 female",           pts: 2 },
  ];
  const PHYS_OPTIONS = [
    { id: "none",         label: "None of the below",   sublabel: undefined,                      pts: 0 },
    { id: "corneal-arcus",label: "Corneal arcus <45 yrs", sublabel: undefined,                    pts: 4 },
    { id: "xanthoma",     label: "Tendon xanthomata",    sublabel: "Achilles or dorsal hand",      pts: 6 },
  ];
  const DNA_OPTIONS = [
    { id: "none",    label: "No mutation / not tested", sublabel: undefined, pts: 0 },
    { id: "mutation",label: "Pathogenic mutation found", sublabel: "LDLR, APOB, PCSK9, or LDLRAP1", pts: 8 },
  ];

  return (
    <div className="space-y-4">
      <div className="px-4 py-3 rounded-xl flex gap-3" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
        <Info className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#2563EB" }} />
        <p className="text-[11px] leading-relaxed" style={{ color: "#3B82F6" }}>
          Select the <strong>highest-scoring option that applies</strong> in each domain. Points accumulate across all five domains.
        </p>
      </div>

      {/* LDL-C */}
      <div style={CARD}>
        <div className="px-4 py-3" style={{ borderBottom: `1px solid ${DIVIDER}` }}>
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>LDL Cholesterol</p>
        </div>
        <div className="px-4 py-4">
          <NumInput label="LDL-C" value={ldl} onChange={setLdl} unit="mmol/L" placeholder="e.g. 5.5"
            hint={ldlScore > 0 ? `→ ${ldlScore} point${ldlScore !== 1 ? "s" : ""}` : "Enter your LDL result"} />
        </div>
      </div>

      {/* Family history */}
      <div style={CARD}>
        <div className="px-4 py-3" style={{ borderBottom: `1px solid ${DIVIDER}` }}>
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>Family History <span style={{ color: "#D1D5DB" }}>— pick highest that applies</span></p>
        </div>
        <div className="px-4 py-4 space-y-2">
          {FAM_OPTIONS.map(o => (
            <RadioRow key={o.id} label={o.label} sublabel={o.sublabel} points={o.pts}
              selected={famHistory === o.id} onSelect={() => setFamHistory(o.id)} />
          ))}
        </div>
      </div>

      {/* Clinical history */}
      <div style={CARD}>
        <div className="px-4 py-3" style={{ borderBottom: `1px solid ${DIVIDER}` }}>
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>Clinical History <span style={{ color: "#D1D5DB" }}>— pick highest that applies</span></p>
        </div>
        <div className="px-4 py-4 space-y-2">
          {CLIN_OPTIONS.map(o => (
            <RadioRow key={o.id} label={o.label} sublabel={o.sublabel} points={o.pts}
              selected={clinHistory === o.id} onSelect={() => setClinHistory(o.id)} />
          ))}
        </div>
      </div>

      {/* Physical exam */}
      <div style={CARD}>
        <div className="px-4 py-3" style={{ borderBottom: `1px solid ${DIVIDER}` }}>
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>Physical Examination <span style={{ color: "#D1D5DB" }}>— pick highest that applies</span></p>
        </div>
        <div className="px-4 py-4 space-y-2">
          {PHYS_OPTIONS.map(o => (
            <RadioRow key={o.id} label={o.label} sublabel={o.sublabel} points={o.pts}
              selected={physExam === o.id} onSelect={() => setPhysExam(o.id)} />
          ))}
        </div>
      </div>

      {/* DNA */}
      <div style={CARD}>
        <div className="px-4 py-3" style={{ borderBottom: `1px solid ${DIVIDER}` }}>
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>DNA Analysis</p>
        </div>
        <div className="px-4 py-4 space-y-2">
          {DNA_OPTIONS.map(o => (
            <RadioRow key={o.id} label={o.label} sublabel={o.sublabel} points={o.pts}
              selected={dna === o.id} onSelect={() => setDna(o.id)} />
          ))}
        </div>
      </div>

      {/* Running score */}
      {hasAnyInput && (
        <div style={{ ...CARD }}>
          <div className="px-4 py-3" style={{ borderBottom: `1px solid ${DIVIDER}` }}>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>Score Breakdown</p>
          </div>
          <div className="px-4 py-3 space-y-1.5">
            {[
              { label: "Family history",    pts: famScore  },
              { label: "Clinical history",  pts: clinScore },
              { label: "Physical exam",     pts: physScore },
              { label: "LDL Cholesterol",   pts: ldlScore  },
              { label: "DNA analysis",      pts: dnaScore  },
            ].map(({ label, pts }) => (
              <div key={label} className="flex items-center justify-between py-1.5" style={{ borderBottom: `1px solid ${DIVIDER}` }}>
                <span className="text-[12px]" style={{ color: "#6B7280" }}>{label}</span>
                <span className="text-[13px] font-bold" style={{ color: pts > 0 ? "#2563EB" : "#D1D5DB" }}>{pts > 0 ? `+${pts}` : "—"}</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2">
              <span className="text-[12px] font-bold" style={{ color: "#374151" }}>Total Score</span>
              <span className="text-lg font-bold" style={{ color: meta ? meta.color : "#374151" }}>{total}</span>
            </div>
          </div>
        </div>
      )}

      {/* Result */}
      {meta && (
        <div className="rounded-2xl p-5 space-y-3" style={{ background: meta.bg, border: `1.5px solid ${meta.border}` }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold" style={{ color: meta.color }}>{total}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider mt-0.5" style={{ color: meta.color }}>DLCN Score</p>
            </div>
            <div className="text-right">
              <p className="text-base font-bold" style={{ color: meta.color }}>{meta.label}</p>
              <p className="text-[11px] mt-0.5" style={{ color: meta.color, opacity: 0.8 }}>{meta.sub}</p>
            </div>
          </div>
          <div>
            <div className="relative h-3 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.06)" }}>
              <div className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                style={{ width: `${gaugePercent}%`, background: meta.color }} />
              <div className="absolute top-0 bottom-0 w-[0.5px]" style={{ left: "25%",   background: "rgba(0,0,0,0.2)" }} />
              <div className="absolute top-0 bottom-0 w-[0.5px]" style={{ left: "50%",   background: "rgba(0,0,0,0.2)" }} />
              <div className="absolute top-0 bottom-0 w-[0.5px]" style={{ left: "66.7%", background: "rgba(0,0,0,0.2)" }} />
            </div>
            <div className="flex justify-between mt-1 text-[10px] font-semibold" style={{ color: "rgba(0,0,0,0.4)" }}>
              <span>0</span><span>3</span><span>6</span><span>8</span><span>12+</span>
            </div>
          </div>
        </div>
      )}

      {/* Reference table */}
      <div style={CARD}>
        <div className="px-4 py-3" style={{ borderBottom: `1px solid ${DIVIDER}` }}>
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>DLCN Score Reference</p>
        </div>
        <div className="divide-y divide-gray-50">
          {[
            { range: ">8",    label: "Definite FH",  color: "#DC2626" },
            { range: "6–8",   label: "Probable FH",  color: "#EA580C" },
            { range: "3–5",   label: "Possible FH",  color: "#D97706" },
            { range: "<3",    label: "FH Unlikely",  color: "#16A34A" },
          ].map(({ range, label, color }) => (
            <div key={range} className="flex items-center gap-3 px-4 py-3">
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
              <span className="text-sm font-bold font-mono w-10" style={{ color }}>{range}</span>
              <span className="text-[12px] font-semibold" style={{ color: "#374151" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={reset} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
          style={{ background: "#F3F4F6", color: "#6B7280", border: "1px solid #E5E7EB" }}>
          <RotateCcw className="w-3 h-3" /> Reset
        </button>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function FHRiskContent() {
  const [mode, setMode] = useState<"simon" | "dutch">("simon");

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Heart className="w-4 h-4" style={{ color: "#DC2626" }} />
          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>Inherited Risk</p>
        </div>
        <h2 className="text-xl font-bold" style={{ color: "#111827" }}>Familial Hypercholesterolaemia</h2>
        <p className="text-[12px] mt-1 leading-relaxed" style={{ color: "#6B7280" }}>
          Assess your risk of inherited high cholesterol (FH) using evidence-based clinical criteria.
          Requires your blood test cholesterol results and family history.
        </p>
      </div>

      {/* Criteria toggle */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "#F3F4F6", border: "1px solid #E5E7EB" }}>
        {([
          { id: "simon" as const, label: "Simon Broome", sub: "UK diagnostic" },
          { id: "dutch" as const, label: "Dutch Criteria", sub: "DLCN scoring" },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setMode(tab.id)}
            className="flex-1 py-2 px-3 rounded-lg text-left transition-all"
            style={{
              background: mode === tab.id ? "#fff" : "transparent",
              boxShadow: mode === tab.id ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            }}
          >
            <p className="text-xs font-bold" style={{ color: mode === tab.id ? "#111827" : "#9CA3AF" }}>{tab.label}</p>
            <p className="text-[10px]" style={{ color: mode === tab.id ? "#6B7280" : "#C4C9D4" }}>{tab.sub}</p>
          </button>
        ))}
      </div>

      {mode === "simon" ? <SimonBroomeTab /> : <DutchCriteriaTab />}

      <p className="text-[11px] text-center leading-relaxed" style={{ color: "#9CA3AF" }}>
        For educational use only. This tool does not constitute medical advice.
        Always discuss cholesterol results and family history with a qualified clinician.
      </p>
    </div>
  );
}
