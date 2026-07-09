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
export const GB_STATUSES = ["Draft", "Submitted", "Processing", "Shipped", "Completed", "Cancelled"];

export function ShippingSplitCard({ secret, gbId }: { secret: string; gbId: string }) {
  const [enabled, setEnabled] = useState(false);
  const [totalShipping, setTotalShipping] = useState("");
  const [equalPct, setEqualPct] = useState(80);
  const [weightedPct, setWeightedPct] = useState(20);
  const [statusFilter, setStatusFilter] = useState("Submitted");
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<{
    message: string;
    updatedCount: number;
    breakdown: { orderId: string; username: string; vendorShipping: number; newGrandTotal: number }[];
  } | null>(null);
  const [error, setError] = useState("");

  const syncSlider = (field: "equal" | "weighted", val: number) => {
    const c = Math.max(0, Math.min(100, val));
    if (field === "equal") { setEqualPct(c); setWeightedPct(100 - c); }
    else { setWeightedPct(c); setEqualPct(100 - c); }
  };

  const handleApply = async () => {
    if (Math.abs(equalPct + weightedPct - 100) > 0.5) { setError("Equal % + Weighted % must sum to 100"); return; }
    const amt = parseFloat(totalShipping);
    if (isNaN(amt) || amt < 0) { setError("Enter a valid shipping amount"); return; }
    setError(""); setApplying(true); setResult(null);
    try {
      const res = await fetch(apiUrl(`/admin/group-buys/${gbId}/apply-shipping`), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ totalShipping: amt, equalPct, weightedPct, statusFilter }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Failed to apply shipping split");
      else setResult(data);
    } catch { setError("Network error"); }
    setApplying(false);
  };

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-purple-500" />
          <h3 className="font-semibold text-sm">Shipping Split</h3>
        </div>
        <button
          type="button"
          onClick={() => { setEnabled(e => !e); setResult(null); setError(""); }}
          className="shrink-0"
        >
          {enabled
            ? <ToggleRight className="w-5 h-5 text-purple-600" />
            : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
        </button>
      </div>

      {!enabled && (
        <p className="text-xs text-muted-foreground">Enable to split vendor shipping cost across orders in this group buy.</p>
      )}

      {enabled && (
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Total Vendor Shipping Cost ($)</Label>
            <Input
              type="number" min="0" step="0.01" placeholder="e.g. 150.00"
              value={totalShipping}
              onChange={e => setTotalShipping(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            {[
              { field: "equal" as const, label: "Equal portion", sub: "Same amount per order", val: equalPct },
              { field: "weighted" as const, label: "Quantity-weighted", sub: "More items = more shipping", val: weightedPct },
            ].map(({ field, label, sub, val }) => (
              <div key={field}>
                <div className="flex justify-between items-center mb-1">
                  <div>
                    <Label className="text-sm">{label}</Label>
                    <p className="text-xs text-muted-foreground">{sub}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number" min="0" max="100"
                      className="w-20 h-9 text-center text-sm"
                      value={val}
                      onChange={e => syncSlider(field, parseFloat(e.target.value) || 0)}
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>
                <input
                  type="range" min="0" max="100" value={val}
                  onChange={e => syncSlider(field, parseInt(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
            ))}
            <div className={cn("text-xs font-medium px-3 py-2 rounded-lg",
              Math.abs(equalPct + weightedPct - 100) < 0.5
                ? "bg-green-50 text-green-700"
                : "bg-destructive/10 text-destructive")}>
              {equalPct}% + {weightedPct}% = {equalPct + weightedPct}%
              {Math.abs(equalPct + weightedPct - 100) < 0.5 ? " ✓" : " (must be 100)"}
            </div>
          </div>

          <div className="space-y-1">
            <Label>Apply to status</Label>
            <select
              className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              {GB_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {error && <p className="text-sm text-destructive font-medium">{error}</p>}

          <Button
            className="w-full"
            onClick={handleApply}
            disabled={applying || !totalShipping || Math.abs(equalPct + weightedPct - 100) > 0.5}
          >
            {applying
              ? <Loader2 className="w-5 h-5 animate-spin" />
              : <><Truck className="w-4 h-4 mr-2" />Apply Shipping Split</>}
          </Button>

          {result && (
            <div className="space-y-2 pt-1">
              <p className="text-sm font-semibold text-green-700">{result.message}</p>
              {result.breakdown.length > 0 && (
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {result.breakdown.map(b => (
                    <div key={b.orderId} className="flex justify-between text-sm">
                      <span className="text-muted-foreground truncate">@{b.username}</span>
                      <span className="font-medium shrink-0 ml-3">
                        ${b.vendorShipping.toFixed(2)} shipping → ${b.newGrandTotal.toFixed(2)} total
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export function DeliveryMethodsSubTab({ secret, gb, onUpdate }: { secret: string; gb: GroupBuy; onUpdate?: (gb: GroupBuy) => void }) {
  const [allDms, setAllDms] = useState<DeliveryMethod[]>([]);
  const [gbDms, setGbDms] = useState<GBDeliveryMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState("");

  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>(gb.shippingOptions ?? []);
  const [savingShipping, setSavingShipping] = useState(false);
  const [savedShipping, setSavedShipping] = useState(false);

  useEffect(() => {
    setShippingOptions(gb.shippingOptions ?? []);
  }, [gb.id, gb.shippingOptions]);

  const saveShippingOptions = async () => {
    setSavingShipping(true);
    try {
      const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ shippingOptions }),
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdate?.(updated);
        setSavedShipping(true);
        setTimeout(() => setSavedShipping(false), 2000);
      } else {
        const d = await res.json().catch(() => ({}));
        setActionErr(d.error ?? "Failed to save shipping options");
      }
    } catch { setActionErr("Network error saving shipping options"); }
    setSavingShipping(false);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [allRes, gbRes] = await Promise.all([
        fetch(apiUrl("/admin/delivery-methods"), { headers: { "x-admin-secret": secret } }),
        fetch(apiUrl(`/admin/group-buys/${gb.id}/delivery-methods`), { headers: { "x-admin-secret": secret } }),
      ]);
      if (allRes.ok) setAllDms(await allRes.json());
      if (gbRes.ok) setGbDms(await gbRes.json());
    } catch {
      // Network error — leave lists empty, user can refresh
    } finally {
      setLoading(false);
    }
  }, [secret, gb.id]);

  useEffect(() => { load(); }, [load]);

  const linkedIds = new Set(gbDms.map(d => d.deliveryMethodId));

  const toggle = async (dm: DeliveryMethod) => {
    setToggling(dm.id);
    setActionErr("");
    try {
      if (linkedIds.has(dm.id)) {
        const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}/delivery-methods/${dm.id}`), {
          method: "DELETE", headers: { "x-admin-secret": secret },
        });
        if (!res.ok) { const d = await res.json().catch(() => ({})); setActionErr(d.error ?? "Failed to remove delivery method"); }
        else setGbDms(prev => prev.filter(d => d.deliveryMethodId !== dm.id));
      } else {
        const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}/delivery-methods`), {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-admin-secret": secret },
          body: JSON.stringify({ deliveryMethodId: dm.id }),
        });
        if (!res.ok) { const d = await res.json().catch(() => ({})); setActionErr(d.error ?? "Failed to add delivery method"); }
        else await load();
      }
    } catch { setActionErr("Network error"); }
    setToggling(null);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-indigo-500" />
            <h3 className="font-semibold text-sm">Custom Postage Options</h3>
          </div>
          <Button size="sm" onClick={saveShippingOptions} disabled={savingShipping} className="gap-1.5">
            {savingShipping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : savedShipping ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            {savedShipping ? "Saved" : "Save Options"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Postage choices shown to members on the order form for this GB only. If any are defined here, they <strong>replace</strong> the Global Delivery Methods below.</p>
        <ShippingOptionsEditor options={shippingOptions} onChange={setShippingOptions} currencySym={currSym(gb.currency)} />
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Package className="w-4 h-4 text-green-500" />
          <h3 className="font-semibold text-sm">Global Delivery Methods</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Toggle global delivery methods for this group buy. Custom postage options above will override these when set.</p>
        <div className="space-y-2">
          {actionErr && <p className="text-xs text-red-500 px-1">{actionErr}</p>}
          {allDms.map(dm => {
            const isOn = linkedIds.has(dm.id);
            return (
              <div key={dm.id} className={cn("flex items-center gap-3 p-3 rounded-xl border transition-colors",
                isOn ? "bg-green-50 border-green-200" : "bg-background border-border hover:bg-muted/30")}>
                <button type="button" onClick={() => toggle(dm)} disabled={toggling === dm.id} className="shrink-0">
                  {toggling === dm.id
                    ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    : isOn
                      ? <ToggleRight className="w-5 h-5 text-green-600" />
                      : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
                </button>
                <div className="flex-1">
                  <p className="text-sm font-medium">{dm.name}</p>
                  <p className="text-xs text-muted-foreground">{gb.currency} {typeof dm.price === "number" ? dm.price.toFixed(2) : dm.price}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <ShippingSplitCard secret={secret} gbId={gb.id} />

      <CouriersManager secret={secret} />
    </div>
  );
}

// ─── Couriers Manager ─────────────────────────────────────────
export function CouriersManager({ secret }: { secret: string }) {
  const [couriers, setCouriers] = useState<CustomCourier[]>([]);
  const [loading, setLoading] = useState(true);
  const [addName, setAddName] = useState("");
  const [addUrl, setAddUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(apiUrl("/admin/couriers"), { headers: { "x-admin-secret": secret } });
    if (res.ok) setCouriers(await res.json());
    setLoading(false);
  }, [secret]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    const name = addName.trim();
    if (!name) return;
    setAdding(true); setError("");
    try {
      const res = await fetch(apiUrl("/admin/couriers"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ name, trackingUrlTemplate: addUrl.trim() || null }),
      });
      if (res.ok) {
        const courier = await res.json() as CustomCourier;
        setCouriers(prev => [...prev, courier]);
        setAddName(""); setAddUrl("");
      } else {
        const d = await res.json().catch(() => ({})) as { error?: string };
        setError(d.error ?? "Failed to add courier");
      }
    } catch { setError("Network error"); }
    setAdding(false);
  };

  const startEdit = (c: CustomCourier) => {
    setEditingId(c.id);
    setEditName(c.name);
    setEditUrl(c.trackingUrlTemplate ?? "");
  };

  const handleSave = async (id: string) => {
    const name = editName.trim();
    if (!name) return;
    setSaving(true); setError("");
    try {
      const res = await fetch(apiUrl(`/admin/couriers/${id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ name, trackingUrlTemplate: editUrl.trim() || null }),
      });
      if (res.ok) {
        const updated = await res.json() as CustomCourier;
        setCouriers(prev => prev.map(c => c.id === id ? updated : c));
        setEditingId(null);
      } else {
        const d = await res.json().catch(() => ({})) as { error?: string };
        setError(d.error ?? "Failed to save");
      }
    } catch { setError("Network error"); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id); setError("");
    try {
      const res = await fetch(apiUrl(`/admin/couriers/${id}`), {
        method: "DELETE", headers: { "x-admin-secret": secret },
      });
      if (res.ok || res.status === 204) {
        setCouriers(prev => prev.filter(c => c.id !== id));
      } else {
        const d = await res.json().catch(() => ({})) as { error?: string };
        setError(d.error ?? "Failed to delete");
      }
    } catch { setError("Network error"); }
    setDeletingId(null);
  };

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <Truck className="w-4 h-4 text-violet-500" />
        <h3 className="font-semibold text-sm">Custom Couriers</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Define custom couriers (with optional tracking URL templates) that appear alongside the standard carrier list when creating parcels.
        Use <code className="bg-muted px-1 rounded text-[11px]">&#123;tracking_number&#125;</code> in the URL to auto-fill the tracking number.
      </p>

      {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-2 mb-4">
          {couriers.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-3">No custom couriers yet.</p>
          )}
          {couriers.map(c => (
            <div key={c.id} className="border border-border rounded-xl bg-background">
              {editingId === c.id ? (
                <div className="p-3 space-y-2">
                  <Input
                    placeholder="Courier name"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="text-sm"
                  />
                  <Input
                    placeholder="Tracking URL template (optional)"
                    value={editUrl}
                    onChange={e => setEditUrl(e.target.value)}
                    className="text-sm font-mono"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => setEditingId(null)} disabled={saving}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" onClick={() => handleSave(c.id)} disabled={saving || !editName.trim()} className="gap-1.5">
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{c.name}</p>
                    {c.trackingUrlTemplate && (
                      <p className="text-xs text-muted-foreground font-mono truncate">{c.trackingUrlTemplate}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => startEdit(c)}
                    className="p-1.5 rounded hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(c.id)}
                    disabled={deletingId === c.id}
                    className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    {deletingId === c.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2 pt-3 border-t border-border">
        <p className="text-xs font-semibold text-muted-foreground">Add new courier</p>
        <Input
          placeholder="Courier name *"
          value={addName}
          onChange={e => setAddName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleAdd()}
          className="text-sm"
        />
        <Input
          placeholder="Tracking URL template (optional)"
          value={addUrl}
          onChange={e => setAddUrl(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleAdd()}
          className="text-sm font-mono"
        />
        <Button
          onClick={handleAdd}
          disabled={adding || !addName.trim()}
          size="sm"
          className="gap-1.5 w-full"
        >
          {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Add Courier
        </Button>
      </div>
    </Card>
  );
}

