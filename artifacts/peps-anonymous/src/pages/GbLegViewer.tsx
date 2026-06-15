import React, { useState, useEffect, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import {
  Loader2, Users, Package, Truck, CheckCircle2, XCircle,
  Clock, RefreshCw, Search, X, LogIn, Globe, ChevronDown, ChevronUp,
  EyeOff, Eye,
} from "lucide-react";
import { useAccount } from "@/hooks/use-account";
import { COUNTRY_LIST } from "@/data/countries";

const codeToName: Record<string, string> = Object.fromEntries(COUNTRY_LIST.map(c => [c.code.toLowerCase(), c.name]));
function resolveCountry(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const byCode = codeToName[raw.toLowerCase()];
  if (byCode) return byCode;
  return raw;
}

const NAVY = "#1B3A7A";
const BLUE = "#2D6BCC";

interface LineItem {
  productName: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
}

interface Order {
  id: string;
  code: string;
  telegramUsername: string;
  status: string;
  paymentStatus: string;
  grandTotal: string;
  productSubtotal: string;
  deliveryMethod: string | null;
  shippingName: string | null;
  shippingAddress: string | null;
  shippingCountry: string | null;
  trackingNumber: string | null;
  countryLegId: string | null;
  createdAt: string;
  paymentTxHash: string | null;
  testPaymentTxHash: string | null;
  lineItems: LineItem[];
}

interface Leg {
  id: string;
  countryCode: string;
  countryName: string;
  status: string;
}

interface Summary {
  totalOrders: number;
  totalRevenue: number;
  statusBreakdown: Record<string, number>;
}

interface PageData {
  gb: { id: string; name: string; currency: string; status: string; hidePricesOnGbViewer?: boolean };
  legs: Leg[];
  orders: Order[];
  summary: Summary;
}

function stripAt(u: string) { return u.replace(/^@+/, ""); }

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  Submitted:   { bg: "rgba(245,158,11,0.1)",  text: "#D97706" },
  Processing:  { bg: "rgba(59,130,246,0.1)",  text: "#2563EB" },
  Shipped:     { bg: "rgba(139,92,246,0.1)",  text: "#7C3AED" },
  Completed:   { bg: "rgba(22,163,74,0.1)",   text: "#16A34A" },
  Cancelled:   { bg: "rgba(220,38,38,0.1)",   text: "#DC2626" },
  Draft:       { bg: "rgba(100,116,139,0.1)", text: "#64748B" },
};

function statusStyle(s: string) {
  return STATUS_COLOR[s] ?? { bg: "rgba(100,116,139,0.1)", text: "#64748B" };
}

function PayBadge({ status }: { status: string }) {
  const paid = status === "confirmed" || status === "test_confirmed";
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20,
      background: paid ? "rgba(22,163,74,0.1)" : "rgba(100,116,139,0.1)",
      color: paid ? "#16A34A" : "#64748B",
    }}>
      {paid ? "Paid" : status.replace(/_/g, " ")}
    </span>
  );
}

