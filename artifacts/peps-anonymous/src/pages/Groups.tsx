import React, { useEffect, useRef, useState, useMemo } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Users, UsersRound, Package, LogOut,
  Loader2, AlertCircle, RefreshCw, ChevronRight, Info, X,
  FlaskConical, Zap, Activity, Dna, Leaf, Microscope, HeartPulse, Brain,
  Clock, Calendar, TestTube, TriangleAlert, Star, RefreshCcw,
  ChevronDown, Hash, Check, Search, Boxes, Globe,
} from "lucide-react";
import { useAccount, useLogout, useMyGroupBuys, useJoinGroupBuy, useActiveGroupBuys, useCountryLegs, type GroupBuySummary } from "@/hooks/use-account";
import { RulesetModal } from "@/components/RulesetModal";
import { PageLayout } from "@/components/PageLayout";
import { LabReportPopup } from "@/components/LabTestsPopup";

const STATUS_DOT: Record<string, string> = {
  draft:    "#94A3B8",
  active:   "#10B981",
  closed:   "#3B82F6",
  archived: "#6B7280",
};

const STATUS_LABEL: Record<string, string> = {
  draft:    "Draft",
  active:   "Active",
  closed:   "Closed",
  archived: "Archived",
};

const PALETTE: Array<{
  accent: string;
  gradient: string;
  blobColor: string;
  icon: React.ElementType;
}> = [
  { accent: "#5B8DEF", gradient: "linear-gradient(135deg, #0D1B2A 0%, #162A44 100%)", blobColor: "rgba(91,141,239,0.14)",  icon: FlaskConical },
  { accent: "#F59E0B", gradient: "linear-gradient(135deg, #1A1208 0%, #2C1F0A 100%)", blobColor: "rgba(245,158,11,0.12)",  icon: Zap },
  { accent: "#22D3EE", gradient: "linear-gradient(135deg, #061819 0%, #0D2D2E 100%)", blobColor: "rgba(34,211,238,0.12)",  icon: Activity },
  { accent: "#A78BFA", gradient: "linear-gradient(135deg, #0F0A1E 0%, #1D1040 100%)", blobColor: "rgba(167,139,250,0.12)", icon: Dna },
  { accent: "#34D399", gradient: "linear-gradient(135deg, #061209 0%, #0E2414 100%)", blobColor: "rgba(52,211,153,0.12)",  icon: Leaf },
  { accent: "#38BDF8", gradient: "linear-gradient(135deg, #040E1A 0%, #0A1E35 100%)", blobColor: "rgba(56,189,248,0.12)",  icon: Microscope },
  { accent: "#F472B6", gradient: "linear-gradient(135deg, #180613 0%, #2C0C22 100%)", blobColor: "rgba(244,114,182,0.12)", icon: HeartPulse },
  { accent: "#C084FC", gradient: "linear-gradient(135deg, #0A0618 0%, #17102E 100%)", blobColor: "rgba(192,132,252,0.12)", icon: Brain },
];

function getPalette(index: number) {
  return PALETTE[index % PALETTE.length];
}

interface GBProduct { id: string; name: string; price: number; vendor: string; }

// ── Stock level helpers ──────────────────────────────────────────────────────
type StockLevel = "out" | "low" | "medium" | "high";
interface StockItem { productName: string; qiyunleCode: string; stock: number; }

function getStockLevel(stock: number): StockLevel {
  if (stock === 0)   return "out";
  if (stock <= 25)   return "low";
  if (stock <= 70)   return "medium";
  return "high";
}

const STOCK_META: Record<StockLevel, { label: string; abbr: string; color: string; bg: string; border: string; dot: string }> = {
  out:    { label: "Out of Stock", abbr: "Out",  color: "#ef4444", bg: "rgba(239,68,68,0.1)",  border: "rgba(239,68,68,0.3)",  dot: "#ef4444" },
  low:    { label: "Low Stock",    abbr: "Low",  color: "#f97316", bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.3)", dot: "#f97316" },
  medium: { label: "In Stock",     abbr: "Stock",color: "#ca8a04", bg: "rgba(202,138,4,0.1)",  border: "rgba(202,138,4,0.3)",  dot: "#ca8a04" },
  high:   { label: "Well Stocked", abbr: "High", color: "#16a34a", bg: "rgba(22,163,74,0.1)",  border: "rgba(22,163,74,0.3)",  dot: "#16a34a" },
};

