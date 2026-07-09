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
export type GbMember = { telegramUsername: string; hasTelegram: boolean; email?: string | null };

export function BroadcastDialog({ secret, gb, onClose }: { secret: string; gb: GroupBuy; onClose: () => void }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(null);
  const [gbMembers, setGbMembers] = useState<GbMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [targetMode, setTargetMode] = useState<"all" | "selected">("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [selectedUsernames, setSelectedUsernames] = useState<Set<string>>(new Set());
  const [memberSearch, setMemberSearch] = useState("");

  useEffect(() => {
    fetch(apiUrl(`/admin/group-buys/${gb.id}/members`), { headers: { "x-admin-secret": secret } })
      .then(r => r.ok ? r.json() : [])
      .then(setGbMembers)
      .catch(() => setGbMembers([]))
      .finally(() => setMembersLoading(false));
  }, [gb.id, secret]);

  const filteredMembers = gbMembers.filter(m =>
    !memberSearch.trim() || m.telegramUsername.toLowerCase().includes(memberSearch.toLowerCase())
  );

  const toggleMember = (username: string) => {
    setSelectedUsernames(prev => {
      const next = new Set(prev);
      if (next.has(username)) next.delete(username); else next.add(username);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedUsernames.size === filteredMembers.length) {
      setSelectedUsernames(new Set());
    } else {
      setSelectedUsernames(new Set(filteredMembers.map(m => m.telegramUsername)));
    }
  };

  const send = async () => {
    if (!message.trim()) return;
    const isTargeted = targetMode === "selected";
    const targets = isTargeted ? Array.from(selectedUsernames) : [];
    setSending(true);
    const body: Record<string, unknown> = { message: message.trim() };
    if (isTargeted) {
      body.targetUsernames = targets;
    } else if (paymentStatusFilter !== "all") {
      body.paymentStatusFilter = paymentStatusFilter;
    }
    const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}/broadcast`), {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-secret": secret },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) setResult(data);
    setSending(false);
  };

  const PAYMENT_STATUS_OPTIONS = [
    { value: "all", label: "All Members" },
    { value: "paid", label: "Paid Orders" },
    { value: "unpaid", label: "Unpaid Orders" },
    { value: "pending_confirmation", label: "Pending Confirmation" },
    { value: "submitted", label: "Status: Submitted" },
    { value: "processing", label: "Status: Processing" },
    { value: "dispatched", label: "Status: Dispatched" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background border border-border rounded-2xl p-6 max-w-lg w-full mx-4 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Send Message — {gb.name}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>
        {result ? (
          <div className="text-center space-y-2 py-4">
            <p className="text-2xl">📣</p>
            <p className="font-medium">Message sent!</p>
            <p className="text-sm text-muted-foreground">
              {result.sent} delivered · {result.failed} failed · {result.total} total recipients
            </p>
            <Button onClick={onClose} className="w-full mt-2">Done</Button>
          </div>
        ) : (
          <>
            {/* Target toggle */}
            <div className="flex gap-2">
              {(["all", "selected"] as const).map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setTargetMode(mode)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                    targetMode === mode
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:bg-accent"
                  )}
                >
                  {mode === "all" ? <Users className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                  {mode === "all" ? `All Members (${gbMembers.length})` : "Select Recipients"}
                </button>
              ))}
            </div>

            {/* Payment status filter (only when targeting all) */}
            {targetMode === "all" && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Filter by payment/order status</Label>
                <select
                  value={paymentStatusFilter}
                  onChange={e => setPaymentStatusFilter(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {PAYMENT_STATUS_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Member picker */}
            {targetMode === "selected" && (
              <div className="rounded-xl border border-input overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-input bg-muted/30">
                  <Search className="w-3 h-3 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search members…"
                    value={memberSearch}
                    onChange={e => setMemberSearch(e.target.value)}
                    className="flex-1 bg-transparent text-sm focus:outline-none"
                  />
                  <button type="button" onClick={toggleAll} className="text-xs font-medium text-primary hover:underline">
                    {selectedUsernames.size === filteredMembers.length && filteredMembers.length > 0 ? "Deselect all" : "Select all"}
                  </button>
                </div>
                <div className="max-h-44 overflow-y-auto">
                  {membersLoading ? (
                    <div className="flex items-center justify-center py-5">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredMembers.length === 0 ? (
                    <p className="text-xs text-center py-3 text-muted-foreground">No members found.</p>
                  ) : filteredMembers.map(m => (
                    <label key={m.telegramUsername} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-accent/50 transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedUsernames.has(m.telegramUsername)}
                        onChange={() => toggleMember(m.telegramUsername)}
                        disabled={!m.hasTelegram}
                        className="rounded"
                      />
                      <span className={cn("text-sm flex-1", !m.hasTelegram && "text-muted-foreground")}>
                        @{m.telegramUsername}
                      </span>
                      {!m.hasTelegram && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-500">No Telegram</span>
                      )}
                    </label>
                  ))}
                </div>
                {selectedUsernames.size > 0 && (
                  <div className="px-3 py-1.5 border-t border-input bg-muted/30 text-xs text-primary">
                    {selectedUsernames.size} recipient{selectedUsernames.size !== 1 ? "s" : ""} selected
                  </div>
                )}
              </div>
            )}

            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm min-h-[120px] resize-y focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Your message…"
            />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button
                className="flex-1 gap-1.5"
                onClick={send}
                disabled={!message.trim() || sending || (targetMode === "selected" && selectedUsernames.size === 0)}
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {targetMode === "all" ? "Send to all" : `Send to ${selectedUsernames.size}`}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Testing Sub-tab ──────────────────────────────────────────

export function BroadcastSubTab({ secret, gb }: { secret: string; gb: GroupBuy }) {
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<{ telegramUsername: string; hasTelegram: boolean; countryLegId: string | null }[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [targetMode, setTargetMode] = useState<"all" | "selected">("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [countryLegFilter, setCountryLegFilter] = useState("all");
  const [legs, setLegs] = useState<{ id: string; countryCode: string; countryName: string }[]>([]);
  const [selectedUsernames, setSelectedUsernames] = useState<Set<string>>(new Set());
  const [memberSearch, setMemberSearch] = useState("");
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [selectedProductNames, setSelectedProductNames] = useState<Set<string>>(new Set());
  const MAX = 4000;

  const PAYMENT_STATUS_OPTIONS = [
    { value: "all", label: "All Members" },
    { value: "paid", label: "Paid Orders" },
    { value: "unpaid", label: "Unpaid Orders" },
    { value: "pending_confirmation", label: "Pending Confirmation" },
    { value: "submitted", label: "Status: Submitted" },
    { value: "processing", label: "Status: Processing" },
    { value: "dispatched", label: "Status: Dispatched" },
  ];

  useEffect(() => {
    setMembersLoading(true);
    setSelectedUsernames(new Set());
    setTargetMode("all");
    setCountryLegFilter("all");
    fetch(apiUrl(`/admin/group-buys/${gb.id}/members`), { headers: { "x-admin-secret": secret } })
      .then(r => r.ok ? r.json() : [])
      .then(setMembers)
      .catch(() => setMembers([]))
      .finally(() => setMembersLoading(false));
    fetch(apiUrl(`/admin/group-buys/${gb.id}/products`), { headers: { "x-admin-secret": secret } })
      .then(r => r.ok ? r.json() : [])
      .then((data: { id: string; name: string }[]) => setProducts(data))
      .catch(() => setProducts([]));
    if (gb.countryLegsEnabled) {
      fetch(apiUrl(`/admin/group-buys/${gb.id}/country-legs`), { headers: { "x-admin-secret": secret } })
        .then(r => r.ok ? r.json() : [])
        .then((data: { id: string; countryCode: string; countryName: string }[]) => setLegs(data))
        .catch(() => setLegs([]));
    }
  }, [gb.id, gb.countryLegsEnabled, secret]);

  const filteredMembers = members.filter(m => {
    if (memberSearch.trim() && !m.telegramUsername.toLowerCase().includes(memberSearch.toLowerCase())) return false;
    if (targetMode === "selected" && countryLegFilter !== "all" && m.countryLegId !== countryLegFilter) return false;
    return true;
  });

  const toggleMember = (username: string) => {
    setSelectedUsernames(prev => {
      const next = new Set(prev);
      if (next.has(username)) next.delete(username); else next.add(username);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedUsernames.size === filteredMembers.length) {
      setSelectedUsernames(new Set());
    } else {
      setSelectedUsernames(new Set(filteredMembers.map(m => m.telegramUsername)));
    }
  };

  const handleSend = async () => {
    if (!msg.trim()) return;
    const isTargeted = targetMode === "selected";
    const targets = isTargeted ? Array.from(selectedUsernames) : [];
    if (isTargeted && targets.length === 0) { setError("Select at least one recipient."); return; }
    const recipientLabel = isTargeted ? `${targets.length} selected member${targets.length !== 1 ? "s" : ""}` : `all members of ${gb.name}`;
    if (!confirm(`Send this message to ${recipientLabel} on Telegram?`)) return;
    setSending(true);
    setError(null);
    setResult(null);
    try {
      const body: Record<string, unknown> = { message: msg };
      if (isTargeted) {
        body.targetUsernames = targets;
      } else {
        if (paymentStatusFilter !== "all") body.paymentStatusFilter = paymentStatusFilter;
        if (selectedProductNames.size > 0) body.productFilter = Array.from(selectedProductNames);
        if (countryLegFilter !== "all") body.countryLegFilter = countryLegFilter;
      }
      const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}/broadcast`), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to send broadcast"); }
      else { setResult(data); setMsg(""); setSelectedUsernames(new Set()); setTargetMode("all"); }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold mb-1">Send Telegram Message</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Send a message to members of <strong>{gb.name}</strong> who have linked their Telegram account. Choose all members or select specific recipients.
      </p>

      <div className="flex gap-2 mb-3">
        {(["all", "selected"] as const).map(mode => (
          <button
            key={mode}
            type="button"
            onClick={() => { setTargetMode(mode); setError(null); setResult(null); }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
              targetMode === mode
                ? "bg-orange-500 border-orange-500 text-white"
                : "bg-muted border-border text-muted-foreground hover:bg-muted/80"
            )}
          >
            {mode === "all" ? <Users className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
            {mode === "all" ? `All Members (${members.length})` : "Select Recipients"}
          </button>
        ))}
      </div>

      {targetMode === "all" && (
        <div className="mb-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Filter by payment / order status</label>
            <select
              value={paymentStatusFilter}
              onChange={e => setPaymentStatusFilter(e.target.value)}
              className="w-full rounded-xl text-sm px-3 py-2 focus:outline-none border border-input bg-background"
            >
              {PAYMENT_STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {legs.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Filter by country leg</label>
              <select
                value={countryLegFilter}
                onChange={e => setCountryLegFilter(e.target.value)}
                className="w-full rounded-xl text-sm px-3 py-2 focus:outline-none border border-input bg-background"
              >
                <option value="all">All countries</option>
                {legs.map(l => (
                  <option key={l.id} value={l.id}>{l.countryName} ({l.countryCode})</option>
                ))}
              </select>
              {countryLegFilter !== "all" && (
                <p className="text-[11px] text-orange-600 mt-1">
                  Only members with an order in the <strong>{legs.find(l => l.id === countryLegFilter)?.countryName}</strong> leg will receive this message.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {targetMode === "all" && products.length > 0 && (
        <div className="mb-4">
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Filter by product{selectedProductNames.size > 0 ? ` (${selectedProductNames.size} selected)` : " (optional — leave empty for all)"}
          </label>
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="max-h-40 overflow-y-auto">
              {products.map(p => (
                <label key={p.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedProductNames.has(p.name)}
                    onChange={() => setSelectedProductNames(prev => {
                      const next = new Set(prev);
                      if (next.has(p.name)) next.delete(p.name); else next.add(p.name);
                      return next;
                    })}
                    className="rounded"
                  />
                  <span className="text-sm flex-1">{p.name}</span>
                </label>
              ))}
            </div>
            {selectedProductNames.size > 0 && (
              <div className="px-3 py-1.5 border-t border-border text-xs bg-muted/40 text-orange-600 flex items-center justify-between">
                <span>{selectedProductNames.size} product{selectedProductNames.size !== 1 ? "s" : ""} selected — only buyers of these products will receive the message</span>
                <button type="button" onClick={() => setSelectedProductNames(new Set())} className="ml-2 underline">Clear</button>
              </div>
            )}
          </div>
        </div>
      )}

      {targetMode === "selected" && (
        <div className="mb-4 space-y-2">
          {legs.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Filter by country leg</label>
              <select
                value={countryLegFilter}
                onChange={e => { setCountryLegFilter(e.target.value); setSelectedUsernames(new Set()); }}
                className="w-full rounded-xl text-sm px-3 py-2 focus:outline-none border border-input bg-background"
              >
                <option value="all">All countries</option>
                {legs.map(l => (
                  <option key={l.id} value={l.id}>{l.countryName} ({l.countryCode})</option>
                ))}
              </select>
            </div>
          )}
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/40">
              <Search className="w-3 h-3 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search members…"
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm focus:outline-none"
              />
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs font-medium px-2 py-0.5 rounded bg-orange-50 text-orange-600 hover:bg-orange-100"
              >
                {selectedUsernames.size === filteredMembers.length && filteredMembers.length > 0 ? "Deselect all" : "Select all"}
              </button>
            </div>
            <div className="max-h-52 overflow-y-auto">
              {membersLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              ) : filteredMembers.length === 0 ? (
                <p className="text-xs text-center py-4 text-muted-foreground">No members found.</p>
              ) : filteredMembers.map(m => (
                <label
                  key={m.telegramUsername}
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/40 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedUsernames.has(m.telegramUsername)}
                    onChange={() => toggleMember(m.telegramUsername)}
                    disabled={!m.hasTelegram}
                    className="rounded"
                  />
                  <span className={cn("text-sm flex-1", !m.hasTelegram && "text-muted-foreground")}>
                    @{m.telegramUsername}
                  </span>
                  {!m.hasTelegram && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-500">No Telegram</span>
                  )}
                </label>
              ))}
            </div>
            {selectedUsernames.size > 0 && (
              <div className="px-3 py-1.5 border-t border-border text-xs bg-muted/40 text-orange-600">
                {selectedUsernames.size} recipient{selectedUsernames.size !== 1 ? "s" : ""} selected
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <textarea
          className="w-full rounded-lg border border-input bg-background text-sm p-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          style={{ minHeight: "140px" }}
          placeholder="Write your message here…"
          value={msg}
          maxLength={MAX}
          onChange={e => { setMsg(e.target.value); setResult(null); setError(null); }}
          disabled={sending}
        />
        <div className="flex justify-end">
          <span className={cn("text-xs", msg.length > MAX * 0.9 ? "text-red-500" : "text-muted-foreground")}>
            {msg.length}/{MAX}
          </span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm p-3 rounded-lg mt-3 bg-red-50 text-red-600">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {result && (
        <div className="flex items-start gap-2 text-sm p-3 rounded-lg mt-3 bg-green-50 text-green-700">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Sent to <strong>{result.sent}</strong> of <strong>{result.total}</strong> member{result.total !== 1 ? "s" : ""}.
            {result.failed > 0 && ` ${result.failed} skipped or failed (no Telegram linked, or delivery error).`}
          </span>
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <Button
          onClick={handleSend}
          disabled={sending || !msg.trim() || (targetMode === "selected" && selectedUsernames.size === 0)}
          className="gap-2"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendHorizonal className="w-4 h-4" />}
          {sending ? "Sending…" : targetMode === "all" ? "Send to all members" : `Send to ${selectedUsernames.size} member${selectedUsernames.size !== 1 ? "s" : ""}`}
        </Button>
      </div>
    </Card>
  );
}

// ─── Leg Shipping Calculator ───────────────────────────────────
