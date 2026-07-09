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
export interface WaitlistEntry { id: string; accountId: string; joinedAt: string; notifiedAt: string | null; hasPassword: boolean }

export function WaitlistSubTab({ secret, gb }: { secret: string; gb: GroupBuy }) {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [promoting, setPromoting] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [notifying, setNotifying] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}/waitlist`), { headers: { "x-admin-secret": secret } });
    if (res.ok) setEntries(await res.json());
    setLoading(false);
  }, [secret, gb.id]);

  useEffect(() => { load(); }, [load]);

  const promote = async (accountId: string) => {
    setPromoting(accountId);
    const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}/waitlist/${encodeURIComponent(accountId)}/promote`), { method: "POST", headers: { "x-admin-secret": secret } });
    if (res.ok) { setMsg(`${accountId} promoted to member ✓`); await load(); }
    else setMsg("Failed to promote");
    setPromoting(null);
    setTimeout(() => setMsg(""), 3000);
  };

  const remove = async (accountId: string) => {
    setRemoving(accountId);
    await fetch(apiUrl(`/admin/group-buys/${gb.id}/waitlist/${encodeURIComponent(accountId)}`), { method: "DELETE", headers: { "x-admin-secret": secret } });
    setEntries(prev => prev.filter(e => e.accountId !== accountId));
    setRemoving(null);
  };

  const notifyAll = async () => {
    const unnotified = entries.filter(e => !e.notifiedAt).length;
    if (unnotified === 0) { setMsg("All members already notified"); return; }
    if (!confirm(`Send Telegram notification to ${unnotified} unnotified waitlist member${unnotified !== 1 ? "s" : ""}?`)) return;
    setNotifying(true);
    const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}/waitlist/notify`), { method: "POST", headers: { "x-admin-secret": secret } });
    const data = await res.json();
    if (res.ok) { setMsg(`Notified ${data.notified} member${data.notified !== 1 ? "s" : ""} ✓`); await load(); }
    else setMsg("Failed to send notifications");
    setNotifying(false);
    setTimeout(() => setMsg(""), 4000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground">
          {entries.length} on waitlist
          {entries.filter(e => !e.notifiedAt).length > 0 && (
            <span className="ml-2 text-amber-600">({entries.filter(e => !e.notifiedAt).length} unnotified)</span>
          )}
        </p>
        <div className="flex items-center gap-2">
          {msg && <p className={cn("text-sm", msg.includes("✓") ? "text-green-600" : "text-red-500")}>{msg}</p>}
          {entries.length > 0 && (
            <Button size="sm" variant="outline" onClick={notifyAll} disabled={notifying} className="gap-1.5 h-7 text-xs">
              {notifying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bell className="w-3 h-3" />}
              Notify All
            </Button>
          )}
        </div>
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No one on the waitlist.</p>
      ) : (
        <div className="space-y-2">
          {entries.map((e, i) => (
            <div key={e.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background">
              <span className="text-xs text-muted-foreground w-5 text-right shrink-0">#{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">@{e.accountId}</p>
                <p className="text-xs text-muted-foreground">Joined waitlist {new Date(e.joinedAt).toLocaleDateString("en-GB")}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => promote(e.accountId)} disabled={promoting === e.accountId} className="gap-1.5 text-green-600 border-green-200">
                {promoting === e.accountId ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                Promote
              </Button>
              <button onClick={() => remove(e.accountId)} disabled={removing === e.accountId} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600">
                {removing === e.accountId ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Payment Status Sub-Tab ────────────────────────────────────
