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
import type { GbOrder } from "./OrdersPanel";
import type { GroupBuy, InfoCard, ShippingOption, EntryFeePayment, GbPaymentConfig, GBProduct, DeliveryMethod, GBDeliveryMethod, Member, Product, CustomCourier } from "../shared/core";
export function LegShippingCalcSubTab({ secret, gb }: { secret: string; gb: GroupBuy }) {
  const [allOrders, setAllOrders] = useState<GbOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReshipper, setSelectedReshipper] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState("Submitted");

  // ── Split mode state ──────────────────────────────────────────
  const [mode, setMode] = useState<"split" | "direct">("split");
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [totalCost, setTotalCost] = useState("");
  const [equalPct, setEqualPct] = useState(50);
  const weightPct = 100 - equalPct;
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<{ message: string; breakdown: { orderId: string; username: string; vendorShipping: number }[] } | null>(null);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<{ updated: number; message: string } | null>(null);

  // ── Direct mode state ─────────────────────────────────────────
  const [directAmounts, setDirectAmounts] = useState<Record<string, string>>({});
  const [directApplying, setDirectApplying] = useState(false);
  const [directResult, setDirectResult] = useState<{ message: string; breakdown: { orderId: string; username: string; vendorShipping: number }[] } | null>(null);

  // GB-assigned reshippers
  const [gbReshippers, setGbReshippers] = useState<Array<{ reshipperUsername: string }>>([]);

  useEffect(() => {
    fetch(apiUrl(`/admin/group-buys/${gb.id}/orders`), { headers: { "x-admin-secret": secret } })
      .then(r => r.ok ? r.json() : [])
      .then((ordersData: GbOrder[]) => {
        setAllOrders(ordersData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [gb.id, secret]);

  useEffect(() => {
    fetch(apiUrl(`/admin/group-buys/${gb.id}/reshippers`), { headers: { "x-admin-secret": secret } })
      .then(r => r.ok ? r.json() : [])
      .then((data: Array<{ reshipperUsername: string }>) => setGbReshippers(data))
      .catch(() => {});
  }, [gb.id, secret]);

  // Reset exclusions when reshipper filter, status, or loaded orders change;
  // pre-exclude direct-to-home orders so they appear in the list but don't contribute to the split
  useEffect(() => {
    const dthIds = new Set(
      allOrders
        .filter(o =>
          o.directShippingRequested &&
          o.status === statusFilter &&
          (selectedReshipper === "all" || o.reshipperUsername === selectedReshipper)
        )
        .map(o => o.id)
    );
    setExcludedIds(dthIds);
    setApplyResult(null);
    setDirectResult(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedReshipper, statusFilter, allOrders]);

  // Reshippers assigned to this GB
  const availableReshippers = gbReshippers.map(r => r.reshipperUsername).filter(Boolean).sort() as string[];

  const legOrders = allOrders.filter(o =>
    o.status === statusFilter &&
    (selectedReshipper === "all" ? true : o.reshipperUsername === selectedReshipper)
  );

  // Pre-fill direct amounts whenever the order set changes
  useEffect(() => {
    setDirectAmounts(prev => {
      const next: Record<string, string> = {};
      for (const o of legOrders) {
        next[o.id] = prev[o.id] !== undefined ? prev[o.id] : (o.vendorShipping > 0 ? String(o.vendorShipping) : "");
      }
      return next;
    });
    setDirectResult(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legOrders.map(o => o.id).join(","), statusFilter, selectedReshipper]);

  // ── Split mode helpers ────────────────────────────────────────
  const kitCount = (o: GbOrder) => Math.max(1, o.lineItems.reduce((s, li) => s + li.quantity, 0));
  const includedOrders = legOrders.filter(o => !excludedIds.has(o.id));
  const totalKits = includedOrders.reduce((s, o) => s + kitCount(o), 0);
  const totalCostNum = parseFloat(totalCost) || 0;

  const calcShipping = (o: GbOrder): number => {
    if (excludedIds.has(o.id)) return 0;
    const N = includedOrders.length;
    if (N === 0 || totalCostNum === 0) return 0;
    const equalShare = totalCostNum * (equalPct / 100) / N;
    const myKits = kitCount(o);
    const weightedShare = totalKits > 0 ? totalCostNum * (weightPct / 100) * (myKits / totalKits) : 0;
    return Math.round((equalShare + weightedShare) * 100) / 100;
  };

  const totalCalc = includedOrders.reduce((s, o) => s + calcShipping(o), 0);
  const roundingDiff = Math.abs(totalCalc - totalCostNum);

  const applySplit = async () => {
    if (!confirm(`Write split shipping amounts to ${legOrders.length} orders? This overwrites their current vendor shipping values.`)) return;
    setApplying(true);
    setApplyResult(null);
    try {
      const breakdown: { orderId: string; username: string; vendorShipping: number }[] = [];
      for (const order of legOrders) {
        const shipping = calcShipping(order);
        await fetch(apiUrl(`/admin/orders/${order.id}`), {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-admin-secret": secret },
          body: JSON.stringify({ vendorShipping: shipping }),
        });
        breakdown.push({ orderId: order.id, username: order.telegramUsername, vendorShipping: shipping });
      }
      setApplyResult({ message: `Applied to ${legOrders.length} orders`, breakdown });
    } finally { setApplying(false); }
  };

  // ── Direct mode helpers ───────────────────────────────────────
  const directTotal = legOrders.reduce((s, o) => s + (parseFloat(directAmounts[o.id] || "0") || 0), 0);
  const directOrdersWithAmount = legOrders.filter(o => (parseFloat(directAmounts[o.id] || "0") || 0) > 0).length;

  const applyDirect = async () => {
    const toApply = legOrders.filter(o => directAmounts[o.id] !== undefined);
    if (toApply.length === 0) return;
    if (!confirm(`Write manual shipping amounts to ${toApply.length} orders? Orders left blank will be set to $0.00.`)) return;
    setDirectApplying(true);
    setDirectResult(null);
    try {
      const breakdown: { orderId: string; username: string; vendorShipping: number }[] = [];
      for (const order of toApply) {
        const shipping = Math.round((parseFloat(directAmounts[order.id] || "0") || 0) * 100) / 100;
        await fetch(apiUrl(`/admin/orders/${order.id}`), {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-admin-secret": secret },
          body: JSON.stringify({ vendorShipping: shipping }),
        });
        breakdown.push({ orderId: order.id, username: order.telegramUsername, vendorShipping: shipping });
      }
      setDirectResult({ message: `Applied to ${toApply.length} orders`, breakdown });
    } finally { setDirectApplying(false); }
  };

  const runBackfill = async () => {
    const reshipperLabel = selectedReshipper === "all"
      ? "all orders in this GB"
      : `orders reshipped by @${selectedReshipper}`;
    if (!confirm(`This will mark a balance owed (equal to their vendor shipping) on all paid orders in ${reshipperLabel} where vendor shipping was added after payment. Continue?`)) return;
    setBackfilling(true);
    setBackfillResult(null);
    try {
      const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}/backfill-balance-due`), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ reshipperUsername: selectedReshipper === "all" ? undefined : selectedReshipper }),
      });
      const data = await res.json();
      setBackfillResult({ updated: data.updated ?? 0, message: data.message ?? "Done" });
      // Reload orders so balance owed pills appear
      fetch(apiUrl(`/admin/group-buys/${gb.id}/orders`), { headers: { "x-admin-secret": secret } })
        .then(r => r.ok ? r.json() : [])
        .then((d: GbOrder[]) => setAllOrders(d))
        .catch(() => {});
    } finally { setBackfilling(false); }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="mt-4 space-y-4">
      {/* Mode toggle */}
      <div className="flex rounded-xl border border-input overflow-hidden">
        <button
          type="button"
          onClick={() => { setMode("split"); setApplyResult(null); setDirectResult(null); }}
          className={cn(
            "flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition-colors",
            mode === "split" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted/50"
          )}
        >
          <Calculator className="w-4 h-4" />
          Vendor Shipping Split
        </button>
        <button
          type="button"
          onClick={() => { setMode("direct"); setApplyResult(null); setDirectResult(null); }}
          className={cn(
            "flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition-colors border-l border-input",
            mode === "direct" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted/50"
          )}
        >
          <PenLine className="w-4 h-4" />
          Direct Shipping
        </button>
      </div>

      {/* Reshipper + status selectors */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-semibold">Reshipper</Label>
          <select value={selectedReshipper}
            onChange={e => setSelectedReshipper(e.target.value)}
            className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
            <option value="all">All reshippers</option>
            {availableReshippers.map(r => <option key={r} value={r}>@{r}</option>)}
          </select>
          <p className="mt-1.5 text-[11px] text-muted-foreground">Direct-to-home orders excluded automatically</p>
        </div>
        <div>
          <Label className="text-xs font-semibold">Order Status</Label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
            {["Submitted", "confirmed", "test_confirmed", "pending_payment", "Processing", "Shipped"].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── SPLIT MODE ───────────────────────────────────────────── */}
      {mode === "split" && (
        <>
          <Card className="p-5 space-y-5">
            <h3 className="font-semibold text-base">Configure Shipping Split</h3>

            <div>
              <Label className="font-semibold text-sm">Total Vendor Shipping Cost ($)</Label>
              <Input
                type="number" min="0" step="0.01" placeholder="e.g. 150.00"
                value={totalCost} onChange={e => setTotalCost(e.target.value)}
                className="mt-2 rounded-xl h-12 text-base"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-sm">Equal portion</p>
                  <p className="text-xs text-muted-foreground">Same amount per order</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <input type="number" min="0" max="100" value={equalPct}
                    onChange={e => setEqualPct(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="w-16 h-9 rounded-full border border-input bg-background px-2 text-sm text-center font-semibold focus:outline-none focus:ring-1 focus:ring-ring" />
                  <span className="text-sm font-semibold text-muted-foreground">%</span>
                </div>
              </div>
              <input type="range" min="0" max="100" value={equalPct}
                onChange={e => setEqualPct(parseInt(e.target.value))}
                className="w-full h-2 rounded-full cursor-pointer accent-blue-600" />
            </div>

            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-sm">Quantity-weighted</p>
                  <p className="text-xs text-muted-foreground">More items = more shipping</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <input type="number" readOnly value={weightPct}
                    className="w-16 h-9 rounded-full border border-input bg-muted/40 px-2 text-sm text-center font-semibold focus:outline-none" />
                  <span className="text-sm font-semibold text-muted-foreground">%</span>
                </div>
              </div>
              <input type="range" min="0" max="100" value={weightPct}
                onChange={e => setEqualPct(100 - parseInt(e.target.value))}
                className="w-full h-2 rounded-full cursor-pointer accent-blue-900" />
            </div>

            <div className={cn("rounded-xl px-4 py-2 text-sm font-semibold",
              equalPct + weightPct === 100 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600")}>
              {equalPct}% + {weightPct}% = {equalPct + weightPct}% {equalPct + weightPct === 100 ? "✓" : "⚠ must equal 100"}
            </div>
          </Card>

          {legOrders.length > 0 ? (
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold">Orders <span className="text-muted-foreground font-normal">({legOrders.length})</span></p>
                <p className="text-[11px] text-muted-foreground">Uncheck to exclude from split</p>
              </div>

              <div className="grid grid-cols-[20px_1fr_auto_auto] gap-x-3 gap-y-0 text-[10px] font-bold text-muted-foreground uppercase tracking-wide px-1 pb-1 border-b border-border">
                <span></span>
                <span>Member</span>
                <span className="text-right">Kits</span>
                <span className="text-right">Shipping</span>
              </div>

              <div className="space-y-0.5 max-h-72 overflow-y-auto">
                {legOrders.map(order => {
                  const excluded = excludedIds.has(order.id);
                  const kits = kitCount(order);
                  const shipping = calcShipping(order);
                  return (
                    <div key={order.id}
                      className={cn("grid grid-cols-[20px_1fr_auto_auto] gap-x-3 items-start px-1 py-1.5 rounded-lg transition-colors",
                        excluded ? "opacity-40" : "hover:bg-muted/30")}>
                      <input type="checkbox" checked={!excluded}
                        onChange={e => setExcludedIds(prev => {
                          const n = new Set(prev);
                          e.target.checked ? n.delete(order.id) : n.add(order.id);
                          return n;
                        })}
                        className="rounded mt-0.5" />
                      <div className="min-w-0">
                        <span className="text-sm truncate block">@{order.telegramUsername}</span>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {order.directShippingRequested && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 leading-tight">DTH</span>
                          )}
                          {order.paymentStatus === "confirmed" && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 leading-tight">Paid</span>
                          )}
                          {(order.adminFee ?? 0) > 0 && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 leading-tight">
                              {order.adminFeeLabel ?? "Admin Fee"}
                            </span>
                          )}
                          {order.notes && (
                            <span className="text-[9px] text-amber-700 bg-amber-50 rounded-full px-1.5 py-0.5 border border-amber-200 leading-tight">{order.notes}</span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground text-right pt-0.5">{kits}</span>
                      <span className={cn("text-sm font-semibold text-right tabular-nums w-16 pt-0.5",
                        excluded ? "text-muted-foreground" : "")}>
                        {excluded ? "—" : shipping.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-border pt-3 space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Included orders</span>
                  <span className="font-semibold text-foreground">{includedOrders.length} / {legOrders.length}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Total kits (included)</span>
                  <span className="font-semibold text-foreground">{totalKits}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold pt-1">
                  <span>Calculated total</span>
                  <span className={roundingDiff > 0.03 ? "text-orange-500" : "text-green-600"}>{totalCalc.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Target total</span>
                  <span className="font-semibold">{totalCostNum.toFixed(2)}</span>
                </div>
                {roundingDiff > 0.03 && (
                  <p className="text-[11px] text-orange-500">Rounding difference: {(totalCalc - totalCostNum).toFixed(2)} (normal with many orders)</p>
                )}
              </div>

              <button
                type="button"
                onClick={() => void applySplit()}
                disabled={applying || totalCostNum === 0}
                className="w-full h-12 rounded-2xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
                style={{ background: "rgba(115,108,210,0.9)" }}
              >
                {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
                {applying ? "Applying…" : "Apply Shipping Split"}
              </button>
            </Card>
          ) : (
            <Card className="p-6 text-center space-y-2">
              <Calculator className="w-7 h-7 text-muted-foreground mx-auto" />
              <p className="text-sm font-semibold">No orders found</p>
              <p className="text-xs text-muted-foreground">Select a reshipper and order status to see orders for calculation.</p>
            </Card>
          )}

          {applyResult && (
            <Card className="p-4 space-y-2 border-green-200 bg-green-50">
              <p className="text-sm font-semibold text-green-700 flex items-center gap-1.5">
                <Check className="w-4 h-4" />{applyResult.message}
              </p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {applyResult.breakdown.map(b => (
                  <div key={b.orderId} className="flex justify-between text-xs text-green-800">
                    <span>@{b.username}</span>
                    <span className="font-semibold">{b.vendorShipping.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {/* ── DIRECT MODE ──────────────────────────────────────────── */}
      {mode === "direct" && (
        <>
          {legOrders.length > 0 ? (
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold">
                  Orders <span className="text-muted-foreground font-normal">({legOrders.length})</span>
                </p>
                <p className="text-[11px] text-muted-foreground">Enter each order's shipping manually</p>
              </div>

              <div className="grid grid-cols-[1fr_120px] gap-x-3 gap-y-0 text-[10px] font-bold text-muted-foreground uppercase tracking-wide px-1 pb-1 border-b border-border">
                <span>Member</span>
                <span className="text-right">Shipping ($)</span>
              </div>

              <div className="space-y-1 max-h-96 overflow-y-auto pr-0.5">
                {legOrders.map(order => {
                  const val = directAmounts[order.id] ?? "";
                  const kits = kitCount(order);
                  return (
                    <div key={order.id} className="grid grid-cols-[1fr_120px] gap-x-3 items-start px-1 py-1.5 rounded-lg hover:bg-muted/30">
                      <div className="min-w-0">
                        <span className="text-sm truncate block">@{order.telegramUsername}</span>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {order.directShippingRequested && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 leading-tight">DTH</span>
                          )}
                          {order.paymentStatus === "confirmed" && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 leading-tight">Paid</span>
                          )}
                          {(order.adminFee ?? 0) > 0 && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 leading-tight">
                              {order.adminFeeLabel ?? "Admin Fee"}
                            </span>
                          )}
                          <span className="text-[9px] text-muted-foreground leading-tight">{kits} kit{kits !== 1 ? "s" : ""}</span>
                          {order.notes && (
                            <span className="text-[9px] text-amber-700 bg-amber-50 rounded-full px-1.5 py-0.5 border border-amber-200 leading-tight">{order.notes}</span>
                          )}
                        </div>
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={val}
                        onChange={e => setDirectAmounts(prev => ({ ...prev, [order.id]: e.target.value }))}
                        className="w-full h-9 rounded-lg border border-input bg-background px-2 text-sm text-right font-semibold tabular-nums focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-border pt-3 space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Orders with amount set</span>
                  <span className="font-semibold text-foreground">{directOrdersWithAmount} / {legOrders.length}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold pt-0.5">
                  <span>Total shipping</span>
                  <span className="text-blue-700">${directTotal.toFixed(2)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void applyDirect()}
                disabled={directApplying || legOrders.length === 0}
                className="w-full h-12 rounded-2xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
                style={{ background: "rgba(115,108,210,0.9)" }}
              >
                {directApplying ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenLine className="w-4 h-4" />}
                {directApplying ? "Applying…" : `Apply to ${legOrders.length} Orders`}
              </button>
            </Card>
          ) : (
            <Card className="p-6 text-center space-y-2">
              <PenLine className="w-7 h-7 text-muted-foreground mx-auto" />
              <p className="text-sm font-semibold">No orders found</p>
              <p className="text-xs text-muted-foreground">Select a reshipper and order status to see orders.</p>
            </Card>
          )}

          {directResult && (
            <Card className="p-4 space-y-2 border-green-200 bg-green-50">
              <p className="text-sm font-semibold text-green-700 flex items-center gap-1.5">
                <Check className="w-4 h-4" />{directResult.message}
              </p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {directResult.breakdown.map(b => (
                  <div key={b.orderId} className="flex justify-between text-xs text-green-800">
                    <span>@{b.username}</span>
                    <span className="font-semibold">${b.vendorShipping.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {/* ── Fix existing orders that were paid before vendor shipping was set ── */}
      <Card className="p-4 space-y-3 border-orange-200 bg-orange-50">
        <div>
          <p className="text-sm font-semibold text-orange-800">Fix previously paid orders</p>
          <p className="text-xs text-orange-700 mt-0.5">
            If vendor shipping was applied <em>after</em> customers already paid, their orders show as "Paid" but they still owe the shipping amount. This marks the balance owed on affected orders
            {selectedReshipper === "all" ? " across all reshippers" : ` reshipped by @${selectedReshipper}`}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void runBackfill()}
          disabled={backfilling}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 transition-colors"
        >
          {backfilling ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
          {backfilling ? "Running…" : selectedReshipper === "all" ? "Mark balance owed — all reshippers" : `Mark balance owed — @${selectedReshipper}`}
        </button>
        {backfillResult && (
          <p className={cn("text-xs font-medium", backfillResult.updated > 0 ? "text-orange-800" : "text-green-700")}>
            {backfillResult.updated > 0 ? `✓ ${backfillResult.message}` : `✓ ${backfillResult.message}`}
          </p>
        )}
      </Card>
    </div>
  );
}

// ─── GB Detail View ───────────────────────────────────────────
