import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  FlaskConical, Search, X, Loader2, Users, CheckCircle2,
  Filter, ChevronDown, ArrowRight, TestTube, Tag,
  Building2, Hash, Pill,
} from "lucide-react";
import { PageLayout } from "@/components/PageLayout";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Pool = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  compoundName: string | null;
  manufacturer: string | null;
  batchNumber: string | null;
  capColor: string | null;
  mgSize: string | null;
  manufacturingDate: string | null;
  imageUrl: string | null;
  status: string;
  hasResults: boolean;
  resultPostedAt: string | null;
  targetAmountUsd: number;
  raisedUsd: number;
  contributorCount: number;
  pendingCount: number;
  createdAt: string;
};

// ─── Constants ──────────────────────────────────────────────────────────────────

type QuickFilter = "all" | "results" | "open";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  open:             { label: "Collecting",  color: "#22c55e", bg: "rgba(34,197,94,0.10)",  border: "rgba(34,197,94,0.25)" },
  funded:           { label: "Funded",      color: "#0D9488", bg: "rgba(13,148,136,0.10)", border: "rgba(13,148,136,0.25)" },
  sent_to_lab:      { label: "At Lab",      color: "#7C3AED", bg: "rgba(124,58,237,0.10)", border: "rgba(124,58,237,0.25)" },
  results_received: { label: "Has Results", color: "#059669", bg: "rgba(5,150,105,0.10)",  border: "rgba(5,150,105,0.25)" },
  closed:           { label: "Closed",      color: "#64748B", bg: "rgba(100,116,139,0.10)", border: "rgba(100,116,139,0.25)" },
  cancelled:        { label: "Cancelled",   color: "#DC2626", bg: "rgba(220,38,38,0.10)",  border: "rgba(220,38,38,0.25)" },
};

const FALLBACK_STATUS = { label: "Unknown", color: "#64748B", bg: "rgba(100,116,139,0.10)", border: "rgba(100,116,139,0.25)" };

type CardTheme = {
  accent: string;
  tint: string;
  progressBg: string;
};

const CARD_THEMES: CardTheme[] = [
  { accent: "#2D6BCC", tint: "rgba(45,107,204,0.07)",  progressBg: "rgba(45,107,204,0.10)"  },
  { accent: "#0F766E", tint: "rgba(15,118,110,0.07)",  progressBg: "rgba(15,118,110,0.10)"  },
  { accent: "#6D28D9", tint: "rgba(109,40,217,0.07)",  progressBg: "rgba(109,40,217,0.10)"  },
  { accent: "#B45309", tint: "rgba(180,83,9,0.07)",    progressBg: "rgba(180,83,9,0.10)"    },
  { accent: "#047857", tint: "rgba(4,120,87,0.07)",    progressBg: "rgba(4,120,87,0.10)"    },
  { accent: "#9F1239", tint: "rgba(159,18,57,0.07)",   progressBg: "rgba(159,18,57,0.10)"   },
  { accent: "#0369A1", tint: "rgba(3,105,161,0.07)",   progressBg: "rgba(3,105,161,0.10)"   },
  { accent: "#7C3AED", tint: "rgba(124,58,237,0.07)",  progressBg: "rgba(124,58,237,0.10)"  },
];

function getCardTheme(pool: Pool): CardTheme {
  const key = pool.compoundName ?? pool.manufacturer ?? pool.title;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return CARD_THEMES[Math.abs(h) % CARD_THEMES.length];
}

