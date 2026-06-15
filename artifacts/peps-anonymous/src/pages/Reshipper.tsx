import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, RefreshCw, Package, Truck, ChevronDown, ChevronUp,
  Plus, Pencil, Trash2, Save, X, Check, AlertCircle, SendHorizonal,
  ToggleLeft, ToggleRight, MessageSquare, Globe, CreditCard, Upload,
  LayoutDashboard, ShoppingBag, Settings, ExternalLink, Copy,
  Search, Filter, Wallet, QrCode, FileDown, BarChart3, MapPin,
  Download, ImageOff, Inbox, Bell, Users, FileText, Box,
  CheckCircle2, RotateCcw,
} from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { useAccount } from "@/hooks/use-account";
import { ALL_CARRIERS_17TRACK, CARRIER_GROUPS } from "@/data/carriers17track";
import { COUNTRIES } from "@/data/countries";

// ─── Admin impersonation ──────────────────────────────────────────────────────
// Module-level vars set once when the page initializes in admin preview mode
let _adminImpersonateSecret: string | null = null;
let _adminImpersonateUsername: string | null = null;

function reshipFetch(url: string, options: RequestInit = {}): Promise<Response> {
  if (_adminImpersonateSecret && _adminImpersonateUsername) {
    return fetch(url, {
      ...options,
      headers: {
        ...(options.headers as Record<string, string> ?? {}),
        "x-admin-secret": _adminImpersonateSecret,
        "x-impersonate-username": _adminImpersonateUsername,
      },
    });
  }
  return fetch(url, { ...options, credentials: "include" });
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ReshipperPaymentDetails = {
  usdtWallet?: string | null;
  revolutHandle?: string | null;
  paypalHandle?: string | null;
  cryptoCurrency?: string | null;
  cryptoNetwork?: string | null;
  cryptoWalletAddress?: string | null;
  anonPayEnabled?: boolean;
  anonPayWallet?: string | null;
  anonPayTicker?: string | null;
  anonPayNetwork?: string | null;
};

interface ReshipperMe {
  telegramUsername: string;
  reshipperStatus: string | null;
  reshipperApprovedAt: string | null;
  reshipperPaymentMethods: ReshipperPaymentDetails | null;
}

interface RAssignment {
  id: string;
  gbId: string;
  reshipperUsername: string;
  country: string;
  enabledPaymentMethods: Record<string, boolean>;
  reshipperPaymentDetails: ReshipperPaymentDetails | null;
  reshipperFeeEnabled: boolean;
  reshipperFeeType: string;
  reshipperFeeAmount: string | null;
  allowPayments: boolean;
  allowVendorShippingSplit: boolean;
  createdAt: string;
  gb: {
    id: string;
    name: string;
    status: string;
    currency: string;
    paymentsEnabled: boolean;
    orderPageMessage: string | null;
    qrUploadInpostEnabled: boolean;
    qrUploadRoyalMailEnabled: boolean;
    qrUploadMessage: string | null;
    qrUploadCouriers: string[] | null;
    shippingOptions: { id: string; label: string; price: number }[];
    vendorShippingEnabled: boolean;
    vendorShippingAmount: number | null;
    vendorShippingMode: string;
    vendorShippingEqualPct: number;
  } | null;
}

interface ROrder {
  id: string;
  code: string;
  telegramUsername: string;
  status: string;
  paymentStatus: string;
  grandTotal: number;
  shippingName: string | null;
  shippingAddress: string | null;
  shippingCity?: string | null;
  shippingPostcode?: string | null;
  shippingCountry?: string | null;
  trackingNumber: string | null;
  paymentTxHash: string | null;
  createdAt: string;
  paymentConfirmedAt?: string | null;
  lineItems?: { productName: string; quantity: number; lineTotal: number }[];
  qrCodes?: Record<string, string> | null;
  inpostQrCode?: string | null;
  royalMailQrCode?: string | null;
  trackingNumbers?: string[] | null;
}

interface RParcel {
  id: string;
  groupBuyId: string;
  label: string;
  carrier: string;
  trackingNumber: string;
  status: string;
  notes: string | null;
  trackingUrl: string | null;
  items: { name: string; qty: number }[];
  cachedEvents: { date: string; status: string; location: string }[];
  createdAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ORDER_STATUSES = ["Draft", "Submitted", "Processing", "Shipped", "Completed", "Cancelled"];
const PAYMENT_STATUSES = ["unpaid", "pending_confirmation", "confirmed", "failed"];
const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  Draft: ["Submitted", "Cancelled"],
  Submitted: ["Processing", "Cancelled"],
  Processing: ["Shipped", "Cancelled"],
  Shipped: ["Completed"],
  Completed: [],
  Cancelled: [],
};

const STATUS_COLOR: Record<string, { color: string; bg: string }> = {
  Draft:      { color: "#64748B", bg: "rgba(100,116,139,0.1)" },
  Submitted:  { color: "var(--t-blue)", bg: "var(--t-blue-10)" },
  Processing: { color: "#D97706", bg: "rgba(217,119,6,0.1)" },
  Shipped:    { color: "#7C3AED", bg: "rgba(124,58,237,0.1)" },
  Completed:  { color: "#16A34A", bg: "rgba(22,163,74,0.1)" },
  Cancelled:  { color: "#DC2626", bg: "rgba(220,38,38,0.1)" },
};

const PAYMENT_COLOR: Record<string, string> = {
  unpaid: "#94A3B8",
  pending_confirmation: "var(--t-blue)",
  confirmed: "#16A34A",
  test_confirmed: "var(--t-blue)",
  failed: "#DC2626",
};

const PAYMENT_LABEL: Record<string, string> = {
  unpaid: "Unpaid",
  pending_confirmation: "Pending",
  confirmed: "Paid",
  test_confirmed: "Test OK",
  failed: "Failed",
};

const PARCEL_STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  pending:          { color: "#64748B", bg: "rgba(100,116,139,0.1)" },
  in_transit:       { color: "var(--t-blue)", bg: "var(--t-blue-10)" },
  out_for_delivery: { color: "#D97706", bg: "rgba(217,119,6,0.1)" },
  attempted:        { color: "#F59E0B", bg: "rgba(245,158,11,0.1)" },
  delivered:        { color: "#16A34A", bg: "rgba(22,163,74,0.1)" },
  exception:        { color: "#DC2626", bg: "rgba(220,38,38,0.1)" },
  expired:          { color: "#64748B", bg: "rgba(100,116,139,0.1)" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function currencySymbol(code?: string | null): string {
  const map: Record<string, string> = {
    GBP: "£", USD: "$", EUR: "€", CAD: "CA$", AUD: "A$", JPY: "¥", CHF: "Fr",
  };
  return map[(code ?? "GBP").toUpperCase()] ?? (code?.toUpperCase() ?? "GBP") + " ";
}

function inputCls(extra = "") {
  return `w-full px-3 py-2 rounded-xl text-sm focus:outline-none ${extra}`;
}
const inputStyle: React.CSSProperties = {
  border: "1.5px solid var(--t-border)",
  color: "var(--t-text)",
  background: "var(--t-surface)",
};

// ─── Carrier Input ────────────────────────────────────────────────────────────

function CarrierInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return ALL_CARRIERS_17TRACK.filter(c => c.toLowerCase().includes(q)).slice(0, 50);
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQuery(""); }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = (c: string) => { onChange(c); setQuery(""); setOpen(false); };

  return (
    <div ref={ref} className="relative">
      <input
        value={open ? query : value}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => { setOpen(true); setQuery(""); }}
        placeholder={open ? "Search carriers…" : value || "Auto"}
        className={inputCls("text-xs")}
        style={inputStyle}
        autoComplete="off"
      />
      {open && (
        <div className="absolute z-50 w-64 rounded-xl shadow-xl overflow-hidden"
          style={{ background: "var(--t-surface)", border: "1.5px solid var(--t-border)", top: "calc(100% + 4px)", left: 0 }}>
          {query.trim().length === 0 ? (
            <div className="max-h-56 overflow-y-auto">
              {CARRIER_GROUPS.slice(0, 3).map(g => (
                <div key={g.label}>
                  <p className="px-3 py-1 text-[9px] font-bold uppercase tracking-widest sticky top-0"
                    style={{ color: "var(--t-blue-deep)", background: "var(--t-surface2)" }}>{g.label}</p>
                  {g.carriers.slice(0, 8).map(c => (
                    <button key={c} onMouseDown={() => select(c)} className="w-full text-left px-3 py-1.5 text-xs"
                      style={{ color: "var(--t-text)" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--t-surface2)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      {c}
                    </button>
                  ))}
                </div>
              ))}
              <p className="px-3 py-2 text-[10px]" style={{ color: "var(--t-subtle)" }}>Type to search all {ALL_CARRIERS_17TRACK.length.toLocaleString()} carriers…</p>
            </div>
          ) : results.length > 0 ? (
            <div className="max-h-56 overflow-y-auto">
              {results.map(c => (
                <button key={c} onMouseDown={() => select(c)} className="w-full text-left px-3 py-1.5 text-xs"
                  style={{ color: "var(--t-text)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--t-surface2)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  {c}
                </button>
              ))}
            </div>
          ) : (
            <div className="px-3 py-3">
              <p className="text-xs" style={{ color: "var(--t-subtle)" }}>No match — value saved as typed.</p>
              <button onMouseDown={() => select(query)} className="mt-1 text-xs font-semibold" style={{ color: "var(--t-blue)" }}>
                Use "{query}"
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = "var(--t-text)" }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
      <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--t-subtle)" }}>{label}</p>
      <p className="text-2xl font-bold tabular-nums" style={{ color }}>{value}</p>
      {sub && <p className="text-[11px] mt-0.5" style={{ color: "var(--t-subtle)" }}>{sub}</p>}
    </div>
  );
}

// ─── Tab Button ───────────────────────────────────────────────────────────────

function TabBtn({ id, label, icon: Icon, active, onClick }: {
  id: string; label: string; icon: React.ElementType; active: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap"
      style={active
        ? { background: "var(--t-blue-deep)", color: "white" }
        : { background: "var(--t-surface2)", color: "var(--t-muted)", border: "1px solid var(--t-border)" }
      }>
      <Icon className="w-4 h-4 shrink-0" />
      {label}
    </button>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ orders, gbName, country, currency }: { orders: ROrder[]; gbName: string; country: string; currency?: string }) {
  const total = orders.length;
  const paid = orders.filter(o => o.paymentStatus === "confirmed" || o.paymentStatus === "test_confirmed").length;
  const unpaid = orders.filter(o => o.paymentStatus === "unpaid").length;
  const pending = orders.filter(o => o.status === "Submitted" || o.status === "Processing").length;
  const shipped = orders.filter(o => o.status === "Shipped").length;
  const completed = orders.filter(o => o.status === "Completed").length;
  const revenue = orders.filter(o => o.paymentStatus === "confirmed" || o.paymentStatus === "test_confirmed")
    .reduce((s, o) => s + (o.grandTotal ?? 0), 0);
  const sym = currencySymbol(currency);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl p-4" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--t-subtle)" }}>Assignment</p>
        <p className="text-base font-bold" style={{ color: "var(--t-text)" }}>{gbName}</p>
        <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: "var(--t-subtle)" }}>
          <Globe className="w-3 h-3" /> {country}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Total Orders" value={total} />
        <StatCard label="Paid" value={paid} color="#16A34A" />
        <StatCard label="Unpaid" value={unpaid} color="#94A3B8" />
        <StatCard label="Pending" value={pending} color="#D97706" sub="Submitted / Processing" />
        <StatCard label="Shipped" value={shipped} color="#7C3AED" />
        <StatCard label="Completed" value={completed} color="#16A34A" />
        <StatCard label="Revenue" value={`${sym}${fmtCurrency(revenue)}`} color="var(--t-blue-deep)" />
      </div>
    </div>
  );
}

// ─── Summary Tab ──────────────────────────────────────────────────────────────

function SummaryTab({ orders, assignment }: { orders: ROrder[]; assignment: RAssignment }) {
  const gb = assignment.gb;
  const currency = gb?.currency ?? "";
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  // Product-level breakdown — coerce qty/total to numbers (Postgres numeric comes back as strings)
  const productMap = new Map<string, { qty: number; total: number; ordersList: { code: string; username: string; quantity: number; lineTotal: number; status: string; paymentStatus: string }[] }>();
  for (const o of orders) {
    for (const li of o.lineItems ?? []) {
      const existing = productMap.get(li.productName) ?? { qty: 0, total: 0, ordersList: [] };
      const q = Number(li.quantity);
      const t = Number(li.lineTotal);
      productMap.set(li.productName, {
        qty: existing.qty + q,
        total: existing.total + t,
        ordersList: [...existing.ordersList, { code: o.code, username: o.telegramUsername, quantity: q, lineTotal: t, status: o.status, paymentStatus: o.paymentStatus ?? "" }],
      });
    }
  }
  const productRows = [...productMap.entries()].sort((a, b) => b[1].total - a[1].total);
  const totalRevenue = productRows.reduce((s, [, v]) => s + v.total, 0);
  const totalQty = productRows.reduce((s, [, v]) => s + v.qty, 0);

  const handleDownload = () => {
    if (productRows.length === 0) return;
    const lines = [
      `Order Summary — ${gb?.name ?? assignment.gbId} · ${assignment.country}`,
      `Generated: ${new Date().toLocaleString("en-GB")}`,
      "─".repeat(56), "",
      ...productRows.map(([name, { qty, total }]) =>
        `${name}  ×${qty}  ${currency} ${total.toFixed(2)}`
      ),
      "", "─".repeat(56),
      `Total: ${totalQty} units · ${currency} ${totalRevenue.toFixed(2)}`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `summary-${(gb?.name ?? assignment.gbId).replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center flex-wrap">
        <h2 className="text-base font-bold flex-1" style={{ color: "var(--t-text)" }}>
          Order Summary — {gb?.name ?? assignment.gbId}
        </h2>
        {productRows.length > 0 && (
          <button onClick={handleDownload}
            className="h-9 flex items-center gap-1.5 px-3 rounded-lg text-xs font-semibold"
            style={{ border: "1px solid var(--t-border)", color: "var(--t-text)" }}>
            <Download className="w-3.5 h-3.5" /> Download .txt
          </button>
        )}
      </div>

      {productRows.length > 0 ? (
        <>
          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Products", value: String(productRows.length) },
              { label: "Total Qty", value: String(totalQty) },
              { label: "Total Value", value: `${currency} ${totalRevenue.toFixed(2)}` },
            ].map(s => (
              <div key={s.label} className="p-3 rounded-xl text-center" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
                <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>{s.value}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--t-subtle)" }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Product list */}
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--t-border)" }}>
            <div className="px-4 py-2.5" style={{ background: "var(--t-surface2)" }}>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--t-subtle)" }}>
                Order List — tap a product to see who ordered it
              </p>
            </div>
            {productRows.map(([name, { qty, total: rowTotal, ordersList }]) => {
              const isOpen = expandedProduct === name;
              return (
                <div key={name} style={{ borderTop: "1px solid var(--t-border)" }}>
                  <button
                    className="w-full flex items-center justify-between gap-4 px-4 py-3 text-xs text-left transition-colors"
                    style={{ background: isOpen ? "var(--t-surface2)" : "transparent" }}
                    onClick={() => setExpandedProduct(isOpen ? null : name)}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      {isOpen
                        ? <ChevronUp className="w-3 h-3 shrink-0" style={{ color: "var(--t-blue)" }} />
                        : <ChevronDown className="w-3 h-3 shrink-0" style={{ color: "var(--t-muted)" }} />}
                      <span className="font-semibold truncate" style={{ color: "var(--t-text)" }}>{name}</span>
                      <span className="shrink-0" style={{ color: "var(--t-muted)" }}>×{qty}</span>
                    </span>
                    <span className="font-bold shrink-0 tabular-nums" style={{ color: "var(--t-text)" }}>
                      {currency} {rowTotal.toFixed(2)}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-4 py-3 space-y-2" style={{ background: "var(--t-surface)" }}>
                      {ordersList.map((ord, i) => {
                        const isPaid = ord.paymentStatus === "confirmed" || ord.paymentStatus === "test_confirmed";
                        const isPending = ord.paymentStatus === "pending_confirmation";
                        return (
                          <div key={i} className="flex items-center justify-between gap-3 text-[11px]">
                            <div className="flex items-center gap-2 min-w-0 flex-wrap">
                              <span className="font-mono shrink-0" style={{ color: "var(--t-muted)" }}>#{ord.code}</span>
                              <span className="font-semibold truncate" style={{ color: "var(--t-text)" }}>@{ord.username.replace(/^@/, "")}</span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0" style={{
                                background: ord.status === "Submitted" ? "rgba(245,158,11,0.1)" : ord.status === "Confirmed" ? "rgba(22,163,74,0.1)" : "rgba(100,116,139,0.1)",
                                color: ord.status === "Submitted" ? "#D97706" : ord.status === "Confirmed" ? "#16A34A" : "var(--t-muted)",
                              }}>{ord.status}</span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0" style={{
                                background: isPaid ? "rgba(22,163,74,0.1)" : isPending ? "rgba(59,130,246,0.1)" : "rgba(100,116,139,0.1)",
                                color: isPaid ? "#16A34A" : isPending ? "#3B82F6" : "var(--t-muted)",
                              }}>{isPaid ? "Paid" : isPending ? "Pending" : "Unpaid"}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 font-mono">
                              <span style={{ color: "var(--t-muted)" }}>×{ord.quantity}</span>
                              <span className="font-bold" style={{ color: "var(--t-text)" }}>{currency} {ord.lineTotal.toFixed(2)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            <div className="px-4 py-3 flex justify-between font-bold text-xs" style={{ borderTop: "1px solid var(--t-border)", background: "var(--t-surface2)", color: "var(--t-text)" }}>
              <span>Total</span>
              <span className="tabular-nums">{currency} {totalRevenue.toFixed(2)}</span>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-16 text-[12px]" style={{ color: "var(--t-muted)" }}>No orders yet</div>
      )}
    </div>
  );
}

// ─── QR Tab ───────────────────────────────────────────────────────────────────

const QR_NAVY = "#1B3A7A";
const QR_BLUE = "#2D6BCC";

interface QrViewerOrder {
  id: string;
  code: string;
  telegramUsername: string;
  status: string;
  deliveryMethod: string | null;
  inpostQrCode: string | null;
  royalMailQrCode: string | null;
  qrCodes: Record<string, string> | null;
  qrPosted: boolean;
}

function stripAt(u: string) { return u.replace(/^@/, ""); }

function QrLightbox({ dataUrl, label, username, onClose }: { dataUrl: string; label: string; username: string; onClose: () => void }) {
  const download = () => {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${stripAt(username)}-${label.replace(/\s+/g, "-")}-qr.png`;
    a.click();
  };
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl overflow-hidden bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "#e2e8f0" }}>
          <div>
            <p className="text-xs font-bold" style={{ color: QR_NAVY }}>@{stripAt(username)}</p>
            <p className="text-[10px]" style={{ color: "#94a3b8" }}>{label}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.06)" }}>
            <X className="w-3.5 h-3.5" style={{ color: "#64748b" }} />
          </button>
        </div>
        <div className="p-4 flex items-center justify-center bg-white">
          <img src={dataUrl} alt={`${label} QR`} className="w-full h-auto object-contain rounded-xl" style={{ maxHeight: "70vh" }} />
        </div>
        <div className="px-4 pb-4">
          <button
            onClick={download}
            className="w-full flex items-center justify-center gap-1.5 h-9 rounded-xl text-[12px] font-bold"
            style={{ background: `linear-gradient(135deg, ${QR_NAVY} 0%, ${QR_BLUE} 100%)`, color: "#fff" }}
          >
            <Download className="w-3.5 h-3.5" /> Download
          </button>
        </div>
      </div>
    </div>
  );
}

