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
export interface MemberPayment {
  accountId: string;
  joinedAt: string;
  tags: string[];
  orders: { id: string; code: string; status: string; paymentStatus: string; grandTotal: number; trackingNumber: string | null; refundStatus: string | null }[];
}

export function PaymentStatusSubTab({ secret, gb }: { secret: string; gb: GroupBuy }) {
  const [data, setData] = useState<MemberPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch(apiUrl(`/admin/group-buys/${gb.id}/payment-status`), { headers: { "x-admin-secret": secret } })
      .then(r => r.json()).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [secret, gb.id]);

  const filtered = data.filter(m => !search || m.accountId.toLowerCase().includes(search.toLowerCase()));

  const PAYMENT_COLORS: Record<string, string> = {
    confirmed: "text-green-600 bg-green-50 border-green-200",
    pending_confirmation: "text-amber-600 bg-amber-50 border-amber-200",
    unpaid: "text-slate-500 bg-slate-50 border-slate-200",
    failed: "text-red-600 bg-red-50 border-red-200",
    rejected: "text-red-600 bg-red-50 border-red-200",
    test_ready: "text-blue-600 bg-blue-50 border-blue-200",
    test_confirmed: "text-blue-600 bg-blue-50 border-blue-200",
  };

  return (
    <div className="space-y-3">
      <Input placeholder="Search member…" value={search} onChange={e => setSearch(e.target.value)} />
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No members found.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(m => (
            <div key={m.accountId} className="border border-border rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">@{m.accountId}</span>
                {m.tags?.length > 0 && m.tags.map(t => (
                  <span key={t} className="px-1.5 py-0.5 text-[10px] rounded-full bg-violet-100 text-violet-700">{t}</span>
                ))}
              </div>
              {m.orders.length === 0 ? (
                <p className="text-xs text-muted-foreground">No orders placed</p>
              ) : (
                m.orders.map(o => (
                  <div key={o.id} className="flex items-center gap-2 text-xs flex-wrap">
                    <code className="font-mono text-muted-foreground">#{o.code}</code>
                    <span className={cn("px-1.5 py-0.5 rounded-full border text-[10px] font-medium", PAYMENT_COLORS[o.paymentStatus] ?? "text-muted-foreground")}>{o.paymentStatus.replace(/_/g, " ")}</span>
                    <span className="text-muted-foreground">{gb.currency} {o.grandTotal.toFixed(2)}</span>
                    {o.trackingNumber && <span className="text-blue-600 font-mono">{o.trackingNumber}</span>}
                    {o.refundStatus && <span className="text-red-500">refund: {o.refundStatus}</span>}
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Orders Sub-Tab ───────────────────────────────────────────
