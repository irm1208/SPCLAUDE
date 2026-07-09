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
export type ParamSpec = { key: string; label: string; required: boolean; type: "text" | "date" | "select"; placeholder?: string; options?: { value: string; label: string }[] };

export const CARRIER_PARAMS: Record<number, ParamSpec[]> = {
  2061: [{ key: "postal_code", label: "Postal Code", required: false, type: "text", placeholder: "1000" }],
  7041: [{ key: "postal_code", label: "Postal Code", required: false, type: "text", placeholder: "1000 AA" }],
  14041: [
    { key: "destination_country", label: "Destination Country (2-letter ISO)", required: true, type: "text", placeholder: "FR" },
    { key: "postal_code", label: "Postal Code", required: false, type: "text", placeholder: "1000 AA" },
  ],
  21051: [{ key: "mid", label: "MID Number", required: false, type: "text", placeholder: "123456" }],
  100003: [{ key: "ship_date", label: "Ship Date", required: false, type: "date", placeholder: "2024-01-01" }],
  100005: [{ key: "postal_code", label: "Postal Code", required: false, type: "text", placeholder: "Postal code" }],
  100010: [{ key: "postal_code", label: "Postal Code", required: false, type: "text", placeholder: "Postcode" }],
  100017: [{ key: "postal_code", label: "Postal Code", required: false, type: "text", placeholder: "Postal code" }],
  100024: [{ key: "postal_code", label: "Postal Code", required: false, type: "text", placeholder: "Postal code" }],
  100026: [{ key: "postal_code", label: "Postal Code", required: false, type: "text", placeholder: "1000 AA" }],
  100027: [{ key: "postal_code", label: "Postal Code", required: false, type: "text", placeholder: "12345" }],
  100060: [{ key: "number_type", label: "Number Type", required: false, type: "select", placeholder: "1", options: [{ value: "1", label: "AWB" }, { value: "2", label: "Order Id" }, { value: "3", label: "LRN" }] }],
  100074: [{ key: "phone_number_last_4", label: "Phone Number (last 4 digits)", required: true, type: "text", placeholder: "8888" }],
  100078: [{ key: "postal_code", label: "Postal Code", required: false, type: "text", placeholder: "1000" }],
  100086: [{ key: "phone_number_last_4", label: "Phone Number (last 4 digits)", required: true, type: "text", placeholder: "88888" }],
  100155: [{ key: "postal_code", label: "Postal Code", required: false, type: "text", placeholder: "1000" }],
  100167: [{ key: "postal_code", label: "Postal Code", required: true, type: "text", placeholder: "LS27 0BN" }],
  100189: [{ key: "postal_code", label: "Postal Code", required: true, type: "text", placeholder: "123456" }],
  100207: [{ key: "postal_code", label: "Postal Code", required: false, type: "text", placeholder: "Postal code" }],
  100221: [{ key: "number_type", label: "Number Type", required: false, type: "select", placeholder: "1", options: [{ value: "1", label: "PRO Number" }, { value: "2", label: "BOL Number" }, { value: "3", label: "Purchase Order Number" }] }],
  100268: [
    { key: "number_type", label: "Number Type", required: false, type: "select", placeholder: "5", options: [{ value: "5", label: "Track Bar Code" }] },
    { key: "parameter", label: "Parameter", required: false, type: "text", placeholder: "1000000" },
  ],
};

