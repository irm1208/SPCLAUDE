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
export type RuleFormat = "standard" | "info" | "warning" | "important";
export interface Rule { id: string; text: string; enabled: boolean; format: RuleFormat; }

export const FORMAT_LABELS: Record<RuleFormat, string> = {
  standard: "Standard",
  info: "Info",
  warning: "Warning",
  important: "Important",
};
export const FORMAT_COLORS: Record<RuleFormat, string> = {
  standard: "text-slate-500",
  info: "text-blue-500",
  warning: "text-amber-500",
  important: "text-red-500",
};

export function RulesetEditorPanel({ secret }: { secret: string }) {
  const [version, setVersion] = useState<number | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [acceptances, setAcceptances] = useState<{ accountId: string; version: number; acceptedAt: string }[]>([]);
  const [totalAccepted, setTotalAccepted] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [bumpVersion, setBumpVersion] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const fetchData = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/admin/ruleset", { headers: { "x-admin-secret": secret } });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setVersion(data.version);
      setRules(Array.isArray(data.rules) ? data.rules : []);
      setAcceptances(data.acceptances ?? []);
      setTotalAccepted(data.totalAccepted ?? 0);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed to load"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const updateRule = (id: string, patch: Partial<Rule>) => {
    setRules(rs => rs.map(r => r.id === id ? { ...r, ...patch } : r));
    setDirty(true);
  };
  const addRule = () => {
    setRules(rs => [...rs, { id: crypto.randomUUID(), text: "", enabled: true, format: "standard" }]);
    setDirty(true);
  };
  const removeRule = (id: string) => { setRules(rs => rs.filter(r => r.id !== id)); setDirty(true); };
  const moveRule = (idx: number, dir: -1 | 1) => {
    const arr = [...rules];
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    setRules(arr); setDirty(true);
  };

  const handleSave = async () => {
    const validRules = rules.filter(r => r.text.trim().length > 0);
    if (validRules.length === 0) { setError("Add at least one rule."); return; }
    if (bumpVersion) {
      const confirmed = window.confirm(
        `Bumping to v${(version ?? 0) + 1} will require ALL members to re-accept before joining GBs or placing orders. Proceed?`
      );
      if (!confirmed) return;
    }
    setSaving(true); setError(null); setSuccess(null);
    try {
      const res = await fetch("/api/admin/ruleset", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ rules: validRules, bumpVersion }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setVersion(data.version);
      setRules(data.rules ?? validRules);
      setDirty(false); setBumpVersion(false);
      setSuccess(bumpVersion ? `Saved — now v${data.version}. All members must re-accept.` : "Rules saved successfully.");
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  };

  const filtered = acceptances.filter(a => !search || a.accountId.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      {/* Version header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs text-muted-foreground">Current version</p>
          <p className="text-2xl font-bold">v{version ?? "—"}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Accepted (current version)</p>
          <p className="text-lg font-semibold">{totalAccepted} member{totalAccepted !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {error && <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}
      {success && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2">{success}</p>}

      {/* Rules list */}
      <div className="space-y-2">
        {rules.map((rule, i) => (
          <div key={rule.id} className={cn("rounded-xl border p-3 space-y-2 transition-opacity", !rule.enabled && "opacity-50")} style={{ background: "var(--adm-surface, #fff)" }}>
            <div className="flex items-start gap-2">
              {/* Enabled toggle */}
              <button
                onClick={() => updateRule(rule.id, { enabled: !rule.enabled })}
                className="mt-0.5 shrink-0"
                title={rule.enabled ? "Disable rule" : "Enable rule"}
              >
                {rule.enabled
                  ? <ToggleRight className="w-5 h-5 text-green-500" />
                  : <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                }
              </button>

              {/* Text */}
              <textarea
                value={rule.text}
                onChange={e => updateRule(rule.id, { text: e.target.value })}
                rows={2}
                placeholder="Rule text…"
                className="flex-1 resize-none rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary leading-relaxed"
              />

              {/* Actions */}
              <div className="flex flex-col gap-1 shrink-0">
                <button onClick={() => moveRule(i, -1)} disabled={i === 0} className="p-1 rounded hover:bg-muted disabled:opacity-30 transition-colors">
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => moveRule(i, 1)} disabled={i === rules.length - 1} className="p-1 rounded hover:bg-muted disabled:opacity-30 transition-colors">
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => removeRule(rule.id)} className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Format selector */}
            <div className="flex items-center gap-2 pl-7">
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Format</span>
              <div className="flex gap-1">
                {(["standard", "info", "warning", "important"] as RuleFormat[]).map(fmt => (
                  <button
                    key={fmt}
                    onClick={() => updateRule(rule.id, { format: fmt })}
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-colors",
                      rule.format === fmt
                        ? `border-current ${FORMAT_COLORS[fmt]} bg-current/10`
                        : "border-transparent text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {FORMAT_LABELS[fmt]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" onClick={addRule} className="gap-1.5">
        <Plus className="w-3.5 h-3.5" /> Add Rule
      </Button>

      {/* Save controls */}
      <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-border">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={bumpVersion} onChange={e => setBumpVersion(e.target.checked)} className="rounded" />
          <span className="text-sm text-muted-foreground">
            Bump version <span className="font-semibold text-foreground">(v{version ?? "?"} → v{(version ?? 0) + 1})</span>
            <span className="text-[10px] block text-muted-foreground">Forces all members to re-accept</span>
          </span>
        </label>
        <Button
          onClick={handleSave}
          disabled={saving || (!dirty && !bumpVersion)}
          size="sm"
          className="gap-1.5"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {bumpVersion ? "Save & Bump Version" : "Save Rules"}
        </Button>
      </div>

      {/* Acceptances table */}
      {acceptances.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">Acceptances — all versions ({filtered.length}{search ? " filtered" : ""} / {acceptances.length} total)</h3>
            <input
              type="text"
              placeholder="Search by member…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs w-44 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_auto] text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-slate-50 px-4 py-2 gap-3">
              <span>Member</span><span>Version</span><span>Accepted</span>
            </div>
            <div className="divide-y divide-border">
              {paged.map(a => (
                <div key={`${a.accountId}-${a.version}`} className="grid grid-cols-[1fr_auto_auto] px-4 py-2.5 gap-3 items-center bg-white text-xs">
                  <span className="font-medium truncate">@{a.accountId}</span>
                  <span className="text-muted-foreground">v{a.version}</span>
                  <span className="text-muted-foreground whitespace-nowrap">{new Date(a.acceptedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
                </div>
              ))}
            </div>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">Page {safePage} of {totalPages}</span>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1} className="px-2 py-1 rounded border border-border text-xs disabled:opacity-40 hover:bg-muted transition-colors">‹ Prev</button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} className="px-2 py-1 rounded border border-border text-xs disabled:opacity-40 hover:bg-muted transition-colors">Next ›</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────
