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
import { GBForm } from "../GbForm";
import { Switch, SettingsSection, SettingsRow } from "../shared/settings-ui";
import type { GroupBuy, InfoCard, ShippingOption, EntryFeePayment, GbPaymentConfig, GBProduct, DeliveryMethod, GBDeliveryMethod, Member, Product, CustomCourier } from "../shared/core";
export function DetailsSubTab({ secret, gb, onUpdate }: { secret: string; gb: GroupBuy; onUpdate: (gb: GroupBuy) => void }) {
  const [infoCards, setInfoCards] = useState<InfoCard[]>(gb.infoCards ?? []);
  const [savingCards, setSavingCards] = useState(false);
  const [savedCards, setSavedCards] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [togglingTesting, setTogglingTesting] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  // Sync local state when GB changes (switch between GBs) or when
  // server-normalised data updates in-place on the same GB.
  useEffect(() => {
    setInfoCards(gb.infoCards ?? []);
    setVendorShippingMessage(gb.vendorShippingMessage ?? "");
    setVendorShippingAmount(gb.vendorShippingAmount != null ? String(gb.vendorShippingAmount) : "");
    setDirectShippingVendorId(gb.directShippingVendorId ?? "");
  }, [gb.id, gb.infoCards, gb.vendorShippingMessage, gb.vendorShippingAmount, gb.directShippingVendorId]);

  // Accept Payments toggle
  const [togglingPayments, setTogglingPayments] = useState(false);
  const [togglingDirectPay, setTogglingDirectPay] = useState(false);

  // Payment Instructions
  const [togglingPaymentMsg, setTogglingPaymentMsg] = useState(false);
  const [paymentMsg, setPaymentMsg] = useState(gb.paymentMessage ?? "");
  const [savingPaymentMsg, setSavingPaymentMsg] = useState(false);
  const [savedPaymentMsg, setSavedPaymentMsg] = useState(false);

  // Admin Fee
  const [togglingAdminFee, setTogglingAdminFee] = useState(false);
  const [adminFeeAmount, setAdminFeeAmount] = useState(gb.adminFeeAmount != null ? String(gb.adminFeeAmount) : "");
  const [adminFeeLabel, setAdminFeeLabel] = useState(gb.adminFeeLabel ?? "");
  const [savingAdminFee, setSavingAdminFee] = useState(false);
  const [savedAdminFee, setSavedAdminFee] = useState(false);

  // QR Upload
  const [togglingQrInpost, setTogglingQrInpost] = useState(false);
  const [togglingQrRoyalMail, setTogglingQrRoyalMail] = useState(false);
  const [togglingStockView, setTogglingStockView] = useState(false);
  const [togglingExtraOrders, setTogglingExtraOrders] = useState(false);
  const [qrUploadMessage, setQrUploadMessage] = useState(gb.qrUploadMessage ?? "");
  const [savingQrMsg, setSavingQrMsg] = useState(false);
  const [savedQrMsg, setSavedQrMsg] = useState(false);

  // QR Viewer Access
  const [qrViewerUsernames, setQrViewerUsernames] = useState<string[]>((gb.qrViewerUsernames as string[]) ?? []);
  const [qrViewerInput, setQrViewerInput] = useState("");
  const [savingQrViewers, setSavingQrViewers] = useState(false);
  const [savedQrViewers, setSavedQrViewers] = useState(false);
  const [qrViewerError, setQrViewerError] = useState("");

  const saveQrViewers = async (usernames: string[]) => {
    setSavingQrViewers(true);
    try {
      const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}/qr-viewers`), {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ qrViewerUsernames: usernames.length > 0 ? usernames : null }),
      });
      if (res.ok) {
        const data = await res.json();
        onUpdate(data.groupBuy ?? { ...gb, qrViewerUsernames: usernames.length > 0 ? usernames : null });
        setSavedQrViewers(true);
        setTimeout(() => setSavedQrViewers(false), 2000);
      }
    } finally {
      setSavingQrViewers(false);
    }
  };

  // Leg Viewer Access
  type LegViewerEntry = { username: string; legIds: string[] };
  const [legViewerAccess, setLegViewerAccess] = useState<LegViewerEntry[]>((gb.legViewerAccess as LegViewerEntry[]) ?? []);
  const [legViewerLegs, setLegViewerLegs] = useState<{ id: string; countryCode: string; countryName: string }[]>([]);
  const [legViewerInput, setLegViewerInput] = useState("");
  const [legViewerSuggestions, setLegViewerSuggestions] = useState<string[]>([]);
  const legViewerDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [legViewerSelectedLegs, setLegViewerSelectedLegs] = useState<string[]>([]);
  const [savingLegViewers, setSavingLegViewers] = useState(false);
  const [savedLegViewers, setSavedLegViewers] = useState(false);
  const [legViewerError, setLegViewerError] = useState("");
  const [editingLegViewerUsername, setEditingLegViewerUsername] = useState<string | null>(null);
  const [editingLegIds, setEditingLegIds] = useState<string[]>([]);

  useEffect(() => {
    if (legViewerDebounce.current) clearTimeout(legViewerDebounce.current);
    const q = legViewerInput.trim();
    if (!q) { setLegViewerSuggestions([]); return; }
    legViewerDebounce.current = setTimeout(async () => {
      try {
        const res = await fetch(apiUrl(`/admin/search-users?q=${encodeURIComponent(q)}`), { headers: { "x-admin-secret": secret } });
        if (res.ok) setLegViewerSuggestions(await res.json());
      } catch { /* ignore */ }
    }, 200);
    return () => { if (legViewerDebounce.current) clearTimeout(legViewerDebounce.current); };
  }, [legViewerInput, secret]);

  useEffect(() => {
    fetch(apiUrl(`/admin/group-buys/${gb.id}/country-legs`), { headers: { "x-admin-secret": secret } })
      .then(r => r.ok ? r.json() : [])
      .then(legs => setLegViewerLegs(legs))
      .catch(() => {});
  }, [gb.id, secret]);

  const saveLegViewers = async (entries: LegViewerEntry[]) => {
    setSavingLegViewers(true);
    try {
      const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}/leg-viewers`), {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ legViewerAccess: entries }),
      });
      if (res.ok) {
        const data = await res.json();
        setLegViewerAccess(data.legViewerAccess ?? []);
        setSavedLegViewers(true);
        setTimeout(() => setSavedLegViewers(false), 2000);
      }
    } finally {
      setSavingLegViewers(false);
    }
  };

  // Order page message
  const [orderPageMessage, setOrderPageMessage] = useState(gb.orderPageMessage ?? "");
  const [savingOrderPageMsg, setSavingOrderPageMsg] = useState(false);
  const [savedOrderPageMsg, setSavedOrderPageMsg] = useState(false);

  // Payment banner
  const renderBannerText = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, i) => {
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      return (
        <span key={i}>
          {i > 0 && <br />}
          {parts.map((part, j) =>
            part.startsWith("**") && part.endsWith("**")
              ? <strong key={j}>{part.slice(2, -2)}</strong>
              : part
          )}
        </span>
      );
    });
  };
  const [paymentBanner, setPaymentBanner] = useState((gb as any).paymentBanner ?? "");
  const [savingPaymentBanner, setSavingPaymentBanner] = useState(false);
  const [savedPaymentBanner, setSavedPaymentBanner] = useState(false);

  // Vendor Shipping
  const [togglingVendorShipping, setTogglingVendorShipping] = useState(false);
  const [vendorShippingMessage, setVendorShippingMessage] = useState(gb.vendorShippingMessage ?? "");
  const [vendorShippingAmount, setVendorShippingAmount] = useState(gb.vendorShippingAmount != null ? String(gb.vendorShippingAmount) : "");
  const [savingVendorShipping, setSavingVendorShipping] = useState(false);
  const [savedVendorShipping, setSavedVendorShipping] = useState(false);

  // Direct Shipping
  const [togglingDirectShipping, setTogglingDirectShipping] = useState(false);
  const [directShippingVendorId, setDirectShippingVendorId] = useState(gb.directShippingVendorId ?? "");
  const [savingDirectShipping, setSavingDirectShipping] = useState(false);
  const [savedDirectShipping, setSavedDirectShipping] = useState(false);

  // Country Legs
  const [togglingCountryLegs, setTogglingCountryLegs] = useState(false);

  // Organiser Order Edit
  const [togglingOrganiserOrderEdit, setTogglingOrganiserOrderEdit] = useState(false);


  const setStatus = async (newStatus: string) => {
    if (gb.status === newStatus || togglingStatus) return;
    setTogglingStatus(true);
    try {
      const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) onUpdate(await res.json());
    } finally { setTogglingStatus(false); }
  };

  const toggleTesting = async () => {
    setTogglingTesting(true);
    try {
      const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ testingEnabled: !gb.testingEnabled }),
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdate(updated);
      }
    } finally { setTogglingTesting(false); }
  };


  const saveInfoCards = async () => {
    setSavingCards(true);
    try {
      const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ infoCards }),
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdate(updated);
        setSavedCards(true);
        setTimeout(() => setSavedCards(false), 2000);
      }
    } finally { setSavingCards(false); }
  };

  const togglePaymentMsg = async () => {
    setTogglingPaymentMsg(true);
    try {
      const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ paymentMessageEnabled: !gb.paymentMessageEnabled }),
      });
      if (res.ok) onUpdate(await res.json());
    } finally { setTogglingPaymentMsg(false); }
  };

  const togglePayments = async () => {
    setTogglingPayments(true);
    try {
      const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ paymentsEnabled: !gb.paymentsEnabled }),
      });
      if (res.ok) onUpdate(await res.json());
    } finally { setTogglingPayments(false); }
  };

  const toggleDirectShippingPayments = async () => {
    setTogglingDirectPay(true);
    try {
      const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ directShippingPaymentsEnabled: !(gb.directShippingPaymentsEnabled ?? true) }),
      });
      if (res.ok) onUpdate(await res.json());
    } finally { setTogglingDirectPay(false); }
  };

  const savePaymentMsg = async () => {
    setSavingPaymentMsg(true);
    try {
      const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ paymentMessage: paymentMsg }),
      });
      if (res.ok) {
        onUpdate(await res.json());
        setSavedPaymentMsg(true);
        setTimeout(() => setSavedPaymentMsg(false), 2000);
      }
    } finally { setSavingPaymentMsg(false); }
  };

  const toggleAdminFee = async () => {
    setTogglingAdminFee(true);
    try {
      const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ adminFeeEnabled: !gb.adminFeeEnabled }),
      });
      if (res.ok) onUpdate(await res.json());
    } finally { setTogglingAdminFee(false); }
  };

  const saveAdminFee = async () => {
    setSavingAdminFee(true);
    try {
      const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({
          adminFeeAmount: adminFeeAmount.trim() ? parseFloat(adminFeeAmount) : null,
          adminFeeLabel: adminFeeLabel.trim() || null,
        }),
      });
      if (res.ok) {
        onUpdate(await res.json());
        setSavedAdminFee(true);
        setTimeout(() => setSavedAdminFee(false), 2000);
      }
    } finally { setSavingAdminFee(false); }
  };

  const toggleQrInpost = async () => {
    setTogglingQrInpost(true);
    try {
      const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ qrUploadInpostEnabled: !gb.qrUploadInpostEnabled }),
      });
      if (res.ok) onUpdate(await res.json());
    } finally { setTogglingQrInpost(false); }
  };

  const toggleQrRoyalMail = async () => {
    setTogglingQrRoyalMail(true);
    try {
      const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ qrUploadRoyalMailEnabled: !gb.qrUploadRoyalMailEnabled }),
      });
      if (res.ok) onUpdate(await res.json());
    } finally { setTogglingQrRoyalMail(false); }
  };

  const toggleStockView = async () => {
    setTogglingStockView(true);
    try {
      const next = !(gb.showStockView ?? true);
      const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ showStockView: next }),
      });
      if (res.ok) onUpdate(await res.json());
    } finally { setTogglingStockView(false); }
  };

  const toggleExtraOrders = async () => {
    setTogglingExtraOrders(true);
    try {
      const next = !(gb.allowExtraOrders ?? false);
      const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ allowExtraOrders: next }),
      });
      if (res.ok) onUpdate(await res.json());
    } finally { setTogglingExtraOrders(false); }
  };

  const saveQrMsg = async () => {
    setSavingQrMsg(true);
    try {
      const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ qrUploadMessage: qrUploadMessage.trim() || null }),
      });
      if (res.ok) {
        onUpdate(await res.json());
        setSavedQrMsg(true);
        setTimeout(() => setSavedQrMsg(false), 2000);
      }
    } finally { setSavingQrMsg(false); }
  };

  const saveOrderPageMsg = async () => {
    setSavingOrderPageMsg(true);
    try {
      const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ orderPageMessage: orderPageMessage.trim() || null }),
      });
      if (res.ok) {
        onUpdate(await res.json());
        setSavedOrderPageMsg(true);
        setTimeout(() => setSavedOrderPageMsg(false), 2000);
      }
    } finally { setSavingOrderPageMsg(false); }
  };

  const savePaymentBanner = async () => {
    setSavingPaymentBanner(true);
    try {
      const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ paymentBanner: paymentBanner.trim() || null }),
      });
      if (res.ok) {
        onUpdate(await res.json());
        setSavedPaymentBanner(true);
        setTimeout(() => setSavedPaymentBanner(false), 2000);
      }
    } finally { setSavingPaymentBanner(false); }
  };

  const toggleVendorShipping = async () => {
    setTogglingVendorShipping(true);
    try {
      const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ vendorShippingEnabled: !(gb.vendorShippingEnabled ?? false) }),
      });
      if (res.ok) onUpdate(await res.json());
    } finally { setTogglingVendorShipping(false); }
  };

  const saveVendorShipping = async () => {
    setSavingVendorShipping(true);
    try {
      const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({
          vendorShippingMessage: vendorShippingMessage.trim() || null,
          vendorShippingAmount: vendorShippingAmount.trim() ? parseFloat(vendorShippingAmount) : null,
        }),
      });
      if (res.ok) {
        onUpdate(await res.json());
        setSavedVendorShipping(true);
        setTimeout(() => setSavedVendorShipping(false), 2000);
      }
    } finally { setSavingVendorShipping(false); }
  };

  const toggleDirectShipping = async () => {
    setTogglingDirectShipping(true);
    try {
      const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ directShippingEnabled: !(gb.directShippingEnabled ?? false) }),
      });
      if (res.ok) onUpdate(await res.json());
    } finally { setTogglingDirectShipping(false); }
  };

  const saveDirectShipping = async () => {
    setSavingDirectShipping(true);
    try {
      const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ directShippingVendorId: directShippingVendorId.trim() || null }),
      });
      if (res.ok) {
        onUpdate(await res.json());
        setSavedDirectShipping(true);
        setTimeout(() => setSavedDirectShipping(false), 2000);
      }
    } finally { setSavingDirectShipping(false); }
  };

  const toggleCountryLegs = async () => {
    setTogglingCountryLegs(true);
    try {
      const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ countryLegsEnabled: !(gb.countryLegsEnabled ?? false) }),
      });
      if (res.ok) onUpdate(await res.json());
    } finally { setTogglingCountryLegs(false); }
  };

  const toggleOrganiserOrderEdit = async () => {
    setTogglingOrganiserOrderEdit(true);
    try {
      const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ organiserOrderEditEnabled: !(gb.organiserOrderEditEnabled ?? false) }),
      });
      if (res.ok) onUpdate(await res.json());
    } finally { setTogglingOrganiserOrderEdit(false); }
  };

  const [togglingOrgField, setTogglingOrgField] = useState<string | null>(null);
  const patchOrgEditField = async (field: string, current: boolean) => {
    setTogglingOrgField(field);
    try {
      const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ [field]: !current }),
      });
      if (res.ok) onUpdate(await res.json());
    } finally { setTogglingOrgField(null); }
  };

  const STATUS_OPTIONS: { value: string; label: string; active: string; inactive: string }[] = [
    { value: "draft", label: "Draft", active: "bg-slate-700 text-white border-slate-700", inactive: "bg-background text-slate-500 border-border hover:bg-slate-50" },
    { value: "active", label: "Active", active: "bg-green-600 text-white border-green-600", inactive: "bg-background text-slate-500 border-border hover:bg-green-50" },
    { value: "closed", label: "Closed", active: "bg-red-600 text-white border-red-600", inactive: "bg-background text-slate-500 border-border hover:bg-red-50" },
  ];

  const [detailsSubTab, setDetailsSubTab] = useState<"general" | "payments" | "ordering" | "shipping" | "access">("general");

  const DETAILS_SUB_TABS = [
    { id: "general" as const, label: "General", icon: Settings },
    { id: "payments" as const, label: "Payments", icon: CreditCard },
    { id: "ordering" as const, label: "Ordering", icon: ShoppingCart },
    { id: "shipping" as const, label: "Shipping", icon: Truck },
    { id: "access" as const, label: "Access", icon: KeyRound },
  ];

  return (
    <div className="flex gap-8 items-start flex-col sm:flex-row">
      {/* Inner settings nav (reference-style) */}
      <nav className="hidden sm:block w-44 shrink-0 sticky top-4 space-y-1">
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Group Buy Settings</p>
        {DETAILS_SUB_TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setDetailsSubTab(tab.id)}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors text-left",
              detailsSubTab === tab.id
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <tab.icon className="w-4 h-4 shrink-0" />
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Mobile: dropdown */}
      <select
        value={detailsSubTab}
        onChange={e => setDetailsSubTab(e.target.value as typeof detailsSubTab)}
        className="sm:hidden w-full h-10 rounded-xl border border-input bg-background px-3 text-sm font-semibold focus:outline-none"
      >
        {DETAILS_SUB_TABS.map(tab => <option key={tab.id} value={tab.id}>{tab.label}</option>)}
      </select>

      <div className="flex-1 min-w-0 max-w-3xl space-y-10">

      {/* ── GENERAL ── */}
      {detailsSubTab === "general" && <div className="space-y-6">
      {/* Status */}
      <section className="pb-8 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="font-semibold text-base tracking-tight">Status</h3>
          {togglingStatus && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
        </div>
        <div className="flex gap-2">
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              disabled={togglingStatus}
              onClick={() => setStatus(opt.value)}
              className={cn(
                "flex-1 py-2 px-4 rounded-lg text-sm font-semibold border transition-all",
                gb.status === opt.value ? opt.active : opt.inactive
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* General Settings */}
      <section className="pb-8 border-b border-border">
        <h3 className="font-semibold text-sm mb-4">General Settings</h3>
        <GBForm
          key={`${formKey}-${gb.status}`}
          secret={secret}
          initial={gb}
          hideStatus
          onSave={(updated) => { onUpdate(updated); setFormKey(k => k + 1); }}
          onCancel={() => setFormKey(k => k + 1)}
        />
      </section>
      </div>}

      {/* ── PAYMENTS ── */}
      {detailsSubTab === "payments" && <div className="space-y-6">
      {/* Payments (combined card) */}
      <section className="pb-8 border-b border-border space-y-5">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-green-500" />
          <h3 className="font-semibold text-base tracking-tight">Payments</h3>
        </div>

        {/* Accept Payments */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">Accept Payments</p>
            <Switch checked={!!(gb.paymentsEnabled)} onChange={togglePayments} busy={togglingPayments} />
          </div>
          <p className="text-xs text-muted-foreground">
            {gb.paymentsEnabled
              ? "Payments are currently open. Customers can submit payment for orders in this group buy."
              : "Payments are currently closed. Customers will see a 'Payments not yet open' notice and cannot submit payment."}
          </p>
        </div>

        {gb.directShippingEnabled && (
          <>
            <div className="border-t border-border" />
            {/* Direct Shipping Payments */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground">🏠 Direct-to-Home Payments</p>
                <Switch checked={!!((gb.directShippingPaymentsEnabled ?? true))} onChange={toggleDirectShippingPayments} busy={togglingDirectPay} />
              </div>
              <p className="text-xs text-muted-foreground">
                {(gb.directShippingPaymentsEnabled ?? true)
                  ? "Customers who chose direct-to-home shipping can submit payment."
                  : "Payments are closed for direct-to-home shipping orders only. Reshipper orders are unaffected."}
              </p>
            </div>
          </>
        )}

        <div className="border-t border-border" />

        {/* Payment Instructions */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">Payment Instructions</p>
            <Switch checked={!!(gb.paymentMessageEnabled)} onChange={togglePaymentMsg} busy={togglingPaymentMsg} />
          </div>
          {gb.paymentMessageEnabled ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">This message appears at the bottom of the order review page as payment instructions for customers.</p>
              <textarea
                value={paymentMsg}
                onChange={e => setPaymentMsg(e.target.value)}
                rows={3}
                placeholder="Payments are to be made through the website once sleeping pep confirms."
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <Button size="sm" onClick={savePaymentMsg} disabled={savingPaymentMsg} className="gap-1.5">
                {savingPaymentMsg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : savedPaymentMsg ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                {savedPaymentMsg ? "Saved" : "Save Message"}
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">When disabled, no payment instructions are shown on the order review page.</p>
          )}
        </div>

        <div className="border-t border-border" />

        {/* Payment Gateway */}
        <GbPaymentGatewayInlineContent secret={secret} gbId={gb.id} />
      </section>

      {/* Admin Fee */}
      <section className="pb-8 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-purple-500" />
            <h3 className="font-semibold text-base tracking-tight">Admin Fee</h3>
          </div>
          <Switch checked={!!(gb.adminFeeEnabled)} onChange={toggleAdminFee} busy={togglingAdminFee} />
        </div>
        {gb.adminFeeEnabled ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">A fixed fee added to each order in this group buy. Per-country overrides live in the <strong>Fee by Country</strong> page (Setup section of the sidebar).</p>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Fee amount ({gb.currency})</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={adminFeeAmount}
                onChange={e => setAdminFeeAmount(e.target.value)}
                placeholder="e.g. 2.50"
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Fee label (optional)</label>
              <input
                type="text"
                value={adminFeeLabel}
                onChange={e => setAdminFeeLabel(e.target.value)}
                placeholder="e.g. Platform fee, Admin fee"
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <Button size="sm" onClick={saveAdminFee} disabled={savingAdminFee} className="gap-1.5">
              {savingAdminFee ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : savedAdminFee ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              {savedAdminFee ? "Saved" : "Save Fee"}
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">When enabled, a custom admin fee will be added to each order in this group buy.</p>
          )}
      </section>

      </div>}

      {/* ── ORDERING ── */}
      {detailsSubTab === "ordering" && <div className="space-y-6">
      {/* Country Sub-groups */}
      <section className="pb-8 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-teal-500" />
            <h3 className="font-semibold text-base tracking-tight">Country Sub-groups</h3>
          </div>
          <Switch checked={!!(gb.countryLegsEnabled)} onChange={toggleCountryLegs} busy={togglingCountryLegs} />
        </div>
        <p className="text-xs text-muted-foreground">
          Split this GB into per-country sub-groups with separate invite codes and reshipper assignments.
        </p>
        {gb.countryLegsEnabled && (
          <p className="text-xs text-teal-600 font-medium mt-2">Country Legs are enabled — manage them in the "Country Legs" tab above.</p>
        )}
      </section>

      {/* 6. Lab Testing (simplified toggle — manage rounds in Testing tab) */}
      <section className="pb-8 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TestTube className="w-4 h-4 text-blue-500" />
            <h3 className="font-semibold text-base tracking-tight">Lab Testing</h3>
          </div>
          <Switch checked={!!(gb.testingEnabled)} onChange={toggleTesting} busy={togglingTesting} />
        </div>
        <p className="text-xs text-muted-foreground">
          When enabled, customers can opt in to a lab test contribution when placing an order. Manage rounds, contributions, and votes in the <strong>Testing</strong> tab.
        </p>
      </section>

      {/* 7. Organiser Order Editing */}
      <section className="pb-8 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-orange-500" />
            <h3 className="font-semibold text-base tracking-tight">Organiser Order Editing</h3>
          </div>
          <Switch checked={!!(gb.organiserOrderEditEnabled)} onChange={toggleOrganiserOrderEdit} busy={togglingOrganiserOrderEdit} />
        </div>
        <p className="text-xs text-muted-foreground">
          Allow the group buy organiser to edit order fields for orders in this GB. Use the toggles below to control exactly which fields they can change.
        </p>
        {gb.organiserOrderEditEnabled && (
          <div className="mt-3 rounded-xl border divide-y" style={{ borderColor: "hsl(var(--border))" }}>
            {([
              { field: "organiserCanEditStatus", label: "Order Status", desc: "Can change order status (Draft, Submitted, Shipped, etc.)", val: gb.organiserCanEditStatus ?? true },
              { field: "organiserCanEditPaymentStatus", label: "Payment Status", desc: "Can change payment status (unpaid, confirmed, etc.)", val: gb.organiserCanEditPaymentStatus ?? true },
              { field: "organiserCanEditTracking", label: "Tracking Number", desc: "Can enter or update the shipping tracking number", val: gb.organiserCanEditTracking ?? true },
              { field: "organiserCanEditNotes", label: "Internal Notes", desc: "Can write internal notes visible only to admin/organiser", val: gb.organiserCanEditNotes ?? true },
              { field: "organiserCanEditTxId", label: "Transaction ID", desc: "Can edit the customer's payment transaction hash (use with care)", val: gb.organiserCanEditTxId ?? false },
              { field: "organiserCanEditQuantities", label: "Order Quantities", desc: "Can adjust the quantity of each product on an order (recalculates order total automatically)", val: gb.organiserCanEditQuantities ?? false },
              { field: "organiserCanMarkOos", label: "Mark / Unmark OOS", desc: "Can mark products as out of stock and restore them (recalculates order totals automatically)", val: (gb as any).organiserCanMarkOos ?? true },
              { field: "organiserCanDeleteOrders", label: "Delete Orders", desc: "Can soft-delete orders from their group buy (customers are notified; 48h restore window via admin Trash)", val: (gb as any).organiserCanDeleteOrders ?? false },
            ] as { field: string; label: string; desc: string; val: boolean }[]).map(({ field, label, desc, val }) => (
              <div key={field} className="flex items-center justify-between px-3 py-2.5 gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground">{label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
                </div>
                <Switch checked={val} onChange={() => patchOrgEditField(field, val)} busy={togglingOrgField === field} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 7b. Customer order add-ons */}
      <section className="pb-8 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <ShoppingCart className="w-4 h-4 text-blue-500" />
          <h3 className="font-semibold text-base tracking-tight">Allow members to add to their order</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          When disabled, members cannot add products or increase quantities in their existing order regardless of GB status. Admin and organiser can always edit.
        </p>
        <div className="rounded-xl border divide-y" style={{ borderColor: "hsl(var(--border))" }}>
          {([
            { field: "allowOrderAddons", label: "Order Add-ons", desc: "Members can add more items or increase quantities in their existing order.", val: gb.allowOrderAddons ?? true },
          ] as { field: string; label: string; desc: string; val: boolean }[]).map(({ field, label, desc, val }) => (
            <div key={field} className="flex items-center justify-between px-3 py-2.5 gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">{label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
              </div>
              <Switch checked={val} onChange={() => patchOrgEditField(field, val)} busy={togglingOrgField === field} />
            </div>
          ))}
        </div>
      </section>

      {/* 7c. Customer permissions when GB is closed */}
      <section className="pb-8 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <Lock className="w-4 h-4 text-orange-500" />
          <h3 className="font-semibold text-base tracking-tight">Customer permissions when GB closed</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Control which actions customers can take on their orders once this GB's status is <strong>Closed</strong>. All on by default. Admin and organiser always retain full edit ability.
        </p>
        <div className="rounded-xl border divide-y" style={{ borderColor: "hsl(var(--border))" }}>
          {([
            { field: "allowEditOrderWhenClosed", label: "Edit Order", desc: "Customers can change quantities and add/remove items.", val: gb.allowEditOrderWhenClosed ?? true },
            { field: "allowEditAddressWhenClosed", label: "Edit Address", desc: "Customers can update their shipping name and address.", val: gb.allowEditAddressWhenClosed ?? true },
            { field: "allowDeleteOrderWhenClosed", label: "Delete Order", desc: "Customers can self-delete their order (Draft / Submitted only).", val: gb.allowDeleteOrderWhenClosed ?? true },
            { field: "hidePricesWhenClosed", label: "Order Page — Item Prices", desc: "Hides the price shown next to each product line on the member's order lookup page.", val: gb.hidePricesWhenClosed ?? false },
            { field: "hideCostBreakdownWhenClosed", label: "Order Page — Cost Breakdown", desc: "Hides the Products subtotal, Delivery, Vendor Shipping, and Tip rows on the order lookup page.", val: gb.hideCostBreakdownWhenClosed ?? false },
            { field: "hideGrandTotalWhenClosed", label: "Order Page — Grand Total", desc: "Hides the Amount Due row at the bottom of the order lookup page.", val: gb.hideGrandTotalWhenClosed ?? false },
            { field: "hidePricesOnInvoice", label: "Invoice — Hide All Prices", desc: "Hides item prices, the price breakdown, and the grand total on the PDF receipt download.", val: gb.hidePricesOnInvoice ?? false },
            { field: "hidePricesOnGbViewer", label: "GB Viewer — Hide Prices", desc: "Members' GB leg viewer defaults to showing prices hidden (they can still manually toggle it).", val: gb.hidePricesOnGbViewer ?? false },
            { field: "hidePricesOnOrderForm", label: "Order Form — Item Prices", desc: "Hides item prices and the price breakdown section when members place or edit a GB order.", val: gb.hidePricesOnOrderForm ?? false },
            { field: "hideOrderTotalOnOrderForm", label: "Order Form — Running Total", desc: "Hides the grand total shown at the bottom of the order form.", val: gb.hideOrderTotalOnOrderForm ?? false },
          ] as { field: string; label: string; desc: string; val: boolean }[]).map(({ field, label, desc, val }) => (
            <div key={field} className="flex items-center justify-between px-3 py-2.5 gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">{label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
              </div>
              <Switch checked={val} onChange={() => patchOrgEditField(field, val)} busy={togglingOrgField === field} />
            </div>
          ))}
        </div>
      </section>

      {/* 8. Info Cards */}
      <section className="pb-8 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-orange-500" />
            <h3 className="font-semibold text-base tracking-tight">Info Cards</h3>
          </div>
          <Button size="sm" onClick={saveInfoCards} disabled={savingCards} className="gap-1.5">
            {savingCards ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : savedCards ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            {savedCards ? "Saved" : "Save Cards"}
          </Button>
        </div>
        <InfoCardsEditor cards={infoCards} onChange={setInfoCards} />
      </section>

      {/* 9. Order Page Message */}
      <section className="pb-8 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="w-4 h-4 text-blue-500" />
          <h3 className="font-semibold text-base tracking-tight">Order Page Message</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Shown as a banner on the GB ordering page. Useful for announcements or important reminders. Leave blank to show no banner.
        </p>
        <div className="space-y-3">
          <textarea
            value={orderPageMessage}
            onChange={e => setOrderPageMessage(e.target.value)}
            rows={3}
            placeholder="e.g. Orders close on 30th April. Please read the product descriptions carefully before ordering."
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <Button size="sm" onClick={saveOrderPageMsg} disabled={savingOrderPageMsg} className="gap-1.5">
            {savingOrderPageMsg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : savedOrderPageMsg ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            {savedOrderPageMsg ? "Saved" : "Save Message"}
          </Button>
        </div>
      </section>
      </div>}

      {/* Payment Page Banner — Payments tab */}
      {detailsSubTab === "payments" && <div className="space-y-6">
      {/* Payment Page Banner */}
      <section className="pb-8 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <CreditCard className="w-4 h-4 text-orange-500" />
          <h3 className="font-semibold text-base tracking-tight">Payment Page Banner</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Shown as a highlighted banner on the payment page when members go to pay. Useful for payment instructions, timing notices, or reminders. Leave blank to show no banner.
          Use <code className="bg-muted px-1 py-0.5 rounded text-[10px]">**bold**</code> for bold text and press Enter for line breaks.
        </p>
        <div className="space-y-3">
          <textarea
            value={paymentBanner}
            onChange={e => setPaymentBanner(e.target.value)}
            rows={4}
            placeholder={"e.g. **Crypto Payment:** Allow 1-2 minutes for the TXID to be acknowledged.\nAnonPay conversions take 5-15 minutes."}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary font-mono"
          />
          {paymentBanner.trim() && (
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5">
              <span className="text-base leading-none mt-0.5">📢</span>
              <p className="text-xs text-amber-800 leading-snug">{renderBannerText(paymentBanner.trim())}</p>
            </div>
          )}
          <Button size="sm" onClick={savePaymentBanner} disabled={savingPaymentBanner} className="gap-1.5">
            {savingPaymentBanner ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : savedPaymentBanner ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            {savedPaymentBanner ? "Saved" : "Save Banner"}
          </Button>
        </div>
      </section>
      </div>}

      {/* ── SHIPPING ── */}
      {detailsSubTab === "shipping" && <div className="space-y-6">
      {/* Postage options moved to the Delivery panel (they were edited in two places before) */}
      <section className="pb-8 border-b border-border">
        <div className="flex items-center gap-2 mb-1">
          <Truck className="w-4 h-4 text-indigo-500" />
          <h3 className="font-semibold text-base tracking-tight">Postage Options</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Custom postage options and global delivery methods are managed together in the <strong>Delivery</strong> page (Setup section of the sidebar).
        </p>
      </section>

      {/* 11. Vendor Shipping Notice */}
      <section className="pb-8 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-sky-500" />
            <h3 className="font-semibold text-base tracking-tight">Vendor Shipping Notice</h3>
          </div>
          <Switch checked={!!(gb.vendorShippingEnabled)} onChange={toggleVendorShipping} busy={togglingVendorShipping} />
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          When enabled, a notice is shown on the order form that vendor shipping costs will be added after orders close. You can set a fixed amount or leave it blank (TBD).
        </p>
        {gb.vendorShippingEnabled && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Shipping Amount ({currSym(gb.currency ?? "GBP")})</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 5.00 (leave blank = TBD)"
                value={vendorShippingAmount}
                onChange={e => setVendorShippingAmount(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Notice Message</label>
              <textarea
                rows={3}
                placeholder="This is not your final total. Vendor shipping is calculated after orders close and will be added separately."
                value={vendorShippingMessage}
                onChange={e => setVendorShippingMessage(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <Button size="sm" onClick={saveVendorShipping} disabled={savingVendorShipping} className="gap-1.5">
              {savingVendorShipping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : savedVendorShipping ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              {savedVendorShipping ? "Saved" : "Save Vendor Shipping"}
            </Button>
          </div>
        )}
      </section>

      {/* 12. Direct Shipping to Home */}
      <section className="pb-8 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Home className="w-4 h-4" style={{ color: "#1B3A7A" }} />
            <h3 className="font-semibold text-base tracking-tight">Direct Shipping to Home</h3>
          </div>
          <Switch checked={!!(gb.directShippingEnabled)} onChange={toggleDirectShipping} busy={togglingDirectShipping} />
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          When enabled, members can opt to have their order shipped directly to their home address. A wholesale vendor can be linked for dynamic cost calculation (optional).
        </p>
        {gb.directShippingEnabled && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Wholesale Vendor ID <span className="font-normal">(optional — for dynamic cost calc)</span></label>
              <input
                type="text"
                placeholder="e.g. vendor-id-here (leave blank if not applicable)"
                value={directShippingVendorId}
                onChange={e => setDirectShippingVendorId(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <Button size="sm" onClick={saveDirectShipping} disabled={savingDirectShipping} className="gap-1.5">
              {savingDirectShipping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : savedDirectShipping ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              {savedDirectShipping ? "Saved" : "Save Direct Shipping"}
            </Button>
          </div>
        )}
      </section>
      </div>}

      {/* ── ACCESS ── */}
      {detailsSubTab === "access" && <div className="space-y-6">
      {/* QR Viewer Access */}
      <section className="pb-8 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <UserCheck className="w-4 h-4" style={{ color: "#1B3A7A" }} />
          <h3 className="font-semibold text-base tracking-tight">QR Viewer Access</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Grant specific members access to the QR Viewer for this group buy, even if they're not an organiser.</p>
        {qrViewerUsernames.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {qrViewerUsernames.map(u => (
              <span key={u} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                @{u}
                <button
                  type="button"
                  onClick={() => {
                    const next = qrViewerUsernames.filter(v => v !== u);
                    setQrViewerUsernames(next);
                    saveQrViewers(next);
                  }}
                  className="ml-0.5 hover:opacity-70"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="space-y-1.5">
          <div className="flex gap-2">
            <input
              type="text"
              value={qrViewerInput}
              onChange={e => { setQrViewerInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")); setQrViewerError(""); }}
              onKeyDown={async e => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const v = qrViewerInput.trim();
                  if (!v || qrViewerUsernames.includes(v)) return;
                  setSavingQrViewers(true); setQrViewerError("");
                  try {
                    const chk = await fetch(apiUrl(`/admin/check-user/${encodeURIComponent(v)}`), { headers: { "x-admin-secret": secret } });
                    const d = await chk.json();
                    if (!d.exists) { setQrViewerError("User not found"); setSavingQrViewers(false); return; }
                    const next = [...qrViewerUsernames, v];
                    setQrViewerUsernames(next);
                    setQrViewerInput("");
                    saveQrViewers(next);
                  } catch { setQrViewerError("Could not verify user"); }
                  setSavingQrViewers(false);
                }
              }}
              placeholder="telegram username (no @)"
              className={cn("flex-1 rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary", qrViewerError ? "border-red-400" : "border-input")}
            />
            <Button
              size="sm"
              disabled={!qrViewerInput.trim() || qrViewerUsernames.includes(qrViewerInput.trim()) || savingQrViewers}
              onClick={async () => {
                const v = qrViewerInput.trim();
                if (!v || qrViewerUsernames.includes(v)) return;
                setSavingQrViewers(true); setQrViewerError("");
                try {
                  const chk = await fetch(apiUrl(`/admin/check-user/${encodeURIComponent(v)}`), { headers: { "x-admin-secret": secret } });
                  const d = await chk.json();
                  if (!d.exists) { setQrViewerError("User not found"); setSavingQrViewers(false); return; }
                  const next = [...qrViewerUsernames, v];
                  setQrViewerUsernames(next);
                  setQrViewerInput("");
                  saveQrViewers(next);
                } catch { setQrViewerError("Could not verify user"); }
                setSavingQrViewers(false);
              }}
              className="gap-1.5 shrink-0"
            >
              {savingQrViewers ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : savedQrViewers ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {savedQrViewers ? "Saved" : "Add"}
            </Button>
          </div>
          {qrViewerError && (
            <p className="text-xs font-medium text-red-500">{qrViewerError}</p>
          )}
        </div>
      </section>

      {/* 12b. Leg Viewer Access */}
      <section className="pb-8 border-b border-border">
        <div className="flex items-center gap-2 mb-1">
          <Globe className="w-4 h-4" style={{ color: "#1B3A7A" }} />
          <h3 className="font-semibold text-base tracking-tight">Leg Viewer Access</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Grant specific members read-only access to order summaries for selected legs of this group buy.
          {legViewerLegs.length === 0 && (
            <span className="block mt-1 text-amber-600 font-medium">⚠ No country legs configured — add legs first to assign viewers.</span>
          )}
        </p>

        {/* Existing leg viewer entries */}
        {legViewerAccess.length > 0 && (
          <div className="space-y-2 mb-4">
            {legViewerAccess.map(entry => (
              <div key={entry.username} className="rounded-xl border bg-blue-50/40" style={{ borderColor: "rgba(27,58,122,0.12)" }}>
                <div className="flex items-start gap-2 p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold" style={{ color: "#1B3A7A" }}>@{entry.username}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {entry.legIds.map(lid => {
                        const leg = legViewerLegs.find(l => l.id === lid);
                        return (
                          <span key={lid} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                            {leg ? leg.countryName : lid}
                          </span>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        sessionStorage.setItem("peps_admin_preview_secret", secret);
                        window.open(`/leg-view/${gb.id}?as=${encodeURIComponent(entry.username)}`, "_blank");
                      }}
                      className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-semibold text-blue-600 hover:underline"
                    >
                      <ExternalLink className="w-2.5 h-2.5" /> View as this user
                    </button>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 mt-0.5">
                    <button
                      type="button"
                      title="Edit countries"
                      onClick={() => {
                        if (editingLegViewerUsername === entry.username) {
                          setEditingLegViewerUsername(null);
                        } else {
                          setEditingLegViewerUsername(entry.username);
                          setEditingLegIds(entry.legIds);
                        }
                      }}
                      className="text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = legViewerAccess.filter(e => e.username !== entry.username);
                        setLegViewerAccess(next);
                        saveLegViewers(next);
                        if (editingLegViewerUsername === entry.username) setEditingLegViewerUsername(null);
                      }}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Inline editor */}
                {editingLegViewerUsername === entry.username && (
                  <div className="border-t px-3 pb-3 pt-2.5 space-y-2" style={{ borderColor: "rgba(27,58,122,0.12)" }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#94A3B8" }}>Select countries</p>
                    <div className="flex flex-wrap gap-1.5">
                      {legViewerLegs.map(leg => {
                        const selected = editingLegIds.includes(leg.id);
                        return (
                          <button
                            key={leg.id}
                            type="button"
                            onClick={() => setEditingLegIds(prev =>
                              selected ? prev.filter(id => id !== leg.id) : [...prev, leg.id]
                            )}
                            className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all"
                            style={selected
                              ? { background: "#1B3A7A", color: "#fff", borderColor: "#1B3A7A" }
                              : { background: "#fff", color: "#64748B", borderColor: "rgba(27,58,122,0.2)" }}
                          >
                            {leg.countryName}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        disabled={editingLegIds.length === 0 || savingLegViewers}
                        onClick={async () => {
                          const next = legViewerAccess.map(e =>
                            e.username === entry.username ? { ...e, legIds: editingLegIds } : e
                          );
                          setLegViewerAccess(next);
                          await saveLegViewers(next);
                          setEditingLegViewerUsername(null);
                        }}
                        className="gap-1.5"
                      >
                        {savingLegViewers ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingLegViewerUsername(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add new viewer form */}
        {legViewerLegs.length > 0 && (
          <div className="space-y-2 border-t pt-3" style={{ borderColor: "rgba(27,58,122,0.08)" }}>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={legViewerInput}
                  onChange={e => { setLegViewerInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")); setLegViewerError(""); }}
                  onBlur={() => setTimeout(() => setLegViewerSuggestions([]), 150)}
                  placeholder="telegram username (no @)"
                  className={cn("w-full rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary", legViewerError ? "border-red-400" : "border-input")}
                />
                {legViewerSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border bg-background shadow-lg overflow-hidden" style={{ borderColor: "rgba(27,58,122,0.15)" }}>
                    {legViewerSuggestions.map(u => (
                      <button key={u} type="button"
                        onMouseDown={e => { e.preventDefault(); setLegViewerInput(u); setLegViewerSuggestions([]); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors font-mono">
                        @{u}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button
                size="sm"
                disabled={!legViewerInput.trim() || legViewerSelectedLegs.length === 0 || savingLegViewers}
                onClick={async () => {
                  const v = legViewerInput.trim();
                  if (!v || legViewerSelectedLegs.length === 0) return;
                  setSavingLegViewers(true); setLegViewerError("");
                  try {
                    const chk = await fetch(apiUrl(`/admin/check-user/${encodeURIComponent(v)}`), { headers: { "x-admin-secret": secret } });
                    const d = await chk.json();
                    if (!d.exists) { setLegViewerError("User not found"); setSavingLegViewers(false); return; }
                    const existing = legViewerAccess.find(e => e.username === v);
                    const next = existing
                      ? legViewerAccess.map(e => e.username === v ? { ...e, legIds: [...new Set([...e.legIds, ...legViewerSelectedLegs])] } : e)
                      : [...legViewerAccess, { username: v, legIds: legViewerSelectedLegs }];
                    setLegViewerAccess(next);
                    setLegViewerInput("");
                    setLegViewerSelectedLegs([]);
                    await saveLegViewers(next);
                  } catch { setLegViewerError("Could not verify user"); }
                  setSavingLegViewers(false);
                }}
                className="gap-1.5 shrink-0"
              >
                {savingLegViewers ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : savedLegViewers ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                {savedLegViewers ? "Saved" : "Add"}
              </Button>
            </div>
            {legViewerError && <p className="text-xs font-medium text-red-500">{legViewerError}</p>}
            {/* Leg checkboxes */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#94A3B8" }}>Select legs to grant access to</p>
              <div className="flex flex-wrap gap-1.5">
                {legViewerLegs.map(leg => {
                  const selected = legViewerSelectedLegs.includes(leg.id);
                  return (
                    <button
                      key={leg.id}
                      type="button"
                      onClick={() => setLegViewerSelectedLegs(prev =>
                        selected ? prev.filter(id => id !== leg.id) : [...prev, leg.id]
                      )}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all"
                      style={selected
                        ? { background: "#1B3A7A", color: "#fff", borderColor: "#1B3A7A" }
                        : { background: "#fff", color: "#64748B", borderColor: "rgba(27,58,122,0.2)" }}
                    >
                      {leg.countryName}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 12. QR Code Upload */}
      <section className="pb-8 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4" style={{ color: "#1B3A7A" }} />
            <h3 className="font-semibold text-base tracking-tight">QR Code Upload</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-medium">InPost <Switch checked={!!gb.qrUploadInpostEnabled} onChange={toggleQrInpost} busy={togglingQrInpost} /></span>
            <span className="flex items-center gap-1.5 text-xs font-medium">Royal Mail <Switch checked={!!gb.qrUploadRoyalMailEnabled} onChange={toggleQrRoyalMail} busy={togglingQrRoyalMail} /></span>
          </div>
        </div>
        {(gb.qrUploadInpostEnabled || gb.qrUploadRoyalMailEnabled) ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Members will see QR upload section(s) on their order page once payment is confirmed.</p>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Custom message (optional)</label>
              <textarea
                value={qrUploadMessage}
                onChange={e => setQrUploadMessage(e.target.value)}
                rows={3}
                placeholder="Instructions shown to members. Leave blank for default text."
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={saveQrMsg} disabled={savingQrMsg} className="gap-1.5">
                {savingQrMsg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : savedQrMsg ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                {savedQrMsg ? "Saved" : "Save Message"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => window.open(`/qr-viewer/${gb.id}`, "_blank")} className="gap-1.5">
                <QrCode className="w-3.5 h-3.5" /> View QR Codes
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Enable InPost and/or Royal Mail QR uploads for members to submit their QR codes after payment.</p>
        )}
      </section>
      </div>}

      {/* Stock View + Allow Extra Orders — Ordering tab */}
      {detailsSubTab === "ordering" && <div className="space-y-6">
      {/* Stock View */}
      <section className="pb-8 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" style={{ color: "#1B3A7A" }} />
            <div>
              <h3 className="font-semibold text-base tracking-tight">Stock View</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {(gb.showStockView ?? true)
                  ? "Members can see stock levels on the order form — the fill-level modal, product dropdown indicators, and the bar below each product row."
                  : "Stock view is hidden. Members see no stock indicators on the order form."}
              </p>
            </div>
          </div>
          <Switch checked={gb.showStockView ?? true} onChange={toggleStockView} busy={togglingStockView} />
        </div>
      </section>

      {/* 14. Allow Extra Orders */}
      <section className="pb-8 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" style={{ color: "#1B3A7A" }} />
            <div>
              <h3 className="font-semibold text-base tracking-tight">Allow Extra Orders</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {(gb.allowExtraOrders ?? false)
                  ? "All members can place another order on this GB, even if they have already reached their kit limit."
                  : "Kit limits apply normally. Enable to let all paid members re-order without restriction."}
              </p>
            </div>
          </div>
          <Switch checked={gb.allowExtraOrders ?? false} onChange={toggleExtraOrders} busy={togglingExtraOrders} />
        </div>
      </section>
      </div>}
      </div>
    </div>
  );
}

// ─── CSV Import Modal ─────────────────────────────────────────
