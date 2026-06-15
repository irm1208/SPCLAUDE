import React, { useState, useMemo } from "react";
import { PageLayout } from "@/components/PageLayout";
import { Droplet, Syringe, FlaskConical, Info, RotateCcw } from "lucide-react";

// ─── Colours matching the screenshot ──────────────────────────────────────────
const C = {
  bg:          "#000E3D",
  glass:       "rgba(255,255,255,0.07)",
  glassBorder: "1px solid rgba(255,255,255,0.13)",
  glassHover:  "rgba(255,255,255,0.11)",
  accent:      "#2196F3",
  accentLight: "rgba(33,150,243,0.22)",
  accentBright:"#42A5F5",
  text:        "#ffffff",
  muted:       "rgba(255,255,255,0.6)",
  subtle:      "rgba(255,255,255,0.38)",
  inputBg:     "rgba(255,255,255,0.09)",
  inputBorder: "1px solid rgba(255,255,255,0.18)",
  resultBg:    "rgba(33,150,243,0.15)",
  resultBorder:"1px solid rgba(33,150,243,0.4)",
  warnBg:      "rgba(251,191,36,0.12)",
  warnBorder:  "1px solid rgba(251,191,36,0.35)",
};

// ─── Types ────────────────────────────────────────────────────────────────────
type Mode = "hgh" | "hcg";
type SyringeType = "U100" | "U40";

