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
export type AdminReshipperAssignment = {
  id: string;
  gbId: string;
  reshipperUsername: string;
  country: string;
  countries: string[] | null;
  paymentTarget: string;
  enabled: boolean;
  enabledPaymentMethods: Record<string, boolean> | null;
  createdAt: string;
};

export type ApprovedReshipper = {
  telegramUsername: string;
  reshipperPaymentMethods?: Record<string, boolean> | null;
};

export const PAYMENT_METHODS: { key: string; label: string }[] = [
  { key: "usdtEnabled", label: "USDT / USDC" },
  { key: "revolutEnabled", label: "Revolut" },
  { key: "paypalEnabled", label: "PayPal" },
  { key: "cryptoEnabled", label: "Crypto" },
  { key: "anonPayEnabled", label: "AnonPay" },
];

export function AdminReshippersSubTab({ secret, gbId }: { secret: string; gbId: string }) {
  const [assignments, setAssignments] = useState<AdminReshipperAssignment[]>([]);
  const [approved, setApproved] = useState<ApprovedReshipper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newCountries, setNewCountries] = useState<string[]>([]);
  const [newCountryPick, setNewCountryPick] = useState(""); // picker for adding one country at a time
  const [newPaymentTarget, setNewPaymentTarget] = useState<"reshipper" | "admin">("reshipper");
  const [newPaymentMethods, setNewPaymentMethods] = useState<Record<string, boolean>>({});
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [assignRes, approvedRes] = await Promise.all([
        fetch(apiUrl(`/admin/group-buys/${gbId}/reshippers`), { headers: { "x-admin-secret": secret } }),
        fetch(apiUrl("/admin/approved-reshippers"), { headers: { "x-admin-secret": secret } }),
      ]);
      if (assignRes.ok) {
        setAssignments(await assignRes.json());
      } else {
        setError(`Failed to load assignments (${assignRes.status})`);
      }
      if (approvedRes.ok) setApproved(await approvedRes.json());
    } catch {
      setError("Failed to load reshipper data");
    } finally {
      setLoading(false);
    }
  }, [gbId, secret]);

  useEffect(() => { void load(); }, [load]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    if (!newUsername) { setAddError("Select a reshipper"); return; }
    if (newCountries.length === 0) { setAddError("Add at least one country"); return; }
    setAdding(true);
    try {
      const r = await fetch(apiUrl(`/admin/group-buys/${gbId}/reshippers`), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({
          reshipperUsername: newUsername,
          countries: newCountries,
          country: newCountries[0],
          paymentTarget: newPaymentTarget,
          enabledPaymentMethods: newPaymentMethods,
        }),
      });
      if (!r.ok) { const d = await r.json(); setAddError(d.error || "Failed to add"); return; }
      setNewUsername(""); setNewCountries([]); setNewCountryPick(""); setNewPaymentTarget("reshipper"); setNewPaymentMethods({}); setAddOpen(false);
      void load();
    } finally { setAdding(false); }
  };

  const addNewCountry = (code: string) => {
    if (!code || newCountries.includes(code)) return;
    setNewCountries(prev => [...prev, code]);
    setNewCountryPick("");
  };

  const removeNewCountry = (code: string) => setNewCountries(prev => prev.filter(c => c !== code));

  const addAllEu = () => {
    const euCodes = EU_COUNTRIES.map(c => c.code);
    setNewCountries(prev => [...new Set([...prev, ...euCodes])]);
  };

  const patchAssignment = async (a: AdminReshipperAssignment, body: Record<string, unknown>) => {
    setTogglingId(a.id);
    setActionError(null);
    try {
      const r = await fetch(apiUrl(`/admin/group-buys/${gbId}/reshippers/${a.reshipperUsername}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify(body),
      });
      if (r.ok) {
        void load();
      } else {
        const d = await r.json().catch(() => ({}));
        setActionError(d.error || `Failed to update (${r.status})`);
      }
    } catch {
      setActionError("Failed to update reshipper");
    } finally { setTogglingId(null); }
  };

  const handleRemove = async (a: AdminReshipperAssignment) => {
    const displayCountries = (a.countries && a.countries.length > 0 ? a.countries : [a.country]).join(", ");
    if (!confirm(`Remove @${a.reshipperUsername} from ${displayCountries}?`)) return;
    setRemovingId(a.id);
    setActionError(null);
    try {
      const r = await fetch(apiUrl(`/admin/group-buys/${gbId}/reshippers/${a.reshipperUsername}`), {
        method: "DELETE",
        headers: { "x-admin-secret": secret },
      });
      if (r.ok) {
        void load();
      } else {
        const d = await r.json().catch(() => ({}));
        setActionError(d.error || `Failed to remove (${r.status})`);
      }
    } catch {
      setActionError("Failed to remove reshipper");
    } finally { setRemovingId(null); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  if (error) return <p className="text-sm text-red-500 py-4">{error}</p>;

  return (
    <div className="space-y-3">
      {actionError && (
        <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
          {actionError}
          <button type="button" onClick={() => setActionError(null)} className="shrink-0 text-red-400 hover:text-red-600">✕</button>
        </p>
      )}
      {assignments.length === 0 && !addOpen ? (
        <div className="text-center py-8">
          <UserCheck className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground mb-3">No reshippers assigned to this group buy.</p>
        </div>
      ) : (
        assignments.map((a) => (
          <div key={a.id} className={cn("rounded-xl border p-3 space-y-2.5", a.enabled ? "border-border" : "border-border bg-muted/30 opacity-70")}>
            {/* Header row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <UserCheck className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm font-semibold truncate">@{a.reshipperUsername}</span>
                {/* Show all countries — blue for EU, grey for others */}
                {(a.countries && a.countries.length > 0 ? a.countries : [a.country]).map(c => {
                  const isEu = EU_COUNTRIES.some(e => e.code === c);
                  return (
                    <span key={c} className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded font-mono uppercase shrink-0", isEu ? "bg-blue-100 text-blue-700" : "bg-muted text-muted-foreground")}>
                      {c}
                    </span>
                  );
                })}
                {(a.countries && a.countries.length > 1) && (
                  <span className="text-[10px] text-muted-foreground">({a.countries.length} countries)</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => patchAssignment(a, { enabled: !a.enabled })}
                  disabled={togglingId === a.id}
                  className={cn(
                    "text-[10px] px-2 py-1 rounded-lg font-semibold border transition-colors",
                    a.enabled
                      ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                      : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                  )}
                >
                  {togglingId === a.id ? <Loader2 className="w-3 h-3 animate-spin inline" /> : (a.enabled ? "Active" : "Disabled")}
                </button>
                <button
                  onClick={() => handleRemove(a)}
                  disabled={removingId === a.id}
                  className="p-1 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  {removingId === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            {/* Payment target */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground font-medium w-16 shrink-0">Pay target:</span>
              {(["reshipper", "admin"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => patchAssignment(a, { paymentTarget: t })}
                  disabled={togglingId === a.id}
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded font-semibold border transition-colors capitalize",
                    a.paymentTarget === t
                      ? "bg-orange-50 border-orange-200 text-orange-700"
                      : "bg-muted border-border text-muted-foreground hover:bg-muted/60"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
            {/* Payment methods */}
            <div className="flex items-start gap-1.5 flex-wrap">
              <span className="text-[10px] text-muted-foreground font-medium w-16 shrink-0 pt-0.5">Methods:</span>
              <div className="flex flex-wrap gap-1">
                {PAYMENT_METHODS.map(m => {
                  const on = !!(a.enabledPaymentMethods?.[m.key]);
                  return (
                    <button
                      key={m.key}
                      onClick={() => patchAssignment(a, { enabledPaymentMethods: { ...(a.enabledPaymentMethods ?? {}), [m.key]: !on } })}
                      disabled={togglingId === a.id}
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded font-semibold border transition-colors",
                        on
                          ? "bg-blue-50 border-blue-200 text-blue-700"
                          : "bg-muted border-border text-muted-foreground hover:bg-muted/60"
                      )}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))
      )}

      {addOpen ? (
        <form onSubmit={handleAdd} className="rounded-xl border border-dashed border-border p-3 space-y-3 bg-muted/20">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Assign Reshipper</p>
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1 block">Reshipper</label>
            <select
              className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm focus:outline-none"
              value={newUsername}
              onChange={e => setNewUsername(e.target.value)}
            >
              <option value="">Select approved reshipper…</option>
              {approved
                .filter(r => !assignments.some(a => a.reshipperUsername === r.telegramUsername))
                .map(r => (
                  <option key={r.telegramUsername} value={r.telegramUsername}>@{r.telegramUsername}</option>
                ))
              }
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1 block">Countries</label>
            {/* Quick-add EU */}
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={addAllEu}
                className="text-[11px] px-2.5 py-1 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100 transition-colors"
              >
                🇪🇺 Add all EU ({EU_COUNTRIES.length})
              </button>
              {newCountries.some(c => EU_COUNTRIES.some(e => e.code === c)) && (
                <button
                  type="button"
                  onClick={() => setNewCountries(prev => prev.filter(c => !EU_COUNTRIES.some(e => e.code === c)))}
                  className="text-[11px] px-2.5 py-1 rounded-lg border border-red-200 bg-red-50 text-red-700 font-semibold hover:bg-red-100 transition-colors"
                >
                  Remove EU
                </button>
              )}
            </div>
            {/* Individual country picker */}
            <div className="flex gap-1.5 mb-2">
              <select
                className="flex-1 rounded-lg border border-input bg-background px-2 py-1.5 text-sm focus:outline-none"
                value={newCountryPick}
                onChange={e => setNewCountryPick(e.target.value)}
              >
                <option value="">Add a country…</option>
                {COUNTRY_LIST.filter(c => !newCountries.includes(c.code)).map(c => (
                  <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => addNewCountry(newCountryPick)}
                disabled={!newCountryPick}
                className="px-3 py-1 rounded-lg border border-input bg-muted text-xs font-semibold hover:bg-muted/70 disabled:opacity-40 transition-colors"
              >
                Add
              </button>
            </div>
            {/* Selected country chips */}
            {newCountries.length > 0 ? (
              <div className="flex flex-wrap gap-1 p-2 rounded-lg bg-muted/40 border border-border min-h-[36px]">
                {newCountries.map(c => {
                  const isEu = EU_COUNTRIES.some(e => e.code === c);
                  return (
                    <span key={c} className={cn("inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded font-mono", isEu ? "bg-blue-100 text-blue-700" : "bg-muted text-muted-foreground")}>
                      {c}
                      <button type="button" onClick={() => removeNewCountry(c)} className="ml-0.5 text-[10px] hover:text-red-500 transition-colors leading-none">✕</button>
                    </span>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground italic">No countries selected</p>
            )}
          </div>
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1 block">Payment Target</label>
            <div className="flex gap-2">
              {(["reshipper", "admin"] as const).map(t => (
                <label key={t} className="flex items-center gap-1.5 text-xs cursor-pointer capitalize">
                  <input type="radio" name="paymentTarget" value={t} checked={newPaymentTarget === t} onChange={() => setNewPaymentTarget(t)} />
                  {t}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1 block">Accepted Payment Methods</label>
            <div className="flex flex-wrap gap-1.5">
              {PAYMENT_METHODS.map(m => {
                const on = !!(newPaymentMethods[m.key]);
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setNewPaymentMethods(prev => ({ ...prev, [m.key]: !on }))}
                    className={cn(
                      "text-xs px-2.5 py-1 rounded-lg font-semibold border transition-colors",
                      on
                        ? "bg-blue-50 border-blue-200 text-blue-700"
                        : "bg-muted border-border text-muted-foreground hover:bg-muted/60"
                    )}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>
          {addError && <p className="text-xs text-red-500">{addError}</p>}
          <div className="flex gap-2">
            <Button size="sm" type="submit" disabled={adding} className="gap-1.5">
              {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Assign
            </Button>
            <Button size="sm" type="button" variant="ghost" onClick={() => { setAddOpen(false); setAddError(null); setNewCountries([]); setNewCountryPick(""); setNewPaymentMethods({}); }}>Cancel</Button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="w-full rounded-xl border border-dashed border-border py-2 text-xs font-semibold text-muted-foreground hover:bg-muted/40 transition-colors flex items-center justify-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />Assign Reshipper
        </button>
      )}
    </div>
  );
}

// ─── Admin Shared Shipping Sub-tab ────────────────────────────