function QrOrderCard({ order, gbId, onTogglePosted }: { order: QrViewerOrder; gbId: string; onTogglePosted: (id: string, posted: boolean) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lightbox, setLightbox] = useState<{ dataUrl: string; label: string } | null>(null);

  const qrImages: { label: string; dataUrl: string }[] = [];
  if (order.inpostQrCode) qrImages.push({ label: "InPost", dataUrl: order.inpostQrCode });
  if (order.royalMailQrCode) qrImages.push({ label: "Royal Mail", dataUrl: order.royalMailQrCode });
  if (order.qrCodes) {
    Object.entries(order.qrCodes).forEach(([k, v]) => {
      if (v && !["inpost", "royal-mail"].includes(k)) {
        qrImages.push({ label: k.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase()), dataUrl: v });
      }
    });
  }
  const hasAny = qrImages.length > 0;

  async function handleToggle(e: React.MouseEvent) {
    e.stopPropagation();
    setSaving(true);
    try { await onTogglePosted(order.id, !order.qrPosted); } finally { setSaving(false); }
  }

  return (
    <>
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          border: `1px solid ${order.qrPosted ? "rgba(22,163,74,0.2)" : hasAny ? `rgba(27,58,122,0.2)` : "rgba(148,163,184,0.25)"}`,
          background: order.qrPosted ? "rgba(22,163,74,0.03)" : hasAny ? "rgba(27,58,122,0.03)" : "#fafafa",
        }}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <button type="button" className="flex items-center gap-3 flex-1 min-w-0 text-left" onClick={() => hasAny && setOpen(o => !o)}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: order.qrPosted ? "rgba(22,163,74,0.1)" : hasAny ? "rgba(27,58,122,0.08)" : "rgba(148,163,184,0.1)" }}>
              {order.qrPosted
                ? <CheckCircle2 className="w-4 h-4" style={{ color: "#16A34A" }} />
                : hasAny
                  ? <QrCode className="w-4 h-4" style={{ color: QR_NAVY }} />
                  : <Package className="w-4 h-4" style={{ color: "#94A3B8" }} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate" style={{ color: order.qrPosted ? "#16A34A" : hasAny ? QR_NAVY : "#64748B" }}>
                @{stripAt(order.telegramUsername)}
              </p>
              <p className="text-[11px] truncate" style={{ color: "#94A3B8" }}>
                {order.code} · {order.deliveryMethod || "—"}
              </p>
            </div>
          </button>
          <div className="flex items-center gap-2 shrink-0">
            {order.qrPosted ? (
              <button type="button" onClick={handleToggle} disabled={saving}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all hover:opacity-80"
                style={{ background: "rgba(27,58,122,0.08)", borderColor: "rgba(27,58,122,0.2)", color: QR_NAVY, minWidth: 64 }}>
                {saving ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <RotateCcw className="w-2.5 h-2.5" />} Posted
              </button>
            ) : hasAny ? (
              <button type="button" onClick={handleToggle} disabled={saving}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-white transition-all hover:opacity-90"
                style={{ background: `linear-gradient(135deg, ${QR_NAVY} 0%, ${QR_BLUE} 100%)`, minWidth: 100 }}>
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Order Posted
              </button>
            ) : null}
            {hasAny && (
              <button type="button" onClick={() => setOpen(o => !o)}
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(27,58,122,0.05)" }}>
                {open ? <ChevronUp className="w-4 h-4" style={{ color: QR_NAVY }} /> : <ChevronDown className="w-4 h-4" style={{ color: QR_NAVY }} />}
              </button>
            )}
          </div>
        </div>

        {open && hasAny && (
          <div className="border-t px-4 pb-4 pt-3 space-y-4" style={{ borderColor: "rgba(27,58,122,0.1)" }}>
            {qrImages.map(({ label, dataUrl }) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <p className="text-xs font-semibold" style={{ color: QR_NAVY }}>{label}</p>
                <button
                  type="button"
                  onClick={() => setLightbox({ dataUrl, label })}
                  className="p-2 rounded-xl bg-white border hover:opacity-80 transition-opacity"
                  style={{ border: `1px solid rgba(27,58,122,0.15)`, cursor: "zoom-in" }}
                  title="Click to enlarge"
                >
                  <img src={dataUrl} alt={`${label} QR`} className="max-h-40 max-w-full object-contain" />
                </button>
                {order.qrPosted ? (
                  <button type="button" onClick={handleToggle} disabled={saving}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all hover:opacity-80"
                    style={{ background: "rgba(22,163,74,0.08)", borderColor: "rgba(22,163,74,0.2)", color: "#16A34A" }}>
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />} Posted
                  </button>
                ) : (
                  <button type="button" onClick={handleToggle} disabled={saving}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold text-white transition-all hover:opacity-90"
                    style={{ background: `linear-gradient(135deg, ${QR_NAVY} 0%, ${QR_BLUE} 100%)` }}>
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Mark as Posted
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {lightbox && (
        <QrLightbox
          dataUrl={lightbox.dataUrl}
          label={lightbox.label}
          username={order.telegramUsername}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  );
}

function QrSectionHeader({ icon, label, count, color }: { icon: React.ReactNode; label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <div className="flex items-center gap-1.5 shrink-0" style={{ color }}>
        {icon}
        <span className="text-[11px] font-bold uppercase tracking-widest">{label}</span>
        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black leading-none"
          style={{ background: `${color}18`, color }}>{count}</span>
      </div>
      <div className="flex-1 h-px" style={{ background: `${color}28` }} />
    </div>
  );
}

function QrTab({ gbId }: { gbId: string }) {
  const [data, setData] = useState<{ gbName: string; orders: QrViewerOrder[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "not-posted" | "posted" | "waiting">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reshipFetch(`/api/reshipper/gb/${gbId}/all-orders-qr`, { credentials: "include" });
      if (res.ok) setData(await res.json());
    } catch {}
    finally { setLoading(false); }
  }, [gbId]);

  useEffect(() => { load(); }, [load]);

  const handleTogglePosted = useCallback(async (orderId: string, posted: boolean) => {
    const res = await reshipFetch(`/api/reshipper/gb/${gbId}/orders/${orderId}/qr-posted`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ posted }),
    });
    if (!res.ok) throw new Error("Failed to update");
    setData(prev => prev ? { ...prev, orders: prev.orders.map(o => o.id === orderId ? { ...o, qrPosted: posted } : o) } : prev);
  }, [gbId]);

  const allOrders = data?.orders ?? [];
  const withQr = allOrders.filter(o => o.inpostQrCode || o.royalMailQrCode || (o.qrCodes && Object.values(o.qrCodes).some(Boolean)));
  const waitingOrders = allOrders.filter(o => !o.inpostQrCode && !o.royalMailQrCode && (!o.qrCodes || !Object.values(o.qrCodes).some(Boolean)));
  const notPostedOrders = withQr.filter(o => !o.qrPosted);
  const postedOrders = withQr.filter(o => o.qrPosted);

  function matchesSearch(o: QrViewerOrder) {
    return !search || stripAt(o.telegramUsername).toLowerCase().includes(search.toLowerCase()) || o.code.toLowerCase().includes(search.toLowerCase());
  }
  const filteredNotPosted = notPostedOrders.filter(matchesSearch);
  const filteredPosted = postedOrders.filter(matchesSearch);
  const filteredWaiting = waitingOrders.filter(matchesSearch);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: QR_NAVY }} />
        <p className="text-sm" style={{ color: "var(--t-subtle)" }}>Loading QR codes…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94A3B8" }} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by username or order code…"
          className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2"
          style={{ border: "1px solid var(--t-border)", background: "var(--t-surface)", color: "var(--t-text)" }}
        />
        {search && (
          <button type="button" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="w-4 h-4" style={{ color: "#94A3B8" }} />
          </button>
        )}
      </div>

      {/* Filter tabs */}
      {data && (
        <div className="flex gap-1.5 flex-wrap">
          {([
            { key: "all",        label: "All",        count: allOrders.length,       color: QR_NAVY },
            { key: "not-posted", label: "Not Posted", count: notPostedOrders.length, color: QR_NAVY },
            { key: "posted",     label: "Posted",     count: postedOrders.length,    color: "#16A34A" },
            { key: "waiting",    label: "Waiting",    count: waitingOrders.length,   color: "#D97706" },
          ] as const).map(({ key, label, count, color }) => {
            const active = filter === key;
            return (
              <button key={key} type="button" onClick={() => setFilter(key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all"
                style={active
                  ? { background: color, color: "#fff", boxShadow: `0 2px 8px ${color}40` }
                  : { background: "var(--t-surface)", color: "#64748B", border: "1px solid var(--t-border)" }}>
                {label}
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black leading-none"
                  style={active ? { background: "rgba(255,255,255,0.25)", color: "#fff" } : { background: "rgba(27,58,122,0.08)", color: "#64748B" }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Stats */}
      {data && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Total Orders", value: allOrders.length, color: QR_NAVY },
            { label: "QR Uploaded",  value: withQr.length,   color: "#16A34A" },
            { label: "Posted",       value: postedOrders.length, color: "#16A34A" },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
              <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[9px] uppercase tracking-wider mt-0.5" style={{ color: "#94A3B8" }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Refresh button (top-right aligned) */}
      <div className="flex justify-end">
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 h-7 px-3 rounded-lg text-[11px] font-bold"
          style={{ background: "var(--t-surface2)", color: "var(--t-muted)", border: "1px solid var(--t-border)" }}>
          {loading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <RefreshCw className="w-2.5 h-2.5" />} Refresh
        </button>
      </div>

      {/* Not Posted section */}
      {data && (filter === "all" || filter === "not-posted") && (
        <>
          <QrSectionHeader icon={<Package className="w-3.5 h-3.5" />} label="Not Posted" count={filteredNotPosted.length} color={QR_NAVY} />
          {filteredNotPosted.length === 0 && (
            <p className="text-center text-xs py-4" style={{ color: "#94A3B8" }}>No pending QR codes to post</p>
          )}
          <div className="space-y-2">
            {filteredNotPosted.map(order => (
              <QrOrderCard key={order.id} order={order} gbId={gbId} onTogglePosted={handleTogglePosted} />
            ))}
          </div>
        </>
      )}

      {/* Waiting for QR section */}
      {data && (filter === "all" || filter === "waiting") && (
        <>
          <QrSectionHeader icon={<Truck className="w-3.5 h-3.5" />} label="Waiting for QR Code" count={filteredWaiting.length} color="#D97706" />
          {filteredWaiting.length === 0 && (
            <p className="text-center text-xs py-4" style={{ color: "#94A3B8" }}>Everyone has uploaded their QR code</p>
          )}
          <div className="space-y-2">
            {filteredWaiting.map(order => (
              <div key={order.id} className="rounded-2xl px-4 py-3 flex items-center gap-3"
                style={{ border: "1px solid rgba(148,163,184,0.2)", background: "var(--t-surface)" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(148,163,184,0.1)" }}>
                  <Package className="w-4 h-4" style={{ color: "#94A3B8" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: "#64748B" }}>@{stripAt(order.telegramUsername)}</p>
                  <p className="text-[11px] truncate" style={{ color: "#94A3B8" }}>{order.code} · {order.deliveryMethod || "—"} · {order.status}</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                  style={{ background: "rgba(245,158,11,0.1)", color: "#D97706" }}>No QR</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Posted section */}
      {data && (filter === "all" || filter === "posted") && (
        <>
          <QrSectionHeader icon={<CheckCircle2 className="w-3.5 h-3.5" />} label="Posted" count={filteredPosted.length} color="#16A34A" />
          {filteredPosted.length === 0 && (
            <p className="text-center text-xs py-4" style={{ color: "#94A3B8" }}>No posted orders yet</p>
          )}
          <div className="space-y-2 pb-4">
            {filteredPosted.map(order => (
              <QrOrderCard key={order.id} order={order} gbId={gbId} onTogglePosted={handleTogglePosted} />
            ))}
          </div>
        </>
      )}

      {!data && !loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "rgba(99,102,241,0.08)" }}>
            <QrCode className="w-6 h-6" style={{ color: "#6366F1" }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: "var(--t-muted)" }}>Could not load QR codes</p>
          <button onClick={load} className="text-xs font-bold" style={{ color: QR_NAVY }}>Try again</button>
        </div>
      )}
    </div>
  );
}

// ─── CSV Export helper ─────────────────────────────────────────────────────────

function exportOrdersCsv(orders: ROrder[], gbName: string, currency?: string) {
  const sym = currencySymbol(currency);
  const headers = ["Code", "Telegram", "Status", "Payment", `Total (${sym})`, "Name", "Address", "City", "Postcode", "Country", "Tracking", "Date"];
  const rows = orders.map(o => [
    o.code,
    `@${o.telegramUsername.replace(/^@/, "")}`,
    o.status,
    PAYMENT_LABEL[o.paymentStatus] ?? o.paymentStatus,
    fmtCurrency(o.grandTotal ?? 0),
    o.shippingName ?? "",
    o.shippingAddress ?? "",
    (o as any).shippingCity ?? "",
    (o as any).shippingPostcode ?? "",
    (o as any).shippingCountry ?? "",
    o.trackingNumber ?? "",
    new Date(o.createdAt).toLocaleDateString("en-GB"),
  ]);
  const csvContent = [headers, ...rows]
    .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${gbName.replace(/[^a-z0-9]/gi, "-")}-orders.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Orders Tab ───────────────────────────────────────────────────────────────

function OrdersTab({ gbId, orders, gbName, onOrderUpdate, currency }: {
  gbId: string;
  orders: ROrder[];
  gbName: string;
  onOrderUpdate: (updated: ROrder) => void;
  currency?: string;
}) {
  const sym = currencySymbol(currency);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPayment, setFilterPayment] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterPayDateFrom, setFilterPayDateFrom] = useState("");
  const [filterPayDateTo, setFilterPayDateTo] = useState("");
  const [sortBy, setSortBy] = useState<"order_desc" | "order_asc" | "pay_desc" | "pay_asc">("order_desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<Partial<ROrder>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [trackingEditId, setTrackingEditId] = useState<string | null>(null);
  const [trackingNums, setTrackingNums] = useState<string[]>([""]);
  const [savingTracking, setSavingTracking] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<Record<string, ROrder>>({});
  const [msg, setMsg] = useState<Record<string, string>>({});
  const [reshQrSaving, setReshQrSaving] = useState<Record<string, boolean>>({});
  const [reshQrMsg, setReshQrMsg] = useState<Record<string, { ok: boolean; text: string }>>({});

  const filtered = useMemo(() => {
    let list = orders;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(o => o.telegramUsername.toLowerCase().includes(q) || o.code.toLowerCase().includes(q));
    }
    if (filterStatus !== "all") list = list.filter(o => o.status === filterStatus);
    if (filterPayment !== "all") list = list.filter(o => o.paymentStatus === filterPayment);
    if (filterDateFrom) {
      const from = new Date(filterDateFrom).getTime();
      list = list.filter(o => new Date(o.createdAt).getTime() >= from);
    }
    if (filterDateTo) {
      const to = new Date(filterDateTo + "T23:59:59").getTime();
      list = list.filter(o => new Date(o.createdAt).getTime() <= to);
    }
    if (filterPayDateFrom) {
      const from = new Date(filterPayDateFrom).getTime();
      list = list.filter(o => o.paymentConfirmedAt != null && new Date(o.paymentConfirmedAt).getTime() >= from);
    }
    if (filterPayDateTo) {
      const to = new Date(filterPayDateTo + "T23:59:59").getTime();
      list = list.filter(o => o.paymentConfirmedAt != null && new Date(o.paymentConfirmedAt).getTime() <= to);
    }
    return [...list].sort((a, b) => {
      if (sortBy === "order_asc") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === "pay_desc") {
        const at = a.paymentConfirmedAt ? new Date(a.paymentConfirmedAt).getTime() : 0;
        const bt = b.paymentConfirmedAt ? new Date(b.paymentConfirmedAt).getTime() : 0;
        return bt - at;
      }
      if (sortBy === "pay_asc") {
        const at = a.paymentConfirmedAt ? new Date(a.paymentConfirmedAt).getTime() : Infinity;
        const bt = b.paymentConfirmedAt ? new Date(b.paymentConfirmedAt).getTime() : Infinity;
        return at - bt;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [orders, search, filterStatus, filterPayment, filterDateFrom, filterDateTo, filterPayDateFrom, filterPayDateTo, sortBy]);

  const loadDetail = useCallback(async (orderId: string) => {
    if (orderDetails[orderId]) return;
    setLoadingDetail(orderId);
    try {
      const res = await reshipFetch(`/api/reshipper/gb/${gbId}/orders/${orderId}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setOrderDetails(prev => ({ ...prev, [orderId]: data }));
      }
    } finally { setLoadingDetail(null); }
  }, [gbId, orderDetails]);

  const toggleExpand = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    await loadDetail(id);
  };

  const uploadReshQr = async (orderId: string, courier: string, file: File | null) => {
    const key = `${orderId}-${courier}`;
    setReshQrSaving(prev => ({ ...prev, [key]: true }));
    setReshQrMsg(prev => ({ ...prev, [key]: { ok: false, text: "" } }));
    try {
      let qrCode: string | null = null;
      if (file) {
        qrCode = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }
      const field = courier === "inpost" ? "inpostQrCode" : "royalMailQrCode";
      const res = await reshipFetch(`/api/reshipper/gb/${gbId}/orders/${orderId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: qrCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReshQrMsg(prev => ({ ...prev, [key]: { ok: false, text: data.error || "Upload failed" } }));
      } else {
        setOrderDetails(prev => ({ ...prev, [orderId]: { ...(prev[orderId] ?? {}), ...data } as ROrder }));
        onOrderUpdate(data);
        setReshQrMsg(prev => ({ ...prev, [key]: { ok: true, text: qrCode ? "Uploaded ✓" : "Cleared ✓" } }));
        setTimeout(() => setReshQrMsg(prev => ({ ...prev, [key]: { ok: false, text: "" } })), 2500);
      }
    } catch {
      setReshQrMsg(prev => ({ ...prev, [key]: { ok: false, text: "Network error" } }));
    }
    setReshQrSaving(prev => ({ ...prev, [key]: false }));
  };

  const startEdit = (order: ROrder) => {
    const detail = orderDetails[order.id] ?? order;
    setEditingId(order.id);
    setEditFields({
      shippingName: detail.shippingName ?? "",
      shippingAddress: detail.shippingAddress ?? "",
      shippingCity: detail.shippingCity ?? "",
      shippingPostcode: detail.shippingPostcode ?? "",
      trackingNumbers: detail.trackingNumbers?.length ? detail.trackingNumbers : (detail.trackingNumber ? [detail.trackingNumber] : []),
      status: detail.status,
    });
  };

  const saveOrder = async (orderId: string) => {
    setSaving(orderId);
    try {
      const res = await reshipFetch(`/api/reshipper/gb/${gbId}/orders/${orderId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFields),
      });
      const data = await res.json();
      if (res.ok) {
        onOrderUpdate(data);
        setOrderDetails(prev => ({ ...prev, [orderId]: { ...(prev[orderId] ?? {}), ...data } as ROrder }));
        setEditingId(null);
        setMsg(prev => ({ ...prev, [orderId]: "Saved ✓" }));
        setTimeout(() => setMsg(prev => ({ ...prev, [orderId]: "" })), 2500);
      } else {
        setMsg(prev => ({ ...prev, [orderId]: data.error || "Save failed" }));
        setTimeout(() => setMsg(prev => ({ ...prev, [orderId]: "" })), 3000);
      }
    } catch { setMsg(prev => ({ ...prev, [orderId]: "Network error" })); }
    setSaving(null);
  };

  const startTrackingEdit = (order: ROrder) => {
    const detail = orderDetails[order.id] ?? order;
    const existing = detail.trackingNumbers?.length
      ? detail.trackingNumbers
      : detail.trackingNumber
        ? [detail.trackingNumber]
        : [""];
    setTrackingNums(existing);
    setTrackingEditId(order.id);
  };

  const saveTracking = async (orderId: string) => {
    setSavingTracking(orderId);
    const cleaned = trackingNums.map(v => v.trim()).filter(Boolean);
    try {
      const res = await reshipFetch(`/api/reshipper/gb/${gbId}/orders/${orderId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingNumbers: cleaned }),
      });
      const data = await res.json();
      if (res.ok) {
        onOrderUpdate(data);
        setOrderDetails(prev => ({ ...prev, [orderId]: { ...(prev[orderId] ?? {}), ...data } as ROrder }));
        setTrackingEditId(null);
        setMsg(prev => ({ ...prev, [orderId]: "Tracking saved ✓" }));
        setTimeout(() => setMsg(prev => ({ ...prev, [orderId]: "" })), 2500);
      } else {
        setMsg(prev => ({ ...prev, [orderId]: data.error || "Save failed" }));
        setTimeout(() => setMsg(prev => ({ ...prev, [orderId]: "" })), 3000);
      }
    } catch { setMsg(prev => ({ ...prev, [orderId]: "Network error" })); }
    setSavingTracking(null);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--t-subtle)" }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search username or code…"
            className="w-full pl-8 pr-3 py-2 rounded-xl text-sm focus:outline-none"
            style={{ ...inputStyle }}
          />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="h-9 rounded-xl px-3 text-xs focus:outline-none" style={inputStyle}>
          <option value="all">All statuses</option>
          {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterPayment} onChange={e => setFilterPayment(e.target.value)}
          className="h-9 rounded-xl px-3 text-xs focus:outline-none" style={inputStyle}>
          <option value="all">All payments</option>
          {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{PAYMENT_LABEL[s] ?? s}</option>)}
        </select>
      </div>
      <div className="flex gap-2 flex-wrap items-center">
        <span className="text-[10px] font-semibold" style={{ color: "var(--t-subtle)" }}>Order date:</span>
        <div className="flex items-center gap-1">
          <label className="text-[10px]" style={{ color: "var(--t-subtle)" }}>From</label>
          <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
            className="h-8 rounded-xl px-2 text-xs focus:outline-none" style={inputStyle} />
        </div>
        <div className="flex items-center gap-1">
          <label className="text-[10px]" style={{ color: "var(--t-subtle)" }}>To</label>
          <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
            className="h-8 rounded-xl px-2 text-xs focus:outline-none" style={inputStyle} />
        </div>
        {(filterDateFrom || filterDateTo) && (
          <button onClick={() => { setFilterDateFrom(""); setFilterDateTo(""); }}
            className="h-7 px-2 rounded-lg text-[10px] font-semibold flex items-center gap-1"
            style={{ background: "var(--t-surface2)", color: "var(--t-subtle)", border: "1px solid var(--t-border)" }}>
            <X className="w-2.5 h-2.5" /> Clear
          </button>
        )}
      </div>
      <div className="flex gap-2 flex-wrap items-center">
        <span className="text-[10px] font-semibold" style={{ color: "var(--t-subtle)" }}>Payment date:</span>
        <div className="flex items-center gap-1">
          <label className="text-[10px]" style={{ color: "var(--t-subtle)" }}>From</label>
          <input type="date" value={filterPayDateFrom} onChange={e => setFilterPayDateFrom(e.target.value)}
            className="h-8 rounded-xl px-2 text-xs focus:outline-none" style={inputStyle} />
        </div>
        <div className="flex items-center gap-1">
          <label className="text-[10px]" style={{ color: "var(--t-subtle)" }}>To</label>
          <input type="date" value={filterPayDateTo} onChange={e => setFilterPayDateTo(e.target.value)}
            className="h-8 rounded-xl px-2 text-xs focus:outline-none" style={inputStyle} />
        </div>
        {(filterPayDateFrom || filterPayDateTo) && (
          <button onClick={() => { setFilterPayDateFrom(""); setFilterPayDateTo(""); }}
            className="h-7 px-2 rounded-lg text-[10px] font-semibold flex items-center gap-1"
            style={{ background: "var(--t-surface2)", color: "var(--t-subtle)", border: "1px solid var(--t-border)" }}>
            <X className="w-2.5 h-2.5" /> Clear
          </button>
        )}
      </div>
      <div className="flex gap-2 flex-wrap items-center">
        <span className="text-[10px] font-semibold" style={{ color: "var(--t-subtle)" }}>Sort:</span>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
          className="h-8 rounded-xl px-2 text-xs focus:outline-none" style={inputStyle}>
          <option value="order_desc">Newest order first</option>
          <option value="order_asc">Oldest order first</option>
          <option value="pay_desc">Most recent paid first</option>
          <option value="pay_asc">First paid first</option>
        </select>
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px]" style={{ color: "var(--t-subtle)" }}>{filtered.length} of {orders.length} orders</p>
        <button
          onClick={() => exportOrdersCsv(filtered, gbName, currency)}
          disabled={filtered.length === 0}
          className="flex items-center gap-1.5 h-7 px-3 rounded-lg text-[11px] font-bold transition-all disabled:opacity-40"
          style={{ background: "rgba(22,163,74,0.08)", color: "#16A34A", border: "1px solid rgba(22,163,74,0.2)" }}>
          <FileDown className="w-3 h-3" /> Export CSV
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12" style={{ color: "var(--t-subtle)" }}>No orders found</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(order => {
            const sc = STATUS_COLOR[order.status] ?? STATUS_COLOR.Draft;
            const isOpen = expandedId === order.id;
            const isEditing = editingId === order.id;
            const detail = orderDetails[order.id];
            const allowed = ALLOWED_STATUS_TRANSITIONS[order.status] ?? [];

            return (
              <div key={order.id} className="rounded-2xl overflow-hidden"
                style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
                {/* Row summary */}
                <div className="px-4 py-3 flex items-center gap-3 cursor-pointer"
                  onClick={() => toggleExpand(order.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold" style={{ color: "var(--t-muted)" }}>{order.code}</span>
                      <span className="text-xs font-semibold" style={{ color: "var(--t-text)" }}>@{order.telegramUsername.replace(/^@/, "")}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ color: sc.color, background: sc.bg }}>
                        {order.status}
                      </span>
                      <span className="text-[10px] font-semibold" style={{ color: PAYMENT_COLOR[order.paymentStatus] ?? "#94A3B8" }}>
                        {PAYMENT_LABEL[order.paymentStatus] ?? order.paymentStatus}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs font-bold tabular-nums" style={{ color: "var(--t-text)" }}>
                        {sym}{fmtCurrency(order.grandTotal)}
                      </span>
                      {order.trackingNumber && (
                        <span className="font-mono text-[10px]" style={{ color: "var(--t-blue)" }}>
                          #{order.trackingNumber}
                        </span>
                      )}
                      <span className="text-[10px]" style={{ color: "var(--t-subtle)" }}>
                        {new Date(order.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    </div>
                  </div>
                  {loadingDetail === order.id
                    ? <Loader2 className="w-4 h-4 animate-spin shrink-0" style={{ color: "var(--t-subtle)" }} />
                    : isOpen
                      ? <ChevronUp className="w-4 h-4 shrink-0" style={{ color: "var(--t-muted)" }} />
                      : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: "var(--t-muted)" }} />
                  }
                </div>

                {/* Expanded detail */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                      <div className="border-t px-4 py-4 space-y-4" style={{ borderColor: "var(--t-border)" }}>

                        {/* Line items */}
                        {detail?.lineItems && detail.lineItems.length > 0 && (
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--t-subtle)" }}>Items</p>
                            <div className="space-y-1.5">
                              {detail.lineItems.map((item, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0"
                                    style={{ background: "var(--t-surface2)", color: "var(--t-muted)" }}>{item.quantity}</span>
                                  <span className="flex-1 text-[11px] font-medium" style={{ color: "var(--t-text)" }}>{item.productName}</span>
                                  <span className="text-[11px] font-bold tabular-nums" style={{ color: "var(--t-text)" }}>
                                    {sym}{fmtCurrency(item.lineTotal)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Transaction ID */}
                        {detail?.paymentTxHash && (
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--t-subtle)" }}>Transaction ID</p>
                            <p className="font-mono text-xs break-all" style={{ color: "var(--t-muted)" }}>{detail.paymentTxHash}</p>
                          </div>
                        )}

                        {/* Tracking section */}
                        {(() => {
                          const det = orderDetails[order.id] ?? order;
                          const currentNums: string[] = det.trackingNumbers?.length
                            ? det.trackingNumbers
                            : det.trackingNumber ? [det.trackingNumber] : [];
                          const isEditingTracking = trackingEditId === order.id;
                          return (
                            <div className="rounded-xl p-3 space-y-2" style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.18)" }}>
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[9px] font-bold uppercase tracking-widest flex items-center gap-1" style={{ color: "var(--t-blue)" }}>
                                  <MapPin className="w-2.5 h-2.5" /> Tracking
                                </p>
                                {!isEditingTracking && (
                                  <button
                                    onClick={() => startTrackingEdit(order)}
                                    className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-lg"
                                    style={{ background: "rgba(59,130,246,0.1)", color: "var(--t-blue)", border: "1px solid rgba(59,130,246,0.25)" }}>
                                    <Pencil className="w-2.5 h-2.5" />
                                    {currentNums.length ? "Edit" : "Add"}
                                  </button>
                                )}
                              </div>
                              {isEditingTracking ? (
                                <div className="space-y-2">
                                  <div className="space-y-1">
                                    {(trackingNums.length ? trackingNums : [""]).map((v, i, arr) => (
                                      <div key={i} className="flex gap-1">
                                        <input
                                          value={v}
                                          onChange={e => { const n = [...arr]; n[i] = e.target.value; setTrackingNums(n); }}
                                          placeholder={i === 0 ? "e.g. AB123456789GB" : "Additional tracking…"}
                                          className={inputCls("text-xs font-mono")}
                                          style={inputStyle}
                                          autoFocus={i === 0}
                                        />
                                        {arr.length > 1 && (
                                          <button type="button"
                                            className="h-8 w-7 rounded-lg flex items-center justify-center text-red-400 hover:text-red-600 shrink-0"
                                            style={{ border: "1px solid var(--t-border)", background: "var(--t-surface2)" }}
                                            onClick={() => setTrackingNums(arr.filter((_, j) => j !== i))}>
                                            <X className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                    {trackingNums.length < 10 && (
                                      <button type="button"
                                        className="flex items-center gap-1 text-[10px] font-semibold hover:underline"
                                        style={{ color: "var(--t-accent)" }}
                                        onClick={() => setTrackingNums(prev => [...prev, ""])}>
                                        <Plus className="w-2.5 h-2.5" /> Add tracking number
                                      </button>
                                    )}
                                  </div>
                                  <div className="flex gap-2">
                                    <button onClick={() => saveTracking(order.id)} disabled={savingTracking === order.id}
                                      className="h-7 px-3 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 disabled:opacity-60"
                                      style={{ background: "var(--t-blue-deep)" }}>
                                      {savingTracking === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                      Save
                                    </button>
                                    <button onClick={() => setTrackingEditId(null)}
                                      className="h-7 px-3 rounded-lg text-xs font-semibold"
                                      style={{ background: "var(--t-surface2)", color: "var(--t-muted)", border: "1px solid var(--t-border)" }}>
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : currentNums.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {currentNums.map((tn, i) => (
                                    <span key={i} className="font-mono text-[11px] px-2 py-0.5 rounded-md"
                                      style={{ background: "rgba(59,130,246,0.1)", color: "var(--t-blue)", border: "1px solid rgba(59,130,246,0.2)" }}>
                                      {tn}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[11px]" style={{ color: "var(--t-subtle)" }}>No tracking added yet</p>
                              )}
                            </div>
                          );
                        })()}

                        {/* Edit form */}
                        {isEditing ? (
                          <div className="space-y-3 p-3 rounded-xl" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
                            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "var(--t-subtle)" }}>Edit Order</p>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { key: "shippingName", label: "Name" },
                                { key: "shippingAddress", label: "Address" },
                                { key: "shippingCity", label: "City" },
                                { key: "shippingPostcode", label: "Postcode" },
                              ].map(f => (
                                <div key={f.key} className={f.key === "shippingAddress" ? "col-span-2" : ""}>
                                  <label className="text-[10px] font-semibold mb-1 block" style={{ color: "var(--t-subtle)" }}>{f.label}</label>
                                  <input
                                    value={(editFields as Record<string, string>)[f.key] ?? ""}
                                    onChange={e => setEditFields(prev => ({ ...prev, [f.key]: e.target.value }))}
                                    className={inputCls("text-xs")}
                                    style={inputStyle}
                                  />
                                </div>
                              ))}
                              <div className="col-span-2">
                                <label className="text-[10px] font-semibold mb-1 block" style={{ color: "var(--t-subtle)" }}>Tracking Numbers</label>
                                <div className="space-y-1">
                                  {((editFields.trackingNumbers as string[] | undefined)?.length ? editFields.trackingNumbers as string[] : [""]).map((v, i, arr) => (
                                    <div key={i} className="flex gap-1">
                                      <input
                                        value={v}
                                        onChange={e => { const n = [...arr]; n[i] = e.target.value; setEditFields(prev => ({ ...prev, trackingNumbers: n })); }}
                                        placeholder={i === 0 ? "e.g. AB123456789GB" : "Additional tracking…"}
                                        className={inputCls("text-xs font-mono")}
                                        style={inputStyle}
                                      />
                                      {arr.length > 1 && (
                                        <button type="button" className="h-8 w-7 rounded-lg flex items-center justify-center text-red-400 hover:text-red-600 shrink-0"
                                          style={{ border: "1px solid var(--t-border)", background: "var(--t-surface2)" }}
                                          onClick={() => setEditFields(prev => ({ ...prev, trackingNumbers: arr.filter((_, j) => j !== i) }))}>
                                          <X className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                  {((editFields.trackingNumbers as string[] | undefined) ?? []).length < 10 && (
                                    <button type="button" className="flex items-center gap-1 text-[10px] font-semibold hover:underline"
                                      style={{ color: "var(--t-accent)" }}
                                      onClick={() => setEditFields(prev => ({ ...prev, trackingNumbers: [...((prev.trackingNumbers as string[] | undefined) ?? []), ""] }))}>
                                      <Plus className="w-2.5 h-2.5" /> Add tracking number
                                    </button>
                                  )}
                                </div>
                              </div>
                              {allowed.length > 0 && (
                                <div>
                                  <label className="text-[10px] font-semibold mb-1 block" style={{ color: "var(--t-subtle)" }}>Status</label>
                                  <select
                                    value={editFields.status ?? order.status}
                                    onChange={e => setEditFields(prev => ({ ...prev, status: e.target.value }))}
                                    className="w-full h-9 rounded-xl px-2 text-xs focus:outline-none" style={inputStyle}>
                                    <option value={order.status}>{order.status} (current)</option>
                                    {allowed.map(s => <option key={s} value={s}>{s}</option>)}
                                  </select>
                                </div>
                              )}
                            </div>
                            {msg[order.id] && (
                              <p className={`text-xs font-semibold ${msg[order.id].includes("✓") ? "" : "text-red-500"}`}
                                style={msg[order.id].includes("✓") ? { color: "#16A34A" } : undefined}>
                                {msg[order.id]}
                              </p>
                            )}
                            <div className="flex gap-2">
                              <button onClick={() => saveOrder(order.id)} disabled={saving === order.id}
                                className="h-8 px-4 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 disabled:opacity-60"
                                style={{ background: "var(--t-blue-deep)" }}>
                                {saving === order.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                Save
                              </button>
                              <button onClick={() => setEditingId(null)}
                                className="h-8 px-3 rounded-xl text-xs font-semibold"
                                style={{ background: "var(--t-surface2)", color: "var(--t-muted)", border: "1px solid var(--t-border)" }}>
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            {detail && (
                              <div className="grid grid-cols-2 gap-2 mb-3 text-xs" style={{ color: "var(--t-muted)" }}>
                                {detail.shippingName && <div><span className="text-[9px] font-bold uppercase tracking-wide block" style={{ color: "var(--t-subtle)" }}>Name</span>{detail.shippingName}</div>}
                                {detail.shippingAddress && <div className="col-span-2"><span className="text-[9px] font-bold uppercase tracking-wide block" style={{ color: "var(--t-subtle)" }}>Address</span>{detail.shippingAddress}{detail.shippingCity ? `, ${detail.shippingCity}` : ""}{detail.shippingPostcode ? ` ${detail.shippingPostcode}` : ""}</div>}
                              </div>
                            )}
                            {msg[order.id] && (
                              <p className="text-xs font-semibold mb-2" style={{ color: msg[order.id].includes("✓") ? "#16A34A" : "#DC2626" }}>{msg[order.id]}</p>
                            )}
                            <button onClick={() => startEdit(order)}
                              className="h-7 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                              style={{ background: "var(--t-surface2)", color: "var(--t-muted)", border: "1px solid var(--t-border)" }}>
                              <Pencil className="w-3 h-3" /> Edit Address / Tracking
                            </button>
                          </div>
                        )}
                        {/* QR Code Upload */}
                        <div className="mt-3 rounded-xl p-3 space-y-2" style={{ background: "rgba(124,58,237,0.05)", border: "1px solid rgba(124,58,237,0.18)" }}>
                          <p className="text-[9px] font-bold uppercase tracking-widest flex items-center gap-1" style={{ color: "#7C3AED" }}>
                            <QrCode className="w-2.5 h-2.5" /> QR Codes
                          </p>
                          {(["inpost", "royal-mail"] as const).map(courier => {
                            const label = courier === "inpost" ? "InPost" : "Royal Mail";
                            const det = orderDetails[order.id] ?? order;
                            const existing = courier === "inpost" ? det.inpostQrCode : det.royalMailQrCode;
                            const key = `${order.id}-${courier}`;
                            const isUploading = reshQrSaving[key];
                            const qrMsg = reshQrMsg[key];
                            return (
                              <div key={courier} className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-semibold w-16 shrink-0" style={{ color: "#7C3AED" }}>{label}</span>
                                {existing ? (
                                  <div className="flex items-center gap-2">
                                    <img src={existing} alt={`${label} QR`} className="w-9 h-9 object-contain rounded border bg-white p-0.5" style={{ borderColor: "rgba(124,58,237,0.3)" }} />
                                    <button
                                      className="text-[10px] font-semibold disabled:opacity-50"
                                      style={{ color: "#DC2626" }}
                                      disabled={isUploading}
                                      onClick={() => uploadReshQr(order.id, courier, null)}
                                    >{isUploading ? "…" : "Clear"}</button>
                                  </div>
                                ) : (
                                  <label className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold cursor-pointer"
                                    style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.25)", color: "#7C3AED", opacity: isUploading ? 0.5 : 1 }}>
                                    <Upload className="w-2.5 h-2.5" />
                                    {isUploading ? "Uploading…" : "Upload"}
                                    <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,application/pdf" className="hidden"
                                      disabled={isUploading}
                                      onChange={e => { const f = e.target.files?.[0]; if (f) uploadReshQr(order.id, courier, f); e.target.value = ""; }}
                                    />
                                  </label>
                                )}
                                {qrMsg?.text && <span className="text-[10px] font-semibold" style={{ color: qrMsg.ok ? "#16A34A" : "#DC2626" }}>{qrMsg.text}</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Shipping Tab ─────────────────────────────────────────────────────────────

function ShippingTab({ gbId, initialGb, onGbUpdate, allowPayments, allowVendorShippingSplit }: {
  gbId: string;
  initialGb: RAssignment["gb"];
  onGbUpdate: (updated: RAssignment["gb"]) => void;
  allowPayments?: boolean;
  allowVendorShippingSplit?: boolean;
}) {
  type ShipOption = { id: string; label: string; price: number };
  const [gb, setGb] = useState(initialGb);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [shippingOptions, setShippingOptions] = useState<ShipOption[]>(gb?.shippingOptions ?? []);
  const [editOptIdx, setEditOptIdx] = useState<number | null>(null);
  const [newOpt, setNewOpt] = useState<{ label: string; price: string }>({ label: "", price: "" });
  const [showNewOpt, setShowNewOpt] = useState(false);

  const [form, setForm] = useState({
    paymentsEnabled: gb?.paymentsEnabled ?? false,
    orderPageMessage: gb?.orderPageMessage ?? "",
    qrUploadMessage: gb?.qrUploadMessage ?? "",
    vendorShippingEnabled: gb?.vendorShippingEnabled ?? false,
    vendorShippingAmount: String(gb?.vendorShippingAmount ?? ""),
    vendorShippingEqualPct: gb?.vendorShippingEqualPct ?? 100,
  });

  // QR couriers — derived from new field, with backward compat from old booleans
  const derivedCouriers = (): string[] => {
    if (gb?.qrUploadCouriers && gb.qrUploadCouriers.length > 0) return gb.qrUploadCouriers;
    const fallback: string[] = [];
    if (gb?.qrUploadInpostEnabled) fallback.push("InPost");
    if (gb?.qrUploadRoyalMailEnabled) fallback.push("Royal Mail");
    return fallback;
  };
  const [qrCouriers, setQrCouriers] = useState<string[]>(derivedCouriers);
  const [newCourier, setNewCourier] = useState("");

  const save = async () => {
    setSaving(true); setMsg("");
    try {
      const weightedPct = 100 - form.vendorShippingEqualPct;
      const body: Record<string, unknown> = {
        ...form,
        qrUploadCouriers: qrCouriers,
        vendorShippingAmount: form.vendorShippingAmount ? parseFloat(form.vendorShippingAmount) : null,
        vendorShippingMode: form.vendorShippingEqualPct === 100 ? "equal" : form.vendorShippingEqualPct === 0 ? "weighted" : "equal",
        vendorShippingEqualPct: form.vendorShippingEqualPct,
        shippingOptions,
      };
      void weightedPct;
      const res = await reshipFetch(`/api/reshipper/gb/${gbId}/settings`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        const updatedGb = {
          ...gb!,
          ...data,
          shippingOptions: data.shippingOptions ?? shippingOptions,
        } as RAssignment["gb"];
        setGb(updatedGb);
        onGbUpdate(updatedGb);
        setMsg("Saved ✓");
        setTimeout(() => setMsg(""), 2500);
      } else {
        setMsg(data.error || "Save failed");
      }
    } catch { setMsg("Network error"); }
    setSaving(false);
  };

  const Toggle = ({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) => (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm font-medium" style={{ color: "var(--t-text)" }}>{label}</span>
      <button onClick={() => onChange(!value)}>
        {value
          ? <ToggleRight className="w-6 h-6" style={{ color: "var(--t-blue-deep)" }} />
          : <ToggleLeft className="w-6 h-6" style={{ color: "var(--t-subtle)" }} />
        }
      </button>
    </div>
  );

  const addOption = () => {
    const price = parseFloat(newOpt.price);
    if (!newOpt.label || isNaN(price)) return;
    setShippingOptions(prev => [...prev, { id: `opt-${Date.now()}`, label: newOpt.label.trim(), price }]);
    setNewOpt({ label: "", price: "" });
    setShowNewOpt(false);
  };

  const removeOption = (idx: number) => setShippingOptions(prev => prev.filter((_, i) => i !== idx));

  const updateOption = (idx: number, field: "label" | "price", val: string) => {
    setShippingOptions(prev => prev.map((o, i) => i === idx
      ? { ...o, [field]: field === "price" ? parseFloat(val) || 0 : val }
      : o));
  };

  const addCourier = () => {
    const name = newCourier.trim();
    if (!name || qrCouriers.includes(name)) return;
    setQrCouriers(prev => [...prev, name]);
    setNewCourier("");
  };

  const removeCourier = (idx: number) => setQrCouriers(prev => prev.filter((_, i) => i !== idx));

  return (
    <div className="space-y-5 max-w-2xl">
      <section className="rounded-2xl p-4 space-y-1" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--t-subtle)" }}>Settings</p>
        {allowPayments && <Toggle value={form.paymentsEnabled} onChange={v => setForm(f => ({ ...f, paymentsEnabled: v }))} label="Accept Payments" />}
        {allowVendorShippingSplit && <Toggle value={form.vendorShippingEnabled} onChange={v => setForm(f => ({ ...f, vendorShippingEnabled: v }))} label="Vendor shipping split" />}
      </section>

      {form.vendorShippingEnabled && (
        <section className="rounded-2xl p-4 space-y-5" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
          <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>Configure Shipping Split</p>

          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--t-text)" }}>
              Total Vendor Shipping Cost ({currencySymbol(gb?.currency)})
            </label>
            <input
              value={form.vendorShippingAmount}
              onChange={e => setForm(f => ({ ...f, vendorShippingAmount: e.target.value }))}
              placeholder="e.g. 150.00"
              type="number" min="0" step="0.01"
              className={inputCls("text-sm w-full")}
              style={inputStyle}
            />
          </div>

          {/* Equal portion slider */}
          <div className="space-y-1.5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Equal portion</p>
                <p className="text-[11px]" style={{ color: "var(--t-subtle)" }}>Same amount per order</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <input
                  type="number" min="0" max="100" value={form.vendorShippingEqualPct}
                  onChange={e => {
                    let v = parseInt(e.target.value, 10);
                    if (isNaN(v)) v = 0;
                    v = Math.max(0, Math.min(100, v));
                    setForm(f => ({ ...f, vendorShippingEqualPct: v }));
                  }}
                  className="w-14 text-center text-sm font-bold rounded-xl border py-1 focus:outline-none"
                  style={{ borderColor: "var(--t-border)", background: "var(--t-surface2)", color: "var(--t-text)" }}
                />
                <span className="text-sm font-bold" style={{ color: "var(--t-muted)" }}>%</span>
              </div>
            </div>
            <input
              type="range" min="0" max="100" value={form.vendorShippingEqualPct}
              onChange={e => setForm(f => ({ ...f, vendorShippingEqualPct: parseInt(e.target.value, 10) }))}
              className="w-full accent-blue-700"
            />
          </div>

          {/* Quantity-weighted slider */}
          <div className="space-y-1.5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Quantity-weighted</p>
                <p className="text-[11px]" style={{ color: "var(--t-subtle)" }}>More items = more shipping</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <input
                  type="number" min="0" max="100" value={100 - form.vendorShippingEqualPct}
                  onChange={e => {
                    let v = parseInt(e.target.value, 10);
                    if (isNaN(v)) v = 0;
                    v = Math.max(0, Math.min(100, v));
                    setForm(f => ({ ...f, vendorShippingEqualPct: 100 - v }));
                  }}
                  className="w-14 text-center text-sm font-bold rounded-xl border py-1 focus:outline-none"
                  style={{ borderColor: "var(--t-border)", background: "var(--t-surface2)", color: "var(--t-text)" }}
                />
                <span className="text-sm font-bold" style={{ color: "var(--t-muted)" }}>%</span>
              </div>
            </div>
            <input
              type="range" min="0" max="100" value={100 - form.vendorShippingEqualPct}
              onChange={e => setForm(f => ({ ...f, vendorShippingEqualPct: 100 - parseInt(e.target.value, 10) }))}
              className="w-full accent-blue-700"
            />
          </div>

          {/* Sum validation */}
          <div className="px-3 py-2 rounded-xl text-xs font-semibold" style={{
            background: "rgba(22,163,74,0.08)",
            border: "1px solid rgba(22,163,74,0.2)",
            color: "#16A34A",
          }}>
            {form.vendorShippingEqualPct}% + {100 - form.vendorShippingEqualPct}% = 100% ✓
          </div>
        </section>
      )}

      <section className="rounded-2xl p-4 space-y-3" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>Add Shipping Courier</p>
          <button onClick={() => setShowNewOpt(v => !v)}
            className="h-7 px-3 rounded-lg text-xs font-semibold flex items-center gap-1"
            style={{ background: "var(--t-blue-07)", color: "var(--t-blue-deep)", border: "1px solid var(--t-blue-18)" }}>
            <Plus className="w-3 h-3" /> Add Option
          </button>
        </div>
        {showNewOpt && (
          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-1">
              <label className="text-[10px]" style={{ color: "var(--t-subtle)" }}>Label</label>
              <input type="text" value={newOpt.label} onChange={e => setNewOpt(f => ({ ...f, label: e.target.value }))}
                placeholder="Standard" className={inputCls("text-xs")} style={inputStyle} autoComplete="off" />
            </div>
            <div className="w-24 space-y-1">
              <label className="text-[10px]" style={{ color: "var(--t-subtle)" }}>Price</label>
              <input type="number" value={newOpt.price} onChange={e => setNewOpt(f => ({ ...f, price: e.target.value }))}
                placeholder="0.00" min="0" step="0.01" className={inputCls("text-xs")} style={inputStyle} />
            </div>
            <button onClick={addOption} disabled={!newOpt.label || !newOpt.price}
              className="h-9 px-3 rounded-xl text-xs font-bold text-white disabled:opacity-50"
              style={{ background: "var(--t-blue-deep)" }}>
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {shippingOptions.length === 0
          ? <p className="text-sm py-2" style={{ color: "var(--t-subtle)" }}>No custom shipping options yet</p>
          : (
            <div className="space-y-2">
              {shippingOptions.map((opt, idx) => (
                <div key={opt.id} className="flex items-center gap-2">
                  {editOptIdx === idx ? (
                    <>
                      <input value={opt.label} onChange={e => updateOption(idx, "label", e.target.value)}
                        className={inputCls("text-xs flex-1")} style={inputStyle} />
                      <input value={String(opt.price)} onChange={e => updateOption(idx, "price", e.target.value)}
                        type="number" min="0" step="0.01" className={inputCls("text-xs w-20")} style={inputStyle} />
                      <button onClick={() => setEditOptIdx(null)} className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
                        <Check className="w-3 h-3" style={{ color: "#16A34A" }} />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm" style={{ color: "var(--t-text)" }}>{opt.label}</span>
                      <span className="text-sm tabular-nums font-bold" style={{ color: "var(--t-muted)" }}>{currencySymbol(gb?.currency)}{fmtCurrency(opt.price)}</span>
                      <button onClick={() => setEditOptIdx(idx)} className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
                        <Pencil className="w-3 h-3" style={{ color: "var(--t-muted)" }} />
                      </button>
                      <button onClick={() => removeOption(idx)} className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
                        <Trash2 className="w-3 h-3" style={{ color: "#DC2626" }} />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

      </section>

      {/* QR Couriers — own separate card */}
      <section className="rounded-2xl p-4 space-y-3" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>Add Couriers Who Require QR</p>
          <span className="h-5 px-2 rounded-full text-[9px] font-bold uppercase tracking-wide flex items-center"
            style={{ background: "rgba(99,102,241,0.10)", color: "#6366F1", border: "1px solid rgba(99,102,241,0.20)" }}>
            QR Code Couriers
          </span>
        </div>
        <p className="text-[11px] leading-snug" style={{ color: "var(--t-muted)" }}>
          Add couriers that use QR codes for drop-off. Members will see an upload section for each courier listed below.
        </p>
        <div className="space-y-2">
          {qrCouriers.length === 0
            ? <p className="text-xs py-1" style={{ color: "var(--t-subtle)" }}>No couriers added — members won't see a QR upload section</p>
            : qrCouriers.map((name, idx) => (
              <div key={idx} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
                <QrCode className="w-3.5 h-3.5 shrink-0" style={{ color: "#6366F1" }} />
                <span className="flex-1 text-sm font-medium" style={{ color: "var(--t-text)" }}>{name}</span>
                <button onClick={() => removeCourier(idx)} className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
                  <X className="w-3 h-3" style={{ color: "#DC2626" }} />
                </button>
              </div>
            ))
          }
        </div>
        <div className="flex gap-2">
          <input
            value={newCourier}
            onChange={e => setNewCourier(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCourier(); } }}
            placeholder="e.g. InPost, Royal Mail, DHL…"
            className={inputCls("text-xs flex-1")}
            style={inputStyle}
          />
          <button onClick={addCourier} disabled={!newCourier.trim()}
            className="h-9 px-3 rounded-xl text-xs font-bold text-white disabled:opacity-50 flex items-center gap-1"
            style={{ background: "var(--t-blue-deep)" }}>
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
      </section>

      <section className="rounded-2xl p-4 space-y-3" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--t-subtle)" }}>Messages</p>
        <div className="space-y-1">
          <label className="text-xs font-semibold" style={{ color: "var(--t-muted)" }}>Order page message</label>
          <textarea value={form.orderPageMessage} onChange={e => setForm(f => ({ ...f, orderPageMessage: e.target.value }))}
            rows={3} placeholder="Shown to members on the order page…"
            className={inputCls("resize-none text-sm")} style={inputStyle} />
        </div>
        {qrCouriers.length > 0 && (
          <div className="space-y-1">
            <label className="text-xs font-semibold" style={{ color: "var(--t-muted)" }}>QR upload message</label>
            <textarea value={form.qrUploadMessage} onChange={e => setForm(f => ({ ...f, qrUploadMessage: e.target.value }))}
              rows={2} placeholder="Instructions shown with QR code uploads…"
              className={inputCls("resize-none text-sm")} style={inputStyle} />
          </div>
        )}
      </section>

      {msg && (
        <p className="text-sm font-semibold" style={{ color: msg.includes("✓") ? "#16A34A" : "#DC2626" }}>{msg}</p>
      )}
      <button onClick={save} disabled={saving}
        className="h-10 px-6 rounded-xl text-sm font-bold text-white flex items-center gap-2 disabled:opacity-60"
        style={{ background: "var(--t-blue-deep)" }}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save Settings
      </button>
    </div>
  );
}

// ─── Parcel Form (extracted to prevent remount on every ParcelsTab render) ────

type ParcelItem = { name: string; qty: number };
type ParcelFormState = { label: string; carrier: string; trackingNumber: string; trackingUrl: string; notes: string; items: ParcelItem[] };

function ParcelFormUI({ gbId, form, setForm, saving, msg, editingId, onSave, onCancel }: {
  gbId: string;
  form: ParcelFormState;
  setForm: React.Dispatch<React.SetStateAction<ParcelFormState>>;
  saving: boolean;
  msg: string;
  editingId: string | null;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [productNames, setProductNames] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const [itemQty, setItemQty] = useState("1");
  const [pasteText, setPasteText] = useState("");
  const [showPaste, setShowPaste] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    reshipFetch(`/api/reshipper/gb/${gbId}/product-names`, { credentials: "include", signal: controller.signal })
      .then(r => r.ok ? r.json() : [])
      .then((names: string[]) => { if (!controller.signal.aborted) setProductNames(names); })
      .catch(() => {});
    return () => controller.abort();
  }, [gbId]);

  const addItem = () => {
    const name = selectedProduct.trim();
    if (!name) return;
    const qty = Math.max(1, parseInt(itemQty) || 1);
    setForm(f => {
      const existing = f.items.findIndex(i => i.name.toLowerCase() === name.toLowerCase());
      if (existing >= 0) {
        const updated = [...f.items];
        updated[existing] = { ...updated[existing], qty: updated[existing].qty + qty };
        return { ...f, items: updated };
      }
      return { ...f, items: [...f.items, { name, qty }] };
    });
    setSelectedProduct("");
    setProductSearch("");
    setItemQty("1");
  };

  const removeItem = (idx: number) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  const updateItemQty = (idx: number, qty: number) => {
    if (qty < 1) { removeItem(idx); return; }
    setForm(f => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, qty } : it) }));
  };

  const parsePaste = () => {
    const lines = pasteText.split(/\n+/).map(l => l.trim()).filter(Boolean);
    const toAdd: { name: string; qty: number }[] = [];
    for (const line of lines) {
      let namePart = line.replace(/^\d+\.\s+/, "").trim();
      let qty = 1;
      const prefixM = namePart.match(/^(\d+)\s*[xX×]\s+(.+)$/);
      const suffixM = namePart.match(/^(.+)\s+[xX×]\s*(\d+)$/);
      if (prefixM) { qty = Math.max(1, parseInt(prefixM[1])); namePart = prefixM[2].trim(); }
      else if (suffixM) { qty = Math.max(1, parseInt(suffixM[2])); namePart = suffixM[1].trim(); }
      if (!namePart) continue;
      const lower = namePart.toLowerCase();
      const matched = productNames.find(n => n.toLowerCase() === lower)
        ?? productNames.find(n => n.toLowerCase().includes(lower))
        ?? productNames.find(n => lower.includes(n.toLowerCase()));
      toAdd.push({ name: matched ?? namePart, qty });
    }
    setForm(f => {
      let updated = [...f.items];
      for (const item of toAdd) {
        const existing = updated.findIndex(i => i.name.toLowerCase() === item.name.toLowerCase());
        if (existing >= 0) updated[existing] = { ...updated[existing], qty: updated[existing].qty + item.qty };
        else updated.push(item);
      }
      return { ...f, items: updated };
    });
    setPasteText("");
    setShowPaste(false);
  };

  return (
    <div className="rounded-2xl p-4 space-y-4" style={{ background: "var(--t-surface)", border: "1.5px solid var(--t-blue-18)" }}>
      <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "var(--t-subtle)" }}>
        {editingId ? "Edit Parcel" : "New Parcel"}
      </p>

      {/* Row 1: Label + Tracking Number */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--t-subtle)" }}>Label *</label>
          <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
            placeholder="Batch 1 — UK" className={inputCls("text-sm")} style={inputStyle} />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--t-subtle)" }}>Tracking Number *</label>
          <input value={form.trackingNumber} onChange={e => setForm(f => ({ ...f, trackingNumber: e.target.value }))}
            placeholder="JD000123456GB" className={inputCls("text-sm")} style={inputStyle} />
        </div>
      </div>

      {/* Row 2: Carrier full-width */}
      <div className="space-y-1">
        <label className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--t-subtle)" }}>Carrier</label>
        <CarrierInput value={form.carrier} onChange={v => setForm(f => ({ ...f, carrier: v }))} />
      </div>

      {/* Row 3: Custom Tracking URL */}
      <div className="space-y-1">
        <label className="text-[10px] font-semibold uppercase tracking-widest flex items-center gap-1.5" style={{ color: "var(--t-subtle)" }}>
          <Globe className="w-3 h-3" />
          Custom Tracking URL
          <span className="text-[9px] font-normal normal-case" style={{ color: "var(--t-subtle)" }}>(for carriers not on 17track)</span>
        </label>
        <input value={form.trackingUrl} onChange={e => setForm(f => ({ ...f, trackingUrl: e.target.value }))}
          placeholder="https://gly-express.com/track?n=…" className={inputCls("text-sm")} style={inputStyle} />
      </div>

      {/* Row 4: Notes */}
      <div className="space-y-1">
        <label className="text-[10px] font-semibold uppercase tracking-widest flex items-center gap-1.5" style={{ color: "var(--t-subtle)" }}>
          <FileText className="w-3 h-3" />
          Notes
          <span className="text-[9px] font-normal normal-case" style={{ color: "var(--t-subtle)" }}>(internal only)</span>
        </label>
        <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          placeholder="Optional internal notes" className={inputCls("text-sm")} style={inputStyle} />
      </div>

      {/* Row 5: Items */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--t-subtle)" }}>
            Items in this parcel
          </label>
          <button type="button" onClick={() => setShowPaste(v => !v)}
            className="text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-colors"
            style={{ background: showPaste ? "var(--t-blue-18)" : "var(--t-surface2)", color: showPaste ? "var(--t-blue)" : "var(--t-muted)", border: "1px solid var(--t-border)" }}>
            {showPaste ? "← Dropdown" : "Paste List"}
          </button>
        </div>

        {showPaste ? (
          <div className="space-y-2">
            <textarea
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
              rows={5}
              placeholder={"Paste items here, one per line:\nBPC-157 5mg\nSemaglutide 1mg\n2x TB-500 2mg"}
              className="w-full rounded-xl px-3 py-2 text-xs resize-none focus:outline-none"
              style={{ ...inputStyle, fontFamily: "inherit" }}
            />
            <button onClick={parsePaste} disabled={!pasteText.trim()}
              className="h-8 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-40"
              style={{ background: "var(--t-blue-deep)", color: "#fff" }}>
              <Plus className="w-3 h-3" /> Import Items
            </button>
          </div>
        ) : (
          <div className="flex gap-2 items-center">
            <div className="relative flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: "var(--t-subtle)" }} />
                <input
                  value={productSearch}
                  onChange={e => { setProductSearch(e.target.value); setProductDropdownOpen(true); setSelectedProduct(""); }}
                  onFocus={() => setProductDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setProductDropdownOpen(false), 150)}
                  placeholder="Search products…"
                  className="w-full pl-7 pr-3 rounded-xl text-sm h-9 focus:outline-none"
                  style={inputStyle}
                />
              </div>
              {productDropdownOpen && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl overflow-hidden shadow-lg max-h-52 overflow-y-auto" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
                  {productNames
                    .filter(n => !productSearch || n.toLowerCase().includes(productSearch.toLowerCase()))
                    .map(n => (
                      <button key={n} type="button"
                        onMouseDown={() => { setSelectedProduct(n); setProductSearch(n); setProductDropdownOpen(false); }}
                        className="w-full text-left px-3 py-2 text-xs transition-colors"
                        style={{ color: "var(--t-text)", background: selectedProduct === n ? "var(--t-blue-10)" : "transparent" }}>
                        {n}
                      </button>
                    ))}
                  {productNames.filter(n => !productSearch || n.toLowerCase().includes(productSearch.toLowerCase())).length === 0 && (
                    <p className="px-3 py-2 text-xs" style={{ color: "var(--t-subtle)" }}>No products found</p>
                  )}
                </div>
              )}
            </div>
            <input type="number" value={itemQty} min="1" onChange={e => setItemQty(e.target.value)}
              className="w-14 rounded-xl px-2 text-xs h-9 focus:outline-none text-center"
              style={inputStyle} />
            <button onClick={addItem} disabled={!selectedProduct}
              className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-40"
              style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
              <Plus className="w-3.5 h-3.5" style={{ color: "var(--t-blue)" }} />
            </button>
          </div>
        )}

        {form.items.length > 0 ? (
          <div className="space-y-1.5">
            {form.items.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-center px-2.5 py-1.5 rounded-xl"
                style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
                <Box className="w-3 h-3 shrink-0" style={{ color: "var(--t-blue)" }} />
                <span className="flex-1 text-xs font-medium truncate" style={{ color: "var(--t-text)" }}>{item.name}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <button type="button" onClick={() => updateItemQty(idx, item.qty - 1)}
                    className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold"
                    style={{ color: "var(--t-muted)", background: "var(--t-surface)" }}>−</button>
                  <span className="w-6 text-center text-xs font-bold" style={{ color: "var(--t-text)" }}>{item.qty}</span>
                  <button type="button" onClick={() => updateItemQty(idx, item.qty + 1)}
                    className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold"
                    style={{ color: "var(--t-muted)", background: "var(--t-surface)" }}>+</button>
                </div>
                <button onClick={() => removeItem(idx)} className="w-5 h-5 rounded flex items-center justify-center shrink-0" style={{ color: "#DC2626" }}>
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs py-1" style={{ color: "var(--t-subtle)" }}>No items added yet.</p>
        )}
      </div>

      {msg && <p className="text-xs font-semibold" style={{ color: "#DC2626" }}>{msg}</p>}

      <div className="flex gap-2">
        <button onClick={onSave} disabled={saving}
          className="h-9 px-4 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 disabled:opacity-60"
          style={{ background: "var(--t-blue-deep)" }}>
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {editingId ? "Save Changes" : "Create Parcel"}
        </button>
        <button onClick={onCancel} className="h-9 px-3 rounded-xl text-xs font-semibold"
          style={{ background: "var(--t-surface2)", color: "var(--t-muted)", border: "1px solid var(--t-border)" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Parcels Tab ──────────────────────────────────────────────────────────────

// ─── Parcel Broadcast Panel ───────────────────────────────────────────────────
function ParcelBroadcastPanel({ gbId, parcel }: { gbId: string; parcel: RParcel }) {
  const [candidates, setCandidates] = useState<{ username: string }[] | null>(null);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const loadCandidates = useCallback(async () => {
    setLoadingCandidates(true);
    setResult(null);
    try {
      const res = await reshipFetch(`/api/reshipper/gb/${gbId}/parcels/${parcel.id}/broadcast-candidates`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const members: { username: string }[] = data.members ?? [];
        setCandidates(members);
        setSelected(new Set(members.map((m: { username: string }) => m.username)));
      } else {
        setResult("Failed to load eligible members.");
      }
    } catch {
      setResult("Network error.");
    }
    setLoadingCandidates(false);
  }, [gbId, parcel.id]);

  const toggleAll = () => {
    if (!candidates) return;
    if (selected.size === candidates.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(candidates.map(m => m.username)));
    }
  };

  const toggleOne = (username: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(username)) { next.delete(username); } else { next.add(username); }
      return next;
    });
  };

  const sendBroadcast = async () => {
    if (!candidates || selected.size === 0) return;
    setSending(true); setResult(null);
    try {
      const res = await reshipFetch(`/api/reshipper/gb/${gbId}/parcels/${parcel.id}/broadcast`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernames: [...selected], note: note.trim() || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(`Sent to ${data.sent} member${data.sent !== 1 ? "s" : ""}${data.skipped > 0 ? ` (${data.skipped} skipped — no Telegram)` : ""}.`);
      } else {
        setResult(data.error || "Failed to send.");
      }
    } catch {
      setResult("Network error.");
    }
    setSending(false);
  };

  const sendTest = async () => {
    setTestSending(true); setResult(null);
    try {
      const res = await reshipFetch(`/api/reshipper/gb/${gbId}/parcels/${parcel.id}/test-broadcast`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "new", note: note.trim() || undefined }),
      });
      const data = await res.json();
      setResult(res.ok ? "Test message sent to your Telegram." : data.error || "Failed.");
    } catch {
      setResult("Network error.");
    }
    setTestSending(false);
  };

  // Preview text mirrors the backend message
  const itemNames = parcel.items.map(i => i.name);
  const itemLine = itemNames.length > 0
    ? `\nContaining:\n${itemNames.map((name, i) => `${i + 1}. ${name}`).join("\n")}`
    : "";
  const previewLines = [
    `📦 [GB Name] · [Country] · @[you]`,
    ``,
    `🚚 ${parcel.label} has been dispatched!${itemLine}`,
    note.trim() ? `📝 ${note.trim()}` : null,
    ``,
    `Do you want to receive shipping updates through the bot?`,
    ``,
    `[🔔 Yes, notify me]  [❌ No thanks]`,
  ].filter(l => l !== null).join("\n");

  if (!candidates) {
    return (
      <div className="mt-3 pt-3 space-y-2" style={{ borderTop: "1px solid var(--t-border)" }}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5" style={{ color: "var(--t-blue)" }}>
            <Bell className="w-3 h-3" /> Broadcast Parcel
          </span>
          <button
            onClick={loadCandidates}
            disabled={loadingCandidates}
            className="h-7 px-3 rounded-lg text-[10px] font-bold flex items-center gap-1.5"
            style={{ background: "var(--t-blue-18)", color: "var(--t-blue)" }}>
            {loadingCandidates ? <Loader2 className="w-3 h-3 animate-spin" /> : <Users className="w-3 h-3" />}
            Load recipients
          </button>
        </div>
        {result && <p className="text-[10px]" style={{ color: result.includes("error") || result.includes("Failed") ? "#DC2626" : "var(--t-blue)" }}>{result}</p>}
      </div>
    );
  }

  return (
    <div className="mt-3 pt-3 space-y-3" style={{ borderTop: "1px solid var(--t-border)" }}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5" style={{ color: "var(--t-blue)" }}>
          <Bell className="w-3 h-3" /> Broadcast Parcel
        </span>
        <button onClick={loadCandidates} disabled={loadingCandidates}
          className="w-6 h-6 rounded-lg flex items-center justify-center"
          style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
          <RefreshCw className="w-3 h-3" style={{ color: "var(--t-muted)" }} />
        </button>
      </div>

      {/* Member selector */}
      {candidates.length === 0 ? (
        <p className="text-[11px] italic" style={{ color: "var(--t-subtle)" }}>
          No item-matched members found.{parcel.items.length === 0 ? " Add items to the parcel to enable member matching." : ""}
        </p>
      ) : (
        <div className="space-y-1.5">
          {/* Select all toggle */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold" style={{ color: "var(--t-subtle)" }}>
              <Users className="w-3 h-3 inline mr-1" />{selected.size} / {candidates.length} selected
            </span>
            <button onClick={toggleAll}
              className="text-[10px] font-bold"
              style={{ color: "var(--t-blue)" }}>
              {selected.size === candidates.length ? "Deselect all" : "Select all"}
            </button>
          </div>
          {/* Member chips */}
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {candidates.map(m => {
              const isSelected = selected.has(m.username);
              return (
                <button key={m.username} onClick={() => toggleOne(m.username)}
                  className="px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all"
                  style={{
                    background: isSelected ? "var(--t-blue)" : "var(--t-surface2)",
                    color: isSelected ? "white" : "var(--t-muted)",
                    border: `1px solid ${isSelected ? "var(--t-blue)" : "var(--t-border)"}`,
                  }}>
                  @{m.username}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Optional note */}
      <div className="space-y-1">
        <label className="text-[10px] font-semibold uppercase tracking-widest flex items-center gap-1" style={{ color: "var(--t-subtle)" }}>
          <FileText className="w-3 h-3" /> Custom note <span className="font-normal normal-case">(optional)</span>
        </label>
        <input
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="e.g. Expected delivery in 3–5 days"
          className="w-full rounded-xl px-3 py-1.5 text-xs"
          style={{ background: "var(--t-input)", border: "1px solid var(--t-border)", color: "var(--t-text)", outline: "none" }} />
      </div>

      {/* Message preview */}
      <div className="rounded-xl p-3 space-y-0.5" style={{ background: "var(--t-surface2)", border: "1px dashed var(--t-border)" }}>
        <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--t-subtle)" }}>Preview</p>
        {previewLines.split("\n").map((line, i) => (
          <p key={i} className="text-[10px] font-mono whitespace-pre-wrap" style={{ color: "var(--t-muted)", minHeight: "1em" }}>{line || "\u00A0"}</p>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button onClick={sendTest} disabled={testSending}
          className="flex-1 h-8 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5"
          style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-muted)" }}>
          {testSending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bell className="w-3 h-3" />}
          Test to me
        </button>
        <button onClick={sendBroadcast} disabled={sending || selected.size === 0 || candidates.length === 0}
          className="flex-[2] h-8 rounded-xl text-[11px] font-bold text-white flex items-center justify-center gap-1.5"
          style={{ background: selected.size === 0 ? "var(--t-border)" : "var(--t-blue-deep)" }}>
          {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <SendHorizonal className="w-3 h-3" />}
          Broadcast to {selected.size} member{selected.size !== 1 ? "s" : ""}
        </button>
      </div>

      {result && (
        <p className="text-[10px] font-semibold text-center" style={{ color: result.startsWith("Sent") || result.includes("sent") ? "var(--t-blue)" : "#DC2626" }}>
          {result}
        </p>
      )}
    </div>
  );
}

function ParcelsTab({ gbId }: { gbId: string }) {
  const [parcels, setParcels] = useState<RParcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ParcelFormState>({ label: "", carrier: "Auto", trackingNumber: "", trackingUrl: "", notes: "", items: [] });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [refreshMsg, setRefreshMsg] = useState<{ id: string; text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reshipFetch(`/api/reshipper/gb/${gbId}/parcels`, { credentials: "include" });
      if (res.ok) setParcels(await res.json());
    } finally { setLoading(false); }
  }, [gbId]);

  useEffect(() => { load(); }, [load]);

  const forceRefresh = useCallback(async (parcelId: string) => {
    setRefreshingId(parcelId);
    setRefreshMsg(null);
    try {
      const res = await reshipFetch(`/api/reshipper/gb/${gbId}/parcels/${parcelId}/force-refresh`, {
        method: "POST", credentials: "include",
      });
      const data = await res.json().catch(() => ({})) as { status?: string; updated?: boolean; error?: string };
      if (res.ok) {
        await load();
        setRefreshMsg({ id: parcelId, ok: true, text: data.updated ? `Updated → ${data.status}` : `No change (${data.status ?? "pending"})` });
      } else {
        setRefreshMsg({ id: parcelId, ok: false, text: data.error ?? `Error ${res.status}` });
      }
    } catch {
      setRefreshMsg({ id: parcelId, ok: false, text: "Network error" });
    } finally {
      setRefreshingId(null);
    }
  }, [gbId, load]);

  const resetForm = () => setForm({ label: "", carrier: "Auto", trackingNumber: "", trackingUrl: "", notes: "", items: [] });

  const startCreate = () => { resetForm(); setCreating(true); setEditingId(null); };

  const startEdit = (p: RParcel) => {
    setForm({
      label: p.label,
      carrier: p.carrier,
      trackingNumber: p.trackingNumber,
      trackingUrl: p.trackingUrl ?? "",
      notes: p.notes ?? "",
      items: p.items ?? [],
    });
    setEditingId(p.id); setCreating(false);
  };

  const buildBody = () => ({
    label: form.label,
    carrier: form.carrier,
    trackingNumber: form.trackingNumber,
    trackingUrl: form.trackingUrl.trim() || null,
    notes: form.notes.trim() || null,
    items: form.items,
  });

  const saveCreate = async () => {
    if (!form.label || !form.trackingNumber) { setMsg("Label and tracking number are required"); return; }
    setSaving(true); setMsg("");
    try {
      const res = await reshipFetch(`/api/reshipper/gb/${gbId}/parcels`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody()),
      });
      const data = await res.json();
      if (res.ok) {
        setParcels(prev => [data, ...prev]);
        resetForm(); setCreating(false);
      } else { setMsg(data.error || "Failed to create"); }
    } catch { setMsg("Network error"); }
    setSaving(false);
  };

  const saveEdit = async (parcelId: string) => {
    setSaving(true); setMsg("");
    try {
      const res = await reshipFetch(`/api/reshipper/gb/${gbId}/parcels/${parcelId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody()),
      });
      const data = await res.json();
      if (res.ok) {
        setParcels(prev => prev.map(p => p.id === parcelId ? data : p));
        setEditingId(null);
      } else { setMsg(data.error || "Failed to update"); }
    } catch { setMsg("Network error"); }
    setSaving(false);
  };

  const deleteParcel = async (parcelId: string) => {
    if (!confirm("Delete this parcel?")) return;
    try {
      const res = await reshipFetch(`/api/reshipper/gb/${gbId}/parcels/${parcelId}`, { method: "DELETE", credentials: "include" });
      if (res.ok) setParcels(prev => prev.filter(p => p.id !== parcelId));
    } catch {}
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--t-blue)" }} /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>Parcels ({parcels.length})</p>
        <div className="flex gap-2">
          <button onClick={load} className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
            <RefreshCw className="w-3.5 h-3.5" style={{ color: "var(--t-muted)" }} />
          </button>
          <button onClick={startCreate}
            className="h-9 px-4 rounded-xl text-xs font-bold text-white flex items-center gap-1.5"
            style={{ background: "var(--t-blue-deep)" }}>
            <Plus className="w-3.5 h-3.5" /> New Parcel
          </button>
        </div>
      </div>

      {creating && <ParcelFormUI gbId={gbId} form={form} setForm={setForm} saving={saving} msg={msg} editingId={editingId} onSave={saveCreate} onCancel={() => { setCreating(false); setMsg(""); }} />}

      {parcels.length === 0 && !creating && (
        <div className="flex flex-col items-center py-12 space-y-2">
          <Truck className="w-8 h-8" style={{ color: "var(--t-border)" }} />
          <p className="text-sm" style={{ color: "var(--t-subtle)" }}>No parcels yet</p>
        </div>
      )}

      <div className="space-y-2">
        {parcels.map(p => {
          const sc = PARCEL_STATUS_COLORS[p.status] ?? PARCEL_STATUS_COLORS.pending;
          const isOpen = expandedId === p.id;
          const isEditing = editingId === p.id;

          if (isEditing) {
            return (
              <ParcelFormUI key={p.id} gbId={gbId}
                form={form} setForm={setForm} saving={saving} msg={msg} editingId={editingId}
                onSave={() => saveEdit(p.id)}
                onCancel={() => { setEditingId(null); setMsg(""); }} />
            );
          }

          return (
            <div key={p.id} className="rounded-2xl overflow-hidden"
              style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
              <div className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedId(isOpen ? null : p.id)}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold" style={{ color: "var(--t-text)" }}>{p.label}</span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ color: sc.color, background: sc.bg }}>
                        {p.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Truck className="w-3 h-3" style={{ color: "var(--t-blue)" }} />
                      <span className="font-mono text-xs font-bold" style={{ color: "var(--t-blue)" }}>{p.trackingNumber}</span>
                      {p.carrier && p.carrier !== "Auto" && (
                        <span className="text-[10px]" style={{ color: "var(--t-subtle)" }}>{p.carrier}</span>
                      )}
                      {p.trackingUrl && (
                        <a href={p.trackingUrl} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-[10px] font-semibold"
                          style={{ color: "var(--t-blue)" }} onClick={e => e.stopPropagation()}>
                          <ExternalLink className="w-2.5 h-2.5" /> Track
                        </a>
                      )}
                    </div>
                    {p.items.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {p.items.map((item, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: "var(--t-blue-10)", color: "var(--t-blue-deep)" }}>
                            <span className="font-bold">{item.qty}×</span>{item.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => forceRefresh(p.id)} disabled={refreshingId === p.id}
                      title="Check tracking now"
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
                      <RefreshCw className={`w-3 h-3 ${refreshingId === p.id ? "animate-spin" : ""}`} style={{ color: "var(--t-muted)" }} />
                    </button>
                    <button onClick={() => startEdit(p)} className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
                      <Pencil className="w-3 h-3" style={{ color: "var(--t-muted)" }} />
                    </button>
                    <button onClick={() => deleteParcel(p.id)} className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
                      <Trash2 className="w-3 h-3" style={{ color: "#DC2626" }} />
                    </button>
                    <button onClick={() => setExpandedId(isOpen ? null : p.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
                      {isOpen ? <ChevronUp className="w-3 h-3" style={{ color: "var(--t-muted)" }} />
                        : <ChevronDown className="w-3 h-3" style={{ color: "var(--t-muted)" }} />}
                    </button>
                  </div>
                </div>
                {refreshMsg?.id === p.id && (
                  <p className="text-[10px] font-mono mt-1" style={{ color: refreshMsg.ok ? "var(--t-blue)" : "#DC2626" }}>
                    {refreshMsg.ok ? "✓" : "✗"} {refreshMsg.text}
                  </p>
                )}
              </div>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                    <div className="border-t px-4 py-3 space-y-2" style={{ borderColor: "var(--t-border)", background: "var(--t-surface2)" }}>
                      {p.notes && <p className="text-xs italic" style={{ color: "var(--t-subtle)" }}>"{p.notes}"</p>}
                      {p.items.length > 0 && (
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--t-subtle)" }}>Items</p>
                          {p.items.map((item, i) => (
                            <div key={i} className="text-xs flex gap-2">
                              <span style={{ color: "var(--t-subtle)" }}>×{item.qty}</span>
                              <span style={{ color: "var(--t-muted)" }}>{item.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {p.cachedEvents.length > 0 && (
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--t-subtle)" }}>Tracking Events</p>
                          {p.cachedEvents.slice(0, 5).map((ev, i) => (
                            <div key={i} className="text-[10px] flex gap-2 py-0.5">
                              <span className="shrink-0" style={{ color: "var(--t-subtle)" }}>{ev.date}</span>
                              <span style={{ color: "var(--t-muted)" }}>{ev.status}</span>
                              {ev.location && <span style={{ color: "var(--t-subtle)" }}>— {ev.location}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                      <ParcelBroadcastPanel gbId={gbId} parcel={p} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Payments Tab ─────────────────────────────────────────────────────────────

const CRYPTO_CURRENCIES = ["USDT", "USDC", "BTC", "ETH", "BNB", "SOL", "TRX", "XRP", "DOGE", "LTC"] as const;
const CRYPTO_NETWORKS: Record<string, string[]> = {
  USDT: ["TRC-20 (Tron)", "ERC-20 (Ethereum)", "BEP-20 (BSC)", "SOL (Solana)", "Polygon"],
  USDC: ["ERC-20 (Ethereum)", "SOL (Solana)", "BEP-20 (BSC)", "Polygon"],
  BTC:  ["Bitcoin (BTC)"],
  ETH:  ["ERC-20 (Ethereum)"],
  BNB:  ["BEP-20 (BSC)"],
  SOL:  ["SOL (Solana)"],
  TRX:  ["TRC-20 (Tron)"],
  XRP:  ["XRP Ledger"],
  DOGE: ["Dogecoin"],
  LTC:  ["Litecoin"],
};
const TROCADOR_COINS = [
  { label: "Monero (XMR)",    ticker: "xmr",  network: "Mainnet" },
  { label: "Bitcoin (BTC)",   ticker: "btc",  network: "Mainnet" },
  { label: "Ethereum (ETH)",  ticker: "eth",  network: "ERC20"   },
  { label: "USDT — ERC-20",   ticker: "usdt", network: "ERC20"   },
  { label: "USDT — TRC-20",   ticker: "usdt", network: "TRC20"   },
  { label: "USDT — BEP-20",   ticker: "usdt", network: "BEP20"   },
  { label: "USDC — ERC-20",   ticker: "usdc", network: "ERC20"   },
  { label: "USDC — BEP-20",   ticker: "usdc", network: "BEP20"   },
  { label: "BNB — BEP-20",    ticker: "bnb",  network: "BEP20"   },
  { label: "Litecoin (LTC)",  ticker: "ltc",  network: "Mainnet" },
  { label: "Dogecoin (DOGE)", ticker: "doge", network: "Mainnet" },
  { label: "Dash (DASH)",     ticker: "dash", network: "Mainnet" },
  { label: "Zcash (ZEC)",     ticker: "zec",  network: "Mainnet" },
] as const;

function PField({ label, icon: Icon, children }: { label: string; icon?: React.ElementType; children: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--t-subtle)" }}>
        {Icon && <Icon className="w-3 h-3" />}{label}
      </label>
      {children}
    </div>
  );
}

function PaymentsTab({ assignment, me, onAssignmentUpdate }: {
  assignment: RAssignment;
  me: ReshipperMe;
  onAssignmentUpdate: (updated: RAssignment) => void;
}) {
  const enabled = assignment.enabledPaymentMethods ?? {};
  const pd = assignment.reshipperPaymentDetails ?? {};
  const gbCurrency = assignment.gb?.currency ?? null;

  const [form, setForm] = useState({
    usdtWallet: pd.usdtWallet ?? "",
    revolutHandle: pd.revolutHandle ?? "",
    paypalHandle: pd.paypalHandle ?? "",
    cryptoCurrency: pd.cryptoCurrency ?? "USDT",
    cryptoNetwork: pd.cryptoNetwork ?? "",
    cryptoWalletAddress: pd.cryptoWalletAddress ?? "",
    anonPayEnabled: pd.anonPayEnabled ?? false,
    anonPayWallet: pd.anonPayWallet ?? "",
    anonPayTicker: pd.anonPayTicker ?? "xmr",
    anonPayNetwork: pd.anonPayNetwork ?? "Mainnet",
  });
  const availableNetworks = CRYPTO_NETWORKS[form.cryptoCurrency] ?? [];

  const hasPaymentDetails =
    form.usdtWallet.trim() !== "" ||
    form.revolutHandle.trim() !== "" ||
    form.paypalHandle.trim() !== "" ||
    form.cryptoWalletAddress.trim() !== "" ||
    form.anonPayWallet.trim() !== "";

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [msg, setMsg] = useState("");

  const [feeForm, setFeeForm] = useState({
    feeType: assignment.reshipperFeeType ?? "fixed",
    feeAmount: assignment.reshipperFeeAmount ?? "",
  });
  const [feeSaving, setFeeSaving] = useState(false);
  const [feeSaved, setFeeSaved] = useState(false);
  const [feeMsg, setFeeMsg] = useState("");

  const saveFee = async () => {
    setFeeSaving(true); setFeeMsg(""); setFeeSaved(false);
    try {
      const res = await reshipFetch(`/api/reshipper/gb/${assignment.gbId}/fee`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feeAmount: feeForm.feeAmount, feeType: feeForm.feeType }),
      });
      const data = await res.json();
      if (res.ok) {
        onAssignmentUpdate({ ...assignment, reshipperFeeAmount: data.reshipperFeeAmount, reshipperFeeType: data.reshipperFeeType });
        setFeeSaved(true); setTimeout(() => setFeeSaved(false), 2500);
      } else { setFeeMsg(data.error || "Save failed"); }
    } catch { setFeeMsg("Network error"); }
    setFeeSaving(false);
  };

  const save = async () => {
    setSaving(true); setMsg(""); setSaved(false);
    try {
      const res = await reshipFetch(`/api/reshipper/gb/${assignment.gbId}/payment-details`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        onAssignmentUpdate({ ...assignment, reshipperPaymentDetails: data.reshipperPaymentDetails });
        setSaved(true); setTimeout(() => setSaved(false), 2500);
      } else { setMsg(data.error || "Save failed"); }
    } catch { setMsg("Network error"); }
    setSaving(false);
  };

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Payment routing status */}
      <div className="rounded-2xl p-4" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--t-subtle)" }}>Payment Routing</p>
        <div className={`flex items-start gap-2 p-2.5 rounded-xl text-xs font-medium ${hasPaymentDetails ? "bg-emerald-50" : "bg-amber-50"}`}
          style={{ border: `1px solid ${hasPaymentDetails ? "rgba(16,185,129,0.25)" : "rgba(217,119,6,0.25)"}` }}>
          {hasPaymentDetails
            ? <><Check className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-600" /><span className="text-emerald-700">Payments for this GB go directly to you (@{me.telegramUsername}). Members see your payment details.</span></>
            : <><AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" /><span className="text-amber-700">No payment details set — payments go to admin. Fill in your details below to receive payments directly.</span></>
          }
        </div>
      </div>

      {/* Reshipper fee — always available for reshippers to set */}
      <div className="rounded-2xl p-4" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
        <div className="flex items-center gap-2 mb-3">
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--t-subtle)" }}>Reshipper Fee</p>
          {assignment.reshipperFeeEnabled && feeForm.feeAmount ? (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">Active</span>
          ) : (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">Not set</span>
          )}
        </div>
        <p className="text-xs mb-3" style={{ color: "var(--t-subtle)" }}>
          Set an additional handling fee that will be added to each member's order for this GB. Leave blank to charge no fee.
          {gbCurrency && <> Amounts are in <span className="font-semibold">{gbCurrency}</span>.</>}
        </p>
        <div className="flex gap-2 mb-3 flex-wrap">
          {[{ v: "fixed", label: "Fixed amount" }, { v: "percentage", label: "Percentage (%)" }].map(({ v, label }) => (
            <button key={v} type="button"
              onClick={() => setFeeForm(f => ({ ...f, feeType: v }))}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors ${feeForm.feeType === v ? "bg-violet-600 text-white border-violet-600" : "bg-transparent border-[var(--t-border)] text-[var(--t-text)]"}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {feeForm.feeType === "fixed" && gbCurrency && (
            <span className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>{currencySymbol(gbCurrency)}</span>
          )}
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder={feeForm.feeType === "percentage" ? "e.g. 5 — leave blank for no fee" : "e.g. 2.50 — leave blank for no fee"}
            value={feeForm.feeAmount}
            onChange={e => setFeeForm(f => ({ ...f, feeAmount: e.target.value }))}
            className="flex-1 min-w-0 text-sm px-3 py-2 rounded-xl outline-none"
            style={{ background: "var(--t-input-bg, var(--t-bg))", border: "1px solid var(--t-border)", color: "var(--t-text)" }}
          />
          {feeForm.feeType === "percentage" && (
            <span className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>%</span>
          )}
          <button
            onClick={saveFee}
            disabled={feeSaving}
            className="shrink-0 text-xs px-4 py-2 rounded-xl font-semibold bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition-colors">
            {feeSaving ? "Saving…" : feeSaved ? "Saved ✓" : "Save"}
          </button>
        </div>
        {feeMsg && <p className="text-xs mt-2 text-red-500">{feeMsg}</p>}
        {feeForm.feeAmount && !feeSaving && (
          <p className="text-[11px] mt-2" style={{ color: "var(--t-subtle)" }}>
            {feeForm.feeType === "percentage"
              ? `Members will be charged an extra ${feeForm.feeAmount}% on their order total.`
              : `Members will be charged an extra ${currencySymbol(gbCurrency)}${parseFloat(feeForm.feeAmount || "0").toFixed(2)} per order.`}
          </p>
        )}
      </div>

      {/* Admin-enabled methods */}
      <div className="rounded-2xl p-4" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--t-subtle)" }}>Enabled by Admin</p>
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "cryptoEnabled", label: "Crypto" },
            { key: "usdtEnabled", label: "USDT" },
            { key: "revolutEnabled", label: "Revolut" },
            { key: "paypalEnabled", label: "PayPal" },
            { key: "anonPayEnabled", label: "AnonPay" },
          ].map(({ key, label }) => (
            <span key={key} className="px-2.5 py-1 rounded-full text-[11px] font-bold"
              style={enabled[key]
                ? { background: "rgba(22,163,74,0.1)", color: "#16A34A", border: "1px solid rgba(22,163,74,0.2)" }
                : { background: "var(--t-surface2)", color: "var(--t-subtle)", border: "1px solid var(--t-border)" }
              }>
              {enabled[key] ? "✓ " : ""}{label}
            </span>
          ))}
        </div>
        {!Object.values(enabled).some(Boolean) && (
          <p className="text-xs mt-2" style={{ color: "var(--t-subtle)" }}>No payment methods have been enabled by admin for this assignment.</p>
        )}
      </div>

      {/* Your payment details */}
      <div className="rounded-2xl p-4 space-y-3" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--t-subtle)" }}>Your Payment Details</p>

        {/* ── Crypto group ─────────────────────────────── */}
        {(enabled.usdtEnabled || enabled.cryptoEnabled || enabled.anonPayEnabled) && (
          <div className="rounded-xl p-3 space-y-3" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--t-subtle)" }}>Crypto</p>
            {enabled.usdtEnabled && (
              <PField label="USDT Wallet Address" icon={Wallet}>
                <input value={form.usdtWallet} onChange={e => setForm(f => ({ ...f, usdtWallet: e.target.value }))}
                  placeholder="TRC20 / ERC20 address…" className={inputCls("text-sm")} style={inputStyle} />
              </PField>
            )}
            {enabled.cryptoEnabled && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <PField label="Cryptocurrency" icon={Wallet}>
                    <select
                      value={form.cryptoCurrency}
                      onChange={e => setForm(f => ({ ...f, cryptoCurrency: e.target.value, cryptoNetwork: "" }))}
                      className={inputCls("text-sm")} style={inputStyle}
                    >
                      {CRYPTO_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </PField>
                  <PField label="Network" icon={Globe}>
                    <select
                      value={form.cryptoNetwork}
                      onChange={e => setForm(f => ({ ...f, cryptoNetwork: e.target.value }))}
                      className={inputCls("text-sm")} style={inputStyle}
                    >
                      <option value="">Select network…</option>
                      {availableNetworks.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </PField>
                </div>
                <PField label="Wallet Address" icon={Wallet}>
                  <input value={form.cryptoWalletAddress} onChange={e => setForm(f => ({ ...f, cryptoWalletAddress: e.target.value }))}
                    placeholder="0x…" className={inputCls("text-sm font-mono")} style={inputStyle} />
                </PField>
              </div>
            )}
            {enabled.anonPayEnabled && (
              <div className="space-y-3">
                <PField label="AnonPay Wallet Address" icon={Wallet}>
                  <input value={form.anonPayWallet} onChange={e => setForm(f => ({ ...f, anonPayWallet: e.target.value }))}
                    placeholder="e.g. XMR address" className={inputCls("text-sm font-mono")} style={inputStyle} />
                </PField>
                <PField label="Coin & Network" icon={Globe}>
                  <select
                    value={`${form.anonPayTicker.toLowerCase()}|${form.anonPayNetwork}`}
                    onChange={e => {
                      const [ticker, network] = e.target.value.split("|");
                      setForm(f => ({ ...f, anonPayTicker: ticker, anonPayNetwork: network }));
                    }}
                    className={inputCls("text-sm")} style={inputStyle}
                  >
                    {TROCADOR_COINS.map(c => (
                      <option key={`${c.ticker}|${c.network}`} value={`${c.ticker}|${c.network}`}>{c.label}</option>
                    ))}
                  </select>
                </PField>
              </div>
            )}
          </div>
        )}

        {/* ── Fiat group ────────────────────────────────── */}
        {(enabled.paypalEnabled || enabled.revolutEnabled) && (
          <div className="rounded-xl p-3 space-y-3" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--t-subtle)" }}>PayPal & Revolut</p>
            {enabled.paypalEnabled && (
              <PField label="PayPal Email / Handle" icon={CreditCard}>
                <input value={form.paypalHandle} onChange={e => setForm(f => ({ ...f, paypalHandle: e.target.value }))}
                  placeholder="your@email.com" className={inputCls("text-sm")} style={inputStyle} />
              </PField>
            )}
            {enabled.revolutEnabled && (
              <PField label="Revolut Handle" icon={CreditCard}>
                <input value={form.revolutHandle} onChange={e => setForm(f => ({ ...f, revolutHandle: e.target.value }))}
                  placeholder="@yourhandle" className={inputCls("text-sm")} style={inputStyle} />
              </PField>
            )}
          </div>
        )}

        {!Object.values(enabled).some(Boolean) && (
          <p className="text-sm" style={{ color: "var(--t-subtle)" }}>No payment methods enabled yet. Ask your admin to enable them in your assignment.</p>
        )}
        {Object.values(enabled).some(Boolean) && (
          <>
            {msg && <p className="text-sm font-semibold" style={{ color: "#DC2626" }}>{msg}</p>}
            <button onClick={save} disabled={saving}
              className="h-10 px-5 rounded-xl text-xs font-bold text-white flex items-center gap-2 disabled:opacity-60"
              style={{ background: saved ? "#16A34A" : "var(--t-blue-deep)" }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saving ? "Saving…" : saved ? "Saved!" : "Save Payment Details"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Broadcast Tab ────────────────────────────────────────────────────────────

type BroadcastMode = "individual" | "group";

function BroadcastTab({ gbId, gbName, reshipperUsername, country }: {
  gbId: string;
  gbName: string;
  reshipperUsername: string;
  country: string;
}) {
  const [mode, setMode] = useState<BroadcastMode>("group");
  const [message, setMessage] = useState("");
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [groupFilter, setGroupFilter] = useState("country");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent?: number; skipped?: number; total?: number; to?: string } | null>(null);
  const [error, setError] = useState("");
  const [members, setMembers] = useState<{ username: string; telegramLinked: boolean }[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<"sent" | "error" | null>(null);

  const switchMode = (m: BroadcastMode) => {
    setMode(m); setResult(null); setError("");
    if (m === "individual" && members.length === 0) {
      setMembersLoading(true);
      reshipFetch(`/api/reshipper/gb/${gbId}/members`, { credentials: "include" })
        .then(r => r.json())
        .then(d => { if (d.members) setMembers(d.members); })
        .catch(() => {})
        .finally(() => setMembersLoading(false));

    }
  };

  const toggleRecipient = (username: string) => {
    setSelectedRecipients(prev =>
      prev.includes(username) ? prev.filter(u => u !== username) : [...prev, username]
    );
  };

  const linkedMembers = members.filter(m => m.telegramLinked);
  const allSelected = linkedMembers.length > 0 && linkedMembers.every(m => selectedRecipients.includes(m.username));
  const toggleSelectAll = () => {
    if (allSelected) setSelectedRecipients([]);
    else setSelectedRecipients(linkedMembers.map(m => m.username));
  };

  const sendTest = async () => {
    if (!message.trim()) return;
    setTestSending(true); setTestResult(null);
    try {
      const res = await reshipFetch(`/api/reshipper/gb/${gbId}/send-test`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() }),
      });
      setTestResult(res.ok ? "sent" : "error");
    } catch { setTestResult("error"); }
    setTestSending(false);
    setTimeout(() => setTestResult(null), 4000);
  };


  const send = async () => {
    if (!message.trim()) return;
    setSending(true); setResult(null); setError("");
    try {
      if (mode === "individual") {
        if (selectedRecipients.length === 0) { setError("Please select at least one recipient"); setSending(false); return; }
        let sent = 0;
        for (const username of selectedRecipients) {
          const res = await reshipFetch(`/api/reshipper/gb/${gbId}/send-message`, {
            method: "POST", credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ to: username, message: message.trim() }),
          });
          const data = await res.json();
          if (!res.ok) { setError(data.error || "Failed to send to @" + username); setSending(false); return; }
          sent++;
        }
        setResult({ sent, to: sent === 1 ? selectedRecipients[0] : undefined });
        setMessage(""); setSelectedRecipients([]);
      } else {
        const body: Record<string, string> = { message: message.trim() };
        if (mode === "group") body.filter = groupFilter;
        const res = await reshipFetch(`/api/reshipper/gb/${gbId}/broadcast`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (res.ok) { setResult(data); setMessage(""); }
        else { setError(data.error || "Failed to send"); }
      }
    } catch { setError("Network error — please try again"); }
    setSending(false);
  };

  const modes: { id: BroadcastMode; label: string }[] = [
    { id: "individual", label: "Individual" },
    { id: "group", label: "Group" },
  ];

  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex gap-1.5">
        {modes.map(m => (
          <button key={m.id} onClick={() => switchMode(m.id)}
            className="h-8 px-3 rounded-xl text-xs font-bold transition-all"
            style={{
              background: mode === m.id ? "var(--t-blue-deep)" : "var(--t-surface2)",
              color: mode === m.id ? "#fff" : "var(--t-muted)",
              border: `1px solid ${mode === m.id ? "transparent" : "var(--t-border)"}`,
            }}>
            {m.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl p-4 space-y-3" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--t-subtle)" }}>
          {mode === "individual" ? "Direct Message" : "Group Broadcast"}
        </p>

        {/* Header preview — shown on all modes */}
        <div className="flex items-start gap-2 px-3 py-2 rounded-xl text-[11px]"
          style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
          <span className="shrink-0 mt-0.5">📦</span>
          <div style={{ color: "var(--t-muted)" }}>
            <span className="font-bold" style={{ color: "var(--t-text)" }}>{gbName}</span>
            <span className="mx-1">·</span>
            <span>{country}</span>
            <span className="mx-1">·</span>
            <span>@{reshipperUsername}</span>
            <p className="text-[10px] mt-0.5 opacity-70">This header is automatically added to every message</p>
          </div>
        </div>

        {mode === "individual" && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium" style={{ color: "var(--t-muted)" }}>
                Recipients {selectedRecipients.length > 0 && <span className="ml-1 font-bold" style={{ color: "var(--t-blue)" }}>({selectedRecipients.length} selected)</span>}
              </label>
              {linkedMembers.length > 0 && (
                <button type="button" onClick={toggleSelectAll}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-lg transition-colors"
                  style={{ color: allSelected ? "var(--t-red, #DC2626)" : "var(--t-blue)", background: allSelected ? "rgba(220,38,38,0.07)" : "var(--t-blue-07)" }}>
                  {allSelected ? "Deselect all" : `Select all (${linkedMembers.length})`}
                </button>
              )}
            </div>
            {membersLoading ? (
              <div className="flex items-center gap-2 text-xs py-2" style={{ color: "var(--t-subtle)" }}>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading members…
              </div>
            ) : members.length === 0 ? (
              <p className="text-xs py-1" style={{ color: "var(--t-subtle)" }}>No members with orders in {country} yet.</p>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Search members…"
                  value={recipientSearch}
                  onChange={e => setRecipientSearch(e.target.value)}
                  className="w-full h-8 px-3 rounded-lg text-sm focus:outline-none"
                  style={{ border: "1px solid var(--t-border)", background: "var(--t-surface)", color: "var(--t-text)" }}
                />
                {(() => {
                  const query = recipientSearch.trim().toLowerCase().replace(/^@/, "");
                  const filtered = query
                    ? members.filter(m => m.username.toLowerCase().replace(/^@/, "").includes(query))
                    : members;
                  return (
                    <div className="max-h-40 overflow-y-auto rounded-xl divide-y" style={{ border: "1px solid var(--t-border)", background: "var(--t-surface)" }}>
                      {filtered.length === 0 ? (
                        <p className="text-xs px-3 py-2" style={{ color: "var(--t-subtle)" }}>No members match "{recipientSearch}"</p>
                      ) : filtered.map(({ username, telegramLinked }) => {
                        const selected = selectedRecipients.includes(username);
                        return (
                          <button key={username} type="button"
                            onClick={() => telegramLinked && toggleRecipient(username)}
                            disabled={!telegramLinked}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors"
                            style={{
                              background: selected ? "var(--t-blue-07)" : "transparent",
                              opacity: telegramLinked ? 1 : 0.4,
                              cursor: telegramLinked ? "pointer" : "default",
                            }}>
                            <div className="w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors"
                              style={{ background: selected ? "var(--t-blue-deep)" : "transparent", borderColor: selected ? "var(--t-blue-deep)" : "var(--t-border)" }}>
                              {selected && <Check className="w-2.5 h-2.5 text-white" />}
                            </div>
                            <span style={{ color: "var(--t-text)" }}>@{username.replace(/^@/, "")}</span>
                            {!telegramLinked && (
                              <span className="ml-auto text-[10px] font-semibold" style={{ color: "var(--t-subtle)" }}>No bot</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        )}

        {mode === "group" && (
          <div className="space-y-1">
            <label className="text-xs font-medium" style={{ color: "var(--t-muted)" }}>Send to</label>
            <select
              value={groupFilter}
              onChange={e => setGroupFilter(e.target.value)}
              className="w-full h-9 px-3 rounded-xl text-sm focus:outline-none"
              style={inputStyle}
            >
              <option value="country">My country — {country}</option>
              <option value="Submitted">Submitted orders</option>
              <option value="Processing">Processing orders</option>
              <option value="Shipped">Shipped orders</option>
              <option value="Completed">Completed orders</option>
            </select>
          </div>
        )}

        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={5}
          maxLength={4000}
          placeholder={
            mode === "individual" ? "Write your message…" :
            "Write a message to this group…"
          }
          className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none resize-none"
          style={inputStyle}
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px]" style={{ color: message.length > 3500 ? "#DC2626" : "var(--t-subtle)" }}>
            {message.length}/4000
          </span>
          <div className="flex items-center gap-2">
            {mode === "individual" && (
              <button onClick={sendTest} disabled={testSending || !message.trim()}
                className="h-9 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-60 transition-colors"
                style={{
                  background: testResult === "sent" ? "rgba(16,185,129,0.1)" : testResult === "error" ? "rgba(220,38,38,0.1)" : "var(--t-surface2)",
                  color: testResult === "sent" ? "#15803D" : testResult === "error" ? "#DC2626" : "var(--t-muted)",
                  border: `1px solid ${testResult === "sent" ? "rgba(16,185,129,0.3)" : testResult === "error" ? "rgba(220,38,38,0.3)" : "var(--t-border)"}`,
                }}>
                {testSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : testResult === "sent" ? <Check className="w-3.5 h-3.5" /> : testResult === "error" ? <AlertCircle className="w-3.5 h-3.5" /> : <SendHorizonal className="w-3.5 h-3.5" />}
                {testResult === "sent" ? "Test sent!" : testResult === "error" ? "Failed" : "Test to myself"}
              </button>
            )}
            <button onClick={send} disabled={sending || !message.trim() || (mode === "individual" && selectedRecipients.length === 0)}
              className="h-9 px-5 rounded-xl text-xs font-bold text-white flex items-center gap-2 disabled:opacity-60"
              style={{ background: "var(--t-blue-deep)" }}>
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <SendHorizonal className="w-3.5 h-3.5" />}
              {mode === "individual"
                ? selectedRecipients.length > 1 ? `Send to ${selectedRecipients.length} members` : "Send Message"
                : "Send to Group"}
            </button>
          </div>
        </div>
      </div>

      {result && (
        <div className="flex items-center gap-2 p-3 rounded-xl text-sm"
          style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)", color: "#15803D" }}>
          <Check className="w-4 h-4 shrink-0" />
          {result.to ? (
            <span>Message sent to <strong>@{result.to}</strong>.</span>
          ) : (
            <span>Sent to <strong>{result.sent}</strong> member{result.sent !== 1 ? "s" : ""}
              {result.skipped && result.skipped > 0 ? ` (${result.skipped} skipped — no Telegram linked)` : ""}.
            </span>
          )}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl text-sm"
          style={{ background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.2)", color: "#DC2626" }}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

// ─── Join GB with Invite Code ─────────────────────────────────────────────────

function JoinWithCodeForm({ onJoined, onCancel }: {
  onJoined: (gbId: string, gbName: string, alreadyAssigned?: boolean) => void;
  onCancel?: () => void;
}) {
  const [code, setCode] = useState("");
  const [country, setCountry] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !country.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await reshipFetch("/api/reshipper/join", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: code.trim(), country: country.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        onJoined(data.gbId, data.gbName, data.alreadyAssigned);
      } else {
        setError(data.error || "Failed to join group buy");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1">
        <label className="text-xs font-semibold" style={{ color: "var(--t-muted)" }}>Invite Code</label>
        <input
          value={code}
          onChange={e => setCode(e.target.value)}
          placeholder="Enter your invite code…"
          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-text)" }}
          autoFocus
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-semibold" style={{ color: "var(--t-muted)" }}>Your Country</label>
        <select
          value={country}
          onChange={e => setCountry(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none appearance-none"
          style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: country ? "var(--t-text)" : "var(--t-subtle)" }}
        >
          <option value="">Select your country…</option>
          {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <p className="text-[11px]" style={{ color: "var(--t-subtle)" }}>
          This should be the country where you'll be reshipping from.
        </p>
      </div>
      {error && (
        <p className="text-xs font-medium text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-100">{error}</p>
      )}
      <div className="flex gap-2 pt-1">
        {onCancel && (
          <button type="button" onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-muted)" }}>
            Cancel
          </button>
        )}
        <button type="submit" disabled={submitting || !code.trim() || !country.trim()}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
          style={{ background: "var(--t-blue)" }}>
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {submitting ? "Joining…" : "Join Group Buy"}
        </button>
      </div>
    </form>
  );
}

// ─── Main Reshipper Page ──────────────────────────────────────────────────────

// ─── Unclaimed Orders Tab ─────────────────────────────────────────────────────
function UnclaimedTab({ gbId, unclaimedOrders, loading, onClaim, onClaimBulk, currency }: {
  gbId: string;
  unclaimedOrders: ROrder[];
  loading: boolean;
  onClaim: (orderId: string) => Promise<void>;
  onClaimBulk: (orderIds: string[]) => Promise<void>;
  currency?: string;
}) {
  const [claiming, setClaiming] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkClaiming, setBulkClaiming] = useState(false);
  const sym = currency === "GBP" ? "£" : currency === "EUR" ? "€" : "$";

  // Drop selections that are no longer in the unclaimed list (e.g. after refresh).
  useEffect(() => {
    setSelected(prev => {
      const valid = new Set(unclaimedOrders.map(o => o.id));
      const next = new Set<string>();
      for (const id of prev) if (valid.has(id)) next.add(id);
      return next.size === prev.size ? prev : next;
    });
  }, [unclaimedOrders]);

  const handleClaim = async (orderId: string) => {
    setClaiming(orderId);
    try { await onClaim(orderId); } finally { setClaiming(null); }
  };

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allSelected = unclaimedOrders.length > 0 && selected.size === unclaimedOrders.length;
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(unclaimedOrders.map(o => o.id)));
  };

  const handleClaimSelected = async () => {
    if (selected.size === 0) return;
    setBulkClaiming(true);
    try {
      await onClaimBulk(Array.from(selected));
      setSelected(new Set());
    } finally {
      setBulkClaiming(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--t-blue)" }} /></div>;
  }

  if (unclaimedOrders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <Check className="w-10 h-10" style={{ color: "var(--t-blue)" }} />
        <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>All orders claimed</p>
        <p className="text-xs" style={{ color: "var(--t-muted)" }}>No unclaimed orders in your country leg right now.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Inbox className="w-4 h-4" style={{ color: "var(--t-blue-deep)" }} />
        <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>
          Unclaimed Orders
        </p>
        <span className="ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.1)", color: "#DC2626" }}>
          {unclaimedOrders.length} waiting
        </span>
      </div>
      <p className="text-xs mb-3" style={{ color: "var(--t-muted)" }}>
        These orders are in your country leg and have not yet been assigned to a reshipper. Tick the ones you'll handle and claim them in one go, or claim individually.
      </p>

      {/* Select-all + bulk-claim bar */}
      <div className="flex items-center gap-2 rounded-xl border p-2.5"
        style={{ background: "var(--t-surface2)", borderColor: "var(--t-border)" }}>
        <label className="flex items-center gap-2 cursor-pointer select-none flex-1 min-w-0">
          <input
            type="checkbox"
            checked={allSelected}
            ref={el => { if (el) el.indeterminate = someSelected; }}
            onChange={toggleAll}
            className="w-4 h-4 shrink-0 cursor-pointer accent-[var(--t-blue-deep)]"
          />
          <span className="text-xs font-bold" style={{ color: "var(--t-text)" }}>
            {allSelected ? "Deselect all" : "Select all"}
          </span>
          {selected.size > 0 && (
            <span className="text-[11px]" style={{ color: "var(--t-muted)" }}>
              · {selected.size} selected
            </span>
          )}
        </label>
        <button
          onClick={handleClaimSelected}
          disabled={selected.size === 0 || bulkClaiming}
          className="h-8 px-3 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          style={{ background: "var(--t-blue-deep)" }}
        >
          {bulkClaiming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          {bulkClaiming ? "Claiming…" : `Claim ${selected.size || ""}`.trim()}
        </button>
      </div>

      {unclaimedOrders.map(o => {
        const lineItems = (o as any).lineItems ?? [];
        const total = typeof o.grandTotal === "string" ? parseFloat(o.grandTotal) : (o.grandTotal ?? 0);
        const isSelected = selected.has(o.id);
        return (
          <div
            key={o.id}
            className="rounded-xl border p-3 space-y-2 transition-colors"
            style={{
              background: isSelected ? "rgba(27,58,122,0.06)" : "var(--t-surface2)",
              borderColor: isSelected ? "var(--t-blue-deep)" : "var(--t-border)",
            }}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleOne(o.id)}
                disabled={bulkClaiming || claiming === o.id}
                className="mt-1 w-4 h-4 shrink-0 cursor-pointer accent-[var(--t-blue-deep)]"
                aria-label={`Select order ${o.code ?? o.id}`}
              />
              <div className="flex items-start justify-between gap-3 flex-1 min-w-0">
                <div className="min-w-0">
                  <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>@{o.telegramUsername}</p>
                  {o.code && <p className="text-[11px]" style={{ color: "var(--t-muted)" }}>#{o.code}</p>}
                  {o.shippingName && <p className="text-[11px]" style={{ color: "var(--t-muted)" }}>{o.shippingName}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold tabular-nums" style={{ color: "var(--t-blue-deep)" }}>{sym}{total.toFixed(2)}</p>
                  <p className="text-[10px]" style={{ color: "var(--t-muted)" }}>{o.status}</p>
                </div>
              </div>
            </div>
            {lineItems.length > 0 && (
              <div className="rounded-lg px-2 py-1.5 space-y-0.5" style={{ background: "rgba(27,58,122,0.04)", border: "1px solid rgba(27,58,122,0.1)" }}>
                {lineItems.map((li: any, i: number) => (
                  <p key={i} className="text-[11px]" style={{ color: "var(--t-text)" }}>
                    {li.productName} × {li.quantity}
                  </p>
                ))}
              </div>
            )}
            <button
              onClick={() => handleClaim(o.id)}
              disabled={claiming === o.id || bulkClaiming}
              className="w-full h-9 rounded-lg text-sm font-bold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
              style={{ background: "var(--t-blue-deep)" }}
            >
              {claiming === o.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {claiming === o.id ? "Claiming…" : "Claim Order"}
            </button>
          </div>
        );
      })}
    </div>
  );
}

type RTab = "overview" | "summary" | "orders" | "unclaimed" | "qr" | "shipping" | "parcels" | "payments" | "broadcast";

const TABS: { id: RTab; label: string; icon: React.ElementType }[] = [
  { id: "overview",  label: "Overview",  icon: LayoutDashboard },
  { id: "summary",   label: "Summary",   icon: BarChart3 },
  { id: "orders",    label: "My Orders", icon: ShoppingBag },
  { id: "unclaimed", label: "Unclaimed", icon: Inbox },
  { id: "qr",        label: "QR Codes",  icon: QrCode },
  { id: "shipping",  label: "Shipping",  icon: Truck },
  { id: "parcels",   label: "Parcels",   icon: Package },
  { id: "payments",  label: "Payments",  icon: CreditCard },
  { id: "broadcast", label: "Broadcast", icon: MessageSquare },
];

export default function ReshipperPage() {
  const [, setLocation] = useLocation();
  const { account, isLoading: accountLoading } = useAccount();

  // Admin impersonation — detect ?impersonate=<username> + sessionStorage secret
  const urlParams = new URLSearchParams(window.location.search);
  const impersonateUser = urlParams.get("impersonate");
  const storedSecret = impersonateUser ? (sessionStorage.getItem("peps_admin_preview_secret") ?? "") : "";
  if (impersonateUser && storedSecret) {
    _adminImpersonateSecret = storedSecret;
    _adminImpersonateUsername = impersonateUser;
  }
  const isAdminMode = !!(impersonateUser && storedSecret);

  const [me, setMe] = useState<ReshipperMe | null>(null);
  const [assignments, setAssignments] = useState<RAssignment[]>([]);
  const [selectedGbId, setSelectedGbId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<RTab>("overview");
  const [orders, setOrders] = useState<ROrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [unclaimedOrders, setUnclaimedOrders] = useState<ROrder[]>([]);
  const [unclaimedLoading, setUnclaimedLoading] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [meRes, aRes] = await Promise.all([
        reshipFetch("/api/reshipper/me", { credentials: "include" }),
        reshipFetch("/api/reshipper/assignments", { credentials: "include" }),
      ]);
      if (!isAdminMode && (meRes.status === 401 || aRes.status === 401)) {
        setLocation("/login");
        return;
      }
      if (meRes.ok) setMe(await meRes.json());
      if (aRes.ok) {
        const data: RAssignment[] = await aRes.json();
        setAssignments(data);
        if (data.length > 0 && !selectedGbId) setSelectedGbId(data[0].gbId);
      }
    } catch { setError("Failed to load dashboard data"); }
    setLoading(false);
  }, [setLocation, selectedGbId]);

  useEffect(() => { load(); }, []);

  const loadOrders = useCallback(async (gbId: string) => {
    if (!gbId) return;
    setOrdersLoading(true);
    try {
      const res = await reshipFetch(`/api/reshipper/gb/${gbId}/orders`, { credentials: "include" });
      if (res.ok) setOrders(await res.json());
    } finally { setOrdersLoading(false); }
  }, []);

  const loadUnclaimed = useCallback(async (gbId: string) => {
    if (!gbId) return;
    setUnclaimedLoading(true);
    try {
      const res = await reshipFetch(`/api/reshipper/gb/${gbId}/unclaimed-orders`, { credentials: "include" });
      if (res.ok) setUnclaimedOrders(await res.json());
      else setUnclaimedOrders([]);
    } finally { setUnclaimedLoading(false); }
  }, []);

  useEffect(() => {
    if (selectedGbId) { loadOrders(selectedGbId); loadUnclaimed(selectedGbId); }
    else { setOrders([]); setUnclaimedOrders([]); }
  }, [selectedGbId, loadOrders, loadUnclaimed]);

  // Auto-poll every 60 s so deleted/new orders appear without a manual refresh
  useEffect(() => {
    if (!selectedGbId) return;
    const timer = setInterval(() => {
      loadOrders(selectedGbId);
      loadUnclaimed(selectedGbId);
    }, 60_000);
    return () => clearInterval(timer);
  }, [selectedGbId, loadOrders, loadUnclaimed]);

  // Refresh the relevant list whenever the user switches to the orders or unclaimed tab
  useEffect(() => {
    if (!selectedGbId) return;
    if (activeTab === "orders" || activeTab === "overview" || activeTab === "summary" || activeTab === "qr") {
      loadOrders(selectedGbId);
    }
    if (activeTab === "unclaimed") {
      loadUnclaimed(selectedGbId);
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentAssignment = assignments.find(a => a.gbId === selectedGbId);

  const updateGbInAssignment = useCallback((updated: RAssignment["gb"]) => {
    setAssignments(prev => prev.map(a => a.gbId === selectedGbId ? { ...a, gb: updated } : a));
  }, [selectedGbId]);

  const updateAssignment = useCallback((updated: RAssignment) => {
    setAssignments(prev => prev.map(a => a.gbId === updated.gbId ? updated : a));
  }, []);

  const updateOrder = useCallback((updated: ROrder) => {
    setOrders(prev => prev.map(o => o.id === updated.id ? { ...o, ...updated } : o));
  }, []);

  const claimOrder = useCallback(async (orderId: string) => {
    const res = await reshipFetch(`/api/reshipper/gb/${selectedGbId}/orders/${orderId}/claim`, {
      method: "POST",
      credentials: "include",
    });
    if (res.ok) {
      // Remove from unclaimed, refresh my orders
      setUnclaimedOrders(prev => prev.filter(o => o.id !== orderId));
      loadOrders(selectedGbId);
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Failed to claim order");
    }
  }, [selectedGbId, loadOrders]);

  const claimOrdersBulk = useCallback(async (orderIds: string[]) => {
    if (orderIds.length === 0) return;
    const res = await reshipFetch(`/api/reshipper/gb/${selectedGbId}/orders/claim-bulk`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderIds }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error ?? "Failed to claim orders");
      return;
    }
    const claimedIds: string[] = data.claimedIds ?? [];
    if (claimedIds.length > 0) {
      const claimedSet = new Set(claimedIds);
      setUnclaimedOrders(prev => prev.filter(o => !claimedSet.has(o.id)));
      loadOrders(selectedGbId);
    }
    const skipped: string[] = data.skipped ?? [];
    if (skipped.length > 0) {
      alert(`Claimed ${claimedIds.length} of ${orderIds.length}. ${skipped.length} were already claimed by someone else and have been skipped.`);
      // Refresh unclaimed list so skipped/stale rows disappear.
      loadUnclaimed(selectedGbId);
    }
  }, [selectedGbId, loadOrders, loadUnclaimed]);

  // Auth: not logged in (skip gate if admin is impersonating)
  if (!isAdminMode && !accountLoading && !account) {
    return (
      <PageLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
          <AlertCircle className="w-10 h-10 mb-3" style={{ color: "var(--t-subtle)" }} />
          <h2 className="text-lg font-bold mb-2" style={{ color: "var(--t-text)" }}>Sign in required</h2>
          <p className="text-sm mb-4" style={{ color: "var(--t-muted)" }}>Please log in to access the Reshipper dashboard.</p>
          <button onClick={() => setLocation("/login")} className="h-10 px-6 rounded-xl text-sm font-bold text-white"
            style={{ background: "var(--t-blue-deep)" }}>Sign In</button>
        </div>
      </PageLayout>
    );
  }

  // Auth: not an approved reshipper
  if (!loading && me && me.reshipperStatus !== "approved") {
    return (
      <PageLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
          <Globe className="w-10 h-10 mb-3" style={{ color: "var(--t-subtle)" }} />
          <h2 className="text-lg font-bold mb-2" style={{ color: "var(--t-text)" }}>Not Authorised</h2>
          <p className="text-sm mb-1" style={{ color: "var(--t-muted)" }}>Your account doesn't have approved Reshipper status.</p>
          <p className="text-sm mb-4" style={{ color: "var(--t-subtle)" }}>
            {me.reshipperStatus === "applied" ? "Your application is pending review." :
             me.reshipperStatus === "suspended" ? "Your Reshipper account is suspended." :
             me.reshipperStatus === "rejected" ? "Your Reshipper application was rejected." :
             "Contact admin if you believe this is an error."}
          </p>
          <button onClick={() => setLocation("/account")} className="h-9 px-5 rounded-xl text-sm font-semibold"
            style={{ background: "var(--t-surface2)", color: "var(--t-muted)", border: "1px solid var(--t-border)" }}>
            Back to Account
          </button>
        </div>
      </PageLayout>
    );
  }

  if (loading || accountLoading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--t-blue)" }} />
        </div>
      </PageLayout>
    );
  }

  // No assignments — show invite code form
  if (assignments.length === 0) {
    return (
      <PageLayout>
        <div className="max-w-md mx-auto px-4 py-10 space-y-4">
          <div className="text-center space-y-1 pb-2">
            <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-3"
              style={{ background: "rgba(59,130,246,0.1)" }}>
              <Truck className="w-6 h-6" style={{ color: "var(--t-blue)" }} />
            </div>
            <h2 className="text-lg font-bold" style={{ color: "var(--t-text)" }}>Join a Group Buy</h2>
            <p className="text-sm" style={{ color: "var(--t-muted)" }}>
              Enter the invite code your admin sent you to get started.
            </p>
          </div>
          <div className="rounded-2xl p-5" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
            <JoinWithCodeForm
              onJoined={(_gbId, _gbName, _already) => {
                setError("");
                load();
              }}
            />
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="flex flex-col flex-1" style={{ fontFamily: "'Inter', sans-serif", background: "var(--t-bg)" }}>

        {/* ── Header ── */}
        <div className="px-4 py-3 flex items-center justify-between gap-3" style={{ borderBottom: "1px solid var(--t-border)" }}>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--t-blue-deep)" }}>Reshipper</p>
            <p className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>@{me?.telegramUsername}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {assignments.length === 1 && currentAssignment && (
              <p className="hidden sm:block text-xs font-semibold truncate max-w-[180px]" style={{ color: "var(--t-muted)" }}>
                {currentAssignment.gb?.name ?? currentAssignment.gbId} · {currentAssignment.country}
              </p>
            )}
            <button
              onClick={() => setShowJoinForm(v => !v)}
              className="flex items-center gap-1 px-3 h-8 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all"
              style={showJoinForm
                ? { background: "var(--t-blue-deep)", color: "#fff" }
                : { background: "var(--t-surface2)", color: "var(--t-muted)", border: "1px solid var(--t-border)" }}>
              <Plus className="w-3 h-3" />Join GB
            </button>
            <button onClick={() => { load(); if (selectedGbId) { loadOrders(selectedGbId); loadUnclaimed(selectedGbId); } }}
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
              <RefreshCw className="w-3 h-3" style={{ color: "var(--t-muted)" }} />
            </button>
          </div>
        </div>

        {/* ── GB picker row (multiple assignments) ── */}
        {assignments.length > 1 && (
          <div className="flex gap-1 px-3 py-2 overflow-x-auto shrink-0" style={{ borderBottom: "1px solid var(--t-border)", background: "var(--t-surface2)" }}>
            {assignments.map(a => (
              <button key={a.gbId} onClick={() => setSelectedGbId(a.gbId)}
                className="flex items-center gap-1 px-3 h-7 rounded-lg text-[11px] font-bold whitespace-nowrap shrink-0 transition-all"
                style={selectedGbId === a.gbId
                  ? { background: "var(--t-blue-deep)", color: "#fff" }
                  : { background: "transparent", color: "var(--t-muted)" }}>
                {a.gb?.name ?? a.gbId} · {a.country}
              </button>
            ))}
          </div>
        )}

        {/* ── Inline Join GB form ── */}
        {showJoinForm && (
          <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--t-border)", background: "var(--t-surface)" }}>
            <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: "var(--t-subtle)" }}>Join a Group Buy</p>
            <JoinWithCodeForm
              onJoined={(_gbId, _gbName, _already) => { setShowJoinForm(false); setError(""); load(); }}
              onCancel={() => setShowJoinForm(false)}
            />
          </div>
        )}

        {error && (
          <div className="mx-4 mt-3 flex items-center gap-2 p-3 rounded-xl text-sm"
            style={{ background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.2)", color: "#DC2626" }}>
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}

        {/* ── Tab bar ── */}
        <div className="flex gap-1 px-3 py-2 overflow-x-auto shrink-0" style={{ borderBottom: "1px solid var(--t-border)", background: "var(--t-surface2)" }}>
          {TABS.filter(t => t.id !== "payments" || currentAssignment?.allowPayments).map(t => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            const badge = t.id === "unclaimed" && unclaimedOrders.length > 0 ? unclaimedOrders.length : null;
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all shrink-0 relative"
                style={{ background: isActive ? "var(--t-blue-deep)" : "transparent", color: isActive ? "#fff" : "var(--t-muted)" }}>
                <Icon className="w-3 h-3" />{t.label}
                {badge !== null && (
                  <span className="ml-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: isActive ? "rgba(255,255,255,0.25)" : "#DC2626", color: "#fff", lineHeight: 1 }}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto px-4 py-5 pb-24">
          {currentAssignment ? (
            <>
              {activeTab === "overview" && (
                ordersLoading
                  ? <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--t-blue)" }} /></div>
                  : <OverviewTab orders={orders} gbName={currentAssignment.gb?.name ?? currentAssignment.gbId} country={currentAssignment.country} currency={currentAssignment.gb?.currency} />
              )}
              {activeTab === "summary" && (
                ordersLoading
                  ? <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--t-blue)" }} /></div>
                  : <SummaryTab orders={orders} assignment={currentAssignment} />
              )}
              {activeTab === "orders" && (
                ordersLoading
                  ? <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--t-blue)" }} /></div>
                  : <OrdersTab gbId={selectedGbId} orders={orders} gbName={currentAssignment.gb?.name ?? currentAssignment.gbId} onOrderUpdate={updateOrder} currency={currentAssignment.gb?.currency} />
              )}
              {activeTab === "unclaimed" && (
                <UnclaimedTab
                  gbId={selectedGbId}
                  unclaimedOrders={unclaimedOrders}
                  loading={unclaimedLoading}
                  onClaim={claimOrder}
                  onClaimBulk={claimOrdersBulk}
                  currency={currentAssignment.gb?.currency}
                />
              )}
              {activeTab === "qr" && (
                ordersLoading
                  ? <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--t-blue)" }} /></div>
                  : <QrTab key={selectedGbId} gbId={selectedGbId} />
              )}
              {activeTab === "shipping" && (
                <ShippingTab key={selectedGbId} gbId={selectedGbId} initialGb={currentAssignment.gb} onGbUpdate={updateGbInAssignment} allowPayments={currentAssignment.allowPayments} allowVendorShippingSplit={currentAssignment.allowVendorShippingSplit} />
              )}
              {activeTab === "parcels" && <ParcelsTab key={selectedGbId} gbId={selectedGbId} />}
              {activeTab === "payments" && me && (
                <PaymentsTab key={selectedGbId} assignment={currentAssignment} me={me} onAssignmentUpdate={updateAssignment} />
              )}
              {activeTab === "broadcast" && (
                <BroadcastTab
                  gbId={selectedGbId}
                  gbName={currentAssignment.gb?.name ?? selectedGbId}
                  reshipperUsername={currentAssignment.reshipperUsername}
                  country={currentAssignment.country}
                />
              )}
            </>
          ) : (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--t-blue)" }} />
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
