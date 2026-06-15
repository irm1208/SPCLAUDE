import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TestTube, Loader2, X, Calendar, CheckCircle2, XCircle, ArrowLeft, FlaskConical, ShieldCheck, ChevronDown } from "lucide-react";
import { ReportModal, parseBatchDate } from "@/pages/LabTests";
import { getCanonicalGroup, getPeptideDisplayName, splitBlendComponents } from "@/lib/peptide-groups";

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

function extractMgAmount(productName: string): number | null {
  const m = productName.match(/(\d+(?:\.\d+)?)\s*mg\b/i);
  return m ? parseFloat(m[1]) : null;
}

export function extractPeptideName(productName: string): string {
  return productName
    .replace(/\([^)]*\)/g, "")
    .replace(/\d+(\.\d+)?\s*mg\b/gi, "")
    .replace(/\d+(\.\d+)?\s*iu\b/gi, "")
    .replace(/\b(uther|peptide|research|grade|kit|vial|lyophilized|lyophilised)\b/gi, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase()
    .trim();
}

type TestResult = "pass" | "fail" | "unknown";

function purityColorForPeptide(pct: number, peptideName: string): string {
  const isHGH = getCanonicalGroup(peptideName)?.canonical === "HGH";
  if (isHGH) return pct >= 96 ? "#059669" : "#DC2626";
  return pct >= 98 ? "#059669" : pct >= 95 ? "#2563EB" : "#DC2626";
}

function getTestResult(t: LabTest): TestResult {
  if (t.sterilityPass === false) return "fail";
  if (t.purityPct != null) {
    const passThreshold = getCanonicalGroup(t.peptideName)?.canonical === "HGH" ? 96 : 95;
    if (t.purityPct >= passThreshold) return "pass";
    return "fail";
  }
  if (t.sterilityPass === true) return "pass";
  return "unknown";
}

