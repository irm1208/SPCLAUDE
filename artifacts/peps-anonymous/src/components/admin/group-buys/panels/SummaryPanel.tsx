import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DatePickerField } from "@/components/DatePickerField";
import {
  Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Loader2, Save, X, Check,
  Users, Package, Truck, Info, Search, RefreshCw, KeyRound, Bell,
  Eye, EyeOff, ChevronUp, ChevronDown, ArrowUp, ArrowDown,
  Shield, CalendarDays, Calendar, Globe, Tag, ToggleLeft, ToggleRight,
  Upload, FileText, DollarSign, Copy, MapPin, CheckCircle2,
  AlertCircle, AlertTriangle, Clock, Navigation, Box, TestTube, BarChart3,
  CreditCard, Send, MessageSquare, ShoppingCart, Wallet, QrCode, UserCheck, ExternalLink,
  Download, SendHorizonal, Ship, TrendingUp, Settings, Lock, Unlock, Calculator, PenLine, Home,
} from "lucide-react";
import { Button, Card, Input, Label, cn } from "@/components/ui";
import { ImageLightbox } from "@/components/ImageLightbox";
import { currSym } from "@/lib/currency";
import { COUNTRIES, COUNTRY_LIST } from "@/data/countries";
import { lookupBatchPrefix, findMatchingPeptide } from "@/data/batchPrefixes";
import { CARRIERS_17TRACK } from "@/lib/carriers";
import { resolveCountry, apiUrl, INFO_CARD_TYPE_OPTIONS, InfoCardsEditor, ShippingOptionsEditor, CRYPTO_CURRENCIES, TROCADOR_COINS, CRYPTO_NETWORKS, DEFAULT_CRYPTO_NETWORKS, GbPaymentGatewayInlineContent, EU_COUNTRIES, POPULAR_COUNTRIES, GBP_TO_USD, GB_STATUS_STYLES, CopyIdBadge, StatusBadge } from "../shared/core";
import type { GroupBuy, InfoCard, ShippingOption, EntryFeePayment, GbPaymentConfig, GBProduct, DeliveryMethod, GBDeliveryMethod, Member, Product, CustomCourier } from "../shared/core";
import { GroupBuyOrderBreakdown } from "@/components/GroupBuyOrderBreakdown";
export function GbCoverageSection({ secret, gbId }: { secret: string; gbId: string }) {
  type CoverageItem = { productName: string; stock: number | null; mappingCount: number; orderedQty: number };
  const [items, setItems] = useState<CoverageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const r = await fetch(apiUrl("/admin/inventory/gb-comparison"), { headers: { "x-admin-secret": secret } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      setItems((d.items ?? []).filter((it: any) => it.gbId === gbId));
    } catch { setErr("Failed to load coverage data"); }
    finally { setLoading(false); }
  }, [secret, gbId]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b border-border">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm font-semibold">Stock Coverage</p>
          <p className="text-xs text-muted-foreground ml-1">Live Qiyunle stock vs. ordered quantities</p>
        </div>
        <button onClick={load} className="p-1.5 rounded hover:bg-muted transition-colors">
          <RefreshCw className={cn("w-3.5 h-3.5 text-muted-foreground", loading && "animate-spin")} />
        </button>
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : err ? (
        <p className="text-xs text-red-500 text-center py-6">{err}</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">No inventory mappings found for this group buy's products.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Product</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Ordered</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Stock</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Remaining</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item, i) => {
              const stock = item.mappingCount > 0 && item.stock !== null ? item.stock : null;
              const ordered = item.orderedQty ?? 0;
              const remaining = stock !== null ? stock - ordered : null;
              return (
                <tr key={i} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-foreground text-xs">{item.productName}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-mono text-xs text-foreground">
                    {ordered > 0 ? ordered.toFixed(ordered % 1 === 0 ? 0 : 2) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-mono text-xs">
                    {stock !== null ? <span className="text-foreground">{stock}</span> : <span className="text-muted-foreground">Unmapped</span>}
                  </td>
                  <td className={cn("px-4 py-2.5 text-right tabular-nums font-mono text-xs font-semibold",
                    remaining === null ? "text-muted-foreground font-normal" : remaining < 0 ? "text-red-600" : remaining === 0 ? "text-amber-600" : "text-green-700"
                  )}>
                    {remaining === null ? "—" : remaining > 0 ? `+${remaining}` : remaining}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function SummarySubTab({ secret, gb }: { secret: string; gb: GroupBuy }) {
  type GRow = { productId: string; productName: string; totalQty: number; unitPrice: number; totalValue: number; orderCount: number };
  type GBreakdown = { orderId: string; orderCode: string; telegramUsername: string; quantity: number; unitPrice: number; lineTotal: number; orderStatus: string; paymentStatus: string; notes: string | null };
  type Leg = { id: string; countryName: string; countryCode: string };

  const [rows, setRows] = useState<GRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("Submitted");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [countryLegFilter, setCountryLegFilter] = useState("all");
  const [accountCountryFilter, setAccountCountryFilter] = useState("all");
  const [reshipperFilter, setReshipperFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<"value_desc" | "az" | "qty_desc">("value_desc");
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<GBreakdown[]>([]);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [legs, setLegs] = useState<Leg[]>([]);
  const [memberCountries, setMemberCountries] = useState<string[]>([]);
  const [reshippers, setReshippers] = useState<string[]>([]);

  const ORDER_STATUSES = ["Submitted", "Confirmed", "Shipped", "Delivered"];

  useEffect(() => {
    if (gb.countryLegsEnabled) {
      fetch(apiUrl(`/admin/group-buys/${gb.id}/country-legs`), { headers: { "x-admin-secret": secret } })
        .then(r => r.ok ? r.json() : [])
        .then(setLegs)
        .catch(() => {});
    }
    fetch(apiUrl(`/admin/group-buys/${gb.id}/member-countries`), { headers: { "x-admin-secret": secret } })
      .then(r => r.ok ? r.json() : [])
      .then(setMemberCountries)
      .catch(() => {});
    fetch(apiUrl(`/admin/group-buys/${gb.id}/reshippers`), { headers: { "x-admin-secret": secret } })
      .then(r => r.ok ? r.json() : [])
      .then((data: { reshipperUsername: string }[]) => setReshippers(data.map(d => d.reshipperUsername)))
      .catch(() => {});
  }, [gb.id, gb.countryLegsEnabled, secret]);

  const buildParams = useCallback((extra: Record<string, string> = {}) => {
    const params = new URLSearchParams({ status: statusFilter });
    if (paymentFilter !== "all") params.set("paymentStatus", paymentFilter);
    if (countryLegFilter !== "all") params.set("countryLegId", countryLegFilter);
    if (accountCountryFilter !== "all") params.set("accountCountry", accountCountryFilter);
    if (reshipperFilter !== "all") params.set("reshipper", reshipperFilter);
    for (const [k, v] of Object.entries(extra)) params.set(k, v);
    return params;
  }, [statusFilter, paymentFilter, countryLegFilter, accountCountryFilter, reshipperFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    setExpandedProduct(null);
    setBreakdown([]);
    const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}/summary?${buildParams()}`), { headers: { "x-admin-secret": secret } });
    setRows(res.ok ? await res.json() : []);
    setLoading(false);
  }, [gb.id, secret, buildParams]);

  useEffect(() => { load(); }, [load]);

  const toggleProduct = useCallback(async (productName: string) => {
    if (expandedProduct === productName) { setExpandedProduct(null); setBreakdown([]); return; }
    setExpandedProduct(productName);
    setBreakdownLoading(true);
    const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}/summary/breakdown?${buildParams({ productName })}`), { headers: { "x-admin-secret": secret } });
    setBreakdown(res.ok ? await res.json() : []);
    setBreakdownLoading(false);
  }, [expandedProduct, gb.id, secret, buildParams]);

  const totalValue = rows.reduce((s, r) => s + Number(r.totalValue), 0);
  const totalQty = rows.reduce((s, r) => s + Number(r.totalQty), 0);

  const displayRows = sortOrder === "az"
    ? [...rows].sort((a, b) => a.productName.localeCompare(b.productName))
    : sortOrder === "qty_desc"
    ? [...rows].sort((a, b) => Number(b.totalQty) - Number(a.totalQty))
    : rows;

  const handleDownload = () => {
    if (rows.length === 0) return;
    const lines = [
      `Order Summary — ${gb.name} — ${statusFilter === "all" ? "All Orders" : statusFilter}`,
      `Generated: ${new Date().toLocaleString("en-GB")}`,
      "─".repeat(50), "",
      ...rows.map(r => `${r.productName} ×${Number(r.totalQty)} = ${gb.currency ?? "GBP"} ${Number(r.totalValue).toFixed(2)}`),
      "", "─".repeat(50),
      `Total: ${Number(totalQty)} units · ${gb.currency ?? "GBP"} ${Number(totalValue).toFixed(2)}`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `summary-${gb.name.replace(/\s+/g, "-").toLowerCase()}-${statusFilter}-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center flex-wrap">
        <select
          className="h-9 rounded-lg border border-border bg-background px-3 text-xs focus:outline-none"
          value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="all">All orders</option>
          {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          className="h-9 rounded-lg border border-border bg-background px-3 text-xs focus:outline-none"
          value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)}
        >
          <option value="all">All payments</option>
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
          <option value="pending_confirmation">Pending confirmation</option>
        </select>
        {gb.countryLegsEnabled && legs.length > 0 && (
          <select
            className="h-9 rounded-lg border border-border bg-background px-3 text-xs focus:outline-none"
            value={countryLegFilter} onChange={e => setCountryLegFilter(e.target.value)}
          >
            <option value="all">All legs</option>
            {legs.map(l => <option key={l.id} value={l.id}>{l.countryName} ({l.countryCode})</option>)}
          </select>
        )}
        {memberCountries.length > 0 && (
          <select
            className="h-9 rounded-lg border border-border bg-background px-3 text-xs focus:outline-none"
            value={accountCountryFilter} onChange={e => setAccountCountryFilter(e.target.value)}
          >
            <option value="all">All countries</option>
            {memberCountries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        {reshippers.length > 0 && (
          <select
            className="h-9 rounded-lg border border-border bg-background px-3 text-xs focus:outline-none"
            value={reshipperFilter} onChange={e => setReshipperFilter(e.target.value)}
          >
            <option value="all">All reshippers</option>
            {reshippers.map(r => <option key={r} value={r}>@{r}</option>)}
          </select>
        )}
        <select
          className="h-9 rounded-lg border border-border bg-background px-3 text-xs focus:outline-none"
          value={sortOrder} onChange={e => setSortOrder(e.target.value as "value_desc" | "az" | "qty_desc")}
        >
          <option value="value_desc">Highest value</option>
          <option value="qty_desc">Highest qty</option>
          <option value="az">A–Z</option>
        </select>
        <button onClick={load} className="h-9 w-9 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
        {rows.length > 0 && (
          <button onClick={handleDownload} className="h-9 flex items-center gap-1.5 px-3 rounded-lg text-xs font-semibold border border-border hover:bg-muted">
            <Download className="w-3.5 h-3.5" />Download .txt
          </button>
        )}
      </div>

      {rows.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Products", value: String(rows.length) },
              { label: "Total Qty", value: String(Number(totalQty)) },
              { label: "Total Value", value: `${gb.currency ?? "GBP"} ${Number(totalValue).toFixed(2)}` },
            ].map(s => (
              <div key={s.label} className="p-3 rounded-xl text-center border border-border bg-muted/30">
                <p className="text-sm font-bold">{s.value}</p>
                <p className="text-[10px] mt-0.5 text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl overflow-hidden border border-border">
            <div className="px-4 py-2.5 bg-muted/40">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Order List — tap a product to see who ordered it</p>
            </div>
            {displayRows.map(r => {
              const isExpanded = expandedProduct === r.productName;
              return (
                <div key={r.productName} className="border-t border-border">
                  <button
                    className="w-full flex items-center justify-between gap-4 px-4 py-3 text-xs text-left transition-colors hover:bg-muted/20"
                    style={{ background: isExpanded ? "hsl(var(--muted)/0.4)" : "transparent" }}
                    onClick={() => toggleProduct(r.productName)}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      {isExpanded
                        ? <ChevronUp className="w-3 h-3 shrink-0 text-orange-500" />
                        : <ChevronDown className="w-3 h-3 shrink-0 text-muted-foreground" />}
                      <span className="font-semibold truncate">{r.productName}</span>
                      <span className="shrink-0 text-muted-foreground">×{Number(r.totalQty)}</span>
                    </span>
                    <span className="font-bold shrink-0 tabular-nums">{gb.currency ?? "GBP"} {Number(r.totalValue).toFixed(2)}</span>
                  </button>
                  {isExpanded && (
                    <div className="px-4 py-3 bg-muted/20">
                      {breakdownLoading ? (
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <Loader2 className="w-3 h-3 animate-spin" />Loading…
                        </div>
                      ) : breakdown.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground">No orders found.</p>
                      ) : (
                        <div className="space-y-2">
                          {breakdown.map((b, i) => {
                            const isPaid = b.paymentStatus === "confirmed" || b.paymentStatus === "test_confirmed";
                            const isPending = b.paymentStatus === "pending_confirmation";
                            return (
                              <div key={i} className="space-y-0.5 text-[11px]">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                    <span className="font-mono shrink-0 text-muted-foreground">#{b.orderCode}</span>
                                    <span className="font-semibold truncate">{b.telegramUsername}</span>
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0" style={{
                                      background: b.orderStatus === "Submitted" ? "rgba(245,158,11,0.1)" : b.orderStatus === "Confirmed" ? "rgba(22,163,74,0.1)" : "rgba(100,116,139,0.1)",
                                      color: b.orderStatus === "Submitted" ? "#D97706" : b.orderStatus === "Confirmed" ? "#16A34A" : "hsl(var(--muted-foreground))",
                                    }}>{b.orderStatus}</span>
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0" style={{
                                      background: isPaid ? "rgba(22,163,74,0.1)" : isPending ? "rgba(59,130,246,0.1)" : "rgba(100,116,139,0.1)",
                                      color: isPaid ? "#16A34A" : isPending ? "#3B82F6" : "hsl(var(--muted-foreground))",
                                    }}>{isPaid ? "Paid" : isPending ? "Pending" : "Unpaid"}</span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0 font-mono">
                                    <span className="text-muted-foreground">×{Number(b.quantity)}</span>
                                    <span className="font-bold">{gb.currency ?? "GBP"} {Number(b.lineTotal).toFixed(2)}</span>
                                  </div>
                                </div>
                                {b.notes && (
                                  <p className="text-[10px] pl-1 italic text-muted-foreground">💬 {b.notes}</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            <div className="px-4 py-3 flex justify-between font-bold text-xs border-t border-border bg-muted/40">
              <span>Total</span>
              <span className="tabular-nums">{gb.currency ?? "GBP"} {totalValue.toFixed(2)}</span>
            </div>
          </div>
        </>
      )}
      {rows.length === 0 && <div className="text-center py-16 text-xs text-muted-foreground">No orders found for this filter.</div>}
      <GbCoverageSection secret={secret} gbId={gb.id} />
      <GroupBuyOrderBreakdown
        endpoint={apiUrl(`/admin/group-buys/${gb.id}/order-breakdown`)}
        currency={gb.currency ?? "GBP"}
        headers={{ "x-admin-secret": secret }}
      />
    </div>
  );
}

// ─── Broadcast Sub-tab ────────────────────────────────────────────────────────
