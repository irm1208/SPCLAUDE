import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, ShieldX, ShieldAlert, Info, RotateCcw } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { SiteAnnouncements } from "@/components/SiteAnnouncements";

// ─── FDA / USP threshold ──────────────────────────────────────
const FDA_THRESHOLD_EU_PER_KG = 5;

// ─── helpers ──────────────────────────────────────────────────
function fmt(n: number, dp = 2): string {
  if (n >= 1000) return n.toLocaleString("en", { maximumFractionDigits: 0 });
  return n.toLocaleString("en", { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

// ─── UI pieces ────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="section-label mb-2">
      {children}
    </p>
  );
}

function TogglePill({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex rounded-lg p-0.5 gap-0.5 bg-slate-100 border border-slate-200">
      {options.map((o) => {
        const active = o === value;
        return (
          <button
            key={o}
            onClick={() => onChange(o)}
            className="flex-1 rounded-md py-1 px-3 text-xs font-semibold transition-all"
            style={{
              background: active ? "var(--t-blue)" : "transparent",
              color: active ? "#fff" : "#64748B",
            }}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

function NumInput({
  value,
  onChange,
  placeholder,
  min = 0,
  step = 1,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  min?: number;
  step?: number;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      step={step}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none transition-all bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-200 focus:ring-2 focus:ring-blue-100"
    />
  );
}

// ─── InfoBanner ───────────────────────────────────────────────
function InfoBanner() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl overflow-hidden border" style={{ background: "var(--t-blue-05)", borderColor: "var(--t-blue-20)" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-left"
      >
        <Info className="w-4 h-4 shrink-0" style={{ color: "var(--t-blue)" }} />
        <span className="text-sm font-medium flex-1" style={{ color: "var(--t-blue)" }}>
          What is endotoxin testing?
        </span>
        <span
          className="text-xs transition-transform duration-200"
          style={{ display: "inline-block", transform: open ? "rotate(180deg)" : "rotate(0deg)", color: "var(--t-blue)" }}
        >
          ▼
        </span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: "hidden" }}
          >
            <div className="px-4 pb-4 text-sm space-y-2" style={{ color: "var(--t-blue)" }}>
              <p>
                Bacterial endotoxins are lipopolysaccharides (LPS) produced by gram-negative bacteria. Even
                trace amounts in injectable peptides can trigger fever, inflammation, or septic shock.
              </p>
              <p>
                The <strong>FDA / USP {"<"}85{">"}</strong> standard sets the safe limit at{" "}
                <strong>5 EU per kg body weight per hour</strong> for parenteral drugs. A Certificate of
                Analysis (CoA) from a reputable supplier will list the endotoxin level in EU/mg.
              </p>
              <p>
                This calculator tells you whether your CoA value means your dose is within that threshold.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Result card ──────────────────────────────────────────────
type SafetyLevel = "safe" | "borderline" | "unsafe" | "unknown";

interface Result {
  maxSafeEU: number;
  doseEU: number;
  level: SafetyLevel;
  ratio: number;
}

const LEVEL_CONFIG: Record<SafetyLevel, { label: string; color: string; bg: string; border: string; Icon: typeof ShieldCheck }> = {
  safe: {
    label: "Safe",
    color: "#059669",
    bg: "#F0FDF4",
    border: "#86EFAC",
    Icon: ShieldCheck,
  },
  borderline: {
    label: "Borderline",
    color: "var(--t-blue)",
    bg: "#FFFBEB",
    border: "var(--t-blue)",
    Icon: ShieldAlert,
  },
  unsafe: {
    label: "Over Limit",
    color: "#DC2626",
    bg: "#FEF2F2",
    border: "#FCA5A5",
    Icon: ShieldX,
  },
  unknown: {
    label: "—",
    color: "#64748B",
    bg: "#F8FAFC",
    border: "#E2E8F0",
    Icon: ShieldCheck,
  },
};

function ResultCard({ result }: { result: Result | null }) {
  if (!result) {
    return (
      <div className="rounded-xl p-5 flex flex-col items-center justify-center gap-2 min-h-[160px] bg-white border border-slate-100 shadow-sm">
        <ShieldCheck className="w-8 h-8 text-slate-200" />
        <p className="text-sm text-slate-400">
          Fill in all fields above to see your safety result.
        </p>
      </div>
    );
  }

  const { maxSafeEU, doseEU, level, ratio } = result;
  const cfg = LEVEL_CONFIG[level];
  const { Icon } = cfg;

  const marginText =
    level === "unsafe"
      ? `${fmt(1 / ratio, 1)}× over the safe limit`
      : `${fmt(ratio, 1)}× below the safe limit`;

  return (
    <motion.div
      key={level}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      className="rounded-xl overflow-hidden bg-white border border-slate-100 shadow-sm"
    >
      {/* accent line */}
      <div className="h-0.5 w-full" style={{ background: cfg.color }} />

      <div className="p-5 space-y-4">
        {/* verdict banner */}
        <div
          className="rounded-xl p-4 flex items-center gap-3"
          style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
        >
          <Icon className="w-7 h-7 shrink-0" style={{ color: cfg.color }} />
          <div>
            <p className="text-base font-bold" style={{ color: cfg.color }}>
              {cfg.label}
            </p>
            <p className="text-xs mt-0.5" style={{ color: cfg.color, opacity: 0.8 }}>
              {marginText}
            </p>
          </div>
        </div>

        {/* stat grid */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Your dose endotoxin", value: `${fmt(doseEU)} EU` },
            { label: "Your safe limit", value: `${fmt(maxSafeEU)} EU` },
            { label: "Limit per kg", value: `${FDA_THRESHOLD_EU_PER_KG} EU/kg` },
            {
              label: "Safety margin",
              value: level === "unsafe" ? "Exceeded" : `${fmt(ratio, 1)}×`,
              highlight: level !== "unsafe",
            },
          ].map(({ label, value, highlight }) => (
            <div
              key={label}
              className="rounded-xl p-3 bg-slate-50 border border-slate-100"
            >
              <p className="text-xs text-slate-500">
                {label}
              </p>
              <p
                className="text-sm font-bold mt-0.5"
                style={{ color: highlight ? "#059669" : "#18181B" }}
              >
                {value}
              </p>
            </div>
          ))}
        </div>

        <p className="text-xs text-center text-slate-400">
          Threshold: {FDA_THRESHOLD_EU_PER_KG} EU/kg · USP {"<"}85{">"} / FDA Guidance · For research use only
        </p>
      </div>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────
export function EndotoxinContent() {
  const [weightVal, setWeightVal] = useState("");
  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">("kg");

  const [doseVal, setDoseVal] = useState("");
  const [doseUnit, setDoseUnit] = useState<"mcg" | "mg">("mcg");

  const [euMode, setEuMode] = useState<"EU/mg" | "EU/vial">("EU/vial");
  const [euVal, setEuVal] = useState("");
  const [vialSizeMg, setVialSizeMg] = useState("");

  function reset() {
    setWeightVal("");
    setDoseVal("");
    setEuVal("");
    setVialSizeMg("");
  }

  const result = useMemo((): Result | null => {
    const rawWeight = parseFloat(weightVal);
    const rawDose = parseFloat(doseVal);
    const rawEu = parseFloat(euVal);

    if (!isFinite(rawWeight) || rawWeight <= 0) return null;
    if (!isFinite(rawDose) || rawDose <= 0) return null;
    if (!isFinite(rawEu) || rawEu <= 0) return null;

    const weightKg = weightUnit === "lbs" ? rawWeight * 0.453592 : rawWeight;
    const doseMg = doseUnit === "mcg" ? rawDose / 1000 : rawDose;

    let euPerMg: number;
    if (euMode === "EU/vial") {
      const rawVial = parseFloat(vialSizeMg);
      if (!isFinite(rawVial) || rawVial <= 0) return null;
      euPerMg = rawEu / rawVial;
    } else {
      euPerMg = rawEu;
    }

    const maxSafeEU = FDA_THRESHOLD_EU_PER_KG * weightKg;
    const doseEU = euPerMg * doseMg;

    const ratio = maxSafeEU / doseEU;
    let level: SafetyLevel;
    if (doseEU <= maxSafeEU * 0.8) {
      level = "safe";
    } else if (doseEU <= maxSafeEU) {
      level = "borderline";
    } else {
      level = "unsafe";
    }

    return { maxSafeEU, doseEU, level, ratio };
  }, [weightVal, weightUnit, doseVal, doseUnit, euMode, euVal, vialSizeMg]);

  return (
    <div className="px-4 pt-5 pb-12 space-y-5 max-w-2xl mx-auto w-full">

        {/* Page intro */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-lg font-bold text-slate-900">
              Endotoxin Safety Calculator
            </h1>
          </div>
          <p className="text-sm text-slate-500">
            Check if your CoA endotoxin level is within safe limits for your dose and body weight.
          </p>
        </div>

        <InfoBanner />

        {/* ── Inputs card ── */}
        <div className="rounded-xl p-5 space-y-5 bg-white border border-slate-100 shadow-sm">

          {/* Weight */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <SectionLabel>Body weight</SectionLabel>
              <TogglePill
                options={["kg", "lbs"]}
                value={weightUnit}
                onChange={(v) => setWeightUnit(v as "kg" | "lbs")}
              />
            </div>
            <NumInput
              value={weightVal}
              onChange={setWeightVal}
              placeholder={weightUnit === "kg" ? "e.g. 80" : "e.g. 176"}
              min={1}
              step={0.5}
            />
          </div>

          {/* Dose */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <SectionLabel>Injection dose</SectionLabel>
              <TogglePill
                options={["mcg", "mg"]}
                value={doseUnit}
                onChange={(v) => setDoseUnit(v as "mcg" | "mg")}
              />
            </div>
            <NumInput
              value={doseVal}
              onChange={setDoseVal}
              placeholder={doseUnit === "mcg" ? "e.g. 250" : "e.g. 0.25"}
              min={0}
              step={0.1}
            />
          </div>

          {/* CoA endotoxin */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <SectionLabel>CoA endotoxin level</SectionLabel>
              <TogglePill
                options={["EU/vial", "EU/mg"]}
                value={euMode}
                onChange={(v) => setEuMode(v as "EU/mg" | "EU/vial")}
              />
            </div>
            <NumInput
              value={euVal}
              onChange={setEuVal}
              placeholder={euMode === "EU/mg" ? "e.g. 1.5" : "e.g. 15"}
              min={0}
              step={0.1}
            />
            <AnimatePresence>
              {euMode === "EU/vial" && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  style={{ overflow: "hidden" }}
                >
                  <div className="mt-2">
                    <p className="text-xs mb-1.5 text-slate-400">
                      Vial size (mg)
                    </p>
                    <NumInput
                      value={vialSizeMg}
                      onChange={setVialSizeMg}
                      placeholder="e.g. 5"
                      min={0}
                      step={0.5}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Reset */}
          <button
            onClick={reset}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>

        {/* ── Result ── */}
        <ResultCard result={result} />

        {/* ── Reference table ── */}
        <div className="rounded-xl overflow-hidden bg-white border border-slate-100 shadow-sm">
          <div className="h-0.5" style={{ background: "linear-gradient(90deg, var(--brand-navy), var(--brand-blue))" }} />
          <div className="p-4">
            <p className="text-sm font-semibold mb-3 text-slate-700">
              Typical CoA endotoxin ratings
            </p>
            <div className="space-y-2">
              {[
                { range: "< 1 EU/mg", label: "Excellent", color: "#059669" },
                { range: "1 – 5 EU/mg", label: "Good", color: "#10B981" },
                { range: "5 – 20 EU/mg", label: "Moderate — check your dose", color: "var(--t-blue)" },
                { range: "> 20 EU/mg", label: "High — verify safety", color: "#DC2626" },
              ].map(({ range, label, color }) => (
                <div
                  key={range}
                  className="flex items-center justify-between rounded-xl px-3 py-2 bg-slate-50 border border-slate-100"
                >
                  <span className="text-xs font-mono text-slate-500">{range}</span>
                  <span className="text-xs font-semibold" style={{ color }}>{label}</span>
                </div>
              ))}
            </div>
            <p className="text-xs mt-3 text-slate-400">
              These ranges are general guidance. Safety always depends on your specific dose and body weight — use the calculator above for a personalised assessment.
            </p>
          </div>
        </div>

        {/* disclaimer */}
        <p className="text-xs text-center pb-2 text-slate-400">
          For research & educational purposes only. Not medical advice.
        </p>
    </div>
  );
}

export default function EndotoxinCalculator() {
  return (
    <PageLayout>
      <div className="flex flex-col" style={{ background: "var(--t-bg)", minHeight: "100%" }}>
        <SiteAnnouncements />
        <EndotoxinContent />
      </div>
    </PageLayout>
  );
}
