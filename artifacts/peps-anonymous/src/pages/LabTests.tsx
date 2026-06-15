import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TestTube, Search, X, ExternalLink, CheckCircle2, XCircle,
  Microscope, ChevronDown, ChevronLeft, ChevronRight, Loader2,
  FlaskConical, AlertTriangle, ShieldCheck, Calendar, Send,
  BookOpen, ArrowRight, Activity, Beaker, BarChart3, Upload,
  Filter, Users, Building2, Star, TrendingUp, Award, RefreshCw,
  ClipboardList, Link2, Tag, Sparkles, Share2,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "@/hooks/use-toast";
import { PROTOCOLS } from "@/data/protocols";
import { PageLayout } from "@/components/PageLayout";
import { PEPTIDE_GROUPS, getCanonicalGroup, getPeptideDisplayName } from "@/lib/peptide-groups";
import { resolveUtherName } from "@/lib/uther-batch-codes";
import type { PeptideGroup } from "@/lib/peptide-groups";
import { SiteAnnouncements } from "@/components/SiteAnnouncements";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  ReferenceLine, ReferenceArea, ComposedChart, Line, TooltipProps,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────
interface BlendComponent {
  name: string;
  mg: number;
  unit?: string;
  purityPct?: number;
}

interface LabTest {
  id: number;
  janoshikId: string | null;
  url: string;
  peptideName: string;
  nominalDose: string | null;
  mgAmount: number | null;
  massUnit: string | null;
  supplier: string;
  batchCode: string | null;
  labName: string;
  testType: string | null;
  productCategory: string | null;
  purityPct: number | null;
  endotoxinEuMg: number | null;
  sterilityPass: boolean | null;
  testDate: string | null;
  notes: string | null;
  isThirdPartyTest: boolean;
  createdAt: string;
  heavyMetalAs: string | null;
  heavyMetalCd: string | null;
  heavyMetalPb: string | null;
  heavyMetalHg: string | null;
  blendComponents: string | null;
}

/**
 * Normalise a dose string so variants like "10mg" and "10 mg" are treated identically.
 * Strips any whitespace between a number and its unit, then lowercases the unit portion.
 * e.g. "10 mg" → "10mg", "5 MCG" → "5mcg", "0.5 IU" → "0.5IU"
 */
const UPPERCASE_UNITS = new Set(["iu", "ui"]);
function normalizeDose(dose: string): string {
  return dose.trim().replace(/(\d)\s*([a-zA-Zµμ%]+)/g, (_, n, u) => {
    const lower = u.toLowerCase();
    return `${n}${UPPERCASE_UNITS.has(lower) ? lower.toUpperCase() : lower}`;
  });
}

/**
 * Build the human-readable title shown on lab test cards and modals.
 * Format: "{compound} {nominalDose}", e.g. "Tirzepatide 10mg".
 * If the base peptide name already ends with the nominal dose (legacy records),
 * the dose is not appended a second time.
 */
function buildTestTitle(test: LabTest): string {
  const base = getPeptideDisplayName(resolveUtherName(test.supplier, test.batchCode, test.peptideName));
  if (!test.nominalDose) return base;
  const dose = normalizeDose(test.nominalDose);
  if (base.trim().toLowerCase().endsWith(dose.toLowerCase())) return base;
  return `${base} ${dose}`;
}

function parseBlendComponents(json: string | null | undefined): BlendComponent[] | null {
  if (!json) return null;
  try {
    const arr = JSON.parse(json);
    if (!Array.isArray(arr) || arr.length === 0) return null;
    return arr.filter(c => c && c.name && typeof c.mg === "number");
  } catch { return null; }
}


interface Metrics {
  overall: {
    total: number;
    withPurity: number;
    withEndotoxin: number;
    withSterility: number;
    sterilityPass: number;
    sterilityFail: number;
    avgPurity: number | null;
    goodPurity: number;
    lowPurity: number;
    thirdParty: number;
    vendorTests: number;
  };
  byLab: { labName: string; count: number }[];
  byTestType: { testType: string | null; count: number }[];
  byCompound: { peptideName: string; count: number; avgPurity: number | null; sterilityPass: number; sterilityFail: number }[];
  byCategory: { productCategory: string | null; count: number }[];
  bySupplier: { supplier: string; count: number }[];
}

// ─── Constants ────────────────────────────────────────────────────────────────
const LAB_NAMES = ["Janoshik", "Uzorak", "Peptidetest", "testides"];
const TEST_TYPE_LABELS: Record<string, string> = {
  mass_purity: "Mass & Purity",
  mass: "Mass",
  endotoxin: "Endotoxin",
  sterility: "Sterility",
  heavy_metals: "Heavy Metals",
  lcms: "LCMS",
};
const TEST_TYPE_COLORS: Record<string, string> = {
  mass_purity: "#7C3AED",
  mass: "#4B7BB5",
  endotoxin: "#0891B2",
  sterility: "#059669",
  heavy_metals: "#D97706",
  lcms: "#DB2777",
};
const CATEGORY_LABELS: Record<string, string> = {
  peptide: "Peptide",
  pill: "Pill",
  aas: "AAS",
  other: "Other",
};

function apiUrl(path: string) { return `/api${path}`; }

// ─── Peptide display-name map ─────────────────────────────────────────────────

interface CompoundOption {
  value: string;
  label: string;
}


function formatPurity(v: number | string | null | undefined): string {
  if (v == null) return "—";
  const n = Number(v);
  if (!isFinite(n)) return "—";
  const s = n.toFixed(3);
  return s.replace(/\.?0+$/, "");
}

