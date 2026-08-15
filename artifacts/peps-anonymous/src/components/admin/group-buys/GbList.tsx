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
import { resolveCountry, apiUrl, INFO_CARD_TYPE_OPTIONS, InfoCardsEditor, ShippingOptionsEditor, CRYPTO_CURRENCIES, TROCADOR_COINS, CRYPTO_NETWORKS, DEFAULT_CRYPTO_NETWORKS, GbPaymentGatewayInlineContent, EU_COUNTRIES, POPULAR_COUNTRIES, GBP_TO_USD, GB_STATUS_STYLES, CopyIdBadge, StatusBadge } from "./shared/core";
import type { GroupBuy, InfoCard, ShippingOption, EntryFeePayment, GbPaymentConfig, GBProduct, DeliveryMethod, GBDeliveryMethod, Member, Product, CustomCourier } from "./shared/core";
export type GbOrderSummary = {
  id: string;
  code: string;
  telegramUsername: string;
  paymentStatus: string;
  grandTotal: number;
  status: string;
  currency: string | null;
};

export const GB_ORDER_PAYMENT_COLORS: Record<string, string> = {
  confirmed: "text-green-600 bg-green-50 border-green-200",
  pending_confirmation: "text-amber-600 bg-amber-50 border-amber-200",
  unpaid: "text-slate-500 bg-slate-50 border-slate-200",
  failed: "text-red-600 bg-red-50 border-red-200",
  rejected: "text-red-600 bg-red-50 border-red-200",
  test_ready: "text-blue-600 bg-blue-50 border-blue-200",
  test_confirmed: "text-blue-600 bg-blue-50 border-blue-200",
};

