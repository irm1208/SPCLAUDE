import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TestTube, Search, X, ExternalLink, CheckCircle2, XCircle,
  Microscope, ChevronDown, ChevronLeft, ChevronRight, Loader2,
  AlertTriangle, ShieldCheck, Send,
  BookOpen, ArrowRight, Activity, Beaker, BarChart3, Upload,
  Filter, Users, Building2, Star, TrendingUp, Award, RefreshCw,
  ClipboardList, Link2, Tag, Sparkles, Share2, SlidersHorizontal, Plus,
  LayoutGrid, Table2
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "@/hooks/use-toast";
import { PROTOCOLS } from "@/data/protocols";
import { PageLayout } from "@/components/PageLayout";
import { PEPTIDE_GROUPS, getCanonicalGroup, getPeptideDisplayName } from "@/lib/peptide-groups";
import { resolveUtherName } from "@/lib/uther-batch-codes";
import { doseForBatchCode } from "@/lib/batch-prefixes";
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

export interface LabTest {
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

const UPPERCASE_UNITS = new Set(["iu", "ui"]);
function normalizeDose(dose: string): string {
  return dose.trim().replace(/(\d)\s*([a-zA-Zµμ%]+)/g, (_, n, u) => {
    const lower = u.toLowerCase();
    return `${n}${UPPERCASE_UNITS.has(lower) ? lower.toUpperCase() : lower}`;
  });
}

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
  mass_purity: "var(--t-blue)",
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
  if (pct >= threshold) return { color: "#059669", bg: "color-mix(in srgb, #059669 10%, transparent)", border: "color-mix(in srgb, #059669 30%, transparent)", label: "Good" };
  return { color: "#DC2626", bg: "color-mix(in srgb, #DC2626 10%, transparent)", border: "color-mix(in srgb, #DC2626 30%, transparent)", label: "Low" };
}

function endotoxinTier(eu: number): { color: string; bg: string; border: string; label: string } {
  if (eu <= 1) return { color: "#059669", bg: "color-mix(in srgb, #059669 10%, transparent)", border: "color-mix(in srgb, #059669 30%, transparent)", label: "Excellent" };
  if (eu <= 5) return { color: "var(--t-blue)", bg: "color-mix(in srgb, var(--t-blue) 10%, transparent)", border: "color-mix(in srgb, var(--t-blue) 30%, transparent)", label: "Acceptable" };
  return { color: "#DC2626", bg: "color-mix(in srgb, #DC2626 10%, transparent)", border: "color-mix(in srgb, #DC2626 30%, transparent)", label: "High" };
}

function cardResultColor(test: LabTest): { color: string; bg: string; border: string; label: string } | null {
  if (test.purityPct != null) return purityTier(test.purityPct, test.peptideName);
  if (test.sterilityPass === true) return { color: "#059669", bg: "color-mix(in srgb, #059669 10%, transparent)", border: "color-mix(in srgb, #059669 30%, transparent)", label: "Pass" };
  if (test.sterilityPass === false) return { color: "#DC2626", bg: "color-mix(in srgb, #DC2626 10%, transparent)", border: "color-mix(in srgb, #DC2626 30%, transparent)", label: "Fail" };
  return null;
}

const VENDOR_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  Uther:  { color: "#1B3A7A", bg: "color-mix(in srgb, #1B3A7A 10%, transparent)",  border: "color-mix(in srgb, #1B3A7A 30%, transparent)" },
  WWB:    { color: "#B45309", bg: "color-mix(in srgb, #B45309 10%, transparent)",    border: "color-mix(in srgb, #B45309 30%, transparent)"  },
};
const VENDOR_FALLBACK_PALETTE = [
  { color: "#0891B2", bg: "color-mix(in srgb, #0891B2 10%, transparent)",   border: "color-mix(in srgb, #0891B2 30%, transparent)"  },
  { color: "var(--t-blue)", bg: "color-mix(in srgb, var(--t-blue) 10%, transparent)",  border: "color-mix(in srgb, var(--t-blue) 30%, transparent)" },
  { color: "#059669", bg: "color-mix(in srgb, #059669 10%, transparent)",   border: "color-mix(in srgb, #059669 30%, transparent)"  },
  { color: "#DB2777", bg: "color-mix(in srgb, #DB2777 10%, transparent)",  border: "color-mix(in srgb, #DB2777 30%, transparent)" },
  { color: "#D97706", bg: "color-mix(in srgb, #D97706 10%, transparent)",   border: "color-mix(in srgb, #D97706 30%, transparent)"  },
];

function vendorAccent(supplier: string) {
  if (VENDOR_COLORS[supplier]) return VENDOR_COLORS[supplier];
  let hash = 0;
  for (let i = 0; i < supplier.length; i++) hash = (hash * 31 + supplier.charCodeAt(i)) | 0;
  return VENDOR_FALLBACK_PALETTE[Math.abs(hash) % VENDOR_FALLBACK_PALETTE.length];
}

function TestTypeBadge({ testType }: { testType: string | null }) {
  if (!testType) return null;
  const label = TEST_TYPE_LABELS[testType] ?? testType;
  const color = TEST_TYPE_COLORS[testType] ?? "#64748b";
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide shrink-0"
      style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color, border: `1px solid color-mix(in srgb, ${color} 25%, transparent)` }}
    >
      {label}
    </span>
  );
}