function QualityBar({ tests }: { tests: LabTest[] }) {
  if (tests.length === 0) return null;
  const results = tests.map(getTestResult);
  const pass = results.filter(r => r === "pass").length;
  const fail = results.filter(r => r === "fail").length;
  const unknown = results.filter(r => r === "unknown").length;
  const total = tests.length;

  return (
    <div className="px-4 pt-3 pb-2 shrink-0">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Test Quality Overview</p>
        <div className="flex items-center gap-2.5 text-[10px] font-semibold">
          {pass > 0 && <span className="text-emerald-600 flex items-center gap-0.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> {pass} pass</span>}
          {fail > 0 && <span className="text-red-500 flex items-center gap-0.5"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> {fail} fail</span>}
          {unknown > 0 && <span className="text-slate-400 flex items-center gap-0.5"><span className="w-2 h-2 rounded-full bg-slate-300 inline-block" /> {unknown} n/a</span>}
        </div>
      </div>
      <div className="flex h-3 rounded-full overflow-hidden gap-px">
        {results.map((r, i) => (
          <div
            key={i}
            className="flex-1 transition-all"
            style={{
              background: r === "pass" ? "#10B981" : r === "fail" ? "#F87171" : "#CBD5E1",
            }}
          />
        ))}
      </div>
    </div>
  );
}

type SortOption = "newest" | "oldest" | "purity";

function applySortToTests<T extends { testDate: string | null; createdAt: string; purityPct: number | null }>(
  tests: T[],
  sort: SortOption
): T[] {
  const arr = [...tests];
  if (sort === "newest") {
    arr.sort((a, b) => {
      const da = a.testDate ? new Date(a.testDate).getTime() : new Date(a.createdAt).getTime();
      const db = b.testDate ? new Date(b.testDate).getTime() : new Date(b.createdAt).getTime();
      return db - da;
    });
  } else if (sort === "oldest") {
    arr.sort((a, b) => {
      const da = a.testDate ? new Date(a.testDate).getTime() : new Date(a.createdAt).getTime();
      const db = b.testDate ? new Date(b.testDate).getTime() : new Date(b.createdAt).getTime();
      return da - db;
    });
  } else if (sort === "purity") {
    arr.sort((a, b) => {
      if (a.purityPct == null && b.purityPct == null) return 0;
      if (a.purityPct == null) return 1;
      if (b.purityPct == null) return -1;
      return Number(b.purityPct) - Number(a.purityPct);
    });
  }
  return arr;
}

type FilterTab = "all" | "vendor" | "third";

function FilterTabs({ active, onChange, vendorCount, thirdCount, allCount }: {
  active: FilterTab;
  onChange: (t: FilterTab) => void;
  vendorCount: number;
  thirdCount: number;
  allCount: number;
}) {
  const tabs: { id: FilterTab; label: string; count: number; icon: React.ReactNode }[] = [
    { id: "all",    label: "All",        count: allCount,    icon: <TestTube className="w-3 h-3" /> },
    { id: "vendor", label: "Vendor",     count: vendorCount, icon: <FlaskConical className="w-3 h-3" /> },
    { id: "third",  label: "3rd Party",  count: thirdCount,  icon: <ShieldCheck className="w-3 h-3" /> },
  ];
  return (
    <div className="flex gap-1.5 px-4 pb-3 shrink-0">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold border transition-all"
          style={{
            background: active === tab.id ? "#EFF6FF" : "#F8FAFC",
            color: active === tab.id ? "#2563EB" : "#94A3B8",
            borderColor: active === tab.id ? "#BFDBFE" : "#E2E8F0",
          }}
        >
          {tab.icon}
          {tab.label}
          {tab.count > 0 && (
            <span
              className="ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold"
              style={{
                background: active === tab.id ? "#DBEAFE" : "#E2E8F0",
                color: active === tab.id ? "#1D4ED8" : "#94A3B8",
              }}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function formatTestDate(testDate: string | null): string | null {
  if (!testDate) return null;
  try {
    const d = new Date(testDate + (testDate.includes("T") ? "" : "T00:00:00"));
    if (isNaN(d.getTime())) return testDate;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return testDate; }
}

function TestCard({ t, onView }: { t: LabTest; onView: () => void }) {
  const batchDate = parseBatchDate(t.batchCode);
  const displayDate = formatTestDate(t.testDate) ?? batchDate;
  const result = getTestResult(t);
  const hasQuality = t.purityPct != null || t.endotoxinEuMg != null || t.sterilityPass != null || t.mgAmount != null;

  const dotColor = result === "pass" ? "#10B981" : result === "fail" ? "#F87171" : "#CBD5E1";

  const purityColor = (pct: number) => purityColorForPeptide(pct, t.peptideName);

  const endotoxinColor = (eu: number) =>
    eu <= 1 ? "#059669" : eu <= 5 ? "#2563EB" : "#DC2626";

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: "1px solid var(--t-border, #E2E8F0)", background: "var(--t-surface, #FFFFFF)" }}
    >
      <div className="flex items-start gap-3 p-3.5">
        <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: dotColor }} />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            {t.isThirdPartyTest ? (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                style={{ color: "#7C3AED", background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.25)" }}
              >3rd Party</span>
            ) : (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                style={{ color: "#2563EB", background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.25)" }}
              >Vendor</span>
            )}
            {t.batchCode && (
              <span className="text-[10px] font-mono" style={{ color: "var(--t-subtle, #71717A)" }}>{t.batchCode}</span>
            )}
            {displayDate && (
              <span className="text-[10px] flex items-center gap-0.5" style={{ color: "var(--t-subtle, #71717A)" }}>
                <Calendar className="w-2.5 h-2.5" />{displayDate}
              </span>
            )}
          </div>
          <p className="text-xs font-semibold mb-0.5" style={{ color: "var(--t-text, #1A1D1F)" }}>
            {getPeptideDisplayName(t.peptideName)}{t.mgAmount != null ? ` · ${t.mgAmount}mg` : ""}
          </p>
          <p className="text-[11px] font-semibold mb-0.5" style={{ color: "#2563EB" }}>{t.supplier}</p>
          <p className="text-[10px] mb-1" style={{ color: "var(--t-subtle, #71717A)" }}>{t.labName}</p>
          {hasQuality ? (
            <div className="flex flex-wrap gap-2">
              {t.purityPct != null && (
                <span className="text-xs font-bold" style={{ color: purityColor(Number(t.purityPct)) }}>
                  Purity {Number(t.purityPct).toFixed(1)}%
                </span>
              )}
              {t.mgAmount != null && t.purityPct == null && t.endotoxinEuMg == null && t.sterilityPass == null && (
                <span className="text-xs font-bold" style={{ color: "#4B7BB5" }}>
                  Mass {t.mgAmount} mg
                </span>
              )}
              {t.endotoxinEuMg != null && (
                <span className="text-xs font-bold" style={{ color: endotoxinColor(Number(t.endotoxinEuMg)) }}>
                  {t.endotoxinEuMg} EU/Vial
                </span>
              )}
              {t.sterilityPass === true && (
                <span className="text-xs font-bold flex items-center gap-0.5" style={{ color: "#059669" }}>
                  <CheckCircle2 className="w-3 h-3" /> Sterile
                </span>
              )}
              {t.sterilityPass === false && (
                <span className="text-xs font-bold flex items-center gap-0.5" style={{ color: "#DC2626" }}>
                  <XCircle className="w-3 h-3" /> Failed sterility
                </span>
              )}
            </div>
          ) : (
            <p className="text-[11px] italic" style={{ color: "var(--t-subtle, #71717A)" }}>No quality data — view CoA for details</p>
          )}
        </div>
        <button
          onClick={onView}
          className="shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95"
          style={{ background: "rgba(37,99,235,0.08)", color: "#2563EB", border: "1px solid rgba(37,99,235,0.25)" }}
        >
          View CoA
        </button>
      </div>
    </div>
  );
}

function resolveSearchInfo(productName: string): {
  searchTerms: string[];
  useExact: boolean;
  displayTitle: string;
  mgAmount: number | null;
  filteredMgAmount: number | null;
} {
  const mgAmount = extractMgAmount(productName);

  // Check if the product name itself is a known group FIRST —
  // this lets blend product names like "TB4 + BPC-157" resolve to their own
  // specific group rather than being split into component searches.
  const extractedTop = extractPeptideName(productName);
  const topGroup = getCanonicalGroup(productName) ?? getCanonicalGroup(extractedTop);

  if (!topGroup) {
    // Not a known group — try splitting as a generic blend
    const blendComponents = splitBlendComponents(productName);
    if (blendComponents.length > 1) {
      const terms = blendComponents.flatMap(part => {
        const extracted = extractPeptideName(part);
        const group = getCanonicalGroup(part) ?? getCanonicalGroup(extracted);
        if (group?.dbSearchTerms?.length) return group.dbSearchTerms;
        return group ? [group.canonical] : extracted ? [extracted] : [];
      }).filter(t => t.length > 0);
      const displayTitle = blendComponents
        .map(part => {
          const extracted = extractPeptideName(part);
          const group = getCanonicalGroup(part) ?? getCanonicalGroup(extracted);
          return group?.displayName ?? part.trim();
        })
        .join(" + ");
      // Generic blends use exact matching for each resolved term
      return { searchTerms: terms, useExact: true, displayTitle, mgAmount, filteredMgAmount: null };
    }
  }

  // Single known compound (or unknown one-part name)
  const group = topGroup;
  const extracted = extractedTop;
  const hasDbTerms = (group?.dbSearchTerms?.length ?? 0) > 0;
  const searchTerms = hasDbTerms
    ? group!.dbSearchTerms!
    : [group ? group.canonical : extracted];
  const useExact = hasDbTerms;
  const filteredMgAmount = group?.mgSpecific ? mgAmount : null;

  const compound = group?.displayName ?? group?.canonical ?? extracted;
  const capitalised = compound.charAt(0).toUpperCase() + compound.slice(1);
  const displayTitle = mgAmount != null ? `${capitalised} · ${mgAmount}mg` : capitalised;

  return { searchTerms, useExact, displayTitle, mgAmount, filteredMgAmount };
}

export function LabReportPopup({ productName, vendor, gbLabSupplier, onClose }: {
  productName: string;
  vendor?: string;
  gbLabSupplier?: string | null;
  onClose: () => void;
}) {
  const [allTests, setAllTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [sort, setSort] = useState<SortOption>("newest");
  const [viewIdx, setViewIdx] = useState<number | null>(null);
  const [supplierFilter, setSupplierFilter] = useState("");

  const { searchTerms, useExact, displayTitle, filteredMgAmount } = resolveSearchInfo(productName);
  const effectiveSupplier = gbLabSupplier?.trim() || (vendor?.trim() ?? "");
  const isProtocolContext = !effectiveSupplier;

  const searchKey = searchTerms.join("|") + (useExact ? ":exact" : "");

  useEffect(() => {
    setLoading(true);
    const fetches = searchTerms.map(term => {
      const params = new URLSearchParams({ limit: "200" });
      if (useExact) {
        params.set("peptide", term);
      } else {
        params.set("q", term);
      }
      if (effectiveSupplier) params.set("supplier", effectiveSupplier);
      if (filteredMgAmount != null) params.set("mgAmount", String(filteredMgAmount));
      return fetch(`/api/lab-tests?${params.toString()}`)
        .then(r => r.json())
        .then(d => (Array.isArray(d) ? d : []) as LabTest[])
        .catch(() => [] as LabTest[]);
    });
    Promise.all(fetches)
      .then(results => {
        const seen = new Set<number>();
        const combined: LabTest[] = [];
        for (const batch of results) {
          for (const test of batch) {
            if (!seen.has(test.id)) {
              seen.add(test.id);
              combined.push(test);
            }
          }
        }
        setAllTests(combined);
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchKey, effectiveSupplier, filteredMgAmount]);

  const supplierFiltered = useMemo(() => {
    if (!isProtocolContext || !supplierFilter) return allTests;
    return allTests.filter(t => t.supplier === supplierFilter);
  }, [allTests, supplierFilter, isProtocolContext]);

  const uniqueSuppliers = useMemo(() => {
    if (!isProtocolContext) return [];
    const set = new Set<string>();
    for (const t of allTests) {
      if (t.supplier) set.add(t.supplier);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allTests, isProtocolContext]);

  const vendorTests = useMemo(() => supplierFiltered.filter(t => !t.isThirdPartyTest), [supplierFiltered]);
  const thirdTests  = useMemo(() => supplierFiltered.filter(t => t.isThirdPartyTest),  [supplierFiltered]);

  const visibleTests = useMemo(() => {
    const base = filter === "vendor" ? vendorTests : filter === "third" ? thirdTests : supplierFiltered;
    return applySortToTests(base, sort);
  }, [filter, vendorTests, thirdTests, supplierFiltered, sort]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/65 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 320 }}
        className="fixed bottom-0 left-0 right-0 z-[101] flex flex-col rounded-t-3xl overflow-hidden"
        style={{ maxHeight: "88vh", background: "var(--t-surface, #FFFFFF)", border: "1px solid var(--t-border, #E2E8F0)" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-0.5 shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        {/* Header */}
        <div
          className="px-4 py-3 flex items-center gap-3 shrink-0"
          style={{ borderBottom: "1px solid var(--t-border, #E2E8F0)" }}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <TestTube className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--t-blue, #2D6BCC)" }} />
              <p className="text-sm font-bold leading-tight" style={{ color: "var(--t-text, #1A1D1F)" }}>Lab Reports</p>
            </div>
            <p className="text-xs truncate mt-0.5" style={{ color: "var(--t-subtle, #71717A)" }}>{displayTitle}</p>
            {effectiveSupplier && (
              <span
                className="inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded"
                style={{ color: "#2563EB", background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.25)" }}
              >
                {effectiveSupplier}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "var(--t-surface2, #F4F4F5)" }}
          >
            <X className="w-4 h-4" style={{ color: "var(--t-muted, #4B5563)" }} />
          </button>
        </div>

        {/* Quality bar — shown once loaded */}
        {!loading && allTests.length > 0 && <QualityBar tests={supplierFiltered} />}

        {isProtocolContext && !loading && uniqueSuppliers.length > 1 && (
          <div className="px-4 pt-2 pb-1 shrink-0">
            <div className="relative inline-flex">
              <select
                value={supplierFilter}
                onChange={e => { setSupplierFilter(e.target.value); setFilter("all"); }}
                className="appearance-none text-xs font-semibold pl-3 pr-7 py-1.5 rounded-full border cursor-pointer outline-none"
                style={{
                  background: supplierFilter ? "var(--t-blue, #2D6BCC)" : "var(--t-surface2, #F4F4F5)",
                  color: supplierFilter ? "#fff" : "var(--t-text, #1A1D1F)",
                  borderColor: supplierFilter ? "var(--t-blue, #2D6BCC)" : "var(--t-border, #E2E8F0)",
                }}
              >
                <option value="">All Vendors</option>
                {uniqueSuppliers.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <ChevronDown
                className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none"
                style={{ color: supplierFilter ? "#fff" : "var(--t-muted, #4B5563)" }}
              />
            </div>
          </div>
        )}

        {/* Filter tabs + sort */}
        {!loading && supplierFiltered.length > 0 && (
          <>
            <FilterTabs
              active={filter}
              onChange={setFilter}
              allCount={supplierFiltered.length}
              vendorCount={vendorTests.length}
              thirdCount={thirdTests.length}
            />
            <div className="px-4 pb-3 shrink-0 flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--t-subtle, #71717A)" }}>Sort</span>
              <div className="relative">
                <select
                  value={sort}
                  onChange={e => setSort(e.target.value as SortOption)}
                  className="appearance-none text-xs font-semibold pl-3 pr-7 py-1.5 rounded-full border cursor-pointer outline-none"
                  style={{ background: "var(--t-surface2, #F4F4F5)", color: "var(--t-text, #1A1D1F)", borderColor: "var(--t-border, #E2E8F0)" }}
                >
                  <option value="newest">Most Recent</option>
                  <option value="oldest">Oldest First</option>
                  <option value="purity">Highest Purity</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: "var(--t-muted, #4B5563)" }} />
              </div>
            </div>
          </>
        )}

        {/* Test list — outer div is the scroll container (no flex to avoid shrinking cards) */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="px-4 pt-2 pb-6 flex flex-col gap-2.5">
            {loading && (
              <div className="flex justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
              </div>
            )}
            {!loading && visibleTests.length === 0 && (
              <div className="text-center py-12 text-slate-400 text-sm">
                {allTests.length === 0
                  ? "No lab reports found for this product"
                  : "No reports match this filter"}
              </div>
            )}
            {!loading && visibleTests.map((t) => (
              <TestCard
                key={t.id}
                t={t}
                onView={() => setViewIdx(visibleTests.indexOf(t))}
              />
            ))}
          </div>
        </div>
      </motion.div>

      {/* CoA viewer — opens above the popup at z-[110] */}
      <AnimatePresence>
        {viewIdx !== null && (
          <motion.div
            key="coa"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110]"
          >
            <ReportModal
              tests={visibleTests}
              index={viewIdx}
              onClose={() => setViewIdx(null)}
              onChangeIndex={setViewIdx}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function LabTestsListPopup({ productName, vendor, gbLabSupplier, onClose }: {
  productName: string;
  vendor?: string;
  gbLabSupplier?: string | null;
  onClose: () => void;
}) {
  const [tests, setTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewIdx, setViewIdx] = useState<number | null>(null);

  const { searchTerms, useExact, displayTitle, filteredMgAmount } = resolveSearchInfo(productName);
  const effectiveSupplier = gbLabSupplier?.trim() || (vendor?.trim() ?? "");
  const searchKey = searchTerms.join("|") + (useExact ? ":exact" : "");

  useEffect(() => {
    setLoading(true);
    const fetches = searchTerms.map(term => {
      const params = new URLSearchParams({ limit: "200" });
      if (useExact) {
        params.set("peptide", term);
      } else {
        params.set("q", term);
      }
      if (effectiveSupplier) params.set("supplier", effectiveSupplier);
      if (filteredMgAmount != null) params.set("mgAmount", String(filteredMgAmount));
      return fetch(`/api/lab-tests?${params.toString()}`)
        .then(r => r.json())
        .then(d => (Array.isArray(d) ? d : []) as LabTest[])
        .catch(() => [] as LabTest[]);
    });
    Promise.all(fetches).then(results => {
      const seen = new Set<number>();
      const combined: LabTest[] = [];
      for (const batch of results) for (const t of batch) {
        if (!seen.has(t.id)) { seen.add(t.id); combined.push(t); }
      }
      setTests(combined);
    }).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchKey, effectiveSupplier, filteredMgAmount]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-[70] rounded-t-3xl overflow-hidden flex flex-col"
        style={{ maxHeight: "80vh", background: "var(--t-surface, #FFFFFF)", border: "1px solid var(--t-border, #E2E8F0)" }}
      >
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: "var(--t-border, #E2E8F0)" }} />
        </div>
        <div
          className="px-5 py-3 flex items-center justify-between shrink-0"
          style={{ borderBottom: "1px solid var(--t-border, #E2E8F0)" }}
        >
          <div>
            <div className="flex items-center gap-2">
              <TestTube className="w-4 h-4" style={{ color: "var(--t-blue, #2D6BCC)" }} />
              <h3 className="font-bold text-sm" style={{ color: "var(--t-text, #1A1D1F)" }}>Lab Reports</h3>
            </div>
            <p className="text-xs mt-0.5" style={{ color: "var(--t-subtle, #71717A)" }}>{displayTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "var(--t-surface2, #F4F4F5)" }}
          >
            <X className="w-4 h-4" style={{ color: "var(--t-muted, #4B5563)" }} />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="px-4 py-4 flex flex-col gap-3">
          {loading && (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>
          )}
          {!loading && tests.length === 0 && (
            <div className="text-center py-8 text-sm" style={{ color: "var(--t-subtle, #71717A)" }}>No test reports found for this product</div>
          )}
          {!loading && tests.map((t, i) => {
            const batchDate = parseBatchDate(t.batchCode);
            const hasQuality = t.purityPct != null || t.endotoxinEuMg != null || t.sterilityPass != null;
            const purityColor = (pct: number) => purityColorForPeptide(pct, t.peptideName);
            const endotoxinColor = (eu: number) => eu <= 1 ? "#059669" : eu <= 5 ? "#2563EB" : "#DC2626";
            return (
              <div
                key={t.id}
                className="rounded-xl p-3.5 flex items-start gap-3"
                style={{ background: "var(--t-surface2, #F4F4F5)", border: "1px solid var(--t-border, #E2E8F0)" }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold mb-1" style={{ color: "var(--t-text, #1A1D1F)" }}>
                    {getPeptideDisplayName(t.peptideName)}{t.mgAmount != null ? ` · ${t.mgAmount}mg` : ""}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    {t.mgAmount != null && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ color: "#2563EB", background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.2)" }}>
                        {t.mgAmount}mg
                      </span>
                    )}
                    {t.batchCode && <span className="text-[10px] font-mono" style={{ color: "var(--t-subtle, #71717A)" }}>{t.batchCode}</span>}
                    {batchDate && (
                      <span className="text-[10px] flex items-center gap-1" style={{ color: "var(--t-subtle, #71717A)" }}>
                        <Calendar className="w-3 h-3" />{batchDate}
                      </span>
                    )}
                  </div>
                  {hasQuality ? (
                    <div className="flex flex-wrap gap-3">
                      {t.purityPct != null && (
                        <span className="text-xs font-bold" style={{ color: purityColor(Number(t.purityPct)) }}>
                          Purity {Number(t.purityPct).toFixed(1)}%
                        </span>
                      )}
                      {t.endotoxinEuMg != null && (
                        <span className="text-xs font-bold" style={{ color: endotoxinColor(Number(t.endotoxinEuMg)) }}>
                          {t.endotoxinEuMg} EU/Vial
                        </span>
                      )}
                      {t.sterilityPass === true && (
                        <span className="text-xs font-bold flex items-center gap-0.5" style={{ color: "#059669" }}>
                          <CheckCircle2 className="w-3 h-3" /> Sterile
                        </span>
                      )}
                      {t.sterilityPass === false && (
                        <span className="text-xs font-bold flex items-center gap-0.5" style={{ color: "#DC2626" }}>
                          <XCircle className="w-3 h-3" /> Failed
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs italic" style={{ color: "var(--t-subtle, #71717A)" }}>Tap to view CoA report</p>
                  )}
                </div>
                <button
                  onClick={() => setViewIdx(i)}
                  className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold"
                  style={{ color: "#2563EB", background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.2)" }}
                >
                  View
                </button>
              </div>
            );
          })}
          </div>
        </div>
      </motion.div>
      <AnimatePresence>
        {viewIdx !== null && (
          <ReportModal
            tests={tests}
            index={viewIdx}
            onClose={() => setViewIdx(null)}
            onChangeIndex={setViewIdx}
          />
        )}
      </AnimatePresence>
    </>
  );
}