function norm(s: string) { return s.toLowerCase(); }

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function PublicTestingPools({ bare }: { bare?: boolean } = {}) {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [selectedManufacturers, setSelectedManufacturers] = useState<Set<string>>(new Set());
  const [selectedCompounds, setSelectedCompounds] = useState<Set<string>>(new Set());
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const { data: pools = [], isLoading, isError } = useQuery<Pool[]>({
    queryKey: ["/api/testing-pools"],
    queryFn: async () => {
      const r = await fetch("/api/testing-pools");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    staleTime: 60_000,
  });

  // ── Derived facet options ──────────────────────────────────────────────────
  const manufacturers = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of pools) {
      if (p.manufacturer) map.set(p.manufacturer, (map.get(p.manufacturer) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [pools]);

  const compounds = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of pools) {
      if (p.compoundName) map.set(p.compoundName, (map.get(p.compoundName) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [pools]);

  // ── Filter logic ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = pools;

    // Quick filter
    if (quickFilter === "results") result = result.filter(p => p.hasResults);
    if (quickFilter === "open")    result = result.filter(p => p.status === "open");

    // Facets
    if (selectedManufacturers.size > 0) {
      result = result.filter(p => p.manufacturer && selectedManufacturers.has(p.manufacturer));
    }
    if (selectedCompounds.size > 0) {
      result = result.filter(p => p.compoundName && selectedCompounds.has(p.compoundName));
    }

    // Search — token-based fuzzy: every whitespace-separated token must appear in
    // at least one searchable field (title, compound, manufacturer, batch).
    const rawQ = norm(search.trim());
    if (rawQ) {
      const tokens = rawQ.split(/\s+/).filter(Boolean);
      result = result.filter(p => {
        const haystack = [
          norm(p.title),
          p.compoundName ? norm(p.compoundName) : "",
          p.manufacturer ? norm(p.manufacturer) : "",
          p.batchNumber  ? norm(p.batchNumber)  : "",
        ].join(" ");
        return tokens.every(tok => haystack.includes(tok));
      });
    }

    return result;
  }, [pools, search, quickFilter, selectedManufacturers, selectedCompounds]);

  function toggleMfr(name: string) {
    setSelectedManufacturers(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }

  function toggleCpd(name: string) {
    setSelectedCompounds(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }

  function clearFilters() {
    setSearch("");
    setQuickFilter("all");
    setSelectedManufacturers(new Set());
    setSelectedCompounds(new Set());
  }

  const hasActiveFilters = search !== "" || quickFilter !== "all" || selectedManufacturers.size > 0 || selectedCompounds.size > 0;

  return (
    <PageLayout title="Community Testing Pools" bare={bare}>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="px-4 pt-6 pb-4 md:px-8 md:pt-8">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "var(--t-blue-10)", border: "1px solid var(--t-blue-25)" }}
          >
            <FlaskConical className="w-5 h-5" style={{ color: "var(--t-blue)" }} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--t-text)" }}>Community Testing Pools</h1>
        </div>
        <p className="text-sm max-w-2xl" style={{ color: "var(--t-muted)" }}>
          Community-funded testing pools where members pool funds to send products to independent labs.
          Browse by vendor or compound to find results for specific batches.
        </p>
      </div>

      {/* ── Search + Quick Filters ────────────────────────────────────────── */}
      <div className="px-4 pb-3 md:px-8 flex flex-col gap-3">
        <div className="flex gap-2">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--t-muted)" }} />
            <input
              type="text"
              placeholder="Search by compound, vendor, batch…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl text-sm outline-none"
              style={{
                background: "var(--t-surface2)",
                border: "1px solid var(--t-border)",
                color: "var(--t-text)",
              }}
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5" style={{ color: "var(--t-muted)" }} />
              </button>
            )}
          </div>

          {/* Mobile filter toggle */}
          <button
            onClick={() => setMobileFiltersOpen(v => !v)}
            className="md:hidden flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold"
            style={{
              background: hasActiveFilters ? "var(--t-blue-10)" : "var(--t-surface2)",
              border: `1px solid ${hasActiveFilters ? "var(--t-blue-25)" : "var(--t-border)"}`,
              color: hasActiveFilters ? "var(--t-blue)" : "var(--t-text)",
            }}
          >
            <Filter className="w-4 h-4" />
            Filters
            {(selectedManufacturers.size + selectedCompounds.size) > 0 && (
              <span className="ml-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center"
                style={{ background: "var(--t-blue)", color: "#fff" }}>
                {selectedManufacturers.size + selectedCompounds.size}
              </span>
            )}
          </button>
        </div>

        {/* Quick-filter tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {([
            { key: "all",     label: `All (${pools.length})` },
            { key: "results", label: `Has Results (${pools.filter(p => p.hasResults).length})` },
            { key: "open",    label: `Open (${pools.filter(p => p.status === "open").length})` },
          ] as { key: QuickFilter; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setQuickFilter(key)}
              className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
              style={{
                background: quickFilter === key ? "var(--t-blue)" : "var(--t-surface2)",
                border: `1px solid ${quickFilter === key ? "var(--t-blue)" : "var(--t-border)"}`,
                color: quickFilter === key ? "#fff" : "var(--t-muted)",
              }}
            >
              {label}
            </button>
          ))}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1"
              style={{ color: "var(--t-muted)", background: "transparent" }}
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Body: Facets + Cards ─────────────────────────────────────────── */}
      <div className="flex gap-0 md:gap-6 px-4 pb-8 md:px-8">

        {/* Left panel — desktop */}
        <aside className="hidden md:block w-52 shrink-0">
          <FacetPanel
            manufacturers={manufacturers}
            selectedManufacturers={selectedManufacturers}
            compounds={compounds}
            selectedCompounds={selectedCompounds}
            onToggleMfr={toggleMfr}
            onToggleCpd={toggleCpd}
          />
        </aside>

        {/* Mobile filter drawer */}
        <AnimatePresence>
          {mobileFiltersOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 md:hidden"
                style={{ background: "rgba(0,0,0,0.5)" }}
                onClick={() => setMobileFiltersOpen(false)}
              />
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                className="fixed right-0 top-0 bottom-0 z-50 w-72 overflow-y-auto p-4 md:hidden"
                style={{ background: "var(--t-bg)", borderLeft: "1px solid var(--t-border)" }}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="font-bold text-sm" style={{ color: "var(--t-text)" }}>Filters</span>
                  <button onClick={() => setMobileFiltersOpen(false)}>
                    <X className="w-5 h-5" style={{ color: "var(--t-muted)" }} />
                  </button>
                </div>
                <FacetPanel
                  manufacturers={manufacturers}
                  selectedManufacturers={selectedManufacturers}
                  compounds={compounds}
                  selectedCompounds={selectedCompounds}
                  onToggleMfr={toggleMfr}
                  onToggleCpd={toggleCpd}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Cards */}
        <main className="flex-1 min-w-0">
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--t-muted)" }} />
            </div>
          ) : isError ? (
            <div className="text-center py-20">
              <p className="text-sm" style={{ color: "var(--t-muted)" }}>Failed to load pools. Please try again.</p>
            </div>
          ) : pools.length === 0 ? (
            <EmptyNoPools navigate={navigate} />
          ) : filtered.length === 0 ? (
            <EmptyNoResults onClear={clearFilters} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filtered.map((pool, i) => (
                <motion.div
                  key={pool.id}
                  className="flex"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.4), duration: 0.25 }}
                >
                  <PoolCard pool={pool} navigate={navigate} />
                </motion.div>
              ))}
            </div>
          )}
        </main>
      </div>
    </PageLayout>
  );
}