export function GBList({ secret, onSelect, onNew }: {
  secret: string;
  onSelect: (gb: GroupBuy) => void;
  onNew: () => void;
}) {
  const [gbs, setGbs] = useState<GroupBuy[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "draft" | "closed" | "archived" | "all">("all");
  const [actioning, setActioning] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState<GroupBuy | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [openOrders, setOpenOrders] = useState<Set<string>>(new Set());
  const [ordersCache, setOrdersCache] = useState<Record<string, GbOrderSummary[]>>({});
  const [ordersLoading, setOrdersLoading] = useState<Record<string, boolean>>({});

  const loadGbs = useCallback(() => {
    setLoading(true);
    fetch(apiUrl("/admin/group-buys"), { headers: { "x-admin-secret": secret } })
      .then(r => r.json())
      .then(data => setGbs(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [secret]);

  useEffect(() => { loadGbs(); }, [loadGbs]);

  const sorted = [...gbs].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const filtered = sorted.filter(gb => {
    const matchSearch = !search || gb.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || gb.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // When showing "all", group by status in a defined order
  const STATUS_SECTIONS = ["active", "draft", "closed", "archived"] as const;
  const sections = statusFilter === "all"
    ? STATUS_SECTIONS.map(s => ({ status: s, items: filtered.filter(gb => gb.status === s) })).filter(s => s.items.length > 0)
    : null;

  const toggleOrders = async (gbId: string) => {
    const next = new Set(openOrders);
    if (next.has(gbId)) {
      next.delete(gbId);
      setOpenOrders(next);
      return;
    }
    next.add(gbId);
    setOpenOrders(next);
    if (!ordersCache[gbId]) {
      setOrdersLoading(prev => ({ ...prev, [gbId]: true }));
      try {
        const res = await fetch(apiUrl(`/admin/group-buys/${gbId}/orders-summary`), { headers: { "x-admin-secret": secret } });
        const data: GbOrderSummary[] = await res.json();
        setOrdersCache(prev => ({ ...prev, [gbId]: data }));
      } catch {
        setOrdersCache(prev => ({ ...prev, [gbId]: [] }));
      } finally {
        setOrdersLoading(prev => { const n = { ...prev }; delete n[gbId]; return n; });
      }
    }
  };

  const patchGb = async (id: string, body: Record<string, unknown>, actionKey: string) => {
    setActioning(prev => ({ ...prev, [id]: actionKey }));
    try {
      const res = await fetch(apiUrl(`/admin/group-buys/${id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setActionError((d as any).error ?? "Action failed");
        return;
      }
      const updated = await res.json();
      setGbs(prev => prev.map(g => g.id === id ? { ...g, ...updated } : g));
    } finally {
      setActioning(prev => { const n = { ...prev }; delete n[id]; return n; });
    }
  };

  const deleteGb = async (gb: GroupBuy) => {
    setActioning(prev => ({ ...prev, [gb.id]: "delete" }));
    setConfirmDelete(null);
    try {
      const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}`), {
        method: "DELETE",
        headers: { "x-admin-secret": secret },
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError((d as any).error ?? "Delete failed");
        return;
      }
      setGbs(prev => prev.filter(g => g.id !== gb.id));
    } finally {
      setActioning(prev => { const n = { ...prev }; delete n[gb.id]; return n; });
    }
  };

  return (
    <div className="space-y-4">
      {actionError && (
        <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-900/10 px-4 py-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400 flex-1">{actionError}</p>
          <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {confirmDelete && (
        <div className="rounded-xl border border-red-300 bg-red-50 dark:bg-red-900/10 p-4 space-y-3">
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">
            Permanently delete "{confirmDelete.name}"?
          </p>
          <p className="text-xs text-red-600 dark:text-red-400">
            This cannot be undone. Group buys with orders cannot be deleted — archive them instead.
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="destructive" className="gap-1.5"
              onClick={() => deleteGb(confirmDelete)}
              disabled={!!actioning[confirmDelete.id]}>
              {actioning[confirmDelete.id] === "delete" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Delete
            </Button>
            <Button size="sm" variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search group buys…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button onClick={onNew} className="gap-1.5 shrink-0">
          <Plus className="w-4 h-4" />New
        </Button>
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {([
          { value: "all", label: "All", color: "#475569" },
          { value: "active", label: "Active", color: "#16A34A" },
          { value: "draft", label: "Draft", color: "#64748B" },
          { value: "closed", label: "Closed", color: "#DC2626" },
          { value: "archived", label: "Archived", color: "#92400E" },
        ] as const).map(t => {
          const count = t.value === "all" ? gbs.length : gbs.filter(g => g.status === t.value).length;
          const active = statusFilter === t.value;
          if (t.value !== "all" && count === 0) return null;
          return (
            <button key={t.value} onClick={() => setStatusFilter(t.value)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border"
              style={{
                background: active ? t.color : "transparent",
                color: active ? "#fff" : t.color,
                borderColor: active ? "transparent" : t.color + "55",
              }}>
              {t.label}
              <span className="text-[10px] font-bold px-1 py-0.5 rounded-full" style={{ background: active ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.07)" }}>{count}</span>
            </button>
          );
        })}
      </div>
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">
          {search || statusFilter !== "all" ? "No group buys match your filters." : "No group buys yet. Click New to create one."}
        </p>
      ) : (
        <div className="space-y-2">
          {(sections
            ? sections.flatMap(({ status, items }) => [
                <div key={`section-${status}`} className="flex items-center gap-2 pt-2 first:pt-0">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground capitalize">{status}</span>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">{items.length}</span>
                </div>,
                ...items.map(gb => renderGbRow(gb)),
              ])
            : filtered.map(gb => renderGbRow(gb))
          )}
        </div>
      )}
    </div>
  );

  function renderGbRow(gb: GroupBuy) {
            const busy = actioning[gb.id];
            const orderCount = (gb as any).orderCount as number ?? 0;
            const isOpen = openOrders.has(gb.id);
            const orders = ordersCache[gb.id] ?? [];
            const loadingOrders = ordersLoading[gb.id];
            return (
              <div key={gb.id} className={cn(
                "rounded-xl border border-border bg-white dark:bg-card transition-colors",
                gb.hiddenFromList && "opacity-60",
              )}>
                <div className="flex items-center gap-2 pr-2">
                  <button onClick={() => onSelect(gb)}
                    className="flex-1 text-left p-4 flex items-center gap-3 min-w-0 hover:bg-muted/30 rounded-l-xl transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-semibold text-sm truncate">{gb.name}</span>
                        {statusFilter !== "all" && <StatusBadge status={gb.status} />}
                        {gb.hiddenFromList && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 px-1.5 py-0.5 rounded-full font-medium">hidden</span>
                        )}
                        {gb.organiserId && (
                          <span className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-1.5 py-0.5 rounded-full font-medium border border-blue-200 dark:border-blue-700/40 flex items-center gap-1">
                            <UserCheck className="w-3 h-3" />
                            {gb.organiserId as string}
                          </span>
                        )}
                      </div>
                      {gb.closeDate && (
                        <p className="text-xs text-muted-foreground">
                          Closes {new Date(gb.closeDate as string).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                      )}
                      <CopyIdBadge id={gb.id} />
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </button>

                  <button
                    onClick={() => toggleOrders(gb.id)}
                    title="View orders"
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border shrink-0",
                      isOpen
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "text-muted-foreground border-border hover:bg-muted",
                    )}>
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>{orderCount}</span>
                    {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      title={gb.organiserOrderEditEnabled ? "Organiser order editing: ON — click to disable" : "Organiser order editing: OFF — click to enable"}
                      disabled={!!busy}
                      onClick={() => patchGb(gb.id, { organiserOrderEditEnabled: !gb.organiserOrderEditEnabled }, "orgEdit")}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        gb.organiserOrderEditEnabled
                          ? "text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                          : "text-muted-foreground hover:bg-muted",
                      )}>
                      {busy === "orgEdit"
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Pencil className="w-4 h-4" />}
                    </button>

                    <button
                      title={gb.hiddenFromList ? "Show in list" : "Hide from list"}
                      disabled={!!busy}
                      onClick={() => patchGb(gb.id, { hiddenFromList: !gb.hiddenFromList }, "hide")}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        gb.hiddenFromList
                          ? "text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                          : "text-muted-foreground hover:bg-muted",
                      )}>
                      {busy === "hide"
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : gb.hiddenFromList ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>

                    {gb.status !== "archived" && (
                      <button
                        title="Archive"
                        disabled={!!busy}
                        onClick={() => patchGb(gb.id, { status: "archived" }, "archive")}
                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
                        {busy === "archive"
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Box className="w-4 h-4" />}
                      </button>
                    )}

                    <button
                      title="Delete"
                      disabled={!!busy}
                      onClick={() => setConfirmDelete(confirmDelete?.id === gb.id ? null : gb)}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        confirmDelete?.id === gb.id
                          ? "text-red-600 bg-red-50 dark:bg-red-900/20"
                          : "text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20",
                      )}>
                      {busy === "delete"
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      key="orders"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden border-t border-border">
                      {loadingOrders ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        </div>
                      ) : orders.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">No orders yet.</p>
                      ) : (
                        <div className="divide-y divide-border">
                          <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-3 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            <span>#</span>
                            <span>User</span>
                            <span>Total</span>
                            <span>Payment</span>
                          </div>
                          {orders.map(o => {
                            const sym = currSym(o.currency ?? "GBP");
                            return (
                              <div key={o.id} className="grid grid-cols-[auto_1fr_auto_auto] gap-x-3 px-4 py-2 items-center text-xs">
                                <span className="font-mono text-muted-foreground">{o.code}</span>
                                <span className="font-medium truncate">{o.telegramUsername}</span>
                                <span className="text-right tabular-nums text-muted-foreground">{sym}{Number(o.grandTotal).toFixed(2)}</span>
                                <span className={cn("px-1.5 py-0.5 rounded-full border text-[10px] font-medium whitespace-nowrap", GB_ORDER_PAYMENT_COLORS[o.paymentStatus] ?? "text-muted-foreground border-border")}>
                                  {o.paymentStatus.replace(/_/g, " ")}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
  }
}

// ─── Ruleset Editor Panel ─────────────────────────────────────
