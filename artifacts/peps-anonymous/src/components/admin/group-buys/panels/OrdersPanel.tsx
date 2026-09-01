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
  Filter, MoreHorizontal,
} from "lucide-react";
import { Button, Card, Input, Label, cn } from "@/components/ui";
import { ImageLightbox } from "@/components/ImageLightbox";
import { currSym } from "@/lib/currency";
import { COUNTRIES, COUNTRY_LIST } from "@/data/countries";
import { lookupBatchPrefix, findMatchingPeptide } from "@/data/batchPrefixes";
import { CARRIERS_17TRACK } from "@/lib/carriers";
import { resolveCountry, apiUrl, INFO_CARD_TYPE_OPTIONS, InfoCardsEditor, ShippingOptionsEditor, CRYPTO_CURRENCIES, TROCADOR_COINS, CRYPTO_NETWORKS, DEFAULT_CRYPTO_NETWORKS, GbPaymentGatewayInlineContent, EU_COUNTRIES, POPULAR_COUNTRIES, GBP_TO_USD, GB_STATUS_STYLES, CopyIdBadge, StatusBadge } from "../shared/core";
import type { GroupBuy, InfoCard, ShippingOption, EntryFeePayment, GbPaymentConfig, GBProduct, DeliveryMethod, GBDeliveryMethod, Member, Product, CustomCourier } from "../shared/core";
import { GroupBuyOrderBreakdown } from "@/components/GroupBuyOrderBreakdown";
export interface GbOrder {
  id: string;
  code: string;
  telegramUsername: string;
  accountCountry: string | null;
  status: string;
  paymentStatus: string;
  pin: string;
  trackingNumber: string | null;
  adminNotes: string | null;
  paymentMethod: string;
  paymentTxHash: string | null;
  testPaymentTxHash: string | null;
  paymentTestAmount: number | null;
  hasPaymentScreenshot?: boolean;
  grandTotal: number;
  productSubtotal: number;
  deliveryPrice: number;
  vendorShipping: number;
  tip: number;
  deliveryMethod: string;
  notes: string | null;
  shippingName: string | null;
  shippingAddress: string | null;
  testingContribution: number | null;
  creditsApplied?: number;
  amountDue?: number;
  balancePaymentStatus?: string | null;
  balanceTxHash?: string | null;
  balanceConfirmedAt?: string | null;
  shippingCountry: string | null;
  countryLegId: string | null;
  reshipperUsername?: string | null;
  createdAt: string;
  paymentConfirmedAt?: string | null;
  directShippingRequested?: boolean;
  directShippingCost?: number | null;
  isWholesale?: boolean;
  inpostQrCode?: string | null;
  royalMailQrCode?: string | null;
  adminFee?: number;
  adminFeeLabel?: string | null;
  lineItems: { id: string; productName: string; quantity: number; unitPrice: number; lineTotal: number }[];
}

export interface GbOrderEdit {
  status: string;
  paymentStatus: string;
  paymentTxHash: string;
  paymentUsdAmount: string;
  trackingNumber: string;
  adminNotes: string;
  shippingName: string;
  shippingAddress: string;
  deliveryMethod: string;
  deliveryPrice: string;
}

export const ORDER_STATUSES = ["Draft", "Submitted", "Processing", "Shipped", "Completed", "Cancelled"];
export const PAYMENT_STATUSES = ["unpaid", "test_ready", "test_confirmed", "pending_confirmation", "confirmed", "failed", "rejected"];

export const ORDER_STATUS_COLORS: Record<string, string> = {
  Draft: "text-slate-500 bg-slate-50 border-slate-200",
  Submitted: "text-blue-600 bg-blue-50 border-blue-200",
  Processing: "text-amber-600 bg-amber-50 border-amber-200",
  Shipped: "text-violet-600 bg-violet-50 border-violet-200",
  Completed: "text-green-600 bg-green-50 border-green-200",
  Cancelled: "text-red-500 bg-red-50 border-red-200",
};

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  confirmed: "text-green-600 bg-green-50 border-green-200",
  pending_confirmation: "text-amber-600 bg-amber-50 border-amber-200",
  unpaid: "text-slate-500 bg-slate-50 border-slate-200",
  failed: "text-red-600 bg-red-50 border-red-200",
  rejected: "text-red-600 bg-red-50 border-red-200",
  test_ready: "text-blue-600 bg-blue-50 border-blue-200",
  test_confirmed: "text-blue-600 bg-blue-50 border-blue-200",
};

export function exportGbOrdersCsv(orders: GbOrder[], gb: { name: string; currency: string }) {
  const header = ["Code", "Username", "Status", "Payment Status", "Payment Method", `Total (${gb.currency})`, "Tracking", "Shipping Name", "Shipping Address", "Country", "Admin Notes", "Date", "Items"];
  const rows = orders.map(o => [
    o.code, `@${o.telegramUsername}`, o.status, o.paymentStatus, o.paymentMethod,
    o.grandTotal.toFixed(2), o.trackingNumber ?? "", o.shippingName ?? "", o.shippingAddress ?? "",
    o.shippingCountry ?? "", o.adminNotes ?? "",
    new Date(o.createdAt).toLocaleDateString("en-GB"),
    o.lineItems.map(li => `${li.productName} x${li.quantity}`).join("; "),
  ]);
  const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url;
  a.download = `${gb.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_orders.csv`; a.click();
  URL.revokeObjectURL(url);
}
export function downloadGbImportTemplate(gbName: string) {
  const header = ["telegramUsername", "status", "shippingAmount", "adminNotes", "items"];
  const example = ["@username", "Submitted", "0.00", "Admin note", "BPC-157 x2 @12.50; TB-500 x1 @25.00"];
  const csv = [header, example].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url;
  a.download = `${gbName.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_import_template.csv`; a.click();
  URL.revokeObjectURL(url);
}
export function splitGbCsvRow(row: string): string[] {
  const result: string[] = []; let cur = ""; let inQ = false;
  for (let i = 0; i < row.length; i++) {
    const c = row[i];
    if (c === '"') { if (inQ && row[i + 1] === '"') { cur += '"'; i++; } else { inQ = !inQ; } }
    else if (c === ',' && !inQ) { result.push(cur); cur = ""; }
    else { cur += c; }
  }
  result.push(cur); return result;
}
export function parseGbCsvText(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = splitGbCsvRow(lines[0]).map(h => h.trim());
  return lines.slice(1).map(line => {
    const vals = splitGbCsvRow(line);
    return Object.fromEntries(headers.map((h, i) => [h, (vals[i] ?? "").trim()]));
  });
}
export function parseGbImportItems(items: string): { productName: string; quantity: number; unitPrice: number; isCustom: boolean }[] {
  if (!items.trim()) return [];
  return items.split(";").map(s => s.trim()).filter(Boolean).flatMap(item => {
    const m = item.match(/^(.+?)\s+x(\d+(?:\.\d+)?)\s*(?:@([\d.]+))?$/i);
    if (!m) return [{ productName: item.trim(), quantity: 1, unitPrice: 0, isCustom: true }];
    return [{ productName: m[1].trim(), quantity: parseFloat(m[2]), unitPrice: parseFloat(m[3] ?? "0"), isCustom: true }];
  });
}