// ─── Slider component ─────────────────────────────────────────────────────────
function Slider({
  label, value, min, max, step, unit, onChange, note,
}: {
  label: string; value: number; min: number; max: number; step: number;
  unit: string; onChange: (v: number) => void; note?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest leading-tight" style={{ color: C.muted }}>{label}</span>
        <div className="flex items-baseline gap-1 shrink-0">
          <span className="text-xl sm:text-2xl font-black" style={{ color: C.text }}>{value % 1 === 0 ? value : value.toFixed(step < 0.1 ? 2 : 1)}</span>
          <span className="text-xs font-bold" style={{ color: C.muted }}>{unit}</span>
        </div>
      </div>
      <div className="relative h-3">
        <div className="absolute inset-0 rounded-full" style={{ background: "rgba(255,255,255,0.12)" }} />
        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${C.accent}, ${C.accentBright})` }} />
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          style={{ zIndex: 2 }}
        />
        <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full shadow-lg pointer-events-none"
          style={{ left: `calc(${pct}% - 8px)`, background: "#fff", boxShadow: `0 0 0 3px ${C.accent}` }} />
      </div>
      <div className="flex justify-between text-[10px]" style={{ color: C.subtle }}>
        <span>{min} {unit}</span>
        {note && <span className="hidden sm:inline truncate mx-1 text-center">{note}</span>}
        <span>{max} {unit}</span>
      </div>
    </div>
  );
}

// ─── Number input ──────────────────────────────────────────────────────────────
function NumInput({
  label, value, onChange, unit, min, step, note,
}: {
  label: string; value: string; onChange: (v: string) => void;
  unit: string; min?: number; step?: number; note?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: C.muted }}>{label}</label>
      <div className="flex items-center gap-2 px-3 h-11 rounded-xl" style={{ background: C.inputBg, border: C.inputBorder }}>
        <input
          type="number" value={value} min={min ?? 0} step={step ?? 1}
          onChange={e => onChange(e.target.value)}
          className="flex-1 bg-transparent text-sm font-bold outline-none"
          style={{ color: C.text }}
          placeholder="0"
        />
        <span className="text-xs font-bold shrink-0" style={{ color: C.muted }}>{unit}</span>
      </div>
      {note && <p className="text-[10px]" style={{ color: C.subtle }}>{note}</p>}
    </div>
  );
}

// ─── Result metric card ───────────────────────────────────────────────────────
function Metric({
  label, value, unit, sub, warn, compact,
}: {
  label: string; value: string; unit: string; sub?: string; warn?: boolean; compact?: boolean;
}) {
  return (
    <div className={compact ? "rounded-xl p-2 space-y-0.5" : "rounded-xl sm:rounded-2xl p-3 sm:p-4 space-y-0.5"}
      style={{ background: warn ? C.warnBg : C.resultBg, border: warn ? C.warnBorder : C.resultBorder }}>
      <p className={`font-bold uppercase tracking-widest leading-tight ${compact ? "text-[8px]" : "text-[9px] sm:text-[10px]"}`}
        style={{ color: warn ? "#fbbf24" : C.accentBright }}>{label}</p>
      <div className="flex items-baseline gap-0.5 flex-wrap">
        <span className={`font-black tracking-tight ${compact ? "text-lg" : "text-2xl sm:text-3xl"}`} style={{ color: C.text }}>{value}</span>
        <span className={`font-bold ${compact ? "text-[10px]" : "text-xs sm:text-sm"}`} style={{ color: C.muted }}>{unit}</span>
      </div>
      {sub && <p className={compact ? "text-[8px]" : "text-[9px] sm:text-[10px]"} style={{ color: C.muted }}>{sub}</p>}
    </div>
  );
}

// ─── Insulin syringe visualiser ───────────────────────────────────────────────
function SyringeViz({ marks, maxUnits }: { fillPct: number; marks: number; maxUnits: number }) {
  const safeMarks = Math.min(Math.max(marks, 0), maxUnits);
  const pct = safeMarks / maxUnits;

  // Canvas — extra height at top so tick labels sit inside the viewBox
  const W = 320; const H = 108; const cy = 72;

  // Layout (left → right)
  const capX    = 0;   const capW = 36; const capH = 18;
  const needleX = capX + capW;
  const needleW = 26;
  const hubX    = needleX + needleW; const hubW = 10; const hubH = 12;
  const barX    = hubX + hubW;
  const barW    = 196; const barH = 20; const barR  = 3;
  const wingX   = barX + barW; const wingW = 8; const wingH = 34;
  const rodX    = wingX + wingW;
  const rodW    = 26; const rodH = 5;
  const thumbX  = rodX + rodW; const thumbR = 11;

  // Plunger rubber seal sits at the fill position inside the barrel
  const sealW   = 10;
  const sealX   = barX + pct * (barW - sealW);

  // Major tick interval: every 10 units; minor every 5
  const majorStep = 10;
  const minorStep = 5;
  const totalTicks = maxUnits / minorStep;

  return (
    <div className="flex flex-col items-center gap-3 py-2 w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full"
        style={{ filter: "drop-shadow(0 4px 20px rgba(33,150,243,0.30))" }}>
        <defs>
          <linearGradient id="sBarrelGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.18)" />
            <stop offset="45%"  stopColor="rgba(255,255,255,0.06)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.12)" />
          </linearGradient>
          <linearGradient id="sFillGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%"   stopColor={C.accentBright} stopOpacity={0.92} />
            <stop offset="100%" stopColor={C.accent}       stopOpacity={0.70} />
          </linearGradient>
          <linearGradient id="sCapGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%"   stopColor="rgba(96,165,250,0.55)" />
            <stop offset="100%" stopColor="rgba(37,99,235,0.45)" />
          </linearGradient>
          <clipPath id="sBarClip">
            <rect x={barX} y={cy - barH / 2} width={barW} height={barH} rx={barR} />
          </clipPath>
        </defs>

        {/* ── Needle cap (teal/blue, left) ── */}
        <path d={`M${capX},${cy - capH / 2} L${capX + capW - 6},${cy - capH / 2} L${capX + capW},${cy - 4} L${capX + capW},${cy + 4} L${capX + capW - 6},${cy + capH / 2} L${capX},${cy + capH / 2} Z`}
          fill="url(#sCapGrad)" stroke="rgba(96,165,250,0.5)" strokeWidth={1} />
        {/* cap highlight */}
        <rect x={capX + 3} y={cy - capH / 2 + 3} width={capW - 12} height={3} rx={1.5}
          fill="rgba(255,255,255,0.22)" />

        {/* ── Needle (thin silver line) ── */}
        <line x1={capX + capW} y1={cy} x2={needleX + needleW} y2={cy}
          stroke="rgba(200,220,240,0.8)" strokeWidth={2} />

        {/* ── Needle hub ── */}
        <rect x={hubX} y={cy - hubH / 2} width={hubW} height={hubH} rx={2}
          fill="rgba(160,185,210,0.45)" stroke="rgba(255,255,255,0.30)" strokeWidth={1} />

        {/* ── Barrel (clear glass look) ── */}
        <rect x={barX} y={cy - barH / 2} width={barW} height={barH} rx={barR}
          fill="url(#sBarrelGrad)" stroke="rgba(255,255,255,0.25)" strokeWidth={1.2} />

        {/* liquid fill — clipped to barrel */}
        <g clipPath="url(#sBarClip)">
          <rect x={barX} y={cy - barH / 2} width={pct * barW} height={barH}
            fill="url(#sFillGrad)" />
          {/* shimmer */}
          {pct > 0.05 && (
            <rect x={barX + 3} y={cy - barH / 2 + 3} width={Math.min(pct * barW - 6, 5)} height={barH - 6} rx={2}
              fill="rgba(255,255,255,0.22)" />
          )}
        </g>

        {/* ── Graduation ticks + labels (above barrel) ── */}
        {Array.from({ length: totalTicks + 1 }, (_, i) => {
          const unitVal  = i * minorStep;
          const tx       = barX + (unitVal / maxUnits) * barW;
          const isMajor  = unitVal % majorStep === 0;
          const tickH    = isMajor ? 9 : 5;
          return (
            <g key={i}>
              <line x1={tx} y1={cy - barH / 2} x2={tx} y2={cy - barH / 2 - tickH}
                stroke={isMajor ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.28)"}
                strokeWidth={isMajor ? 1 : 0.7} />
              {isMajor && unitVal > 0 && (
                <text x={tx} y={cy - barH / 2 - 11} textAnchor="middle"
                  fontSize={7} fill="rgba(255,255,255,0.55)" fontFamily="monospace">
                  {unitVal}
                </text>
              )}
            </g>
          );
        })}

        {/* ── Plunger rubber seal ── */}
        <rect x={sealX} y={cy - barH / 2 + 1} width={sealW} height={barH - 2} rx={2}
          fill="rgba(200,50,50,0.75)" stroke="rgba(255,120,120,0.5)" strokeWidth={1} />

        {/* ── Finger wings ── */}
        <rect x={wingX} y={cy - wingH / 2} width={wingW} height={wingH} rx={2}
          fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.22)" strokeWidth={1} />

        {/* ── Plunger rod ── */}
        <rect x={rodX} y={cy - rodH / 2} width={rodW} height={rodH} rx={2}
          fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.20)" strokeWidth={1} />
        {/* rod centre rib */}
        <line x1={rodX + 4} y1={cy} x2={rodX + rodW - 4} y2={cy}
          stroke="rgba(255,255,255,0.15)" strokeWidth={1} />

        {/* ── Thumb press (circle) ── */}
        <circle cx={thumbX + thumbR} cy={cy} r={thumbR}
          fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.28)" strokeWidth={1.2} />
        <circle cx={thumbX + thumbR} cy={cy} r={thumbR - 4}
          fill="rgba(255,255,255,0.06)" />

        {/* ── Draw marker line at current position ── */}
        {safeMarks > 0 && (
          <line x1={sealX + sealW / 2} y1={cy - barH / 2 - 2}
                x2={sealX + sealW / 2} y2={cy + barH / 2 + 2}
            stroke={C.accentBright} strokeWidth={1.5} strokeDasharray="2 2" />
        )}
      </svg>

      <p className="text-[11px] font-bold" style={{ color: C.muted }}>
        Draw to <span style={{ color: C.accentBright }}>
          {safeMarks > 0 ? safeMarks.toFixed(1) : "—"} unit mark
        </span> on the syringe
      </p>
    </div>
  );
}

// ─── HGH Calculator ───────────────────────────────────────────────────────────
function HghCalc() {
  const [vialIU, setVialIU] = useState(10);
  const [waterMl, setWaterMl] = useState(1);
  const [doseIU, setDoseIU] = useState(2);
  const [syringe, setSyringe] = useState<SyringeType>("U100");

  const calc = useMemo(() => {
    if (vialIU <= 0 || waterMl <= 0 || doseIU <= 0) return null;
    const concIUperMl = vialIU / waterMl;
    const volumeMl = doseIU / concIUperMl;
    const syringeUnits = syringe === "U100" ? 100 : 40;
    const marks = volumeMl * syringeUnits;
    return { concIUperMl, volumeMl, marks };
  }, [vialIU, waterMl, doseIU, syringe]);

  const fillPct = calc ? Math.min(calc.volumeMl / waterMl, 1) : 0;
  const doseExceedsVial = doseIU > vialIU;

  const maxUnits = syringe === "U100" ? 100 : 40;

  return (
    <div className="space-y-4">
      {doseExceedsVial && (
        <div className="rounded-2xl p-3 flex items-start gap-2.5" style={{ background: C.warnBg, border: C.warnBorder }}>
          <Info className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#fbbf24" }} />
          <p className="text-xs" style={{ color: "#fbbf24" }}>Dose exceeds vial size — reduce your dose or check your vial potency.</p>
        </div>
      )}

      {/* Sliders + syringe in one card side by side */}
      <div className="rounded-2xl p-3 sm:p-5" style={{ background: C.glass, border: C.glassBorder }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">

          {/* Left: sliders */}
          <div className="space-y-4 sm:space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center" style={{ background: C.accentLight }}>
                <FlaskConical className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: C.accentBright }} />
              </div>
              <span className="text-sm font-bold" style={{ color: C.text }}>Vial Setup</span>
            </div>
            <Slider label="Vial Potency" value={vialIU} min={4} max={36} step={1} unit="IU"
              onChange={setVialIU} note="Common: 10 IU, 12 IU, 24 IU, 36 IU" />
            <Slider label="Bacteriostatic Water" value={waterMl} min={0.5} max={5} step={0.5} unit="ml"
              onChange={setWaterMl} note="Lower volume = stronger concentration" />
            <div className="pt-1 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
              <Slider label="Desired Dose" value={doseIU} min={0.5} max={Math.min(vialIU, 12)} step={0.5} unit="IU"
                onChange={v => setDoseIU(Math.min(v, vialIU))} />
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: C.muted }}>Syringe Type</span>
              <div className="flex gap-2">
                {(["U100", "U40"] as SyringeType[]).map(s => (
                  <button key={s} onClick={() => setSyringe(s)}
                    className="flex-1 h-10 rounded-xl text-xs font-bold transition-all"
                    style={{
                      background: syringe === s ? C.accent : C.inputBg,
                      color: syringe === s ? "#fff" : C.muted,
                      border: syringe === s ? `1px solid ${C.accentBright}` : C.inputBorder,
                    }}>
                    {s} Insulin Syringe
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: live preview + result cards */}
          <div className="flex flex-col gap-3 rounded-xl py-3 px-3 self-start pl-[12px] pr-[12px] ml-[0px] mr-[0px] mt-[89px] mb-[89px]"
            style={{ background: C.glass, border: C.glassBorder }}>
            <div className="flex items-center gap-2">
              <Syringe className="w-3.5 h-3.5" style={{ color: C.accentBright }} />
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest" style={{ color: C.muted }}>Live Draw Preview</span>
            </div>
            {calc ? (
              <>
                <div className="max-w-[200px] sm:max-w-[240px] mx-auto w-full">
                  <SyringeViz fillPct={0} marks={calc.marks} maxUnits={maxUnits} />
                </div>
                <div className="grid grid-cols-3 gap-1.5 mt-1">
                  <Metric compact label="Concentration" value={calc.concIUperMl.toFixed(1)} unit="IU/ml"
                    sub={`${(1 / calc.concIUperMl * 1000).toFixed(1)} mcl/IU`} />
                  <Metric compact label="Volume" value={calc.volumeMl < 0.01 ? "<0.01" : calc.volumeMl.toFixed(3)} unit="ml" />
                  <Metric compact label={`Draw to`}
                    value={calc.marks < 0.1 ? "<0.1" : calc.marks.toFixed(1)} unit={syringe}
                    sub={`${syringe === "U100" ? 0.01 : 0.025} ml/unit`}
                    warn={calc.marks > maxUnits} />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 py-6 opacity-40" style={{ color: C.muted }}>
                <Syringe className="w-7 h-7" />
                <p className="text-[10px]">Adjust sliders to preview</p>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}

// ─── HCG Calculator ───────────────────────────────────────────────────────────
function HcgCalc() {
  const [vialIU, setVialIU] = useState(5000);
  const [waterMl, setWaterMl] = useState(2);
  const [doseIU, setDoseIU] = useState(500);
  const [syringe, setSyringe] = useState<SyringeType>("U100");

  const calc = useMemo(() => {
    if (vialIU <= 0 || waterMl <= 0 || doseIU <= 0) return null;
    const concIUperMl = vialIU / waterMl;
    const volumeMl = doseIU / concIUperMl;
    const syringeUnits = syringe === "U100" ? 100 : 40;
    const marks = volumeMl * syringeUnits;
    return { concIUperMl, volumeMl, marks };
  }, [vialIU, waterMl, doseIU, syringe]);

  const doseExceedsVial = doseIU > vialIU;
  const maxUnits = syringe === "U100" ? 100 : 40;

  return (
    <div className="space-y-4">
      {doseExceedsVial && (
        <div className="rounded-2xl p-3 flex items-start gap-2.5" style={{ background: C.warnBg, border: C.warnBorder }}>
          <Info className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#fbbf24" }} />
          <p className="text-xs" style={{ color: "#fbbf24" }}>Dose exceeds vial size — reduce your dose or check your vial potency.</p>
        </div>
      )}

      {/* Sliders + syringe in one card side by side */}
      <div className="rounded-2xl p-3 sm:p-5" style={{ background: C.glass, border: C.glassBorder }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">

          {/* Left: sliders */}
          <div className="space-y-4 sm:space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center" style={{ background: C.accentLight }}>
                <FlaskConical className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: C.accentBright }} />
              </div>
              <span className="text-sm font-bold" style={{ color: C.text }}>Vial Setup</span>
            </div>
            <Slider label="Vial Potency" value={vialIU} min={1000} max={10000} step={500} unit="IU"
              onChange={setVialIU} note="Common: 2000, 5000, 10000 IU" />
            <Slider label="Bacteriostatic Water" value={waterMl} min={0.5} max={10} step={0.5} unit="ml"
              onChange={setWaterMl} note="Lower volume = stronger concentration" />
            <div className="pt-1 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
              <Slider label="Desired Dose" value={doseIU} min={100} max={Math.min(vialIU, 5000)} step={100} unit="IU"
                onChange={v => setDoseIU(Math.min(v, vialIU))} />
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: C.muted }}>Syringe Type</span>
              <div className="flex gap-2">
                {(["U100", "U40"] as SyringeType[]).map(s => (
                  <button key={s} onClick={() => setSyringe(s)}
                    className="flex-1 h-10 rounded-xl text-xs font-bold transition-all"
                    style={{
                      background: syringe === s ? C.accent : C.inputBg,
                      color: syringe === s ? "#fff" : C.muted,
                      border: syringe === s ? `1px solid ${C.accentBright}` : C.inputBorder,
                    }}>
                    {s} Insulin Syringe
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: live preview + result cards */}
          <div className="flex flex-col gap-3 rounded-xl py-3 px-3 self-start"
            style={{ background: C.glass, border: C.glassBorder }}>
            <div className="flex items-center gap-2">
              <Syringe className="w-3.5 h-3.5" style={{ color: C.accentBright }} />
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest" style={{ color: C.muted }}>Live Draw Preview</span>
            </div>
            {calc ? (
              <>
                <div className="max-w-[200px] sm:max-w-[240px] mx-auto w-full">
                  <SyringeViz fillPct={0} marks={calc.marks} maxUnits={maxUnits} />
                </div>
                <div className="grid grid-cols-3 gap-1.5 mt-1">
                  <Metric compact label="Concentration" value={calc.concIUperMl.toFixed(0)} unit="IU/ml"
                    sub={`${(1000 / calc.concIUperMl).toFixed(2)} ml/1000`} />
                  <Metric compact label="Volume" value={calc.volumeMl < 0.001 ? "<0.001" : calc.volumeMl.toFixed(3)} unit="ml" />
                  <Metric compact label="Draw to"
                    value={calc.marks < 0.1 ? "<0.1" : calc.marks.toFixed(1)} unit={syringe}
                    sub={`${syringe === "U100" ? 0.01 : 0.025} ml/unit`}
                    warn={calc.marks > maxUnits} />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 py-6 opacity-40" style={{ color: C.muted }}>
                <Syringe className="w-7 h-7" />
                <p className="text-[10px]">Adjust sliders to preview</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* IU Calculator */}
      <HcgIUCalc doseIU={doseIU} concIUperMl={calc?.concIUperMl ?? null} syringe={syringe} />
    </div>
  );
}

// ─── HCG IU Calculator ────────────────────────────────────────────────────────
function HcgIUCalc({
  doseIU, concIUperMl, syringe,
}: { doseIU: number; concIUperMl: number | null; syringe: SyringeType }) {
  const rows = [100, 250, 500, 750, 1000, 1500, 2000, 2500, 3000, 5000];

  return (
    <div className="rounded-2xl p-3 sm:p-4 space-y-3" style={{ background: C.glass, border: C.glassBorder }}>
      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: C.muted }}>IU Calculator — HCG dose reference</p>

      {/* Current dose highlight */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl p-3 text-center" style={{ background: C.accentLight, border: `1px solid rgba(33,150,243,0.35)` }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: C.accentBright }}>Your dose</p>
          <p className="text-xl font-black" style={{ color: C.text }}>{doseIU}</p>
          <p className="text-[10px]" style={{ color: C.muted }}>IU</p>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: C.muted }}>Volume</p>
          <p className="text-xl font-black" style={{ color: C.text }}>
            {concIUperMl !== null ? (doseIU / concIUperMl).toFixed(3) : "—"}
          </p>
          <p className="text-[10px]" style={{ color: C.muted }}>ml</p>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: C.muted }}>Draw ({syringe})</p>
          <p className="text-xl font-black" style={{ color: C.text }}>
            {concIUperMl !== null
              ? ((doseIU / concIUperMl) * (syringe === "U100" ? 100 : 40)).toFixed(1)
              : "—"}
          </p>
          <p className="text-[10px]" style={{ color: C.muted }}>units</p>
        </div>
      </div>

      {/* Reference table */}
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-[10px] sm:text-[11px]" style={{ borderCollapse: "separate", borderSpacing: "0 3px" }}>
          <thead>
            <tr>
              {["IU", concIUperMl !== null ? `ml (${concIUperMl.toFixed(0)} IU/ml)` : "ml", `Draw (${syringe})`].map(h => (
                <th key={h} className="px-2 py-1 text-left font-bold uppercase tracking-widest"
                  style={{ color: C.subtle }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(iu => {
              const isActive = iu === doseIU;
              const rowMl   = concIUperMl ? iu / concIUperMl : null;
              const rowDraw = concIUperMl ? (iu / concIUperMl) * (syringe === "U100" ? 100 : 40) : null;
              return (
                <tr key={iu} style={{ background: isActive ? C.accentLight : "rgba(255,255,255,0.03)" }}>
                  <td className="px-2 py-1.5 rounded-l-lg font-black" style={{ color: isActive ? C.accentBright : C.text }}>{iu}</td>
                  <td className="px-2 py-1.5 font-semibold" style={{ color: isActive ? C.text : C.muted }}>
                    {rowMl !== null ? rowMl.toFixed(3) : "—"}
                  </td>
                  <td className="px-2 py-1.5 rounded-r-lg font-semibold" style={{ color: isActive ? C.accentBright : C.muted }}>
                    {rowDraw !== null ? `${rowDraw.toFixed(1)}u` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Reconstitution Content (used by unified Calculator hub) ──────────────────
export function ReconstitutionContent() {
  const [mode, setMode] = useState<Mode>("hgh");

  return (
    <div className="flex-1 flex flex-col w-full" style={{ background: C.bg }}>
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-4 sm:space-y-6">
      <p className="text-xs sm:text-sm" style={{ color: C.muted }}>
        Calculate exact concentration and syringe draw for HGH &amp; HCG vials. For research use only.
      </p>

      {/* Tab selector */}
      <div className="flex gap-1.5 p-1 rounded-2xl w-full sm:w-fit" style={{ background: "rgba(0,0,0,0.25)", border: C.glassBorder }}>
        {([
          { id: "hgh" as Mode, label: "HGH", sub: "Growth Hormone" },
          { id: "hcg" as Mode, label: "HCG", sub: "Gonadotropin" },
        ]).map(tab => (
          <button key={tab.id} onClick={() => setMode(tab.id)}
            className="flex-1 sm:flex-none px-4 sm:px-5 py-2 rounded-xl text-sm font-bold transition-all flex flex-col items-center"
            style={{
              background: mode === tab.id ? C.accent : "transparent",
              color:      mode === tab.id ? "#fff"   : C.muted,
              boxShadow:  mode === tab.id ? `0 4px 16px rgba(33,150,243,0.35)` : "none",
            }}>
            <span>{tab.label}</span>
            <span className="text-[9px] font-medium opacity-75">{tab.sub}</span>
          </button>
        ))}
      </div>

      {/* Calculator */}
      {mode === "hgh" ? <HghCalc /> : <HcgCalc />}

      {/* Disclaimer */}
      <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <Info className="w-4 h-4 mt-0.5 shrink-0" style={{ color: C.subtle }} />
        <p className="text-[11px] leading-relaxed" style={{ color: C.subtle }}>
          This calculator is for <strong style={{ color: C.muted }}>research use only</strong>. Always verify
          your vial label and confirm potency before use. Bacteriostatic water volumes affect shelf life —
          smaller volumes increase concentration but may reduce stability window. Consult a healthcare
          professional for medical guidance.
        </p>
      </div>
    </div>
    </div>
  );
}

export default function ReconstitutionCalculator() {
  return (
    <PageLayout active="calculator">
      <div className="flex-1 flex flex-col" style={{ background: C.bg }}>
        <ReconstitutionContent />
      </div>
    </PageLayout>
  );
}
