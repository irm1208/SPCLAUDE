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
import { PAYMENT_METHODS } from "./ReshippersPanel";
import type { GbOrder } from "./OrdersPanel";
import type { GroupBuy, InfoCard, ShippingOption, EntryFeePayment, GbPaymentConfig, GBProduct, DeliveryMethod, GBDeliveryMethod, Member, Product, CustomCourier } from "../shared/core";
export interface AdminCLeg {
  id: string;
  countryCode: string;
  countryName: string;
  inviteEnabled: boolean;
  inviteCode: string | null;
  status: string;
  sortOrder: number;
  message: string | null;
  countryNote: string | null;
  vendorShippingCost: number | null;
  vendorPackageCount: number | null;
  directShippingEnabled?: boolean;
  wholesaleVendorId?: string | null;
  reshipper: {
    reshipperUsername: string;
    paymentTarget: string | null;
    enabledPaymentMethods: Record<string, boolean> | null;
    reshipperFeeEnabled: boolean;
    reshipperFeeType: string;
    reshipperFeeAmount: string | null;
    allowPayments: boolean;
    allowVendorShippingSplit: boolean;
  } | null;
  orderCount: number;
}

export function BillVendorShippingPanel({ secret, gbId }: { secret: string; gbId: string }) {
  const [notify, setNotify] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<{ message: string; updatedCount: number; breakdown: { orderId: string; username: string; vendorShipping: number; newAmountDue: number; notified: boolean }[] } | null>(null);

  const apply = async () => {
    setApplying(true);
    setResult(null);
    try {
      const r = await fetch(apiUrl(`/admin/group-buys/${gbId}/bill-vendor-shipping-balance`), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ notify, overwrite, statusFilter: ["confirmed", "test_confirmed"] }),
      });
      const data = await r.json();
      setResult(data);
    } finally { setApplying(false); }
  };

  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-orange-600" />
        <p className="text-xs font-semibold text-orange-800">Bill Paid Orders for Vendor Shipping</p>
      </div>
      <p className="text-[11px] text-orange-700">
        For orders already paid (confirmed/test_confirmed) that had vendor shipping added after payment —
        this sets an outstanding balance so members see a "You owe £X" notice and can submit the extra amount.
      </p>
      <div className="space-y-1.5">
        <label className="flex items-center gap-2 text-[11px] text-orange-800 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={notify}
            onChange={e => setNotify(e.target.checked)}
            className="rounded"
          />
          Send Telegram notification to each member
        </label>
        <label className="flex items-center gap-2 text-[11px] text-orange-800 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={overwrite}
            onChange={e => setOverwrite(e.target.checked)}
            className="rounded"
          />
          Overwrite existing balance (default: add to it)
        </label>
      </div>
      <button
        type="button"
        onClick={() => void apply()}
        disabled={applying}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-60 transition-colors"
      >
        {applying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <DollarSign className="w-3.5 h-3.5" />}
        Bill Paid Orders
      </button>
      {result && (
        <div className="rounded-lg bg-white border border-orange-200 p-2 space-y-1">
          <p className="text-[11px] font-semibold text-orange-800">{result.message}</p>
          {result.breakdown.length > 0 && (
            <div className="space-y-0.5 max-h-40 overflow-y-auto">
              {result.breakdown.map(b => (
                <div key={b.orderId} className="text-[11px] text-orange-700 flex items-center justify-between gap-2">
                  <span className="font-medium truncate">@{b.username}</span>
                  <span className="shrink-0">
                    +{b.vendorShipping.toFixed(2)} → owes {b.newAmountDue.toFixed(2)}
                    {notify && (
                      <span className={cn("ml-1", b.notified ? "text-green-600" : "text-red-400")}>
                        {b.notified ? "✓" : "✗"}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function CountryLegDetailPanel({
  leg: initialLeg,
  gbId,
  secret,
  currency,
  approvedReshippers,
  onBack,
  onDeleted,
  onRefresh,
}: {
  leg: AdminCLeg;
  gbId: string;
  secret: string;
  currency: string;
  approvedReshippers: { telegramUsername: string }[];
  onBack: () => void;
  onDeleted: () => void;
  onRefresh: () => void;
}) {
  const [leg, setLeg] = useState(initialLeg);
  const [saving, setSaving] = useState(false);
  const [assigningReshipper, setAssigningReshipper] = useState(false);
  const [messageEdit, setMessageEdit] = useState(initialLeg.message ?? "");
  const [countryNoteEdit, setCountryNoteEdit] = useState(initialLeg.countryNote ?? "");
  const [sortOrderEdit, setSortOrderEdit] = useState(String(initialLeg.sortOrder ?? 0));
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [savedGeneral, setSavedGeneral] = useState(false);
  const [shippingCost, setShippingCost] = useState(initialLeg.vendorShippingCost != null ? String(initialLeg.vendorShippingCost) : "");
  const [packageCount, setPackageCount] = useState(initialLeg.vendorPackageCount != null ? String(initialLeg.vendorPackageCount) : "");
  const [savingVendor, setSavingVendor] = useState(false);
  const [savedVendor, setSavedVendor] = useState(false);
  const [wholesaleVendors, setWholesaleVendors] = useState<{ id: string; name: string }[]>([]);
  const [allowReshipperCode, setAllowReshipperCode] = useState(false);
  const [togglingReshipperCode, setTogglingReshipperCode] = useState(false);

  useEffect(() => {
    setLeg(initialLeg);
  }, [initialLeg]);

  useEffect(() => {
    fetch(apiUrl("/admin/wholesale-vendors"), { headers: { "x-admin-secret": secret } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.vendors) setWholesaleVendors(d.vendors.map((v: { id: string; name: string }) => ({ id: v.id, name: v.name }))); })
      .catch(() => {});
  }, [secret]);

  useEffect(() => {
    fetch(apiUrl(`/admin/group-buys/${gbId}`), { headers: { "x-admin-secret": secret } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setAllowReshipperCode(d.allowReshipperCode ?? false); })
      .catch(() => {});
  }, [gbId, secret]);

  const toggleAllowReshipperCode = async () => {
    setTogglingReshipperCode(true);
    try {
      const r = await fetch(apiUrl(`/admin/group-buys/${gbId}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ allowReshipperCode: !allowReshipperCode }),
      });
      if (r.ok) setAllowReshipperCode(v => !v);
    } finally { setTogglingReshipperCode(false); }
  };

  useEffect(() => {
    setMessageEdit(initialLeg.message ?? "");
    setCountryNoteEdit(initialLeg.countryNote ?? "");
    setSortOrderEdit(String(initialLeg.sortOrder ?? 0));
    setShippingCost(initialLeg.vendorShippingCost != null ? String(initialLeg.vendorShippingCost) : "");
    setPackageCount(initialLeg.vendorPackageCount != null ? String(initialLeg.vendorPackageCount) : "");
  }, [initialLeg.id]);

  const patchLeg = async (body: object) => {
    setSaving(true);
    try {
      const r = await fetch(apiUrl(`/admin/group-buys/${gbId}/country-legs/${leg.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify(body),
      });
      if (r.ok) {
        const updated = await r.json();
        setLeg((prev) => ({ ...prev, ...updated }));
        onRefresh();
      }
    } finally { setSaving(false); }
  };

  const saveGeneral = async () => {
    setSavingGeneral(true);
    try {
      const r = await fetch(apiUrl(`/admin/group-buys/${gbId}/country-legs/${leg.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ message: messageEdit || null, countryNote: countryNoteEdit || null, sortOrder: parseInt(sortOrderEdit) || 0 }),
      });
      if (r.ok) {
        const updated = await r.json();
        setLeg((prev) => ({ ...prev, ...updated }));
        onRefresh();
        setSavedGeneral(true);
        setTimeout(() => setSavedGeneral(false), 2000);
      }
    } finally { setSavingGeneral(false); }
  };

  const saveVendor = async () => {
    setSavingVendor(true);
    try {
      const r = await fetch(apiUrl(`/admin/group-buys/${gbId}/country-legs/${leg.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({
          vendorShippingCost: shippingCost.trim() ? parseFloat(shippingCost) : null,
          vendorPackageCount: packageCount.trim() ? parseInt(packageCount) : null,
        }),
      });
      if (r.ok) {
        const updated = await r.json();
        setLeg((prev) => ({ ...prev, ...updated }));
        onRefresh();
        setSavedVendor(true);
        setTimeout(() => setSavedVendor(false), 2000);
      }
    } finally { setSavingVendor(false); }
  };

  const regenInvite = async () => {
    setSaving(true);
    try {
      await fetch(apiUrl(`/admin/group-buys/${gbId}/country-legs/${leg.id}/regenerate-invite`), {
        method: "POST", headers: { "x-admin-secret": secret },
      });
      onRefresh();
    } finally { setSaving(false); }
  };

  const deleteLeg = async () => {
    if (!confirm(`Remove ${leg.countryName}?`)) return;
    setSaving(true);
    try {
      await fetch(apiUrl(`/admin/group-buys/${gbId}/country-legs/${leg.id}`), {
        method: "DELETE", headers: { "x-admin-secret": secret },
      });
      onDeleted();
    } finally { setSaving(false); }
  };

  const assignReshipper = async (newUsername: string) => {
    setAssigningReshipper(true);
    try {
      if (leg.reshipper) {
        await fetch(apiUrl(`/admin/group-buys/${gbId}/reshippers/${leg.reshipper.reshipperUsername}`), {
          method: "DELETE", headers: { "x-admin-secret": secret },
        });
      }
      if (newUsername) {
        await fetch(apiUrl(`/admin/group-buys/${gbId}/reshippers`), {
          method: "POST", headers: { "Content-Type": "application/json", "x-admin-secret": secret },
          body: JSON.stringify({ reshipperUsername: newUsername, country: leg.countryCode }),
        });
      }
      onRefresh();
    } finally { setAssigningReshipper(false); }
  };

  const patchReshipper = async (body: Record<string, unknown>) => {
    if (!leg.reshipper) return;
    await fetch(apiUrl(`/admin/group-buys/${gbId}/reshippers/${leg.reshipper.reshipperUsername}`), {
      method: "PATCH", headers: { "Content-Type": "application/json", "x-admin-secret": secret },
      body: JSON.stringify(body),
    });
    onRefresh();
  };

  const statusCls = (s: string) => cn(
    "h-10 rounded-xl text-sm font-semibold border transition-all",
    leg.status === s
      ? s === "active" ? "bg-green-600 text-white border-green-600" : "bg-red-600 text-white border-red-600"
      : "bg-background text-muted-foreground border-border hover:bg-muted"
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-base">{leg.countryName}</h3>
            <span className="text-xs text-muted-foreground font-mono">{leg.countryCode}</span>
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border",
              leg.status === "active" ? "bg-green-50 text-green-700 border-green-200" : "bg-muted text-muted-foreground border-border")}>
              {leg.status === "active" ? "Active" : "Closed"}
            </span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">
              {leg.orderCount} order{leg.orderCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <a
          href={`/leg-kits/${gbId}/${leg.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
          title="Open Kit Count Viewer"
        >
          <BarChart3 className="w-4 h-4 text-blue-500" />
        </a>
        <button onClick={deleteLeg} disabled={saving} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Delete leg">
          <Trash2 className="w-4 h-4 text-red-400" />
        </button>
      </div>

      {/* Status */}
      <Card className="p-4 space-y-3">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Status</p>
        <div className="grid grid-cols-2 gap-2">
          <button disabled={saving} onClick={() => void patchLeg({ status: "active" })} className={statusCls("active")}>Active</button>
          <button disabled={saving} onClick={() => void patchLeg({ status: "closed" })} className={statusCls("closed")}>Closed</button>
        </div>
      </Card>

      {/* General Settings */}
      <Card className="p-4 space-y-3">
        <p className="text-sm font-bold">General Settings</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Country Name</Label>
            <Input value={leg.countryName} readOnly className="mt-1 bg-muted/30" />
          </div>
          <div>
            <Label className="text-xs">Country Code</Label>
            <Input value={leg.countryCode} readOnly className="mt-1 bg-muted/30 font-mono" />
          </div>
        </div>
        <div>
          <Label className="text-xs">Sort Order</Label>
          <Input type="number" value={sortOrderEdit} onChange={e => setSortOrderEdit(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Message</Label>
          <textarea rows={2} value={messageEdit} onChange={e => setMessageEdit(e.target.value)}
            placeholder="Optional message for this country group…"
            className="mt-1 w-full text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
        </div>
        <div>
          <Label className="text-xs">Country Note <span className="font-normal text-muted-foreground">(shown only to members of this country)</span></Label>
          <textarea rows={2} value={countryNoteEdit} onChange={e => setCountryNoteEdit(e.target.value)}
            placeholder="Note shown exclusively to members of this country…"
            className="mt-1 w-full text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
        </div>
        <Button size="sm" onClick={saveGeneral} disabled={savingGeneral} className="gap-1.5">
          {savingGeneral ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : savedGeneral ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          {savingGeneral ? "Saving…" : savedGeneral ? "Saved!" : "Save Settings"}
        </Button>
      </Card>

      {/* Direct Shipping */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold">Direct Home Shipping</p>
            <p className="text-xs text-muted-foreground mt-0.5">Allow members of this leg to request delivery straight to their home address.</p>
          </div>
          <button onClick={() => void patchLeg({ directShippingEnabled: !leg.directShippingEnabled })} disabled={saving}
            className={cn("flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors shrink-0 ml-3",
              leg.directShippingEnabled ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-muted text-muted-foreground border-border")}>
            {leg.directShippingEnabled ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
            {leg.directShippingEnabled ? "Enabled" : "Disabled"}
          </button>
        </div>
        {leg.directShippingEnabled && (
          <div className="pt-1 border-t border-border space-y-1.5">
            <Label className="text-xs">Wholesale Vendor <span className="font-normal text-muted-foreground">(shipping price table used for cost calculation)</span></Label>
            <select
              value={leg.wholesaleVendorId ?? ""}
              onChange={e => {
                const val = e.target.value || null;
                void patchLeg({ wholesaleVendorId: val });
              }}
              disabled={saving}
              className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">— None (no auto-calculation) —</option>
              {wholesaleVendors.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
            {!leg.wholesaleVendorId && (
              <p className="text-[11px] text-amber-600">No vendor selected — direct shipping cost won't be auto-calculated when customers toggle it.</p>
            )}
          </div>
        )}
      </Card>

      {/* Invite Code */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">Invite Code</p>
          <button onClick={() => void patchLeg({ inviteEnabled: !leg.inviteEnabled })} disabled={saving}
            className={cn("flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors",
              leg.inviteEnabled ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-muted text-muted-foreground border-border")}>
            {leg.inviteEnabled ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
            {leg.inviteEnabled ? "Enabled" : "Disabled"}
          </button>
        </div>
        {leg.inviteEnabled && (
          <div className="flex items-center gap-2">
            {leg.inviteCode
              ? <code className="flex-1 rounded-lg bg-muted px-3 py-2 text-sm font-mono font-bold tracking-widest">{leg.inviteCode}</code>
              : <span className="flex-1 text-sm text-muted-foreground italic">No code generated</span>}
            {leg.inviteCode && (
              <button onClick={() => void navigator.clipboard.writeText(leg.inviteCode ?? "")} className="p-2 rounded-lg hover:bg-muted" title="Copy">
                <Copy className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
            <button onClick={regenInvite} disabled={saving} className="p-2 rounded-lg hover:bg-muted" title="Regenerate">
              {saving ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : <RefreshCw className="w-4 h-4 text-muted-foreground" />}
            </button>
          </div>
        )}
      </Card>

      {/* Vendor Shipping */}
      <Card className="p-4 space-y-3">
        <p className="text-sm font-bold flex items-center gap-1.5"><Truck className="w-4 h-4 text-sky-600" />Vendor Shipping</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Shipping Cost</Label>
            <Input type="number" min="0" step="0.01" placeholder="e.g. 120.00" value={shippingCost} onChange={e => setShippingCost(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Packages / Kits</Label>
            <Input type="number" min="0" step="1" placeholder="e.g. 20" value={packageCount} onChange={e => setPackageCount(e.target.value)} className="mt-1" />
          </div>
        </div>
        {shippingCost && packageCount && parseFloat(packageCount) > 0 && (
          <p className="text-[11px] text-sky-700 font-medium">≈ {(parseFloat(shippingCost) / parseFloat(packageCount)).toFixed(2)} per kit</p>
        )}
        <Button size="sm" onClick={saveVendor} disabled={savingVendor} className="gap-1.5">
          {savingVendor ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : savedVendor ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          {savingVendor ? "Saving…" : savedVendor ? "Saved!" : "Save Shipping"}
        </Button>
      </Card>

      {/* Reshipper */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">Reshipper</p>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">Allow code override</span>
            <button
              type="button"
              onClick={() => void toggleAllowReshipperCode()}
              disabled={togglingReshipperCode}
              className={cn(
                "text-[10px] px-2.5 py-1 rounded-lg font-semibold border transition-colors",
                allowReshipperCode ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-muted border-border text-muted-foreground"
              )}
            >
              {allowReshipperCode ? "On" : "Off"}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={leg.reshipper?.reshipperUsername ?? ""} disabled={assigningReshipper}
            onChange={e => void assignReshipper(e.target.value)}
            className="flex-1 rounded-lg border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
            <option value="">— None —</option>
            {approvedReshippers.map(r => (
              <option key={r.telegramUsername} value={r.telegramUsername}>@{r.telegramUsername}</option>
            ))}
          </select>
          {assigningReshipper && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />}
        </div>
        {leg.reshipper && (
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Pay to</p>
              <div className="flex gap-2">
                {(["reshipper", "admin"] as const).map(t => (
                  <button key={t} type="button" onClick={() => void patchReshipper({ paymentTarget: t })}
                    className={cn("flex-1 h-8 rounded-lg text-xs font-semibold border transition-colors capitalize",
                      leg.reshipper?.paymentTarget === t ? "bg-orange-50 border-orange-300 text-orange-700" : "bg-background border-border text-muted-foreground hover:bg-muted")}>{t}</button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Allow payments</span>
              <button type="button" onClick={() => void patchReshipper({ allowPayments: !leg.reshipper?.allowPayments })}
                className={cn("text-[10px] px-2.5 py-1 rounded-lg font-semibold border transition-colors",
                  leg.reshipper?.allowPayments ? "bg-green-50 border-green-200 text-green-700" : "bg-muted border-border text-muted-foreground")}>
                {leg.reshipper?.allowPayments ? "Enabled" : "Disabled"}</button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Vendor shipping split</span>
              <button type="button" onClick={() => void patchReshipper({ allowVendorShippingSplit: !leg.reshipper?.allowVendorShippingSplit })}
                className={cn("text-[10px] px-2.5 py-1 rounded-lg font-semibold border transition-colors",
                  leg.reshipper?.allowVendorShippingSplit ? "bg-green-50 border-green-200 text-green-700" : "bg-muted border-border text-muted-foreground")}>
                {leg.reshipper?.allowVendorShippingSplit ? "Enabled" : "Disabled"}</button>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Payment Methods</p>
              <div className="flex flex-wrap gap-1.5">
                {PAYMENT_METHODS.map(m => {
                  const on = !!(leg.reshipper?.enabledPaymentMethods?.[m.key]);
                  return (
                    <button key={m.key} type="button" onClick={() => void patchReshipper({ enabledPaymentMethods: { ...(leg.reshipper?.enabledPaymentMethods ?? {}), [m.key]: !on } })}
                      className={cn("text-[10px] px-2.5 py-1 rounded-lg font-semibold border transition-colors",
                        on ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-muted border-border text-muted-foreground")}>{m.label}</button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Reshipper Fee</p>
                <button type="button" onClick={() => void patchReshipper({ reshipperFeeEnabled: !leg.reshipper?.reshipperFeeEnabled })}
                  className={cn("text-[10px] px-2.5 py-1 rounded-lg font-semibold border transition-colors",
                    leg.reshipper?.reshipperFeeEnabled ? "bg-purple-50 border-purple-200 text-purple-700" : "bg-muted border-border text-muted-foreground")}>
                  {leg.reshipper?.reshipperFeeEnabled ? "Enabled" : "Disabled"}</button>
              </div>
              {leg.reshipper?.reshipperFeeEnabled && (
                <div className="flex items-center gap-2 flex-wrap">
                  {(["fixed", "custom"] as const).map(t => (
                    <button key={t} type="button" onClick={() => void patchReshipper({ reshipperFeeType: t })}
                      className={cn("text-[10px] px-2.5 py-1 rounded-lg font-semibold border transition-colors capitalize",
                        leg.reshipper?.reshipperFeeType === t ? "bg-purple-50 border-purple-200 text-purple-700" : "bg-muted border-border text-muted-foreground")}>{t}</button>
                  ))}
                  {leg.reshipper.reshipperFeeType === "fixed" && (
                    <input type="number" min="0" step="0.01" defaultValue={leg.reshipper.reshipperFeeAmount ?? ""} placeholder="Amount…"
                      onBlur={e => void patchReshipper({ reshipperFeeAmount: e.target.value || null })}
                      className="w-24 rounded-lg border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* ── Leg Calculations ── */}
      <LegInlineCalcSection gbId={gbId} secret={secret} leg={leg} currency={currency} />
    </div>
  );
}

// ─── Inline leg calc embedded in the leg detail panel ──────────
export function LegInlineCalcSection({ gbId, secret, leg, currency }: { gbId: string; secret: string; leg: AdminCLeg; currency: string }) {
  const [orders, setOrders] = useState<GbOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("Submitted");
  const [mode, setMode] = useState<"split" | "direct">("split");

  // Split state
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [totalCost, setTotalCost] = useState(leg.vendorShippingCost != null ? String(leg.vendorShippingCost) : "");
  const [equalPct, setEqualPct] = useState(50);
  const weightPct = 100 - equalPct;
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<{ message: string; breakdown: { orderId: string; username: string; vendorShipping: number }[] } | null>(null);

  // Direct state
  const [directAmounts, setDirectAmounts] = useState<Record<string, string>>({});
  const [directApplying, setDirectApplying] = useState(false);
  const [directResult, setDirectResult] = useState<{ message: string; breakdown: { orderId: string; username: string; vendorShipping: number }[] } | null>(null);

  useEffect(() => {
    fetch(apiUrl(`/admin/group-buys/${gbId}/orders`), { headers: { "x-admin-secret": secret } })
      .then(r => r.ok ? r.json() : [])
      .then((data: GbOrder[]) => { setOrders(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [gbId, secret]);

  // Keep totalCost in sync if leg prop changes
  useEffect(() => {
    setTotalCost(leg.vendorShippingCost != null ? String(leg.vendorShippingCost) : "");
  }, [leg.vendorShippingCost]);

  const legOrders = orders.filter(o => o.countryLegId === leg.id && o.status === statusFilter);

  // Pre-fill direct amounts when order set changes
  useEffect(() => {
    setDirectAmounts(prev => {
      const next: Record<string, string> = {};
      for (const o of legOrders) {
        next[o.id] = prev[o.id] !== undefined ? prev[o.id] : (o.vendorShipping > 0 ? String(o.vendorShipping) : "");
      }
      return next;
    });
    setDirectResult(null);
    setApplyResult(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legOrders.map(o => o.id).join(","), statusFilter]);

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
  const directTotal = legOrders.reduce((s, o) => s + (parseFloat(directAmounts[o.id] || "0") || 0), 0);
  const directOrdersWithAmount = legOrders.filter(o => (parseFloat(directAmounts[o.id] || "0") || 0) > 0).length;

  const applySplit = async () => {
    if (!confirm(`Write split shipping to ${legOrders.length} orders? This overwrites their current vendor shipping.`)) return;
    setApplying(true); setApplyResult(null);
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

  const applyDirect = async () => {
    if (legOrders.length === 0) return;
    if (!confirm(`Write manual shipping to ${legOrders.length} orders? Orders left blank will be set to $0.00.`)) return;
    setDirectApplying(true); setDirectResult(null);
    try {
      const breakdown: { orderId: string; username: string; vendorShipping: number }[] = [];
      for (const order of legOrders) {
        const shipping = Math.round((parseFloat(directAmounts[order.id] || "0") || 0) * 100) / 100;
        await fetch(apiUrl(`/admin/orders/${order.id}`), {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-admin-secret": secret },
          body: JSON.stringify({ vendorShipping: shipping }),
        });
        breakdown.push({ orderId: order.id, username: order.telegramUsername, vendorShipping: shipping });
      }
      setDirectResult({ message: `Applied to ${legOrders.length} orders`, breakdown });
    } finally { setDirectApplying(false); }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Calculator className="w-4 h-4 text-purple-600" />
        <p className="text-sm font-bold">Leg Calculations</p>
        {leg.reshipper?.reshipperUsername && (
          <span className="text-[11px] text-purple-700 bg-purple-50 rounded-full px-2 py-0.5 font-semibold">
            @{leg.reshipper.reshipperUsername}
          </span>
        )}
        {orders.some(o => o.countryLegId === leg.id && o.vendorShipping > 0) && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Check className="w-2.5 h-2.5" />Shipping added
          </span>
        )}
      </div>

      {/* Mode toggle */}
      <div className="flex rounded-xl border border-input overflow-hidden">
        <button type="button" onClick={() => { setMode("split"); setApplyResult(null); setDirectResult(null); }}
          className={cn("flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors",
            mode === "split" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted/50")}>
          <Calculator className="w-4 h-4" />Vendor Split
        </button>
        <button type="button" onClick={() => { setMode("direct"); setApplyResult(null); setDirectResult(null); }}
          className={cn("flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors border-l border-input",
            mode === "direct" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted/50")}>
          <PenLine className="w-4 h-4" />Direct
        </button>
      </div>

      {/* Status filter */}
      <div>
        <Label className="text-xs font-semibold">Order Status</Label>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-base focus:outline-none focus:ring-1 focus:ring-ring">
          {["Submitted", "Processing", "Shipped", "Completed", "Draft"].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
      ) : legOrders.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">No {statusFilter} orders in this leg.</p>
      ) : (
        <>
          {/* ── SPLIT ── */}
          {mode === "split" && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-semibold">Total Vendor Shipping Cost ({currSym(currency)})</Label>
                <Input type="number" min="0" step="0.01" placeholder="e.g. 150.00"
                  value={totalCost} onChange={e => setTotalCost(e.target.value)}
                  className="mt-1 rounded-xl" />
                {leg.vendorShippingCost && (
                  <p className="text-[11px] text-muted-foreground mt-1">Saved on leg: ${parseFloat(String(leg.vendorShippingCost)).toFixed(2)}</p>
                )}
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold">Equal portion</p>
                  <div className="flex items-center gap-1.5">
                    <input type="number" min="0" max="100" value={equalPct}
                      onChange={e => setEqualPct(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                      className="w-16 h-9 rounded-full border border-input bg-background px-2 text-sm text-center font-semibold focus:outline-none focus:ring-1 focus:ring-ring" />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                </div>
                <input type="range" min="0" max="100" value={equalPct} onChange={e => setEqualPct(parseInt(e.target.value))}
                  className="w-full h-2.5 rounded-full cursor-pointer accent-blue-600" />
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold">Quantity-weighted</p>
                  <div className="flex items-center gap-1.5">
                    <input type="number" readOnly value={weightPct}
                      className="w-16 h-9 rounded-full border border-input bg-muted/40 px-2 text-sm text-center font-semibold focus:outline-none" />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                </div>
                <input type="range" min="0" max="100" value={weightPct} onChange={e => setEqualPct(100 - parseInt(e.target.value))}
                  className="w-full h-2.5 rounded-full cursor-pointer accent-blue-900" />
              </div>

              {/* Order rows */}
              <div className="space-y-1 max-h-72 overflow-y-auto border-t border-border pt-2">
                {legOrders.map(order => {
                  const excluded = excludedIds.has(order.id);
                  const kits = kitCount(order);
                  return (
                    <label key={order.id} className={cn("grid grid-cols-[28px_1fr_auto_auto] gap-x-2 items-center px-1.5 py-2.5 rounded-lg transition-colors cursor-pointer",
                      excluded ? "opacity-40" : "hover:bg-muted/30")}>
                      <input type="checkbox" checked={!excluded}
                        onChange={e => setExcludedIds(prev => { const n = new Set(prev); e.target.checked ? n.delete(order.id) : n.add(order.id); return n; })}
                        className="w-4 h-4 rounded" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-medium truncate">@{order.telegramUsername}</span>
                          {order.vendorShipping > 0 && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 tabular-nums shrink-0">
                              {currSym(currency)}{order.vendorShipping.toFixed(2)} set
                            </span>
                          )}
                        </div>
                        {order.notes && <span className="text-[10px] text-amber-700 bg-amber-50 rounded px-1 mt-0.5 inline-block">{order.notes}</span>}
                      </div>
                      <span className="text-[11px] text-muted-foreground text-right tabular-nums">{kits}k</span>
                      <span className={cn("text-sm font-bold text-right tabular-nums w-16", excluded ? "text-muted-foreground" : "")}>
                        {excluded ? "—" : calcShipping(order).toFixed(2)}
                      </span>
                    </label>
                  );
                })}
              </div>

              <div className="border-t border-border pt-3 space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Included</span><span className="font-semibold text-foreground">{includedOrders.length}/{legOrders.length}</span>
                </div>
                <div className="flex justify-between text-sm font-bold">
                  <span>Calculated total</span>
                  <span className={roundingDiff > 0.03 ? "text-orange-500" : "text-green-600"}>{currSym(currency)}{totalCalc.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Target</span><span className="font-semibold">{currSym(currency)}{totalCostNum.toFixed(2)}</span>
                </div>
                {roundingDiff > 0.03 && (
                  <p className="text-xs text-orange-500">Rounding diff: {(totalCalc - totalCostNum).toFixed(2)}</p>
                )}
              </div>

              <button type="button" onClick={() => void applySplit()} disabled={applying || totalCostNum === 0}
                className="w-full h-12 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
                style={{ background: "rgba(115,108,210,0.9)" }}>
                {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
                {applying ? "Applying…" : "Apply Shipping Split"}
              </button>
            </div>
          )}

          {/* ── DIRECT ── */}
          {mode === "direct" && (
            <div className="space-y-3">
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {legOrders.map(order => {
                  const val = directAmounts[order.id] ?? "";
                  const kits = kitCount(order);
                  return (
                    <div key={order.id} className="grid grid-cols-[1fr_88px] gap-x-2 items-center px-1.5 py-2.5 rounded-lg hover:bg-muted/30">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-medium truncate">@{order.telegramUsername}</span>
                          {order.vendorShipping > 0 && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 tabular-nums shrink-0">
                              {currSym(currency)}{order.vendorShipping.toFixed(2)} set
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground">{kits} kit{kits !== 1 ? "s" : ""}</span>
                        {order.notes && <span className="text-[10px] text-amber-700 bg-amber-50 rounded px-1 mt-0.5 inline-block">{order.notes}</span>}
                      </div>
                      <input type="number" min="0" step="0.01" placeholder="0.00" value={val}
                        onChange={e => setDirectAmounts(prev => ({ ...prev, [order.id]: e.target.value }))}
                        className="w-full h-11 rounded-lg border border-input bg-background px-2 text-sm text-right font-semibold tabular-nums focus:outline-none focus:ring-1 focus:ring-ring" />
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-border pt-3 space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Amounts set</span><span className="font-semibold text-foreground">{directOrdersWithAmount}/{legOrders.length}</span>
                </div>
                <div className="flex justify-between text-sm font-bold">
                  <span>Total</span><span className="text-blue-700">{currSym(currency)}{directTotal.toFixed(2)}</span>
                </div>
              </div>

              <button type="button" onClick={() => void applyDirect()} disabled={directApplying}
                className="w-full h-12 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
                style={{ background: "rgba(115,108,210,0.9)" }}>
                {directApplying ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenLine className="w-4 h-4" />}
                {directApplying ? "Applying…" : `Apply to ${legOrders.length} Orders`}
              </button>
            </div>
          )}

          {/* Result banners */}
          {applyResult && (
            <div className="rounded-xl bg-green-50 border border-green-200 p-3 space-y-1">
              <p className="text-xs font-semibold text-green-700 flex items-center gap-1"><Check className="w-3.5 h-3.5" />{applyResult.message}</p>
              <div className="space-y-0.5 max-h-36 overflow-y-auto">
                {applyResult.breakdown.map(b => (
                  <div key={b.orderId} className="flex justify-between text-[11px] text-green-800">
                    <span>@{b.username}</span><span className="font-semibold">{currSym(currency)}{b.vendorShipping.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {directResult && (
            <div className="rounded-xl bg-green-50 border border-green-200 p-3 space-y-1">
              <p className="text-xs font-semibold text-green-700 flex items-center gap-1"><Check className="w-3.5 h-3.5" />{directResult.message}</p>
              <div className="space-y-0.5 max-h-36 overflow-y-auto">
                {directResult.breakdown.map(b => (
                  <div key={b.orderId} className="flex justify-between text-[11px] text-green-800">
                    <span>@{b.username}</span><span className="font-semibold">{currSym(currency)}{b.vendorShipping.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

export function AdminCountryLegsSection({ secret, gbId, currency }: { secret: string; gbId: string; currency: string }) {
  const [legs, setLegs] = useState<AdminCLeg[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [selectedLegId, setSelectedLegId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newInvite, setNewInvite] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [bulkAdding, setBulkAdding] = useState(false);
  const [approvedReshippers, setApprovedReshippers] = useState<{ telegramUsername: string }[]>([]);
  const [applyingLegShipping, setApplyingLegShipping] = useState(false);
  const [legShippingResult, setLegShippingResult] = useState<{ message: string; breakdown: { legId: string; countryName: string; countryCode: string; shippingCost: number; totalKits: number; costPerKit: number | null; ordersUpdated: number }[] } | null>(null);
  const [legShippingStatusFilter, setLegShippingStatusFilter] = useState("Submitted");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [legsRes, reshippersRes] = await Promise.all([
        fetch(apiUrl(`/admin/group-buys/${gbId}/country-legs`), { headers: { "x-admin-secret": secret } }),
        fetch(apiUrl("/admin/approved-reshippers"), { headers: { "x-admin-secret": secret } }),
      ]);
      if (legsRes.ok) setLegs(await legsRes.json());
      if (reshippersRes.ok) setApprovedReshippers(await reshippersRes.json());
    } finally { setLoading(false); }
  }, [gbId, secret]);

  useEffect(() => { void load(); }, [load]);

  const applyLegShipping = async () => {
    setApplyingLegShipping(true);
    setLegShippingResult(null);
    try {
      const r = await fetch(apiUrl(`/admin/group-buys/${gbId}/apply-leg-shipping`), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ statusFilter: legShippingStatusFilter }),
      });
      const data = await r.json();
      setLegShippingResult(data);
    } finally { setApplyingLegShipping(false); }
  };

  const patch = async (legId: string, body: object) => {
    setSaving(legId);
    try {
      const r = await fetch(apiUrl(`/admin/group-buys/${gbId}/country-legs/${legId}`), {
        method: "PATCH", headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify(body),
      });
      if (r.ok) void load();
    } finally { setSaving(null); }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    if (!newCode.trim() || !newName.trim()) { setAddError("Please select a country"); return; }
    setAdding(true);
    try {
      const r = await fetch(apiUrl(`/admin/group-buys/${gbId}/country-legs`), {
        method: "POST", headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ countryCode: newCode.trim().toUpperCase(), countryName: newName.trim(), inviteEnabled: newInvite }),
      });
      if (!r.ok) { const d = await r.json(); setAddError(d.error || "Failed"); return; }
      setNewCode(""); setNewName(""); setNewInvite(false); setAddOpen(false);
      void load();
    } finally { setAdding(false); }
  };

  const handleAddPopular = async () => {
    const existing = new Set(legs.map(l => l.countryCode));
    const toAdd = POPULAR_COUNTRIES.filter(c => !existing.has(c.code));
    if (toAdd.length === 0) return;
    setBulkAdding(true);
    try {
      for (const c of toAdd) {
        await fetch(apiUrl(`/admin/group-buys/${gbId}/country-legs`), {
          method: "POST", headers: { "Content-Type": "application/json", "x-admin-secret": secret },
          body: JSON.stringify({ countryCode: c.code, countryName: c.name, inviteEnabled: false }),
        });
      }
      void load();
    } finally { setBulkAdding(false); }
  };

  const handleAddEu = async () => {
    const existing = new Set(legs.map(l => l.countryCode));
    const toAdd = EU_COUNTRIES.filter(c => !existing.has(c.code));
    if (toAdd.length === 0) return;
    setBulkAdding(true);
    try {
      for (const c of toAdd) {
        await fetch(apiUrl(`/admin/group-buys/${gbId}/country-legs`), {
          method: "POST", headers: { "Content-Type": "application/json", "x-admin-secret": secret },
          body: JSON.stringify({ countryCode: c.code, countryName: c.name, inviteEnabled: false }),
        });
      }
      void load();
    } finally { setBulkAdding(false); }
  };

  if (loading) return <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>;

  const selectedLeg = selectedLegId != null ? (legs.find(l => l.id === selectedLegId) ?? null) : null;

  if (selectedLeg) {
    return (
      <div className="mt-4">
        <CountryLegDetailPanel
          leg={selectedLeg}
          gbId={gbId}
          secret={secret}
          currency={currency}
          approvedReshippers={approvedReshippers}
          onBack={() => setSelectedLegId(null)}
          onDeleted={() => { setSelectedLegId(null); void load(); }}
          onRefresh={() => void load()}
        />
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-2">
      {legs.length === 0 && !addOpen && (
        <p className="text-xs text-muted-foreground italic">No countries added yet.</p>
      )}
      {legs.map(leg => (
        <div key={leg.id} className="rounded-xl border border-border bg-muted/30 overflow-hidden">
          <button
            type="button"
            onClick={() => setSelectedLegId(leg.id)}
            className="w-full flex items-center justify-between gap-2 px-3 py-3 text-left hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-semibold">{leg.countryName} <span className="text-muted-foreground font-normal text-xs">({leg.countryCode})</span></span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">{leg.orderCount} order{leg.orderCount !== 1 ? "s" : ""}</span>
                  {leg.reshipper && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600">@{leg.reshipper.reshipperUsername}</span>
                  )}
                  {leg.vendorShippingCost != null && parseFloat(String(leg.vendorShippingCost)) > 0 && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-600">{parseFloat(String(leg.vendorShippingCost)).toFixed(0)} shipping</span>
                  )}
                </div>
                <p className="text-[10px] mt-0.5" style={{ color: leg.status === "active" ? "#16A34A" : "#9CA3AF" }}>
                  {leg.status === "active" ? "Active" : "Closed"}
                  {leg.inviteEnabled ? " · invite required" : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
              <button type="button" disabled={saving === leg.id}
                onClick={() => patch(leg.id, { status: leg.status === "active" ? "closed" : "active" })}
                className={cn("text-[10px] font-semibold px-2 py-1 rounded-lg border transition-colors",
                  leg.status === "active" ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-green-50 text-green-600 border-green-200")}
              >{leg.status === "active" ? "Close" : "Open"}</button>
              <ChevronRight className="w-4 h-4 text-muted-foreground ml-1" />
            </div>
          </button>
        </div>
      ))}

      {/* ── Apply Leg Shipping panel ── */}
      {legs.some(l => l.vendorShippingCost != null && parseFloat(String(l.vendorShippingCost)) > 0) && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-sky-600" />
            <p className="text-xs font-semibold text-sky-800">Apply Leg Shipping to Orders</p>
          </div>
          <p className="text-[11px] text-sky-700">
            Splits each leg's shipping cost proportionally across orders in that leg by kit quantity.
            Only legs with a shipping cost saved above will be processed.
          </p>
          {/* Summary of saved leg costs */}
          <div className="space-y-1">
            {legs.filter(l => l.vendorShippingCost != null && parseFloat(String(l.vendorShippingCost)) > 0).map(l => (
              <div key={l.id} className="flex items-center justify-between text-[11px]">
                <span className="font-medium text-sky-800">{l.countryName}</span>
                <span className="text-sky-700">
                  {l.vendorPackageCount ? `${l.vendorPackageCount} pkgs · ` : ""}
                  <span className="font-semibold">{parseFloat(String(l.vendorShippingCost)).toFixed(2)}</span>
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={legShippingStatusFilter}
              onChange={e => setLegShippingStatusFilter(e.target.value)}
              className="rounded-lg border border-sky-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-sky-400"
            >
              {["Submitted", "Processing", "Shipped"].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void applyLegShipping()}
              disabled={applyingLegShipping}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-60 transition-colors"
            >
              {applyingLegShipping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Truck className="w-3.5 h-3.5" />}
              Apply All Legs
            </button>
          </div>
          {legShippingResult && (
            <div className="rounded-lg bg-white border border-sky-200 p-2 space-y-1">
              <p className="text-[11px] font-semibold text-sky-800">{legShippingResult.message}</p>
              {legShippingResult.breakdown.filter(b => b.ordersUpdated > 0).map(b => (
                <div key={b.legId ?? b.countryCode} className="text-[11px] text-sky-700 flex items-center justify-between">
                  <span>{b.countryName} ({b.countryCode})</span>
                  <span>
                    {b.ordersUpdated} order{b.ordersUpdated !== 1 ? "s" : ""} · {b.totalKits} kit{b.totalKits !== 1 ? "s" : ""} ·{" "}
                    {b.costPerKit != null ? `${b.costPerKit.toFixed(2)}/kit` : "—"}
                  </span>
                </div>
              ))}
              {legShippingResult.breakdown.filter(b => b.ordersUpdated === 0).length > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  Skipped (no matching orders):{" "}
                  {legShippingResult.breakdown.filter(b => b.ordersUpdated === 0).map(b => b.countryName).join(", ")}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Bill Paid Orders for Vendor Shipping ── */}
      {legs.some(l => l.vendorShippingCost != null && parseFloat(String(l.vendorShippingCost)) > 0) && (
        <BillVendorShippingPanel secret={secret} gbId={gbId} />
      )}

      {/* Add form */}
      {addOpen ? (
        <form onSubmit={handleAdd} className="rounded-xl border border-dashed border-border p-3 space-y-2 bg-muted/20">
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1 block">Country</label>
            <select
              className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm focus:outline-none"
              value={newCode}
              onChange={e => {
                const entry = COUNTRY_LIST.find(c => c.code === e.target.value);
                setNewCode(e.target.value);
                setNewName(entry?.name ?? "");
              }}
            >
              <option value="">Select a country…</option>
              {COUNTRY_LIST.map(c => (
                <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="checkbox" checked={newInvite} onChange={e => setNewInvite(e.target.checked)} className="rounded" />
            Require invite code
          </label>
          {addError && <p className="text-xs text-red-500">{addError}</p>}
          <div className="flex gap-2">
            <Button size="sm" type="submit" disabled={adding} className="gap-1.5">{adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}Add Country</Button>
            <Button size="sm" type="button" variant="ghost" onClick={() => { setAddOpen(false); setAddError(null); }}>Cancel</Button>
          </div>
        </form>
      ) : (
        <div className="flex gap-2 flex-wrap">
          <button type="button" onClick={() => setAddOpen(true)}
            className="flex-1 rounded-xl border border-dashed border-border py-2 text-xs font-semibold text-muted-foreground hover:bg-muted/40 transition-colors flex items-center justify-center gap-1.5">
            <Plus className="w-3.5 h-3.5" />Add Country
          </button>
          <button type="button" onClick={handleAddPopular} disabled={bulkAdding}
            className="flex-1 rounded-xl border border-dashed border-amber-300 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60">
            {bulkAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
            Add US/UK/CA/AU/BR
          </button>
          <button type="button" onClick={handleAddEu} disabled={bulkAdding}
            className="flex-1 rounded-xl border border-dashed border-blue-200 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60">
            {bulkAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
            Add EU Countries
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Details Sub-tab ──────────────────────────────────────────
