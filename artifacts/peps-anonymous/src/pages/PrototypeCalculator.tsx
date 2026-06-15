import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, RotateCcw, ShoppingCart, AlertTriangle, SplitSquareHorizontal, Minus, Plus, Zap } from "lucide-react";
import { PharmaPlot } from "@/components/PharmaPlot";
import { HALF_LIFE_DATA } from "@/data/halflife";
import { PageLayout } from "@/components/PageLayout";
import { SiteAnnouncements } from "@/components/SiteAnnouncements";
import { PROTOCOLS, type Protocol } from "@/data/protocols";
import { AddToOrderSheet } from "@/components/AddToOrderSheet";
import { matchProtocol } from "@/utils/protocol-match";
import { T } from "@/lib/theme";

const CAT_LABELS: Record<string, string> = {
  glp1: "GLP-1", healing: "Healing", gh: "GH Peptide", cognitive: "Cognitive", other: "Other",
  trt: "TRT", aas: "AAS", oral: "Oral Steroid", sarm: "SARM", ancillary: "Ancillary",
};

function shortFreq(f: string): string {
  const l = f.toLowerCase();
  if (l.includes("once daily") || l === "daily") return "Daily";
  if (l.includes("twice daily") || l.includes("2× daily") || l.includes("2x daily")) return "2× Daily";
  if (l.includes("3×") || l.includes("3x") || l.includes("three times")) return "3× Daily";
  if (l.includes("weekly")) return "Weekly";
  if (l.includes("daily")) return "Daily";
  return f.split(/[\n,]/)[0].trim().slice(0, 12);
}
function shortRoute(r: string): string {
  const l = r.toLowerCase();
  if (l.includes("subcutaneous")) return "Subcut.";
  if (l.includes("intranasal") || l.includes("nasal")) return "Intranasal";
  if (l.includes("oral")) return "Oral";
  if (l.includes("intramuscular") || l.includes("im")) return "IM";
  return r.split(/[\n,]/)[0].trim().slice(0, 12);
}
function shortStorage(s: string): string {
  const l = s.toLowerCase();
  if (l.includes("fridge") || l.includes("refrigerat")) return "Refrigerated";
  if (l.includes("room temp")) return "Room temp";
  if (l.includes("freeze") || l.includes("frozen")) return "Freezer";
  return s.split(/[\n,]/)[0].trim().slice(0, 14);
}
function shortDose(d: string): string {
  return d.split(/[\s(]/)[0].trim() + (d.includes("mg") ? " mg" : d.includes("mcg") ? " mcg" : d.includes("IU") ? " IU" : "");
}

function parseVialMg(vialStr: string): number[] {
  const nums = vialStr.match(/(\d+(?:\.\d+)?)\s*mg/g);
  if (!nums) return [10];
  return nums.map(s => parseFloat(s));
}
function parseWaterMl(reconStr: string): number {
  const m = reconStr.match(/^(\d+(?:\.\d+)?)\s*ml/);
  return m ? parseFloat(m[1]) : 2;
}

// Vial SVG icon — height scales with volume
function VialIcon({ volume, active }: { volume: number; active: boolean }) {
  const color = active ? "#2563EB" : "#94A3B8";
  // Scale body height based on volume
  const heights: Record<number, number> = { 1: 22, 2: 28, 3: 34, 5: 38, 10: 44, 20: 50 };
  const bodyH = heights[volume] ?? 34;
  const totalH = bodyH + 18;
  const bodyW = 18;
  const cx = 12;
  const bodyTop = 12;
  const bodyBottom = bodyTop + bodyH;

  return (
    <svg width="24" height={totalH + 4} viewBox={`0 0 24 ${totalH + 4}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Cap */}
      <rect x={cx - 4} y={2} width={8} height={5} rx={1.5} fill={color} opacity={0.7} />
      {/* Neck */}
      <rect x={cx - 3} y={7} width={6} height={4} rx={1} fill={color} opacity={0.5} />
      {/* Body outline */}
      <rect x={cx - bodyW / 2} y={bodyTop} width={bodyW} height={bodyH} rx={3} stroke={color} strokeWidth={1.8} fill={active ? "#EFF6FF" : "#F8FAFC"} />
      {/* Fill level indicator */}
      <rect x={cx - bodyW / 2 + 2} y={bodyTop + bodyH * 0.35} width={bodyW - 4} height={bodyH * 0.55} rx={2} fill={color} opacity={active ? 0.18 : 0.08} />
      {/* Graduations */}
      <line x1={cx + bodyW / 2 - 6} y1={bodyTop + bodyH * 0.25} x2={cx + bodyW / 2} y2={bodyTop + bodyH * 0.25} stroke={color} strokeWidth={1} opacity={0.4} />
      <line x1={cx + bodyW / 2 - 4} y1={bodyTop + bodyH * 0.5} x2={cx + bodyW / 2} y2={bodyTop + bodyH * 0.5} stroke={color} strokeWidth={1} opacity={0.4} />
      <line x1={cx + bodyW / 2 - 6} y1={bodyTop + bodyH * 0.75} x2={cx + bodyW / 2} y2={bodyTop + bodyH * 0.75} stroke={color} strokeWidth={1} opacity={0.4} />
    </svg>
  );
}

// Syringe icon for device selector
function SyringeIcon({ active }: { active: boolean }) {
  const c = active ? "#2563EB" : "#94A3B8";
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M13 3l2 2-1.5 1.5-2-2L13 3z" stroke={c} strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M11.5 4.5l-6 6 1 1 6-6-1-1z" stroke={c} strokeWidth="1.5"/>
      <path d="M5.5 10.5l-1.5 4 4-1.5" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8 9l1 1" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M9.5 7.5l1 1" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function PenIcon({ active }: { active: boolean }) {
  const c = active ? "#2563EB" : "#94A3B8";
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="8" y="2" width="4" height="12" rx="2" stroke={c} strokeWidth="1.5"/>
      <path d="M9 14h2l-1 4-1-4z" stroke={c} strokeWidth="1.2" strokeLinejoin="round"/>
      <circle cx="10" cy="6" r="1" fill={c} opacity="0.5"/>
    </svg>
  );
}

function SprayIcon({ active }: { active: boolean }) {
  const c = active ? "#2563EB" : "#94A3B8";
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="4" y="9" width="8" height="8" rx="2" stroke={c} strokeWidth="1.5"/>
      <path d="M12 13h2a1 1 0 001-1v-2a1 1 0 00-1-1H9" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M9 9V7a1 1 0 011-1h1" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="15" cy="5" r="1" fill={c}/>
      <circle cx="17" cy="7" r="1" fill={c} opacity="0.6"/>
      <circle cx="15" cy="9" r="1" fill={c} opacity="0.3"/>
    </svg>
  );
}

// Peptide amount presets
const PEPTIDE_PRESETS_ROW1 = [3, 5, 10, 15, 20, 25, 30];
const PEPTIDE_PRESETS_ROW2 = [40, 50, 60, 80, 100];
const PEPTIDE_PRESETS_MORE = [130, 150, 200, 250, 300, 400, 500];

// Vial volume presets (= BAC water added)
const VIAL_VOLUMES = [1, 2, 3, 5, 10, 20];

// Syringe / device presets
const SYRINGE_TYPES = [
  { label: "Insulin U-100 (1 ml)", unitsPerMl: 100, note: "Standard 100-unit syringe" },
  { label: "Insulin U-100 (0.5 ml)", unitsPerMl: 100, note: "Short barrel U-100" },
  { label: "Insulin U-50 (0.5 ml)", unitsPerMl: 50, note: "50-unit syringe" },
  { label: "Injection Pen (U-100)", unitsPerMl: 100, note: "Dial-a-dose pen device" },
];

type DeviceType = "syringe" | "pen" | "spray";
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

// Inline styles
const PAGE_BG = "#F9FAFB";
const CARD_STYLE: React.CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid #E5E7EB",
  borderRadius: 12,
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
};
const DIVIDER_COLOR = "#E5E7EB";
const ACCENT = "#2563EB";
const INPUT_STYLE: React.CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid #D1D5DB",
  borderRadius: 8,
  color: "#111827",
  outline: "none",
};

export default function PrototypeCalculator() {
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol | null>(null);
  const [protocolExpanded, setProtocolExpanded] = useState(false);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [hasActiveProducts, setHasActiveProducts] = useState(false);

  // btpepcalc-style state
  const [reconMode, setReconMode] = useState<"standard" | "reverse" | "blend">("standard");
  const [showMoreAmounts, setShowMoreAmounts] = useState(false);
  const [customAmountFocused, setCustomAmountFocused] = useState(false);

  // Reconstitution
  const [vialMg, setVialMg] = useState("");           // peptide mg content
  const [waterMl, setWaterMl] = useState("3");        // vial volume / BAC water
  const [customVialMg, setCustomVialMg] = useState(""); // custom mg input

  // Dose
  const [device, setDevice] = useState<DeviceType>("syringe");
  const [syringeIdx, setSyringeIdx] = useState(0);
  const [dose, setDose] = useState("");
  const [doseUnit, setDoseUnit] = useState<"mcg" | "mg" | "IU">("mcg");

  // Split dosing
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [dose1Days, setDose1Days] = useState<string[]>(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
  const [dose2Days, setDose2Days] = useState<string[]>(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);

  function toggleDay(days: string[], setDays: (d: string[]) => void, day: string) {
    setDays(days.includes(day) ? days.filter(d => d !== day) : [...days, day]);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const peptideParam = params.get("peptide");
    if (peptideParam) {
      const found = PROTOCOLS.find(
        p => p.slug === peptideParam || p.name.toLowerCase() === peptideParam.toLowerCase()
      ) ?? null;
      if (found) setSelectedProtocol(found);
    }
  }, []);

  useEffect(() => {
    if (!selectedProtocol) { setHasActiveProducts(false); return; }
    fetch("/api/products")
      .then(r => r.json())
      .then((data: { name: string; active?: boolean }[]) => {
        const matched = (Array.isArray(data) ? data : []).filter(pr => matchProtocol(pr.name, selectedProtocol) && pr.active !== false);
        setHasActiveProducts(matched.length > 0);
      })
      .catch(() => setHasActiveProducts(false));
  }, [selectedProtocol?.name]);

  // When protocol changes, auto-fill vial mg & water
  useEffect(() => {
    if (selectedProtocol) {
      const firstVial = parseVialMg(selectedProtocol.vial)[0];
      setVialMg(String(firstVial));
      const waterDefault = parseWaterMl(selectedProtocol.recon);
      setWaterMl(String(waterDefault));
      setCustomVialMg("");
      setProtocolExpanded(false);
    }
  }, [selectedProtocol]);

  // Effective peptide mg: prefer explicit custom input, then grid selection
  const effectiveVialMg = customAmountFocused && customVialMg
    ? parseFloat(customVialMg) || 0
    : parseFloat(vialMg) || 0;
  const waterMlNum = parseFloat(waterMl) || 0;
  const concentrationMgMl = waterMlNum > 0 && effectiveVialMg > 0 ? effectiveVialMg / waterMlNum : 0;
  const concentrationMcgMl = concentrationMgMl * 1000;
  const doseNum = parseFloat(dose) || 0;

  const doseMg = useMemo(() => {
    if (doseUnit === "mcg") return doseNum / 1000;
    if (doseUnit === "IU") return doseNum / 3;
    return doseNum;
  }, [doseNum, doseUnit]);

  const injectMl = concentrationMgMl > 0 ? doseMg / concentrationMgMl : 0;
  const injectUnits = injectMl * SYRINGE_TYPES[syringeIdx].unitsPerMl;
  const hasRecon = effectiveVialMg > 0 && waterMlNum > 0;
  const hasDose = doseNum > 0 && concentrationMgMl > 0;
  const peptideSelected = effectiveVialMg > 0;

  function reset() {
    setSelectedProtocol(null);
    setVialMg("");
    setWaterMl("3");
    setCustomVialMg("");
    setCustomAmountFocused(false);
    setDose("");
    setDoseUnit("mcg");
    setSyringeIdx(0);
    setDevice("syringe");
    setShowMoreAmounts(false);
    setReconMode("standard");
  }

  function adjustCustomAmount(delta: number) {
    const cur = parseFloat(customVialMg) || parseFloat(vialMg) || 0;
    const next = Math.max(1, Math.min(2000, cur + delta));
    setCustomVialMg(String(next));
    setCustomAmountFocused(true);
    setVialMg("");
  }

  const fmtMl = (n: number) => n < 0.001 ? "< 0.001" : n < 1 ? n.toFixed(3) : n.toFixed(2);
  const fmtUnits = (n: number) => n < 0.1 ? "< 0.1" : n.toFixed(1);
  const fmtConc = (n: number) => n % 1 === 0 ? String(n) : n.toFixed(n < 1 ? 3 : 2);

  // Select a preset amount
  function selectPreset(mg: number) {
    setVialMg(String(mg));
    setCustomVialMg("");
    setCustomAmountFocused(false);
  }

  const activePreset = !customAmountFocused ? parseFloat(vialMg) : null;

  return (
    <PageLayout>
      <div className="flex flex-col pb-8" style={{ background: PAGE_BG, minHeight: "100%" }}>
        <SiteAnnouncements />

        <main className="flex-1 px-4 pt-4 pb-4 max-w-2xl mx-auto w-full space-y-3">

          {/* ── Page header ── */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2.5">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M7 3h2v6L5 15h12l-4-6V3h2" stroke={ACCENT} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 3h8" stroke={ACCENT} strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              <h1 className="text-lg font-bold" style={{ color: "#111827" }}>Peptide Calculator</h1>
            </div>
            <button
              onClick={reset}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-gray-100"
              style={{ color: "#6B7280" }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>

          {/* ── Optional: Select Protocol ── */}
          <div style={{ ...CARD_STYLE }}>
            <div className="px-4 py-3" style={{ borderBottom: `1px solid ${DIVIDER_COLOR}` }}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold" style={{ color: "#374151" }}>Select Compound</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#F3F4F6", color: "#9CA3AF" }}>optional — auto-fills values</span>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="relative">
                <select
                  className="w-full h-11 pl-4 pr-10 rounded-lg text-sm appearance-none transition-all focus:ring-2 focus:ring-blue-100"
                  style={{ ...INPUT_STYLE, height: 44 }}
                  value={selectedProtocol?.name ?? ""}
                  onChange={e => {
                    const found = PROTOCOLS.find(p => p.name === e.target.value) ?? null;
                    setSelectedProtocol(found);
                  }}
                >
                  <option value="">— Choose a compound —</option>
                  {["glp1", "healing", "gh", "cognitive", "other", "trt", "aas", "oral", "sarm", "ancillary"].map(cat => {
                    const group = PROTOCOLS.filter(p => p.category === cat);
                    if (group.length === 0) return null;
                    const labels: Record<string, string> = { glp1: "GLP-1", healing: "Healing", gh: "GH Peptides", cognitive: "Cognitive", other: "Other", trt: "TRT", aas: "AAS", oral: "Oral Steroids", sarm: "SARMs", ancillary: "Ancillaries" };
                    return (
                      <optgroup key={cat} label={labels[cat]}>
                        {group.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                      </optgroup>
                    );
                  })}
                </select>
                <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 pointer-events-none" style={{ color: "#9CA3AF" }} />
              </div>

              {selectedProtocol && (() => {
                const p = selectedProtocol;
                const stats = [
                  { label: "Start Dose", value: shortDose(p.startDose) },
                  { label: "Frequency", value: shortFreq(p.frequency) },
                  { label: "Route", value: shortRoute(p.route) },
                  { label: "Storage", value: shortStorage(p.storage) },
                ];
                return (
                  <div className="rounded-xl overflow-hidden" style={{ background: "#F9FAFB", border: "1px solid #E5E7EB" }}>
                    <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${p.color} 0%, ${p.color}55 100%)` }} />
                    <div className="px-3.5 pt-3 pb-3">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold" style={{ color: "#111827" }}>{p.name}</p>
                            {hasActiveProducts && (
                              <button
                                type="button"
                                onClick={() => setShowAddSheet(true)}
                                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                                style={{ background: `${p.color}20`, color: p.color, border: `1px solid ${p.color}40` }}
                              >
                                <ShoppingCart className="w-2.5 h-2.5" />
                                Order
                              </button>
                            )}
                          </div>
                          <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>{p.tagline}</p>
                        </div>
                        <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border" style={{ background: `${p.color}10`, color: p.color, borderColor: `${p.color}30` }}>
                          {CAT_LABELS[p.category]}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {stats.map(s => (
                          <div key={s.label} className="rounded-lg py-1.5 px-1 text-center" style={{ background: "#FFFFFF", border: "1px solid #E5E7EB" }}>
                            <p className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: "#9CA3AF" }}>{s.label}</p>
                            <p className="text-[11px] font-bold leading-tight" style={{ color: "#374151" }}>{s.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="w-full flex items-center justify-between px-3.5 py-2 text-left"
                      style={{ borderTop: "1px solid #E5E7EB" }}
                      onClick={() => setProtocolExpanded(v => !v)}
                    >
                      <span className="text-xs font-semibold" style={{ color: "#6B7280" }}>{protocolExpanded ? "Hide protocol" : "Full protocol"}</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${protocolExpanded ? "rotate-180" : ""}`} style={{ color: "#9CA3AF" }} />
                    </button>
                    <AnimatePresence>
                      {protocolExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                          <div style={{ borderTop: "1px solid #E5E7EB" }}>
                            <div className="px-3.5 py-2.5">
                              <p className="text-sm leading-relaxed" style={{ color: "#4B5563" }}>{p.description}</p>
                            </div>
                            {[
                              { label: "Benefits", text: p.benefits, color: p.color },
                              { label: "Tips", text: p.tips, color: ACCENT },
                              { label: "Side Effects", text: p.sideEffects, color: "#DC2626" },
                              { label: "Watch Out For", text: p.watchOut, color: ACCENT },
                            ].map(s => (
                              <div key={s.label} className="px-3.5 py-2.5" style={{ borderTop: "1px solid #E5E7EB" }}>
                                <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: s.color }}>{s.label}</p>
                                <p className="text-xs leading-relaxed" style={{ color: "#4B5563" }}>{s.text}</p>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* ── Research Protocols Table ── */}
          {selectedProtocol?.researchProtocols && selectedProtocol.researchProtocols.length > 0 && (
            <div style={CARD_STYLE}>
              <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: `1px solid ${DIVIDER_COLOR}` }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M5 2h2v5L3 11h10L9 7V2h2" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-sm font-semibold" style={{ color: "#374151" }}>Research Protocols</span>
              </div>
              <div className="px-4 py-2 flex items-center gap-2" style={{ background: `${selectedProtocol.color}0d`, borderBottom: `1px solid ${selectedProtocol.color}22` }}>
                <AlertTriangle className="w-3 h-3 shrink-0" style={{ color: selectedProtocol.color }} />
                <p className="text-[10px] font-semibold" style={{ color: "#6B7280" }}>
                  Research protocols only — not medical advice. Consult a healthcare provider before use.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[12px] border-collapse min-w-[360px]">
                  <thead>
                    <tr style={{ background: "#F9FAFB", borderBottom: `1px solid ${DIVIDER_COLOR}` }}>
                      <th className="py-2 px-3.5 text-left font-bold uppercase tracking-wider text-[10px]" style={{ color: "#9CA3AF" }}>Goal</th>
                      <th className="py-2 px-3.5 text-left font-bold uppercase tracking-wider text-[10px]" style={{ color: "#9CA3AF" }}>Dose</th>
                      <th className="py-2 px-3.5 text-left font-bold uppercase tracking-wider text-[10px]" style={{ color: "#9CA3AF" }}>Frequency</th>
                      <th className="py-2 px-3.5 text-left font-bold uppercase tracking-wider text-[10px]" style={{ color: "#9CA3AF" }}>Route</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProtocol.researchProtocols.map((row, i) => {
                      const isSplit = row.goal.toLowerCase().includes("split");
                      return (
                        <tr key={i} style={{ background: isSplit ? `${selectedProtocol.color}08` : i % 2 === 0 ? "#F9FAFB" : "#FFFFFF", borderBottom: "1px solid #F3F4F6" }}>
                          <td className="py-2.5 px-3.5 font-semibold align-top" style={{ color: "#374151" }}>
                            <div className="flex items-center gap-1.5">
                              {isSplit && <SplitSquareHorizontal className="w-3 h-3 shrink-0" style={{ color: selectedProtocol.color }} />}
                              {row.goal}
                            </div>
                          </td>
                          <td className="py-2.5 px-3.5 font-bold align-top" style={{ color: selectedProtocol.color }}>{row.dose}</td>
                          <td className="py-2.5 px-3.5 align-top" style={{ color: "#4B5563" }}>{row.frequency}</td>
                          <td className="py-2.5 px-3.5 align-top" style={{ color: "#6B7280" }}>{row.route}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════
              CARD 1: Peptide Reconstitution (btpepcalc style)
          ═══════════════════════════════════════════ */}
          <div style={CARD_STYLE}>
            {/* Card header */}
            <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: `1px solid ${DIVIDER_COLOR}` }}>
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "#EFF6FF" }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M4.5 1.5h1.5v4L2 10h10L7.5 5.5V1.5h1.5" stroke={ACCENT} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M4.5 1.5h5" stroke={ACCENT} strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                </div>
                <h2 className="text-base font-bold" style={{ color: "#111827" }}>Peptide Reconstitution</h2>
              </div>
              {/* Mode tabs: Standard / Reverse / Blend */}
              <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${DIVIDER_COLOR}`, background: "#F9FAFB" }}>
                {(["standard", "reverse", "blend"] as const).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setReconMode(mode)}
                    className="px-3 py-1.5 text-xs font-semibold transition-colors capitalize"
                    style={reconMode === mode
                      ? { background: ACCENT, color: "#FFFFFF" }
                      : { background: "transparent", color: "#6B7280" }
                    }
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 space-y-5">
              {/* ─── Vial Volume Capacity ─── */}
              <div>
                <div className="mb-1.5">
                  <p className="text-sm font-semibold" style={{ color: "#374151" }}>Reconstitution Vial Volume Capacity</p>
                  <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>The total physical volume of the vial, representing its nominal size and maximum capacity.</p>
                </div>
                <div className="grid grid-cols-6 gap-2 mt-3">
                  {VIAL_VOLUMES.map(vol => {
                    const isActive = waterMl === String(vol);
                    const isMostCommon = vol === 3;
                    return (
                      <button
                        key={vol}
                        type="button"
                        onClick={() => setWaterMl(String(vol))}
                        className="flex flex-col items-center justify-end pt-2 pb-2 rounded-xl transition-all border"
                        style={{
                          background: isActive ? "#EFF6FF" : "#F9FAFB",
                          borderColor: isActive ? ACCENT : "#E5E7EB",
                          minHeight: 88,
                        }}
                      >
                        <VialIcon volume={vol} active={isActive} />
                        <span className="text-xs font-bold mt-1.5 mb-0.5" style={{ color: isActive ? ACCENT : "#374151" }}>{vol}ml</span>
                        {isMostCommon && (
                          <span className="text-[9px] font-semibold leading-tight text-center px-1" style={{ color: isActive ? ACCENT : "#9CA3AF" }}>Most common size</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ─── Peptide Amount ─── */}
              <div>
                <div className="mb-1.5">
                  <p className="text-sm font-semibold" style={{ color: "#374151" }}>Peptide Amount (Vial Content, mg)</p>
                  <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>How much peptide is in the vial</p>
                </div>

                {/* Row 1 */}
                <div className="grid grid-cols-7 gap-1.5 mt-2">
                  {PEPTIDE_PRESETS_ROW1.map(mg => (
                    <button
                      key={mg}
                      type="button"
                      onClick={() => selectPreset(mg)}
                      className="py-2.5 rounded-lg text-sm font-semibold transition-all border"
                      style={{
                        background: activePreset === mg ? "#EFF6FF" : "#F9FAFB",
                        borderColor: activePreset === mg ? ACCENT : "#E5E7EB",
                        color: activePreset === mg ? ACCENT : "#374151",
                      }}
                    >
                      {mg}mg
                    </button>
                  ))}
                </div>

                {/* Row 2 + More */}
                <div className="grid grid-cols-7 gap-1.5 mt-1.5">
                  {PEPTIDE_PRESETS_ROW2.map(mg => (
                    <button
                      key={mg}
                      type="button"
                      onClick={() => selectPreset(mg)}
                      className="py-2.5 rounded-lg text-sm font-semibold transition-all border"
                      style={{
                        background: activePreset === mg ? "#EFF6FF" : "#F9FAFB",
                        borderColor: activePreset === mg ? ACCENT : "#E5E7EB",
                        color: activePreset === mg ? ACCENT : "#374151",
                      }}
                    >
                      {mg}mg
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setShowMoreAmounts(v => !v)}
                    className="py-2.5 rounded-lg text-sm font-bold transition-all border col-span-2"
                    style={{
                      background: showMoreAmounts ? "#EFF6FF" : "#F9FAFB",
                      borderColor: showMoreAmounts ? ACCENT : "#E5E7EB",
                      color: showMoreAmounts ? ACCENT : "#374151",
                    }}
                  >
                    More
                    <span className="ml-1 text-xs">{showMoreAmounts ? "▲" : "▼"}</span>
                  </button>
                </div>

                {/* More amounts */}
                <AnimatePresence>
                  {showMoreAmounts && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-7 gap-1.5 mt-1.5">
                        {PEPTIDE_PRESETS_MORE.map(mg => (
                          <button
                            key={mg}
                            type="button"
                            onClick={() => selectPreset(mg)}
                            className="py-2.5 rounded-lg text-sm font-semibold transition-all border"
                            style={{
                              background: activePreset === mg ? "#EFF6FF" : "#F9FAFB",
                              borderColor: activePreset === mg ? ACCENT : "#E5E7EB",
                              color: activePreset === mg ? ACCENT : "#374151",
                            }}
                          >
                            {mg}mg
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Validation message */}
                {!peptideSelected && (
                  <div className="flex items-center gap-2 mt-3 px-3 py-2.5 rounded-lg" style={{ background: "#EFF6FF", border: `1px solid #BFDBFE` }}>
                    <div className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: ACCENT }}>
                      <span className="text-[10px] font-bold text-white">!</span>
                    </div>
                    <p className="text-sm" style={{ color: ACCENT }}>Please select your peptide amount to continue</p>
                  </div>
                )}

                {/* Custom amount input */}
                <div className="mt-4">
                  <p className="text-xs font-semibold mb-2" style={{ color: "#6B7280" }}>Custom Peptide Amount (mg)</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => adjustCustomAmount(-1)}
                      className="w-10 h-11 rounded-lg flex items-center justify-center border flex-shrink-0 transition-colors hover:bg-gray-50"
                      style={{ borderColor: "#D1D5DB", background: "#FFFFFF" }}
                    >
                      <Minus className="w-4 h-4" style={{ color: "#6B7280" }} />
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="2000"
                      placeholder="Enter amount"
                      value={customVialMg}
                      onFocus={() => setCustomAmountFocused(true)}
                      onChange={e => {
                        setCustomVialMg(e.target.value);
                        setCustomAmountFocused(true);
                        setVialMg("");
                      }}
                      className="flex-1 h-11 px-4 rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-100"
                      style={{ ...INPUT_STYLE }}
                    />
                    <button
                      type="button"
                      onClick={() => adjustCustomAmount(1)}
                      className="w-10 h-11 rounded-lg flex items-center justify-center border flex-shrink-0 transition-colors hover:bg-gray-50"
                      style={{ borderColor: "#D1D5DB", background: "#FFFFFF" }}
                    >
                      <Plus className="w-4 h-4" style={{ color: "#6B7280" }} />
                    </button>
                  </div>
                  <p className="text-xs mt-1.5" style={{ color: "#9CA3AF" }}>Use buttons or type custom amount (1-2000mg)</p>
                </div>

                {/* Reconstitution result (shown when both vial vol + peptide set) */}
                {hasRecon && (
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="rounded-xl p-3 text-center" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
                      <p className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: ACCENT }}>Concentration</p>
                      <p className="text-lg font-bold" style={{ color: ACCENT }}>{fmtConc(concentrationMgMl)} mg/ml</p>
                      <p className="text-xs" style={{ color: "#60A5FA" }}>{fmtConc(concentrationMcgMl)} mcg/ml</p>
                    </div>
                    <div className="rounded-xl p-3 text-center" style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
                      <p className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: "#16A34A" }}>Vial Content</p>
                      <p className="text-lg font-bold" style={{ color: "#16A34A" }}>{fmtConc(effectiveVialMg)} mg</p>
                      <p className="text-xs" style={{ color: "#4ADE80" }}>in {waterMl} ml</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════
              CARD 2: Dose & Injection Setup (btpepcalc style)
          ═══════════════════════════════════════════ */}
          <div style={CARD_STYLE}>
            {/* Card header */}
            <div className="flex items-center gap-2.5 px-4 py-3.5" style={{ borderBottom: `1px solid ${DIVIDER_COLOR}` }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "#F0FDFA" }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="5.5" stroke="#0D9488" strokeWidth="1.4"/>
                  <path d="M7 4.5v5M4.5 7h5" stroke="#0D9488" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
              </div>
              <h2 className="text-base font-bold" style={{ color: "#111827" }}>Dose &amp; Injection Setup</h2>
            </div>

            {!peptideSelected ? (
              <div className="px-4 py-4">
                <p className="text-sm" style={{ color: "#6B7280" }}>Select a peptide amount above to configure your dose.</p>
              </div>
            ) : (
              <div className="p-4 space-y-5">
                {/* Device selector */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider mb-2.5" style={{ color: "#6B7280" }}>Device</p>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { id: "syringe" as DeviceType, label: "Syringe", Icon: SyringeIcon },
                      { id: "pen" as DeviceType, label: "Pen", Icon: PenIcon },
                      { id: "spray" as DeviceType, label: "Spray", Icon: SprayIcon },
                    ]).map(({ id, label, Icon }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setDevice(id)}
                        className="flex items-center justify-center gap-2 py-3 rounded-xl border font-semibold text-sm transition-all"
                        style={{
                          background: device === id ? ACCENT : "#F3F4F6",
                          borderColor: device === id ? ACCENT : "#E5E7EB",
                          color: device === id ? "#FFFFFF" : "#374151",
                        }}
                      >
                        <Icon active={device === id} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Syringe type (only for syringe device) */}
                {device === "syringe" && (
                  <div>
                    <p className="text-xs font-semibold mb-2" style={{ color: "#6B7280" }}>Syringe Type</p>
                    <div className="grid grid-cols-2 gap-2">
                      {SYRINGE_TYPES.slice(0, 3).map((s, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setSyringeIdx(i)}
                          className="flex items-start gap-2 p-3 rounded-xl border text-left transition-all"
                          style={{
                            background: syringeIdx === i ? "#EFF6FF" : "#F9FAFB",
                            borderColor: syringeIdx === i ? ACCENT : "#E5E7EB",
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold leading-tight" style={{ color: syringeIdx === i ? ACCENT : "#374151" }}>{s.label}</p>
                            <p className="text-[10px] mt-0.5" style={{ color: syringeIdx === i ? "#60A5FA" : "#9CA3AF" }}>{s.unitsPerMl}U/ml</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pen type */}
                {device === "pen" && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setSyringeIdx(3)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border text-left"
                      style={{ background: "#EFF6FF", borderColor: ACCENT }}
                    >
                      <div>
                        <p className="text-sm font-semibold" style={{ color: ACCENT }}>Injection Pen (U-100)</p>
                        <p className="text-xs" style={{ color: "#60A5FA" }}>Dial-a-dose pen — 100U/ml</p>
                      </div>
                    </button>
                  </div>
                )}

                {/* Spray note */}
                {device === "spray" && (
                  <div className="rounded-xl p-3" style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
                    <p className="text-sm font-semibold" style={{ color: "#16A34A" }}>Intranasal / Topical Spray</p>
                    <p className="text-xs mt-1" style={{ color: "#4ADE80" }}>Volume calculated in ml — use a spray bottle with known pump volume (typically 0.1–0.2ml/spray)</p>
                  </div>
                )}

                {/* Desired dose input */}
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: "#6B7280" }}>Desired Dose</p>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      placeholder={doseUnit === "mcg" ? "e.g. 250" : doseUnit === "mg" ? "e.g. 0.25" : "e.g. 1"}
                      value={dose}
                      onChange={e => setDose(e.target.value)}
                      className="flex-1 h-11 px-4 rounded-lg text-sm focus:ring-2 focus:ring-blue-100"
                      style={{ ...INPUT_STYLE }}
                    />
                    <div className="relative">
                      <select
                        value={doseUnit}
                        onChange={e => setDoseUnit(e.target.value as "mcg" | "mg" | "IU")}
                        className="h-11 pl-3 pr-8 rounded-lg text-sm font-semibold appearance-none focus:outline-none"
                        style={{ ...INPUT_STYLE, minWidth: 72 }}
                      >
                        <option value="mcg">mcg</option>
                        <option value="mg">mg</option>
                        <option value="IU">IU</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-3.5 w-3.5 h-3.5 pointer-events-none" style={{ color: "#9CA3AF" }} />
                    </div>
                  </div>
                  {doseUnit === "IU" && (
                    <p className="text-xs mt-1.5" style={{ color: "#9CA3AF" }}>1 IU = 0.333 mg — standard for GH peptides only</p>
                  )}
                </div>

                {/* Result */}
                {hasDose && (
                  <div className="rounded-xl overflow-hidden" style={{ background: "#18181B", border: "1px solid #2A2A2E" }}>
                    <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      <Zap className="w-4 h-4" style={{ color: ACCENT }} />
                      <span className="text-sm font-bold text-white">Result</span>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-3">
                      <div className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: ACCENT }}>Volume to inject</p>
                        <p className="text-2xl font-bold text-white">{fmtMl(injectMl)}</p>
                        <p className="text-xs mt-0.5" style={{ color: ACCENT }}>ml</p>
                        <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>{(injectMl * 1000).toFixed(1)} μl</p>
                      </div>
                      <div className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: ACCENT }}>Syringe units</p>
                        <p className="text-2xl font-bold text-white">{fmtUnits(injectUnits)}</p>
                        <p className="text-xs mt-0.5" style={{ color: ACCENT }}>units</p>
                        <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>{SYRINGE_TYPES[syringeIdx].label}</p>
                      </div>
                    </div>
                    {selectedProtocol && (
                      <div className="px-4 pb-3">
                        <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                          Based on {selectedProtocol.name} — {fmtConc(concentrationMgMl)} mg/ml solution
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {!hasDose && doseNum > 0 && concentrationMgMl === 0 && (
                  <p className="text-sm rounded-xl px-4 py-3" style={{ color: ACCENT, background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
                    Set your vial size and water volume first to calculate dose volume.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ── Split Dosing ── */}
          <div style={CARD_STYLE}>
            <button
              type="button"
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-gray-50 rounded-xl"
              onClick={() => setSplitEnabled(v => !v)}
            >
              <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: splitEnabled ? ACCENT : "#F3F4F6" }}>
                <SplitSquareHorizontal className="w-4 h-4" style={{ color: splitEnabled ? "white" : "#9CA3AF" }} />
              </div>
              <div className="flex-1">
                <span className="text-sm font-bold" style={{ color: "#374151" }}>Split Dosing</span>
                <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>Divide your dose and schedule per day of week</p>
              </div>
              <div className="w-10 h-6 rounded-full transition-colors flex items-center px-0.5" style={{ background: splitEnabled ? ACCENT : "#E5E7EB" }}>
                <div className="w-5 h-5 rounded-full bg-white shadow transition-transform" style={{ transform: splitEnabled ? "translateX(16px)" : "translateX(0)" }} />
              </div>
            </button>

            <AnimatePresence>
              {splitEnabled && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                  <div className="p-4 space-y-5" style={{ borderTop: `1px solid ${DIVIDER_COLOR}` }}>
                    {hasDose && (
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="rounded-xl p-3 text-center" style={{ background: "#EFF6FF", border: `1px solid #BFDBFE` }}>
                          <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: ACCENT }}>Dose 1</p>
                          <p className="text-lg font-bold" style={{ color: ACCENT }}>{fmtMl(injectMl / 2)} ml</p>
                          <p className="text-xs" style={{ color: "#60A5FA" }}>{fmtUnits(injectUnits / 2)} units · {doseNum > 0 ? (doseNum / 2).toFixed(1) : "—"} {doseUnit}</p>
                        </div>
                        <div className="rounded-xl p-3 text-center" style={{ background: "#EFF6FF", border: `1px solid #BFDBFE` }}>
                          <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: ACCENT }}>Dose 2</p>
                          <p className="text-lg font-bold" style={{ color: ACCENT }}>{fmtMl(injectMl / 2)} ml</p>
                          <p className="text-xs" style={{ color: "#60A5FA" }}>{fmtUnits(injectUnits / 2)} units · {doseNum > 0 ? (doseNum / 2).toFixed(1) : "—"} {doseUnit}</p>
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2 mb-2.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: ACCENT }} />
                        <label className="text-sm font-semibold" style={{ color: "#374151" }}>Dose 1 days</label>
                        <span className="text-xs ml-auto" style={{ color: "#9CA3AF" }}>{dose1Days.length === 7 ? "Every day" : dose1Days.length === 0 ? "None" : dose1Days.join(", ")}</span>
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {DAYS.map(day => (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleDay(dose1Days, setDose1Days, day)}
                            className="h-9 w-11 rounded-xl text-xs font-bold transition-all border"
                            style={dose1Days.includes(day)
                              ? { background: ACCENT, color: "white", borderColor: ACCENT }
                              : { background: "#F9FAFB", color: "#6B7280", borderColor: "#E5E7EB" }}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-2.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: "#A78BFA" }} />
                        <label className="text-sm font-semibold" style={{ color: "#374151" }}>Dose 2 days</label>
                        <span className="text-xs ml-auto" style={{ color: "#9CA3AF" }}>{dose2Days.length === 7 ? "Every day" : dose2Days.length === 0 ? "None" : dose2Days.join(", ")}</span>
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {DAYS.map(day => (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleDay(dose2Days, setDose2Days, day)}
                            className="h-9 w-11 rounded-xl text-xs font-bold transition-all border"
                            style={dose2Days.includes(day)
                              ? { background: "#A78BFA", color: "white", borderColor: "#A78BFA" }
                              : { background: "#F9FAFB", color: "#6B7280", borderColor: "#E5E7EB" }}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>

                    {(dose1Days.length > 0 || dose2Days.length > 0) && (
                      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${DIVIDER_COLOR}` }}>
                        <div className="px-3 py-2" style={{ background: "#F9FAFB", borderBottom: `1px solid ${DIVIDER_COLOR}` }}>
                          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>Weekly Schedule</p>
                        </div>
                        <div className="divide-y divide-gray-50">
                          {DAYS.map(day => {
                            const d1 = dose1Days.includes(day);
                            const d2 = dose2Days.includes(day);
                            if (!d1 && !d2) return (
                              <div key={day} className="flex items-center gap-3 px-3 py-2">
                                <span className="text-xs font-semibold w-8" style={{ color: "#D1D5DB" }}>{day}</span>
                                <span className="text-xs italic" style={{ color: "#D1D5DB" }}>Rest day</span>
                              </div>
                            );
                            return (
                              <div key={day} className="flex items-center gap-2 px-3 py-2">
                                <span className="text-xs font-bold w-8" style={{ color: "#374151" }}>{day}</span>
                                {d1 && (
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#EFF6FF", color: ACCENT }}>
                                    Dose 1{hasDose ? ` — ${fmtMl(injectMl / 2)} ml` : ""}
                                  </span>
                                )}
                                {d2 && (
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(124,58,237,0.12)", color: "#A78BFA" }}>
                                    Dose 2{hasDose ? ` — ${fmtMl(injectMl / 2)} ml` : ""}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Plasma Profile Plotter ── */}
          {selectedProtocol && HALF_LIFE_DATA[selectedProtocol.name] && (() => {
            const pk = HALF_LIFE_DATA[selectedProtocol.name];
            return (
              <PharmaPlot
                key={selectedProtocol.name}
                halfLifeH={pk.halfLifeH}
                tPeakH={pk.tPeakH}
                color={selectedProtocol.color}
                name={selectedProtocol.name}
              />
            );
          })()}

          {/* ── Quick Reference Table ── */}
          <div style={CARD_STYLE}>
            <div className="px-4 py-3" style={{ borderBottom: `1px solid ${DIVIDER_COLOR}` }}>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>Quick Reference — mg / mcg / IU</p>
            </div>
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ background: "#F9FAFB", borderBottom: `1px solid ${DIVIDER_COLOR}` }}>
                  <th className="py-2 px-4 text-left font-semibold" style={{ color: "#6B7280" }}>mg</th>
                  <th className="py-2 px-4 text-left font-semibold" style={{ color: "#6B7280" }}>mcg</th>
                  <th className="py-2 px-4 text-left font-semibold" style={{ color: "#6B7280" }}>IU (GH)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  [0.1, 100, 0.3],
                  [0.25, 250, 0.75],
                  [0.333, 333, 1],
                  [0.5, 500, 1.5],
                  [1, 1000, 3],
                  [2, 2000, 6],
                  [5, 5000, 15],
                ].map(([mg, mcg, iu], i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "#F9FAFB" : "#FFFFFF" }}>
                    <td className="py-2 px-4 font-semibold" style={{ color: "#374151" }}>{mg} mg</td>
                    <td className="py-2 px-4" style={{ color: "#6B7280" }}>{mcg} mcg</td>
                    <td className="py-2 px-4" style={{ color: "#6B7280" }}>{iu} IU</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-center pb-2 leading-relaxed" style={{ color: "#9CA3AF" }}>
            Always double-check calculations before injecting. For educational use only.
          </p>
        </main>

        {showAddSheet && selectedProtocol && (
          <AddToOrderSheet protocol={selectedProtocol} onClose={() => setShowAddSheet(false)} orderType="single" />
        )}
      </div>
    </PageLayout>
  );
}
