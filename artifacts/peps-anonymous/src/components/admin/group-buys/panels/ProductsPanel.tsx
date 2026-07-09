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
export function CsvImportModal({ secret, gb, onDone, onClose }: {
  secret: string;
  gb: GroupBuy;
  onDone: () => void;
  onClose: () => void;
}) {
  const [csvText, setCsvText] = useState("");
  const [parsed, setParsed] = useState<{ name: string; price: number; vendor: string }[]>([]);
  const [parseErr, setParseErr] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; linked: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const parseCsv = (text: string) => {
    setParseErr("");
    setResult(null);
    const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
    if (lines.length === 0) { setParsed([]); return; }

    const rows: { name: string; price: number; vendor: string }[] = [];
    const errs: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const cols = lines[i].split(",").map(c => c.trim().replace(/^["']|["']$/g, ""));
      if (cols.length < 3) { errs.push(`Row ${i + 1}: needs 3 columns (name, price, vendor)`); continue; }
      const name = cols[0];
      const price = parseFloat(cols[1].replace(/[^0-9.]/g, ""));
      const vendor = cols[2];
      if (!name) { errs.push(`Row ${i + 1}: name is empty`); continue; }
      if (isNaN(price)) {
        if (i === 0) continue; // silently skip likely header row
        errs.push(`Row ${i + 1} "${name}": invalid price "${cols[1]}"`);
        continue;
      }
      if (!vendor) { errs.push(`Row ${i + 1} "${name}": vendor is required`); continue; }
      rows.push({ name, price, vendor });
    }

    if (errs.length > 0) {
      setParseErr(errs.join(" | "));
    }
    if (rows.length === 0 && errs.length === 0) {
      setParseErr("No valid rows found. Expected three columns: Peptide Name, Price, Vendor.");
    }
    setParsed(rows);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      setCsvText(text);
      parseCsv(text);
    };
    reader.readAsText(file);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCsvText(e.target.value);
    parseCsv(e.target.value);
  };

  const doImport = async () => {
    if (parsed.length === 0) return;
    setImporting(true);
    try {
      const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}/import-csv`), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ rows: parsed }),
      });
      const data = await res.json();
      if (!res.ok) { setParseErr(data.error ?? "Import failed"); }
      else { setResult(data); onDone(); }
    } catch { setParseErr("Network error"); }
    setImporting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <Card className="p-5 max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-orange-500" />
            <h3 className="font-semibold text-sm">Import Products from CSV</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          Three columns required: <span className="font-mono bg-muted px-1 rounded">Peptide Name, Price, Vendor</span>.
          Prices imported in <strong>{gb.currency}</strong>. Only applies to <strong>{gb.name}</strong>.
        </p>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => fileRef.current?.click()}>
            <Upload className="w-3.5 h-3.5" />Upload CSV
          </Button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
          <span className="text-xs text-muted-foreground self-center">or paste below</span>
        </div>

        <textarea
          value={csvText}
          onChange={handleTextChange}
          placeholder={"BPC-157, 45.00, Uther\nTB-500, 38.50, Uther\nIpamorelin, 52.00, Uther"}
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm font-mono min-h-[120px] resize-y focus:outline-none focus:ring-2 focus:ring-primary"
        />

        {parseErr && <p className="text-xs text-red-500">{parseErr}</p>}

        {parsed.length > 0 && !result && (
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="bg-muted/50 px-3 py-1.5 text-xs font-semibold text-muted-foreground border-b border-border">
              Preview — {parsed.length} product{parsed.length !== 1 ? "s" : ""}
            </div>
            <div className="max-h-40 overflow-y-auto">
              {parsed.map((row, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-1.5 text-xs border-b border-border last:border-b-0">
                  <span className="font-medium">{row.name}</span>
                  <span className="text-muted-foreground">{row.vendor}</span>
                  <span className="text-muted-foreground">{gb.currency} {row.price.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {result && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm">
            <Check className="w-4 h-4 shrink-0" />
            Imported {result.created} product{result.created !== 1 ? "s" : ""} and linked to this group buy.
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>{result ? "Close" : "Cancel"}</Button>
          {!result && (
            <Button className="flex-1 gap-1.5" onClick={doImport} disabled={importing || parsed.length === 0}>
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Import {parsed.length > 0 ? `${parsed.length} products` : ""}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

// ─── Products Sub-tab ─────────────────────────────────────────
// Exchange rate used for display toggle only. GBP→USD.
export function ProductsSubTab({ secret, gb }: { secret: string; gb: GroupBuy }) {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [gbProducts, setGbProducts] = useState<GBProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pendingOverride, setPendingOverride] = useState<Record<string, string>>({});
  const [toggling, setToggling] = useState<string | null>(null);
  const [togglingHalfKit, setTogglingHalfKit] = useState<string | null>(null);
  const [savingOverride, setSavingOverride] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState("");
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [selectingAll, setSelectingAll] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProd, setNewProd] = useState({ name: "", price: "", vendor: "", category: "" });
  const [creatingProd, setCreatingProd] = useState(false);
  const [createErr, setCreateErr] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  // Currency display: uses the GB's currency by default; toggle to the other
  const gbCurrency = (gb.currency || "GBP").toUpperCase();
  const altCurrency = gbCurrency === "GBP" ? "USD" : "GBP";
  const [displayCurrency, setDisplayCurrency] = useState<string>(gbCurrency);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [prodRes, gbProdRes] = await Promise.all([
        fetch(apiUrl(`/admin/group-buys/${gb.id}/products-catalog`), { headers: { "x-admin-secret": secret } }),
        fetch(apiUrl(`/admin/group-buys/${gb.id}/products`), { headers: { "x-admin-secret": secret } }),
      ]);
      if (prodRes.ok) setAllProducts(await prodRes.json());
      if (gbProdRes.ok) setGbProducts(await gbProdRes.json());
    } catch {
      // Network error — leave lists empty, user can refresh
    } finally {
      setLoading(false);
    }
  }, [secret, gb.id]);

  const createGBProduct = async () => {
    if (!newProd.name.trim() || !newProd.price || !newProd.vendor.trim()) {
      setCreateErr("Name, price, and vendor are required");
      return;
    }
    setCreatingProd(true);
    setCreateErr("");
    try {
      const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}/create-product`), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({
          name: newProd.name.trim(),
          price: parseFloat(newProd.price),
          vendor: newProd.vendor.trim(),
          category: newProd.category.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setCreateErr(data.error ?? "Failed to create product"); }
      else {
        setNewProd({ name: "", price: "", vendor: "", category: "" });
        setShowCreateForm(false);
        await load();
      }
    } catch { setCreateErr("Network error"); }
    setCreatingProd(false);
  };

  useEffect(() => { load(); }, [load]);

  const gbProductMap = Object.fromEntries(gbProducts.map(p => [p.productId, p]));

  const vendors = Array.from(new Set(allProducts.map(p => p.vendor).filter((v): v is string => Boolean(v)))).sort();

  // Sort: linked products first, then alphabetical
  const sorted = [...allProducts]
    .filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) &&
      (!vendorFilter || p.vendor === vendorFilter)
    )
    .sort((a, b) => {
      const aOn = !!gbProductMap[a.id];
      const bOn = !!gbProductMap[b.id];
      if (aOn !== bOn) return aOn ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  const convertPrice = (price: number): string => {
    if (displayCurrency === gbCurrency) return price.toFixed(2);
    if (gbCurrency === "GBP" && displayCurrency === "USD") return (price * GBP_TO_USD).toFixed(2);
    if (gbCurrency === "USD" && displayCurrency === "GBP") return (price / GBP_TO_USD).toFixed(2);
    return price.toFixed(2);
  };

  const toggle = async (product: Product) => {
    setToggling(product.id);
    setActionErr("");
    const linked = gbProductMap[product.id];
    try {
      if (linked) {
        const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}/products/${product.id}`), {
          method: "DELETE", headers: { "x-admin-secret": secret },
        });
        if (!res.ok) { const d = await res.json().catch(() => ({})); setActionErr(d.error ?? "Failed to remove product"); }
        else setGbProducts(prev => prev.filter(p => p.productId !== product.id));
      } else {
        const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}/products`), {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-admin-secret": secret },
          body: JSON.stringify({ productId: product.id }),
        });
        if (!res.ok) { const d = await res.json().catch(() => ({})); setActionErr(d.error ?? "Failed to add product"); }
        else await load();
      }
    } catch { setActionErr("Network error"); }
    setToggling(null);
  };

  const saveOverride = async (productId: string) => {
    setSavingOverride(productId);
    setActionErr("");
    const val = pendingOverride[productId];
    // If displaying in alt currency, convert back to GB currency before saving
    let saveVal: number | null = null;
    if (val !== "") {
      const entered = parseFloat(val);
      if (!isNaN(entered)) {
        if (displayCurrency !== gbCurrency) {
          saveVal = gbCurrency === "GBP" ? entered / GBP_TO_USD : entered * GBP_TO_USD;
        } else {
          saveVal = entered;
        }
      }
    }
    try {
      const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}/products/${productId}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ priceOverride: saveVal }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setActionErr(d.error ?? "Failed to save price"); }
      else {
        await load();
        setPendingOverride(prev => { const n = { ...prev }; delete n[productId]; return n; });
      }
    } catch { setActionErr("Network error"); }
    setSavingOverride(null);
  };

  const toggleHalfKit = async (productId: string, current: boolean) => {
    setTogglingHalfKit(productId);
    try {
      const res = await fetch(apiUrl(`/admin/half-kit-products/${productId}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ halfKitEnabled: !current }),
      });
      if (res.ok) {
        setAllProducts(prev => prev.map(p => p.id === productId ? { ...p, halfKitEnabled: !current } : p));
      }
    } catch { /* ignore */ } finally { setTogglingHalfKit(null); }
  };

  const selectAll = async () => {
    const unlinked = sorted.filter(p => !gbProductMap[p.id]);
    if (unlinked.length === 0) return;
    setSelectingAll(true);
    setActionErr("");
    try {
      const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}/products`), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ productIds: unlinked.map(p => p.id) }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setActionErr(d.error ?? "Failed to add products");
      } else {
        await load();
      }
    } catch { setActionErr("Failed to add products"); }
    setSelectingAll(false);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  const activeCount = gbProducts.filter(p => p.active).length;

  return (
    <div className="space-y-3">
      {showCsvModal && (
        <CsvImportModal
          secret={secret}
          gb={gb}
          onDone={() => { load(); }}
          onClose={() => setShowCsvModal(false)}
        />
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {vendors.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setVendorFilter("")}
              className={cn("h-8 px-3 rounded-xl text-xs font-semibold border transition-colors",
                vendorFilter === "" ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:bg-muted")}
            >All</button>
            {vendors.map(v => (
              <button
                key={v}
                onClick={() => setVendorFilter(vendorFilter === v ? "" : v)}
                className={cn("h-8 px-3 rounded-xl text-xs font-semibold border transition-colors",
                  vendorFilter === v ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:bg-muted")}
              >{v}</button>
            ))}
          </div>
        )}

        {/* Currency toggle */}
        <button
          onClick={() => setDisplayCurrency(c => c === gbCurrency ? altCurrency : gbCurrency)}
          className={cn(
            "flex items-center gap-1.5 h-10 px-3 rounded-xl border text-xs font-semibold transition-colors",
            displayCurrency !== gbCurrency
              ? "bg-amber-50 border-amber-300 text-amber-700"
              : "bg-background border-border text-muted-foreground hover:text-foreground"
          )}
        >
          <DollarSign className="w-3.5 h-3.5" />
          {displayCurrency}
          {displayCurrency !== gbCurrency && <span className="text-[10px] opacity-70">(est.)</span>}
        </button>

        <Button variant="outline" size="sm" className="gap-1.5 h-10" onClick={() => setShowCsvModal(true)}>
          <Upload className="w-3.5 h-3.5" />CSV
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5 h-10" onClick={() => setShowCreateForm(v => !v)}>
          <Plus className="w-3.5 h-3.5" />New Product
        </Button>
        {(() => {
          const unlinkedCount = sorted.filter(p => !gbProductMap[p.id]).length;
          return unlinkedCount > 0 ? (
            <Button
              size="sm"
              className="gap-1.5 h-10 bg-green-600 hover:bg-green-700 text-white"
              onClick={selectAll}
              disabled={selectingAll}
            >
              {selectingAll
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Check className="w-3.5 h-3.5" />}
              {selectingAll ? "Adding…" : `Select All (${unlinkedCount})`}
            </Button>
          ) : null;
        })()}
        <Button variant="outline" size="icon" className="h-10 w-10" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
        <span className="text-xs text-muted-foreground whitespace-nowrap">{activeCount} linked</span>
      </div>

      {showCreateForm && (
        <div className="border border-border rounded-xl p-4 bg-muted/20 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">New GB-Private Product</p>
          <div className="flex gap-2 flex-wrap">
            <Input className="flex-1 min-w-36 h-9 text-sm" placeholder="Product name *"
              value={newProd.name} onChange={e => setNewProd(p => ({ ...p, name: e.target.value }))} />
            <Input className="w-28 h-9 text-sm" type="number" min="0" step="0.01" placeholder={`Price (${gbCurrency}) *`}
              value={newProd.price} onChange={e => setNewProd(p => ({ ...p, price: e.target.value }))} />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Input className="w-36 h-9 text-sm" placeholder="Vendor *"
              value={newProd.vendor} onChange={e => setNewProd(p => ({ ...p, vendor: e.target.value }))} />
            <Input className="flex-1 h-9 text-sm" placeholder="Category (optional)"
              value={newProd.category} onChange={e => setNewProd(p => ({ ...p, category: e.target.value }))} />
            <Button size="sm" className="h-9 gap-1.5" onClick={createGBProduct}
              disabled={creatingProd || !newProd.name.trim() || !newProd.price || !newProd.vendor.trim()}>
              {creatingProd ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Create
            </Button>
            <Button size="sm" variant="ghost" className="h-9" onClick={() => { setShowCreateForm(false); setCreateErr(""); setNewProd({ name: "", price: "", vendor: "", category: "" }); }}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
          {createErr && <p className="text-xs text-red-500">{createErr}</p>}
        </div>
      )}

      {actionErr && <p className="text-xs text-red-500 px-1">{actionErr}</p>}

      <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
        {sorted.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No products found.</p>
        )}
        {sorted.map(product => {
          const linked = gbProductMap[product.id];
          const isOn = !!linked;
          // Show override price in display currency
          const rawOverride = linked?.priceOverride != null ? (linked.priceOverride as number) : null;
          const overrideDisplay = rawOverride != null
            ? (displayCurrency !== gbCurrency
                ? (gbCurrency === "GBP" ? (rawOverride * GBP_TO_USD).toFixed(2) : (rawOverride / GBP_TO_USD).toFixed(2))
                : rawOverride.toFixed(2))
            : "";
          const override = pendingOverride[product.id] ?? overrideDisplay;

          return (
            <div key={product.id} className={cn("flex items-center gap-3 p-3 rounded-xl border transition-colors",
              isOn ? "bg-green-50 border-green-200" : "bg-background border-border hover:bg-muted/30")}>
              <button
                type="button"
                onClick={() => toggle(product)}
                disabled={toggling === product.id}
                className="shrink-0"
              >
                {toggling === product.id
                  ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  : isOn
                    ? <ToggleRight className="w-5 h-5 text-green-600" />
                    : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-foreground">{product.name}</p>
                <p className="text-xs text-muted-foreground">
                  Base: {displayCurrency} {convertPrice(product.price)}
                  {product.category && ` · ${product.category}`}
                  {` · ${product.vendor}`}
                  {displayCurrency !== gbCurrency && <span className="opacity-60"> (estimated)</span>}
                </p>
              </div>
              {isOn && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">{displayCurrency}</span>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Override"
                      value={override}
                      onChange={e => setPendingOverride(prev => ({ ...prev, [product.id]: e.target.value }))}
                      className="w-36 h-8 text-xs pl-9"
                    />
                  </div>
                  {pendingOverride[product.id] !== undefined && (
                    <button type="button" onClick={() => saveOverride(product.id)}
                      disabled={savingOverride === product.id}
                      className="h-8 px-2 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-50">
                      {savingOverride === product.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              )}
              <button
                type="button"
                onClick={() => toggleHalfKit(product.id, product.halfKitEnabled)}
                disabled={togglingHalfKit === product.id}
                title={product.halfKitEnabled ? "Half kits enabled — click to disable" : "Half kits disabled — click to enable"}
                className="flex items-center gap-1 h-7 px-2.5 rounded-lg text-[10px] font-semibold shrink-0 border transition-all"
                style={{
                  background: product.halfKitEnabled ? "rgba(34,197,94,0.1)" : "rgba(148,163,184,0.08)",
                  borderColor: product.halfKitEnabled ? "rgba(34,197,94,0.3)" : "rgba(148,163,184,0.2)",
                  color: product.halfKitEnabled ? "#16A34A" : "#94A3B8",
                }}
              >
                {togglingHalfKit === product.id
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : product.halfKitEnabled
                    ? <ToggleRight className="w-3.5 h-3.5" />
                    : <ToggleLeft className="w-3.5 h-3.5" />}
                ½ Kit
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Delivery Methods Sub-tab ─────────────────────────────────