// ── UtherStockModal ──────────────────────────────────────────────────────────
function UtherStockModal({ items, onClose }: { items: StockItem[]; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<StockLevel | null>(null);

  const dedupedItems = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      map.set(item.productName, (map.get(item.productName) ?? 0) + item.stock);
    }
    return Array.from(map.entries()).map(([productName, stock]) => ({ productName, stock }));
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return dedupedItems.filter(i => {
      if (q && !i.productName.toLowerCase().includes(q)) return false;
      if (levelFilter && getStockLevel(i.stock) !== levelFilter) return false;
      return true;
    });
  }, [dedupedItems, search, levelFilter]);

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
        className="fixed bottom-0 left-0 right-0 z-[70] rounded-t-3xl flex flex-col"
        style={{ maxHeight: "85vh", background: "#0f1322", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="px-4 py-3 flex items-center gap-3 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
              <Boxes className="w-2.5 h-2.5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm leading-tight">Stock Availability</h3>
              <p className="text-white/40 text-[10px]">Salt&amp;Peps · Updated at last sync</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.07)" }}>
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2.5 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search products…"
              className="w-full pl-8 pr-3 py-2 rounded-xl text-sm text-white placeholder-white/25 outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
            />
          </div>
        </div>

        {/* Filter chips */}
        <div className="px-4 py-2 flex items-center gap-2 flex-wrap shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: "rgba(255,255,255,0.02)" }}>
          <button
            onClick={() => setLevelFilter(null)}
            className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
            style={{
              background: levelFilter === null ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.07)",
              color: levelFilter === null ? "#fff" : "rgba(255,255,255,0.45)",
              border: `1px solid ${levelFilter === null ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.08)"}`,
            }}
          >
            All
          </button>
          {(["out", "low", "medium", "high"] as StockLevel[]).map(lv => {
            const m = STOCK_META[lv];
            const active = levelFilter === lv;
            return (
              <button
                key={lv}
                onClick={() => setLevelFilter(active ? null : lv)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                style={{
                  background: active ? m.bg : "rgba(255,255,255,0.06)",
                  color: active ? m.color : "rgba(255,255,255,0.45)",
                  border: `1px solid ${active ? m.border : "rgba(255,255,255,0.08)"}`,
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: m.dot }} />
                {m.label}
              </button>
            );
          })}
        </div>

        {/* Product list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-center text-white/30 text-sm py-8">No products found</p>
          ) : (
            filtered.map((item, i) => {
              const lv = getStockLevel(item.stock);
              const m = STOCK_META[lv];
              return (
                <div
                  key={i}
                  className="px-4 py-3 flex items-center gap-3"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-white/90 text-sm font-medium truncate">{item.productName}</p>
                    <div className="mt-1.5 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (item.stock / 100) * 100)}%`, background: m.dot, opacity: 0.65 }} />
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: m.dot, opacity: 0.65 }} />
                      <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>GB order</span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shrink-0" style={{ background: m.bg, color: m.color, border: `1px solid ${m.border}` }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.dot }} />
                    {m.label}
                  </span>
                </div>
              );
            })
          )}
        </div>

        <div className="px-4 py-3 shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="text-white/20 text-xs text-center">GB order fill shown in dim · refreshes every 2 hours</p>
        </div>
      </motion.div>
    </>
  );
}

type InfoCardType = "info" | "update" | "warning" | "important";

const INFO_CARD_TYPE_META: Record<InfoCardType, { label: string; icon: React.ElementType; color: string; bg: string; border: string }> = {
  info:      { label: "Info",      icon: Info,          color: "#2563EB", bg: "rgba(37,99,235,0.08)",   border: "rgba(37,99,235,0.2)" },
  update:    { label: "Update",    icon: RefreshCcw,    color: "#0891B2", bg: "rgba(8,145,178,0.08)",   border: "rgba(8,145,178,0.2)" },
  warning:   { label: "Warning",   icon: TriangleAlert, color: "#D97706", bg: "rgba(217,119,6,0.08)",   border: "rgba(217,119,6,0.2)" },
  important: { label: "Important", icon: Star,          color: "#DC2626", bg: "rgba(220,38,38,0.08)",   border: "rgba(220,38,38,0.2)" },
};

function formatPostedAt(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function GBInfoModal({ gb, onClose, onShowLabReport }: {
  gb: GroupBuySummary;
  onClose: () => void;
  onShowLabReport: (product: { name: string; vendor: string }) => void;
}) {
  const cards = gb.infoCards ?? [];
  const [products, setProducts] = useState<GBProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productLabTestsMap, setProductLabTestsMap] = useState<Record<string, boolean>>({});
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [showStockModal, setShowStockModal] = useState(false);

  // Map from product name (lowercase) → stock item for fast lookup
  const stockByName = useMemo(() => {
    const m = new Map<string, StockItem>();
    stockItems.forEach(s => m.set(s.productName.toLowerCase(), s));
    return m;
  }, [stockItems]);

  // Fetch stock data (only if modal is enabled on the admin side)
  useEffect(() => {
    fetch("/api/inventory/uther-stock", { credentials: "include" })
      .then(r => r.ok ? r.json() : { enabled: false, items: [] })
      .then(d => { if (d.enabled) setStockItems(d.items ?? []); })
      .catch(() => {});
  }, []);

  const labTestsInFlight = useRef<Set<string>>(new Set());

  useEffect(() => {
    setProductsLoading(true);
    fetch(`/api/group-buys/${gb.id}/products`, { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then(d => setProducts(Array.isArray(d) ? d : []))
      .catch(() => setProducts([]))
      .finally(() => setProductsLoading(false));
  }, [gb.id]);

  useEffect(() => {
    if (productsLoading || products.length === 0) return;
    products.forEach(p => {
      const key = p.vendor ? `${p.name}::${p.vendor}` : p.name;
      if (labTestsInFlight.current.has(key)) return;
      labTestsInFlight.current.add(key);
      const params = new URLSearchParams({ limit: "1" });
      params.set("peptide", p.name);
      if (p.vendor) params.set("supplier", p.vendor);
      fetch(`/api/lab-tests?${params}`, { credentials: "include" })
        .then(r => r.ok ? r.json() : [])
        .then(data => setProductLabTestsMap(prev => ({ ...prev, [p.name]: Array.isArray(data) && data.length > 0 })))
        .catch(() => setProductLabTestsMap(prev => ({ ...prev, [p.name]: false })));
    });
  }, [productsLoading, products]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl flex flex-col bg-white"
        style={{ maxHeight: "85vh", border: "1px solid var(--t-border)" }}
      >
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>
        <div className="px-4 py-3 flex items-center gap-3 shrink-0 border-b border-slate-100">
          <h3 className="text-slate-900 font-bold text-sm flex-1">{gb.name}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 shrink-0">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {gb.description && (
            <p className="text-sm text-slate-600 leading-relaxed">{gb.description}</p>
          )}
          {cards.map((card, i) => {
            const cardType = (card.type ?? "info") as InfoCardType;
            const meta = INFO_CARD_TYPE_META[cardType] ?? INFO_CARD_TYPE_META.info;
            const TypeIcon = meta.icon;
            return (
              <div key={i} className="rounded-xl p-4" style={{ background: meta.bg, border: `1px solid ${meta.border}` }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
                    style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}
                  >
                    <TypeIcon className="w-3 h-3" />
                    {meta.label}
                  </span>
                </div>
                <p className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: meta.color }}>
                  {card.icon ? `${card.icon} ` : ""}{card.title}
                </p>
                {card.postedAt && (
                  <p className="text-[10px] text-slate-400 mb-1">{formatPostedAt(card.postedAt)}</p>
                )}
                <p className="text-sm text-slate-600 leading-relaxed">{card.body}</p>
              </div>
            );
          })}
          {/* Products with prices + inline lab report buttons + stock pills */}
          {(productsLoading || products.length > 0) && (
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Products</p>
              {productsLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
                </div>
              ) : (
                <>
                  {products.map(p => {
                    const stockItem = stockByName.get(p.name.toLowerCase());
                    const lv = stockItem ? getStockLevel(stockItem.stock) : null;
                    const meta = lv ? STOCK_META[lv] : null;
                    return (
                      <div key={p.id} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0 gap-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <p className="text-sm text-slate-700 leading-snug truncate">{p.name}</p>
                          {meta && (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 whitespace-nowrap"
                              style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.dot }} />
                              {meta.abbr}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {productLabTestsMap[p.name] === true && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onShowLabReport({ name: p.name, vendor: p.vendor }); }}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 whitespace-nowrap"
                            >
                              <TestTube className="w-3 h-3" /> Reports
                            </button>
                          )}
                          <p className="text-sm font-semibold text-slate-800">£{Number(p.price).toFixed(2)}</p>
                        </div>
                      </div>
                    );
                  })}
                  {/* Stock status button — only shown when admin has enabled the modal and there are stock items */}
                  {stockItems.length > 0 && (
                    <button
                      onClick={() => setShowStockModal(true)}
                      className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold"
                      style={{ background: "rgba(99,102,241,0.08)", color: "#6366f1", border: "1px solid rgba(99,102,241,0.2)" }}
                    >
                      <Boxes className="w-3.5 h-3.5" />
                      View Stock Availability
                    </button>
                  )}
                </>
              )}
            </div>
          )}
          {!gb.description && cards.length === 0 && !productsLoading && products.length === 0 && (
            <p className="text-center text-slate-400 text-sm py-2">No info available for this group buy yet.</p>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {showStockModal && (
          <UtherStockModal items={stockItems} onClose={() => setShowStockModal(false)} />
        )}
      </AnimatePresence>
    </>
  );
}