export function CarrierSelect({ value, onChange, customCouriers = [] }: {
  value: string;
  onChange: (carrier: string, trackingUrlTemplate?: string | null) => void;
  customCouriers?: CustomCourier[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const standardFiltered = search.trim()
    ? CARRIERS_17TRACK.filter(c => c.label.toLowerCase().includes(search.toLowerCase()))
    : CARRIERS_17TRACK;
  const customFiltered = search.trim()
    ? customCouriers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : customCouriers;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full h-9 px-2.5 text-sm rounded-lg border border-input bg-background flex items-center justify-between gap-1 hover:border-blue-400 transition-colors"
      >
        <span className="truncate">{value || "Auto Detect"}</span>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 w-72 bg-background border border-border rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="flex items-center gap-1.5 h-7 px-2 rounded-lg bg-muted/60">
              <Search className="w-3 h-3 text-muted-foreground shrink-0" />
              <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search carriers..." className="flex-1 text-xs bg-transparent outline-none" />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto text-sm">
            <button type="button" onMouseDown={() => { onChange("Auto Detect", null); setOpen(false); setSearch(""); }} className="w-full text-left px-3 py-2 text-xs hover:bg-muted/50 font-medium">Auto Detect</button>
            {customFiltered.length > 0 && (
              <>
                <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/30">Custom Couriers</p>
                {customFiltered.map(c => (
                  <button key={c.id} type="button" onMouseDown={() => { onChange(c.name, c.trackingUrlTemplate); setOpen(false); setSearch(""); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50">
                    {c.name}
                  </button>
                ))}
              </>
            )}
            {standardFiltered.length > 0 && (
              <>
                <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/30">17track Carriers</p>
                {standardFiltered.map(c => (
                  <button key={c.code} type="button" onMouseDown={() => { onChange(c.label, null); setOpen(false); setSearch(""); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50">
                    {c.label}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Types for Parcels ────────────────────────────────────────
export interface ParcelItem { name: string; qty: number; productId?: string }
export interface ParcelEvent { date: string; status: string; location: string }
export interface GbParcel {
  id: string;
  groupBuyId: string;
  label: string;
  carrier: string;
  trackingNumber: string;
  status: string;
  statusCode: number | null;
  items: ParcelItem[];
  cachedEvents: ParcelEvent[];
  notes: string | null;
  trackingUrl: string | null;
  trackingParams?: Record<string, string>;
  lastChecked: string | null;
  createdAt: string;
}

export const PARCEL_STATUS_STYLES: Record<string, { label: string; color: string; bg: string; Icon: React.FC<{className?: string}> }> = {
  pending:          { label: "Pending",          color: "#6B7280", bg: "rgba(107,114,128,0.1)",  Icon: Clock },
  in_transit:       { label: "In Transit",       color: "#0891B2", bg: "rgba(8,145,178,0.1)",   Icon: Navigation },
  out_for_delivery: { label: "Out for Delivery", color: "#D97706", bg: "rgba(217,119,6,0.1)",   Icon: Truck },
  attempted:        { label: "Attempted",        color: "#9333EA", bg: "rgba(147,51,234,0.1)",  Icon: AlertCircle },
  delivered:        { label: "Delivered",        color: "#16A34A", bg: "rgba(22,163,74,0.1)",   Icon: CheckCircle2 },
  exception:        { label: "Exception",        color: "#DC2626", bg: "rgba(220,38,38,0.1)",   Icon: AlertCircle },
  expired:          { label: "Expired",          color: "#6B7280", bg: "rgba(107,114,128,0.1)", Icon: Clock },
};

export function ParcelStatusBadge({ status }: { status: string }) {
  const s = PARCEL_STATUS_STYLES[status] ?? PARCEL_STATUS_STYLES.pending;
  const { Icon } = s;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.color }}>
      <Icon className="w-3 h-3" />
      {s.label}
    </span>
  );
}

// ─── Parcel Form (create / edit) ──────────────────────────────
export function ParcelForm({ secret, gbId, initial, catalogProducts, onSave, onCancel }: {
  secret: string;
  gbId: string;
  initial?: GbParcel;
  catalogProducts: Product[];
  onSave: (p: GbParcel) => void;
  onCancel: () => void;
}) {
  const isCreate = !initial;
  const [label, setLabel] = useState(initial?.label ?? "");
  const [carrier, setCarrier] = useState(() => {
    const c = initial?.carrier ?? "Auto Detect";
    // Normalise legacy "Auto" value
    return c === "Auto" ? "Auto Detect" : c;
  });
  const [trackingNumber, setTrackingNumber] = useState(initial?.trackingNumber ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [trackingUrl, setTrackingUrl] = useState(initial?.trackingUrl ?? "");
  const [trackingParams, setTrackingParams] = useState<Record<string, string>>(initial?.trackingParams ?? {});
  const [items, setItems] = useState<ParcelItem[]>(initial?.items ?? []);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [customCouriers, setCustomCouriers] = useState<CustomCourier[]>([]);
  // Stores the active custom courier tracking URL template (null if none / standard carrier selected)
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);

  useEffect(() => {
    fetch(apiUrl("/admin/couriers"), { headers: { "x-admin-secret": secret } })
      .then(r => r.ok ? r.json() : [])
      .then((data: CustomCourier[]) => setCustomCouriers(data))
      .catch(() => {});
  }, [secret]);

  // Derive the carrier code + required param specs for the currently selected carrier
  const carrierEntry = CARRIERS_17TRACK.find(c => c.label === carrier);
  const currentParamSpecs: ParamSpec[] = carrierEntry ? (CARRIER_PARAMS[carrierEntry.code] ?? []) : [];

  const setParam = (key: string, value: string) =>
    setTrackingParams(prev => ({ ...prev, [key]: value }));

  // Reactively update tracking URL when tracking number changes and a template is active
  useEffect(() => {
    if (activeTemplate && trackingNumber.trim()) {
      setTrackingUrl(activeTemplate.replace(/\{tracking_number\}/gi, trackingNumber.trim()));
    }
  }, [trackingNumber, activeTemplate]);

  // When carrier changes, clear params that don't apply to the new carrier.
  // If a custom courier with a tracking URL template is selected, store the template
  // and immediately interpolate the current tracking number into the URL.
  const handleCarrierChange = (newCarrier: string, trackingUrlTemplate?: string | null) => {
    setCarrier(newCarrier);
    const newEntry = CARRIERS_17TRACK.find(c => c.label === newCarrier);
    const newSpecs = newEntry ? (CARRIER_PARAMS[newEntry.code] ?? []) : [];
    const validKeys = new Set(newSpecs.map(s => s.key));
    setTrackingParams(prev => {
      const filtered: Record<string, string> = {};
      for (const [k, v] of Object.entries(prev)) {
        if (validKeys.has(k)) filtered[k] = v;
      }
      return filtered;
    });
    if (trackingUrlTemplate !== undefined && trackingUrlTemplate !== null) {
      setActiveTemplate(trackingUrlTemplate);
      const interpolated = trackingNumber.trim()
        ? trackingUrlTemplate.replace(/\{tracking_number\}/gi, trackingNumber.trim())
        : trackingUrlTemplate;
      setTrackingUrl(interpolated);
    } else {
      setActiveTemplate(null);
    }
  };

  // Item entry state
  const [itemMode, setItemMode] = useState<"catalogue" | "custom" | "paste">("catalogue");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [customItemName, setCustomItemName] = useState("");
  const [itemQty, setItemQty] = useState("1");
  const [pasteText, setPasteText] = useState("");

  const addItem = () => {
    const qty = Math.max(1, parseInt(itemQty) || 1);
    if (itemMode === "catalogue") {
      const prod = catalogProducts.find(p => p.id === selectedProductId);
      if (!prod) return;
      setItems(prev => {
        const existing = prev.findIndex(i => i.productId === prod.id);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = { ...updated[existing], qty: updated[existing].qty + qty };
          return updated;
        }
        return [...prev, { name: prod.name, qty, productId: prod.id }];
      });
      setSelectedProductId("");
    } else {
      const name = customItemName.trim();
      if (!name) return;
      setItems(prev => {
        const existing = prev.findIndex(i => !i.productId && i.name.toLowerCase() === name.toLowerCase());
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = { ...updated[existing], qty: updated[existing].qty + qty };
          return updated;
        }
        return [...prev, { name, qty }];
      });
      setCustomItemName("");
    }
    setItemQty("1");
  };

  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));
  const updateItemQty = (idx: number, qty: number) => {
    if (qty < 1) { removeItem(idx); return; }
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, qty } : it));
  };

  const parsePaste = () => {
    const lines = pasteText.split(/\n+/).map(l => l.trim()).filter(Boolean);
    const toAdd: ParcelItem[] = [];
    for (const line of lines) {
      let namePart = line.replace(/^\d+\.\s+/, "").trim();
      let qty = 1;
      const prefixM = namePart.match(/^(\d+)\s*[xX×]\s+(.+)$/);
      const suffixM = namePart.match(/^(.+)\s+[xX×]\s*(\d+)$/);
      if (prefixM) { qty = Math.max(1, parseInt(prefixM[1])); namePart = prefixM[2].trim(); }
      else if (suffixM) { qty = Math.max(1, parseInt(suffixM[2])); namePart = suffixM[1].trim(); }
      if (!namePart) continue;
      const lower = namePart.toLowerCase();
      const matched = catalogProducts.find(p => p.name.toLowerCase() === lower)
        ?? catalogProducts.find(p => p.name.toLowerCase().includes(lower))
        ?? catalogProducts.find(p => lower.includes(p.name.toLowerCase()));
      toAdd.push(matched ? { name: matched.name, qty, productId: matched.id } : { name: namePart, qty });
    }
    setItems(prev => {
      let updated = [...prev];
      for (const item of toAdd) {
        const key = item.productId;
        const existing = key
          ? updated.findIndex(i => i.productId === key)
          : updated.findIndex(i => !i.productId && i.name.toLowerCase() === item.name.toLowerCase());
        if (existing >= 0) updated[existing] = { ...updated[existing], qty: updated[existing].qty + item.qty };
        else updated.push(item);
      }
      return updated;
    });
    setPasteText("");
    setItemMode("catalogue");
  };

  const handleSave = async () => {
    setError("");
    if (!label.trim()) { setError("Label is required"); return; }
    if (!trackingNumber.trim()) { setError("Tracking number is required"); return; }
    // Validate required carrier params
    for (const spec of currentParamSpecs) {
      if (spec.required && !trackingParams[spec.key]?.trim()) {
        setError(`${spec.label} is required for ${carrier}`);
        return;
      }
    }

    // Flush any pending (uncommitted) item selection so it isn't silently dropped
    let finalItems = [...items];
    const pendingQty = Math.max(1, parseInt(itemQty) || 1);
    if (itemMode === "catalogue" && selectedProductId) {
      const prod = catalogProducts.find(p => p.id === selectedProductId);
      if (prod) {
        const idx = finalItems.findIndex(i => i.productId === prod.id);
        if (idx >= 0) {
          finalItems = finalItems.map((it, i) => i === idx ? { ...it, qty: it.qty + pendingQty } : it);
        } else {
          finalItems = [...finalItems, { name: prod.name, qty: pendingQty, productId: prod.id }];
        }
      }
    } else if (itemMode === "custom") {
      const pendingName = customItemName.trim();
      if (pendingName) {
        const idx = finalItems.findIndex(i => !i.productId && i.name.toLowerCase() === pendingName.toLowerCase());
        if (idx >= 0) {
          finalItems = finalItems.map((it, i) => i === idx ? { ...it, qty: it.qty + pendingQty } : it);
        } else {
          finalItems = [...finalItems, { name: pendingName, qty: pendingQty }];
        }
      }
    }

    setSaving(true);
    try {
      const url = isCreate
        ? `/api/admin/group-buys/${gbId}/parcels`
        : `/api/admin/group-buys/${gbId}/parcels/${initial!.id}`;
      const method = isCreate ? "POST" : "PATCH";
      // Only send non-empty params
      const cleanParams: Record<string, string> = {};
      for (const [k, v] of Object.entries(trackingParams)) {
        if (v.trim()) cleanParams[k] = v.trim();
      }
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({
          label: label.trim(),
          carrier: carrier.trim(),
          trackingNumber: trackingNumber.trim(),
          items: finalItems,
          notes: notes.trim() || null,
          trackingUrl: trackingUrl.trim() || null,
          trackingParams: Object.keys(cleanParams).length > 0 ? cleanParams : null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({})) as { error?: string };
        setError(j.error ?? "Failed to save");
        return;
      }
      const parcel = await res.json() as GbParcel;
      onSave(parcel);
    } catch { setError("Network error"); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Label *</Label>
          <Input placeholder="e.g. Batch A — UK members" value={label} onChange={e => setLabel(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Tracking Number *</Label>
          <Input placeholder="GB12345678UK" value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Carrier</Label>
          <CarrierSelect value={carrier} onChange={handleCarrierChange} customCouriers={customCouriers} />
        </div>
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Custom Tracking URL <span className="text-muted-foreground font-normal">(for carriers not on 17track)</span></Label>
          <Input placeholder="https://gly-express.com/track?n=…" value={trackingUrl} onChange={e => setTrackingUrl(e.target.value)} />
        </div>
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Notes (internal only)</Label>
          <Input placeholder="Optional internal notes" value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
      </div>

      {/* Carrier-specific params */}
      {currentParamSpecs.length > 0 && (
        <div className="space-y-2 rounded-lg border border-teal-200 bg-teal-50/50 dark:border-teal-900 dark:bg-teal-950/30 p-3">
          <p className="text-xs font-semibold text-teal-700 dark:text-teal-400">
            {carrier} tracking parameters
          </p>
          <div className="grid grid-cols-2 gap-3">
            {currentParamSpecs.map(spec => (
              <div key={spec.key} className={cn("space-y-1", currentParamSpecs.length === 1 && "col-span-2")}>
                <Label className="text-xs">
                  {spec.label}
                  {spec.required ? <span className="text-red-500 ml-0.5">*</span> : <span className="text-muted-foreground ml-1 font-normal">(optional)</span>}
                </Label>
                {spec.type === "select" && spec.options ? (
                  <select
                    value={trackingParams[spec.key] ?? ""}
                    onChange={e => setParam(spec.key, e.target.value)}
                    className="w-full h-9 px-2 text-sm border border-input rounded-md bg-background"
                  >
                    <option value="">Select…</option>
                    {spec.options.map(o => (
                      <option key={o.value} value={o.value}>{o.value} — {o.label}</option>
                    ))}
                  </select>
                ) : (
                  <Input
                    type={spec.type === "date" ? "date" : "text"}
                    placeholder={spec.placeholder}
                    value={trackingParams[spec.key] ?? ""}
                    onChange={e => setParam(spec.key, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Items */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Items in this parcel</Label>

        {/* Mode toggle */}
        <div className="flex gap-1 border rounded-lg p-0.5 w-fit">
          {(["catalogue", "custom", "paste"] as const).map(mode => (
            <button key={mode}
              onClick={() => setItemMode(mode)}
              className={cn(
                "text-xs px-3 py-1 rounded-md font-medium transition-colors",
                itemMode === mode ? "bg-orange-500 text-white" : "text-muted-foreground hover:text-foreground"
              )}>
              {mode === "catalogue" ? "From Catalogue" : mode === "custom" ? "Custom" : "Paste List"}
            </button>
          ))}
        </div>

        {itemMode === "paste" ? (
          <div className="space-y-2">
            <textarea
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
              rows={5}
              placeholder={"Paste items here, one per line:\nBPC-157 5mg\nSemaglutide 1mg\n2x TB-500 2mg"}
              className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button onClick={parsePaste} disabled={!pasteText.trim()} size="sm" className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Import Items
            </Button>
          </div>
        ) : (
          <div className="flex gap-2 items-end">
            {itemMode === "catalogue" ? (
              <div className="flex-1 space-y-1">
                <select
                  value={selectedProductId}
                  onChange={e => setSelectedProductId(e.target.value)}
                  className="w-full h-9 px-2 text-sm border border-input rounded-md bg-background"
                >
                  <option value="">Select product…</option>
                  {catalogProducts.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex-1 space-y-1">
                <Input placeholder="Item name" value={customItemName} onChange={e => setCustomItemName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addItem()} />
              </div>
            )}
            <div className="w-16">
              <Input type="number" min="1" value={itemQty} onChange={e => setItemQty(e.target.value)} className="text-center" />
            </div>
            <Button variant="outline" size="icon" onClick={addItem}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        )}

        {items.length > 0 ? (
          <div className="space-y-1.5 mt-1">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 text-sm">
                <Box className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="flex-1 font-medium truncate">{item.name}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => updateItemQty(idx, item.qty - 1)}
                    className="w-5 h-5 rounded text-muted-foreground hover:bg-muted flex items-center justify-center text-xs">−</button>
                  <span className="w-6 text-center text-xs font-bold">{item.qty}</span>
                  <button onClick={() => updateItemQty(idx, item.qty + 1)}
                    className="w-5 h-5 rounded text-muted-foreground hover:bg-muted flex items-center justify-center text-xs">+</button>
                </div>
                <button onClick={() => removeItem(idx)} className="text-muted-foreground hover:text-red-500 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground py-2">No items added yet.</p>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button className="flex-1 gap-1.5" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isCreate ? "Add Parcel" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

// ─── Manual status editor ─────────────────────────────────────
export const GB_PARCEL_STATUSES_LIST = [
  "pending", "in_transit", "out_for_delivery", "attempted", "delivered", "exception", "expired",
] as const;

export function ManualStatusEditor({ secret, gbId, parcel, onSave, onCancel }: {
  secret: string; gbId: string; parcel: GbParcel;
  onSave: (p: GbParcel) => void; onCancel: () => void;
}) {
  const [status, setStatus] = useState(parcel.status);
  const [events, setEvents] = useState<ParcelEvent[]>(parcel.cachedEvents ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // New event form
  const today = new Date();
  const [newDate, setNewDate] = useState(() => `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`);
  const [newStatus, setNewStatus] = useState("");
  const [newLocation, setNewLocation] = useState("");

  function parseDMY(s: string): Date | null {
    const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return null;
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    if (isNaN(d.getTime())) return null;
    return d;
  }

  const addEvent = () => {
    if (!newStatus.trim()) return;
    const parsed = parseDMY(newDate);
    const ev: ParcelEvent = { date: (parsed ?? new Date()).toISOString(), status: newStatus.trim(), location: newLocation.trim() };
    setEvents(prev => [ev, ...prev]);
    setNewStatus(""); setNewLocation("");
  };

  const removeEvent = (i: number) => setEvents(prev => prev.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/admin/group-buys/${gbId}/parcels/${parcel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ status, cachedEvents: events }),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})) as any; setError(j.error ?? "Failed"); return; }
      onSave(await res.json() as GbParcel);
    } catch { setError("Network error"); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="font-semibold text-sm">Set Status — {parcel.label}</h3>
      </div>
      <Card className="p-4 space-y-4">
        {/* Status picker */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Overall Status</label>
          <div className="flex flex-wrap gap-2">
            {GB_PARCEL_STATUSES_LIST.map(s => {
              const st = PARCEL_STATUS_STYLES[s] ?? PARCEL_STATUS_STYLES.pending;
              return (
                <button key={s} type="button"
                  onClick={() => setStatus(s)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-semibold border transition-all",
                    status === s ? "ring-2 ring-offset-1" : "opacity-60 hover:opacity-100"
                  )}
                  style={{ background: status === s ? st.bg : "transparent", color: st.color, borderColor: st.color }}
                >
                  {st.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Add event */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Add Tracking Event</label>
          <div className="grid grid-cols-2 gap-2">
            <input type="text" inputMode="numeric" value={newDate} onChange={e => setNewDate(e.target.value)}
              placeholder="DD/MM/YYYY"
              className="col-span-2 px-3 py-1.5 text-xs border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground" />
            <input placeholder="Status description" value={newStatus} onChange={e => setNewStatus(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addEvent()}
              className="col-span-2 px-3 py-1.5 text-xs border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground" />
            <input placeholder="Location (optional)" value={newLocation} onChange={e => setNewLocation(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addEvent()}
              className="px-3 py-1.5 text-xs border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground" />
            <Button type="button" size="sm" onClick={addEvent} disabled={!newStatus.trim()} className="h-8 text-xs">
              <Plus className="w-3 h-3 mr-1" /> Add Event
            </Button>
          </div>
        </div>

        {/* Event list */}
        {events.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Events ({events.length})</label>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {events.map((ev, i) => (
                <div key={i} className="flex items-start gap-2 text-xs p-2 rounded-md bg-muted/30 border border-border">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{ev.status}</p>
                    <p className="text-muted-foreground">{ev.location && `${ev.location} · `}{new Date(ev.date).toLocaleString()}</p>
                  </div>
                  <button onClick={() => removeEvent(i)} className="text-muted-foreground hover:text-red-500 shrink-0 mt-0.5">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-2 pt-1">
          <Button onClick={handleSave} disabled={saving} className="flex-1 bg-orange-600 hover:bg-orange-700 text-white">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
            Save Status
          </Button>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </Card>
    </div>
  );
}

// ─── Parcels sub-tab ──────────────────────────────────────────
export function ParcelsSubTab({ secret, gb }: { secret: string; gb: GroupBuy }) {
  const [parcels, setParcels] = useState<GbParcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [view, setView] = useState<"list" | "create" | { edit: GbParcel } | { manual: GbParcel }>("list");
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});

  const loadParcels = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/group-buys/${gb.id}/parcels`, { headers: { "x-admin-secret": secret } });
      if (res.ok) setParcels(await res.json() as GbParcel[]);
    } finally { setLoading(false); }
  }, [gb.id, secret]);

  const loadCatalog = useCallback(async () => {
    const res = await fetch(`/api/admin/group-buys/${gb.id}/products-catalog`, { headers: { "x-admin-secret": secret } });
    if (res.ok) setCatalogProducts(await res.json() as Product[]);
  }, [gb.id, secret]);

  useEffect(() => { loadParcels(); loadCatalog(); }, [loadParcels, loadCatalog]);

  const handleRefresh = async (parcel: GbParcel) => {
    setRefreshing(parcel.id);
    try {
      const res = await fetch(`/api/admin/group-buys/${gb.id}/parcels/${parcel.id}/refresh`, {
        method: "POST",
        headers: { "x-admin-secret": secret },
      });
      const data = await res.json().catch(() => ({})) as Record<string, unknown>;
      if (res.ok) {
        const { _refreshWarning, ...parcelData } = data;
        setParcels(prev => prev.map(p => p.id === parcel.id ? parcelData as unknown as GbParcel : p));
        if (_refreshWarning) {
          alert(`⚠️ ${_refreshWarning}`);
        }
      } else {
        alert(`Refresh failed (${res.status}): ${data?.error ?? "Unknown error"}`);
      }
    } catch (e: any) {
      alert(`Network error: ${e?.message ?? "Unknown"}`);
    } finally { setRefreshing(null); }
  };

  const handleDelete = async (parcel: GbParcel) => {
    if (!confirm(`Delete parcel "${parcel.label}"?`)) return;
    setDeleting(parcel.id);
    try {
      await fetch(`/api/admin/group-buys/${gb.id}/parcels/${parcel.id}`, {
        method: "DELETE",
        headers: { "x-admin-secret": secret },
      });
      setParcels(prev => prev.filter(p => p.id !== parcel.id));
    } finally { setDeleting(null); }
  };

  const toggleEvents = (id: string) => setExpandedEvents(prev => ({ ...prev, [id]: !prev[id] }));

  if (typeof view === "object" && "manual" in view) {
    return (
      <ManualStatusEditor
        secret={secret}
        gbId={gb.id}
        parcel={view.manual}
        onSave={updated => { setParcels(prev => prev.map(p => p.id === updated.id ? updated : p)); setView("list"); }}
        onCancel={() => setView("list")}
      />
    );
  }

  if (view === "create" || (typeof view === "object" && "edit" in view)) {
    const initial = typeof view === "object" && "edit" in view ? view.edit : undefined;
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setView("list")} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="font-semibold text-sm">{initial ? "Edit Parcel" : "Add Parcel"}</h3>
        </div>
        <Card className="p-4">
          <ParcelForm
            secret={secret}
            gbId={gb.id}
            initial={initial}
            catalogProducts={catalogProducts}
            onSave={parcel => {
              setParcels(prev =>
                initial
                  ? prev.map(p => p.id === parcel.id ? parcel : p)
                  : [...prev, parcel]
              );
              setView("list");
            }}
            onCancel={() => setView("list")}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Parcels</h3>
          <p className="text-xs text-muted-foreground">Tracking numbers and contents, masked for customers</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={loadParcels} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
          <Button className="gap-1.5 text-xs h-8" onClick={() => setView("create")}>
            <Plus className="w-3.5 h-3.5" />
            Add Parcel
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : parcels.length === 0 ? (
        <Card className="p-8 text-center">
          <Package className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-40" />
          <p className="text-sm text-muted-foreground">No parcels yet. Add tracking info for this group buy.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {parcels.map(parcel => {
            const events = parcel.cachedEvents ?? [];
            const showEvents = expandedEvents[parcel.id];
            return (
              <Card key={parcel.id} className="overflow-hidden">
                <div className="p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm truncate">{parcel.label}</span>
                        <ParcelStatusBadge status={parcel.status} />
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-muted-foreground">{parcel.carrier}</span>
                        <span className="font-mono text-xs text-orange-500 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded select-all">
                          {parcel.trackingNumber}
                        </span>
                        <button
                          onClick={() => navigator.clipboard.writeText(parcel.trackingNumber)}
                          className="text-muted-foreground hover:text-orange-500 transition-colors"
                          title="Copy tracking number"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        {parcel.trackingUrl && (
                          <a
                            href={parcel.trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 hover:underline"
                            title="Open carrier tracking page"
                          >
                            <Globe className="w-3 h-3" />
                            Track
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="outline" size="icon" className="h-7 w-7"
                        onClick={() => handleRefresh(parcel)} disabled={refreshing === parcel.id}
                        title="Refresh from 17track">
                        <RefreshCw className={cn("w-3.5 h-3.5", refreshing === parcel.id && "animate-spin")} />
                      </Button>
                      <Button variant="outline" size="icon" className="h-7 w-7 text-teal-600 hover:bg-teal-50"
                        onClick={() => setView({ manual: parcel })}
                        title="Set status manually">
                        <MapPin className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-7 w-7"
                        onClick={() => setView({ edit: parcel })}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50"
                        onClick={() => handleDelete(parcel)} disabled={deleting === parcel.id}>
                        {deleting === parcel.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  </div>

                  {/* Items — show a compact count only to avoid exposing product names on the card */}
                  {parcel.items.length > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 w-fit">
                      <Box className="w-3 h-3" />
                      {parcel.items.reduce((s, it) => s + it.qty, 0)}&nbsp;item{parcel.items.reduce((s, it) => s + it.qty, 0) !== 1 ? "s" : ""}
                    </span>
                  )}

                  {/* Last checked */}
                  {parcel.lastChecked && (
                    <p className="text-[11px] text-muted-foreground">
                      Last checked: {new Date(parcel.lastChecked).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}

                  {/* Events toggle */}
                  {events.length > 0 && (
                    <button
                      onClick={() => toggleEvents(parcel.id)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showEvents ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      {showEvents ? "Hide" : "Show"} {events.length} tracking event{events.length !== 1 ? "s" : ""}
                    </button>
                  )}

                  {showEvents && (
                    <div className="relative ml-2 pl-3 border-l-2 border-muted space-y-2 mt-1">
                      {events.map((ev, i) => (
                        <div key={i} className="relative">
                          <div className="absolute -left-[17px] top-1 w-2 h-2 rounded-full bg-muted-foreground/30" />
                          <p className="text-xs font-medium text-foreground">{ev.status}</p>
                          <div className="flex gap-2 text-[11px] text-muted-foreground">
                            {ev.date && <span>{new Date(ev.date).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>}
                            {ev.location && (
                              <span className="flex items-center gap-0.5">
                                <MapPin className="w-2.5 h-2.5" />{ev.location}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Waitlist Sub-Tab ─────────────────────────────────────────