function computeMetricsFromTests(tests: LabTest[]): Metrics {
  const total = tests.length;
  const withPurity = tests.filter(t => t.purityPct != null).length;
  const withEndotoxin = tests.filter(t => t.endotoxinEuMg != null).length;
  const withSterility = tests.filter(t => t.sterilityPass != null).length;
  const sterilityPass = tests.filter(t => t.sterilityPass === true).length;
  const sterilityFail = tests.filter(t => t.sterilityPass === false).length;
  const purities = tests.filter(t => t.purityPct != null).map(t => t.purityPct!);
  const avgPurityRaw = purities.length > 0 ? purities.reduce((a, b) => a + b, 0) / purities.length : null;
  const avgPurity = avgPurityRaw != null ? Math.round(avgPurityRaw * 1000) / 1000 : null;
  const goodPurity = tests.filter(t => t.purityPct != null && t.purityPct >= 99).length;
  const lowPurity = tests.filter(t => t.purityPct != null && t.purityPct < 99).length;
  const thirdParty = tests.filter(t => t.isThirdPartyTest).length;
  const vendorTests = tests.filter(t => !t.isThirdPartyTest).length;

  const labMap = new Map<string, number>();
  for (const t of tests) labMap.set(t.labName, (labMap.get(t.labName) ?? 0) + 1);
  const byLab = [...labMap.entries()].map(([labName, count]) => ({ labName, count })).sort((a, b) => b.count - a.count);

  const ttMap = new Map<string | null, number>();
  for (const t of tests) { const k = t.testType ?? null; ttMap.set(k, (ttMap.get(k) ?? 0) + 1); }
  const byTestType = [...ttMap.entries()].map(([testType, count]) => ({ testType, count })).sort((a, b) => b.count - a.count);

  const cMap = new Map<string, { count: number; pur: number[]; sp: number; sf: number }>();
  for (const t of tests) {
    const e = cMap.get(t.peptideName) ?? { count: 0, pur: [], sp: 0, sf: 0 };
    e.count++;
    if (t.purityPct != null) e.pur.push(t.purityPct);
    if (t.sterilityPass === true) e.sp++;
    if (t.sterilityPass === false) e.sf++;
    cMap.set(t.peptideName, e);
  }
  const byCompound = [...cMap.entries()]
    .map(([peptideName, d]) => ({
      peptideName,
      count: d.count,
      avgPurity: d.pur.length > 0 ? Math.round(d.pur.reduce((a, b) => a + b, 0) / d.pur.length * 1000) / 1000 : null,
      sterilityPass: d.sp,
      sterilityFail: d.sf,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  const sMap = new Map<string, number>();
  for (const t of tests) if (t.supplier) sMap.set(t.supplier, (sMap.get(t.supplier) ?? 0) + 1);
  const bySupplier = [...sMap.entries()].map(([supplier, count]) => ({ supplier, count })).sort((a, b) => b.count - a.count);

  return {
    overall: { total, withPurity, withEndotoxin, withSterility, sterilityPass, sterilityFail, avgPurity, goodPurity, lowPurity, thirdParty, vendorTests },
    byLab, byTestType, byCompound, byCategory: [], bySupplier,
  };
}

function buildCompoundOptions(tests: LabTest[]): CompoundOption[] {
  const seen = new Set<string>();
  for (const t of tests) seen.add(buildTestTitle(t));
  return [...seen].sort((a, b) => a.localeCompare(b)).map(title => ({ value: title, label: title }));
}

// ─── Utility functions ────────────────────────────────────────────────────────
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function batchMonth(batchCode: string | null): { month: number; day: number; year: number } | null {
  if (!batchCode) return null;
  const digits = batchCode.match(/(\d{4})$/)?.[1];
  if (!digits) return null;
  const month = parseInt(digits.slice(0, 2), 10);
  const day   = parseInt(digits.slice(2, 4), 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const year = month <= 9 ? 2026 : 2025;
  return { month, day, year };
}

function ordinal(n: number): string {
  const s = ["th","st","nd","rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function parseBatchDate(batchCode: string | null): string | null {
  const d = batchMonth(batchCode);
  if (!d) return null;
  return `${MONTH_NAMES[d.month - 1]} ${ordinal(d.day)} ${d.year}`;
}

function isHGHPeptide(name: string): boolean {
  return getCanonicalGroup(name)?.canonical === "HGH";
}

function purityTier(pct: number, peptideName?: string): { color: string; bg: string; border: string; label: string } {
  const threshold = peptideName && isHGHPeptide(peptideName) ? 96 : 99;
  if (pct >= threshold) return { color: "#059669", bg: "rgba(5,150,105,0.10)", border: "rgba(5,150,105,0.28)", label: "Good" };
  return { color: "#DC2626", bg: "rgba(220,38,38,0.10)", border: "rgba(220,38,38,0.28)", label: "Low" };
}

function endotoxinTier(eu: number): { color: string; label: string } {
  if (eu <= 1) return { color: "#059669", label: "Excellent" };
  if (eu <= 5) return { color: "var(--t-blue)", label: "Acceptable" };
  return { color: "#DC2626", label: "High" };
}

// Card color based on result quality
function cardResultColor(test: LabTest): { color: string; bg: string; border: string; label: string } | null {
  if (test.purityPct != null) return purityTier(test.purityPct, test.peptideName);
  if (test.sterilityPass === true) return { color: "#059669", bg: "rgba(5,150,105,0.10)", border: "rgba(5,150,105,0.28)", label: "Pass" };
  if (test.sterilityPass === false) return { color: "#DC2626", bg: "rgba(220,38,38,0.10)", border: "rgba(220,38,38,0.28)", label: "Fail" };
  return null;
}

const ACCENT_PALETTE = [
  { color: "#7C3AED", bg: "rgba(124,58,237,0.08)",  border: "rgba(124,58,237,0.22)" },
  { color: "#DB2777", bg: "rgba(219,39,119,0.08)",  border: "rgba(219,39,119,0.22)" },
  { color: "#D97706", bg: "rgba(217,119,6,0.08)",   border: "rgba(217,119,6,0.22)"  },
  { color: "#059669", bg: "rgba(5,150,105,0.08)",   border: "rgba(5,150,105,0.22)"  },
  { color: "#0891B2", bg: "rgba(8,145,178,0.08)",   border: "rgba(8,145,178,0.22)"  },
  { color: "#2563EB", bg: "rgba(37,99,235,0.08)",   border: "rgba(37,99,235,0.22)"  },
  { color: "#B45309", bg: "rgba(180,83,9,0.08)",    border: "rgba(180,83,9,0.22)"   },
  { color: "#0D9488", bg: "rgba(13,148,136,0.08)",  border: "rgba(13,148,136,0.22)" },
];

const VENDOR_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  Uther:  { color: "#1B3A7A", bg: "rgba(27,58,122,0.10)",  border: "rgba(27,58,122,0.28)" },
  WWB:    { color: "#B45309", bg: "rgba(180,83,9,0.10)",    border: "rgba(180,83,9,0.28)"  },
};
const VENDOR_FALLBACK_PALETTE = [
  { color: "#0891B2", bg: "rgba(8,145,178,0.10)",   border: "rgba(8,145,178,0.28)"  },
  { color: "#7C3AED", bg: "rgba(124,58,237,0.10)",  border: "rgba(124,58,237,0.28)" },
  { color: "#059669", bg: "rgba(5,150,105,0.10)",   border: "rgba(5,150,105,0.28)"  },
  { color: "#DB2777", bg: "rgba(219,39,119,0.10)",  border: "rgba(219,39,119,0.28)" },
  { color: "#D97706", bg: "rgba(217,119,6,0.10)",   border: "rgba(217,119,6,0.28)"  },
];

function vendorAccent(supplier: string) {
  if (VENDOR_COLORS[supplier]) return VENDOR_COLORS[supplier];
  let hash = 0;
  for (let i = 0; i < supplier.length; i++) hash = (hash * 31 + supplier.charCodeAt(i)) | 0;
  return VENDOR_FALLBACK_PALETTE[Math.abs(hash) % VENDOR_FALLBACK_PALETTE.length];
}

function peptideAccent(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return ACCENT_PALETTE[Math.abs(hash) % ACCENT_PALETTE.length];
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function TestTypeBadge({ testType }: { testType: string | null }) {
  if (!testType) return null;
  const label = TEST_TYPE_LABELS[testType] ?? testType;
  const color = TEST_TYPE_COLORS[testType] ?? "#64748b";
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide shrink-0"
      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
    >
      {label}
    </span>
  );
}

function SourceBadge({ isThirdParty }: { isThirdParty: boolean }) {
  return isThirdParty ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
      style={{ background: "rgba(250,204,21,0.15)", color: "#92400e", border: "1px solid rgba(250,204,21,0.35)" }}>
      <Star className="w-2.5 h-2.5" /> 3rd Party
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide"
      style={{ background: "rgba(100,116,139,0.1)", color: "#64748b", border: "1px solid rgba(100,116,139,0.2)" }}>
      <Building2 className="w-2.5 h-2.5" /> Vendor
    </span>
  );
}

// ─── ReportModal ─────────────────────────────────────────────────────────────
export function ReportModal({
  tests,
  index,
  onClose,
  onChangeIndex,
  onShare,
}: {
  tests: LabTest[];
  index: number;
  onClose: () => void;
  onChangeIndex: (i: number) => void;
  onShare?: (id: number) => void;
}) {
  const test = tests[index];
  type PreviewState =
    | { type: "image"; url: string }
    | { type: "pdf"; proxyUrl: string; originalUrl: string }
    | { type: "link"; originalUrl: string }
    | null;

  const [preview, setPreview] = useState<PreviewState>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!test) return;
    setLoading(true);
    setError("");
    setPreview(null);
    fetch(apiUrl(`/lab-tests/${test.id}/preview`))
      .then(r => r.json())
      .then(d => {
        if (d.type === "image" && d.images && d.images.length > 0) {
          setPreview({ type: "image", url: apiUrl(`/lab-tests/${test.id}/proxy`) });
        } else if (d.type === "pdf") {
          setPreview({ type: "pdf", proxyUrl: apiUrl(`/lab-tests/${test.id}/proxy`), originalUrl: d.originalUrl ?? test.url });
        } else {
          setPreview({ type: "link", originalUrl: d.originalUrl ?? test.url });
        }
      })
      .catch(() => setError("Failed to load report."))
      .finally(() => setLoading(false));
  }, [test?.id]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && index > 0) onChangeIndex(index - 1);
      if (e.key === "ArrowRight" && index < tests.length - 1) onChangeIndex(index + 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [index, tests.length, onClose, onChangeIndex]);

  if (!test) return null;

  const hasPrev = index > 0;
  const hasNext = index < tests.length - 1;
  const hasQuality = test.purityPct != null || test.endotoxinEuMg != null || test.sterilityPass != null;
  const batchDate = parseBatchDate(test.batchCode);
  const resultColor = cardResultColor(test);
  const matchedProtocol = PROTOCOLS.find(p =>
    p.name.toLowerCase() === test.peptideName.toLowerCase() ||
    (p.aliases ?? []).some(a => a.toLowerCase() === test.peptideName.toLowerCase())
  );

  const isJanoshikUrl = /janoshik\.com/i.test(test.url); // kept for any conditional UI

  const NavBtn = ({ enabled, onClick, icon }: { enabled: boolean; onClick: () => void; icon: React.ReactNode }) => (
    <button
      onClick={enabled ? onClick : undefined}
      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-95"
      style={{
        background: enabled ? "var(--t-blue-10)" : "var(--t-surface2)",
        border: `1px solid ${enabled ? "var(--t-blue-25)" : "var(--t-border)"}`,
        opacity: enabled ? 1 : 0.35,
        cursor: enabled ? "pointer" : "default",
      }}
    >
      {icon}
    </button>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.65)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Separate backdrop blur so it never bleeds into the modal content */}
      <div className="absolute inset-0 pointer-events-none" style={{ backdropFilter: "blur(4px)" }} />
      {/* Modal: full-screen on mobile, centered panel on desktop */}
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="w-full bg-white flex flex-col md:w-[90vw] md:max-w-5xl md:rounded-2xl md:shadow-2xl md:flex-row md:overflow-hidden"
        style={{
          height: "95dvh",
          maxHeight: "95dvh",
          position: "relative",
          isolation: "isolate",
        }}
        // Desktop override
        onClick={e => e.stopPropagation()}
      >
        {/* ── LEFT PANEL: metadata ── */}
        <div
          className="flex flex-col shrink-0 bg-white w-full md:w-72 border-b md:border-b-0 md:border-r"
          style={{ borderColor: "#f1f5f9" }}
        >
          {/* Mobile: compact header — close + nav + count */}
          <div className="flex items-center gap-2 px-3 pt-3 pb-2 md:pt-4 md:pb-3 md:px-4">
            <button onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-slate-100 hover:bg-slate-200 transition-colors">
              <X className="w-4 h-4 text-slate-600" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-sm leading-tight truncate" style={{ color: "var(--t-text)" }}>{buildTestTitle(test)}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <SourceBadge isThirdParty={test.isThirdPartyTest} />
                <TestTypeBadge testType={test.testType} />
                <span className="text-[10px] text-slate-400 font-mono">{index + 1}/{tests.length}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {onShare && (
                <button
                  onClick={() => onShare(test.id)}
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-slate-100 hover:bg-slate-200 transition-colors"
                  title="Copy share link"
                >
                  <Share2 className="w-3.5 h-3.5 text-slate-600" />
                </button>
              )}
              <NavBtn enabled={hasPrev} onClick={() => onChangeIndex(index - 1)} icon={<ChevronLeft className="w-4 h-4 text-slate-600" />} />
              <NavBtn enabled={hasNext} onClick={() => onChangeIndex(index + 1)} icon={<ChevronRight className="w-4 h-4 text-slate-600" />} />
            </div>
          </div>

          {/* Desktop: wider sidebar with full metadata */}
          <div className="hidden md:flex flex-col px-4 pb-4 gap-3 flex-1 overflow-y-auto">
            {/* Result quality badge */}
            {resultColor && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold self-start"
                style={{ background: resultColor.bg, color: resultColor.color, border: `1px solid ${resultColor.border}` }}>
                <Activity className="w-3 h-3" />
                {test.purityPct != null ? `${formatPurity(test.purityPct)}% — ${resultColor.label}` : resultColor.label}
              </div>
            )}

            {/* Batch + Date */}
            {test.batchCode && (
              <div>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded"
                  style={{ color: "var(--t-muted)", background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
                  {test.batchCode}
                </span>
                {batchDate && <span className="text-xs ml-2" style={{ color: "var(--t-subtle)" }}>· {batchDate}</span>}
              </div>
            )}

            {/* Lab + Supplier */}
            <div className="flex items-center gap-3 text-xs" style={{ color: "var(--t-subtle)" }}>
              <span><span className="font-semibold">Lab:</span> {test.labName}</span>
              <span>·</span>
              <span><span className="font-semibold">Vendor:</span> {test.supplier}</span>
            </div>

            {/* Quality metrics */}
            {hasQuality && (
              <div className="rounded-xl p-3 flex flex-col gap-2.5 border"
                style={{ background: "var(--t-surface2)", borderColor: "var(--t-border)" }}>
                {test.purityPct != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: "var(--t-muted)" }}>Purity</span>
                    <span className="text-sm font-bold" style={{ color: purityTier(test.purityPct).color }}>
                      {formatPurity(test.purityPct)}%
                    </span>
                  </div>
                )}
                {test.endotoxinEuMg != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: "var(--t-muted)" }}>Endotoxin</span>
                    <span className="text-sm font-bold" style={{ color: endotoxinTier(test.endotoxinEuMg).color }}>
                      {test.endotoxinEuMg} EU/Vial
                    </span>
                  </div>
                )}
                {test.sterilityPass != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: "var(--t-muted)" }}>Sterility</span>
                    {test.sterilityPass
                      ? <div className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /><span className="text-sm font-bold text-emerald-600">Pass</span></div>
                      : <div className="flex items-center gap-1"><XCircle className="w-3.5 h-3.5 text-red-500" /><span className="text-sm font-bold text-red-500">Fail</span></div>
                    }
                  </div>
                )}
              </div>
            )}

            {/* Actual Mass + blend components */}
            {(() => {
              const blendSidebar = parseBlendComponents(test.blendComponents);
              const hasMass = test.mgAmount != null;
              const hasBlend = blendSidebar && blendSidebar.length > 0;
              if (!hasMass && !hasBlend) return null;
              return (
                <div className="rounded-xl border px-3 py-2.5 flex flex-col gap-1.5"
                  style={{ background: "rgba(59,130,246,0.05)", borderColor: "rgba(96,165,250,0.2)" }}>
                  {hasMass && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: "rgba(96,165,250,0.7)" }}>Actual Mass</span>
                      <span className="text-sm font-bold" style={{ color: "var(--t-text)" }}>{test.mgAmount}{test.massUnit ?? "mg"}</span>
                    </div>
                  )}
                  {hasBlend && (
                    <div className={`flex flex-col gap-1 ${hasMass ? "pt-1 border-t" : ""}`} style={{ borderColor: "rgba(96,165,250,0.15)" }}>
                      {!hasMass && <span className="text-[10px] font-bold tracking-wider uppercase mb-0.5" style={{ color: "rgba(96,165,250,0.7)" }}>Blend Components</span>}
                      {blendSidebar.map((c, i) => (
                        <div key={i} className="flex items-center justify-between gap-2">
                          <span className="text-xs" style={{ color: "var(--t-muted)" }}>{c.name}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-xs font-semibold" style={{ color: "var(--t-text)" }}>{c.mg}{c.unit ?? "mg"}</span>
                            {c.purityPct != null && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{
                                color: c.purityPct >= 98 ? "#059669" : c.purityPct >= 95 ? "#D97706" : "#DC2626",
                                background: c.purityPct >= 98 ? "#D1FAE5" : c.purityPct >= 95 ? "#FEF3C7" : "#FEE2E2",
                              }}>
                                {c.purityPct}%
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Protocol link */}
            {matchedProtocol && (
              <button
                onClick={() => { onClose(); setLocation(`/protocols/${matchedProtocol.slug}`); }}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors border"
                style={{ color: "var(--t-nav)", background: "var(--t-tag-bg)", borderColor: "var(--t-tag-border)" }}
              >
                <BookOpen className="w-3.5 h-3.5" />
                {matchedProtocol.name} Protocol
                <ArrowRight className="w-3 h-3 ml-auto" />
              </button>
            )}

            {/* External link + Share */}
            <div className="flex gap-2">
              <a href={test.url} target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors border"
                style={{ color: "var(--t-muted)", background: "var(--t-surface2)", borderColor: "var(--t-border)" }}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View on {test.labName}
              </a>
              {onShare && (
                <button
                  onClick={() => onShare(test.id)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors border shrink-0"
                  style={{ color: "var(--t-muted)", background: "var(--t-surface2)", borderColor: "var(--t-border)" }}
                  title="Copy share link"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {test.notes && (
              <p className="text-xs px-1 italic" style={{ color: "var(--t-subtle)" }}>{test.notes}</p>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL / MAIN IMAGE AREA ── 
            On mobile: this is the main content and takes ~70% of the screen.
            On desktop: right side of the flex row. */}
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50 overflow-hidden">
          {/* Content area */}
          <div className="flex-1 overflow-auto flex items-center justify-center p-4 min-h-0">

            {/* Actual certificate image when the proxy successfully returns one */}
            {preview?.type === "image" && (
              <AnimatePresence mode="wait">
                <motion.img
                  key={test.id}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.18 }}
                  src={preview.url}
                  alt={`Lab report for ${test.peptideName}`}
                  className="rounded-xl shadow-lg"
                  style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", width: "auto" }}
                />
              </AnimatePresence>
            )}

            {/* PDF viewer when available */}
            {preview?.type === "pdf" && (
              <AnimatePresence mode="wait">
                <motion.iframe
                  key={test.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  src={preview.proxyUrl}
                  title={`Lab report PDF for ${test.peptideName}`}
                  className="rounded-xl shadow-lg"
                  style={{ width: "100%", height: "100%", minHeight: "400px", border: "none" }}
                />
              </AnimatePresence>
            )}

            {/* Certificate data card — shown immediately for all other states.
                Renders from already-extracted test data with no external dependencies. */}
            {preview?.type !== "image" && preview?.type !== "pdf" && (() => {
              const tier = test.purityPct != null ? purityTier(test.purityPct, test.peptideName) : null;
              const blend = parseBlendComponents(test.blendComponents);
              const hasHeavy = test.heavyMetalAs != null || test.heavyMetalCd != null || test.heavyMetalPb != null || test.heavyMetalHg != null;
              const heavyMetals = [
                { sym: "As", val: test.heavyMetalAs },
                { sym: "Cd", val: test.heavyMetalCd },
                { sym: "Pb", val: test.heavyMetalPb },
                { sym: "Hg", val: test.heavyMetalHg },
              ].filter(m => m.val != null);
              return (
                <motion.div
                  key={test.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="w-full max-w-sm mx-auto flex flex-col gap-3"
                >
                  {/* CoA header */}
                  <div className="rounded-2xl border bg-white p-4 flex flex-col gap-3" style={{ borderColor: "var(--t-border)" }}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--t-blue-10)", border: "1px solid var(--t-blue-25)" }}>
                        <FlaskConical className="w-4.5 h-4.5" style={{ color: "var(--t-blue)" }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-black tracking-[0.12em] uppercase" style={{ color: "var(--t-muted)" }}>Certificate of Analysis</p>
                        <p className="text-sm font-bold leading-tight truncate" style={{ color: "var(--t-text)" }}>{test.labName}</p>
                      </div>
                      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin ml-auto shrink-0" style={{ color: "var(--t-muted)" }} />}
                    </div>

                    {/* Primary metrics row */}
                    <div className="grid grid-cols-2 gap-2.5">
                      {tier && test.purityPct != null && (
                        <div className="rounded-xl p-3 flex flex-col gap-0.5" style={{ background: tier.bg, border: `1px solid ${tier.border}` }}>
                          <span className="text-[9px] font-black tracking-wider uppercase" style={{ color: tier.color }}>Purity</span>
                          <span className="text-2xl font-black leading-none" style={{ color: tier.color }}>{formatPurity(test.purityPct)}%</span>
                          <span className="text-[10px] font-semibold mt-0.5" style={{ color: tier.color }}>{tier.label}</span>
                        </div>
                      )}
                      {test.mgAmount != null && (
                        <div className="rounded-xl p-3 flex flex-col gap-0.5" style={{ background: "rgba(59,130,246,0.07)", border: "1px solid rgba(96,165,250,0.22)" }}>
                          <span className="text-[9px] font-black tracking-wider uppercase" style={{ color: "rgba(96,165,250,0.9)" }}>Actual Mass</span>
                          <span className="text-2xl font-black leading-none" style={{ color: "var(--t-text)" }}>{test.mgAmount}</span>
                          <span className="text-[10px] font-semibold mt-0.5" style={{ color: "var(--t-muted)" }}>{test.massUnit ?? "mg"}</span>
                        </div>
                      )}
                      {/* If only one metric, fill with test type */}
                      {(tier == null || test.purityPct == null) && test.mgAmount == null && (
                        <div className="col-span-2 rounded-xl p-3 flex items-center gap-2" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
                          <Beaker className="w-5 h-5 shrink-0" style={{ color: "var(--t-muted)" }} />
                          <div>
                            <p className="text-[9px] font-black tracking-wider uppercase" style={{ color: "var(--t-muted)" }}>Test Type</p>
                            <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>{test.testType?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) ?? "Analysis"}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Secondary metrics: endotoxin + sterility */}
                    {(test.endotoxinEuMg != null || test.sterilityPass != null) && (
                      <div className="rounded-xl border divide-y overflow-hidden" style={{ borderColor: "var(--t-border)" }}>
                        {test.endotoxinEuMg != null && (() => {
                          const etier = endotoxinTier(test.endotoxinEuMg);
                          return (
                            <div className="flex items-center justify-between px-3 py-2 bg-white">
                              <span className="text-xs" style={{ color: "var(--t-muted)" }}>Endotoxin</span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-bold" style={{ color: etier.color }}>{test.endotoxinEuMg} EU/mg</span>
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ color: etier.color, background: "rgba(0,0,0,0.05)" }}>{etier.label}</span>
                              </div>
                            </div>
                          );
                        })()}
                        {test.sterilityPass != null && (
                          <div className="flex items-center justify-between px-3 py-2 bg-white">
                            <span className="text-xs" style={{ color: "var(--t-muted)" }}>Sterility</span>
                            {test.sterilityPass
                              ? <span className="flex items-center gap-1 text-sm font-bold text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" />Pass</span>
                              : <span className="flex items-center gap-1 text-sm font-bold text-red-500"><XCircle className="w-3.5 h-3.5" />Fail</span>
                            }
                          </div>
                        )}
                      </div>
                    )}

                    {/* Heavy metals */}
                    {hasHeavy && (
                      <div className="rounded-xl border p-3" style={{ borderColor: "var(--t-border)" }}>
                        <p className="text-[9px] font-black tracking-wider uppercase mb-2" style={{ color: "var(--t-muted)" }}>Heavy Metals (ppm)</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                          {heavyMetals.map(({ sym, val }) => (
                            <div key={sym} className="flex items-center justify-between">
                              <span className="text-xs font-mono" style={{ color: "var(--t-subtle)" }}>{sym}</span>
                              <span className="text-xs font-bold" style={{ color: "var(--t-text)" }}>{val}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Blend components */}
                    {blend && blend.length > 0 && (
                      <div className="rounded-xl border p-3" style={{ borderColor: "var(--t-border)" }}>
                        <p className="text-[9px] font-black tracking-wider uppercase mb-2" style={{ color: "var(--t-muted)" }}>Blend Components</p>
                        <div className="flex flex-col gap-1.5">
                          {blend.map((c, i) => (
                            <div key={i} className="flex items-center justify-between gap-2">
                              <span className="text-xs" style={{ color: "var(--t-muted)" }}>{c.name}</span>
                              <span className="text-xs font-bold" style={{ color: "var(--t-text)" }}>{c.mg}{c.unit ?? "mg"}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer: original report link */}
                  <a
                    href={test.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors"
                    style={{ color: "var(--t-blue)", borderColor: "var(--t-blue-25)", background: "var(--t-blue-10)" }}
                  >
                    <ExternalLink className="w-4 h-4" />
                    View on {test.labName}
                  </a>
                </motion.div>
              );
            })()}
          </div>

          {/* Desktop nav buttons */}
          <div className="hidden md:flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-white shrink-0">
            <NavBtn enabled={hasPrev} onClick={() => onChangeIndex(index - 1)} icon={<ChevronLeft className="w-4 h-4 text-slate-600" />} />
            <div className="text-center">
              <span className="text-xs text-slate-400 font-mono">{index + 1} / {tests.length}</span>
              <p className="text-[10px] text-slate-300 mt-0.5">← → arrow keys to navigate</p>
            </div>
            <NavBtn enabled={hasNext} onClick={() => onChangeIndex(index + 1)} icon={<ChevronRight className="w-4 h-4 text-slate-600" />} />
          </div>

          {/* Mobile: quick metadata strip below image */}
          <div className="md:hidden flex items-center gap-2 px-3 py-2.5 bg-white border-t border-slate-100 shrink-0 flex-wrap">
            <div className="flex items-center gap-1 text-xs" style={{ color: "var(--t-muted)" }}>
              <span className="font-semibold">{test.labName}</span>
              <span className="text-slate-300">·</span>
              <span>{test.supplier}</span>
            </div>
            {test.purityPct != null && (
              <span className="text-xs font-bold ml-auto" style={{ color: purityTier(test.purityPct).color }}>
                {formatPurity(test.purityPct)}% Purity
              </span>
            )}
            {test.sterilityPass != null && test.purityPct == null && (
              test.sterilityPass
                ? <span className="text-xs font-bold text-emerald-600 ml-auto flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Sterile</span>
                : <span className="text-xs font-bold text-red-500 ml-auto flex items-center gap-1"><XCircle className="w-3 h-3" /> Failed</span>
            )}
            <a href={test.url} target="_blank" rel="noopener noreferrer"
              className="ml-auto flex items-center gap-1 text-xs font-semibold"
              style={{ color: "var(--t-blue)" }}>
              <ExternalLink className="w-3 h-3" /> Open
            </a>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── TestCard ─────────────────────────────────────────────────────────────────
function TestCard({ test, index, onView, onShare }: { test: LabTest; index: number; onView: (i: number) => void; onShare?: (id: number) => void }) {
  const vendor = vendorAccent(test.supplier);
  const displayName = buildTestTitle(test);
  const blendComps = parseBlendComponents(test.blendComponents);

  // Hero stat — purity takes priority, then sterility, then endotoxin, then mass
  const heroStat = (() => {
    if (test.purityPct != null) {
      const tier = purityTier(test.purityPct, test.peptideName);
      return { value: formatPurity(test.purityPct), suffix: "%", color: tier.color };
    }
    if (test.sterilityPass != null) {
      return {
        value: test.sterilityPass ? "PASS" : "FAIL",
        suffix: "",
        color: test.sterilityPass ? "#10B981" : "#EF4444",
      };
    }
    if (test.endotoxinEuMg != null) {
      const tier = endotoxinTier(test.endotoxinEuMg);
      return { value: String(test.endotoxinEuMg), suffix: " EU/Vial", color: tier.color };
    }
    if (test.mgAmount != null) {
      return { value: String(test.mgAmount), suffix: test.massUnit ?? "mg", color: "rgba(255,255,255,0.8)" };
    }
    return null;
  })();

  // Inferred analysis type
  const analysisType = test.testType
    ? (TEST_TYPE_LABELS[test.testType] ?? test.testType)
    : test.purityPct != null ? "Mass & Purity"
    : test.mgAmount != null ? "Mass"
    : test.endotoxinEuMg != null ? "Endotoxin"
    : test.sterilityPass != null ? "Sterility"
    : (test.heavyMetalAs || test.heavyMetalCd || test.heavyMetalPb || test.heavyMetalHg) ? "Heavy Metals"
    : null;

  // Display date
  const displayDate = test.testDate
    ? (() => {
        try {
          const d = new Date(test.testDate + (test.testDate.includes("T") ? "" : "T00:00:00"));
          return isNaN(d.getTime()) ? test.testDate : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
        } catch { return test.testDate; }
      })()
    : parseBatchDate(test.batchCode);

  // Pass/fail chip
  const passChip = (() => {
    if (test.purityPct != null) {
      const tier = purityTier(test.purityPct, test.peptideName);
      const isPass = test.purityPct >= 95;
      return { label: isPass ? "PASS" : "LOW", color: tier.color, border: tier.border, bg: tier.bg };
    }
    if (test.sterilityPass === true)  return { label: "PASS", color: "#10B981", border: "rgba(16,185,129,0.4)",  bg: "rgba(16,185,129,0.12)" };
    if (test.sterilityPass === false) return { label: "FAIL", color: "#EF4444", border: "rgba(239,68,68,0.4)",   bg: "rgba(239,68,68,0.12)"  };
    if (test.endotoxinEuMg != null) {
      const tier = endotoxinTier(test.endotoxinEuMg);
      const borderAlpha = tier.color === "#059669" ? "rgba(5,150,105,0.4)" : tier.color === "#DC2626" ? "rgba(220,38,38,0.4)" : "rgba(8,145,178,0.4)";
      const bgAlpha    = tier.color === "#059669" ? "rgba(5,150,105,0.12)" : tier.color === "#DC2626" ? "rgba(220,38,38,0.12)" : "rgba(8,145,178,0.12)";
      return { label: tier.label.toUpperCase(), color: tier.color, border: borderAlpha, bg: bgAlpha };
    }
    return null;
  })();

  // Extra result rows (endotoxin, heavy metals, etc.)
  // Endotoxin is only shown here when purity or sterility is also present (otherwise it's the hero stat)
  const endotoxinIsHero = test.endotoxinEuMg != null && test.purityPct == null && test.sterilityPass == null;
  const extraRows: { label: string; value: string; color?: string }[] = [];
  if (test.endotoxinEuMg != null && !endotoxinIsHero) {
    const tier = endotoxinTier(test.endotoxinEuMg);
    extraRows.push({ label: "Endotoxin", value: `${test.endotoxinEuMg} EU/Vial`, color: tier.color });
  }
  if (test.heavyMetalAs) extraRows.push({ label: "As", value: test.heavyMetalAs });
  if (test.heavyMetalCd) extraRows.push({ label: "Cd", value: test.heavyMetalCd });
  if (test.heavyMetalPb) extraRows.push({ label: "Pb", value: test.heavyMetalPb });
  if (test.heavyMetalHg) extraRows.push({ label: "Hg", value: test.heavyMetalHg });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl overflow-hidden flex flex-col relative"
      style={{
        background: "linear-gradient(135deg, #0F2044 0%, #2D1B69 100%)",
        border: "1px solid rgba(255,255,255,0.14)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.35)",
      }}
    >
      {/* Subtle vendor glow in top-right */}
      <div
        className="absolute top-0 right-0 w-28 h-28 rounded-full pointer-events-none"
        style={{ background: `${vendor.color}28`, filter: "blur(36px)", transform: "translate(30%,-30%)" }}
      />

      <div className="relative flex flex-col p-3.5 gap-2.5">
        {/* Header */}
        <div className="flex justify-between items-center">
          <span className="text-[8px] font-bold tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.45)" }}>
            Certificate of Analysis
          </span>
          <div className="flex items-center gap-1.5">
            {onShare && (
              <button
                onClick={e => { e.stopPropagation(); onShare(test.id); }}
                className="w-5 h-5 rounded-full flex items-center justify-center transition-all hover:bg-white/15 active:scale-95"
                title="Copy share link"
              >
                <Share2 className="w-3 h-3" style={{ color: "rgba(255,255,255,0.5)" }} />
              </button>
            )}
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
        </div>

        {/* Product name block */}
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          {/* Vendor name pill + source badge — above compound name, right-aligned */}
          <div className="flex items-center gap-1.5 self-end flex-wrap justify-end">
            <SourceBadge isThirdParty={test.isThirdPartyTest} />
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background: "rgba(255,255,255,0.13)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: vendor.color }} />
              <span className="text-[12px] font-semibold text-white leading-none">{test.supplier}</span>
            </div>
          </div>
          {/* Compound name */}
          <h3 className="font-bold text-white text-[20px]">
            {displayName}
          </h3>
          {/* Blend components breakdown */}
          {blendComps && blendComps.length > 0 && (
            <div className="flex flex-col gap-0.5 mt-0.5">
              {blendComps.map((c, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-[9px] font-medium" style={{ color: "rgba(255,255,255,0.55)" }}>{c.name}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-semibold" style={{ color: "rgba(255,255,255,0.8)" }}>{c.mg}{c.unit ?? "mg"}</span>
                    {c.purityPct != null && (
                      <span className="text-[8px] font-bold px-1 rounded" style={{
                        color: c.purityPct >= 98 ? "#10B981" : c.purityPct >= 95 ? "#F59E0B" : "#EF4444",
                        background: c.purityPct >= 98 ? "rgba(16,185,129,0.15)" : c.purityPct >= 95 ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)",
                      }}>
                        {c.purityPct}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Hero stat row — purity/sterility/mass with label, actual mass inline on the right */}
        {heroStat && (
          <div className="py-0.5 flex items-stretch justify-between gap-2">
            {/* Left: labelled hero stat */}
            <div className="flex flex-col">
              <span className="text-[8px] font-bold tracking-widest uppercase mb-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                {test.purityPct != null ? "Purity" : test.sterilityPass != null ? "Sterility" : endotoxinIsHero ? "Endotoxin" : "Actual Mass"}
              </span>
              <div className="leading-none">
                <span
                  className="font-black text-white tracking-tight text-[25px]"
                  style={{ textShadow: `0 0 14px ${heroStat.color}55` }}
                >
                  {heroStat.value}
                </span>
                {heroStat.suffix && (
                  <span className="text-xl font-black ml-0.5" style={{ color: heroStat.color }}>
                    {heroStat.suffix}
                  </span>
                )}
              </div>
            </div>
            {/* Vertical divider */}
            {test.mgAmount != null && test.purityPct != null && (
              <div className="w-px self-stretch mx-1" style={{ background: "rgba(255,255,255,0.12)" }} />
            )}
            {/* Right: actual mass — only show when purity/sterility is the hero (avoid showing mass twice for mass-only tests) */}
            {test.mgAmount != null && test.purityPct != null && (
              <div className="flex flex-col items-end shrink-0">
                <span className="text-[8px] font-bold tracking-widest uppercase" style={{ color: "rgba(96,165,250,0.65)" }}>Actual Mass</span>
                <div className="flex items-baseline gap-0.5 leading-none mt-0.5">
                  <span className="font-black text-white text-[25px]">{test.mgAmount}</span>
                  <span className="text-xl font-black" style={{ color: "rgba(96,165,250,0.8)" }}>{test.massUnit ?? "mg"}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Label rows */}
        <div className="flex flex-col gap-1" style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: "8px" }}>
          <div className="flex items-center justify-between">
            <span className="text-[8px] font-bold tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.35)" }}>Batch</span>
            <span className="text-[11px] font-mono font-semibold text-white truncate ml-2 text-right">{test.batchCode ?? "—"}</span>
          </div>
          {analysisType && (
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-bold tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.35)" }}>Analysis</span>
              <span className="text-[11px] truncate ml-2 text-right" style={{ color: "rgba(255,255,255,0.75)" }}>{analysisType}</span>
            </div>
          )}
          {extraRows.map(r => (
            <div key={r.label} className="flex items-center justify-between">
              <span className="text-[8px] font-bold tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.35)" }}>{r.label}</span>
              <span className="text-[11px] truncate ml-2 text-right font-semibold" style={{ color: r.color ?? "rgba(255,255,255,0.75)" }}>{r.value}</span>
            </div>
          ))}
        </div>

        {/* Chips */}
        <div className="flex flex-wrap gap-1.5" style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: "8px" }}>
          {passChip && (
            <div
              className="px-2 py-1 rounded-md text-[10px] font-bold tracking-wide"
              style={{ color: passChip.color, border: `1px solid ${passChip.border}`, background: passChip.bg }}
            >
              {passChip.label}
            </div>
          )}
          {displayDate && (
            <div
              className="px-2 py-1 rounded-md text-[10px] font-medium flex items-center gap-1"
              style={{ color: "rgba(255,255,255,0.8)", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)" }}
            >
              <Calendar className="w-2.5 h-2.5 text-purple-400" />
              {displayDate}
            </div>
          )}
        </div>

        {/* Lab footnote */}
        {test.labName && (
          <p className="text-[9px]" style={{ color: "rgba(255,255,255,0.28)" }}>Tested by {test.labName}</p>
        )}

        {/* View Report button */}
        <button
          onClick={() => onView(index)}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-white transition-all active:scale-95 hover:bg-white/20"
          style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.15)" }}
        >
          <Microscope className="w-3 h-3" style={{ color: "rgba(255,255,255,0.7)" }} />
          View Report
          <ArrowRight className="w-3 h-3" style={{ color: "rgba(255,255,255,0.7)" }} />
        </button>
      </div>
    </motion.div>
  );
}

// ─── FilterBar ────────────────────────────────────────────────────────────────
interface Filters {
  source: "all" | "vendor" | "third_party";
  compound: string;
  compoundName: string;
  lab: string;
  testType: string;
  supplier: string;
  search: string;
  failedOnly: boolean;
}

type SortOption = "newest" | "oldest" | "purity";

function FilterBar({
  filters,
  onFilters,
  sort,
  onSort,
  compoundNameOptions,
  labs,
  testTypes,
  suppliers,
  totalShown,
  totalAll,
  onShareFilters,
}: {
  filters: Filters;
  onFilters: (f: Filters) => void;
  sort: SortOption;
  onSort: (s: SortOption) => void;
  compoundNameOptions: string[];
  labs: string[];
  testTypes: string[];
  suppliers: string[];
  totalShown: number;
  totalAll: number;
  onShareFilters?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const set = (k: keyof Filters) => (v: string) => onFilters({ ...filters, [k]: v });
  const hasFilters = filters.source !== "all" || filters.compoundName !== "" || filters.lab !== "" || filters.testType !== "" || filters.supplier !== "" || filters.search !== "" || filters.failedOnly;
  const activeCount = [
    filters.source !== "all",
    filters.compoundName !== "",
    filters.lab !== "",
    filters.testType !== "",
    filters.supplier !== "",
    filters.failedOnly,
  ].filter(Boolean).length;

  const selectBase = "appearance-none w-full h-10 pl-3 pr-7 rounded-lg text-xs font-semibold outline-none cursor-pointer";

  return (
    <div style={{ background: "var(--t-surface)", borderBottom: "1px solid var(--t-border)" }}>
      {/* Always-visible row: search + filter toggle + count */}
      <div className="flex items-center gap-2 px-4 py-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search compound or batch…"
            value={filters.search}
            onChange={e => set("search")(e.target.value)}
            className="w-full pl-9 pr-3 h-9 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 transition-all"
            style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-text)" }}
          />
        </div>

        {/* Filters toggle */}
        <button
          onClick={() => setOpen(o => !o)}
          className="h-9 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all"
          style={{
            background: open || activeCount > 0 ? "var(--t-blue-10)" : "var(--t-surface2)",
            border: `1px solid ${open || activeCount > 0 ? "var(--t-blue-30)" : "var(--t-border)"}`,
            color: open || activeCount > 0 ? "var(--t-blue)" : "var(--t-muted)",
          }}
        >
          <Filter className="w-3.5 h-3.5" />
          Filters
          {activeCount > 0 && (
            <span className="w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center text-white" style={{ background: "var(--t-blue)" }}>
              {activeCount}
            </span>
          )}
          <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        {hasFilters && (
          <button
            onClick={() => { onFilters({ source: "all", compound: "", compoundName: "", lab: "", testType: "", supplier: "", search: "", failedOnly: false }); setOpen(false); }}
            className="h-9 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0"
            style={{ background: "rgba(220,38,38,0.08)", color: "#DC2626", border: "1px solid rgba(220,38,38,0.20)" }}
          >
            <X className="w-3 h-3" />
          </button>
        )}

        {onShareFilters && (
          <button
            onClick={onShareFilters}
            className="h-9 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all"
            style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-muted)" }}
            title="Share current filter view"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Collapsible filter panel */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="filter-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-3" style={{ borderTop: "1px solid var(--t-border)" }}>
              <div className="grid grid-cols-2 gap-2 pt-3 sm:grid-cols-3">
                {/* Source */}
                <div className="relative">
                  <select
                    value={filters.source}
                    onChange={e => set("source")(e.target.value)}
                    className={selectBase}
                    style={{
                      background: filters.source !== "all" ? "var(--t-blue-10)" : "var(--t-surface2)",
                      border: `1px solid ${filters.source !== "all" ? "var(--t-blue-30)" : "var(--t-border)"}`,
                      color: filters.source !== "all" ? "var(--t-blue)" : "var(--t-muted)",
                    }}
                  >
                    <option value="all">All Sources</option>
                    <option value="vendor">Vendor Tests</option>
                    <option value="third_party">3rd Party</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: "var(--t-subtle)" }} />
                </div>

                {/* Vendor / Manufacturer */}
                <div className="relative">
                  <select
                    value={filters.supplier}
                    onChange={e => set("supplier")(e.target.value)}
                    className={selectBase}
                    style={{
                      background: filters.supplier !== "" ? vendorAccent(filters.supplier).bg : "var(--t-surface2)",
                      border: `1px solid ${filters.supplier !== "" ? vendorAccent(filters.supplier).border : "var(--t-border)"}`,
                      color: filters.supplier !== "" ? vendorAccent(filters.supplier).color : "var(--t-muted)",
                    }}
                  >
                    <option value="">All Vendors</option>
                    {suppliers.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: "var(--t-subtle)" }} />
                </div>

                {/* Lab */}
                <div className="relative">
                  <select
                    value={filters.lab}
                    onChange={e => set("lab")(e.target.value)}
                    className={selectBase}
                    style={{
                      background: filters.lab !== "" ? "var(--t-blue-10)" : "var(--t-surface2)",
                      border: `1px solid ${filters.lab !== "" ? "var(--t-blue-30)" : "var(--t-border)"}`,
                      color: filters.lab !== "" ? "var(--t-blue)" : "var(--t-muted)",
                    }}
                  >
                    <option value="">All Labs</option>
                    {labs.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: "var(--t-subtle)" }} />
                </div>

                {/* Compound Name */}
                <div className="relative">
                  <select
                    value={filters.compoundName}
                    onChange={e => set("compoundName")(e.target.value)}
                    className={selectBase}
                    style={{
                      background: filters.compoundName !== "" ? "var(--t-blue-10)" : "var(--t-surface2)",
                      border: `1px solid ${filters.compoundName !== "" ? "var(--t-blue-30)" : "var(--t-border)"}`,
                      color: filters.compoundName !== "" ? "var(--t-blue)" : "var(--t-muted)",
                    }}
                  >
                    <option value="">Compound Name</option>
                    {compoundNameOptions.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: "var(--t-subtle)" }} />
                </div>

                {/* Test Type */}
                {testTypes.length > 0 && (
                  <div className="relative">
                    <select
                      value={filters.testType}
                      onChange={e => set("testType")(e.target.value)}
                      className={selectBase}
                      style={{
                        background: filters.testType !== "" ? "var(--t-blue-10)" : "var(--t-surface2)",
                        border: `1px solid ${filters.testType !== "" ? "var(--t-blue-30)" : "var(--t-border)"}`,
                        color: filters.testType !== "" ? "var(--t-blue)" : "var(--t-muted)",
                      }}
                    >
                      <option value="">All Types</option>
                      {testTypes.map(k => <option key={k} value={k}>{TEST_TYPE_LABELS[k] ?? k}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: "var(--t-subtle)" }} />
                  </div>
                )}

                {/* Sort */}
                <div className="relative">
                  <select
                    value={sort}
                    onChange={e => onSort(e.target.value as SortOption)}
                    className={selectBase}
                    style={{
                      background: sort !== "newest" ? "var(--t-blue-10)" : "var(--t-surface2)",
                      border: `1px solid ${sort !== "newest" ? "var(--t-blue-30)" : "var(--t-border)"}`,
                      color: sort !== "newest" ? "var(--t-blue)" : "var(--t-muted)",
                    }}
                  >
                    <option value="newest">Most Recent</option>
                    <option value="oldest">Oldest First</option>
                    <option value="purity">Highest Purity</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: "var(--t-subtle)" }} />
                </div>
              </div>

              {/* Failed toggle + count row */}
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => onFilters({ ...filters, failedOnly: !filters.failedOnly })}
                  className="h-9 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all"
                  style={{
                    background: filters.failedOnly ? "rgba(220,38,38,0.12)" : "var(--t-surface2)",
                    border: `1px solid ${filters.failedOnly ? "rgba(220,38,38,0.35)" : "var(--t-border)"}`,
                    color: filters.failedOnly ? "#DC2626" : "var(--t-muted)",
                  }}
                >
                  Failed tests only
                </button>
                <span className="text-[11px]" style={{ color: "var(--t-subtle)" }}>
                  {totalShown === totalAll ? `${totalAll} tests` : `${totalShown} of ${totalAll}`}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── SubmitSection ────────────────────────────────────────────────────────────
const BLANK_FORM = {
  url: "",
  peptideName: "",
  supplier: "",
  labName: "Janoshik",
  testType: "",
  productCategory: "",
  isThirdPartyTest: true,
  batchCode: "",
  notes: "",
  submittedBy: "",
  mgAmount: "",
  massUnit: "mg",
  purityPct: "",
  endotoxinEuMg: "",
  sterilityPass: "",
  testDate: "",
  heavyMetalArsenic: "",
  heavyMetalCadmium: "",
  heavyMetalLead: "",
  heavyMetalMercury: "",
};

function SubmitSection() {
  const [mode, setMode] = useState<"url" | "pdf">("url");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractNote, setExtractNote] = useState<{ ok: boolean; msg: string } | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const applyExtracted = (ex: Record<string, unknown>) => {
    setForm(f => ({
      ...f,
      peptideName: (ex.compoundName as string)?.trim() || f.peptideName,
      testType: (ex.testType as string) || f.testType,
      productCategory: (ex.productCategory as string) || f.productCategory,
      batchCode: (ex.batchCode as string)?.trim() || f.batchCode,
      mgAmount: ex.mgAmount != null ? String(ex.mgAmount) : f.mgAmount,
      purityPct: ex.purityPct != null ? String(ex.purityPct) : f.purityPct,
      testDate: (ex.testDate as string)?.trim() || f.testDate,
    }));
    setExtractNote({ ok: true, msg: "AI filled in what it could — review and adjust before submitting" });
  };

  const handleExtract = async () => {
    setExtracting(true); setExtractNote(null);
    try {
      if (mode === "pdf") {
        if (!pdfFile) return;
        const fd = new FormData();
        fd.append("file", pdfFile);
        const res = await fetch("/api/lab-tests/extract-pdf", { method: "POST", body: fd });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) { setExtractNote({ ok: false, msg: d.error ?? "Could not read PDF" }); return; }
        applyExtracted(d.extracted);
        if (!form.labName || form.labName === "Janoshik") setForm(f => ({ ...f, labName: "Uzorak" }));
      } else {
        if (!form.url.trim()) return;
        const res = await fetch("/api/lab-tests/extract-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: form.url.trim() }),
        });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) { setExtractNote({ ok: false, msg: d.error ?? "Could not read report" }); return; }
        applyExtracted(d.extracted);
      }
    } catch { setExtractNote({ ok: false, msg: "Network error" }); }
    finally { setExtracting(false); }
  };

  const handleSubmit = async () => {
    if (mode === "pdf" && !pdfFile) { setError("Please select a PDF file"); return; }
    if (mode === "url" && !form.url.trim()) { setError("Report URL is required"); return; }
    if (!form.peptideName.trim()) { setError("Compound name is required"); return; }
    setSubmitting(true); setError("");
    try {
      let res: Response;
      if (mode === "pdf") {
        const fd = new FormData();
        fd.append("file", pdfFile!);
        fd.append("peptideName", form.peptideName.trim());
        fd.append("supplier", form.supplier.trim() || "Unknown");
        fd.append("labName", form.labName || "Uzorak");
        if (form.testType) fd.append("testType", form.testType);
        if (form.productCategory) fd.append("productCategory", form.productCategory);
        fd.append("isThirdPartyTest", String(form.isThirdPartyTest));
        if (form.batchCode.trim()) fd.append("batchCode", form.batchCode.trim());
        if (form.notes.trim()) fd.append("notes", form.notes.trim());
        if (form.submittedBy.trim()) fd.append("submittedBy", form.submittedBy.trim());
        if (form.mgAmount) fd.append("mgAmount", form.mgAmount);
        if (form.purityPct) fd.append("purityPct", form.purityPct);
        if (form.endotoxinEuMg) fd.append("endotoxinEuMg", form.endotoxinEuMg);
        if (form.sterilityPass) fd.append("sterilityPass", form.sterilityPass);
        if (form.testDate.trim()) fd.append("testDate", form.testDate.trim());
        if (form.url.trim()) fd.append("url", form.url.trim());
        res = await fetch("/api/lab-tests/submit-pdf", { method: "POST", body: fd });
      } else {
        res = await fetch("/api/lab-tests/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: form.url.trim(),
            peptideName: form.peptideName.trim(),
            supplier: form.supplier.trim() || "Unknown",
            labName: form.labName,
            testType: form.testType || null,
            productCategory: form.productCategory || null,
            isThirdPartyTest: form.isThirdPartyTest,
            batchCode: form.batchCode.trim() || null,
            notes: form.notes.trim() || null,
            submittedBy: form.submittedBy.trim() || null,
            mgAmount: form.mgAmount !== "" ? parseFloat(form.mgAmount) : null,
            purityPct: form.purityPct !== "" ? parseFloat(form.purityPct) : null,
            endotoxinEuMg: form.endotoxinEuMg !== "" ? parseFloat(form.endotoxinEuMg) : null,
            sterilityPass: form.sterilityPass !== "" ? form.sterilityPass : null,
            testDate: form.testDate.trim() || null,
          }),
        });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Submission failed"); return; }
      setSuccess(true);
    } catch {
      setError("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold" style={{ color: "var(--t-text)" }}>Submitted!</h3>
          <p className="text-sm mt-1" style={{ color: "var(--t-subtle)" }}>
            Your lab report is pending admin review and will appear publicly once approved.
          </p>
        </div>
        <button
          onClick={() => { setSuccess(false); setPdfFile(null); setForm({ ...BLANK_FORM }); }}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: "var(--t-blue)" }}
        >
          Submit Another
        </button>
      </div>
    );
  }

  const inputCls = "w-full h-10 px-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-200 transition-all";
  const inputStyle = { background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-text)" };
  const labelCls = "text-xs font-semibold mb-1 block";
  const labelStyle = { color: "var(--t-muted)" };

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <div>
        <h2 className="text-lg font-bold" style={{ color: "var(--t-text)" }}>Submit a Lab Report</h2>
        <p className="text-sm mt-1" style={{ color: "var(--t-subtle)" }}>
          Share a lab report with the community. Your submission will be reviewed before going live.
          3rd party tests (purchased independently) carry extra weight.
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: "var(--t-border)" }}>
        {(["url", "pdf"] as const).map(m => (
          <button key={m} onClick={() => { setMode(m); setExtractNote(null); setError(""); }}
            className="flex-1 py-2.5 text-sm font-semibold transition-all flex items-center justify-center gap-1.5"
            style={{
              background: mode === m ? "var(--t-blue)" : "var(--t-surface)",
              color: mode === m ? "#fff" : "var(--t-muted)",
            }}>
            {m === "url" ? <><Link2 className="w-3.5 h-3.5" /> Report URL</> : <><Upload className="w-3.5 h-3.5" /> Upload PDF</>}
          </button>
        ))}
      </div>

      {/* Source card — URL or PDF upload */}
      <div className="rounded-2xl p-4 space-y-4 border" style={{ background: "var(--t-surface)", borderColor: "var(--t-border)" }}>
        {mode === "url" ? (
          <div>
            <label className={labelCls} style={labelStyle}>Report URL *</label>
            <div className="flex gap-2">
              <div className="relative flex-1 min-w-0">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="url"
                  placeholder="https://janoshik.com/tests/... or uzorak.com/#/verify/..."
                  value={form.url}
                  onChange={e => { set("url")(e); setExtractNote(null); }}
                  className={`${inputCls} pl-9`}
                  style={inputStyle}
                />
              </div>
              <button
                type="button"
                onClick={handleExtract}
                disabled={extracting || !form.url.trim()}
                className="h-10 px-3 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shrink-0 disabled:opacity-40 transition-all"
                style={{ background: extracting ? "#6D28D9" : "linear-gradient(135deg,#7C3AED,#4F46E5)" }}
              >
                {extracting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {extracting ? "Reading…" : "Fill with AI"}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <label className={labelCls} style={labelStyle}>PDF Report *</label>
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0] ?? null;
                setPdfFile(f);
                setExtractNote(null);
                if (f) setForm(prev => ({ ...prev, labName: prev.labName === "Janoshik" ? "Uzorak" : prev.labName }));
              }}
            />
            {/* Drop zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault(); setDragOver(false);
                const f = e.dataTransfer.files[0];
                if (f && (f.type === "application/pdf" || f.type.startsWith("image/"))) {
                  setPdfFile(f); setExtractNote(null);
                  setForm(prev => ({ ...prev, labName: prev.labName === "Janoshik" ? "Uzorak" : prev.labName }));
                }
              }}
              className="flex flex-col items-center justify-center gap-2 py-8 px-4 rounded-xl cursor-pointer transition-all border-2 border-dashed"
              style={{
                borderColor: dragOver ? "var(--t-blue)" : pdfFile ? "rgba(16,185,129,0.5)" : "var(--t-border)",
                background: dragOver ? "rgba(59,130,246,0.04)" : pdfFile ? "rgba(16,185,129,0.04)" : "transparent",
              }}
            >
              {pdfFile ? (
                <>
                  <CheckCircle2 className="w-8 h-8" style={{ color: "#059669" }} />
                  <p className="text-sm font-semibold text-center" style={{ color: "var(--t-text)" }}>{pdfFile.name}</p>
                  <p className="text-xs" style={{ color: "var(--t-muted)" }}>{(pdfFile.size / 1024).toFixed(0)} KB — tap to change</p>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8" style={{ color: "var(--t-muted)" }} />
                  <p className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Drop PDF here or tap to browse</p>
                  <p className="text-xs" style={{ color: "var(--t-muted)" }}>Uzorak, HPLC reports, CoA scans — PDF, JPEG, PNG, WebP</p>
                </>
              )}
            </div>
            {/* AI extract button */}
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={handleExtract}
                disabled={extracting || !pdfFile}
                className="h-10 px-4 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 disabled:opacity-40 transition-all"
                style={{ background: extracting ? "#6D28D9" : "linear-gradient(135deg,#7C3AED,#4F46E5)" }}
              >
                {extracting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {extracting ? "Reading PDF…" : "Fill with AI"}
              </button>
              <p className="text-xs self-center" style={{ color: "var(--t-muted)" }}>
                Extracts compound, purity, batch & more
              </p>
            </div>
            {/* Optional Uzorak URL for reference */}
            <div className="mt-3">
              <label className={labelCls} style={labelStyle}>Report URL (optional)</label>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="url"
                  placeholder="https://uzorak.com/#/verify/... (for the verify link)"
                  value={form.url}
                  onChange={e => { set("url")(e); }}
                  className={`${inputCls} pl-9`}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>
        )}

        {extractNote && (
          <div className={`flex items-start gap-2 px-3 py-2 rounded-lg text-xs font-medium ${extractNote.ok ? "text-emerald-700" : "text-red-600"}`}
            style={{ background: extractNote.ok ? "rgba(16,185,129,0.08)" : "rgba(220,38,38,0.08)", border: `1px solid ${extractNote.ok ? "rgba(16,185,129,0.2)" : "rgba(220,38,38,0.2)"}` }}>
            {extractNote.ok ? <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
            {extractNote.msg}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls} style={labelStyle}>Lab *</label>
            <div className="relative">
              <select value={form.labName} onChange={set("labName")}
                className="appearance-none w-full h-10 pl-3 pr-7 rounded-xl text-sm outline-none cursor-pointer"
                style={inputStyle}>
                {LAB_NAMES.map(l => <option key={l} value={l}>{l}</option>)}
                <option value="Other">Other</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-slate-400" />
            </div>
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>Source</label>
            <div className="relative">
              <select
                value={form.isThirdPartyTest ? "third" : "vendor"}
                onChange={e => setForm(f => ({ ...f, isThirdPartyTest: e.target.value === "third" }))}
                className="appearance-none w-full h-10 pl-3 pr-7 rounded-xl text-sm outline-none cursor-pointer"
                style={inputStyle}
              >
                <option value="third">3rd Party (my test)</option>
                <option value="vendor">Vendor Test</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-slate-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Compound details */}
      <div className="rounded-2xl p-4 space-y-4 border" style={{ background: "var(--t-surface)", borderColor: "var(--t-border)" }}>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={labelCls} style={labelStyle}>Compound Name *</label>
            <input
              type="text"
              placeholder="e.g. BPC-157, Semaglutide…"
              value={form.peptideName}
              onChange={set("peptideName")}
              className={inputCls}
              style={inputStyle}
            />
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>Vendor / Supplier</label>
            <input
              type="text"
              placeholder="Vendor name"
              value={form.supplier}
              onChange={set("supplier")}
              className={inputCls}
              style={inputStyle}
            />
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>Test Type</label>
            <div className="relative">
              <select value={form.testType} onChange={set("testType")}
                className="appearance-none w-full h-10 pl-3 pr-7 rounded-xl text-sm outline-none cursor-pointer"
                style={inputStyle}>
                <option value="">Unknown / Mixed</option>
                {Object.entries(TEST_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-slate-400" />
            </div>
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>Product Category</label>
            <div className="relative">
              <select value={form.productCategory} onChange={set("productCategory")}
                className="appearance-none w-full h-10 pl-3 pr-7 rounded-xl text-sm outline-none cursor-pointer"
                style={inputStyle}>
                <option value="">Unknown</option>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-slate-400" />
            </div>
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>Batch Code</label>
            <input
              type="text"
              placeholder="Optional"
              value={form.batchCode}
              onChange={set("batchCode")}
              className={inputCls}
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* Test Results */}
      <div className="rounded-2xl p-4 space-y-4 border" style={{ background: "var(--t-surface)", borderColor: "var(--t-border)" }}>
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--t-muted)" }}>Test Results <span className="normal-case font-normal opacity-60">(optional)</span></p>

        <div className="grid grid-cols-2 gap-3">
          {/* Mass */}
          <div className="col-span-2">
            <label className={labelCls} style={labelStyle}>Mass</label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 5.2"
                value={form.mgAmount}
                onChange={set("mgAmount")}
                className={`${inputCls} flex-1`}
                style={inputStyle}
              />
              <div className="relative">
                <select
                  value={form.massUnit}
                  onChange={set("massUnit")}
                  className="appearance-none h-10 pl-3 pr-7 rounded-xl text-sm outline-none cursor-pointer"
                  style={{ ...inputStyle, minWidth: "72px" }}
                >
                  <option value="mg">mg</option>
                  <option value="mcg">mcg</option>
                  <option value="g">g</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none text-slate-400" />
              </div>
            </div>
            <p className="text-[11px] mt-1" style={{ color: "var(--t-subtle)" }}>Enter the value in mg — unit shown for reference only.</p>
          </div>

          {/* Purity */}
          <div>
            <label className={labelCls} style={labelStyle}>Purity %</label>
            <input
              type="number"
              min="0"
              max="100"
              step="any"
              placeholder="e.g. 98.5"
              value={form.purityPct}
              onChange={set("purityPct")}
              className={inputCls}
              style={inputStyle}
            />
          </div>

          {/* Endotoxin */}
          <div>
            <label className={labelCls} style={labelStyle}>Endotoxin EU/mg</label>
            <input
              type="number"
              min="0"
              step="any"
              placeholder="e.g. 0.25"
              value={form.endotoxinEuMg}
              onChange={set("endotoxinEuMg")}
              className={inputCls}
              style={inputStyle}
            />
          </div>

          {/* Sterility */}
          <div>
            <label className={labelCls} style={labelStyle}>Sterility</label>
            <div className="relative">
              <select
                value={form.sterilityPass}
                onChange={set("sterilityPass")}
                className="appearance-none w-full h-10 pl-3 pr-7 rounded-xl text-sm outline-none cursor-pointer"
                style={inputStyle}
              >
                <option value="">Unknown</option>
                <option value="true">Pass</option>
                <option value="false">Fail</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-slate-400" />
            </div>
          </div>

          {/* Test Date */}
          <div>
            <label className={labelCls} style={labelStyle}>Test Date</label>
            <input
              type="text"
              placeholder="DD/MM/YYYY"
              value={form.testDate}
              onChange={set("testDate")}
              className={inputCls}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Heavy Metals */}
        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: "var(--t-muted)" }}>Heavy Metals</p>
          <div className="grid grid-cols-2 gap-3">
            {(["heavyMetalArsenic", "heavyMetalCadmium", "heavyMetalLead", "heavyMetalMercury"] as const).map((field) => {
              const labels: Record<string, string> = {
                heavyMetalArsenic: "Arsenic",
                heavyMetalCadmium: "Cadmium",
                heavyMetalLead: "Lead",
                heavyMetalMercury: "Mercury",
              };
              return (
                <div key={field}>
                  <label className={labelCls} style={labelStyle}>{labels[field]}</label>
                  <input
                    type="text"
                    placeholder="not detected"
                    value={form[field]}
                    onChange={set(field)}
                    className={inputCls}
                    style={inputStyle}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Optional */}
      <div className="rounded-2xl p-4 space-y-4 border" style={{ background: "var(--t-surface)", borderColor: "var(--t-border)" }}>
        <div>
          <label className={labelCls} style={labelStyle}>Notes (optional)</label>
          <textarea
            rows={3}
            placeholder="Any context about this test…"
            value={form.notes}
            onChange={set("notes")}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-200 resize-none transition-all"
            style={inputStyle}
          />
        </div>
        <div>
          <label className={labelCls} style={labelStyle}>Your Telegram (optional)</label>
          <input
            type="text"
            placeholder="@username"
            value={form.submittedBy}
            onChange={set("submittedBy")}
            className={inputCls}
            style={inputStyle}
          />
          <p className="text-[11px] mt-1" style={{ color: "var(--t-subtle)" }}>Lets us credit you if we use your report.</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: "rgba(220,38,38,0.08)", color: "#DC2626", border: "1px solid rgba(220,38,38,0.20)" }}>
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting || (mode === "url" ? !form.url.trim() : !pdfFile) || !form.peptideName.trim()}
        className="w-full h-12 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
        style={{ background: "var(--t-blue)" }}
      >
        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4" /> Submit for Review</>}
      </button>
    </div>
  );
}