function SourceBadge({ isThirdParty }: { isThirdParty: boolean }) {
  return isThirdParty ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide"
      style={{ background: "color-mix(in srgb, #F5A623 12%, transparent)", color: "#B4770E", border: "1px solid color-mix(in srgb, #F5A623 30%, transparent)" }}>
      <Star className="w-2.5 h-2.5" /> 3rd Party
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide"
      style={{ background: "color-mix(in srgb, var(--t-muted) 10%, transparent)", color: "var(--t-subtle)", border: "1px solid color-mix(in srgb, var(--t-muted) 20%, transparent)" }}>
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

  useEffect(() => {
    if (!test) return;
    setLoading(true);
    setError("");
    setPreview(null);
    fetch(apiUrl(`/lab-tests/${test.id}/preview`))
      .then(r => r.json())
      .then(d => {
        if (d.type === "image") {
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

  const NavBtn = ({ enabled, onClick, icon }: { enabled: boolean; onClick: () => void; icon: React.ReactNode }) => (
    <button
      onClick={enabled ? onClick : undefined}
      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-95"
      style={{
        background: enabled ? "var(--t-surface2)" : "transparent",
        color: enabled ? "var(--t-text)" : "var(--t-muted)",
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
      className="fixed inset-x-0 bottom-0 z-50 flex items-end md:items-center justify-center"
      style={{ height: "100dvh", background: "rgba(0,0,0,0.65)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{ backdropFilter: "blur(4px)" }} />
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="w-full flex flex-col overflow-hidden md:w-[90vw] md:max-w-[1100px] md:rounded-2xl md:shadow-2xl"
        style={{ height: "95dvh", maxHeight: "95dvh", position: "relative", isolation: "isolate", background: "var(--t-surface)", border: "1px solid var(--t-border)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* HEADER BAR: always pinned at the top */}
        <div className="flex items-center gap-2 px-3 pb-2 pt-3 md:pt-4 md:px-5 shrink-0 border-b" style={{ borderColor: "var(--t-border)", background: "var(--t-surface)" }}>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors" style={{ background: "var(--t-surface2)", color: "var(--t-text)" }}>
            <X className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm leading-tight truncate" style={{ color: "var(--t-text)" }}>{buildTestTitle(test)}</div>
            <div className="text-[10px] font-mono mt-0.5" style={{ color: "var(--t-subtle)" }}>{index + 1} / {tests.length}</div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {onShare && (
              <button onClick={() => onShare(test.id)} className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors" title="Copy share link" style={{ color: "var(--t-text)", background: "transparent" }}>
                <Share2 className="w-4 h-4" />
              </button>
            )}
            <NavBtn enabled={hasPrev} onClick={() => onChangeIndex(index - 1)} icon={<ChevronLeft className="w-4 h-4" />} />
            <NavBtn enabled={hasNext} onClick={() => onChangeIndex(index + 1)} icon={<ChevronRight className="w-4 h-4" />} />
          </div>
        </div>

        {/* BODY: certificate first on mobile, two columns on desktop */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-y-auto overscroll-contain md:overflow-hidden">
        {/* LEFT PANEL: Details */}
        <div className="flex flex-col shrink-0 w-full md:w-80 order-2 md:order-1 border-t md:border-t-0 md:border-r" style={{ borderColor: "var(--t-border)", background: "var(--t-surface)" }}>
          <div className="flex flex-col px-4 md:px-5 py-4 gap-4 flex-1 md:overflow-y-auto">
            {resultColor && (
              <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold self-start border"
                style={{ background: resultColor.bg, color: resultColor.color, borderColor: resultColor.border }}>
                <Activity className="w-3.5 h-3.5" />
                {test.purityPct != null ? `${formatPurity(test.purityPct)}% — ${resultColor.label}` : resultColor.label}
              </div>
            )}

            <div className="space-y-3">
              {test.batchCode && (
                <div>
                  <div className="text-[10px] font-bold tracking-wider mb-1 uppercase" style={{ color: "var(--t-subtle)" }}>Batch</div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-sm font-semibold" style={{ color: "var(--t-text)", background: "var(--t-surface2)", padding: "2px 6px", borderRadius: 4, border: "1px solid var(--t-border)" }}>{test.batchCode}</span>
                    {batchDate && <span className="text-xs" style={{ color: "var(--t-muted)" }}>{batchDate}</span>}
                  </div>
                </div>
              )}
              <div>
                <div className="text-[10px] font-bold tracking-wider mb-1 uppercase" style={{ color: "var(--t-subtle)" }}>Source</div>
                <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--t-text)" }}>
                  {test.supplier}
                  <SourceBadge isThirdParty={test.isThirdPartyTest} />
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold tracking-wider mb-1 uppercase" style={{ color: "var(--t-subtle)" }}>Lab</div>
                <div className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>{test.labName}</div>
              </div>
            </div>

            {hasQuality && (
              <div className="rounded-xl p-3.5 flex flex-col gap-3 border" style={{ background: "var(--t-surface2)", borderColor: "var(--t-border)" }}>
                {test.purityPct != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium" style={{ color: "var(--t-muted)" }}>Purity</span>
                    <span className="text-sm font-bold" style={{ color: purityTier(test.purityPct).color }}>{formatPurity(test.purityPct)}%</span>
                  </div>
                )}
                {test.endotoxinEuMg != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium" style={{ color: "var(--t-muted)" }}>Endotoxin</span>
                    <span className="text-sm font-bold" style={{ color: endotoxinTier(test.endotoxinEuMg).color }}>{test.endotoxinEuMg} EU/Vial</span>
                  </div>
                )}
                {test.mgAmount != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium" style={{ color: "var(--t-muted)" }}>Mass</span>
                    <span className="text-sm font-bold" style={{ color: "var(--t-text)" }}>{test.mgAmount} {test.massUnit ?? "mg"}</span>
                  </div>
                )}
                {test.sterilityPass != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium" style={{ color: "var(--t-muted)" }}>Sterility</span>
                    {test.sterilityPass ? (
                      <span className="text-xs font-bold flex items-center gap-1" style={{ color: "#059669" }}><CheckCircle2 className="w-3 h-3" /> Pass</span>
                    ) : (
                      <span className="text-xs font-bold flex items-center gap-1" style={{ color: "#DC2626" }}><XCircle className="w-3 h-3" /> Fail</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {(test.heavyMetalAs != null || test.heavyMetalCd != null || test.heavyMetalPb != null || test.heavyMetalHg != null) && (
              <div className="rounded-xl p-3.5 flex flex-col gap-2 border" style={{ background: "var(--t-surface2)", borderColor: "var(--t-border)" }}>
                <span className="text-xs font-bold tracking-wider uppercase" style={{ color: "var(--t-muted)" }}>Heavy Metals (ppm)</span>
                {[
                  { sym: "As (Arsenic)", val: test.heavyMetalAs },
                  { sym: "Cd (Cadmium)", val: test.heavyMetalCd },
                  { sym: "Pb (Lead)", val: test.heavyMetalPb },
                  { sym: "Hg (Mercury)", val: test.heavyMetalHg },
                ].filter(m => m.val != null).map(({ sym, val }) => (
                  <div key={sym} className="flex justify-between items-center text-xs">
                    <span style={{ color: "var(--t-muted)" }}>{sym}</span>
                    <span className="font-bold" style={{ color: "var(--t-text)" }}>{val}</span>
                  </div>
                ))}
              </div>
            )}

            {test.blendComponents && parseBlendComponents(test.blendComponents) && (
              <div className="rounded-xl p-3.5 flex flex-col gap-2 border" style={{ background: "var(--t-surface2)", borderColor: "var(--t-border)" }}>
                <span className="text-xs font-bold tracking-wider uppercase" style={{ color: "var(--t-muted)" }}>Blend Breakdown</span>
                {parseBlendComponents(test.blendComponents)!.map((c, i) => (
                  <div key={i} className="flex justify-between items-center text-xs">
                    <span style={{ color: "var(--t-text)" }}>{c.name}</span>
                    <span className="font-mono text-[10px]" style={{ color: "var(--t-subtle)" }}>{c.mg}mg {c.purityPct ? `· ${c.purityPct}%` : ""}</span>
                  </div>
                ))}
              </div>
            )}
            {test.notes && !test.notes.startsWith("Imported via browser helper") && (
              <div className="rounded-xl p-3 border" style={{ background: "color-mix(in srgb, #D97706 10%, transparent)", borderColor: "color-mix(in srgb, #D97706 20%, transparent)" }}>
                <p className="text-[11px] leading-relaxed font-medium" style={{ color: "#B45309" }}>
                  <AlertTriangle className="w-3 h-3 inline mr-1 -mt-0.5" />
                  {test.notes}
                </p>
              </div>
            )}
            <div className="mt-auto pt-4 flex flex-col gap-2">
              <a href={test.url} target="_blank" rel="noreferrer"
                className="w-full py-2.5 rounded-lg text-xs font-bold text-center transition-all flex items-center justify-center gap-2"
                style={{ background: "var(--t-blue)", color: "#fff" }}>
                <ExternalLink className="w-3.5 h-3.5" /> Open Original
              </a>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Document View */}
        <div className="flex-1 flex flex-col min-w-0 shrink-0 min-h-[70dvh] md:min-h-0 order-1 md:order-2" style={{ background: "var(--t-bg)" }}>
          <div className="flex-1 relative overflow-hidden flex items-center justify-center p-4">
            {loading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--t-muted)" }} />
                <p className="text-sm font-medium" style={{ color: "var(--t-muted)" }}>Loading document…</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-3 text-center px-6">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "color-mix(in srgb, #DC2626 10%, transparent)" }}>
                  <XCircle className="w-6 h-6" style={{ color: "#DC2626" }} />
                </div>
                <p className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>{error}</p>
              </div>
            ) : preview?.type === "image" ? (
              <img src={preview.url} alt="Lab Report" className="max-w-full max-h-full object-contain rounded-xl shadow-sm border bg-white" style={{ borderColor: "var(--t-border)" }} />
            ) : preview?.type === "pdf" ? (
              <iframe src={`${preview.proxyUrl}#toolbar=0&navpanes=0`} className="w-full h-full rounded-xl shadow-sm border bg-white" style={{ borderColor: "var(--t-border)" }} />
            ) : (
              <div className="flex flex-col items-center gap-3 text-center px-6">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "var(--t-surface2)" }}>
                  <Link2 className="w-6 h-6" style={{ color: "var(--t-subtle)" }} />
                </div>
                <p className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Preview not available</p>
                <a href={test.url} target="_blank" rel="noreferrer" className="mt-2 text-sm font-bold hover:underline" style={{ color: "var(--t-blue)" }}>
                  Open external link
                </a>
              </div>
            )}
          </div>
        </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── FilterBar ────────────────────────────────────────────────────────────────
interface Filters {
  source: "all" | "vendor" | "third_party";
  compoundName: string;
  lab: string;
  testType: string;
  supplier: string;
  search: string;
  failedOnly: boolean;
}

type SortOption = "newest" | "oldest" | "purity";

function ViewToggle({ view, onViewChange }: { view: "cards" | "table"; onViewChange: (v: "cards" | "table") => void }) {
  return (
    <div className="h-9 shrink-0 rounded-md border flex items-center p-0.5 gap-0.5" style={{ background: "var(--t-bg)", borderColor: "var(--t-border)" }}>
      {([
        { id: "cards" as const, icon: <LayoutGrid className="w-4 h-4" />, title: "Card view" },
        { id: "table" as const, icon: <Table2 className="w-4 h-4" />, title: "Table view" },
      ]).map(opt => (
        <button
          key={opt.id}
          onClick={() => onViewChange(opt.id)}
          title={opt.title}
          aria-pressed={view === opt.id}
          className="h-full px-2 rounded flex items-center justify-center transition-colors"
          style={{
            background: view === opt.id ? "var(--t-surface)" : "transparent",
            color: view === opt.id ? "var(--t-text)" : "var(--t-subtle)",
            boxShadow: view === opt.id ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
          }}
        >
          {opt.icon}
        </button>
      ))}
    </div>
  );
}

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
  view,
  onViewChange,
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
  view: "cards" | "table";
  onViewChange: (v: "cards" | "table") => void;
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

  const selectBase = "appearance-none w-full h-9 pl-3 pr-7 rounded-lg text-xs font-semibold outline-none cursor-pointer border transition-colors";

  return (
    <div style={{ background: "var(--t-surface)", borderBottom: "1px solid var(--t-border)", position: "sticky", top: 0, zIndex: 10 }}>
      <div className="flex items-center gap-2 px-4 py-3 max-w-7xl mx-auto">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--t-subtle)" }} />
          <input
            type="text"
            placeholder="Search compound or batch…"
            value={filters.search}
            onChange={e => set("search")(e.target.value)}
            className="w-full pl-9 pr-3 h-9 rounded-md text-sm outline-none transition-all border"
            style={{ background: "var(--t-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
          />
        </div>

        <button
          onClick={() => setOpen(o => !o)}
          className="h-9 px-3 rounded-md text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all border"
          style={{
            background: open || activeCount > 0 ? "color-mix(in srgb, var(--t-blue) 8%, transparent)" : "var(--t-surface)",
            borderColor: open || activeCount > 0 ? "color-mix(in srgb, var(--t-blue) 30%, transparent)" : "var(--t-border)",
            color: open || activeCount > 0 ? "var(--t-blue)" : "var(--t-text)",
          }}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filter
          {activeCount > 0 && (
            <span className="w-4 h-4 rounded-md text-[10px] flex items-center justify-center ml-1" style={{ background: "var(--t-blue)", color: "#fff" }}>
              {activeCount}
            </span>
          )}
        </button>

        {hasFilters && (
          <button
            onClick={() => { onFilters({ source: "all", compoundName: "", lab: "", testType: "", supplier: "", search: "", failedOnly: false }); setOpen(false); }}
            className="h-9 w-9 rounded-md flex items-center justify-center shrink-0 border transition-colors"
            style={{ background: "var(--t-surface)", borderColor: "var(--t-border)", color: "var(--t-subtle)" }}
            title="Clear filters"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-center gap-2 ml-auto shrink-0">
          <ViewToggle view={view} onViewChange={onViewChange} />
          {onShareFilters && (
            <button
              onClick={onShareFilters}
              className="h-9 w-9 rounded-md flex items-center justify-center shrink-0 border transition-colors"
              style={{ background: "var(--t-surface)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
              title="Share current filter view"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden border-t"
            style={{ borderColor: "var(--t-border)", background: "var(--t-surface)" }}
          >
            <div className="px-4 py-4 space-y-4 max-w-7xl mx-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="relative">
                  <select value={filters.source} onChange={e => set("source")(e.target.value as any)} className={selectBase} style={{ background: "var(--t-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }}>
                    <option value="all">All Sources</option>
                    <option value="vendor">Vendor Tests</option>
                    <option value="third_party">3rd Party</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "var(--t-subtle)" }} />
                </div>
                <div className="relative">
                  <select value={filters.supplier} onChange={e => set("supplier")(e.target.value)} className={selectBase} style={{ background: "var(--t-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }}>
                    <option value="">All Vendors</option>
                    {suppliers.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "var(--t-subtle)" }} />
                </div>
                <div className="relative">
                  <select value={filters.lab} onChange={e => set("lab")(e.target.value)} className={selectBase} style={{ background: "var(--t-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }}>
                    <option value="">All Labs</option>
                    {labs.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "var(--t-subtle)" }} />
                </div>
                <div className="relative">
                  <select value={filters.compoundName} onChange={e => set("compoundName")(e.target.value)} className={selectBase} style={{ background: "var(--t-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }}>
                    <option value="">All Compounds</option>
                    {compoundNameOptions.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "var(--t-subtle)" }} />
                </div>
                {testTypes.length > 0 && (
                  <div className="relative">
                    <select value={filters.testType} onChange={e => set("testType")(e.target.value)} className={selectBase} style={{ background: "var(--t-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }}>
                      <option value="">All Test Types</option>
                      {testTypes.map(k => <option key={k} value={k}>{TEST_TYPE_LABELS[k] ?? k}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "var(--t-subtle)" }} />
                  </div>
                )}
                <div className="relative">
                  <select value={sort} onChange={e => onSort(e.target.value as SortOption)} className={selectBase} style={{ background: "var(--t-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }}>
                    <option value="newest">Most Recent</option>
                    <option value="oldest">Oldest First</option>
                    <option value="purity">Highest Purity</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "var(--t-subtle)" }} />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => onFilters({ ...filters, failedOnly: !filters.failedOnly })}
                  className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide uppercase px-3 py-1.5 rounded-md transition-colors border"
                  style={{
                    background: filters.failedOnly ? "color-mix(in srgb, #DC2626 10%, transparent)" : "var(--t-surface2)",
                    color: filters.failedOnly ? "#DC2626" : "var(--t-muted)",
                    borderColor: filters.failedOnly ? "color-mix(in srgb, #DC2626 30%, transparent)" : "var(--t-border)"
                  }}
                >
                  <AlertTriangle className="w-3.5 h-3.5" /> Failed Only
                </button>
                <div className="text-xs font-semibold" style={{ color: "var(--t-subtle)" }}>
                  Showing {totalShown} of {totalAll}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── TestCard ───────────────────────────────────────────────────────────────
const COA_MUTED = "rgba(235,235,245,0.6)";
const COA_LABEL = "rgba(235,235,245,0.4)";
const COA_GREEN = "#34D399";
const COA_BLUE = "#7C9EF5";
const COA_RED = "#F87171";

// Aurora palettes — deterministic per compound name
const AURORA_PALETTES: [string, string, string][] = [
  ["#FF9E64", "#FF5CA8", "#8B5CF6"], // sunset
  ["#34D399", "#22D3EE", "#6366F1"], // borealis
  ["#C084FC", "#F472B6", "#38BDF8"], // orchid
  ["#FBBF24", "#FB7185", "#A855F7"], // ember
  ["#38BDF8", "#2DD4BF", "#A78BFA"], // ocean
  ["#F472B6", "#E879F9", "#60A5FA"], // rose
];
function auroraFor(name: string | null | undefined): [string, string, string] {
  const s = (name ?? "").toLowerCase().trim();
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AURORA_PALETTES[h % AURORA_PALETTES.length];
}

function coaStatusBadge(test: LabTest): { label: string; color: string } | null {
  if (test.purityPct != null) {
    const tier = purityTier(test.purityPct, test.peptideName);
    return tier.label === "Good" ? { label: "PASS", color: COA_GREEN } : { label: "FAIL", color: COA_RED };
  }
  if (test.endotoxinEuMg != null) {
    const tier = endotoxinTier(test.endotoxinEuMg);
    if (tier.label === "Excellent") return { label: "PASS", color: COA_GREEN };
    if (tier.label === "Acceptable") return { label: "ACCEPTABLE", color: COA_BLUE };
    return { label: "FAIL", color: COA_RED };
  }
  if (test.sterilityPass === true) return { label: "PASS", color: COA_GREEN };
  if (test.sterilityPass === false) return { label: "FAIL", color: COA_RED };
  return null;
}

function CoaBigStat({ label, value, suffix, align = "left" }: { label: string; value: string; suffix?: string; align?: "left" | "right" }) {
  return (
    <div className={`min-w-0 ${align === "right" ? "text-right" : ""}`}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] mb-1 whitespace-nowrap" style={{ color: COA_LABEL }}>{label}</div>
      <div className="font-bold text-[23px] leading-none tracking-tight truncate" style={{ color: "#fff" }}>
        {value}
        {suffix && <span className="text-[13px] font-semibold ml-0.5" style={{ color: "rgba(255,255,255,0.65)" }}>{suffix}</span>}
      </div>
    </div>
  );
}

function CoaRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[13px] font-medium shrink-0" style={{ color: "rgba(255,255,255,0.92)" }}>{label}</span>
      <span className="text-[13px] font-medium truncate" style={{ color: valueColor ?? COA_MUTED }}>{value}</span>
    </div>
  );
}

function TestTable({ tests, indexFor, onView }: { tests: LabTest[]; indexFor: (t: LabTest) => number; onView: (i: number) => void }) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--t-border)", background: "var(--t-surface)" }}>
      <div className="overflow-x-auto">
        <table className="w-full text-left" style={{ minWidth: 860 }}>
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--t-border)" }}>
              {["Compound", "Listed Mass", "Purity", "Actual Mass", "Batch", "Analysis", "Supplier", "Date", "Status"].map(h => (
                <th key={h} className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: "var(--t-subtle)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tests.map(test => {
              const badge = coaStatusBadge(test);
              const batchDate = parseBatchDate(test.batchCode);
              const displayDate = test.testDate ? new Date(test.testDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : batchDate;
              const analysisLabel = test.testType ? (TEST_TYPE_LABELS[test.testType] ?? test.testType) : "—";
              const idx = indexFor(test);
              return (
                <tr
                  key={test.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onView(idx)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onView(idx); } }}
                  className="border-b last:border-b-0 cursor-pointer transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset"
                  style={{ borderColor: "var(--t-border)" }}
                >
                  <td className="px-3 py-2.5 whitespace-nowrap max-w-[240px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[13px] font-bold truncate" style={{ color: "var(--t-text)" }}>{buildTestTitle(test)}</span>
                      <span
                        className="text-[9px] font-extrabold px-1 py-px rounded shrink-0 tracking-wide"
                        title={test.isThirdPartyTest ? "3rd Party" : "Vendor"}
                        style={{ color: "var(--t-subtle)", border: "1px solid var(--t-border)", background: "var(--t-bg)" }}
                      >
                        {test.isThirdPartyTest ? "TP" : "V"}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-[13px] whitespace-nowrap" style={{ color: "var(--t-muted)" }}>{doseForBatchCode(test.batchCode) ?? "—"}</td>
                  <td className="px-3 py-2.5 text-[13px] font-semibold whitespace-nowrap" style={{ color: "var(--t-text)" }}>{test.purityPct != null ? `${formatPurity(test.purityPct)}%` : "—"}</td>
                  <td className="px-3 py-2.5 text-[13px] whitespace-nowrap" style={{ color: "var(--t-muted)" }}>{test.mgAmount != null ? `${test.mgAmount} ${test.massUnit ?? "mg"}` : "—"}</td>
                  <td className="px-3 py-2.5 text-[13px] whitespace-nowrap" style={{ color: "var(--t-muted)" }}>{test.batchCode ?? "—"}</td>
                  <td className="px-3 py-2.5 text-[13px] whitespace-nowrap" style={{ color: "var(--t-muted)" }}>{analysisLabel}</td>
                  <td className="px-3 py-2.5 text-[13px] whitespace-nowrap max-w-[140px] truncate" style={{ color: "var(--t-muted)" }}>{test.supplier ?? "—"}</td>
                  <td className="px-3 py-2.5 text-[13px] whitespace-nowrap" style={{ color: "var(--t-muted)" }}>{displayDate ?? "—"}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {badge ? (
                      <span
                        className="text-[10px] font-extrabold px-2 py-0.5 rounded-full tracking-wide"
                        style={{
                          color: badge.color,
                          background: `color-mix(in srgb, ${badge.color} 12%, transparent)`,
                          border: `1px solid color-mix(in srgb, ${badge.color} 35%, transparent)`,
                        }}
                      >
                        {badge.label}
                      </span>
                    ) : (
                      <span className="text-[13px]" style={{ color: "var(--t-subtle)" }}>—</span>
                    )}
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

function TestCard({ test, index, onView }: { test: LabTest; index: number; onView: (i: number) => void }) {
  const batchDate = parseBatchDate(test.batchCode);
  const displayDate = test.testDate ? new Date(test.testDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : batchDate;
  const badge = coaStatusBadge(test);
  const analysisLabel = test.testType ? (TEST_TYPE_LABELS[test.testType] ?? test.testType) : null;
  const showPurity = test.purityPct != null;
  const showEndotoxinOnly = !showPurity && test.endotoxinEuMg != null;

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}${window.location.pathname}?report=${test.id}`;
    navigator.clipboard?.writeText(url).then(
      () => toast({ title: "Link copied", description: "Report link copied to clipboard." }),
      () => toast({ title: "Could not copy link", variant: "destructive" }),
    );
  };

  const [a1, a2, a3] = auroraFor(test.peptideName ?? buildTestTitle(test));
  const initial = (test.peptideName ?? buildTestTitle(test) ?? "?").trim().charAt(0).toUpperCase() || "?";

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={() => onView(index)}
      onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); onView(index); } }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.2 }}
      className="relative text-left w-full rounded-3xl overflow-hidden cursor-pointer group transition-all duration-200 focus:outline-none focus-visible:ring-2"
      style={{
        background: "linear-gradient(160deg, #0E0D13 0%, #131118 55%, #16131C 100%)",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "0 6px 22px rgba(0,0,0,0.35)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 14px 34px rgba(0,0,0,0.5)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = "0 6px 22px rgba(0,0,0,0.35)";
      }}
    >
      {/* Aurora glow — per-compound palette, bleeding in from the right edge */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none transition-opacity duration-300 group-hover:opacity-100 opacity-90"
        style={{
          background: [
            `radial-gradient(95% 70% at 104% 4%, color-mix(in srgb, ${a1} 78%, transparent) 0%, transparent 68%)`,
            `radial-gradient(80% 65% at 110% 48%, color-mix(in srgb, ${a2} 70%, transparent) 0%, transparent 70%)`,
            `radial-gradient(85% 70% at 102% 100%, color-mix(in srgb, ${a3} 62%, transparent) 0%, transparent 68%)`,
          ].join(", "),
          filter: "blur(26px)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: [
            `radial-gradient(45% 32% at 102% 10%, color-mix(in srgb, ${a1} 70%, transparent) 0%, transparent 72%)`,
            `radial-gradient(35% 28% at 104% 60%, color-mix(in srgb, ${a2} 55%, transparent) 0%, transparent 70%)`,
          ].join(", "),
          filter: "blur(10px)",
        }}
      />

      <div className="relative z-10 p-5 flex flex-col h-full gap-4">
        {/* Header: icon tile left, pills right */}
        <div className="flex items-center justify-between gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-lg"
            style={{
              background: "linear-gradient(150deg, rgba(255,255,255,0.16), rgba(255,255,255,0.06))",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#fff",
            }}
          >
            {initial}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-[11px] font-semibold"
              style={{ background: "rgba(255,255,255,0.09)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.85)" }}
            >
              {test.isThirdPartyTest ? <Star className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
              {test.isThirdPartyTest ? "3rd Party" : "Vendor"}
            </span>
            <button
              onClick={handleShare}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/15"
              style={{ background: "rgba(255,255,255,0.09)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.85)" }}
              title="Copy report link"
              aria-label="Copy report link"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="min-w-0 -mt-1">
          <div className="text-[11px] font-medium" style={{ color: COA_LABEL }}>
            Certificate of Analysis
          </div>
          <h3 className="text-[16px] font-bold leading-snug break-words" style={{ color: "#fff" }}>
            {buildTestTitle(test)}
          </h3>
        </div>

        {/* Big stat */}
        <div className="pt-1">
          {showPurity ? (
            test.mgAmount != null ? (
              <div className="flex items-start justify-between gap-3">
                <CoaBigStat label="Purity" value={Number(test.purityPct).toFixed(2)} suffix="%" />
                <CoaBigStat label="Actual Mass" value={String(test.mgAmount)} suffix={test.massUnit ?? "mg"} align="right" />
              </div>
            ) : (
              <CoaBigStat label="Purity" value={formatPurity(test.purityPct)} suffix="%" />
            )
          ) : showEndotoxinOnly ? (
            <CoaBigStat label="Endotoxin" value={String(test.endotoxinEuMg)} suffix="EU/Vial" />
          ) : test.mgAmount != null ? (
            <CoaBigStat label="Actual Mass" value={String(test.mgAmount)} suffix={test.massUnit ?? "mg"} />
          ) : (
            <CoaBigStat label="Result" value={test.sterilityPass === true ? "Pass" : test.sterilityPass === false ? "Fail" : "—"} />
          )}
        </div>

        {/* Detail rows */}
        <div className="space-y-2.5 pt-1">
          {showPurity && test.endotoxinEuMg != null && (
            <CoaRow
              label="Endotoxin"
              value={`${test.endotoxinEuMg} EU/Vial`}
              valueColor={
                endotoxinTier(test.endotoxinEuMg).label === "Excellent" ? COA_GREEN
                : endotoxinTier(test.endotoxinEuMg).label === "Acceptable" ? COA_BLUE
                : COA_RED
              }
            />
          )}
          <CoaRow label="Batch" value={test.batchCode ?? "—"} />
          <CoaRow label="Analysis" value={analysisLabel ?? "—"} />
          {test.supplier && <CoaRow label="Supplier" value={test.supplier} />}
        </div>

        {/* Footer */}
        <div className="mt-auto pt-3.5" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              {badge && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wide shrink-0" style={{ color: badge.color }}>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {badge.label}
                </span>
              )}
              {displayDate && (
                <span className="text-[11px] font-medium truncate" style={{ color: COA_LABEL }}>
                  {displayDate}
                </span>
              )}
            </div>
            <span
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors group-hover:bg-white/15"
              style={{ background: "rgba(255,255,255,0.09)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.85)" }}
              title="View report"
            >
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
          <div className="text-[10px] font-medium mt-1.5" style={{ color: "rgba(235,235,245,0.3)" }}>
            Tested by {test.labName}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── MetricsTab ───────────────────────────────────────────────────────────────
function MetricsTab({ allTests, testsLoading, onCompoundClick }: { allTests: LabTest[]; testsLoading: boolean; onCompoundClick: (c: string) => void }) {
  const [mf, setMf] = useState<{ supplier: string; source: "all"|"vendor"|"third_party"; testType: string; failedOnly: boolean }>({
    supplier: "", source: "all", testType: "", failedOnly: false
  });

  const supplierOptions = useMemo(() => [...new Set(allTests.map(t => t.supplier).filter(Boolean))].sort(), [allTests]);

  // Server-aggregated metrics (authoritative); refetched whenever the non-failedOnly filters change
  const [serverMetrics, setServerMetrics] = useState<Metrics | null>(null);
  const { supplier: mfSupplier, source: mfSource, testType: mfTestType } = mf;
  useEffect(() => {
    const params = new URLSearchParams();
    if (mfSupplier) params.set("supplier", mfSupplier);
    if (mfSource !== "all") params.set("source", mfSource);
    if (mfTestType) params.set("testType", mfTestType);
    const qs = params.toString();
    let cancelled = false;
    fetch(apiUrl(`/lab-tests/metrics${qs ? `?${qs}` : ""}`))
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => { if (!cancelled) setServerMetrics(data?.overall ? data : null); })
      .catch(() => { if (!cancelled) setServerMetrics(null); });
    return () => { cancelled = true; };
  }, [mfSupplier, mfSource, mfTestType]);

  // Client-side computed metrics — used for failedOnly and as fallback while server metrics load
  const clientMetrics = useMemo(() => {
    let filtered = allTests;
    if (mf.supplier) filtered = filtered.filter(t => t.supplier === mf.supplier);
    if (mf.source === "vendor") filtered = filtered.filter(t => !t.isThirdPartyTest);
    if (mf.source === "third_party") filtered = filtered.filter(t => t.isThirdPartyTest);
    if (mf.testType) filtered = filtered.filter(t => t.testType === mf.testType);
    if (mf.failedOnly) filtered = filtered.filter(t => (t.purityPct != null && t.purityPct < 99) || t.sterilityPass === false || (t.endotoxinEuMg != null && t.endotoxinEuMg > 5));
    return computeMetricsFromTests(filtered);
  }, [allTests, mf]);

  const filteredMetrics = mf.failedOnly ? clientMetrics : (serverMetrics ?? clientMetrics);

  const hasFilters = mf.supplier !== "" || mf.source !== "all" || mf.testType !== "" || mf.failedOnly;

  const selectStyle = {
    background: "var(--t-surface)", border: "1px solid var(--t-border)", color: "var(--t-text)",
    borderRadius: 6, fontSize: 12, padding: "6px 10px", outline: "none", fontWeight: 600
  };

  const statCard = (icon: React.ReactNode, label: string, value: string | number, sub?: string, color?: string) => (
    <div className="rounded-xl p-4 flex flex-col gap-2 border" style={{ background: "var(--t-surface)", borderColor: "var(--t-border)" }}>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `color-mix(in srgb, ${color ?? "var(--t-blue)"} 15%, transparent)`, color: color ?? "var(--t-blue)" }}>{icon}</div>
        <span className="text-sm font-bold" style={{ color: "var(--t-muted)" }}>{label}</span>
      </div>
      <div className="mt-2">
        <div className="text-3xl font-black tracking-tight" style={{ color: "var(--t-text)" }}>{value}</div>
        {sub && <div className="text-[11px] font-semibold mt-1" style={{ color: "var(--t-subtle)" }}>{sub}</div>}
      </div>
    </div>
  );

  if (testsLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-slate-300" /></div>;

  const { overall, byCompound, bySupplier } = filteredMetrics;
  const purityChartData = overall.withPurity > 0 ? [
    { name: "Good ≥99%", value: overall.goodPurity, fill: "#059669" },
    { name: "Low <99%",  value: overall.lowPurity,  fill: "#DC2626" },
  ] : [];

  const sterilityTotal = overall.sterilityPass + overall.sterilityFail;
  const sterilityPassRate = sterilityTotal > 0 ? Math.round((overall.sterilityPass / sterilityTotal) * 100) : null;
  const purityPassTotal = overall.goodPurity + overall.lowPurity;
  const purityPassRate = purityPassTotal > 0 ? Math.round((overall.goodPurity / purityPassTotal) * 100) : null;

  return (
    <div className="px-4 py-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl border" style={{ background: "var(--t-surface)", borderColor: "var(--t-border)" }}>
        <Filter className="w-4 h-4 text-slate-400 ml-1" />
        <select value={mf.supplier} onChange={e => setMf(f => ({ ...f, supplier: e.target.value }))} style={selectStyle}>
          <option value="">All Manufacturers</option>
          {supplierOptions.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={mf.source} onChange={e => setMf(f => ({ ...f, source: e.target.value as any }))} style={selectStyle}>
          <option value="all">All Sources</option>
          <option value="vendor">Vendor Only</option>
          <option value="third_party">3rd Party Only</option>
        </select>
        <select value={mf.testType} onChange={e => setMf(f => ({ ...f, testType: e.target.value }))} style={selectStyle}>
          <option value="">All Test Types</option>
          {Object.entries(TEST_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button
          onClick={() => setMf(f => ({ ...f, failedOnly: !f.failedOnly }))}
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-md transition-colors border"
          style={mf.failedOnly ? { color: "#DC2626", background: "color-mix(in srgb, #DC2626 10%, transparent)", borderColor: "color-mix(in srgb, #DC2626 30%, transparent)" } : { color: "var(--t-muted)", background: "var(--t-surface)", borderColor: "var(--t-border)" }}
        >
          <AlertTriangle className="w-3.5 h-3.5" /> Failed Only
        </button>
        {hasFilters && (
          <button onClick={() => setMf({ supplier: "", source: "all", testType: "", failedOnly: false })} className="text-xs font-bold transition-colors ml-auto" style={{ color: "var(--t-blue)" }}>
            Clear Filters
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCard(<TestTube className="w-4 h-4" />, "Total Tests", overall.total, `${overall.thirdParty} 3rd party, ${overall.vendorTests} vendor`)}
        {purityPassRate != null
          ? statCard(<BarChart3 className="w-4 h-4" />, "Purity Pass Rate", `${purityPassRate}%`, `Avg ${overall.avgPurity ? formatPurity(overall.avgPurity) : "—"}%`, "var(--t-blue)")
          : statCard(<BarChart3 className="w-4 h-4" />, "With Purity", overall.withPurity, "Tests with purity data", "var(--t-blue)")}
        {sterilityPassRate != null
          ? statCard(<ShieldCheck className="w-4 h-4" />, "Sterility Pass", `${sterilityPassRate}%`, `${overall.sterilityPass} pass, ${overall.sterilityFail} fail`, "#059669")
          : statCard(<ShieldCheck className="w-4 h-4" />, "Sterility Tested", overall.withSterility, "Tests with sterility data", "#059669")}
        {statCard(<Users className="w-4 h-4" />, "3rd Party Tests", overall.thirdParty, `${Math.round((overall.thirdParty/Math.max(overall.total,1))*100)}% of total`, "#D97706")}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {byCompound.length > 0 && (
            <div className="rounded-xl p-5 border" style={{ background: "var(--t-surface)", borderColor: "var(--t-border)" }}>
              <div className="flex items-center gap-2 mb-5">
                 <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "color-mix(in srgb, var(--t-blue) 15%, transparent)", color: "var(--t-blue)" }}>
                    <BarChart3 className="w-4 h-4" />
                 </div>
                 <h3 className="text-sm font-bold tracking-wider" style={{ color: "var(--t-text)" }}>Top Compounds Tested</h3>
              </div>
              <p className="text-[11px] mb-4" style={{ color: "var(--t-subtle)" }}>Click a bar to view those tests in Reports</p>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={byCompound.slice(0, 12)} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }}
                  onClick={(data) => {
                    const payload = data?.activePayload?.[0]?.payload;
                    if (!payload?.peptideName) return;
                    const realTests = allTests.filter(t => t.peptideName === payload.peptideName);
                    const titles = [...new Set(realTests.map(t => buildTestTitle(t)))];
                    if (titles.length > 0) onCompoundClick(titles[0]);
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--t-border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "var(--t-muted)" }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="peptideName" type="category" width={110} tick={{ fontSize: 11, fill: "var(--t-text)", fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", borderRadius: 8, fontSize: 12, fontWeight: 600 }} cursor={{ fill: "var(--t-surface2)" }} />
                  <Bar dataKey="count" fill="var(--t-blue)" radius={[0, 4, 4, 0]} barSize={16} style={{ cursor: "pointer" }}>
                    {byCompound.map((r, i) => {
                      const isGood = r.avgPurity != null && r.avgPurity >= 99;
                      const isFail = r.sterilityPass > 0 && r.sterilityFail > 0 ? false : (r.avgPurity != null && r.avgPurity < 99);
                      const fill = isGood ? "#059669" : isFail ? "#DC2626" : "var(--t-blue)";
                      return <Cell key={i} fill={fill} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        <div className="space-y-6">
          {purityChartData.length > 0 && (
             <div className="rounded-xl p-5 border" style={{ background: "var(--t-surface)", borderColor: "var(--t-border)" }}>
               <h3 className="text-sm font-bold tracking-wider mb-5" style={{ color: "var(--t-text)" }}>Purity Breakdown</h3>
               <ResponsiveContainer width="100%" height={160}>
                 <BarChart data={purityChartData} barSize={40}>
                   <CartesianGrid strokeDasharray="3 3" stroke="var(--t-border)" vertical={false} />
                   <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--t-muted)", fontWeight: 600 }} axisLine={false} tickLine={false} />
                   <Tooltip cursor={{ fill: "transparent" }} contentStyle={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", borderRadius: 8, fontSize: 12, fontWeight: 600 }} />
                   <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                     {purityChartData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                   </Bar>
                 </BarChart>
               </ResponsiveContainer>
             </div>
          )}
          {bySupplier.length > 0 && (
            <div className="rounded-xl border overflow-hidden" style={{ background: "var(--t-surface)", borderColor: "var(--t-border)" }}>
              <div className="p-4 border-b" style={{ borderColor: "var(--t-border)", background: "var(--t-surface2)" }}>
                <h3 className="text-sm font-bold tracking-wider" style={{ color: "var(--t-text)" }}>Top Vendors</h3>
              </div>
              <div className="divide-y" style={{ borderColor: "var(--t-border)" }}>
                {bySupplier.slice(0, 5).map((s) => (
                  <div key={s.supplier} className="flex justify-between items-center p-3.5 px-4 transition-colors hover:bg-black/5 dark:hover:bg-white/5">
                    <span className="font-semibold text-sm" style={{ color: "var(--t-text)" }}>{s.supplier}</span>
                    <span className="font-bold text-sm" style={{ color: "var(--t-blue)" }}>{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
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

// ─── Main Page ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 40;

export default function LabTests({ bare }: { bare?: boolean } = {}) {
  const [allTests, setAllTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(() => {
    const params = new URLSearchParams(window.location.search);
    const VALID_SOURCES: Filters["source"][] = ["all", "vendor", "third_party"];
    const rawSource = params.get("source");
    const source: Filters["source"] = VALID_SOURCES.includes(rawSource as Filters["source"]) ? (rawSource as Filters["source"]) : "all";
    return {
      source,
      compoundName: params.get("compoundName") ?? params.get("compound") ?? "",
      lab: params.get("lab") ?? "",
      testType: params.get("testType") ?? "",
      supplier: params.get("supplier") ?? "",
      search: params.get("search") ?? "",
      failedOnly: params.get("failed") === "1",
    };
  });
  const [sort, setSort] = useState<SortOption>("newest");
  
  const initialTab = useMemo(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    return (["reports", "submit", "metrics", "compare"] as const).includes(t as any) ? (t as any) : "reports";
  }, []);
  const initialGraph = useMemo(() => new URLSearchParams(window.location.search).get("graph") ?? undefined, []);
  const initialGraphSource = useMemo(() => new URLSearchParams(window.location.search).get("graphSource") ?? undefined, []);
  const initialGraphVendor = useMemo(() => new URLSearchParams(window.location.search).get("graphVendor") ?? undefined, []);

  const [activeTab, setActiveTab] = useState<"reports" | "submit" | "metrics" | "compare">(initialTab);
  const [modalIndex, setModalIndex] = useState<number | null>(null);
  const [labs, setLabs] = useState<string[]>(LAB_NAMES);
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const loaderRef = useRef<HTMLDivElement>(null);

  const filterSyncSkip = useRef(true);
  useEffect(() => {
    if (filterSyncSkip.current) { filterSyncSkip.current = false; return; }
    const params = new URLSearchParams();
    if (filters.source !== "all") params.set("source", filters.source);
    if (filters.compoundName) params.set("compoundName", filters.compoundName);
    if (filters.lab) params.set("lab", filters.lab);
    if (filters.testType) params.set("testType", filters.testType);
    if (filters.supplier) params.set("supplier", filters.supplier);
    if (filters.search) params.set("search", filters.search);
    if (filters.failedOnly) params.set("failed", "1");
    if (activeTab !== "reports") params.set("tab", activeTab);
    const qs = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (qs ? `?${qs}` : ""));
  }, [filters, activeTab]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(apiUrl("/lab-tests?limit=1000")).then(r => r.json()),
      fetch(apiUrl("/lab-tests/filters")).then(r => r.json()).catch(() => ({ labs: [] }))
    ]).then(([tests, f]) => {
      setAllTests(tests || []);
      if (f.labs?.length) setLabs(f.labs);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const testTypes = useMemo(() => Object.keys(TEST_TYPE_LABELS), []);
  const suppliers = useMemo(() => [...new Set(allTests.map(t => t.supplier).filter(Boolean))].sort(), [allTests]);
  const compoundNameOptions = useMemo(() => [...new Set(allTests.map(buildTestTitle))].sort((a, b) => a.localeCompare(b)), [allTests]);

  const filteredTests = useMemo(() => {
    let filtered = allTests.filter(t => {
      if (filters.source === "vendor" && t.isThirdPartyTest) return false;
      if (filters.source === "third_party" && !t.isThirdPartyTest) return false;
      if (filters.supplier && t.supplier !== filters.supplier) return false;
      if (filters.lab && t.labName.toLowerCase() !== filters.lab.toLowerCase()) return false;
      if (filters.compoundName && buildTestTitle(t) !== filters.compoundName) return false;
      if (filters.testType && t.testType !== filters.testType) return false;
      if (filters.failedOnly && !((t.purityPct != null && t.purityPct < 99) || t.sterilityPass === false || (t.endotoxinEuMg != null && t.endotoxinEuMg > 5))) return false;
      if (filters.search) {
        const norm = filters.search.toLowerCase().replace(/[^a-z0-9]/gi, "");
        const nameNorm = t.peptideName.toLowerCase().replace(/[^a-z0-9]/gi, "");
        const batchNorm = (t.batchCode ?? "").toLowerCase().replace(/[^a-z0-9]/gi, "");
        if (!nameNorm.includes(norm) && !batchNorm.includes(norm)) return false;
      }
      return true;
    });

    return filtered.sort((a, b) => {
      if (sort === "purity") {
        if (a.purityPct == null && b.purityPct == null) return 0;
        if (a.purityPct == null) return 1;
        if (b.purityPct == null) return -1;
        return Number(b.purityPct) - Number(a.purityPct);
      }
      const da = new Date(a.testDate || a.createdAt).getTime();
      const db = new Date(b.testDate || b.createdAt).getTime();
      return sort === "oldest" ? da - db : db - da;
    });
  }, [allTests, filters, sort]);

  // Deep-link: open modal for a specific report once data is loaded
  const deepLinkReportId = useMemo(() => {
    const id = new URLSearchParams(window.location.search).get("report");
    return id ? parseInt(id, 10) : null;
  }, []);
  const deepLinkHandled = useRef(false);
  useEffect(() => {
    if (deepLinkHandled.current || deepLinkReportId == null || loading) return;
    const idx = filteredTests.findIndex(t => t.id === deepLinkReportId);
    if (idx === -1) return;
    deepLinkHandled.current = true;
    setModalIndex(idx);
  }, [loading, filteredTests, deepLinkReportId]);

  useEffect(() => { setDisplayCount(PAGE_SIZE); }, [filters, sort, activeTab]);
  useEffect(() => {
    if (!loaderRef.current) return;
    const obs = new IntersectionObserver(e => { if (e[0].isIntersecting) setDisplayCount(c => c + PAGE_SIZE); }, { rootMargin: "200px" });
    obs.observe(loaderRef.current);
    return () => obs.disconnect();
  }, [filteredTests]);

  // Share current filter view — copies the full URL (with active params) to clipboard
  const handleShareFilters = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      toast({ title: "Link copied!", duration: 2500 });
    }).catch(() => {
      toast({ title: "Could not copy link", description: "Please copy the URL manually from your browser.", duration: 3000 });
    });
  }, []);

  const displayedTests = filteredTests.slice(0, displayCount);

  const [reportsView, setReportsView] = useState<"cards" | "table">(() => {
    try {
      return localStorage.getItem("labtests-view") === "table" ? "table" : "cards";
    } catch {
      return "cards";
    }
  });
  const handleViewChange = useCallback((v: "cards" | "table") => {
    setReportsView(v);
    try { localStorage.setItem("labtests-view", v); } catch { /* ignore */ }
  }, []);

  const TABS = [
    { id: "reports" as const, label: "Reports", icon: <ClipboardList className="w-4 h-4" /> },
    { id: "metrics" as const, label: "Metrics", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "compare" as const, label: "Compare", icon: <TrendingUp className="w-4 h-4" /> },
    { id: "submit" as const, label: "Submit", icon: <Upload className="w-4 h-4" /> },
  ];

  return (
    <PageLayout bare={bare}>
      <SiteAnnouncements />
      <div className="border-b" style={{ background: "var(--t-surface)", borderColor: "var(--t-border)" }}>
        <div className="max-w-7xl mx-auto px-4 pt-5 pb-0">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm" style={{ background: "var(--t-surface)", borderColor: "var(--t-border)" }}>
              <TestTube className="w-5 h-5" style={{ color: "var(--t-text)" }} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight leading-none" style={{ color: "var(--t-text)" }}>Lab Reports</h1>
              <p className="text-[11px] font-medium mt-1 uppercase tracking-wider" style={{ color: "var(--t-subtle)" }}>Third-party verification & community data</p>
            </div>
          </div>
          <div className="flex gap-4 overflow-x-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className="flex items-center gap-1.5 pb-2.5 border-b-2 transition-all whitespace-nowrap text-sm"
                style={{ 
                  borderColor: activeTab === t.id ? "var(--t-text)" : "transparent",
                  color: activeTab === t.id ? "var(--t-text)" : "var(--t-muted)",
                  fontWeight: activeTab === t.id ? 700 : 600
                }}
              >
                <span style={{ color: activeTab === t.id ? "var(--t-blue)" : "inherit" }}>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="min-h-[60vh] pb-24" style={{ background: "var(--t-bg)" }}>
        {activeTab === "reports" && (
          <>
            <FilterBar filters={filters} onFilters={setFilters} sort={sort} onSort={setSort} compoundNameOptions={compoundNameOptions} labs={labs} testTypes={testTypes} suppliers={suppliers} totalShown={filteredTests.length} totalAll={allTests.length} onShareFilters={handleShareFilters} view={reportsView} onViewChange={handleViewChange} />
            <div className="max-w-7xl mx-auto px-4 py-5">
              {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-slate-300" /></div>
              ) : filteredTests.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-14 h-14 rounded-xl mx-auto flex items-center justify-center mb-4 border" style={{ background: "var(--t-surface)", borderColor: "var(--t-border)" }}>
                    <Search className="w-6 h-6" style={{ color: "var(--t-subtle)" }} />
                  </div>
                  <p className="text-base font-bold" style={{ color: "var(--t-text)" }}>No reports found</p>
                  <p className="text-xs mt-1" style={{ color: "var(--t-muted)" }}>Try adjusting your filters or search term.</p>
                  <button onClick={() => setFilters({ source: "all", compoundName: "", lab: "", testType: "", supplier: "", search: "", failedOnly: false })} className="mt-4 px-4 py-1.5 rounded-md text-xs font-bold border transition-colors hover:bg-black/5 dark:hover:bg-white/5" style={{ color: "var(--t-text)", borderColor: "var(--t-border)", background: "var(--t-surface)" }}>
                    Clear filters
                  </button>
                </div>
              ) : reportsView === "table" ? (
                <TestTable tests={displayedTests} indexFor={t => filteredTests.findIndex(ft => ft.id === t.id)} onView={setModalIndex} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
                  {displayedTests.map((t, i) => (
                    <TestCard key={t.id} test={t} index={filteredTests.findIndex(ft => ft.id === t.id)} onView={setModalIndex} />
                  ))}
                </div>
              )}
              {displayedTests.length < filteredTests.length && <div ref={loaderRef} className="h-20 flex items-center justify-center mt-4"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>}
            </div>
          </>
        )}
        {activeTab === "metrics" && <MetricsTab allTests={allTests} testsLoading={loading} onCompoundClick={c => { setFilters(f => ({ ...f, compoundName: c })); setActiveTab("reports"); }} />}
        {activeTab === "compare" && <CompareTab allTests={allTests} initialCompound={initialGraph} initialSource={initialGraphSource} initialVendor={initialGraphVendor} />}
        {activeTab === "submit" && <SubmitSection />}
      </div>

      <AnimatePresence>
        {modalIndex !== null && (
          <ReportModal tests={filteredTests} index={modalIndex} onClose={() => setModalIndex(null)} onChangeIndex={setModalIndex} onShare={id => { navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?report=${id}`).then(() => toast({ title: "Link copied!" }))}} />
        )}
      </AnimatePresence>
    </PageLayout>
  );
}
