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
export function EntryFeeCard({ secret, gb, onUpdate }: { secret: string; gb: GroupBuy; onUpdate: (gb: GroupBuy) => void }) {
  const [togglingEntryFee, setTogglingEntryFee] = useState(false);
  const [entryFeeAmount, setEntryFeeAmount] = useState(gb.entryFeeAmount != null ? String(gb.entryFeeAmount) : "");
  const [entryFeeLabel, setEntryFeeLabel] = useState(gb.entryFeeLabel ?? "");
  const [savingEntryFee, setSavingEntryFee] = useState(false);
  const [savedEntryFee, setSavedEntryFee] = useState(false);
  const [entryFeePayments, setEntryFeePayments] = useState<EntryFeePayment[] | null>(null);
  const [loadingEntryFeePayments, setLoadingEntryFeePayments] = useState(false);
  const [entryFeePaymentActionId, setEntryFeePaymentActionId] = useState<string | null>(null);

  const toggleEntryFee = async () => {
    setTogglingEntryFee(true);
    try {
      const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ entryFeeEnabled: !gb.entryFeeEnabled }),
      });
      if (res.ok) onUpdate(await res.json());
    } finally { setTogglingEntryFee(false); }
  };

  const saveEntryFee = async () => {
    setSavingEntryFee(true);
    try {
      const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({
          entryFeeAmount: entryFeeAmount.trim() ? parseFloat(entryFeeAmount) : null,
          entryFeeLabel: entryFeeLabel.trim() || null,
        }),
      });
      if (res.ok) {
        onUpdate(await res.json());
        setSavedEntryFee(true);
        setTimeout(() => setSavedEntryFee(false), 2000);
      }
    } finally { setSavingEntryFee(false); }
  };

  const loadEntryFeePayments = useCallback(async () => {
    setLoadingEntryFeePayments(true);
    try {
      const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}/entry-fee-payments`), {
        headers: { "x-admin-secret": secret },
      });
      if (res.ok) setEntryFeePayments(await res.json());
    } finally { setLoadingEntryFeePayments(false); }
  }, [gb.id, secret]);

  useEffect(() => { void loadEntryFeePayments(); }, [loadEntryFeePayments]);

  const setEntryFeePaymentStatus = async (paymentId: string, status: "confirmed" | "rejected") => {
    setEntryFeePaymentActionId(paymentId);
    try {
      const rejectionReason = status === "rejected" ? window.prompt("Rejection reason (optional):") ?? undefined : undefined;
      const res = await fetch(apiUrl(`/admin/group-buys/entry-fee-payments/${paymentId}/status`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ status, rejectionReason }),
      });
      if (res.ok) {
        const updated = await res.json();
        setEntryFeePayments(prev => prev ? prev.map(p => p.id === paymentId ? updated : p) : prev);
      }
    } finally { setEntryFeePaymentActionId(null); }
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-emerald-600" />
          <h3 className="font-semibold text-sm">Paid Entry Fee</h3>
        </div>
        <button
          type="button"
          onClick={toggleEntryFee}
          disabled={togglingEntryFee}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
            gb.entryFeeEnabled
              ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
              : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
          )}
        >
          {togglingEntryFee ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (gb.entryFeeEnabled ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />)}
          {gb.entryFeeEnabled ? "Enabled" : "Disabled"}
        </button>
      </div>
      <p className="text-xs text-muted-foreground mb-3">Requires customers to pay a one-time fee (crypto) before they can join. Membership is only granted once the payment is confirmed.</p>
      {gb.entryFeeEnabled && (
        <div className="space-y-3 mb-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Fee amount ({gb.currency})</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={entryFeeAmount}
                onChange={e => setEntryFeeAmount(e.target.value)}
                placeholder="e.g. 10.00"
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Fee label (optional)</label>
              <input
                type="text"
                value={entryFeeLabel}
                onChange={e => setEntryFeeLabel(e.target.value)}
                placeholder="e.g. Entry Fee, Membership Fee"
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <Button size="sm" onClick={saveEntryFee} disabled={savingEntryFee} className="gap-1.5">
            {savingEntryFee ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : savedEntryFee ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            {savedEntryFee ? "Saved" : "Save Fee"}
          </Button>
        </div>
      )}

      <div className="pt-3 border-t border-border space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-muted-foreground">Who's paid &amp; joined</h4>
          <Button size="sm" variant="outline" onClick={() => void loadEntryFeePayments()} disabled={loadingEntryFeePayments} className="gap-1.5 h-7 text-xs">
            {loadingEntryFeePayments ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Refresh
          </Button>
        </div>
        {entryFeePayments === null ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : entryFeePayments.length === 0 ? (
          <p className="text-xs text-muted-foreground">No entry fee payment attempts yet.</p>
        ) : (
          <div className="space-y-2">
            {entryFeePayments.map(p => (
              <div key={p.id} className="rounded-lg border border-border p-2.5 text-xs space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">@{p.accountId}</span>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0",
                    p.status === "confirmed" ? "bg-emerald-100 text-emerald-700" :
                    p.status === "rejected" ? "bg-red-100 text-red-700" :
                    p.status === "submitted" ? "bg-amber-100 text-amber-700" :
                    "bg-slate-100 text-slate-500"
                  )}>{p.status === "confirmed" ? "paid & joined" : p.status === "rejected" ? "tx rejected" : p.status === "submitted" ? "tx submitted — needs review" : p.status}</span>
                </div>
                <div className="text-muted-foreground">
                  {gb.currency}{p.amount.toFixed(2)}
                  {p.paymentTxHash && <> · tx: <span className="font-mono">{p.paymentTxHash.slice(0, 10)}…</span></>}
                  {p.paymentCryptoCurrency && <> ({p.paymentCryptoCurrency}{p.paymentCryptoNetwork ? ` / ${p.paymentCryptoNetwork}` : ""})</>}
                </div>
                {p.rejectionReason && <div className="text-red-600">Reason: {p.rejectionReason}</div>}
                {(p.status === "submitted" || p.status === "pending") && (
                  <div className="flex gap-1.5 pt-1">
                    <Button size="sm" onClick={() => void setEntryFeePaymentStatus(p.id, "confirmed")} disabled={entryFeePaymentActionId === p.id} className="h-6 px-2 text-[11px] gap-1">
                      {entryFeePaymentActionId === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      Confirm
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void setEntryFeePaymentStatus(p.id, "rejected")} disabled={entryFeePaymentActionId === p.id} className="h-6 px-2 text-[11px] gap-1">
                      <X className="w-3 h-3" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Members Sub-tab ──────────────────────────────────────────
export function MembersSubTab({ secret, gb, onUpdate }: { secret: string; gb: GroupBuy; onUpdate: (gb: GroupBuy) => void }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [addInput, setAddInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [editingTags, setEditingTags] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [savingTags, setSavingTags] = useState(false);
  const [togglingExtraOrder, setTogglingExtraOrder] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}/members`), { headers: { "x-admin-secret": secret } });
      if (res.ok) setMembers(await res.json());
    } catch {
      // Network error — leave list empty, user can refresh
    } finally {
      setLoading(false);
    }
  }, [secret, gb.id]);

  useEffect(() => { load(); }, [load]);

  const addMember = async () => {
    const tg = addInput.trim();
    if (!tg) return;
    setAdding(true); setMsg("");
    try {
      const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}/members`), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ telegramUsername: tg }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg(data.error ?? "Failed"); } else {
        setAddInput("");
        await load();
        setMsg(`${tg} added ✓`);
        setTimeout(() => setMsg(""), 3000);
      }
    } catch { setMsg("Network error"); }
    setAdding(false);
  };

  const removeMember = async (username: string) => {
    setRemoving(username);
    try {
      const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}/members/${encodeURIComponent(username)}`), {
        method: "DELETE", headers: { "x-admin-secret": secret },
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setMsg(d.error ?? "Failed to remove member"); }
      else setMembers(prev => prev.filter(m => m.telegramUsername !== username));
    } catch { setMsg("Network error"); }
    setRemoving(null);
  };

  const openTagEditor = (m: Member) => {
    setEditingTags(m.telegramUsername);
    setTagInput((m.tags ?? []).join(", "));
  };

  const saveTags = async (username: string) => {
    setSavingTags(true);
    const tags = tagInput.split(",").map(t => t.trim()).filter(Boolean);
    await fetch(apiUrl(`/admin/group-buys/${gb.id}/members/${encodeURIComponent(username)}/tags`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-secret": secret },
      body: JSON.stringify({ tags }),
    });
    setMembers(prev => prev.map(m => m.telegramUsername === username ? { ...m, tags } : m));
    setEditingTags(null);
    setSavingTags(false);
  };

  const toggleExtraOrder = async (username: string, current: boolean) => {
    setTogglingExtraOrder(username);
    try {
      const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}/members/${encodeURIComponent(username)}/allow-extra-order`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ allowExtraOrder: !current }),
      });
      if (res.ok) {
        setMembers(prev => prev.map(m => m.telegramUsername === username ? { ...m, allowExtraOrder: !current } : m));
      }
    } catch {
      // ignore network errors
    }
    setTogglingExtraOrder(null);
  };

  const minPct = gb.minMembers ? Math.min(100, Math.round((members.length / gb.minMembers) * 100)) : null;

  return (
    <div className="space-y-4">
      <EntryFeeCard secret={secret} gb={gb} onUpdate={onUpdate} />
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {!loading && (
            gb.memberLimit != null
              ? <span className={cn("font-medium", members.length >= gb.memberLimit ? "text-red-500" : "text-foreground")}>
                  {members.length} / {gb.memberLimit} members
                  {members.length >= gb.memberLimit && <span className="ml-2 text-xs font-normal">(limit reached)</span>}
                </span>
              : <span>{members.length} member{members.length !== 1 ? "s" : ""}</span>
          )}
        </div>
      </div>
      {!loading && gb.minMembers != null && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Min threshold: {gb.minMembers} members</span>
            <span className={cn("font-medium", members.length >= gb.minMembers ? "text-green-600" : "text-amber-600")}>
              {members.length >= gb.minMembers ? "✓ Threshold reached" : `${gb.minMembers - members.length} more needed`}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className={cn("h-full rounded-full transition-all", members.length >= gb.minMembers ? "bg-green-500" : "bg-amber-400")} style={{ width: `${minPct ?? 0}%` }} />
          </div>
        </div>
      )}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">@</span>
          <Input
            className="pl-7"
            placeholder="Telegram username"
            value={addInput}
            onChange={e => setAddInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addMember()}
          />
        </div>
        <Button onClick={addMember} disabled={adding || !addInput.trim()} className="gap-1.5">
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add
        </Button>
      </div>
      {msg && <p className={cn("text-sm", msg.includes("✓") ? "text-green-600" : "text-red-500")}>{msg}</p>}

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : members.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No members yet.</p>
      ) : (
        <div className="space-y-2">
          {members.map(m => (
            <div key={m.telegramUsername} className="border border-border rounded-xl bg-background">
              <div className="flex items-center gap-3 p-3">
                <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-orange-500">
                    {m.telegramUsername.slice(0, 1).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">@{m.telegramUsername}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    <span>Joined {new Date(m.joinedAt).toLocaleDateString("en-GB")}</span>
                    {m.hasPassword
                      ? <span className="text-green-600 flex items-center gap-0.5"><Shield className="w-3 h-3" />Password set</span>
                      : <span className="text-amber-500">No password</span>}
                    {m.accountStatus !== "active" && (
                      <span className="text-red-500">{m.accountStatus}</span>
                    )}
                  </div>
                  {m.tags && m.tags.length > 0 && editingTags !== m.telegramUsername && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {m.tags.map((t: string) => (
                        <span key={t} className="px-1.5 py-0.5 text-[10px] rounded-full bg-violet-100 text-violet-700">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => toggleExtraOrder(m.telegramUsername, m.allowExtraOrder)}
                  disabled={togglingExtraOrder === m.telegramUsername}
                  title={m.allowExtraOrder ? "Extra order allowed — click to revoke" : "Allow extra order"}
                  className={cn(
                    "p-1.5 rounded-lg disabled:opacity-50 transition-colors",
                    m.allowExtraOrder
                      ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {togglingExtraOrder === m.telegramUsername
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <RefreshCw className="w-4 h-4" />}
                </button>
                <button type="button" onClick={() => openTagEditor(m)} title="Edit tags" className="p-1.5 rounded-lg text-violet-400 hover:bg-violet-50 hover:text-violet-600">
                  <Tag className="w-4 h-4" />
                </button>
                <button type="button"
                  onClick={() => removeMember(m.telegramUsername)}
                  disabled={removing === m.telegramUsername}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50">
                  {removing === m.telegramUsername ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                </button>
              </div>
              {editingTags === m.telegramUsername && (
                <div className="border-t border-border px-3 pb-3 pt-2 space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Tags (comma-separated)</p>
                  <div className="flex gap-2">
                    <Input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="vip, paid, early-bird" className="flex-1 h-8 text-sm" />
                    <Button size="sm" onClick={() => saveTags(m.telegramUsername)} disabled={savingTags} className="gap-1">
                      {savingTags ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      Save
                    </Button>
                    <button type="button" onClick={() => setEditingTags(null)} className="p-1.5 text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