// ─── MetricsTab ───────────────────────────────────────────────────────────────
interface MetricsFilters {
  supplier: string;
  source: "all" | "vendor" | "third_party";
  testType: string;
  failedOnly: boolean;
}

function compoundBarColor(avgPurity: number | null, sterilityPass: number, sterilityFail: number): string {
  if (sterilityFail > 0) return "#DC2626";
  if (avgPurity != null) {
    return avgPurity >= 99 ? "#059669" : "#DC2626";
  }
  if (sterilityPass > 0) return "#059669";
  return "#64748b";
}

function MetricsTab({ allTests, testsLoading, onCompoundClick }: { allTests: LabTest[]; testsLoading: boolean; onCompoundClick: (filterValue: string) => void }) {
  const [mf, setMf] = useState<MetricsFilters>({ supplier: "", source: "all", testType: "", failedOnly: false });
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);

  // Derive filter option lists from allTests (already loaded by parent)
  const supplierOptions = useMemo(() => {
    const s = new Set(allTests.map(t => t.supplier).filter(Boolean));
    return [...s].sort();
  }, [allTests]);

  const testTypeOptions = useMemo(() => {
    const s = new Set(allTests.map(t => t.testType).filter((v): v is string => !!v));
    return [...s].sort();
  }, [allTests]);

  // Fetch server-aggregated metrics whenever filters change
  const { supplier: mfSupplier, source: mfSource, testType: mfTestType } = mf;
  useEffect(() => {
    setMetricsLoading(true);
    const params = new URLSearchParams();
    if (mfSupplier) params.set("supplier", mfSupplier);
    if (mfSource !== "all") params.set("source", mfSource);
    if (mfTestType) params.set("testType", mfTestType);
    const qs = params.toString();
    fetch(apiUrl(`/lab-tests/metrics${qs ? `?${qs}` : ""}`))
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => setMetrics(data?.overall ? data : null))
      .catch(() => setMetrics(null))
      .finally(() => setMetricsLoading(false));
  }, [mfSupplier, mfSource, mfTestType]);

  // Client-side computed metrics when failedOnly is active
  const failedMetrics = useMemo(() => {
    if (!mf.failedOnly) return null;
    const subset = allTests.filter(t => {
      if (mf.supplier && t.supplier !== mf.supplier) return false;
      if (mf.source === "vendor" && t.isThirdPartyTest) return false;
      if (mf.source === "third_party" && !t.isThirdPartyTest) return false;
      if (mf.testType && t.testType !== mf.testType) return false;
      const failed = (t.purityPct != null && t.purityPct < 99)
        || (t.sterilityPass === false)
        || (t.endotoxinEuMg != null && t.endotoxinEuMg > 5);
      return failed;
    });
    return computeMetricsFromTests(subset);
  }, [allTests, mf]);

  const activeMetrics = mf.failedOnly ? failedMetrics : metrics;

  const hasFilters = mf.supplier !== "" || mf.source !== "all" || mf.testType !== "" || mf.failedOnly;

  const selectStyle = {
    background: "var(--t-surface2)",
    border: "1px solid var(--t-border)",
    color: "var(--t-text)",
    borderRadius: 8,
    fontSize: 12,
    padding: "6px 10px",
    outline: "none",
  };

  const statCard = (icon: React.ReactNode, label: string, value: string | number, sub?: string, color?: string) => (
    <div className="rounded-xl p-4 flex flex-col gap-1 border" style={{ background: "var(--t-surface)", borderColor: "var(--t-border)" }}>
      <div style={{ color: color ?? "var(--t-blue)" }}>{icon}</div>
      <span className="text-2xl font-black leading-none mt-1" style={{ color: color ?? "var(--t-text)" }}>{value}</span>
      <span className="text-xs font-semibold" style={{ color: "var(--t-muted)" }}>{label}</span>
      {sub && <span className="text-[11px]" style={{ color: "var(--t-subtle)" }}>{sub}</span>}
    </div>
  );

  if (testsLoading || (metricsLoading && !mf.failedOnly)) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
    </div>
  );

  if (!activeMetrics) return (
    <div className="text-center py-16 text-slate-400 text-sm">Failed to load metrics.</div>
  );

  const { overall, byLab, byTestType, byCompound, bySupplier } = activeMetrics;

  const purityChartData = overall.withPurity > 0 ? [
    { name: "Good ≥99%", value: overall.goodPurity, fill: "#059669" },
    { name: "Low <99%",  value: overall.lowPurity,  fill: "#DC2626" },
  ] : [];

  const sterilityTotal = overall.sterilityPass + overall.sterilityFail;
  const sterilityPassRate = sterilityTotal > 0
    ? Math.round((overall.sterilityPass / sterilityTotal) * 100) : null;
  const purityPassTotal = overall.goodPurity + overall.lowPurity;
  const purityPassRate = purityPassTotal > 0
    ? Math.round((overall.goodPurity / purityPassTotal) * 100) : null;

  return (
    <div className="px-4 py-4 space-y-8 max-w-2xl mx-auto">
      {/* Filters */}
      <section>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--t-muted)" }} />

          <select value={mf.supplier} onChange={e => setMf(f => ({ ...f, supplier: e.target.value }))} style={selectStyle}>
            <option value="">All manufacturers</option>
            {supplierOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select value={mf.source} onChange={e => setMf(f => ({ ...f, source: e.target.value as MetricsFilters["source"] }))} style={selectStyle}>
            <option value="all">All sources</option>
            <option value="vendor">Vendor only</option>
            <option value="third_party">3rd party only</option>
          </select>

          <select value={mf.testType} onChange={e => setMf(f => ({ ...f, testType: e.target.value }))} style={selectStyle}>
            <option value="">All test types</option>
            {testTypeOptions.map(tt => <option key={tt} value={tt}>{TEST_TYPE_LABELS[tt] ?? tt}</option>)}
          </select>

          <button
            onClick={() => setMf(f => ({ ...f, failedOnly: !f.failedOnly }))}
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
            style={mf.failedOnly
              ? { color: "#fff", background: "#DC2626", border: "1px solid #DC2626" }
              : { color: "#DC2626", background: "#FEF2F2", border: "1px solid #FECACA" }}
          >
            <XCircle className="w-3.5 h-3.5" /> Failed Only
          </button>

          {hasFilters && (
            <button
              onClick={() => setMf({ supplier: "", source: "all", testType: "", failedOnly: false })}
              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
              style={{ color: "var(--t-blue)", background: "var(--t-blue-10)", border: "1px solid var(--t-blue-30)" }}
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}

          <span className="text-xs ml-auto" style={{ color: "var(--t-subtle)" }}>
            {overall.total} test{overall.total !== 1 ? "s" : ""}
            {mf.failedOnly && <span className="ml-1 text-red-500 font-bold">· failed</span>}
          </span>
        </div>
      </section>

      {/* Overview cards */}
      <section>
        <h3 className="text-sm font-bold mb-3" style={{ color: "var(--t-muted)" }}>OVERVIEW</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {statCard(<TestTube className="w-4 h-4" />, "Total Tests", overall.total, `${overall.thirdParty} 3rd party, ${overall.vendorTests} vendor`)}
          {purityPassRate != null
            ? statCard(<BarChart3 className="w-4 h-4" />, "Purity Pass Rate", `${purityPassRate}%`, `avg ${overall.avgPurity != null ? formatPurity(overall.avgPurity) : "—"}% · ${overall.withPurity} tests`, "#7C3AED")
            : statCard(<BarChart3 className="w-4 h-4" />, "With Purity", overall.withPurity, "purity data available", "#7C3AED")
          }
          {sterilityPassRate != null
            ? statCard(<ShieldCheck className="w-4 h-4" />, "Sterility Pass Rate", `${sterilityPassRate}%`, `${overall.sterilityPass} pass · ${overall.sterilityFail} fail`, "#059669")
            : statCard(<ShieldCheck className="w-4 h-4" />, "Sterility Tested", overall.withSterility, "sterility data available", "#059669")
          }
          {statCard(<Users className="w-4 h-4" />, "3rd Party Tests", overall.thirdParty, `${overall.vendorTests} vendor-sourced`, "#D97706")}
        </div>
      </section>

      {/* Purity distribution */}
      {purityChartData.length > 0 && (
        <section>
          <h3 className="text-sm font-bold mb-3" style={{ color: "var(--t-muted)" }}>PURITY DISTRIBUTION</h3>
          <div className="rounded-xl p-4 border" style={{ background: "var(--t-surface)", borderColor: "var(--t-border)" }}>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={purityChartData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--t-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--t-muted)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--t-muted)" }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {purityChartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* By Manufacturer */}
      {bySupplier && bySupplier.length > 0 && (
        <section>
          <h3 className="text-sm font-bold mb-3" style={{ color: "var(--t-muted)" }}>BY MANUFACTURER</h3>
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--t-border)" }}>
            {bySupplier.map((row, i) => (
              <div key={row.supplier} className="flex items-center justify-between px-4 py-3"
                style={{ background: i % 2 === 0 ? "var(--t-surface)" : "transparent", borderBottom: i < bySupplier.length - 1 ? "1px solid var(--t-border)" : "none" }}>
                <span className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>{row.supplier}</span>
                <span className="text-sm font-bold" style={{ color: "var(--t-blue)" }}>{row.count}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* By Lab */}
      {byLab.length > 0 && (
        <section>
          <h3 className="text-sm font-bold mb-3" style={{ color: "var(--t-muted)" }}>BY LAB</h3>
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--t-border)" }}>
            {byLab.map((row, i) => (
              <div key={row.labName} className="flex items-center justify-between px-4 py-3"
                style={{ background: i % 2 === 0 ? "var(--t-surface)" : "transparent", borderBottom: i < byLab.length - 1 ? "1px solid var(--t-border)" : "none" }}>
                <span className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>{row.labName}</span>
                <span className="text-sm font-bold" style={{ color: "var(--t-blue)" }}>{row.count}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* By Test Type */}
      {byTestType.length > 0 && (
        <section>
          <h3 className="text-sm font-bold mb-3" style={{ color: "var(--t-muted)" }}>BY TEST TYPE</h3>
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--t-border)" }}>
            {byTestType.map((row, i) => {
              const label = row.testType ? (TEST_TYPE_LABELS[row.testType] ?? row.testType) : "Unspecified";
              const color = row.testType ? (TEST_TYPE_COLORS[row.testType] ?? "#64748b") : "#64748b";
              return (
                <div key={i} className="flex items-center justify-between px-4 py-3"
                  style={{ background: i % 2 === 0 ? "var(--t-surface)" : "transparent", borderBottom: i < byTestType.length - 1 ? "1px solid var(--t-border)" : "none" }}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                    <span className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>{label}</span>
                  </div>
                  <span className="text-sm font-bold" style={{ color }}>{row.count}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Top compounds — bars coloured by quality */}
      {byCompound.length > 0 && (
        <section>
          <h3 className="text-sm font-bold mb-2" style={{ color: "var(--t-muted)" }}>TOP COMPOUNDS (by test count)</h3>
          <div className="flex items-center gap-4 mb-3 flex-wrap">
            {[
              { color: "#059669", label: "Good ≥99%" },
              { color: "#DC2626", label: "Low <99% / Fail" },
              { color: "#64748b", label: "No purity data" },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
                <span className="text-[11px]" style={{ color: "var(--t-subtle)" }}>{l.label}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] mb-2" style={{ color: "var(--t-subtle)" }}>Tap a bar to view those tests in Reports</p>
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--t-border)", cursor: "pointer" }}>
            <ResponsiveContainer width="100%" height={Math.min(byCompound.length * 32 + 20, 320)}>
              <BarChart
                data={byCompound.map(r => ({
                  name: getPeptideDisplayName(r.peptideName),
                  rawName: r.peptideName,
                  count: r.count,
                  fill: compoundBarColor(r.avgPurity, r.sterilityPass, r.sterilityFail),
                }))}
                layout="vertical"
                margin={{ left: 10, right: 24, top: 10, bottom: 10 }}
                onClick={(data) => {
                  const payload = data?.activePayload?.[0]?.payload;
                  if (!payload?.rawName) return;
                  // Find unique card titles for this compound
                  const realTests = allTests.filter(t => t.peptideName === payload.rawName);
                  const titles = [...new Set(realTests.map(t => buildTestTitle(t)))];
                  if (titles.length === 1) {
                    onCompoundClick(titles[0]);
                  }
                  // If multiple titles match, fall through without filtering (ambiguous)
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--t-border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "var(--t-muted)" }} allowDecimals={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: "var(--t-text)" }} width={110} />
                <Tooltip
                  contentStyle={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", borderRadius: 8, fontSize: 12 }}
                  formatter={(value, _name, props) => {
                    const r = byCompound.find(c => getPeptideDisplayName(c.peptideName) === props.payload?.name);
                    const extra = r?.avgPurity != null ? ` · ${formatPurity(r.avgPurity)}% avg purity` : "";
                    return [`${value} tests${extra} · tap to view`, ""];
                  }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} style={{ cursor: "pointer" }}>
                  {byCompound.map((r, i) => (
                    <Cell key={i} fill={compoundBarColor(r.avgPurity, r.sterilityPass, r.sterilityFail)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </div>
  );
}

// ─── CompareTab ───────────────────────────────────────────────────────────────

function getCompoundBaseName(t: LabTest) {
  return getPeptideDisplayName(resolveUtherName(t.supplier, t.batchCode, t.peptideName));
}

function formatShortDate(d: string | null): string {
  if (!d) return "?";
  try {
    const dt = new Date(d.includes("T") ? d : d + "T00:00:00");
    return isNaN(dt.getTime()) ? d : dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
  } catch { return d; }
}

type TrendMetric = "purity" | "endotoxin" | "mass";
interface TrendPoint {
  label: string;
  purity: number | null;
  endotoxin: number | null;
  mass: number | null;
  batchCode: string | null;
  supplier: string;
  date: string | null;
  id: number;
  idx: number;
}


function CompareTab({ allTests, initialCompound, initialSource, initialVendor }: {
  allTests: LabTest[];
  initialCompound?: string;
  initialSource?: string;
  initialVendor?: string;
}) {
  const [trendName, setTrendName] = useState<string>(initialCompound ?? "");
  const validSources: ("all" | "third_party" | "vendor")[] = ["all", "third_party", "vendor"];
  const [sourceFilter, setSourceFilter] = useState<"all" | "third_party" | "vendor">(
    validSources.includes(initialSource as "all" | "third_party" | "vendor") ? (initialSource as "all" | "third_party" | "vendor") : "all"
  );
  const [vendorFilter, setVendorFilter] = useState<string>(initialVendor ?? "");
  const [metric, setMetric] = useState<TrendMetric>("purity");
  const [modalIdx, setModalIdx] = useState<number | null>(null);
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const purityDotColor = (v: number | null) => {
    if (v == null) return "#64748b";
    if (v >= 99) return "#059669";
    if (v >= 95) return "#f59e0b";
    return "#ef4444";
  };

  const allNames = useMemo(() => {
    const seen = new Set<string>();
    for (const t of allTests) seen.add(getCompoundBaseName(t));
    return [...seen].sort();
  }, [allTests]);

  // all tests for the selected compound after source filter (used to build vendor list)
  const sourceFilteredTests = useMemo((): LabTest[] => {
    if (!trendName) return [];
    return allTests.filter(t => {
      if (getCompoundBaseName(t) !== trendName) return false;
      if (sourceFilter === "third_party") return t.isThirdPartyTest === true;
      if (sourceFilter === "vendor")      return t.isThirdPartyTest === false || t.isThirdPartyTest == null;
      return true;
    });
  }, [trendName, sourceFilter, allTests]);

  // unique vendor names for the dropdown (from source-filtered tests)
  const allVendors = useMemo(() =>
    [...new Set(sourceFilteredTests.map(t => t.supplier).filter(Boolean))].sort()
  , [sourceFilteredTests]);

  // sorted raw LabTest objects — source + vendor filtered
  const batchTests = useMemo((): LabTest[] => {
    return sourceFilteredTests
      .filter(t => !vendorFilter || t.supplier === vendorFilter)
      .sort((a, b) => {
        const ad = a.testDate ?? a.createdAt; const bd = b.testDate ?? b.createdAt;
        return ad < bd ? -1 : ad > bd ? 1 : 0;
      });
  }, [sourceFilteredTests, vendorFilter]);

  // chart-ready data derived from batchTests (keeps idx for modal)
  const chartData = useMemo((): TrendPoint[] =>
    batchTests.map((t, idx) => ({
      label: t.batchCode ?? formatShortDate(t.testDate),
      purity: t.purityPct,
      endotoxin: t.endotoxinEuMg,
      mass: t.mgAmount,
      batchCode: t.batchCode,
      supplier: t.supplier,
      date: t.testDate,
      id: t.id,
      idx,
    }))
  , [batchTests]);

  // only include points that have a value for the current metric
  const visibleData = useMemo(() =>
    chartData.filter(d => d[metric] != null),
    [chartData, metric]);

  // safe Y-axis domain — pre-computed with validation to handle any out-of-range DB values
  const yDomain = useMemo((): [number | string, number | string] => {
    if (metric !== "purity") return ["auto", "auto"];
    // Only consider values that are plausibly real purity readings (0–105%)
    const vals = chartData
      .filter(d => d.purity != null && d.purity >= 0 && d.purity <= 105)
      .map(d => d.purity!);
    if (vals.length === 0) return ["auto", "auto"]; // fall back if all values are bad
    const floor = Math.floor(Math.min(...vals));
    const lo = Math.max(80, floor - 3);
    return [lo, 102];
  }, [metric, chartData]);

  const hasPurity    = chartData.some(d => d.purity != null);
  const hasEndotoxin = chartData.some(d => d.endotoxin != null);
  const hasMass      = chartData.some(d => d.mass != null);


  const metricLabel: Record<TrendMetric, string> = {
    purity: "Purity (%)", endotoxin: "Endotoxin (EU/Vial)", mass: "Actual Mass",
  };

  const handleShare = () => {
    const params = new URLSearchParams({ tab: "compare", graph: trendName });
    if (sourceFilter !== "all") params.set("graphSource", sourceFilter);
    if (vendorFilter) params.set("graphVendor", vendorFilter);
    const url = `${window.location.origin}${window.location.pathname}?${params}`;
    navigator.clipboard.writeText(url).then(() => toast({ title: "Link copied", description: `Share link for the ${trendName} graph.` }));
  };

  const btnBase = "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all";

  const BatchTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload as TrendPoint;
    return (
      <div className="rounded-xl border px-3 py-2.5 text-xs shadow-xl space-y-0.5"
        style={{ background: "var(--t-card)", borderColor: "var(--t-border)", color: "var(--t-text)", minWidth: 170 }}>
        <p className="font-bold text-[13px]">{d.batchCode ?? "Batch unknown"}</p>
        {d.date && <p className="text-[10px]" style={{ color: "var(--t-subtle)" }}>{formatShortDate(d.date)}</p>}
        <p style={{ color: "var(--t-subtle)" }}>Supplier: <span className="font-semibold" style={{ color: "var(--t-text)" }}>{d.supplier}</span></p>
        {d.purity != null && <p style={{ color: purityDotColor(d.purity) }}>Purity: <b>{d.purity}%</b></p>}
        {d.endotoxin != null && <p style={{ color: endotoxinTier(d.endotoxin).color }}>Endotoxin: <b>{d.endotoxin} EU/Vial</b></p>}
        {d.mass != null && <p style={{ color: "var(--t-muted)" }}>Mass: <b>{d.mass}</b></p>}
        <p className="text-[10px] pt-0.5" style={{ color: "var(--t-blue)" }}>Click dot to view full report →</p>
      </div>
    );
  };

  // Custom dot — colored by tier, clickable
  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null) return null;
    const val: number | null = payload[metric];
    const color =
      metric === "purity" ? purityDotColor(val) :
      metric === "endotoxin" ? (val != null ? endotoxinTier(val).color : "#64748b") :
      "#3b82f6";
    return (
      <circle
        cx={cx} cy={cy} r={7}
        fill={color} fillOpacity={0.95}
        stroke="white" strokeWidth={2}
        style={{ cursor: "pointer" }}
        onClick={() => setModalIdx(payload.idx)}
      />
    );
  };

  const ActiveDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null) return null;
    const val: number | null = payload[metric];
    const color =
      metric === "purity" ? purityDotColor(val) :
      metric === "endotoxin" ? (val != null ? endotoxinTier(val).color : "#64748b") :
      "#3b82f6";
    return (
      <circle
        cx={cx} cy={cy} r={10}
        fill={color} fillOpacity={0.3}
        stroke={color} strokeWidth={2.5}
        style={{ cursor: "pointer" }}
        onClick={() => setModalIdx(payload.idx)}
      />
    );
  };

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Compound selector */}
      <div className="space-y-2">
        <p className="text-xs font-semibold" style={{ color: "var(--t-subtle)" }}>
          Select a compound to visualise batch-to-batch consistency
        </p>
        <select
          value={trendName}
          onChange={e => { setTrendName(e.target.value); setMetric("purity"); setSourceFilter("all"); setVendorFilter(""); }}
          className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
          style={{ background: "var(--t-surface2)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
        >
          <option value="">— Choose a compound —</option>
          {allNames.map(n => (
            <option key={n} value={n}>
              {n} ({allTests.filter(t => getCompoundBaseName(t) === n).length} test{allTests.filter(t => getCompoundBaseName(t) === n).length !== 1 ? "s" : ""})
            </option>
          ))}
        </select>

        {/* Source filter — visible whenever a compound is chosen */}
        {trendName && (() => {
          const allForName = allTests.filter(t => getCompoundBaseName(t) === trendName);
          const tpCount  = allForName.filter(t => t.isThirdPartyTest === true).length;
          const venCount = allForName.filter(t => t.isThirdPartyTest === false || t.isThirdPartyTest == null).length;
          const pills: { key: typeof sourceFilter; label: string; count: number }[] = [
            { key: "all",         label: "All",       count: allForName.length },
            { key: "third_party", label: "3rd Party", count: tpCount },
            { key: "vendor",      label: "Vendor CoA",  count: venCount },
          ];
          return (
            <div className="flex gap-1.5 flex-wrap">
              {pills.map(p => (
                <button
                  key={p.key}
                  onClick={() => setSourceFilter(p.key)}
                  disabled={p.count === 0}
                  className="px-3 py-1 rounded-full text-xs font-semibold transition-all disabled:opacity-35 disabled:cursor-not-allowed"
                  style={{
                    background: sourceFilter === p.key ? "var(--t-blue)" : "var(--t-surface2)",
                    color: sourceFilter === p.key ? "#fff" : "var(--t-muted)",
                    border: `1px solid ${sourceFilter === p.key ? "var(--t-blue)" : "var(--t-border)"}`,
                  }}
                >
                  {p.label} <span className="opacity-70">({p.count})</span>
                </button>
              ))}
            </div>
          );
        })()}

        {/* Vendor filter — only show when compound is selected and >1 vendor exists */}
        {trendName && allVendors.length > 1 && (
          <select
            value={vendorFilter}
            onChange={e => setVendorFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
            style={{ background: "var(--t-surface2)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
          >
            <option value="">All vendors ({allVendors.length})</option>
            {allVendors.map(v => {
              const count = sourceFilteredTests.filter(t => t.supplier === v).length;
              return (
                <option key={v} value={v}>{v} ({count} test{count !== 1 ? "s" : ""})</option>
              );
            })}
          </select>
        )}

        {trendName && chartData.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {(["purity", "endotoxin"] as TrendMetric[])
              .filter(m => (m === "purity" && hasPurity) || (m === "endotoxin" && hasEndotoxin))
              .map(m => (
                <button key={m} onClick={() => setMetric(m)} className={btnBase}
                  style={{ background: metric === m ? "var(--t-blue)" : "var(--t-surface2)", color: metric === m ? "#fff" : "var(--t-muted)" }}>
                  {metricLabel[m]}
                </button>
              ))}
            <button onClick={handleShare} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
              style={{ borderColor: "var(--t-border)", color: "var(--t-muted)", background: "var(--t-surface2)" }}>
              <Share2 className="w-3 h-3" /> Share graph
            </button>
          </div>
        )}
      </div>

      {!trendName && (
        <div className="flex flex-col items-center gap-2 py-20 text-center">
          <Activity className="w-9 h-9" style={{ color: "var(--t-subtle)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--t-subtle)" }}>Choose a compound above to visualise its results over time.</p>
          <p className="text-xs" style={{ color: "var(--t-subtle)" }}>Click any dot on the graph to open that batch's full lab report.</p>
        </div>
      )}

      {trendName && chartData.length === 0 && (
        <p className="text-sm text-center py-12" style={{ color: "var(--t-subtle)" }}>
          {sourceFilter === "all"
            ? "No test data for this compound."
            : `No ${sourceFilter === "third_party" ? "3rd party" : "vendor CoA"} tests for this compound — try switching the filter above.`}
        </p>
      )}

      {trendName && visibleData.length > 0 && (
        <>
          {/* ── Chart card ── */}
          <div className="rounded-2xl border p-4 space-y-3" style={{ background: "var(--t-card)", borderColor: "var(--t-border)" }}>
            {/* Header */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-sm font-bold" style={{ color: "var(--t-text)" }}>
                  {trendName} — {metricLabel[metric]}
                </h3>
                <p className="text-[10px]" style={{ color: "var(--t-subtle)" }}>
                  {visibleData.length} test{visibleData.length !== 1 ? "s" : ""} · sorted chronologically · click a dot to open report
                </p>
              </div>
              {/* Legend */}
              {metric === "purity" && (
                <div className="flex items-center gap-3 text-[10px] flex-wrap">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> ≥99% Excellent</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> ≥95% Acceptable</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> &lt;95% Low</span>
                </div>
              )}
              {metric === "endotoxin" && (
                <div className="flex items-center gap-3 text-[10px] flex-wrap">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" /> ≤1 Excellent</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-500 inline-block" /> ≤5 Acceptable</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> &gt;5 High</span>
                </div>
              )}
            </div>

            {/* Science description */}
            {metric === "purity" && (
              <p className="text-[10px]" style={{ color: "var(--t-subtle)" }}>
                Purity % by HPLC/MS. ≥99% = pharmaceutical-grade consistency (Excellent). ≥95% = minimum acceptable research standard. &lt;95% = low purity, degradation or synthesis issues possible.
              </p>
            )}
            {metric === "endotoxin" && (
              <p className="text-[10px]" style={{ color: "var(--t-subtle)" }}>
                Endotoxin by LAL assay (EU/Vial). USP &lt;85&gt;: ≤1 EU/Vial = Excellent sterility control; ≤5 EU/Vial = Acceptable for research; &gt;5 EU/Vial = High — potential pyrogenicity risk. Lower is always better.
              </p>
            )}
            {metric === "mass" && (
              <p className="text-[10px]" style={{ color: "var(--t-subtle)" }}>
                Actual measured mass (HPLC or gravimetric). Values close to the nominal dose indicate consistent fill accuracy. Significant deviation may indicate underfilling or analytical variance.
              </p>
            )}

            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart
                data={visibleData}
                margin={{ top: 20, right: 24, left: -8, bottom: 0 }}
                onMouseMove={(data: any) => {
                  const v = data?.activePayload?.[0]?.value;
                  if (v != null) setHoverValue(typeof v === "number" ? v : null);
                }}
                onMouseLeave={() => setHoverValue(null)}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "var(--t-muted)" }}
                  axisLine={false} tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={yDomain}
                  tick={{ fontSize: 11, fill: "var(--t-muted)" }}
                  axisLine={false} tickLine={false}
                  unit={metric === "purity" ? "%" : ""}
                  width={metric === "purity" ? 44 : 40}
                />
                <Tooltip
                  content={<BatchTooltip />}
                  cursor={{ stroke: "rgba(148,163,184,0.45)", strokeWidth: 1, strokeDasharray: "4 4" }}
                />

                {/* Shaded tier bands — purity */}
                {metric === "purity" && <>
                  <ReferenceArea y1={99} y2={102}  fill="#059669" fillOpacity={0.18} ifOverflow="hidden" />
                  <ReferenceArea y1={95} y2={99}   fill="#f59e0b" fillOpacity={0.15} ifOverflow="hidden" />
                  <ReferenceArea y1={0}  y2={95}   fill="#ef4444" fillOpacity={0.10} ifOverflow="hidden" />
                </>}

                {/* Shaded tier bands — endotoxin */}
                {metric === "endotoxin" && <>
                  <ReferenceArea y1={0}   y2={1}   fill="#059669" fillOpacity={0.18} ifOverflow="hidden" />
                  <ReferenceArea y1={1}   y2={5}   fill="#f59e0b" fillOpacity={0.15} ifOverflow="hidden" />
                  <ReferenceArea y1={5}   y2={9999} fill="#ef4444" fillOpacity={0.10} ifOverflow="hidden" />
                </>}

                {/* Reference lines — purity */}
                {metric === "purity" && <>
                  <ReferenceLine y={99} stroke="#059669" strokeDasharray="5 3" strokeWidth={1.2}
                    label={{ value: "≥99% Excellent", position: "insideTopLeft", fontSize: 9, fill: "#059669", dy: -2 }} />
                  <ReferenceLine y={95} stroke="#f59e0b" strokeDasharray="5 3" strokeWidth={1.2}
                    label={{ value: "≥95% Acceptable", position: "insideTopLeft", fontSize: 9, fill: "#f59e0b", dy: -2 }} />
                </>}

                {/* Reference lines — endotoxin */}
                {metric === "endotoxin" && <>
                  <ReferenceLine y={1} stroke="#059669" strokeDasharray="5 3" strokeWidth={1.2}
                    label={{ value: "≤1 Excellent", position: "insideTopLeft", fontSize: 9, fill: "#059669", dy: -2 }} />
                  <ReferenceLine y={5} stroke="#f59e0b" strokeDasharray="5 3" strokeWidth={1.2}
                    label={{ value: "≤5 Acceptable", position: "insideTopLeft", fontSize: 9, fill: "#f59e0b", dy: -2 }} />
                  <ReferenceLine y={10} stroke="#ef4444" strokeDasharray="5 3" strokeWidth={1.2}
                    label={{ value: ">10 High", position: "insideTopLeft", fontSize: 9, fill: "#ef4444", dy: -2 }} />
                </>}

                {/* Horizontal crosshair — tracks the hovered data point's Y value */}
                {hoverValue != null && (
                  <ReferenceLine
                    y={hoverValue}
                    stroke="rgba(148,163,184,0.55)"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                    label={{
                      value: metric === "purity"
                        ? `${hoverValue.toFixed(2)}%`
                        : metric === "endotoxin"
                        ? `${hoverValue.toFixed(2)} EU/mg`
                        : `${hoverValue.toFixed(2)}`,
                      position: "insideLeft",
                      fontSize: 10,
                      fontWeight: 600,
                      fill: "#94a3b8",
                      dx: 6,
                    }}
                    ifOverflow="hidden"
                  />
                )}

                {/* Connecting trend line */}
                <Line
                  dataKey={metric}
                  stroke="rgba(100,116,139,0.4)"
                  strokeWidth={1.5}
                  dot={<CustomDot />}
                  activeDot={<ActiveDot />}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Raw data table */}
          <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--t-card)", borderColor: "var(--t-border)" }}>
            <div className="px-4 py-2.5 border-b flex items-center justify-between" style={{ borderColor: "var(--t-border)" }}>
              <h3 className="text-xs font-bold" style={{ color: "var(--t-text)" }}>Raw Results — {trendName}</h3>
              <span className="text-[10px]" style={{ color: "var(--t-subtle)" }}>Click row to open report</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b" style={{ borderColor: "var(--t-border)" }}>
                    <th className="text-left px-4 py-2 font-semibold" style={{ color: "var(--t-subtle)" }}>Batch</th>
                    <th className="text-left px-3 py-2 font-semibold" style={{ color: "var(--t-subtle)" }}>Date</th>
                    <th className="text-left px-3 py-2 font-semibold" style={{ color: "var(--t-subtle)" }}>Supplier</th>
                    <th className="text-right px-3 py-2 font-semibold" style={{ color: "var(--t-subtle)" }}>Purity</th>
                    <th className="text-right px-3 py-2 font-semibold" style={{ color: "var(--t-subtle)" }}>Endotoxin</th>
                    <th className="text-right px-3 py-2 font-semibold" style={{ color: "var(--t-subtle)" }}>Mass</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((d, i) => (
                    <tr
                      key={i}
                      onClick={() => setModalIdx(d.idx)}
                      className="border-b last:border-0 transition-colors cursor-pointer"
                      style={{ borderColor: "var(--t-border)" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(100,116,139,0.07)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "")}
                    >
                      <td className="px-4 py-2 font-mono font-semibold text-[11px]" style={{ color: "var(--t-text)" }}>{d.batchCode ?? "—"}</td>
                      <td className="px-3 py-2" style={{ color: "var(--t-muted)" }}>{formatShortDate(d.date)}</td>
                      <td className="px-3 py-2" style={{ color: "var(--t-muted)" }}>{d.supplier}</td>
                      <td className="text-right px-3 py-2 font-bold" style={{ color: d.purity != null ? purityDotColor(d.purity) : "var(--t-subtle)" }}>
                        {d.purity != null ? `${d.purity}%` : "—"}
                      </td>
                      <td className="text-right px-3 py-2 font-bold" style={{ color: d.endotoxin != null ? endotoxinTier(d.endotoxin).color : "var(--t-subtle)" }}>
                        {d.endotoxin != null ? `${d.endotoxin} EU/Vial` : "—"}
                      </td>
                      <td className="text-right px-3 py-2" style={{ color: "var(--t-muted)" }}>
                        {d.mass != null ? `${d.mass}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}


      {/* Report modal — opened by clicking a dot or table row */}
      <AnimatePresence>
        {modalIdx !== null && (
          <ReportModal
            tests={batchTests}
            index={modalIdx}
            onClose={() => setModalIdx(null)}
            onChangeIndex={i => setModalIdx(i)}
            onShare={(id) => {
              const url = `${window.location.origin}${window.location.pathname}?report=${id}`;
              navigator.clipboard.writeText(url).then(() => toast({ title: "Report link copied" }));
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 60;

export default function LabTests({ bare }: { bare?: boolean } = {}) {
  const [allTests, setAllTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(() => {
    const params = new URLSearchParams(window.location.search);
    const VALID_SOURCES: Filters["source"][] = ["all", "vendor", "third_party"];
    const rawSource = params.get("source");
    const source: Filters["source"] = VALID_SOURCES.includes(rawSource as Filters["source"])
      ? (rawSource as Filters["source"])
      : "all";
    return {
      source,
      compound: params.get("compound") ?? "",
      compoundName: params.get("compoundName") ?? "",
      lab: params.get("lab") ?? "",
      testType: params.get("testType") ?? "",
      supplier: params.get("supplier") ?? "",
      search: params.get("search") ?? "",
      failedOnly: params.get("failed") === "1",
    };
  });
  const [sort, setSort] = useState<SortOption>("newest");

  // Read tab + graph deep-link params once on mount
  const initialTab = useMemo(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    return (["reports", "submit", "metrics", "compare"] as const).includes(t as "compare")
      ? (t as "reports" | "submit" | "metrics" | "compare")
      : "reports";
  }, []);
  const initialGraph = useMemo(() => new URLSearchParams(window.location.search).get("graph") ?? undefined, []);
  const initialGraphSource = useMemo(() => new URLSearchParams(window.location.search).get("graphSource") ?? undefined, []);
  const initialGraphVendor = useMemo(() => new URLSearchParams(window.location.search).get("graphVendor") ?? undefined, []);

  const [activeTab, setActiveTab] = useState<"reports" | "submit" | "metrics" | "compare">(initialTab);

  const [modalIndex, setModalIndex] = useState<number | null>(null);
  const [labs, setLabs] = useState<string[]>(LAB_NAMES);
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const loaderRef = useRef<HTMLDivElement>(null);

  // Deep-link: report ID from URL param (if present) — read once on mount
  const deepLinkReportId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("report");
    return id ? parseInt(id, 10) : null;
  }, []);
  const deepLinkHandled = useRef(false);

  // Sync URL query string whenever filters change (skip initial render)
  const filterSyncSkip = useRef(true);
  useEffect(() => {
    if (filterSyncSkip.current) { filterSyncSkip.current = false; return; }
    const params = new URLSearchParams();
    if (filters.source !== "all") params.set("source", filters.source);
    if (filters.compound) params.set("compound", filters.compound);
    if (filters.compoundName) params.set("compoundName", filters.compoundName);
    if (filters.lab) params.set("lab", filters.lab);
    if (filters.testType) params.set("testType", filters.testType);
    if (filters.supplier) params.set("supplier", filters.supplier);
    if (filters.search) params.set("search", filters.search);
    if (filters.failedOnly) params.set("failed", "1");
    const qs = params.toString();
    history.replaceState(null, "", window.location.pathname + (qs ? `?${qs}` : ""));
  }, [filters]);

  // Load all tests and filter options
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [testsRes, filtersRes] = await Promise.all([
        fetch(apiUrl("/lab-tests?limit=1000")),
        fetch(apiUrl("/lab-tests/filters")),
      ]);
      if (testsRes.ok) setAllTests(await testsRes.json());
      if (filtersRes.ok) {
        const f = await filtersRes.json();
        if (f.labs && f.labs.length > 0) setLabs(f.labs);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Always show all defined test types in the filter
  const testTypes = useMemo(() => Object.keys(TEST_TYPE_LABELS), []);

  // Derive unique suppliers for the vendor filter
  const suppliers = useMemo(() => {
    const s = new Set(allTests.map(t => t.supplier).filter(Boolean));
    return [...s].sort();
  }, [allTests]);

  // Build normalised compound options for the filter dropdown
  const compoundOptions = useMemo(() => buildCompoundOptions(allTests), [allTests]);

  // Build unique compound + dose options (e.g. "Tirzepatide 10mg") for the filter dropdown
  const compoundNameOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const t of allTests) {
      seen.add(buildTestTitle(t));
    }
    return [...seen].sort((a, b) => a.localeCompare(b));
  }, [allTests]);

  // Client-side filtering + sorting
  const filteredTests = useMemo(() => {
    const filtered = allTests.filter(t => {
      if (filters.source === "vendor" && t.isThirdPartyTest) return false;
      if (filters.source === "third_party" && !t.isThirdPartyTest) return false;
      if (filters.supplier && t.supplier !== filters.supplier) return false;
      if (filters.lab && t.labName.toLowerCase() !== filters.lab.toLowerCase()) return false;

      if (filters.compound && buildTestTitle(t) !== filters.compound) return false;
      if (filters.compoundName) {
        if (buildTestTitle(t) !== filters.compoundName) return false;
      }

      if (filters.testType && t.testType !== filters.testType) return false;
      if (filters.failedOnly) {
        const isFailed =
          (t.purityPct != null && t.purityPct < 99) ||
          t.sterilityPass === false ||
          (t.endotoxinEuMg != null && t.endotoxinEuMg > 5);
        if (!isFailed) return false;
      }
      if (filters.search) {
        const norm = filters.search.toLowerCase().replace(/[^a-z0-9]/gi, "");
        const nameNorm = t.peptideName.toLowerCase().replace(/[^a-z0-9]/gi, "");
        const batchNorm = (t.batchCode ?? "").toLowerCase().replace(/[^a-z0-9]/gi, "");
        if (!nameNorm.includes(norm) && !batchNorm.includes(norm)) return false;
      }
      return true;
    });

    if (sort === "oldest") {
      filtered.sort((a, b) => {
        const da = a.testDate ? new Date(a.testDate).getTime() : new Date(a.createdAt).getTime();
        const db = b.testDate ? new Date(b.testDate).getTime() : new Date(b.createdAt).getTime();
        return da - db;
      });
    } else if (sort === "purity") {
      filtered.sort((a, b) => {
        if (a.purityPct == null && b.purityPct == null) return 0;
        if (a.purityPct == null) return 1;
        if (b.purityPct == null) return -1;
        return Number(b.purityPct) - Number(a.purityPct);
      });
    } else {
      filtered.sort((a, b) => {
        const da = a.testDate ? new Date(a.testDate).getTime() : new Date(a.createdAt).getTime();
        const db = b.testDate ? new Date(b.testDate).getTime() : new Date(b.createdAt).getTime();
        return db - da;
      });
    }

    return filtered;
  }, [allTests, filters, sort]);

  // Deep-link: open modal for a specific report once data is loaded
  useEffect(() => {
    if (deepLinkHandled.current || deepLinkReportId == null || loading) return;
    const idx = filteredTests.findIndex(t => t.id === deepLinkReportId);
    if (idx === -1) return;
    deepLinkHandled.current = true;
    setModalIndex(idx);
  }, [loading, filteredTests, deepLinkReportId]);

  // Share a single report — copies ?report=<id> URL to clipboard
  const handleShareReport = useCallback((reportId: number) => {
    const url = `${window.location.origin}${window.location.pathname.replace(/\?.*$/, "")}?report=${reportId}`;
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: "Link copied!", duration: 2500 });
    }).catch(() => {
      toast({ title: "Could not copy link", description: "Please copy the URL manually from your browser.", duration: 3000 });
    });
  }, []);

  // Share current filter view — copies the full URL (with active params) to clipboard
  const handleShareFilters = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      toast({ title: "Link copied!", duration: 2500 });
    }).catch(() => {
      toast({ title: "Could not copy link", description: "Please copy the URL manually from your browser.", duration: 3000 });
    });
  }, []);

  // Infinite scroll
  useEffect(() => {
    setDisplayCount(PAGE_SIZE);
  }, [filters, sort]);

  useEffect(() => {
    if (!loaderRef.current) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) setDisplayCount(c => c + PAGE_SIZE);
    }, { threshold: 0.1 });
    obs.observe(loaderRef.current);
    return () => obs.disconnect();
  }, [filteredTests]);

  const displayedTests = filteredTests.slice(0, displayCount);

  const TABS = [
    { id: "reports"   as const, label: "Reports",            icon: <FlaskConical className="w-4 h-4" /> },
    { id: "submit"    as const, label: "Submit",             icon: <Upload className="w-4 h-4" /> },
    { id: "metrics"   as const, label: "Metrics",            icon: <BarChart3 className="w-4 h-4" /> },
    { id: "compare"   as const, label: "Compare",            icon: <Activity className="w-4 h-4" /> },
  ];

  return (
    <PageLayout bare={bare}>
      <SiteAnnouncements />

      {/* Page header + tabs unified block */}
      <div style={{ background: "var(--t-surface)", borderBottom: "1px solid var(--t-border)" }}>
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: "var(--t-blue-10)" }}>
            <FlaskConical className="w-5 h-5" style={{ color: "var(--t-blue)" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight" style={{ color: "var(--t-text)" }}>Lab Reports</h1>
            <p className="text-xs" style={{ color: "var(--t-subtle)" }}>
              Independent &amp; vendor CoA tests · {allTests.length} reports
            </p>
          </div>
        </div>
        <div
          className="flex gap-1 px-4 pt-1 pb-2 overflow-x-auto"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
        >
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all shrink-0 whitespace-nowrap"
              style={{
                background: activeTab === tab.id ? "var(--t-blue)" : "transparent",
                color: activeTab === tab.id ? "#fff" : "var(--t-muted)",
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === "reports" && (
        <>
          <FilterBar
            filters={filters}
            onFilters={setFilters}
            sort={sort}
            onSort={setSort}
            compoundNameOptions={compoundNameOptions}
            labs={labs}
            testTypes={testTypes}
            suppliers={suppliers}
            totalShown={filteredTests.length}
            totalAll={allTests.length}
            onShareFilters={handleShareFilters}
          />

          <div className="px-4 py-4">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
              </div>
            ) : filteredTests.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <TestTube className="w-10 h-10 text-slate-200" />
                <p className="text-slate-400 text-sm">No tests match your filters.</p>
                <button
                  onClick={() => setFilters({ source: "all", compound: "", compoundName: "", lab: "", testType: "", supplier: "", search: "", failedOnly: false })}
                  className="text-sm font-semibold" style={{ color: "var(--t-blue)" }}>
                  Clear filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {displayedTests.map((test, i) => (
                    <TestCard key={test.id} test={test} index={i} onView={() => setModalIndex(i)} onShare={handleShareReport} />
                  ))}
                </div>
                {displayCount < filteredTests.length && (
                  <div ref={loaderRef} className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
                  </div>
                )}
                {displayCount >= filteredTests.length && filteredTests.length > PAGE_SIZE && (
                  <p className="text-center text-xs text-slate-400 py-4">
                    All {filteredTests.length} tests shown
                  </p>
                )}
              </>
            )}
          </div>
        </>
      )}

      {activeTab === "submit" && <SubmitSection />}
      {activeTab === "metrics" && (
        <MetricsTab
          allTests={allTests}
          testsLoading={loading}
          onCompoundClick={(filterVal) => {
            setFilters(f => ({ ...f, compound: filterVal }));
            setActiveTab("reports");
          }}
        />
      )}
      {activeTab === "compare" && (
        <CompareTab
          allTests={allTests}
          initialCompound={initialGraph}
          initialSource={initialGraphSource}
          initialVendor={initialGraphVendor}
        />
      )}


      {/* Report preview modal */}
      <AnimatePresence>
        {modalIndex !== null && (
          <ReportModal
            tests={filteredTests}
            index={modalIndex}
            onClose={() => setModalIndex(null)}
            onChangeIndex={i => setModalIndex(i)}
            onShare={handleShareReport}
          />
        )}
      </AnimatePresence>
    </PageLayout>
  );
}