function JoinModal({ onClose }: { onClose: () => void }) {
  const [selectedGbId, setSelectedGbId] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [selectedCountryCode, setSelectedCountryCode] = useState("");
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [countryLegInvite, setCountryLegInvite] = useState("");
  const [inviteValidated, setInviteValidated] = useState(false);
  const [validatingInvite, setValidatingInvite] = useState(false);
  const [inviteValidateError, setInviteValidateError] = useState<string | null>(null);

  // Unique ID section
  const [uniqueId, setUniqueId] = useState("");
  const [idError, setIdError] = useState("");
  const [idPending, setIdPending] = useState(false);
  const [idNeedsPin, setIdNeedsPin] = useState(false);
  const [idPin, setIdPin] = useState("");

  const [showRulesetModal, setShowRulesetModal] = useState(false);
  const [pendingJoin, setPendingJoin] = useState<(() => void) | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const join = useJoinGroupBuy();
  const { account } = useAccount();
  const { data: activeGbs = [], isLoading: gbsLoading } = useActiveGroupBuys();
  const { data: countryLegs = [], isLoading: legsLoading } = useCountryLegs(
    selectedGbId && activeGbs.find(g => g.id === selectedGbId)?.countryLegsEnabled ? selectedGbId : null
  );

  const userCountry = account?.country ?? null;

  // Filter GBs: if a GB has reshippers assigned, only show it when the user's country matches.
  // Exception: if country legs are enabled, skip this check — the leg itself controls access.
  const visibleGbs = activeGbs.filter(gb => {
    if (gb.reshipperCountries.length === 0) return true;
    if (!userCountry) return true;
    if (gb.countryLegsEnabled) return true;
    return gb.reshipperCountries.includes(userCountry);
  });

  const selectedGb = visibleGbs.find(g => g.id === selectedGbId) ?? null;
  const needsPin = selectedGb?.requiresPin ?? false;
  const hasCountryLegs = selectedGb?.countryLegsEnabled ?? false;
  const selectedLeg = countryLegs.find(l => l.countryCode === selectedCountryCode) ?? null;
  const needsLegInvite = hasCountryLegs && selectedLeg?.inviteEnabled;

  // Close dropdowns on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  useEffect(() => {
    if (!countryDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target as Node)) {
        setCountryDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [countryDropdownOpen]);

  const needsRuleAcceptance = !!account && (account.ruleAcceptedVersion ?? 0) < (account.rulesetVersion ?? 1);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!selectedGbId) { setError("Please select a group buy"); return; }
    if (needsPin && !pin) { setError("This group buy requires a PIN"); return; }
    if (hasCountryLegs && !selectedCountryCode) { setError("Please select your country"); return; }
    if (needsLegInvite && !countryLegInvite.trim()) { setError("An invite code is required for your country group"); return; }
    const doJoin = async () => {
      try {
        await join.mutateAsync({
          groupBuyId: selectedGbId,
          invitePin: pin || undefined,
          countryCode: hasCountryLegs ? selectedCountryCode : undefined,
          countryLegInvite: needsLegInvite ? countryLegInvite.trim() : undefined,
        });
        onClose();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to join");
      }
    };
    if (needsRuleAcceptance) {
      setPendingJoin(() => doJoin);
      setShowRulesetModal(true);
      return;
    }
    await doJoin();
  };

  const handleIdJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIdError("");
    const trimmed = uniqueId.trim();
    if (!trimmed) { setIdError("Please paste a unique ID"); return; }
    if (idNeedsPin && !idPin.trim()) { setIdError("Please enter the invite PIN"); return; }
    const doJoin = async () => {
      setIdPending(true);
      try {
        await join.mutateAsync({
          groupBuyId: trimmed,
          invitePin: idNeedsPin ? idPin.trim() : undefined,
        });
        onClose();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Group buy not found or invalid ID";
        // If the GB requires a country selection, surface the country picker by
        // promoting the access code into the main GB selection so the existing
        // country-leg UI appears. The user then picks a country and submits via
        // the main "Join Group Buy" button.
        if (/select your country|invite code is required to join this country group/i.test(msg)) {
          setSelectedGbId(trimmed);
          setError(msg);
          setIdError("");
        } else if (/invite PIN is required/i.test(msg)) {
          // Hidden GB requires a PIN — show the PIN input (not an error, just a next step)
          setIdNeedsPin(true);
          setIdPin("");
          setIdError("");
        } else {
          setIdError(msg);
        }
      } finally {
        setIdPending(false);
      }
    };
    if (needsRuleAcceptance) {
      setPendingJoin(() => doJoin);
      setShowRulesetModal(true);
      return;
    }
    await doJoin();
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 8 }}
        transition={{ type: "spring", damping: 32, stiffness: 380 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-5 pointer-events-none"
      >
        <div className="w-full max-w-sm rounded-3xl overflow-hidden pointer-events-auto bg-white shadow-2xl">

          {/* ── Header ── */}
          <div className="px-5 pt-4 pb-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#EEF3FF" }}>
              <Users className="w-5 h-5" style={{ color: "#2D6BCC" }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-base text-slate-900 leading-tight">Join a Group Buy</h3>
              <p className="text-xs text-slate-400 mt-0.5">Members-only pricing, shipped together</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-slate-100">
              <X className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>

          <div className="h-px bg-slate-100" />

          {/* ── Browse section ── */}
          <form onSubmit={handleJoin} className="px-4 pt-3 pb-3 space-y-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Select Group Buy</p>

              {/* Custom dropdown trigger */}
              <div ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen(o => !o)}
                  disabled={join.isPending || gbsLoading}
                  className="w-full rounded-xl px-4 py-2.5 flex items-center justify-between text-sm transition-all"
                  style={{
                    background: "#F3F4F6",
                    border: dropdownOpen ? "1.5px solid #2D6BCC" : "1.5px solid transparent",
                  }}
                >
                  <span className={selectedGb ? "text-slate-900 font-medium" : "text-slate-400"}>
                    {gbsLoading ? "Loading…" : selectedGb ? selectedGb.name : "Choose a group buy…"}
                  </span>
                  {gbsLoading
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400 shrink-0" />
                    : <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
                  }
                </button>

                {/* Inline expandable list */}
                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="mt-1 rounded-xl overflow-hidden" style={{ border: "1px solid #E5E7EB" }}>
                        {visibleGbs.length === 0 ? (
                          <p className="px-4 py-3 text-sm text-slate-400">
                            {userCountry ? `No open group buys available for ${userCountry} right now.` : "No open group buys right now."}
                          </p>
                        ) : visibleGbs.map((gb, i) => (
                          <button
                            key={gb.id}
                            type="button"
                            onClick={() => {
                              setSelectedGbId(gb.id);
                              setDropdownOpen(false);
                              setPin("");
                              setError("");
                              setSelectedCountryCode("");
                              setCountryLegInvite("");
                              setInviteValidated(false);
                              setInviteValidateError(null);
                            }}
                            className="w-full px-4 py-2.5 flex items-center justify-between text-sm text-left hover:bg-slate-50 transition-colors"
                            style={{ borderBottom: i < visibleGbs.length - 1 ? "1px solid #F3F4F6" : undefined }}
                          >
                            <span className="font-medium text-slate-800">{gb.name}</span>
                            {gb.id === selectedGbId && <Check className="w-3.5 h-3.5 shrink-0" style={{ color: "#2D6BCC" }} />}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* ── Country picker (only when GB has country legs) ── */}
            {hasCountryLegs && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Your Country</p>
                <div ref={countryDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setCountryDropdownOpen(o => !o)}
                    disabled={join.isPending || legsLoading}
                    className="w-full rounded-xl px-4 py-2.5 flex items-center justify-between text-sm transition-all"
                    style={{
                      background: "#F3F4F6",
                      border: countryDropdownOpen ? "1.5px solid #2D6BCC" : "1.5px solid transparent",
                    }}
                  >
                    <span className={selectedLeg ? "text-slate-900 font-medium" : "text-slate-400"}>
                      {legsLoading ? "Loading countries…" : selectedLeg ? selectedLeg.countryName : "Select your country…"}
                    </span>
                    {legsLoading
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400 shrink-0" />
                      : <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${countryDropdownOpen ? "rotate-180" : ""}`} />
                    }
                  </button>
                  <AnimatePresence>
                    {countryDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                      >
                        <div
                          className="mt-1 rounded-xl overflow-y-auto"
                          style={{ border: "1px solid #E5E7EB", maxHeight: "13rem", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
                        >
                          {countryLegs.length === 0 ? (
                            <p className="px-4 py-3 text-sm text-slate-400">No countries configured yet.</p>
                          ) : countryLegs.map((leg, i) => (
                            <button
                              key={leg.id}
                              type="button"
                              onClick={() => {
                                setSelectedCountryCode(leg.countryCode);
                                setCountryDropdownOpen(false);
                                setCountryLegInvite("");
                                setInviteValidated(false);
                                setInviteValidateError(null);
                              }}
                              className="w-full px-4 py-2.5 flex items-center justify-between text-sm text-left hover:bg-slate-50 transition-colors"
                              style={{ borderBottom: i < countryLegs.length - 1 ? "1px solid #F3F4F6" : undefined }}
                            >
                              <span className="font-medium text-slate-800">{leg.countryName}</span>
                              <span className="flex items-center gap-2">
                                {leg.inviteEnabled && <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded">Invite required</span>}
                                {leg.countryCode === selectedCountryCode && <Check className="w-3.5 h-3.5 shrink-0" style={{ color: "#2D6BCC" }} />}
                              </span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* ── Reshipper preview — shown when a country with an assigned reshipper is selected ── */}
            {selectedLeg && selectedLeg.reshippers.length > 0 && (
              <div
                className="rounded-xl px-4 py-3 flex items-start gap-3"
                style={{ background: "rgba(45,107,204,0.06)", border: "1.5px solid rgba(45,107,204,0.18)" }}
              >
                <Globe className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#2D6BCC" }} />
                <div className="min-w-0">
                  <p className="text-xs font-bold" style={{ color: "#2D6BCC" }}>
                    {selectedLeg.reshippers.length === 1
                      ? `Reshipped by — ${selectedLeg.countryName}`
                      : `Reshippers — ${selectedLeg.countryName}`}
                  </p>
                  {selectedLeg.reshippers.length === 1 ? (
                    <p className="text-xs mt-0.5" style={{ color: "#1e293b" }}>
                      @{selectedLeg.reshippers[0].telegramUsername}
                    </p>
                  ) : (
                    <p className="text-xs mt-0.5" style={{ color: "#1e293b" }}>
                      {selectedLeg.reshippers.map(r => `@${r.telegramUsername}`).join(" · ")}
                    </p>
                  )}
                  <p className="text-[11px] mt-1" style={{ color: "#64748b" }}>
                    Your order for {selectedLeg.countryName} will be handled by{" "}
                    {selectedLeg.reshippers.length === 1 ? "this reshipper" : "one of these reshippers"}.
                  </p>
                </div>
              </div>
            )}

            {/* ── No reshipper yet — subtle notice ── */}
            {selectedLeg && selectedLeg.reshippers.length === 0 && (
              <div
                className="rounded-xl px-4 py-2.5 flex items-center gap-3"
                style={{ background: "rgba(245,158,11,0.06)", border: "1.5px solid rgba(245,158,11,0.2)" }}
              >
                <Globe className="w-4 h-4 shrink-0" style={{ color: "#D97706" }} />
                <p className="text-xs" style={{ color: "#92400e" }}>
                  No reshipper assigned for {selectedLeg.countryName} yet — check back soon.
                </p>
              </div>
            )}

            {/* ── Country leg invite code ── */}
            {needsLegInvite && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Country Invite Code</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={countryLegInvite}
                    onChange={e => { setCountryLegInvite(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "")); setInviteValidated(false); setInviteValidateError(null); }}
                    placeholder="XXXX-XXXX-XXXX"
                    disabled={join.isPending || validatingInvite}
                    autoFocus
                    className="flex-1 rounded-xl px-4 py-2.5 tracking-widest text-center font-mono text-sm focus:outline-none"
                    style={{ background: "#F3F4F6", border: `1.5px solid ${inviteValidated ? "#16A34A" : inviteValidateError ? "#DC2626" : "transparent"}` }}
                  />
                  <button
                    type="button"
                    disabled={!countryLegInvite.trim() || validatingInvite || join.isPending || inviteValidated}
                    onClick={async () => {
                      setValidatingInvite(true);
                      setInviteValidateError(null);
                      try {
                        const res = await fetch(`/api/group-buys/${selectedGbId}/validate-country-invite`, {
                          method: "POST", credentials: "include",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ countryCode: selectedCountryCode, inviteCode: countryLegInvite }),
                        });
                        if (res.ok) { setInviteValidated(true); }
                        else { const d = await res.json().catch(() => ({})); setInviteValidateError(d.error ?? "Invalid code"); }
                      } finally { setValidatingInvite(false); }
                    }}
                    className="rounded-xl px-3 py-2 text-xs font-bold shrink-0 disabled:opacity-40 transition-all"
                    style={inviteValidated ? { background: "rgba(22,163,74,0.1)", color: "#16A34A" } : { background: "#2D6BCC", color: "#fff" }}
                  >
                    {validatingInvite ? <Loader2 className="w-4 h-4 animate-spin" /> : inviteValidated ? <Check className="w-4 h-4" /> : "Verify"}
                  </button>
                </div>
                {inviteValidateError && <p className="text-xs mt-1 text-red-500">{inviteValidateError}</p>}
              </div>
            )}

            {needsPin && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Invite PIN</p>
                <input
                  type="password" inputMode="numeric" maxLength={4}
                  value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="••••" disabled={join.isPending} autoFocus
                  className="w-full rounded-xl px-4 py-2.5 tracking-[0.35em] text-center font-mono text-lg focus:outline-none"
                  style={{ background: "#F3F4F6", border: "1.5px solid transparent" }}
                />
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200">
                <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit" disabled={join.isPending || !selectedGbId || (hasCountryLegs && !selectedCountryCode) || (!!needsLegInvite && !inviteValidated)}
              className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
              style={{ background: selectedGbId ? "linear-gradient(135deg, #2D6BCC, #1B3A7A)" : "#C5D3E8" }}
            >
              {join.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Users className="w-4 h-4" /> Join Group Buy</>}
            </button>

            <p className="text-[11px] text-slate-400 text-center">
              By joining you agree to the group buy terms. Prices lock at checkout.
            </p>
          </form>

          {/* ── Divider ── */}
          <div className="flex items-center gap-3 px-4 pb-3">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-[11px] text-slate-400 font-medium">or join with unique ID</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          {/* ── Join with Unique ID ── */}
          <form onSubmit={handleIdJoin} className="px-4 pb-4 space-y-2">
            <div className="flex items-center gap-2 rounded-xl overflow-hidden" style={{ background: "#F3F4F6", border: idError ? "1.5px solid #FCA5A5" : "1.5px solid transparent" }}>
              <Hash className="w-3.5 h-3.5 text-slate-400 ml-3 shrink-0" />
              <input
                type="text"
                value={uniqueId}
                onChange={e => { setUniqueId(e.target.value); setIdError(""); setIdNeedsPin(false); setIdPin(""); }}
                placeholder="Paste unique ID here…"
                disabled={idPending}
                className="flex-1 bg-transparent py-2.5 pr-3 text-sm font-mono focus:outline-none text-slate-800 placeholder-slate-400"
              />
            </div>

            {idNeedsPin && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Invite PIN</p>
                <input
                  type="password" inputMode="numeric" maxLength={4}
                  value={idPin} onChange={e => { setIdPin(e.target.value.replace(/\D/g, "").slice(0, 4)); setIdError(""); }}
                  placeholder="••••" disabled={idPending} autoFocus
                  className="w-full rounded-xl px-4 py-2.5 tracking-[0.35em] text-center font-mono text-lg focus:outline-none"
                  style={{ background: "#F3F4F6", border: "1.5px solid transparent" }}
                />
              </div>
            )}

            {idError && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200">
                <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <p className="text-xs text-red-600">{idError}</p>
              </div>
            )}

            <button
              type="submit" disabled={idPending || !uniqueId.trim() || (idNeedsPin && !idPin.trim())}
              className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40 transition-all"
              style={{ background: "#EEF3FF", color: "#2D6BCC" }}
            >
              {idPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Hash className="w-3.5 h-3.5" /> Access with ID</>}
            </button>
          </form>

        </div>
      </motion.div>

      {showRulesetModal && (
        <RulesetModal
          onAccepted={async () => {
            setShowRulesetModal(false);
            if (pendingJoin) { await pendingJoin(); setPendingJoin(null); }
          }}
          onClose={() => { setShowRulesetModal(false); setPendingJoin(null); }}
        />
      )}
    </>
  );
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function getCloseDateBadge(iso: string | null): { dateStr: string; daysStr: string } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const dateStr = `${MONTHS[d.getMonth()]} ${d.getDate()}`;
  const now = Date.now();
  const diffMs = d.getTime() - now;
  if (diffMs < 0) return { dateStr, daysStr: "Closed" };
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return { dateStr, daysStr: "Today" };
  if (diffDays === 1) return { dateStr, daysStr: "Tomorrow" };
  if (diffDays < 30) return { dateStr, daysStr: `${diffDays}d left` };
  const diffWeeks = Math.round(diffDays / 7);
  if (diffDays < 90) return { dateStr, daysStr: `${diffWeeks}w left` };
  const diffMonths = Math.round(diffDays / 30);
  return { dateStr, daysStr: `${diffMonths}mo left` };
}

function GroupBuyCard({ gb, index, onCta, onInfo }: {
  gb: GroupBuySummary;
  index: number;
  onCta: () => void;
  onInfo: () => void;
}) {
  const palette = getPalette(index);
  const Icon = palette.icon;
  const isOrderable = gb.status === "active";
  const closeDateBadge = getCloseDateBadge(gb.closeDate);
  const infoCards = gb.infoCards ?? [];

  const chips: Array<{ label: string }> = [];
  if (gb.productCount > 0) chips.push({ label: `${gb.productCount} product${gb.productCount !== 1 ? "s" : ""}` });
  if (gb.currency) chips.push({ label: gb.currency.toUpperCase() });

  const infoContent = infoCards.length > 0
    ? infoCards.slice(0, 2).map(c => c.title).join(" · ")
    : gb.description ?? null;

  const dotColor = STATUS_DOT[gb.status] ?? STATUS_DOT.draft;
  const statusLabel = STATUS_LABEL[gb.status] ?? gb.status;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden relative"
      style={{ background: palette.gradient, boxShadow: "0 4px 20px rgba(0,0,0,0.25)" }}
    >
      {/* Decorative blob */}
      <div
        className="absolute top-0 right-0 w-40 h-40 rounded-full -translate-y-16 translate-x-16 pointer-events-none"
        style={{ background: palette.blobColor }}
      />

      <div className="relative p-4 flex flex-col" style={{ minHeight: "200px" }}>
        {/* Close date badge — top right */}
        {closeDateBadge && (
          <div className="absolute top-4 right-4 text-right pointer-events-none z-10">
            <p className="text-[11px] font-bold text-white leading-tight">{closeDateBadge.dateStr}</p>
            <p className="text-[9px] font-medium leading-tight mt-0.5" style={{ color: "rgba(255,255,255,0.50)" }}>{closeDateBadge.daysStr}</p>
          </div>
        )}

        {/* Icon + label row */}
        <div className="flex items-center gap-1.5 mb-3" style={{ paddingRight: closeDateBadge ? "52px" : undefined }}>
          <Icon className="w-3.5 h-3.5" style={{ color: palette.accent }} />
          <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: palette.accent }}>
            Group Buy
          </span>
        </div>

        {/* Name + manufacturer */}
        <h3 className="text-xl font-bold text-white leading-snug mb-0.5 line-clamp-2">{gb.name}</h3>
        {gb.manufacturer && (
          <p className="text-[11px] mb-3 leading-tight line-clamp-1" style={{ color: "rgba(255,255,255,0.50)" }}>{gb.manufacturer}</p>
        )}

        {/* Info section with label */}
        {infoContent && (
          <div className="mb-3">
            <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>
              {infoCards.length > 0 ? "Key Info" : "About"}
            </p>
            <p className="text-[11px] leading-relaxed line-clamp-1" style={{ color: "rgba(255,255,255,0.60)" }}>
              {infoContent}
            </p>
          </div>
        )}

        {/* Chips */}
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {chips.map((chip, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium"
                style={{ background: "rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.70)", border: "1px solid rgba(255,255,255,0.12)" }}
              >
                {chip.label}
              </span>
            ))}
          </div>
        )}

        {/* Spacer pushes button to bottom */}
        <div className="flex-1" />

        {/* Full-width CTA */}
        <button
          onClick={onCta}
          className="w-full h-9 rounded-full text-[12px] font-bold text-white flex items-center justify-center gap-1.5 transition-opacity active:opacity-80"
          style={{ background: isOrderable ? palette.accent : "rgba(255,255,255,0.15)" }}
        >
          {isOrderable ? "Order" : "My Orders"}
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Footer bar */}
      <div
        className="relative flex items-center justify-between px-3.5 py-2.5"
        style={{ background: "rgba(0,0,0,0.28)", borderTop: "1px solid rgba(255,255,255,0.08)" }}
      >
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
          style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.75)", border: "1px solid rgba(255,255,255,0.10)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dotColor }} />
          {statusLabel}
        </span>
        <button
          onClick={e => { e.stopPropagation(); onInfo(); }}
          className="w-6 h-6 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.10)" }}
        >
          <Info className="w-3 h-3" style={{ color: "rgba(255,255,255,0.55)" }} />
        </button>
      </div>
    </motion.div>
  );
}

export default function Groups() {
  const [, setLocation] = useLocation();
  const { account, isLoading: accountLoading } = useAccount();
  const { data: groupBuys = [], isLoading: gbLoading, refetch } = useMyGroupBuys();
  const logout = useLogout();
  const [infoGb, setInfoGb] = useState<GroupBuySummary | null>(null);
  const [showJoin, setShowJoin] = useState(false);
  const [labReportProduct, setLabReportProduct] = useState<{ name: string; vendor: string; gbLabSupplier?: string | null } | null>(null);

  const handleLogout = async () => {
    await logout.mutateAsync();
    setLocation("/login");
  };

  React.useEffect(() => {
    if (!accountLoading && !account) {
      setLocation("/login");
    }
  }, [accountLoading, account, setLocation]);

  if (accountLoading || !account) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--t-bg)" }}>
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const username = account.telegramUsername;

  return (
    <PageLayout>
    <div className="flex flex-col pb-6" style={{ background: "var(--t-bg)", minHeight: "100%" }}>
      {/* Header */}
      <div className="relative overflow-hidden"
           style={{ background: "linear-gradient(135deg, var(--brand-navy) 0%, var(--brand-blue) 100%)" }}>
        <div className="absolute inset-0 opacity-10"
             style={{ backgroundImage: "radial-gradient(circle at 70% 50%, white 0%, transparent 60%)" }} />
        <div className="relative px-5 pt-5 pb-6">
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => window.history.length > 1 ? window.history.back() : setLocation("/")}
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.12)" }}
            >
              <ArrowLeft className="w-4 h-4" style={{ color: "rgba(255,255,255,0.9)" }} />
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => refetch()}
                disabled={gbLoading}
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.12)" }}
              >
                <RefreshCw className={`w-4 h-4 ${gbLoading ? "animate-spin" : ""}`}
                           style={{ color: "rgba(255,255,255,0.9)" }} />
              </button>
              <button
                onClick={handleLogout}
                disabled={logout.isPending}
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.12)" }}
              >
                <LogOut className="w-4 h-4" style={{ color: "rgba(255,255,255,0.9)" }} />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                 style={{ background: "rgba(255,255,255,0.15)" }}>
              <UsersRound className="w-4 h-4 text-white" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest"
               style={{ color: "rgba(255,255,255,0.6)" }}>Group Buys</p>
          </div>
          <h1 className="text-3xl font-bold text-white leading-tight">My Group Buys</h1>
        </div>
      </div>

      <main className="flex-1 max-w-md mx-auto w-full px-4 py-5">
        {gbLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        )}

        {!gbLoading && groupBuys.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-2xl p-8 text-center relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, #0D1B2A 0%, #162A44 100%)", boxShadow: "0 4px 20px rgba(0,0,0,0.25)" }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(91,141,239,0.15)" }}>
              <Package className="w-7 h-7" style={{ color: "#5B8DEF" }} />
            </div>
            <p className="text-sm font-semibold text-white mb-1">No group buys yet</p>
            <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.50)" }}>
              You haven't joined any group buys yet. Ask the admin for an invite or join one below.
            </p>
          </motion.div>
        )}

        {!gbLoading && groupBuys.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            {groupBuys.map((gb, i) => (
              <GroupBuyCard
                key={gb.id}
                gb={gb}
                index={i}
                onCta={() => gb.status === "active"
                  ? setLocation(`/order?gbId=${gb.id}`)
                  : setLocation("/account?s=orders")
                }
                onInfo={() => setInfoGb(gb)}
              />
            ))}
          </div>
        )}

        <button
          onClick={() => setShowJoin(true)}
          className="w-full h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 mt-2"
          style={{ background: "var(--t-surface)", color: "var(--t-muted)", border: "1px solid var(--t-border)" }}
        >
          <Users className="w-4 h-4" /> Join a Group Buy
        </button>
      </main>

      <AnimatePresence>
        {infoGb && (
          <GBInfoModal
            gb={infoGb}
            onClose={() => setInfoGb(null)}
            onShowLabReport={(product) =>
              setLabReportProduct({ ...product, gbLabSupplier: infoGb.labTestSupplier })
            }
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {labReportProduct && (
          <LabReportPopup
            productName={labReportProduct.name}
            vendor={labReportProduct.vendor}
            gbLabSupplier={labReportProduct.gbLabSupplier}
            onClose={() => setLabReportProduct(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showJoin && (
          <JoinModal onClose={() => setShowJoin(false)} />
        )}
      </AnimatePresence>
    </div>
    </PageLayout>
  );
}