function OrderRow({ order, currency, gbName, hidePrices }: { order: Order; currency: string; gbName: string; hidePrices: boolean }) {
  const [open, setOpen] = useState(false);
  const ss = statusStyle(order.status);
  const date = new Date(order.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const countryDisplay = resolveCountry(order.shippingCountry);
  const txHash = order.paymentTxHash || order.testPaymentTxHash;
  const totalQty = order.lineItems.reduce((sum, li) => sum + (parseInt(li.quantity) || 0), 0);
  const isTestTx = !order.paymentTxHash && !!order.testPaymentTxHash;

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(27,58,122,0.12)", background: "#fff" }}>
      <button
        type="button"
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-blue-50/40 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold" style={{ color: NAVY }}>@{stripAt(order.telegramUsername)}</span>
            {/* GB name pill */}
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(45,107,204,0.1)", color: BLUE }}>{gbName}</span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(27,58,122,0.06)", color: "#64748B" }}>#{order.code}</span>
            <span style={{ ...ss, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20 }}>{order.status}</span>
            <PayBadge status={order.paymentStatus} />
            {totalQty > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(27,58,122,0.07)", color: NAVY }}>
                {totalQty} kit{totalQty !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <p className="text-[11px] mt-0.5" style={{ color: "#94A3B8" }}>
            {date}
            {countryDisplay && ` · ${countryDisplay}`}
            {order.deliveryMethod && ` · ${order.deliveryMethod}`}
          </p>
        </div>
        <div className="text-right shrink-0">
          {hidePrices
            ? <span className="text-sm font-bold select-none" style={{ color: "#CBD5E1", letterSpacing: "0.15em" }}>••••</span>
            : <p className="text-sm font-bold" style={{ color: NAVY }}>{currency} {parseFloat(order.grandTotal ?? "0").toFixed(2)}</p>
          }
        </div>
        {open ? <ChevronUp className="w-4 h-4 shrink-0" style={{ color: "#94A3B8" }} /> : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: "#94A3B8" }} />}
      </button>

      {open && (
        <div className="border-t px-4 pb-4 pt-3 space-y-3" style={{ borderColor: "rgba(27,58,122,0.08)" }}>
          {/* Line items */}
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#94A3B8" }}>Items</p>
            <div className="space-y-1.5">
              {order.lineItems.map((li, i) => (
                <div key={i} className="flex justify-between items-center px-3 py-1.5 rounded-lg" style={{ background: "rgba(27,58,122,0.03)", border: "1px solid rgba(27,58,122,0.06)" }}>
                  <span className="text-xs font-medium" style={{ color: "#334155" }}>{li.quantity}× {li.productName}</span>
                  {hidePrices
                    ? <span className="text-xs font-bold select-none" style={{ color: "#CBD5E1", letterSpacing: "0.15em" }}>••••</span>
                    : <span className="text-xs font-bold" style={{ color: NAVY }}>{currency} {parseFloat(li.lineTotal).toFixed(2)}</span>
                  }
                </div>
              ))}
            </div>
          </div>
          {/* Delivery Address */}
          {(order.shippingName || order.shippingAddress || countryDisplay) && (
            <div className="rounded-lg px-3 py-2" style={{ background: "rgba(27,58,122,0.03)", border: "1px solid rgba(27,58,122,0.08)" }}>
              <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: BLUE }}>Delivery Address</p>
              {order.shippingName && <p className="text-xs font-semibold" style={{ color: "#334155" }}>{order.shippingName}</p>}
              {order.shippingAddress && <p className="text-xs whitespace-pre-line" style={{ color: "#64748B" }}>{order.shippingAddress}</p>}
              {countryDisplay && <p className="text-xs mt-0.5 font-medium" style={{ color: "#64748B" }}>{countryDisplay}</p>}
            </div>
          )}
          {/* Payment TX */}
          {txHash && (
            <div className="rounded-lg px-3 py-2" style={{ background: "rgba(27,58,122,0.03)", border: "1px solid rgba(27,58,122,0.08)" }}>
              <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: BLUE }}>
                Payment TX{isTestTx ? " (test)" : ""}
              </p>
              <p className="font-mono text-[10px] break-all" style={{ color: "#334155" }}>{txHash}</p>
            </div>
          )}
          {/* Tracking */}
          {order.trackingNumber && (
            <div className="flex items-center gap-2 text-xs" style={{ color: BLUE }}>
              <Truck className="w-3.5 h-3.5 shrink-0" />
              <span className="font-mono font-bold">{order.trackingNumber}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LegSection({ leg, orders, currency, gbName, defaultOpen = true, hidePrices }: { leg: Leg; orders: Order[]; currency: string; gbName: string; defaultOpen?: boolean; hidePrices: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const totalQty = orders.reduce((sum, o) => sum + o.lineItems.reduce((s, li) => s + (parseInt(li.quantity) || 0), 0), 0);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(27,58,122,0.15)", background: "rgba(27,58,122,0.02)" }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left"
        style={{ background: "rgba(27,58,122,0.05)" }}
      >
        <div className="flex items-center gap-2.5">
          <Globe className="w-4 h-4" style={{ color: NAVY }} />
          <span className="text-sm font-bold" style={{ color: NAVY }}>{leg.countryName}</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(27,58,122,0.1)", color: NAVY }}>
            {orders.length} order{orders.length !== 1 ? "s" : ""}
          </span>
          {totalQty > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(27,58,122,0.07)", color: NAVY }}>
              {totalQty} kit{totalQty !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4" style={{ color: NAVY }} /> : <ChevronDown className="w-4 h-4" style={{ color: NAVY }} />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-3 space-y-2">
          {orders.length === 0
            ? <p className="text-sm text-center py-8" style={{ color: "#94A3B8" }}>No orders for this leg</p>
            : orders.map(o => <OrderRow key={o.id} order={o} currency={currency} gbName={gbName} hidePrices={hidePrices} />)
          }
        </div>
      )}
    </div>
  );
}

export default function GbLegViewer() {
  const [, params] = useRoute<{ gbId: string }>("/leg-view/:gbId");
  const gbId = params?.gbId ?? "";
  const [, setLocation] = useLocation();
  const { account, isLoading: accountLoading } = useAccount();

  // Admin preview: ?as=username in the URL
  const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const previewAs = searchParams.get("as")?.trim().toLowerCase().replace(/^@/, "") ?? "";
  const adminSecret = previewAs ? (sessionStorage.getItem("peps_admin_preview_secret") ?? "") : "";
  const isAdminPreview = Boolean(previewAs && adminSecret);

  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; status?: number } | null>(null);
  const [search, setSearch] = useState("");
  const [hidePrices, setHidePrices] = useState(false);
  const initializedHidePrices = React.useRef(false);
  React.useEffect(() => {
    if (!initializedHidePrices.current && data) {
      initializedHidePrices.current = true;
      setHidePrices(data.gb.hidePricesOnGbViewer ?? false);
    }
  }, [data]);

  const load = useCallback(async () => {
    if (!gbId) return;
    setLoading(true);
    setError(null);
    try {
      let res: Response;
      if (isAdminPreview) {
        res = await fetch(`/api/admin/leg-view/${gbId}?as=${encodeURIComponent(previewAs)}`, {
          credentials: "include",
          headers: { "x-admin-secret": adminSecret },
        });
      } else {
        res = await fetch(`/api/leg-view/${gbId}`, { credentials: "include" });
      }
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
  }, [gbId, isAdminPreview, previewAs, adminSecret]);

  useEffect(() => {
    if (isAdminPreview) { load(); return; }
    if (!accountLoading && account) load();
  }, [accountLoading, account, load, isAdminPreview]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!gbId) return;
    const ready = isAdminPreview || (!accountLoading && !!account);
    if (!ready) return;
    const id = setInterval(() => { void load(); }, 30_000);
    return () => clearInterval(id);
  }, [gbId, isAdminPreview, accountLoading, account, load]);

  const currency = data?.gb.currency ?? "GBP";
  const q = search.trim().toLowerCase();

  const filteredOrders = (data?.orders ?? []).filter(o =>
    !q ||
    stripAt(o.telegramUsername).toLowerCase().includes(q) ||
    o.code.toLowerCase().includes(q) ||
    (o.shippingName ?? "").toLowerCase().includes(q)
  );

  const isAuthError = error?.status === 401 || error?.status === 403;

  if (accountLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(160deg, #f0f4ff 0%, #f8faff 60%, #fff 100%)" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: NAVY }} />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "linear-gradient(160deg, #f0f4ff 0%, #f8faff 60%, #fff 100%)" }}>
        <div className="max-w-sm w-full rounded-2xl p-8 text-center bg-white" style={{ boxShadow: "0 4px 24px rgba(27,58,122,0.12)", border: "1px solid rgba(27,58,122,0.1)" }}>
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${BLUE} 100%)` }}>
            <Users className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-lg font-bold mb-2" style={{ color: NAVY }}>Login Required</h1>
          <p className="text-sm mb-6" style={{ color: "#64748B" }}>Please log in to view your assigned group buy summary.</p>
          <button
            type="button"
            onClick={() => setLocation(`/login?next=${encodeURIComponent(`/leg-view/${gbId}`)}`)}
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
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">{data?.gb.name ?? "Group Buy Summary"}</p>
            <p className="text-white/70 text-[11px]">
              {loading ? "Loading…" : data ? `${data.summary.totalOrders} orders · ${(data.legs ?? []).length} leg${(data.legs ?? []).length !== 1 ? "s" : ""}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setHidePrices(h => !h)}
            title={hidePrices ? "Show prices" : "Hide prices"}
            className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center transition-all"
            style={hidePrices ? { background: "rgba(255,255,255,0.30)" } : {}}
          >
            {hidePrices ? <EyeOff className="w-4 h-4 text-white" /> : <Eye className="w-4 h-4 text-white" />}
          </button>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center"
          >
            {loading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <RefreshCw className="w-4 h-4 text-white" />}
          </button>
        </div>
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-4 space-y-4">
        {/* Hide prices banner */}
        {hidePrices && (
          <div className="rounded-xl px-4 py-2.5 flex items-center gap-3" style={{ background: "rgba(100,116,139,0.1)", border: "1px solid rgba(100,116,139,0.2)" }}>
            <EyeOff className="w-4 h-4 shrink-0" style={{ color: "#64748B" }} />
            <p className="text-xs font-medium flex-1" style={{ color: "#64748B" }}>Prices are hidden</p>
            <button type="button" onClick={() => setHidePrices(false)} className="text-[11px] font-semibold underline" style={{ color: "#64748B" }}>Show</button>
          </div>
        )}

        {/* Admin preview banner */}
        {isAdminPreview && (
          <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: "rgba(217,119,6,0.1)", border: "1px solid rgba(217,119,6,0.3)" }}>
            <div className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(217,119,6,0.15)" }}>
              <Globe className="w-4 h-4" style={{ color: "#D97706" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold" style={{ color: "#92400E" }}>Admin Preview</p>
              <p className="text-[11px]" style={{ color: "#B45309" }}>Viewing as <span className="font-mono font-bold">@{previewAs}</span> — this is what they see.</p>
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
                onClick={() => setLocation(`/login?next=${encodeURIComponent(`/leg-view/${gbId}`)}`)}
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

        {/* Summary stats */}
        {data && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: "Total Orders", value: data.summary.totalOrders, icon: <Package className="w-4 h-4" />, color: NAVY },
                { label: "Total Kits", value: data.orders.reduce((sum, o) => sum + o.lineItems.reduce((s, li) => s + (parseInt(li.quantity) || 0), 0), 0), icon: <CheckCircle2 className="w-4 h-4" />, color: "#2D6BCC" },
                { label: "Shipped", value: data.summary.statusBreakdown["Shipped"] ?? 0, icon: <Truck className="w-4 h-4" />, color: "#7C3AED" },
                { label: "Pending", value: (data.summary.statusBreakdown["Submitted"] ?? 0) + (data.summary.statusBreakdown["Processing"] ?? 0), icon: <Clock className="w-4 h-4" />, color: "#D97706" },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-3 bg-white" style={{ border: "1px solid rgba(27,58,122,0.1)", boxShadow: "0 1px 4px rgba(27,58,122,0.06)" }}>
                  <div className="flex items-center gap-1.5 mb-1" style={{ color: s.color }}>
                    {s.icon}
                    <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#94A3B8" }}>{s.label}</p>
                  </div>
                  <p className="text-lg font-bold leading-tight" style={{ color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94A3B8" }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by username, order code or name…"
                className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm bg-white focus:outline-none focus:ring-2"
                style={{ border: "1px solid rgba(27,58,122,0.15)" } as React.CSSProperties}
              />
              {search && (
                <button type="button" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4" style={{ color: "#94A3B8" }} />
                </button>
              )}
            </div>

            {/* Legs + orders — legs with orders first, empty legs collapsed at bottom */}
            <div className="space-y-4">
              {(data.legs ?? [])
                .slice()
                .sort((a, b) => {
                  const aCount = filteredOrders.filter(o => o.countryLegId === a.id || (o.countryLegId === null && o.shippingCountry?.toUpperCase() === a.countryCode.toUpperCase())).length;
                  const bCount = filteredOrders.filter(o => o.countryLegId === b.id || (o.countryLegId === null && o.shippingCountry?.toUpperCase() === b.countryCode.toUpperCase())).length;
                  if (aCount === 0 && bCount > 0) return 1;
                  if (bCount === 0 && aCount > 0) return -1;
                  return 0;
                })
                .map(leg => {
                  const legOrders = filteredOrders.filter(o => o.countryLegId === leg.id || (o.countryLegId === null && o.shippingCountry?.toUpperCase() === leg.countryCode.toUpperCase()));
                  return (
                    <LegSection
                      key={leg.id}
                      leg={leg}
                      currency={currency}
                      gbName={data.gb.name}
                      orders={legOrders}
                      defaultOpen={legOrders.length > 0}
                      hidePrices={hidePrices}
                    />
                  );
                })}
              {data.legs.length === 0 && (
                <div className="text-center py-12">
                  <Globe className="w-10 h-10 mx-auto mb-3" style={{ color: "#CBD5E1" }} />
                  <p className="text-sm" style={{ color: "#94A3B8" }}>No legs assigned</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