export function OrdersSubTab({ secret, gb }: { secret: string; gb: GroupBuy }) {
  const [orders, setOrders] = useState<GbOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [orderScreenshots, setOrderScreenshots] = useState<Record<string, string | null | "loading">>({});
  const [editOpen, setEditOpen] = useState<Set<string>>(new Set());
  const [edits, setEdits] = useState<Record<string, GbOrderEdit>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saveOk, setSaveOk] = useState<Record<string, boolean>>({});
  const [saveErr, setSaveErr] = useState<Record<string, string>>({});
  const [gbQrSaving, setGbQrSaving] = useState<Record<string, boolean>>({});
  const [gbQrMsg, setGbQrMsg] = useState<Record<string, { ok: boolean; text: string }>>({});
  const [search, setSearch] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState<Set<string>>(new Set());
  const [countryLegFilter, setCountryLegFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [payDateFrom, setPayDateFrom] = useState("");
  const [payDateTo, setPayDateTo] = useState("");
  const [sortBy, setSortBy] = useState<"order_desc" | "order_asc" | "pay_desc" | "pay_asc">("order_desc");
  const [noVsFilter, setNoVsFilter] = useState(false);
  const [balanceFilter, setBalanceFilter] = useState<"all" | "owed" | "paid">("all");
  const [directShippingFilter, setDirectShippingFilter] = useState(false);
  const [wholesaleFilter, setWholesaleFilter] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);

  // Create order
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({ telegramUsername: "", pin: "", vendorShipping: "", notes: "", status: "Submitted", lineItems: [{ productName: "", quantity: "1", unitPrice: "" }] });
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState("");
  const [createOk, setCreateOk] = useState("");
  const [legs, setLegs] = useState<{ id: string; countryCode: string; countryName: string }[]>([]);
  const importRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const [backfilling, setBackfilling] = useState(false);
  const [backfillMsg, setBackfillMsg] = useState("");

  // Vendor shipping quick-apply (per country filter)
  const [vsAmount, setVsAmount] = useState("");
  const [vsApplying, setVsApplying] = useState(false);
  const [vsResult, setVsResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Order selection + bulk add-product
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [bulkAddOpen, setBulkAddOpen] = useState(false);
  const [bulkAddProductId, setBulkAddProductId] = useState("");
  const [bulkAddQty, setBulkAddQty] = useState("1");
  const [bulkAddSubmitting, setBulkAddSubmitting] = useState(false);
  const [bulkAddResult, setBulkAddResult] = useState<{ added: number; skipped: number; productName: string } | null>(null);
  const [bulkAddError, setBulkAddError] = useState("");
  const [bulkAddProducts, setBulkAddProducts] = useState<{ id: string; name: string; price: number; priceOverride?: number | null }[]>([]);

  const loadBulkAddProducts = useCallback(() => {
    if (bulkAddProducts.length > 0) return;
    Promise.all([
      fetch(apiUrl(`/admin/group-buys/${gb.id}/products`), { headers: { "x-admin-secret": secret } }).then(r => r.ok ? r.json() : []),
      fetch(apiUrl(`/admin/group-buys/${gb.id}/products-catalog`), { headers: { "x-admin-secret": secret } }).then(r => r.ok ? r.json() : []),
    ]).then(([gbProds, catalog]: [{ productId: string; priceOverride: number | null; active: boolean }[], { id: string; name: string; price: number; mgSize: string | null }[]]) => {
      const catalogMap = new Map(catalog.map(p => [p.id, p]));
      const linked = gbProds.filter(p => p.active).map(p => {
        const cat = catalogMap.get(p.productId);
        if (!cat) return null;
        return { id: p.productId, name: cat.name + (cat.mgSize ? ` ${cat.mgSize}` : ""), price: p.priceOverride ?? cat.price };
      }).filter(Boolean) as { id: string; name: string; price: number }[];
      setBulkAddProducts(linked);
    }).catch(() => {});
  }, [secret, gb.id, bulkAddProducts.length]);

  const handleBulkAddProduct = async () => {
    if (!bulkAddProductId || selectedOrderIds.size === 0) return;
    const qty = parseFloat(bulkAddQty);
    if (isNaN(qty) || qty <= 0) { setBulkAddError("Enter a valid quantity"); return; }
    setBulkAddSubmitting(true);
    setBulkAddError("");
    setBulkAddResult(null);
    try {
      const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}/orders/bulk-add-product`), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ orderIds: [...selectedOrderIds], productId: bulkAddProductId, quantity: qty }),
      });
      const data = await res.json();
      if (!res.ok) { setBulkAddError(data.error ?? "Failed"); return; }
      setBulkAddResult({ added: data.added, skipped: data.skipped, productName: data.productName });
      loadOrders();
    } catch { setBulkAddError("Network error"); }
    finally { setBulkAddSubmitting(false); }
  };

  const loadOrders = useCallback(() => {
    setLoading(true);
    fetch(apiUrl(`/admin/group-buys/${gb.id}/orders`), { headers: { "x-admin-secret": secret } })
      .then(r => r.ok ? r.json() : [])
      .then(d => { setOrders(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [secret, gb.id]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  useEffect(() => {
    if (!gb.countryLegsEnabled) return;
    fetch(apiUrl(`/admin/group-buys/${gb.id}/country-legs`), { headers: { "x-admin-secret": secret } })
      .then(r => r.ok ? r.json() : [])
      .then(d => setLegs(d))
      .catch(() => {});
  }, [secret, gb.id, gb.countryLegsEnabled]);

  const toggleExpand = (id: string) => {
    setExpanded(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const order = orders.find(o => o.id === id);
    if (order?.hasPaymentScreenshot && orderScreenshots[id] === undefined) {
      setOrderScreenshots(prev => ({ ...prev, [id]: "loading" }));
      fetch(`/api/admin/group-buys/${gb.id}/orders/${id}/screenshot`, { headers: { "x-admin-secret": secret } })
        .then(r => r.json())
        .then(d => setOrderScreenshots(prev => ({ ...prev, [id]: d.paymentScreenshot ?? null })))
        .catch(() => setOrderScreenshots(prev => ({ ...prev, [id]: null })));
    }
  };

  const openEdit = (o: GbOrder) => {
    setEdits(prev => ({
      ...prev,
      [o.id]: { status: o.status, paymentStatus: o.paymentStatus, paymentTxHash: o.paymentTxHash ?? "", paymentUsdAmount: "", trackingNumber: o.trackingNumber ?? "", adminNotes: o.adminNotes ?? "", shippingName: o.shippingName ?? "", shippingAddress: o.shippingAddress ?? "", deliveryMethod: o.deliveryMethod ?? "", deliveryPrice: String(o.deliveryPrice ?? "") },
    }));
    setEditOpen(s => { const n = new Set(s); n.add(o.id); return n; });
  };

  const closeEdit = (id: string) => setEditOpen(s => { const n = new Set(s); n.delete(id); return n; });

  const handleImportCsv = async (file: File) => {
    setImporting(true); setImportMsg("Importing…");
    try {
      const text = await file.text();
      const rows = parseGbCsvText(text);
      if (rows.length === 0) { setImportMsg("No valid rows found"); setImporting(false); return; }
      let ok = 0; let fail = 0;
      for (const row of rows) {
        const username = (row["telegramUsername"] ?? row["username"] ?? "").trim();
        const items = parseGbImportItems(row["items"] ?? "");
        if (!username || items.length === 0) { fail++; continue; }
        try {
          const res = await fetch(apiUrl("/admin/orders"), {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-admin-secret": secret },
            body: JSON.stringify({
              telegramUsername: username,
              status: row["status"] || "Submitted",
              groupBuyId: gb.id,
              customShipping: parseFloat(row["shippingAmount"] ?? "0") || 0,
              notes: (row["adminNotes"] ?? row["notes"] ?? "").trim() || undefined,
              lineItems: items,
            }),
          });
          if (res.ok) { const d = await res.json(); setOrders(prev => [d as GbOrder, ...prev]); ok++; }
          else fail++;
        } catch { fail++; }
      }
      setImportMsg(`Imported ${ok} order${ok !== 1 ? "s" : ""}${fail > 0 ? `, ${fail} failed` : ""} ✓`);
      setTimeout(() => setImportMsg(""), 6000);
    } catch { setImportMsg("Failed to read file"); }
    setImporting(false);
  };

  const handleGbCreate = async () => {
    setCreating(true);
    setCreateMsg("");
    try {
      const res = await fetch(apiUrl("/admin/orders"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({
          telegramUsername: createForm.telegramUsername.trim(),
          groupBuyId: gb.id,
          customShipping: 0,
          vendorShipping: parseFloat(createForm.vendorShipping) || 0,
          pin: createForm.pin || undefined,
          notes: createForm.notes || undefined,
          status: createForm.status,
          lineItems: createForm.lineItems
            .filter(li => li.productName.trim() && parseFloat(li.quantity) > 0)
            .map(li => ({
              productName: li.productName.trim(),
              quantity: parseFloat(li.quantity),
              unitPrice: parseFloat(li.unitPrice) || 0,
            })),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setCreateMsg(data.detail || data.error || "Failed to create order"); setCreating(false); return; }
      setOrders(prev => [data as GbOrder, ...prev]);
      setCreateForm({ telegramUsername: "", pin: "", vendorShipping: "", notes: "", status: "Submitted", lineItems: [{ productName: "", quantity: "1", unitPrice: "" }] });
      setShowCreateForm(false);
      setCreateOk(`Order ${(data as any).code} created ✓`);
      setTimeout(() => setCreateOk(""), 4000);
    } catch { setCreateMsg("Network error — try again"); }
    setCreating(false);
  };

  const updateCreateLine = (i: number, field: string, val: string) =>
    setCreateForm(p => ({ ...p, lineItems: p.lineItems.map((li, idx) => idx === i ? { ...li, [field]: val } : li) }));
  const addCreateLine = () =>
    setCreateForm(p => ({ ...p, lineItems: [...p.lineItems, { productName: "", quantity: "1", unitPrice: "" }] }));
  const removeCreateLine = (i: number) =>
    setCreateForm(p => ({ ...p, lineItems: p.lineItems.filter((_, idx) => idx !== i) }));

  const updateEdit = (id: string, k: keyof GbOrderEdit, v: string) =>
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], [k]: v } }));

  const saveEdit = async (o: GbOrder) => {
    const edit = edits[o.id];
    if (!edit) return;
    setSaving(prev => ({ ...prev, [o.id]: true }));
    setSaveErr(prev => ({ ...prev, [o.id]: "" }));
    try {
      const res = await fetch(apiUrl(`/admin/orders/${o.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({
          status: edit.status,
          paymentStatus: edit.paymentStatus,
          paymentTxHash: edit.paymentTxHash?.trim() || undefined,
          paymentUsdAmount: edit.paymentUsdAmount ? parseFloat(edit.paymentUsdAmount) || undefined : undefined,
          trackingNumber: edit.trackingNumber.trim() || null,
          adminNotes: edit.adminNotes.trim() || null,
          shippingName: edit.shippingName.trim() || null,
          shippingAddress: edit.shippingAddress.trim() || null,
          deliveryMethod: edit.deliveryMethod.trim() || undefined,
          deliveryPrice: edit.deliveryPrice.trim() ? parseFloat(edit.deliveryPrice) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setSaveErr(prev => ({ ...prev, [o.id]: data.error || "Failed to save" })); return; }
      setOrders(prev => prev.map(ord => ord.id === o.id ? {
        ...ord,
        status: data.status,
        paymentStatus: data.paymentStatus,
        paymentTxHash: data.paymentTxHash,
        trackingNumber: data.trackingNumber,
        adminNotes: data.adminNotes,
        shippingName: data.shippingName ?? ord.shippingName,
        shippingAddress: data.shippingAddress ?? ord.shippingAddress,
        deliveryMethod: data.deliveryMethod ?? ord.deliveryMethod,
        deliveryPrice: data.deliveryPrice ?? ord.deliveryPrice,
        grandTotal: data.grandTotal ?? ord.grandTotal,
      } : ord));
      setSaveOk(prev => ({ ...prev, [o.id]: true }));
      setTimeout(() => setSaveOk(prev => ({ ...prev, [o.id]: false })), 2000);
      closeEdit(o.id);
    } catch { setSaveErr(prev => ({ ...prev, [o.id]: "Connection error" })); }
    finally { setSaving(prev => ({ ...prev, [o.id]: false })); }
  };

  const uploadGbQr = async (orderId: string, courier: string, file: File | null) => {
    const key = `${orderId}-${courier}`;
    setGbQrSaving(prev => ({ ...prev, [key]: true }));
    setGbQrMsg(prev => ({ ...prev, [key]: { ok: false, text: "" } }));
    try {
      let qrCode: string | null = null;
      if (file) {
        qrCode = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }
      const res = await fetch(apiUrl(`/admin/orders/${orderId}/qr`), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ courier, qrCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGbQrMsg(prev => ({ ...prev, [key]: { ok: false, text: data.error || "Upload failed" } }));
      } else {
        const qrField = courier === "inpost" ? "inpostQrCode" : "royalMailQrCode";
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, [qrField]: qrCode } : o));
        setGbQrMsg(prev => ({ ...prev, [key]: { ok: true, text: qrCode ? "Uploaded ✓" : "Cleared ✓" } }));
        setTimeout(() => setGbQrMsg(prev => ({ ...prev, [key]: { ok: false, text: "" } })), 2500);
      }
    } catch {
      setGbQrMsg(prev => ({ ...prev, [key]: { ok: false, text: "Network error" } }));
    }
    setGbQrSaving(prev => ({ ...prev, [key]: false }));
  };

  const q = search.trim().toLowerCase();
  const uniqueCountries = [...new Set(orders.map(o => o.shippingCountry).filter(Boolean))].sort() as string[];
  const selectedLeg = countryLegFilter !== "all" ? legs.find(l => l.id === countryLegFilter) : null;
  const filtered = orders.filter(o => {
    const matchPayment = paymentMethodFilter === "all" || o.paymentMethod === paymentMethodFilter;
    const matchCountry = countryFilter.size === 0 || countryFilter.has(o.shippingCountry ?? "");
    const matchLeg = countryLegFilter === "all"
      || o.countryLegId === countryLegFilter
      || (!o.countryLegId && selectedLeg && o.accountCountry?.toLowerCase() === selectedLeg.countryName.toLowerCase());
    const orderDate = new Date(o.createdAt);
    const matchFrom = !dateFrom || orderDate >= new Date(dateFrom);
    const matchTo = !dateTo || orderDate <= new Date(new Date(dateTo).getTime() + 86399999);
    const payDate = o.paymentConfirmedAt ? new Date(o.paymentConfirmedAt) : null;
    const matchPayFrom = !payDateFrom || (payDate != null && payDate >= new Date(payDateFrom));
    const matchPayTo = !payDateTo || (payDate != null && payDate <= new Date(new Date(payDateTo).getTime() + 86399999));
    const matchPaymentStatus = paymentStatusFilter === "all"
      || (paymentStatusFilter === "confirmed" && (o.paymentStatus === "confirmed" || o.paymentStatus === "test_confirmed"))
      || (paymentStatusFilter === "unpaid" && o.paymentStatus === "unpaid")
      || (paymentStatusFilter === "pending" && o.paymentStatus === "pending_confirmation")
      || (paymentStatusFilter === "rejected" && (o.paymentStatus === "rejected" || o.paymentStatus === "failed"))
      || (paymentStatusFilter === "test_payment" && o.paymentStatus === "test_confirmed")
      || (paymentStatusFilter === "partial" && o.testPaymentTxHash != null && o.paymentTxHash == null);
    const matchSearch = !q || o.code.toLowerCase().includes(q) || o.telegramUsername.toLowerCase().includes(q) || o.status.toLowerCase().includes(q) || o.paymentStatus.toLowerCase().includes(q) || (o.notes ?? "").toLowerCase().includes(q) || (o.adminNotes ?? "").toLowerCase().includes(q) || (o.paymentTxHash ?? "").toLowerCase().includes(q) || (o.balanceTxHash ?? "").toLowerCase().includes(q);
    const matchNoVs = !noVsFilter || (o.vendorShipping === 0 || o.vendorShipping == null);
    const matchBalance = balanceFilter === "all"
      || (balanceFilter === "owed" && (o.amountDue ?? 0) > 0 && o.balancePaymentStatus !== "confirmed")
      || (balanceFilter === "paid" && o.balancePaymentStatus === "confirmed");
    const matchDirectShipping = !directShippingFilter || o.directShippingRequested === true;
    const matchWholesale = !wholesaleFilter || o.isWholesale === true;
    return matchPayment && matchPaymentStatus && matchCountry && matchLeg && matchFrom && matchTo && matchPayFrom && matchPayTo && matchSearch && matchNoVs && matchBalance && matchDirectShipping && matchWholesale;
  }).sort((a, b) => {
    if (sortBy === "order_asc") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (sortBy === "pay_desc") {
      const at = a.paymentConfirmedAt ? new Date(a.paymentConfirmedAt).getTime() : 0;
      const bt = b.paymentConfirmedAt ? new Date(b.paymentConfirmedAt).getTime() : 0;
      return bt - at;
    }
    if (sortBy === "pay_asc") {
      const at = a.paymentConfirmedAt ? new Date(a.paymentConfirmedAt).getTime() : Infinity;
      const bt = b.paymentConfirmedAt ? new Date(b.paymentConfirmedAt).getTime() : Infinity;
      return at - bt;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  const activeFilterCount =
    (paymentMethodFilter !== "all" ? 1 : 0) +
    countryFilter.size +
    (countryLegFilter !== "all" ? 1 : 0) +
    (dateFrom || dateTo ? 1 : 0) +
    (payDateFrom || payDateTo ? 1 : 0) +
    (noVsFilter ? 1 : 0) +
    (balanceFilter !== "all" ? 1 : 0) +
    (directShippingFilter ? 1 : 0) +
    (wholesaleFilter ? 1 : 0);

  const clearAllFilters = () => {
    setPaymentMethodFilter("all");
    setPaymentStatusFilter("all");
    setCountryFilter(new Set());
    setCountryLegFilter("all");
    setDateFrom(""); setDateTo("");
    setPayDateFrom(""); setPayDateTo("");
    setNoVsFilter(false);
    setBalanceFilter("all");
    setDirectShippingFilter(false);
    setWholesaleFilter(false);
  };

  const chipStyle = (active: boolean, color: string) => ({
    background: active ? color : "transparent",
    color: active ? "#fff" : color,
    borderColor: active ? "transparent" : color + "55",
  });

  return (
    <div className="space-y-3">
      <GroupBuyOrderBreakdown
        endpoint={apiUrl(`/admin/group-buys/${gb.id}/order-breakdown`)}
        currency={gb.currency}
        headers={{ "x-admin-secret": secret }}
      />
      {/* ── Primary toolbar ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex-1 relative min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search username, code, TXID, notes…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as any)}
          className="h-8 rounded-lg border border-input bg-background px-2 text-xs focus:outline-none"
        >
          <option value="order_desc">Newest order</option>
          <option value="order_asc">Oldest order</option>
          <option value="pay_desc">Most recent paid</option>
          <option value="pay_asc">First paid</option>
        </select>
        <button
          onClick={() => setFiltersOpen(p => !p)}
          className={cn(
            "h-8 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors",
            filtersOpen || activeFilterCount > 0
              ? "bg-primary/10 text-primary border-primary/30"
              : "text-muted-foreground border-border hover:bg-muted/50",
          )}
        >
          <Filter className="w-3.5 h-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <span className="min-w-[16px] h-4 flex items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold px-1">{activeFilterCount}</span>
          )}
          {filtersOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        <div className="relative">
          <button
            onClick={() => setToolsOpen(p => !p)}
            className={cn(
              "h-8 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors",
              toolsOpen ? "bg-muted text-foreground border-border" : "text-muted-foreground border-border hover:bg-muted/50",
            )}
          >
            <MoreHorizontal className="w-3.5 h-3.5" /> Tools
          </button>
          {toolsOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setToolsOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-xl border border-border bg-background shadow-lg overflow-hidden py-1">
                {filtered.length > 0 && (
                  <button onClick={() => { exportGbOrdersCsv(filtered, gb); setToolsOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-muted flex items-center gap-2">
                    <Download className="w-3.5 h-3.5 text-muted-foreground" /> Export CSV ({filtered.length} orders)
                  </button>
                )}
                <button onClick={() => { downloadGbImportTemplate(gb.name); setToolsOpen(false); }}
                  className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-muted flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" /> Download import template
                </button>
                <button onClick={() => { importRef.current?.click(); setToolsOpen(false); }} disabled={importing}
                  className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-muted flex items-center gap-2 disabled:opacity-60">
                  {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-muted-foreground" />} Import orders CSV
                </button>
                {gb.countryLegsEnabled && legs.length > 0 && (
                  <button
                    onClick={async () => {
                      setToolsOpen(false);
                      setBackfilling(true); setBackfillMsg("");
                      try {
                        const r = await fetch(apiUrl(`/admin/group-buys/${gb.id}/backfill-country-legs`), {
                          method: "POST", headers: { "x-admin-secret": secret },
                        });
                        const d = await r.json().catch(() => ({}));
                        if (r.ok) {
                          const parts: string[] = [];
                          if (d.updated > 0) parts.push(`✓ ${d.updated} assigned`);
                          if (d.noAccount > 0) parts.push(`${d.noAccount} no account`);
                          if (d.noCountry > 0) parts.push(`${d.noCountry} no country set`);
                          if (d.noLeg > 0) parts.push(`${d.noLeg} country not in legs`);
                          setBackfillMsg(parts.length ? parts.join(" · ") : (d.message ?? "Done"));
                          loadOrders();
                        } else {
                          setBackfillMsg(d.error ?? "Failed");
                        }
                      } catch { setBackfillMsg("Request failed"); }
                      finally { setBackfilling(false); }
                    }}
                    disabled={backfilling}
                    className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-muted flex items-center gap-2 disabled:opacity-60">
                    {backfilling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5 text-muted-foreground" />} Assign country legs
                  </button>
                )}
                {gb.adminFeeEnabled && gb.adminFeeAmount != null && Number(gb.adminFeeAmount) > 0 && (
                  <button
                    onClick={async () => {
                      setToolsOpen(false);
                      setBackfilling(true); setBackfillMsg("");
                      try {
                        const r = await fetch(apiUrl(`/admin/group-buys/${gb.id}/backfill-admin-fee`), {
                          method: "POST", headers: { "x-admin-secret": secret },
                        });
                        const d = await r.json().catch(() => ({}));
                        if (r.ok) {
                          setBackfillMsg(d.updated > 0 ? `✓ Fee applied to ${d.updated} order${d.updated !== 1 ? "s" : ""}` : "All orders already have the fee");
                          loadOrders();
                        } else {
                          setBackfillMsg(d.error ?? "Backfill failed");
                        }
                      } catch { setBackfillMsg("Request failed"); }
                      finally { setBackfilling(false); }
                    }}
                    disabled={backfilling}
                    className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-muted flex items-center gap-2 disabled:opacity-60">
                    {backfilling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />} Backfill admin fee
                  </button>
                )}
              </div>
            </>
          )}
        </div>
        <input ref={importRef} type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImportCsv(f); e.target.value = ""; }} />
        <button
          onClick={() => { setShowCreateForm(p => !p); setCreateMsg(""); }}
          className="h-8 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors hover:bg-primary/10"
          style={{ color: "#2D6BCC", borderColor: "#2D6BCC55", background: showCreateForm ? "rgba(45,107,204,0.1)" : "transparent" }}
        >
          <Plus className="w-3.5 h-3.5" /> New Order
        </button>
      </div>

      {/* ── Payment status chips (primary working filter, always visible) ── */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {([
          { value: "all",          label: "All",             color: "#475569" },
          { value: "unpaid",       label: "Unpaid",          color: "#EF4444" },
          { value: "pending",      label: "Submitted",       color: "#EAB308" },
          { value: "confirmed",    label: "Paid",            color: "#16A34A" },
          { value: "test_payment", label: "Test Payment",    color: "#7C3AED" },
          { value: "partial",      label: "Partial",         color: "#EA580C" },
          { value: "rejected",     label: "Failed/Rejected", color: "#64748B" },
        ] as const).map(t => {
          const count = t.value === "all" ? orders.length
            : t.value === "confirmed" ? orders.filter(o => o.paymentStatus === "confirmed" || o.paymentStatus === "test_confirmed").length
            : t.value === "pending" ? orders.filter(o => o.paymentStatus === "pending_confirmation").length
            : t.value === "rejected" ? orders.filter(o => o.paymentStatus === "rejected" || o.paymentStatus === "failed").length
            : t.value === "test_payment" ? orders.filter(o => o.paymentStatus === "test_confirmed").length
            : t.value === "partial" ? orders.filter(o => o.testPaymentTxHash != null && o.paymentTxHash == null).length
            : orders.filter(o => o.paymentStatus === t.value).length;
          const active = paymentStatusFilter === t.value;
          return (
            <button key={t.value} onClick={() => setPaymentStatusFilter(t.value)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border"
              style={chipStyle(active, t.color)}>
              {t.label}
              <span className="text-[10px] font-bold px-1 py-0.5 rounded-full" style={{ background: active ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.07)" }}>{count}</span>
            </button>
          );
        })}
        <span className="text-xs text-muted-foreground whitespace-nowrap ml-auto">
          {filtered.length} of {orders.length} order{orders.length !== 1 ? "s" : ""}
        </span>
        {activeFilterCount > 0 && (
          <button onClick={clearAllFilters} className="text-[11px] font-semibold underline text-muted-foreground hover:text-foreground whitespace-nowrap">
            Clear filters
          </button>
        )}
      </div>

      {/* ── Collapsible advanced filters ── */}
      {filtersOpen && (
        <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-3">
          {/* Dates */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 rounded-lg border border-input bg-background px-2.5 h-8 text-xs">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">Ordered</span>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="text-xs bg-transparent focus:outline-none w-28" title="Order date from" />
              <span className="text-muted-foreground">–</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="text-xs bg-transparent focus:outline-none w-28" title="Order date to" />
              {(dateFrom || dateTo) && (
                <button type="button" onClick={() => { setDateFrom(""); setDateTo(""); }} className="text-muted-foreground hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-input bg-background px-2.5 h-8 text-xs">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">Paid</span>
              <input type="date" value={payDateFrom} onChange={e => setPayDateFrom(e.target.value)}
                className="text-xs bg-transparent focus:outline-none w-28" title="Payment date from" />
              <span className="text-muted-foreground">–</span>
              <input type="date" value={payDateTo} onChange={e => setPayDateTo(e.target.value)}
                className="text-xs bg-transparent focus:outline-none w-28" title="Payment date to" />
              {(payDateFrom || payDateTo) && (
                <button type="button" onClick={() => { setPayDateFrom(""); setPayDateTo(""); }} className="text-muted-foreground hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Payment method */}
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Payment method</p>
            <div className="flex gap-1.5 flex-wrap">
              {([
                { value: "all", label: "All Methods", color: "#475569" },
                { value: "revolut", label: "Revolut", color: "#0666EB" },
                { value: "paypal", label: "PayPal", color: "#003087" },
                { value: "anonpay", label: "AnonPay", color: "#F97316" },
                { value: "manual", label: "Crypto", color: "#64748B" },
              ] as const).map(t => {
                const count = t.value === "all" ? orders.length : orders.filter(o => o.paymentMethod === t.value).length;
                const active = paymentMethodFilter === t.value;
                return (
                  <button key={t.value} onClick={() => setPaymentMethodFilter(t.value)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border"
                    style={chipStyle(active, t.color)}>
                    {t.label}
                    <span className="text-[10px] font-bold px-1 py-0.5 rounded-full" style={{ background: active ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.07)" }}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Specialty toggles */}
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Special</p>
            <div className="flex gap-1.5 flex-wrap">
              <button onClick={() => setNoVsFilter(p => !p)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border"
                style={chipStyle(noVsFilter, "#0D9488")}>
                No vendor shipping
                <span className="text-[10px] font-bold px-1 py-0.5 rounded-full" style={{ background: noVsFilter ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.07)" }}>{orders.filter(o => o.vendorShipping === 0 || o.vendorShipping == null).length}</span>
              </button>
              <button onClick={() => setBalanceFilter(f => f === "owed" ? "all" : "owed")}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border"
                style={chipStyle(balanceFilter === "owed", "#D97706")}>
                Balance owed
                <span className="text-[10px] font-bold px-1 py-0.5 rounded-full" style={{ background: balanceFilter === "owed" ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.07)" }}>{orders.filter(o => (o.amountDue ?? 0) > 0 && o.balancePaymentStatus !== "confirmed").length}</span>
              </button>
              <button onClick={() => setBalanceFilter(f => f === "paid" ? "all" : "paid")}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border"
                style={chipStyle(balanceFilter === "paid", "#16A34A")}>
                Balance paid
                <span className="text-[10px] font-bold px-1 py-0.5 rounded-full" style={{ background: balanceFilter === "paid" ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.07)" }}>{orders.filter(o => o.balancePaymentStatus === "confirmed").length}</span>
              </button>
              <button onClick={() => setDirectShippingFilter(p => !p)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border"
                style={chipStyle(directShippingFilter, "#4F46E5")}>
                🏠 Direct ship
                <span className="text-[10px] font-bold px-1 py-0.5 rounded-full" style={{ background: directShippingFilter ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.07)" }}>{orders.filter(o => o.directShippingRequested).length}</span>
              </button>
              <button onClick={() => setWholesaleFilter(p => !p)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border"
                style={chipStyle(wholesaleFilter, "#0D9488")}>
                🏪 Wholesale
                <span className="text-[10px] font-bold px-1 py-0.5 rounded-full" style={{ background: wholesaleFilter ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.07)" }}>{orders.filter(o => o.isWholesale).length}</span>
              </button>
            </div>
          </div>

          {/* Ship-to country */}
          {uniqueCountries.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ship-to country</p>
              <div className="flex gap-1.5 flex-wrap">
                <button onClick={() => setCountryFilter(new Set())}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border"
                  style={chipStyle(countryFilter.size === 0, "#475569")}>
                  All
                  <span className="text-[10px] font-bold px-1 py-0.5 rounded-full" style={{ background: countryFilter.size === 0 ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.07)" }}>{orders.length}</span>
                </button>
                {uniqueCountries.map(c => {
                  const isActive = countryFilter.has(c);
                  const count = orders.filter(o => (o.shippingCountry ?? "") === c).length;
                  return (
                    <button key={c}
                      onClick={() => setCountryFilter(prev => {
                        const next = new Set(prev);
                        next.has(c) ? next.delete(c) : next.add(c);
                        return next;
                      })}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border"
                      style={chipStyle(isActive, "#475569")}>
                      {resolveCountry(c)}
                      <span className="text-[10px] font-bold px-1 py-0.5 rounded-full" style={{ background: isActive ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.07)" }}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Country leg */}
          {gb.countryLegsEnabled && legs.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Country leg</p>
              <div className="flex gap-1.5 flex-wrap">
                <button onClick={() => setCountryLegFilter("all")}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border"
                  style={chipStyle(countryLegFilter === "all", "#2D6BCC")}>
                  <Globe className="w-3 h-3" /> All Legs
                  <span className="text-[10px] font-bold px-1 py-0.5 rounded-full" style={{ background: countryLegFilter === "all" ? "rgba(255,255,255,0.25)" : "rgba(45,107,204,0.12)" }}>{orders.length}</span>
                </button>
                {legs.map(f => {
                  const count = orders.filter(o =>
                    o.countryLegId === f.id ||
                    (!o.countryLegId && o.accountCountry?.toLowerCase() === f.countryName.toLowerCase())
                  ).length;
                  const active = countryLegFilter === f.id;
                  return (
                    <button key={f.id} onClick={() => setCountryLegFilter(f.id)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border"
                      style={chipStyle(active, "#2D6BCC")}>
                      {f.countryName}
                      <span className="text-[10px] font-bold px-1 py-0.5 rounded-full" style={{ background: active ? "rgba(255,255,255,0.25)" : "rgba(45,107,204,0.12)" }}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
      {importMsg && (
        <p className="text-xs font-medium" style={{ color: importMsg.includes("failed") || importMsg.includes("Failed") ? "#dc2626" : "#16a34a" }}>{importMsg}</p>
      )}
      {backfillMsg && (
        <p className="text-xs font-medium" style={{ color: backfillMsg.startsWith("✓") || backfillMsg.includes("assigned") ? "#16a34a" : backfillMsg.toLowerCase().includes("fail") ? "#dc2626" : "#d97706" }}>{backfillMsg}</p>
      )}
      {createOk && <p className="text-xs font-medium" style={{ color: "#16a34a" }}>{createOk}</p>}
      {showCreateForm && (
        <div className="rounded-xl border-2 p-4 space-y-3" style={{ borderColor: "#2D6BCC55", background: "hsl(var(--card))" }}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Create New Order — {gb.name}</p>
            <button className="text-muted-foreground hover:text-foreground" onClick={() => { setShowCreateForm(false); setCreateMsg(""); }}>
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Telegram Username *</label>
              <input
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="@username"
                value={createForm.telegramUsername}
                onChange={e => setCreateForm(p => ({ ...p, telegramUsername: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <select
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={createForm.status}
                onChange={e => setCreateForm(p => ({ ...p, status: e.target.value }))}
              >
                {["Submitted", "Processing", "Shipped", "Completed", "Cancelled"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Vendor Shipping ($)</label>
              <input
                type="number" min="0" step="0.01"
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="0.00"
                value={createForm.vendorShipping}
                onChange={e => setCreateForm(p => ({ ...p, vendorShipping: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">PIN (blank = 0000)</label>
              <input
                type="text" inputMode="numeric" maxLength={4}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="0000"
                value={createForm.pin}
                onChange={e => setCreateForm(p => ({ ...p, pin: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Items *</p>
            {createForm.lineItems.map((li, i) => (
              <div key={i} className="flex gap-2 items-start rounded-lg p-2" style={{ background: "hsl(var(--muted)/0.4)" }}>
                <div className="flex-1 space-y-1.5">
                  <input
                    className="w-full h-8 rounded-lg border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Product name"
                    value={li.productName}
                    onChange={e => updateCreateLine(i, "productName", e.target.value)}
                  />
                  <div className="flex gap-1.5">
                    <input
                      type="number" min="0.5" step="0.5"
                      className="w-20 h-7 rounded-lg border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Qty"
                      value={li.quantity}
                      onChange={e => updateCreateLine(i, "quantity", e.target.value)}
                    />
                    <input
                      type="number" min="0" step="0.01"
                      className="flex-1 h-7 rounded-lg border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Unit price $"
                      value={li.unitPrice}
                      onChange={e => updateCreateLine(i, "unitPrice", e.target.value)}
                    />
                  </div>
                </div>
                <button className="p-1 hover:text-red-500 mt-1" onClick={() => removeCreateLine(i)}>
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            ))}
            <button
              onClick={addCreateLine}
              className="w-full h-8 rounded-lg border border-dashed border-input text-xs text-muted-foreground hover:bg-muted/50 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Item
            </button>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Notes (optional)</label>
            <textarea
              className="w-full rounded-lg border border-input bg-background p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[52px] resize-none"
              placeholder="Customer notes…"
              value={createForm.notes}
              onChange={e => setCreateForm(p => ({ ...p, notes: e.target.value }))}
            />
          </div>
          {createMsg && <p className="text-xs font-medium" style={{ color: "#dc2626" }}>{createMsg}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => { setShowCreateForm(false); setCreateMsg(""); }}
              className="flex-1 h-9 rounded-lg border border-input text-xs font-semibold hover:bg-muted/50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleGbCreate}
              disabled={creating || !createForm.telegramUsername.trim() || createForm.lineItems.every(li => !li.productName.trim())}
              className="flex-1 h-9 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              style={{ background: "#2D6BCC", color: "#fff" }}
            >
              {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Plus className="w-3.5 h-3.5" /> Create Order</>}
            </button>
          </div>
        </div>
      )}

      {/* ── Vendor shipping quick-apply ── shows when any country is selected */}
      {countryFilter.size > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2.5 flex flex-wrap items-center gap-3">
          <Truck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span className="text-[11px] font-semibold text-amber-800 shrink-0">
            Set vendor shipping for {filtered.length} filtered order{filtered.length !== 1 ? "s" : ""}
            {countryFilter.size > 0 && <span className="ml-1 font-normal text-amber-700">({[...countryFilter].join(", ")})</span>}
          </span>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Amount per order"
              value={vsAmount}
              onChange={e => { setVsAmount(e.target.value); setVsResult(null); }}
              className="h-7 w-36 rounded-lg border border-amber-300 bg-white px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
            <button
              disabled={vsApplying || !vsAmount.trim() || isNaN(parseFloat(vsAmount))}
              onClick={async () => {
                const amt = parseFloat(vsAmount);
                if (isNaN(amt) || amt < 0) return;
                if (!confirm(`Set vendor shipping to ${gb.currency} ${amt.toFixed(2)} on ${filtered.length} order(s)?`)) return;
                setVsApplying(true);
                setVsResult(null);
                let ok = 0; let fail = 0;
                for (const order of filtered) {
                  try {
                    const r = await fetch(apiUrl(`/admin/orders/${order.id}`), {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json", "x-admin-secret": secret },
                      body: JSON.stringify({ vendorShipping: amt }),
                    });
                    if (r.ok) {
                      const data = await r.json();
                      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, vendorShipping: amt, grandTotal: parseFloat(String(data.grandTotal ?? o.grandTotal)) } : o));
                      ok++;
                    } else { fail++; }
                  } catch { fail++; }
                }
                setVsApplying(false);
                setVsResult({ ok: fail === 0, msg: fail === 0 ? `Applied to ${ok} order${ok !== 1 ? "s" : ""} ✓` : `${ok} updated, ${fail} failed` });
              }}
              className="h-7 px-3 rounded-lg text-[11px] font-bold flex items-center gap-1.5 bg-amber-500 text-white disabled:opacity-50 hover:bg-amber-600 transition-colors"
            >
              {vsApplying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              Apply to all
            </button>
            {vsResult && (
              <span className={`text-[11px] font-semibold ${vsResult.ok ? "text-green-700" : "text-red-600"}`}>{vsResult.msg}</span>
            )}
          </div>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="flex items-center gap-2 py-0.5">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="w-3.5 h-3.5 rounded accent-blue-600"
              checked={filtered.length > 0 && filtered.every(o => selectedOrderIds.has(o.id))}
              onChange={e => {
                setSelectedOrderIds(prev => {
                  const next = new Set(prev);
                  if (e.target.checked) { filtered.forEach(o => next.add(o.id)); }
                  else { filtered.forEach(o => next.delete(o.id)); }
                  return next;
                });
              }}
            />
            <span className="text-[11px] font-semibold text-muted-foreground">
              {selectedOrderIds.size > 0 ? `${selectedOrderIds.size} selected` : `Select all (${filtered.length})`}
            </span>
          </label>
          {selectedOrderIds.size > 0 && (
            <>
              <button
                className="text-[11px] font-semibold underline text-muted-foreground"
                onClick={() => setSelectedOrderIds(new Set())}
              >Clear</button>
              <button
                className="h-6 px-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700"
                onClick={() => {
                  setBulkAddOpen(v => !v);
                  setBulkAddResult(null);
                  setBulkAddError("");
                  loadBulkAddProducts();
                }}
              >
                <Plus className="w-3 h-3" /> Add Product to Selected
              </button>
            </>
          )}
        </div>
      )}
      {bulkAddOpen && selectedOrderIds.size > 0 && (
        <div className="rounded-xl p-3 space-y-2.5 bg-blue-50/50 border border-blue-200">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-widest text-blue-800">
              Add Product to {selectedOrderIds.size} Selected Order{selectedOrderIds.size !== 1 ? "s" : ""}
            </p>
            <button onClick={() => { setBulkAddOpen(false); setBulkAddResult(null); setBulkAddError(""); }} className="text-muted-foreground"><X className="w-3.5 h-3.5" /></button>
          </div>
          <div className="flex items-end gap-2 flex-wrap">
            <div className="flex-1 min-w-48 space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground">Product</p>
              <select
                className="w-full h-8 rounded-lg text-xs px-2 border border-input bg-background"
                value={bulkAddProductId}
                onChange={e => setBulkAddProductId(e.target.value)}
              >
                <option value="">— select product —</option>
                {bulkAddProducts.map(p => (
                  <option key={p.id} value={p.id}>{p.name} — {gb.currency}{Number(p.price).toFixed(2)}</option>
                ))}
              </select>
            </div>
            <div className="w-20 space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground">Qty</p>
              <input
                type="number" min="0.5" step="0.5"
                className="w-full h-8 rounded-lg text-xs px-2 border border-input bg-background"
                value={bulkAddQty}
                onChange={e => setBulkAddQty(e.target.value)}
              />
            </div>
            <Button
              size="sm" className="h-8 gap-1.5"
              disabled={!bulkAddProductId || bulkAddSubmitting}
              onClick={handleBulkAddProduct}
            >
              {bulkAddSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {bulkAddSubmitting ? "Adding…" : "Confirm"}
            </Button>
          </div>
          {bulkAddError && <p className="text-[11px] font-medium text-red-600">{bulkAddError}</p>}
          {bulkAddResult && (
            <p className="text-[11px] font-medium" style={{ color: bulkAddResult.added > 0 ? "#16a34a" : "#64748b" }}>
              {bulkAddResult.added > 0
                ? `✓ Added "${bulkAddResult.productName}" to ${bulkAddResult.added} order${bulkAddResult.added !== 1 ? "s" : ""}${bulkAddResult.skipped > 0 ? ` (${bulkAddResult.skipped} already had it)` : ""}`
                : `All selected orders already have "${bulkAddResult.productName}"`}
            </p>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No orders found for this group buy.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(o => {
            const isExpanded = expanded.has(o.id);
            const isEditing = editOpen.has(o.id);
            const edit = edits[o.id];
            const _od = new Date(o.createdAt);
            const orderDate = _od.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
              + " · " + _od.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
            const isSelected = selectedOrderIds.has(o.id);
            return (
              <div key={o.id} className={cn("border border-border rounded-xl overflow-hidden", isSelected && "border-blue-300 bg-blue-50/30")}>
                <div
                  className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleExpand(o.id)}
                >
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 rounded accent-blue-600 shrink-0 cursor-pointer"
                    checked={isSelected}
                    onChange={e => {
                      setSelectedOrderIds(prev => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(o.id); else next.delete(o.id);
                        return next;
                      });
                    }}
                    onClick={ev => ev.stopPropagation()}
                  />
                  <div className="flex-1 min-w-0 space-y-0.5">
                    {/* Line 1: identity + status */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="font-mono text-xs font-semibold">#{o.code}</code>
                      <span className="text-xs font-medium truncate">{o.telegramUsername}</span>
                      <span className={cn("px-1.5 py-0.5 rounded-full border text-[10px] font-medium", ORDER_STATUS_COLORS[o.status] ?? "text-muted-foreground border-border")}>{o.status}</span>
                      <span className={cn("px-1.5 py-0.5 rounded-full border text-[10px] font-medium", PAYMENT_STATUS_COLORS[o.paymentStatus] ?? "text-muted-foreground border-border")}>{o.paymentStatus.replace(/_/g, " ")}</span>
                      {(o.amountDue ?? 0) > 0 && o.balancePaymentStatus !== "confirmed" && (
                        <span className="px-1.5 py-0.5 rounded-full border text-[10px] font-medium text-orange-700 bg-orange-50 border-orange-200">
                          balance owed {gb.currency}{(o.amountDue ?? 0).toFixed(2)}
                        </span>
                      )}
                      {o.paymentStatus === "confirmed" && (o.paymentUsdAmount != null) && parseFloat(String(o.paymentUsdAmount)) > 0 && parseFloat(String(o.paymentUsdAmount)) < o.grandTotal && parseFloat(String(o.paymentUsdAmount)) >= o.grandTotal * 0.96 && (
                        <span
                          className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-300 whitespace-nowrap"
                          title={`Paid ${gb.currency} ${parseFloat(String(o.paymentUsdAmount)).toFixed(2)} of ${gb.currency} ${o.grandTotal.toFixed(2)}`}
                        >
                          ⚠ underpaid {gb.currency} {(o.grandTotal - parseFloat(String(o.paymentUsdAmount))).toFixed(2)}
                        </span>
                      )}
                    </div>
                    {/* Line 2: metadata */}
                    <div className="flex items-center gap-2 flex-wrap text-[10px] text-muted-foreground">
                      <span className="tabular-nums shrink-0">{orderDate}</span>
                      {o.paymentMethod && (() => {
                        const label = o.paymentMethod === "revolut" ? "Revolut" : o.paymentMethod === "paypal" ? "PayPal" : o.paymentMethod === "anonpay" ? "AnonPay" : "Crypto";
                        const color = o.paymentMethod === "revolut" ? "#0666EB" : o.paymentMethod === "paypal" ? "#003087" : o.paymentMethod === "anonpay" ? "#F97316" : "#64748B";
                        return <span className="font-semibold" style={{ color }}>{label}</span>;
                      })()}
                      {o.directShippingRequested && (
                        <span className="font-semibold text-indigo-600" title="Direct shipping to address">🏠 Direct ship</span>
                      )}
                      {o.isWholesale && (
                        <span className="font-semibold text-teal-600">🏪 Wholesale</span>
                      )}
                      {o.trackingNumber && <span className="font-mono text-blue-600">{o.trackingNumber}</span>}
                      {o.testPaymentTxHash && (
                        <span className="font-mono select-all" title={`Test TX: ${o.testPaymentTxHash}`}>
                          test:{o.testPaymentTxHash.length > 10 ? o.testPaymentTxHash.slice(0, 10) + "…" : o.testPaymentTxHash}
                        </span>
                      )}
                      {o.paymentTxHash && (
                        <span className="font-mono select-all" title={o.testPaymentTxHash ? `Remaining TX: ${o.paymentTxHash}` : o.paymentTxHash}>
                          {o.testPaymentTxHash ? "rem:" : "tx:"}{o.paymentTxHash.length > 10 ? o.paymentTxHash.slice(0, 10) + "…" : o.paymentTxHash}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-semibold shrink-0">{gb.currency} {o.grandTotal.toFixed(2)}</span>
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                </div>

                {isExpanded && (
                  <div className="border-t border-border px-3 py-3 space-y-3 bg-muted/20">
                    <div className="space-y-1">
                      {o.lineItems.map(li => (
                        <div key={li.id} className="flex items-center justify-between text-xs">
                          <span className="text-foreground">{li.productName}</span>
                          <span className="text-muted-foreground shrink-0 ml-4">
                            {li.quantity} × {gb.currency}{li.unitPrice.toFixed(2)} = {gb.currency}{li.lineTotal.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="text-[11px] text-muted-foreground space-y-0.5 border-t border-border pt-2">
                      <div className="flex justify-between"><span>Subtotal</span><span>{gb.currency} {o.productSubtotal.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span>Delivery ({o.deliveryMethod})</span><span>{gb.currency} {o.deliveryPrice.toFixed(2)}</span></div>
                      {(o.directShippingCost ?? 0) > 0 && <div className="flex justify-between font-medium text-indigo-700"><span>🏠 Direct Shipping Cost</span><span>{gb.currency} {o.directShippingCost!.toFixed(2)}</span></div>}
                      {o.vendorShipping > 0 && <div className="flex justify-between"><span>Vendor shipping</span><span>{gb.currency} {o.vendorShipping.toFixed(2)}</span></div>}
                      {(o.adminFee ?? 0) > 0 && (
                        <div className="flex justify-between text-amber-700 items-center gap-2">
                          <span>{o.adminFeeLabel ?? "Admin Fee"}</span>
                          <div className="flex items-center gap-2">
                            <span>{gb.currency} {(o.adminFee!).toFixed(2)}</span>
                            <button
                              onClick={async () => {
                                const res = await fetch(apiUrl(`/admin/orders/${o.id}`), {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json", "x-admin-secret": secret },
                                  body: JSON.stringify({ adminFee: 0, adminFeeLabel: null }),
                                });
                                if (res.ok) {
                                  const data = await res.json();
                                  setOrders(prev => prev.map(ord => ord.id === o.id ? {
                                    ...ord,
                                    adminFee: 0,
                                    adminFeeLabel: null,
                                    grandTotal: data.grandTotal ?? ord.grandTotal,
                                  } : ord));
                                }
                              }}
                              className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      )}
                      {o.tip > 0 && <div className="flex justify-between"><span>Tip</span><span>{gb.currency} {o.tip.toFixed(2)}</span></div>}
                      {(o.creditsApplied ?? 0) > 0 && <div className="flex justify-between text-emerald-600 font-medium"><span>Store Credits Applied</span><span>−${o.creditsApplied!.toFixed(2)} USD</span></div>}
                      <div className="flex justify-between font-semibold text-foreground pt-0.5"><span>Total</span><span>{gb.currency} {o.grandTotal.toFixed(2)}</span></div>
                    </div>
                    {o.trackingNumber && (
                      <div className="text-xs"><span className="text-muted-foreground">Tracking: </span><span className="font-mono text-blue-600">{o.trackingNumber}</span></div>
                    )}
                    {o.adminNotes && (
                      <div className="text-xs"><span className="text-muted-foreground">Admin notes: </span><span>{o.adminNotes}</span></div>
                    )}
                    {o.notes && (
                      <div className="text-xs"><span className="text-muted-foreground">Customer notes: </span><span>{o.notes}</span></div>
                    )}
                    {(o.shippingName || o.shippingAddress) && (
                      <div className="rounded-lg px-3 py-2 border border-blue-100 bg-blue-50/50 space-y-0.5">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600">Delivery Address</p>
                        {o.shippingName && <p className="text-xs font-semibold text-foreground">{o.shippingName}</p>}
                        {o.shippingAddress && <p className="text-xs text-muted-foreground whitespace-pre-line">{o.shippingAddress}</p>}
                      </div>
                    )}
                    {/* Apply Admin Fee — shown only for orders missing the fee that are NOT direct-to-home */}
                    {gb.adminFeeAmount != null && gb.adminFeeAmount > 0 && (o.adminFee ?? 0) === 0 && !o.directShippingRequested && (
                      <div className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border border-amber-200 bg-amber-50/60">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm leading-none">💰</span>
                          <p className="text-[11px] font-semibold text-amber-700">
                            No {gb.adminFeeLabel ?? "admin fee"} — {gb.currency}{Number(gb.adminFeeAmount).toFixed(2)} not applied
                          </p>
                        </div>
                        <button
                          onClick={async () => {
                            const res = await fetch(apiUrl(`/admin/orders/${o.id}`), {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json", "x-admin-secret": secret },
                              body: JSON.stringify({ adminFee: gb.adminFeeAmount, adminFeeLabel: gb.adminFeeLabel ?? null }),
                            });
                            if (res.ok) {
                              const data = await res.json();
                              setOrders(prev => prev.map(ord => ord.id === o.id ? {
                                ...ord,
                                adminFee: data.adminFee ?? Number(gb.adminFeeAmount),
                                adminFeeLabel: data.adminFeeLabel ?? (gb.adminFeeLabel ?? null),
                                grandTotal: data.grandTotal ?? ord.grandTotal,
                              } : ord));
                            }
                          }}
                          className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-md bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors border border-amber-300"
                        >
                          + Add Fee
                        </button>
                      </div>
                    )}
                    {/* Direct Shipping toggle */}
                    <div className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border"
                      style={{
                        background: o.directShippingRequested ? "rgba(79,70,229,0.06)" : "transparent",
                        borderColor: o.directShippingRequested ? "rgba(79,70,229,0.25)" : "hsl(var(--border))",
                      }}>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm leading-none">🏠</span>
                        <p className="text-[11px] font-semibold" style={{ color: o.directShippingRequested ? "#4338CA" : "hsl(var(--muted-foreground))" }}>
                          Direct Shipping to home address
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          const next = !o.directShippingRequested;
                          const res = await fetch(apiUrl(`/admin/orders/${o.id}`), {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json", "x-admin-secret": secret },
                            body: JSON.stringify({ directShippingRequested: next }),
                          });
                          if (res.ok) {
                            const data = await res.json();
                            setOrders(prev => prev.map(ord => ord.id === o.id ? {
                              ...ord,
                              directShippingRequested: next,
                              directShippingCost: next ? (ord.directShippingCost ?? null) : null,
                              vendorShipping: data.vendorShipping ?? ord.vendorShipping,
                              grandTotal: data.grandTotal ?? ord.grandTotal,
                            } : ord));
                          }
                        }}
                        className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-md transition-colors"
                        style={{
                          background: o.directShippingRequested ? "rgba(79,70,229,0.15)" : "hsl(var(--muted))",
                          color: o.directShippingRequested ? "#4338CA" : "hsl(var(--muted-foreground))",
                        }}
                      >
                        {o.directShippingRequested ? "✓ On" : "Off"}
                      </button>
                    </div>
                    {o.testingContribution != null && o.testingContribution > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-700 border border-purple-200">
                          <TestTube className="w-2.5 h-2.5" />
                          Lab test: {gb.currency}{o.testingContribution.toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="text-xs flex items-center gap-1.5">
                      <span className="text-muted-foreground">Customer PIN:</span>
                      <span className="font-mono font-bold tracking-widest text-foreground">{o.pin ?? "0000"}</span>
                    </div>
                    {(() => {
                      const sc = orderScreenshots[o.id];
                      if (!o.hasPaymentScreenshot && sc === undefined) return null;
                      return (
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1 font-medium">Payment screenshot</p>
                          {sc === "loading" && <span className="text-xs text-muted-foreground">Loading…</span>}
                          {typeof sc === "string" && (
                            <ImageLightbox
                              src={sc}
                              alt="Payment screenshot"
                              wrapperClassName="inline-block rounded-lg overflow-hidden border border-border group relative cursor-zoom-in"
                              thumbnailClassName="h-24 w-auto block object-cover"
                            />
                          )}
                          {sc === null && <span className="text-xs text-muted-foreground">No screenshot</span>}
                          {sc === undefined && o.hasPaymentScreenshot && <span className="text-xs text-muted-foreground">Expand to load</span>}
                        </div>
                      );
                    })()}
                    {(() => {
                      const fmtDT = (iso: string | null | undefined) => {
                        if (!iso) return null;
                        const d = new Date(iso);
                        return d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
                      };
                      const isAnonPay = o.paymentTxHash?.startsWith("anonpay:");
                      const anonPayId = isAnonPay ? o.paymentTxHash!.slice("anonpay:".length) : null;
                      const isBalanceAnonPay = o.balanceTxHash?.startsWith("anonpay:");
                      const balanceAnonPayId = isBalanceAnonPay ? o.balanceTxHash!.slice("anonpay:".length) : null;
                      return (
                        <div className="space-y-2">
                          {o.testPaymentTxHash && (() => {
                            const testAmt = o.paymentTestAmount;
                            return (
                              <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-[10px] font-bold text-orange-600">Test Transaction ID</p>
                                  {testAmt != null && <span className="text-[10px] font-semibold text-orange-500">{testAmt.toFixed(2)} {(o as any).paymentCryptoCurrency || gb.currency || "USDT"}</span>}
                                </div>
                                <p className="font-mono text-xs break-all text-orange-600 select-all">{o.testPaymentTxHash}</p>
                                {testAmt != null && (
                                  <p className="text-[10px] font-semibold text-orange-700">
                                    Remainder: {(o.grandTotal - testAmt).toFixed(2)} {(o as any).paymentCryptoCurrency || gb.currency || "USDT"}
                                  </p>
                                )}
                              </div>
                            );
                          })()}
                          {o.paymentTxHash && !isAnonPay && (() => {
                            const isRemainder = !!o.testPaymentTxHash;
                            const displayAmt = o.paymentTestAmount != null
                              ? o.grandTotal - o.paymentTestAmount
                              : o.grandTotal;
                            return (
                              <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-[10px] font-bold text-muted-foreground">
                                    {isRemainder ? "Remainder Transaction ID" : "Transaction ID"}
                                  </p>
                                  <span className="text-[10px] font-semibold text-green-700">{displayAmt.toFixed(2)} {(o as any).paymentCryptoCurrency || gb.currency || "USDT"}</span>
                                </div>
                                {o.paymentConfirmedAt && (
                                  <p className="text-[10px] text-muted-foreground">{fmtDT(o.paymentConfirmedAt)}</p>
                                )}
                                <p className="font-mono text-xs break-all text-foreground select-all">{o.paymentTxHash}</p>
                              </div>
                            );
                          })()}
                          {isAnonPay && anonPayId && (
                            <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[10px] font-bold text-orange-600">AnonPay</p>
                                <span className="text-[10px] font-semibold text-orange-500">{o.grandTotal.toFixed(2)} {gb.currency || "USDT"}</span>
                              </div>
                              {o.paymentConfirmedAt && (
                                <p className="text-[10px] text-muted-foreground">{fmtDT(o.paymentConfirmedAt)}</p>
                              )}
                              <p className="text-[10px] text-muted-foreground">Payment ID:</p>
                              <p className="font-mono text-xs break-all text-foreground select-all">{anonPayId}</p>
                            </div>
                          )}
                          {o.balancePaymentStatus === "confirmed" && (
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[10px] font-bold text-emerald-700">Balance Paid</p>
                                {o.balanceConfirmedAt && <span className="text-xs font-mono text-emerald-700">{fmtDT(o.balanceConfirmedAt)}</span>}
                              </div>
                              {isBalanceAnonPay && balanceAnonPayId ? (
                                <>
                                  <p className="text-[10px] text-muted-foreground">AnonPay ID:</p>
                                  <p className="font-mono text-xs break-all text-emerald-700 select-all">{balanceAnonPayId}</p>
                                </>
                              ) : o.balanceTxHash ? (
                                <p className="font-mono text-xs break-all text-emerald-700 select-all">{o.balanceTxHash}</p>
                              ) : null}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {!isEditing ? (
                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => openEdit(o)}>
                          <Pencil className="w-3 h-3" /> Edit
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => window.open(`/account/orders/${o.id}?adminPreview=1`, "_blank")}>
                          <Eye className="w-3 h-3" /> Customer View
                        </Button>
                        {saveOk[o.id] && <span className="text-xs text-green-600 flex items-center gap-1"><Check className="w-3 h-3" /> Saved</span>}
                      </div>
                    ) : (
                      <div className="space-y-2 pt-1">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[10px] text-muted-foreground mb-1 block">Status</Label>
                            <select
                              value={edit?.status ?? o.status}
                              onChange={e => updateEdit(o.id, "status", e.target.value)}
                              className="w-full rounded-lg border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                            >
                              {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                          <div>
                            <Label className="text-[10px] text-muted-foreground mb-1 block">Payment</Label>
                            <select
                              value={edit?.paymentStatus ?? o.paymentStatus}
                              onChange={e => updateEdit(o.id, "paymentStatus", e.target.value)}
                              className="w-full rounded-lg border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                            >
                              {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                            </select>
                          </div>
                        </div>
                        {(edit?.paymentStatus ?? o.paymentStatus) === "confirmed" && (
                          <div className="grid grid-cols-2 gap-2 p-2 rounded-lg border border-green-200 bg-green-50">
                            <div>
                              <Label className="text-[10px] text-green-800 mb-1 block">TXID</Label>
                              <Input
                                value={edit?.paymentTxHash ?? o.paymentTxHash ?? ""}
                                onChange={e => updateEdit(o.id, "paymentTxHash", e.target.value)}
                                placeholder="Optional"
                                className="h-7 text-xs font-mono bg-white"
                              />
                            </div>
                            <div>
                              <Label className="text-[10px] text-green-800 mb-1 block">Amount</Label>
                              <Input
                                type="number" min="0" step="0.01"
                                value={edit?.paymentUsdAmount ?? ""}
                                onChange={e => updateEdit(o.id, "paymentUsdAmount", e.target.value)}
                                placeholder="Optional"
                                className="h-7 text-xs bg-white"
                              />
                            </div>
                          </div>
                        )}
                        <div>
                          <Label className="text-[10px] text-muted-foreground mb-1 block">Tracking number</Label>
                          <Input
                            value={edit?.trackingNumber ?? ""}
                            onChange={e => updateEdit(o.id, "trackingNumber", e.target.value)}
                            placeholder="e.g. 1Z999AA10123456784"
                            className="h-7 text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground mb-1 block">Admin notes</Label>
                          <textarea
                            value={edit?.adminNotes ?? ""}
                            onChange={e => updateEdit(o.id, "adminNotes", e.target.value)}
                            placeholder="Internal notes…"
                            rows={2}
                            className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                        </div>
                        <div className="rounded-lg border border-amber-200 bg-amber-50/40 px-2 py-2 space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">Delivery</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-[10px] text-muted-foreground mb-1 block">Method Name</Label>
                              <Input
                                value={edit?.deliveryMethod ?? ""}
                                onChange={e => updateEdit(o.id, "deliveryMethod", e.target.value)}
                                placeholder={o.deliveryMethod || "e.g. Standard"}
                                className="h-7 text-xs"
                              />
                            </div>
                            <div>
                              <Label className="text-[10px] text-muted-foreground mb-1 block">Price</Label>
                              <Input
                                type="number" min="0" step="0.01"
                                value={edit?.deliveryPrice ?? ""}
                                onChange={e => updateEdit(o.id, "deliveryPrice", e.target.value)}
                                placeholder={String(o.deliveryPrice ?? "0")}
                                className="h-7 text-xs"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="rounded-lg border border-blue-100 bg-blue-50/40 px-2 py-2 space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600">Delivery Address</p>
                          <div>
                            <Label className="text-[10px] text-muted-foreground mb-1 block">Recipient name</Label>
                            <Input
                              value={edit?.shippingName ?? ""}
                              onChange={e => updateEdit(o.id, "shippingName", e.target.value)}
                              placeholder="Full name"
                              className="h-7 text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] text-muted-foreground mb-1 block">Address</Label>
                            <textarea
                              value={edit?.shippingAddress ?? ""}
                              onChange={e => updateEdit(o.id, "shippingAddress", e.target.value)}
                              placeholder="Street, city, postcode, country…"
                              rows={3}
                              className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                          </div>
                        </div>
                        {/* QR Code Upload */}
                        <div className="rounded-lg border border-violet-200 bg-violet-50/40 p-2.5 space-y-2">
                          <p className="text-[10px] font-bold text-violet-700 uppercase tracking-widest flex items-center gap-1">
                            <QrCode className="w-3 h-3" /> QR Codes
                          </p>
                          {(["inpost", "royal-mail"] as const).map(courier => {
                            const label = courier === "inpost" ? "InPost" : "Royal Mail";
                            const existing = courier === "inpost" ? o.inpostQrCode : o.royalMailQrCode;
                            const key = `${o.id}-${courier}`;
                            const isUploading = gbQrSaving[key];
                            const qrMsg = gbQrMsg[key];
                            return (
                              <div key={courier} className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-medium text-violet-700 w-20 shrink-0">{label}</span>
                                {existing ? (
                                  <div className="flex items-center gap-2">
                                    <img src={existing} alt={`${label} QR`} className="w-9 h-9 object-contain rounded border border-violet-200 bg-white p-0.5" />
                                    <button
                                      className="text-[11px] text-red-500 hover:underline font-semibold disabled:opacity-50"
                                      disabled={isUploading}
                                      onClick={() => uploadGbQr(o.id, courier, null)}
                                    >{isUploading ? "…" : "Clear"}</button>
                                  </div>
                                ) : (
                                  <label className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${isUploading ? "opacity-50 cursor-not-allowed" : "hover:bg-violet-100 border-violet-200 text-violet-700"}`}>
                                    <Upload className="w-3 h-3" />
                                    {isUploading ? "Uploading…" : "Upload"}
                                    <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,application/pdf" className="hidden"
                                      disabled={isUploading}
                                      onChange={e => { const f = e.target.files?.[0]; if (f) uploadGbQr(o.id, courier, f); e.target.value = ""; }}
                                    />
                                  </label>
                                )}
                                {qrMsg?.text && <span className={`text-[11px] font-semibold ${qrMsg.ok ? "text-green-600" : "text-red-500"}`}>{qrMsg.text}</span>}
                              </div>
                            );
                          })}
                        </div>
                        {saveErr[o.id] && <p className="text-xs text-red-500">{saveErr[o.id]}</p>}
                        <div className="flex gap-2 flex-wrap">
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => closeEdit(o.id)}>
                            <X className="w-3 h-3" /> Cancel
                          </Button>
                          <Button size="sm" className="h-7 text-xs gap-1" onClick={() => saveEdit(o)} disabled={saving[o.id]}>
                            {saving[o.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => window.open(`/account/orders/${o.id}?adminPreview=1`, "_blank")}>
                            <Eye className="w-3 h-3" /> Customer View
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Broadcast Dialog ──────────────────────────────────────────