// ─── Facet Panel ───────────────────────────────────────────────────────────────

function FacetPanel({
  manufacturers, selectedManufacturers, compounds, selectedCompounds,
  onToggleMfr, onToggleCpd,
}: {
  manufacturers: [string, number][];
  selectedManufacturers: Set<string>;
  compounds: [string, number][];
  selectedCompounds: Set<string>;
  onToggleMfr: (name: string) => void;
  onToggleCpd: (name: string) => void;
}) {
  return (
    <div className="space-y-5">
      <FacetGroup
        label="Manufacturer"
        icon={<Building2 className="w-3.5 h-3.5" />}
        items={manufacturers}
        selected={selectedManufacturers}
        onToggle={onToggleMfr}
      />
      <FacetGroup
        label="Compound"
        icon={<Pill className="w-3.5 h-3.5" />}
        items={compounds}
        selected={selectedCompounds}
        onToggle={onToggleCpd}
      />
    </div>
  );
}

function FacetGroup({
  label, icon, items, selected, onToggle,
}: {
  label: string;
  icon: React.ReactNode;
  items: [string, number][];
  selected: Set<string>;
  onToggle: (name: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const visible = expanded ? items : items.slice(0, 5);

  if (items.length === 0) return null;

  return (
    <div>
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-1.5 w-full text-left mb-2"
      >
        <span style={{ color: "var(--t-muted)" }}>{icon}</span>
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--t-text)" }}>{label}</span>
        <ChevronDown
          className="w-3.5 h-3.5 ml-auto transition-transform"
          style={{ color: "var(--t-muted)", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>
      <div className="space-y-0.5">
        {visible.map(([name, count]) => {
          const checked = selected.has(name);
          return (
            <label key={name} className="flex items-center gap-2 py-1 px-1 rounded cursor-pointer group"
              style={{ background: checked ? "var(--t-blue-10)" : "transparent" }}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(name)}
                className="w-3.5 h-3.5 rounded accent-blue-500 shrink-0"
              />
              <span className="flex-1 text-xs truncate" style={{ color: "var(--t-text)" }} title={name}>{name}</span>
              <span className="text-[10px] font-mono shrink-0" style={{ color: "var(--t-muted)" }}>{count}</span>
            </label>
          );
        })}
        {items.length > 5 && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-[11px] px-1 py-0.5 font-semibold"
            style={{ color: "var(--t-blue)" }}
          >
            {expanded ? "Show less" : `+${items.length - 5} more`}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Pool Card ─────────────────────────────────────────────────────────────────

const STAGES = [
  { key: "open",             label: "Collecting" },
  { key: "funded",           label: "Funded" },
  { key: "sent_to_lab",      label: "At Lab" },
  { key: "results_received", label: "Results" },
];
const STATUS_ORDER = ["draft", "open", "funded", "sent_to_lab", "results_received", "closed"];

function PoolCard({ pool, navigate }: { pool: Pool; navigate: (path: string) => void }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const statusCfg = STATUS_CONFIG[pool.status] ?? FALLBACK_STATUS;
  const t = getCardTheme(pool);
  const goal = pool.targetAmountUsd;
  const raised = pool.raisedUsd;
  const pct = goal > 0 ? Math.min(100, (raised / goal) * 100) : 0;
  const curIdx = STATUS_ORDER.indexOf(pool.status);

  return (
    <>
      <div
        className="rounded-xl cursor-pointer group transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.99] flex flex-col h-full overflow-hidden w-full"
        style={{
          background: `linear-gradient(150deg, ${t.tint} 0%, transparent 40%), var(--t-surface)`,
          border: "1px solid var(--t-border)",
          boxShadow: "var(--salt-card-shadow)",
        }}
        onClick={() => navigate(`/pool/${pool.slug}`)}
      >
        {/* ── Top section ─────────────────────────────────────────────────── */}
        <div className="flex items-start gap-3 p-4 sm:p-5 pb-3 sm:pb-3">
          {/* Left: meta + title + vendor */}
          <div className="flex-1 min-w-0 flex flex-col gap-2 min-h-[80px] sm:min-h-[96px]">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-widest shrink-0"
                style={{ color: statusCfg.color, border: `1px solid ${statusCfg.border}`, background: statusCfg.bg }}
              >
                {statusCfg.label}
              </span>
              {pool.hasResults && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: "#22c55e" }} />}
              {pool.contributorCount > 0 && (
                <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--t-subtle)" }}>
                  <Users className="w-3 h-3" />{pool.contributorCount}
                </span>
              )}
            </div>

            <h3
              className="font-bold text-base sm:text-lg leading-snug line-clamp-2"
              style={{ color: "var(--t-text)", letterSpacing: "-0.02em" }}
            >
              {pool.title}
            </h3>

            {pool.manufacturer && (
              <span
                className="self-start inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md"
                style={{
                  background: "var(--t-blue-08)",
                  color: "var(--t-blue)",
                  border: "1px solid var(--t-blue-18)",
                }}
              >
                <Building2 className="w-3 h-3" />
                {pool.manufacturer}
              </span>
            )}
          </div>

          {/* Right: image or flask placeholder */}
          {pool.imageUrl ? (
            <button
              className="shrink-0 focus:outline-none rounded-lg mt-0.5 overflow-hidden"
              onClick={e => { e.stopPropagation(); setLightboxOpen(true); }}
              aria-label="Enlarge product image"
            >
              <img
                src={pool.imageUrl}
                alt="product"
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg object-cover transition-transform duration-200 group-hover:scale-105"
                style={{
                  boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                  border: "1px solid var(--t-border)",
                }}
              />
            </button>
          ) : null}
        </div>

        {/* ── Info chips ───────────────────────────────────────────────────── */}
        {(pool.batchNumber || pool.compoundName || pool.mgSize || pool.capColor || pool.manufacturingDate) && (
          <div className="flex flex-wrap gap-1.5 px-4 sm:px-5 pb-3">
            {pool.batchNumber && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md"
                style={{ background: "var(--t-surface2)", color: "var(--t-subtle)", border: "1px solid var(--t-border)" }}
              >
                <Hash className="w-2.5 h-2.5" />{pool.batchNumber}
              </span>
            )}
            {pool.compoundName && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md"
                style={{ background: "var(--t-surface2)", color: "var(--t-muted)", border: "1px solid var(--t-border)" }}
              >
                <Pill className="w-2.5 h-2.5" style={{ color: t.accent }} />{pool.compoundName}
              </span>
            )}
            {pool.mgSize && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md"
                style={{ background: "var(--t-surface2)", color: "var(--t-muted)", border: "1px solid var(--t-border)" }}
              >
                <TestTube className="w-2.5 h-2.5" style={{ color: t.accent }} />{pool.mgSize}
              </span>
            )}
            {pool.capColor && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md"
                style={{ background: "var(--t-surface2)", color: "var(--t-muted)", border: "1px solid var(--t-border)" }}
              >
                <Tag className="w-2.5 h-2.5" style={{ color: t.accent }} />{pool.capColor}
              </span>
            )}
            {pool.manufacturingDate && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-md font-mono"
                style={{ background: "var(--t-surface2)", color: "var(--t-subtle)", border: "1px solid var(--t-border)" }}
              >
                Mfg: {pool.manufacturingDate}
              </span>
            )}
          </div>
        )}

        {/* ── Funding panel ────────────────────────────────────────────────── */}
        <div
          className="mx-3 sm:mx-4 mb-3 sm:mb-4 mt-auto rounded-lg p-3 sm:p-3.5"
          style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-sm font-bold tabular-nums" style={{ color: "var(--t-text)" }}>
              ${raised.toFixed(0)}
              <span className="text-[11px] font-normal ml-1" style={{ color: "var(--t-subtle)" }}>raised</span>
            </span>
            <span className="text-[11px] font-semibold tabular-nums" style={{ color: t.accent }}>
              {pct.toFixed(1)}%
              <span className="font-normal ml-1" style={{ color: "var(--t-subtle)" }}>of ${goal.toFixed(0)}</span>
            </span>
          </div>

          <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: t.progressBg }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: t.accent }}
            />
          </div>

          <div className="flex items-center">
            {STAGES.map((s, i) => {
              const sIdx = STATUS_ORDER.indexOf(s.key);
              const done = curIdx >= sIdx;
              const active = pool.status === s.key;
              return (
                <div key={s.key} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className="w-2 h-2 rounded-full mb-1 transition-all duration-300"
                      style={{
                        background: done ? t.accent : "var(--t-border)",
                        boxShadow: active ? `0 0 0 3px ${t.progressBg}` : "none",
                      }}
                    />
                    <span
                      className="text-[9px] font-semibold leading-none text-center whitespace-nowrap"
                      style={{ color: active ? t.accent : done ? "var(--t-muted)" : "var(--t-subtle)" }}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < STAGES.length - 1 && (
                    <div
                      className="h-px flex-1 mx-0.5 mt-[-10px]"
                      style={{ background: curIdx > sIdx ? t.accent : "var(--t-border)" }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 pb-4 sm:px-5 sm:pb-5">
          <span className="text-[11px]" style={{ color: "var(--t-subtle)" }}>
            {pool.contributorCount > 0
              ? `${pool.contributorCount} contributor${pool.contributorCount !== 1 ? "s" : ""}`
              : ""}
          </span>
          <span
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-all duration-150 active:scale-95 group-hover:opacity-90"
            style={{ background: "#1B3A7A", color: "#fff" }}
          >
            View Pool <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && pool.imageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
          style={{ background: "rgba(0,0,0,0.80)", backdropFilter: "blur(6px)" }}
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="relative w-full max-w-xs sm:max-w-md md:max-w-lg lg:max-w-xl"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={pool.imageUrl}
              alt={pool.title}
              className="w-full rounded-xl object-contain"
              style={{ maxHeight: "82vh", boxShadow: "0 32px 80px rgba(0,0,0,0.45)" }}
            />
            <button
              className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
              style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}
              onClick={() => setLightboxOpen(false)}
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Empty States ───────────────────────────────────────────────────────────────

function EmptyNoPools({ navigate }: { navigate: (path: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}
      >
        <FlaskConical className="w-8 h-8" style={{ color: "var(--t-muted)" }} />
      </div>
      <div>
        <p className="font-bold text-base" style={{ color: "var(--t-text)" }}>No testing pools yet</p>
        <p className="text-sm mt-1 max-w-xs" style={{ color: "var(--t-muted)" }}>
          Testing pools are community-funded efforts to send products to independent labs.
          They show up here once a pool leader creates and opens one.
        </p>
      </div>
      <button
        onClick={() => navigate("/")}
        className="text-sm font-semibold px-4 py-2 rounded-xl"
        style={{ background: "var(--t-blue)", color: "#fff" }}
      >
        Go to Home
      </button>
    </div>
  );
}

function EmptyNoResults({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
      <Search className="w-8 h-8" style={{ color: "var(--t-muted)" }} />
      <p className="font-bold text-sm" style={{ color: "var(--t-text)" }}>No pools match your filters</p>
      <p className="text-xs" style={{ color: "var(--t-muted)" }}>Try adjusting your search or clearing the filters.</p>
      <button
        onClick={onClear}
        className="text-xs font-bold px-3 py-1.5 rounded-lg"
        style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-text)" }}
      >
        Clear filters
      </button>
    </div>
  );
}
