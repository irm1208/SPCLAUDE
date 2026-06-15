import React, { useState, useEffect, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import {
  Loader2, Package, RefreshCw, LogIn, Search, X,
  CheckSquare, Square, BarChart3, Globe, ChevronDown, ChevronUp,
} from "lucide-react";
import { useAccount } from "@/hooks/use-account";

const NAVY = "#1B3A7A";
const BLUE = "#2D6BCC";
const GREEN = "#16A34A";

function stripAt(u: string) { return u.replace(/^@+/, ""); }

interface KitOrder {
  id: string;
  code: string;
  telegramUsername: string;
  status: string;
  paymentStatus: string;
  grandTotal: string;
  kits: number;
  excluded: boolean;
  createdAt: string;
}

interface PageData {
  gbName: string;
  legName: string;
  legCode: string;
  currency: string;
  vendorPackageCount: number | null;
  totalKits: number;
  includedKits: number;
  excludedCount: number;
  orders: KitOrder[];
}

const STATUS_COLOR: Record<string, { background: string; color: string }> = {
  Submitted:  { background: "rgba(245,158,11,0.1)",  color: "#D97706" },
  Processing: { background: "rgba(59,130,246,0.1)",  color: "#2563EB" },
  Shipped:    { background: "rgba(139,92,246,0.1)",  color: "#7C3AED" },
  Completed:  { background: "rgba(22,163,74,0.1)",   color: "#16A34A" },
  Cancelled:  { background: "rgba(220,38,38,0.1)",   color: "#DC2626" },
  Draft:      { background: "rgba(100,116,139,0.1)", color: "#64748B" },
};
function statusStyle(s: string) {
  return STATUS_COLOR[s] ?? { background: "rgba(100,116,139,0.1)", color: "#64748B" };
}

// ─── Order row ───────────────────────────────────────────────────────────────
function OrderRow({
  order,
  currency,
  isAdmin,
  onToggle,
  saving,
}: {
  order: KitOrder;
  currency: string;
  isAdmin: boolean;
  onToggle: (orderId: string, excluded: boolean) => Promise<void>;
  saving: boolean;
}) {
  const [toggling, setToggling] = useState(false);
  const ss = statusStyle(order.status);
  const isPaid = order.paymentStatus === "confirmed" || order.paymentStatus === "test_confirmed";
  const date = new Date(order.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

  const handleToggle = async () => {
    if (!isAdmin || saving || toggling) return;
    setToggling(true);
    try {
      await onToggle(order.id, !order.excluded);
    } finally {
      setToggling(false);
    }
  };

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
      style={{
        background: order.excluded ? "rgba(148,163,184,0.04)" : "#fff",
        border: `1px solid ${order.excluded ? "rgba(148,163,184,0.2)" : "rgba(27,58,122,0.12)"}`,
        opacity: order.excluded ? 0.6 : 1,
      }}
    >
      {/* Admin toggle */}
      {isAdmin && (
        <button
          type="button"
          onClick={handleToggle}
          disabled={toggling || saving}
          className="shrink-0 transition-opacity hover:opacity-70"
          title={order.excluded ? "Include in total" : "Exclude from total"}
        >
          {toggling
            ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#94A3B8" }} />
            : order.excluded
              ? <Square className="w-5 h-5" style={{ color: "#94A3B8" }} />
              : <CheckSquare className="w-5 h-5" style={{ color: NAVY }} />}
        </button>
      )}

      {/* Order info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold truncate" style={{ color: order.excluded ? "#94A3B8" : NAVY }}>
            @{stripAt(order.telegramUsername)}
          </span>
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(27,58,122,0.06)", color: "#64748B" }}>
            #{order.code}
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={ss}>
            {order.status}
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{
            background: isPaid ? "rgba(22,163,74,0.1)" : "rgba(100,116,139,0.1)",
            color: isPaid ? "#16A34A" : "#64748B",
          }}>
            {isPaid ? "Paid" : order.paymentStatus.replace(/_/g, " ")}
          </span>
          {order.excluded && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(148,163,184,0.12)", color: "#94A3B8" }}>
              Excluded
            </span>
          )}
        </div>
        <p className="text-[11px] mt-0.5" style={{ color: "#94A3B8" }}>{date}</p>
      </div>

      {/* Kit count */}
      <div className="shrink-0 text-right">
        <span
          className="text-base font-bold"
          style={{ color: order.excluded ? "#94A3B8" : NAVY }}
        >
          {order.kits}
        </span>
        <p className="text-[10px]" style={{ color: "#94A3B8" }}>kit{order.kits !== 1 ? "s" : ""}</p>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function GbLegKits() {
  const [, params] = useRoute<{ gbId: string; legId: string }>("/leg-kits/:gbId/:legId");
  const gbId = params?.gbId ?? "";
  const legId = params?.legId ?? "";
  const [, setLocation] = useLocation();
  const { account, isLoading: accountLoading } = useAccount();

  // Admin detection: admin secret stored in sessionStorage
  const adminSecret = typeof window !== "undefined"
    ? (sessionStorage.getItem("peps_admin_preview_secret") ?? "")
    : "";
  const isAdmin = Boolean(adminSecret);

  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; status?: number } | null>(null);
  const [search, setSearch] = useState("");
  const [showExcluded, setShowExcluded] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!gbId || !legId) return;
    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = {};
      if (isAdmin && adminSecret) headers["x-admin-secret"] = adminSecret;
      const res = await fetch(`/api/group-buys/${gbId}/country-legs/${legId}/kit-count`, {
        credentials: "include",
        headers,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError({ message: j.error || "Failed to load data.", status: res.status });
        return;
      }
      setData(await res.json());
    } catch {
      setError({ message: "Network error — please try again." });
    } finally {
      setLoading(false);
    }
  }, [gbId, legId, isAdmin, adminSecret]);

  useEffect(() => {
    if (isAdmin) { load(); return; }
    if (!accountLoading && account) load();
  }, [accountLoading, account, load, isAdmin]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!gbId || !legId) return;
    const ready = isAdmin || (!accountLoading && !!account);
    if (!ready) return;
    const id = setInterval(() => { void load(); }, 30_000);
    return () => clearInterval(id);
  }, [gbId, legId, isAdmin, accountLoading, account, load]);

  const handleToggle = useCallback(async (orderId: string, excluded: boolean) => {
    if (!isAdmin || !adminSecret) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/group-buys/${gbId}/country-legs/${legId}/kit-excluded-orders`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json", "x-admin-secret": adminSecret },
        body: JSON.stringify({ orderId, excluded }),
      });
      if (!res.ok) throw new Error("Failed to update");
      const result = await res.json();
      // Update local state optimistically
      setData(prev => {
        if (!prev) return prev;
        const updatedOrders = prev.orders.map(o => o.id === orderId ? { ...o, excluded } : o);
        const includedKits = updatedOrders.filter(o => !o.excluded).reduce((s, o) => s + o.kits, 0);
        const excludedCount = updatedOrders.filter(o => o.excluded).length;
        return { ...prev, orders: updatedOrders, includedKits, excludedCount, ...result };
      });
    } catch {
      // silent — user will see stale data
    } finally {
      setSaving(false);
    }
  }, [gbId, legId, isAdmin, adminSecret]);

  const allOrders = data?.orders ?? [];
  const q = search.trim().toLowerCase();
  const includedOrders = allOrders.filter(o => !o.excluded);
  const excludedOrders = allOrders.filter(o => o.excluded);

  const filteredIncluded = includedOrders.filter(o =>
    !q || stripAt(o.telegramUsername).toLowerCase().includes(q) || o.code.toLowerCase().includes(q)
  );
  const filteredExcluded = excludedOrders.filter(o =>
    !q || stripAt(o.telegramUsername).toLowerCase().includes(q) || o.code.toLowerCase().includes(q)
  );

  const isAuthError = error?.status === 401 || error?.status === 403;

  if (accountLoading && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(160deg, #f0f4ff 0%, #f8faff 60%, #fff 100%)" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: NAVY }} />
      </div>
    );
  }

  if (!account && !isAdmin) {
    const loginUrl = `/login?next=${encodeURIComponent(`/leg-kits/${gbId}/${legId}`)}`;
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "linear-gradient(160deg, #f0f4ff 0%, #f8faff 60%, #fff 100%)" }}>
        <div className="max-w-sm w-full rounded-2xl p-8 text-center bg-white" style={{ boxShadow: "0 4px 24px rgba(27,58,122,0.12)", border: "1px solid rgba(27,58,122,0.1)" }}>
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${BLUE} 100%)` }}>
            <Package className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-lg font-bold mb-2" style={{ color: NAVY }}>Login Required</h1>
          <p className="text-sm mb-6" style={{ color: "#64748B" }}>Please log in to view the kit count for your country leg.</p>
          <button
            type="button"
            onClick={() => setLocation(loginUrl)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm text-white transition-opacity hover:opacity-90"
            style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${BLUE} 100%)` }}
          >
            <LogIn className="w-4 h-4" />
            Log in to continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(160deg, #f0f4ff 0%, #f8faff 60%, #fff 100%)" }}>
      {/* Header */}
      <div
        className="px-4 py-4 flex items-center justify-between"
        style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${BLUE} 100%)`, boxShadow: "0 2px 16px rgba(27,58,122,0.18)" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">
              {data ? `${data.legName} · ${data.gbName}` : "Kit Count"}
            </p>
            <p className="text-white/70 text-[11px]">
              {loading ? "Loading…" : data ? `${allOrders.length} orders` : ""}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center"
        >
          {loading
            ? <Loader2 className="w-4 h-4 text-white animate-spin" />
            : <RefreshCw className="w-4 h-4 text-white" />}
        </button>
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-4">
        {/* Admin banner */}
        {isAdmin && (
          <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: "rgba(217,119,6,0.1)", border: "1px solid rgba(217,119,6,0.3)" }}>
            <Globe className="w-4 h-4 shrink-0" style={{ color: "#D97706" }} />
            <div>
              <p className="text-xs font-bold" style={{ color: "#92400E" }}>Admin Mode</p>
              <p className="text-[11px]" style={{ color: "#B45309" }}>Check/uncheck orders to include or exclude them from the total.</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.15)" }}>
            <p className="text-sm font-medium" style={{ color: "#DC2626" }}>{error.message}</p>
            {isAuthError && (
              <button
                type="button"
                onClick={() => setLocation(`/login?next=${encodeURIComponent(`/leg-kits/${gbId}/${legId}`)}`)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-white"
                style={{ background: NAVY }}
              >
                <LogIn className="w-3.5 h-3.5" /> Log in again
              </button>
            )}
          </div>
        )}

        {loading && !data && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: NAVY }} />
          </div>
        )}

        {data && (
          <>
            {/* ── Big kit count hero ─────────────────────────────────────── */}
            <div
              className="rounded-2xl p-6 text-center"
              style={{
                background: `linear-gradient(135deg, ${NAVY} 0%, ${BLUE} 100%)`,
                boxShadow: "0 4px 20px rgba(27,58,122,0.25)",
              }}
            >
              <p className="text-white/70 text-[11px] font-bold uppercase tracking-widest mb-1">
                {data.legCode} · Total Kits
              </p>
              <p className="text-white font-black" style={{ fontSize: 64, lineHeight: 1 }}>
                {data.includedKits}
              </p>
              {data.vendorPackageCount != null && (
                <div className="mt-3 flex items-center justify-center gap-2">
                  <span className="text-white/60 text-xs">Vendor target:</span>
                  <span className="text-white font-bold text-sm">{data.vendorPackageCount}</span>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: data.includedKits >= data.vendorPackageCount
                        ? "rgba(22,163,74,0.3)"
                        : "rgba(245,158,11,0.3)",
                      color: data.includedKits >= data.vendorPackageCount ? "#86efac" : "#fde68a",
                    }}
                  >
                    {data.includedKits >= data.vendorPackageCount ? "✓ Met" : `${data.vendorPackageCount - data.includedKits} short`}
                  </span>
                </div>
              )}
              {data.excludedCount > 0 && (
                <p className="text-white/50 text-[11px] mt-2">
                  {data.excludedCount} order{data.excludedCount !== 1 ? "s" : ""} excluded
                </p>
              )}
            </div>

            {/* ── Stat cards ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Included Kits", value: data.includedKits, color: NAVY },
                { label: "Total Orders", value: includedOrders.length, color: BLUE },
                { label: "Excluded", value: data.excludedCount, color: "#94A3B8" },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-3 text-center bg-white" style={{ border: "1px solid rgba(27,58,122,0.1)", boxShadow: "0 1px 4px rgba(27,58,122,0.06)" }}>
                  <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[9px] uppercase tracking-wider mt-0.5" style={{ color: "#94A3B8" }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* ── Search ─────────────────────────────────────────────────── */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94A3B8" }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by username or order code…"
                className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm bg-white focus:outline-none focus:ring-2"
                style={{ border: "1px solid rgba(27,58,122,0.15)" } as React.CSSProperties}
              />
              {search && (
                <button type="button" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4" style={{ color: "#94A3B8" }} />
                </button>
              )}
            </div>

            {/* ── Included orders ────────────────────────────────────────── */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center gap-1.5 shrink-0" style={{ color: GREEN }}>
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-bold uppercase tracking-widest">Included</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black" style={{ background: "rgba(22,163,74,0.12)", color: GREEN }}>
                    {filteredIncluded.length}
                  </span>
                </div>
                <div className="flex-1 h-px" style={{ background: "rgba(22,163,74,0.2)" }} />
              </div>
              <div className="space-y-2">
                {filteredIncluded.length === 0 && (
                  <p className="text-center text-xs py-4" style={{ color: "#94A3B8" }}>No included orders</p>
                )}
                {filteredIncluded.map(order => (
                  <OrderRow key={order.id} order={order} currency={data.currency} isAdmin={isAdmin} onToggle={handleToggle} saving={saving} />
                ))}
              </div>
            </div>

            {/* ── Excluded orders (collapsible) ──────────────────────────── */}
            {(excludedOrders.length > 0 || isAdmin) && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowExcluded(s => !s)}
                  className="flex items-center gap-2 w-full mb-2"
                >
                  <div className="flex items-center gap-1.5 shrink-0" style={{ color: "#94A3B8" }}>
                    <Square className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-bold uppercase tracking-widest">Excluded</span>
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black" style={{ background: "rgba(148,163,184,0.12)", color: "#94A3B8" }}>
                      {filteredExcluded.length}
                    </span>
                  </div>
                  <div className="flex-1 h-px" style={{ background: "rgba(148,163,184,0.2)" }} />
                  {showExcluded
                    ? <ChevronUp className="w-3.5 h-3.5 shrink-0" style={{ color: "#94A3B8" }} />
                    : <ChevronDown className="w-3.5 h-3.5 shrink-0" style={{ color: "#94A3B8" }} />}
                </button>

                {showExcluded && (
                  <div className="space-y-2 pb-6">
                    {filteredExcluded.length === 0 && (
                      <p className="text-center text-xs py-4" style={{ color: "#94A3B8" }}>No excluded orders</p>
                    )}
                    {filteredExcluded.map(order => (
                      <OrderRow key={order.id} order={order} currency={data.currency} isAdmin={isAdmin} onToggle={handleToggle} saving={saving} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
