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
export function PnlSubTab({ secret, gb }: { secret: string; gb: GroupBuy }) {
  const [data, setData] = useState<{
    orders: { total: number; confirmed: number };
    revenue: { total: number; products: number; delivery: number };
    costs: { materials: number; lab: number; shipping: number; misc: number; platformFee: number; total: number; notes: string | null };
    profit: { gross: number; marginPct: number };
    productBreakdown: { name: string; totalQty: number; totalRevenue: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [costs, setCosts] = useState({ materials: "", lab: "", shipping: "", misc: "", platformFee: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const sym = (n: number) => `${(gb.currency ?? "GBP") === "USD" ? "$" : "£"}${n.toFixed(2)}`;

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}/pnl`), { headers: { "x-admin-secret": secret } });
    if (res.ok) {
      const d = await res.json();
      setData(d);
      setCosts({
        materials: d.costs.materials ? String(d.costs.materials) : "",
        lab: d.costs.lab ? String(d.costs.lab) : "",
        shipping: d.costs.shipping ? String(d.costs.shipping) : "",
        misc: d.costs.misc ? String(d.costs.misc) : "",
        platformFee: d.costs.platformFee ? String(d.costs.platformFee) : "",
        notes: d.costs.notes ?? "",
      });
    }
    setLoading(false);
  }, [secret, gb.id]);

  useEffect(() => { load(); }, [load]);

  const saveCosts = async () => {
    setSaving(true); setSaveMsg("");
    const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}/pnl-costs`), {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-admin-secret": secret },
      body: JSON.stringify({
        materials: costs.materials ? parseFloat(costs.materials) : null,
        lab: costs.lab ? parseFloat(costs.lab) : null,
        shipping: costs.shipping ? parseFloat(costs.shipping) : null,
        misc: costs.misc ? parseFloat(costs.misc) : null,
        platformFee: costs.platformFee ? parseFloat(costs.platformFee) : null,
        notes: costs.notes || null,
      }),
    });
    if (res.ok) { setSaveMsg("Costs saved ✓"); load(); setTimeout(() => setSaveMsg(""), 3000); }
    else { setSaveMsg("Save failed"); }
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!data) return <p className="text-sm text-muted-foreground text-center py-8">Failed to load P&L data</p>;

  const isProfit = data.profit.gross >= 0;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="bg-muted/40 rounded-xl p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Revenue</p>
          <p className="text-lg font-bold mt-1">{sym(data.revenue.total)}</p>
          <p className="text-[10px] text-muted-foreground">{data.orders.confirmed}/{data.orders.total} paid</p>
        </div>
        <div className="bg-muted/40 rounded-xl p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Costs</p>
          <p className="text-lg font-bold mt-1">{sym(data.costs.total)}</p>
          <p className="text-[10px] text-muted-foreground">Inputted costs</p>
        </div>
        <div className={`rounded-xl p-3 ${isProfit ? "bg-green-50" : "bg-red-50"}`}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Gross Profit</p>
          <p className={`text-lg font-bold mt-1 ${isProfit ? "text-green-700" : "text-red-600"}`}>{sym(data.profit.gross)}</p>
          <p className="text-[10px] text-muted-foreground">{data.profit.marginPct}% margin</p>
        </div>
        <div className="bg-muted/40 rounded-xl p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Revenue Breakdown</p>
          <p className="text-xs mt-1 text-muted-foreground">Products: <span className="font-semibold text-foreground">{sym(data.revenue.products)}</span></p>
          <p className="text-xs text-muted-foreground">Delivery: <span className="font-semibold text-foreground">{sym(data.revenue.delivery)}</span></p>
        </div>
      </div>

      {/* Cost inputs */}
      <div className="border border-border rounded-xl p-4 space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Record Costs</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {([
            { key: "materials", label: "Materials / Product Cost" },
            { key: "lab", label: "Lab / Testing" },
            { key: "shipping", label: "Vendor Shipping" },
            { key: "misc", label: "Misc / Other" },
            { key: "platformFee", label: "Platform Fee" },
          ] as const).map(({ key, label }) => (
            <div key={key} className="space-y-1">
              <Label className="text-xs">{label}</Label>
              <Input type="number" min="0" step="0.01" className="h-9 text-sm"
                placeholder="0.00"
                value={costs[key]}
                onChange={e => setCosts(p => ({ ...p, [key]: e.target.value }))} />
            </div>
          ))}
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Notes (optional)</Label>
          <textarea className="w-full rounded-lg border border-input bg-background p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[52px] resize-none"
            placeholder="Any cost notes…"
            value={costs.notes}
            onChange={e => setCosts(p => ({ ...p, notes: e.target.value }))} />
        </div>
        <div className="flex items-center gap-3">
          <Button size="sm" onClick={saveCosts} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? "Saving…" : "Save Costs"}
          </Button>
          {saveMsg && <span className="text-xs font-semibold text-green-600">{saveMsg}</span>}
        </div>
      </div>

      {/* Product breakdown */}
      {data.productBreakdown.length > 0 && (
        <div className="border border-border rounded-xl overflow-hidden">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-4 py-2.5 bg-muted/40">Product Breakdown (confirmed orders)</p>
          <div className="divide-y divide-border">
            {data.productBreakdown.map(p => (
              <div key={p.name} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="flex-1 min-w-0 truncate">{p.name}</span>
                <span className="text-muted-foreground text-xs shrink-0 mx-3">×{p.totalQty}</span>
                <span className="font-semibold shrink-0">{sym(p.totalRevenue)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Admin Reshippers Sub-tab ─────────────────────────────────
