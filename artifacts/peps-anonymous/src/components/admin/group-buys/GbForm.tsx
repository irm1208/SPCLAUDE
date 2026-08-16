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
import { Switch } from "./shared/settings-ui";
import type { GroupBuy, InfoCard, ShippingOption, EntryFeePayment, GbPaymentConfig, GBProduct, DeliveryMethod, GBDeliveryMethod, Member, Product, CustomCourier } from "./shared/core";
export type GBFormData = {
  name: string; description: string; status: string; closeDate: string;
  manufacturer: string; manufacturerCountry: string; invitePin: string;
  pinEnabled: boolean;
  currency: string; memberLimit: string; minMembers: string;
  maxKitsPerCustomer: string; maxKitsTotal: string; hiddenFromList: boolean;
  sortOrder: string; labTestSupplier: string;
  allowedCountries: string[];
  excludedCountries: string[];
  blockedAccounts: string[];
};

export function GBForm({ secret, initial, hideStatus, onSave, onCancel }: {
  secret: string;
  initial?: GroupBuy;
  hideStatus?: boolean;
  onSave: (gb: GroupBuy) => void;
  onCancel: () => void;
}) {
  const toLocal = (dt: unknown) => {
    if (!dt) return "";
    try { return new Date(dt as string).toISOString().slice(0, 16); } catch { return ""; }
  };

  const [form, setForm] = useState<GBFormData>({
    name: (initial?.name ?? "") as string,
    description: (initial?.description ?? "") as string,
    status: (initial?.status ?? "draft") as string,
    closeDate: toLocal(initial?.closeDate),
    manufacturer: (initial?.manufacturer ?? "") as string,
    manufacturerCountry: (initial?.manufacturerCountry ?? "") as string,
    invitePin: (initial?.invitePin ?? "") as string,
    pinEnabled: !!(initial?.invitePin),
    currency: (initial?.currency ?? "GBP") as string,
    memberLimit: initial?.memberLimit != null ? String(initial.memberLimit) : "",
    minMembers: initial?.minMembers != null ? String(initial.minMembers) : "",
    maxKitsPerCustomer: initial?.maxKitsPerCustomer != null ? String(initial.maxKitsPerCustomer) : "",
    maxKitsTotal: initial?.maxKitsTotal != null ? String(initial.maxKitsTotal) : "",
    hiddenFromList: (initial?.hiddenFromList ?? false) as boolean,
    sortOrder: initial?.sortOrder != null ? String(initial.sortOrder) : "",
    labTestSupplier: (initial?.labTestSupplier ?? "") as string,
    allowedCountries: (initial?.allowedCountries ?? []) as string[],
    excludedCountries: (initial?.excludedCountries ?? []) as string[],
    blockedAccounts: (initial?.blockedAccounts ?? []) as string[],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blockQuery, setBlockQuery] = useState("");
  const [blockSuggestions, setBlockSuggestions] = useState<string[]>([]);
  const [blockFocused, setBlockFocused] = useState(false);
  const blockInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!blockQuery.trim()) { setBlockSuggestions([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await fetch(apiUrl(`/admin/search-users?q=${encodeURIComponent(blockQuery.replace(/^@/, ""))}`), {
          headers: { "x-admin-secret": secret },
        });
        if (r.ok) setBlockSuggestions((await r.json() as string[]).filter((u: string) => !form.blockedAccounts.includes(u)));
      } catch { /* ignore */ }
    }, 200);
    return () => clearTimeout(t);
  }, [blockQuery, secret, form.blockedAccounts]);

  const addBlockedAccount = (val: string) => {
    const u = val.trim().replace(/^@/, "");
    if (!u) return;
    if (!form.blockedAccounts.includes(u)) setForm(p => ({ ...p, blockedAccounts: [...p.blockedAccounts, u] }));
    setBlockQuery("");
    setBlockSuggestions([]);
    blockInputRef.current?.focus();
  };

  const f = (field: keyof GBFormData, val: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Name is required"); return; }
    setSaving(true); setError(null);
    const body = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      ...(hideStatus ? {} : { status: form.status }),
      closeDate: form.closeDate ? new Date(form.closeDate).toISOString() : null,
      manufacturer: form.manufacturer.trim() || null,
      manufacturerCountry: form.manufacturerCountry.trim() || null,
      invitePin: form.pinEnabled ? (form.invitePin.trim() || null) : null,
      currency: form.currency || "GBP",
      memberLimit: form.memberLimit !== "" ? parseInt(form.memberLimit) : null,
      minMembers: form.minMembers !== "" ? parseInt(form.minMembers) : null,
      maxKitsPerCustomer: form.maxKitsPerCustomer !== "" ? parseInt(form.maxKitsPerCustomer) : null,
      maxKitsTotal: form.maxKitsTotal !== "" ? parseInt(form.maxKitsTotal) : null,
      hiddenFromList: form.hiddenFromList,
      sortOrder: form.sortOrder !== "" ? parseInt(form.sortOrder) : null,
      labTestSupplier: form.labTestSupplier.trim() || null,
      allowedCountries: form.allowedCountries.length > 0 ? form.allowedCountries : null,
      excludedCountries: form.excludedCountries.length > 0 ? form.excludedCountries : null,
      blockedAccounts: form.blockedAccounts.length > 0 ? form.blockedAccounts : null,
    };
    try {
      const url = initial ? apiUrl(`/admin/group-buys/${initial.id}`) : apiUrl("/admin/group-buys");
      const method = initial ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error || "Failed to save"); setSaving(false); return; }
      onSave(await res.json());
    } catch { setError("Network error"); }
    setSaving(false);
  };

  const toggle = (field: "hiddenFromList") =>
    setForm(p => ({ ...p, [field]: !p[field] }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label className="text-sm font-medium">Name *</Label>
        <Input value={form.name} onChange={e => f("name", e.target.value)} placeholder="Group Buy Name" />
      </div>
      <div className="space-y-1">
        <Label className="text-sm font-medium">Description</Label>
        <textarea rows={2} value={form.description} onChange={e => f("description", e.target.value)}
          placeholder="Describe this group buy…"
          className="w-full rounded-xl border border-input bg-background px-4 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none" />
      </div>
      {!hideStatus && (
        <div className="space-y-1">
          <Label className="text-sm font-medium">Status</Label>
          <select value={form.status} onChange={e => f("status", e.target.value)}
            className="w-full h-9 rounded-xl border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary">
            {["draft", "active", "closed", "archived"].map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-sm font-medium">Close Date</Label>
          <Input type="datetime-local" value={form.closeDate} onChange={e => f("closeDate", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-sm font-medium">Currency</Label>
          <select value={form.currency} onChange={e => f("currency", e.target.value)}
            className="w-full h-9 rounded-xl border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary">
            {["GBP", "USD", "EUR"].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-sm font-medium">Manufacturer</Label>
          <Input value={form.manufacturer} onChange={e => f("manufacturer", e.target.value)} placeholder="e.g. ChemLab Ltd" />
        </div>
        <div className="space-y-1">
          <Label className="text-sm font-medium">Manufacturer Country</Label>
          <select value={form.manufacturerCountry} onChange={e => f("manufacturerCountry", e.target.value)}
            className="w-full h-9 rounded-xl border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="">— None —</option>
            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Invite PIN</Label>
            <button
              type="button"
              onClick={() => f("pinEnabled", !form.pinEnabled)}
              className="text-xs px-2 py-0.5 rounded-md font-medium transition-colors"
              style={form.pinEnabled
                ? { background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }
                : { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}
            >
              {form.pinEnabled ? "On" : "Off"}
            </button>
          </div>
          {form.pinEnabled && (
            <Input
              value={form.invitePin}
              onChange={e => f("invitePin", e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="e.g. 1234"
              maxLength={4}
            />
          )}
          {!form.pinEnabled && (
            <p className="text-[11px] text-muted-foreground">Anyone with the GB ID can join freely</p>
          )}
        </div>
        <div className="space-y-1">
          <Label className="text-sm font-medium">Sort Order</Label>
          <Input type="number" value={form.sortOrder} onChange={e => f("sortOrder", e.target.value)} placeholder="0" />
        </div>
        <div className="space-y-1">
          <Label className="text-sm font-medium">Member Limit</Label>
          <Input type="number" min={1} value={form.memberLimit} onChange={e => f("memberLimit", e.target.value)} placeholder="Unlimited" />
        </div>
        <div className="space-y-1">
          <Label className="text-sm font-medium">Min Members</Label>
          <Input type="number" min={1} value={form.minMembers} onChange={e => f("minMembers", e.target.value)} placeholder="None" />
        </div>
        <div className="space-y-1">
          <Label className="text-sm font-medium">Max Kits / Customer</Label>
          <Input type="number" min={1} value={form.maxKitsPerCustomer} onChange={e => f("maxKitsPerCustomer", e.target.value)} placeholder="Unlimited" />
        </div>
        <div className="space-y-1">
          <Label className="text-sm font-medium">Max Kits Total</Label>
          <Input type="number" min={1} value={form.maxKitsTotal} onChange={e => f("maxKitsTotal", e.target.value)} placeholder="Unlimited" />
        </div>
      </div>

      {/* Country Restrictions */}
      <div className="rounded-xl border border-border p-3 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Country Restrictions — who can join &amp; order</p>
        <p className="text-[11px] text-muted-foreground">
          <strong>Allowed:</strong> only these countries can order (leave empty = all countries allowed).<br />
          <strong>Excluded:</strong> these countries are blocked from ordering.
        </p>
        {(["allowedCountries", "excludedCountries"] as const).map(field => {
          const euCodes = EU_COUNTRIES.map(c => c.code);
          const hasEu = euCodes.every(c => form[field].includes(c));
          const hasAnyEu = euCodes.some(c => form[field].includes(c));
          const isAllowed = field === "allowedCountries";
          const chipBg = isAllowed ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)";
          const chipColor = isAllowed ? "#16a34a" : "#dc2626";
          const addCodes = (codes: string[]) =>
            setForm(p => ({ ...p, [field]: [...p[field], ...codes.filter(c => !p[field].includes(c))] }));
          const removeCodes = (codes: string[]) =>
            setForm(p => ({ ...p, [field]: p[field].filter(c => !codes.includes(c)) }));
          return (
            <div key={field} className="space-y-1.5">
              <Label className="text-sm font-medium">{isAllowed ? "Allowed Countries" : "Excluded Countries"}</Label>

              {/* Quick-action buttons */}
              <div className="flex flex-wrap gap-1.5">
                {!hasEu && (
                  <button type="button"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                    onClick={() => addCodes(euCodes)}>
                    🇪🇺 Add all EU
                  </button>
                )}
                {hasAnyEu && (
                  <button type="button"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                    onClick={() => removeCodes(euCodes)}>
                    Remove EU
                  </button>
                )}
                {!form[field].includes("GB") || !form[field].includes("UK") ? (
                  <button type="button"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors"
                    onClick={() => addCodes(["GB", "UK"])}>
                    🇬🇧 Add GB + UK
                  </button>
                ) : (
                  <button type="button"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors"
                    onClick={() => removeCodes(["GB", "UK"])}>
                    Remove GB + UK
                  </button>
                )}
              </div>

              {/* Selected country chips */}
              {form[field].length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {form[field].map(c => (
                    <span key={c} className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: chipBg, color: chipColor }}>
                      {COUNTRY_LIST.find(x => x.code === c.toUpperCase() || x.name === c)?.name ?? c}
                      {" "}({c})
                      <button type="button" className="hover:opacity-70"
                        onClick={() => setForm(p => ({ ...p, [field]: p[field].filter(x => x !== c) }))}>×</button>
                    </span>
                  ))}
                </div>
              )}

              {/* Single-country dropdown */}
              <select
                className="w-full h-9 rounded-xl border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value=""
                onChange={e => {
                  const val = e.target.value;
                  if (!val) return;
                  setForm(p => ({ ...p, [field]: p[field].includes(val) ? p[field] : [...p[field], val] }));
                  e.target.value = "";
                }}>
                <option value="">— Add a country —</option>
                {COUNTRY_LIST.filter(c => !form[field].includes(c.code)).map(c => (
                  <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                ))}
                {/* UK alias — always show if not already added */}
                {!form[field].includes("UK") && <option value="UK">United Kingdom (UK alias)</option>}
              </select>
            </div>
          );
        })}
      </div>

      {/* Blocked Accounts */}
      <div className="rounded-xl border border-border p-3 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Blocked Accounts</p>
        <p className="text-[11px] text-muted-foreground">These usernames cannot see or join this group buy.</p>
        {form.blockedAccounts.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {form.blockedAccounts.map(u => (
              <span key={u} className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: "rgba(239,68,68,0.15)", color: "#dc2626" }}>
                @{u}
                <button type="button" className="hover:opacity-70"
                  onClick={() => setForm(p => ({ ...p, blockedAccounts: p.blockedAccounts.filter(x => x !== u) }))}>×</button>
              </span>
            ))}
          </div>
        )}
        <div className="relative">
          <Input
            ref={blockInputRef}
            placeholder="Search username…"
            value={blockQuery}
            onChange={e => setBlockQuery(e.target.value)}
            onFocus={() => setBlockFocused(true)}
            onBlur={() => setTimeout(() => setBlockFocused(false), 150)}
            onKeyDown={e => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                if (blockSuggestions.length > 0) {
                  addBlockedAccount(blockSuggestions[0]);
                } else {
                  addBlockedAccount(blockQuery);
                }
              } else if (e.key === "Escape") {
                setBlockQuery("");
                setBlockSuggestions([]);
              }
            }}
          />
          {blockFocused && blockSuggestions.length > 0 && (
            <div className="absolute z-50 left-0 right-0 mt-1 rounded-xl border border-border bg-background shadow-lg overflow-hidden">
              {blockSuggestions.map(u => (
                <button
                  key={u}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
                  onMouseDown={() => addBlockedAccount(u)}>
                  <span className="text-muted-foreground text-xs">@</span>{u}
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">Type to search registered users, or press Enter to add any username.</p>
      </div>

      <div className="space-y-1">
        <Label className="text-sm font-medium">Lab Test Supplier</Label>
        <Input value={form.labTestSupplier} onChange={e => f("labTestSupplier", e.target.value)} placeholder="e.g. Janoshik" />
      </div>
      <div className="py-2 flex items-center justify-between gap-6 border-t border-border/70">
        <div>
          <p className="text-sm font-medium">Hidden from public list</p>
          <p className="text-xs text-muted-foreground mt-0.5">Members can still open the GB with a direct link.</p>
        </div>
        <Switch checked={form.hiddenFromList} onChange={() => toggle("hiddenFromList")} />
      </div>
      {initial && (
        <p className="text-[11px] text-muted-foreground">
          Admin Fee is configured in Settings → Payments. Paid Entry Fee setup and payment tracking is in the "Members" tab.
        </p>
      )}
      {error && <p className="text-sm text-destructive font-medium">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={saving} className="gap-1.5">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {initial ? "Save Changes" : "Create Group Buy"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

// ─── GB List ───────────────────────────────────────────────────
