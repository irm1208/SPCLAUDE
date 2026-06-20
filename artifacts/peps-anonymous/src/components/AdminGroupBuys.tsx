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
import { IntlShippingTab } from "@/components/IntlShippingTab";
import { AdminGbFulfilment } from "@/components/AdminGbFulfilment";
import { GbQrCodesPanel } from "@/components/GbQrCodesPanel";

const _codeToName: Record<string, string> = Object.fromEntries(COUNTRY_LIST.map(c => [c.code.toLowerCase(), c.name]));
function resolveCountry(raw: string | null | undefined): string {
  if (!raw) return raw ?? "";
  return _codeToName[raw.toLowerCase()] ?? raw;
}

import { CARRIERS_17TRACK } from "@/lib/carriers";

function apiUrl(path: string) { return `/api${path}`; }

type GroupBuy = Record<string, unknown> & {
  id: string;
  name: string;
  status: string;
  closeDate?: string | null;
  description?: string | null;
  invitePin?: string | null;
  manufacturer?: string | null;
  manufacturerCountry?: string | null;
  currency?: string;
  sortOrder?: number | null;
  memberLimit?: number | null;
  minMembers?: number | null;
  maxKitsPerCustomer?: number | null;
  maxKitsTotal?: number | null;
  hiddenFromList?: boolean;
  labTestSupplier?: string | null;
  allowedCountries?: string[] | null;
  excludedCountries?: string[] | null;
  blockedAccounts?: string[] | null;
  adminFeeEnabled?: boolean;
  adminFeeAmount?: number | null;
  adminFeeLabel?: string | null;
  adminFeeCountries?: { country: string; amount: number; enabled: boolean }[] | null;
  infoCards?: InfoCard[];
  shippingOptions?: ShippingOption[];
  paymentMessage?: string | null;
  paymentMessageEnabled?: boolean;
  paymentsEnabled?: boolean;
  directShippingPaymentsEnabled?: boolean;
  qrUploadInpostEnabled?: boolean;
  qrUploadRoyalMailEnabled?: boolean;
  qrUploadMessage?: string | null;
  orderPageMessage?: string | null;
  countryLegsEnabled?: boolean;
  organiserOrderEditEnabled?: boolean;
  organiserCanEditStatus?: boolean;
  organiserCanEditPaymentStatus?: boolean;
  organiserCanEditTracking?: boolean;
  organiserCanEditNotes?: boolean;
  organiserCanEditTxId?: boolean;
  organiserCanEditQuantities?: boolean;
  organiserCanMarkOos?: boolean;
  allowOrderAddons?: boolean;
  allowEditOrderWhenClosed?: boolean;
  allowEditAddressWhenClosed?: boolean;
  allowDeleteOrderWhenClosed?: boolean;
  hidePricesWhenClosed?: boolean;
  hideCostBreakdownWhenClosed?: boolean;
  hideGrandTotalWhenClosed?: boolean;
  hidePricesOnInvoice?: boolean;
  hidePricesOnGbViewer?: boolean;
  hidePricesOnOrderForm?: boolean;
  hideOrderTotalOnOrderForm?: boolean;
  organiserId?: string | null;
  sharedShippingCountries?: string[] | null;
  hasTelegram?: boolean;
  vendorShippingEnabled?: boolean;
  vendorShippingMessage?: string | null;
  vendorShippingAmount?: number | null;
  legViewerAccess?: { username: string; legIds: string[] }[] | null;
  showStockView?: boolean;
  allowExtraOrders?: boolean;
  directShippingEnabled?: boolean;
  directShippingVendorId?: string | null;
};

type InfoCard = { id: string; title: string; body: string; icon?: string; type?: string; postedAt?: string };
const INFO_CARD_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "info", label: "Info" },
  { value: "update", label: "Update" },
  { value: "warning", label: "Warning" },
  { value: "important", label: "Important" },
  { value: "success", label: "Success" },
  { value: "error", label: "Error" },
];
type ShippingOption = { id: string; label: string; price: number; requiresAddress?: boolean; requiresQrCode?: boolean };

function InfoCardsEditor({ cards, onChange }: {
  cards: InfoCard[];
  onChange: (cards: InfoCard[]) => void;
}) {
  const add = () => onChange([...cards, { id: crypto.randomUUID(), title: "", body: "", icon: "", type: "info" }]);
  const remove = (id: string) => onChange(cards.filter(c => c.id !== id));
  const update = (id: string, field: keyof InfoCard, val: string) =>
    onChange(cards.map(c => c.id === id ? { ...c, [field]: val } : c));
  const move = (idx: number, dir: -1 | 1) => {
    const arr = [...cards];
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    onChange(arr);
  };

  return (
    <div className="space-y-3">
      {cards.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">No info cards yet.</p>
      )}
      {cards.map((card, i) => (
        <div key={card.id} className="border border-border rounded-xl p-3 space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-0.5">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0}
                className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30">
                <ArrowUp className="w-3 h-3" />
              </button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === cards.length - 1}
                className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30">
                <ArrowDown className="w-3 h-3" />
              </button>
            </div>
            <Input value={card.title} onChange={e => update(card.id, "title", e.target.value)}
              placeholder="Card title" className="flex-1" />
            <Input value={card.icon ?? ""} onChange={e => update(card.id, "icon", e.target.value)}
              placeholder="Icon (optional)" className="w-28" />
            <button type="button" onClick={() => remove(card.id)}
              className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={card.type ?? "info"}
              onChange={e => update(card.id, "type", e.target.value)}
              className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {INFO_CARD_TYPE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <Input
              type="text"
              value={card.postedAt ?? ""}
              onChange={e => update(card.id, "postedAt", e.target.value)}
              className="w-44 text-xs"
              placeholder="Posted date (YYYY-MM-DD)"
            />
          </div>
          <textarea value={card.body} onChange={e => update(card.id, "body", e.target.value)}
            placeholder="Card body text…"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[60px] resize-y focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="w-full gap-1.5" onClick={add}>
        <Plus className="w-3.5 h-3.5" />Add Card
      </Button>
    </div>
  );
}

// ─── Shipping Options Editor ──────────────────────────────────
function ShippingOptionsEditor({ options, onChange, currencySym = "$" }: {
  options: ShippingOption[];
  onChange: (opts: ShippingOption[]) => void;
  currencySym?: string;
}) {
  const add = () => onChange([...options, { id: crypto.randomUUID(), label: "", price: 0 }]);
  const remove = (id: string) => onChange(options.filter(o => o.id !== id));
  const update = (id: string, field: keyof ShippingOption, val: string | number) =>
    onChange(options.map(o => o.id === id ? { ...o, [field]: val } : o));
  const move = (idx: number, dir: -1 | 1) => {
    const arr = [...options];
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    onChange(arr);
  };

  return (
    <div className="space-y-3">
      {options.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">No shipping options yet. When options are defined here they will replace the global delivery method selector on the order form for this group buy.</p>
      )}
      {options.map((opt, i) => (
        <div key={opt.id} className="border border-border rounded-xl p-3 space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-0.5">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0}
                className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30">
                <ArrowUp className="w-3 h-3" />
              </button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === options.length - 1}
                className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30">
                <ArrowDown className="w-3 h-3" />
              </button>
            </div>
            <Input
              value={opt.label}
              onChange={e => update(opt.id, "label", e.target.value)}
              placeholder="Option label (e.g. Royal Mail 1st Class)"
              className="flex-1"
            />
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">{currencySym}</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={opt.price}
                onChange={e => update(opt.id, "price", parseFloat(e.target.value) || 0)}
                className="w-20"
                placeholder="0.00"
              />
            </div>
            <button type="button" onClick={() => remove(opt.id)}
              className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-4 pl-6">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={opt.requiresAddress ?? false}
                onChange={e => update(opt.id, "requiresAddress", e.target.checked)}
                className="rounded"
              />
              Requires delivery address
            </label>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={opt.requiresQrCode ?? false}
                onChange={e => update(opt.id, "requiresQrCode", e.target.checked)}
                className="rounded"
              />
              Requires QR code upload
            </label>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="w-full gap-1.5" onClick={add}>
        <Plus className="w-3.5 h-3.5" />Add Option
      </Button>
    </div>
  );
}

// ─── Payment Gateway (per-GB) ─────────────────────────────────
interface GbPaymentConfig {
  id: string;
  name: string;
  status: string;
  paymentsEnabled: boolean;
  cryptoWalletAddress: string | null;
  cryptoCurrency: string;
  cryptoNetwork: string;
  revolutHandle: string | null;
  paypalHandle: string | null;
  anonPayEnabled: boolean;
  anonPayWallet: string | null;
  anonPayTicker: string;
  anonPayNetwork: string;
}

const CRYPTO_CURRENCIES = ["USDT", "USDC", "ETH", "BNB", "SOL"];

const TROCADOR_COINS = [
  { label: "Monero (XMR)",    ticker: "xmr",  network: "Mainnet" },
  { label: "Bitcoin (BTC)",   ticker: "btc",  network: "Mainnet" },
  { label: "Ethereum (ETH)",  ticker: "eth",  network: "ERC20"   },
  { label: "USDT — ERC-20",   ticker: "usdt", network: "ERC20"   },
  { label: "USDT — TRC-20",   ticker: "usdt", network: "TRC20"   },
  { label: "USDT — BEP-20",   ticker: "usdt", network: "BEP20"   },
  { label: "USDC — ERC-20",   ticker: "usdc", network: "ERC20"   },
  { label: "USDC — BEP-20",   ticker: "usdc", network: "BEP20"   },
  { label: "BNB — BEP-20",    ticker: "bnb",  network: "BEP20"   },
  { label: "Litecoin (LTC)",  ticker: "ltc",  network: "Mainnet" },
  { label: "Dogecoin (DOGE)", ticker: "doge", network: "Mainnet" },
  { label: "Dash (DASH)",     ticker: "dash", network: "Mainnet" },
  { label: "Zcash (ZEC)",     ticker: "zec",  network: "Mainnet" },
];
const CRYPTO_NETWORKS: Record<string, string[]> = {
  USDT: ["ERC-20", "TRC-20", "BEP-20", "Polygon", "Arbitrum", "Optimism"],
  USDC: ["ERC-20", "Polygon", "Arbitrum", "Optimism", "Solana"],
  ETH:  ["ERC-20", "Arbitrum", "Optimism", "Polygon"],
  BNB:  ["BEP-20"],
  SOL:  ["Solana"],
};
const DEFAULT_CRYPTO_NETWORKS: Record<string, string> = {
  USDT: "ERC-20", USDC: "ERC-20", ETH: "ERC-20", BNB: "BEP-20", SOL: "Solana",
};

function GbPaymentGatewayInlineContent({ secret, gbId }: { secret: string; gbId: string }) {
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState("");
  const [currency, setCurrency] = useState("USDT");
  const [network, setNetwork] = useState("ERC-20");
  const [revolut, setRevolut] = useState("");
  const [paypal, setPaypal] = useState("");
  const [anonPayEnabled, setAnonPayEnabled] = useState(false);
  const [anonPayWallet, setAnonPayWallet] = useState("");
  const [anonPayTicker, setAnonPayTicker] = useState("usdt");
  const [anonPayNetwork, setAnonPayNetwork] = useState("ERC20");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch(apiUrl("/admin/group-buys/payment-configs"), { headers: { "x-admin-secret": secret } })
      .then(r => r.json())
      .then((d: GbPaymentConfig[]) => {
        const found = Array.isArray(d) ? d.find(c => c.id === gbId) ?? null : null;
        if (found) {
          setWallet(found.cryptoWalletAddress ?? "");
          setCurrency(found.cryptoCurrency || "USDT");
          setNetwork(found.cryptoNetwork || "ERC-20");
          setRevolut(found.revolutHandle ?? "");
          setPaypal(found.paypalHandle ?? "");
          setAnonPayEnabled(found.anonPayEnabled ?? false);
          setAnonPayWallet(found.anonPayWallet ?? "");
          setAnonPayTicker(found.anonPayTicker ?? "usdt");
          setAnonPayNetwork(found.anonPayNetwork ?? "ERC20");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [secret, gbId]);

  const availableNetworks = CRYPTO_NETWORKS[currency] ?? ["ERC-20"];

  const handleCurrencyChange = (c: string) => {
    setCurrency(c);
    const nets = CRYPTO_NETWORKS[c] ?? ["ERC-20"];
    if (!nets.includes(network)) setNetwork(DEFAULT_CRYPTO_NETWORKS[c] ?? nets[0]);
  };

  const save = async () => {
    setSaving(true); setMsg(""); setErr("");
    try {
      const res = await fetch(apiUrl(`/admin/group-buys/${gbId}/payment-methods`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({
          cryptoWalletAddress: wallet.trim() || null,
          cryptoCurrency: currency,
          cryptoNetwork: network,
          revolutHandle: revolut.trim() || null,
          paypalHandle: paypal.trim() || null,
          anonPayEnabled,
          anonPayWallet: anonPayWallet.trim() || null,
          anonPayTicker,
          anonPayNetwork,
        }),
      });
      const d = await res.json();
      if (!res.ok) { setErr(d.error || "Failed to save"); setSaving(false); return; }
      setMsg("Saved!");
      setTimeout(() => setMsg(""), 3000);
    } catch { setErr("Network error"); }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CreditCard className="w-4 h-4 text-primary" />
        <p className="text-xs font-semibold text-foreground">Payment Gateway</p>
      </div>
      <p className="text-xs text-muted-foreground">Configure payment methods for this group buy. Customers will only see methods enabled here.</p>

      <div className="space-y-4">
        {/* Crypto */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-violet-500" />
            <p className="text-sm font-semibold">Crypto</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Currency</Label>
              <select
                value={currency}
                onChange={e => handleCurrencyChange(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {CRYPTO_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Network</Label>
              <select
                value={network}
                onChange={e => setNetwork(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {availableNetworks.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Wallet Address</Label>
            <Input
              className="font-mono text-xs"
              placeholder="0x… or T… (leave blank to disable crypto)"
              value={wallet}
              onChange={e => setWallet(e.target.value)}
            />
          </div>
        </div>

        {/* Revolut */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[#0666EB] flex items-center justify-center shrink-0">
              <span className="text-white font-black text-[8px]">R</span>
            </div>
            <p className="text-sm font-semibold">Revolut</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Revolut.me username / tag</Label>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground shrink-0">revolut.me/</span>
              <Input
                className="text-sm"
                placeholder="yourusername (leave blank to disable)"
                value={revolut}
                onChange={e => setRevolut(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* PayPal */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[#003087] flex items-center justify-center shrink-0">
              <span className="text-white font-black text-[8px]">P</span>
            </div>
            <p className="text-sm font-semibold">PayPal</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">PayPal.me username / link</Label>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground shrink-0">paypal.me/</span>
              <Input
                className="text-sm"
                placeholder="yourusername (leave blank to disable)"
                value={paypal}
                onChange={e => setPaypal(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* AnonPay / Trocador */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-slate-700 flex items-center justify-center shrink-0">
              <span className="text-white font-black text-[7px]">AP</span>
            </div>
            <p className="text-sm font-semibold">Trocador AnonPay</p>
          </div>
          <p className="text-xs text-muted-foreground">Accept anonymous crypto payments via Trocador (Monero, Bitcoin, USDT, etc.).</p>
          <div className="flex items-center justify-between p-2 rounded-lg border border-input bg-muted/30">
            <div>
              <p className="text-xs font-medium">Enable AnonPay</p>
              <p className="text-[11px] text-muted-foreground">Show AnonPay as a checkout option</p>
            </div>
            <button
              type="button"
              onClick={() => setAnonPayEnabled(v => !v)}
              className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${anonPayEnabled ? "bg-primary" : "bg-muted-foreground/30"}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${anonPayEnabled ? "translate-x-[22px]" : "translate-x-0.5"}`} />
            </button>
          </div>
          {anonPayEnabled && (
            <div className="space-y-2 pl-1">
              <div className="space-y-1">
                <Label className="text-xs">Wallet Address</Label>
                <Input
                  className="font-mono text-xs"
                  placeholder="e.g. XMR address or ERC-20 address"
                  value={anonPayWallet}
                  onChange={e => setAnonPayWallet(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Coin &amp; Network</Label>
                <select
                  value={`${anonPayTicker}|${anonPayNetwork}`}
                  onChange={e => {
                    const [t, n] = e.target.value.split("|");
                    setAnonPayTicker(t);
                    setAnonPayNetwork(n);
                  }}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {TROCADOR_COINS.map(c => (
                    <option key={`${c.ticker}|${c.network}`} value={`${c.ticker}|${c.network}`}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {err && <p className="text-xs text-destructive font-medium">{err}</p>}
        {msg && <p className="text-xs text-green-600 font-medium">{msg}</p>}

        <Button size="sm" onClick={save} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          Save Payment Methods
        </Button>
      </div>
    </div>
  );
}

// ─── Admin Country Legs Management Section ────────────────────
const EU_COUNTRIES: { code: string; name: string }[] = [
  { code: "AT", name: "Austria" }, { code: "BE", name: "Belgium" },
  { code: "BG", name: "Bulgaria" }, { code: "CY", name: "Cyprus" },
  { code: "CZ", name: "Czech Republic" }, { code: "DE", name: "Germany" },
  { code: "DK", name: "Denmark" }, { code: "EE", name: "Estonia" },
  { code: "ES", name: "Spain" }, { code: "FI", name: "Finland" },
  { code: "FR", name: "France" }, { code: "GR", name: "Greece" },
  { code: "HR", name: "Croatia" }, { code: "HU", name: "Hungary" },
  { code: "IE", name: "Ireland" }, { code: "IT", name: "Italy" },
  { code: "LT", name: "Lithuania" }, { code: "LU", name: "Luxembourg" },
  { code: "LV", name: "Latvia" }, { code: "MT", name: "Malta" },
  { code: "NL", name: "Netherlands" }, { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" }, { code: "RO", name: "Romania" },
  { code: "SE", name: "Sweden" }, { code: "SI", name: "Slovenia" },
  { code: "SK", name: "Slovakia" },
];

const POPULAR_COUNTRIES: { code: string; name: string }[] = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "BR", name: "Brazil" },
];

interface AdminCLeg {
  id: string;
  countryCode: string;
  countryName: string;
  inviteEnabled: boolean;
  inviteCode: string | null;
  status: string;
  sortOrder: number;
  message: string | null;
  countryNote: string | null;
  vendorShippingCost: number | null;
  vendorPackageCount: number | null;
  directShippingEnabled?: boolean;
  wholesaleVendorId?: string | null;
  reshipper: {
    reshipperUsername: string;
    paymentTarget: string | null;
    enabledPaymentMethods: Record<string, boolean> | null;
    reshipperFeeEnabled: boolean;
    reshipperFeeType: string;
    reshipperFeeAmount: string | null;
    allowPayments: boolean;
    allowVendorShippingSplit: boolean;
  } | null;
  orderCount: number;
}

function BillVendorShippingPanel({ secret, gbId }: { secret: string; gbId: string }) {
  const [notify, setNotify] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<{ message: string; updatedCount: number; breakdown: { orderId: string; username: string; vendorShipping: number; newAmountDue: number; notified: boolean }[] } | null>(null);

  const apply = async () => {
    setApplying(true);
    setResult(null);
    try {
      const r = await fetch(apiUrl(`/admin/group-buys/${gbId}/bill-vendor-shipping-balance`), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ notify, overwrite, statusFilter: ["confirmed", "test_confirmed"] }),
      });
      const data = await r.json();
      setResult(data);
    } finally { setApplying(false); }
  };

  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-orange-600" />
        <p className="text-xs font-semibold text-orange-800">Bill Paid Orders for Vendor Shipping</p>
      </div>
      <p className="text-[11px] text-orange-700">
        For orders already paid (confirmed/test_confirmed) that had vendor shipping added after payment —
        this sets an outstanding balance so members see a "You owe £X" notice and can submit the extra amount.
      </p>
      <div className="space-y-1.5">
        <label className="flex items-center gap-2 text-[11px] text-orange-800 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={notify}
            onChange={e => setNotify(e.target.checked)}
            className="rounded"
          />
          Send Telegram notification to each member
        </label>
        <label className="flex items-center gap-2 text-[11px] text-orange-800 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={overwrite}
            onChange={e => setOverwrite(e.target.checked)}
            className="rounded"
          />
          Overwrite existing balance (default: add to it)
        </label>
      </div>
      <button
        type="button"
        onClick={() => void apply()}
        disabled={applying}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-60 transition-colors"
      >
        {applying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <DollarSign className="w-3.5 h-3.5" />}
        Bill Paid Orders
      </button>
      {result && (
        <div className="rounded-lg bg-white border border-orange-200 p-2 space-y-1">
          <p className="text-[11px] font-semibold text-orange-800">{result.message}</p>
          {result.breakdown.length > 0 && (
            <div className="space-y-0.5 max-h-40 overflow-y-auto">
              {result.breakdown.map(b => (
                <div key={b.orderId} className="text-[11px] text-orange-700 flex items-center justify-between gap-2">
                  <span className="font-medium truncate">@{b.username}</span>
                  <span className="shrink-0">
                    +{b.vendorShipping.toFixed(2)} → owes {b.newAmountDue.toFixed(2)}
                    {notify && (
                      <span className={cn("ml-1", b.notified ? "text-green-600" : "text-red-400")}>
                        {b.notified ? "✓" : "✗"}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CountryLegDetailPanel({
  leg: initialLeg,
  gbId,
  secret,
  currency,
  approvedReshippers,
  onBack,
  onDeleted,
  onRefresh,
}: {
  leg: AdminCLeg;
  gbId: string;
  secret: string;
  currency: string;
  approvedReshippers: { telegramUsername: string }[];
  onBack: () => void;
  onDeleted: () => void;
  onRefresh: () => void;
}) {
  const [leg, setLeg] = useState(initialLeg);
  const [saving, setSaving] = useState(false);
  const [assigningReshipper, setAssigningReshipper] = useState(false);
  const [messageEdit, setMessageEdit] = useState(initialLeg.message ?? "");
  const [countryNoteEdit, setCountryNoteEdit] = useState(initialLeg.countryNote ?? "");
  const [sortOrderEdit, setSortOrderEdit] = useState(String(initialLeg.sortOrder ?? 0));
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [savedGeneral, setSavedGeneral] = useState(false);
  const [shippingCost, setShippingCost] = useState(initialLeg.vendorShippingCost != null ? String(initialLeg.vendorShippingCost) : "");
  const [packageCount, setPackageCount] = useState(initialLeg.vendorPackageCount != null ? String(initialLeg.vendorPackageCount) : "");
  const [savingVendor, setSavingVendor] = useState(false);
  const [savedVendor, setSavedVendor] = useState(false);
  const [wholesaleVendors, setWholesaleVendors] = useState<{ id: string; name: string }[]>([]);
  const [allowReshipperCode, setAllowReshipperCode] = useState(false);
  const [togglingReshipperCode, setTogglingReshipperCode] = useState(false);

  useEffect(() => {
    setLeg(initialLeg);
  }, [initialLeg]);

  useEffect(() => {
    fetch(apiUrl("/admin/wholesale-vendors"), { headers: { "x-admin-secret": secret } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.vendors) setWholesaleVendors(d.vendors.map((v: { id: string; name: string }) => ({ id: v.id, name: v.name }))); })
      .catch(() => {});
  }, [secret]);

  useEffect(() => {
    fetch(apiUrl(`/admin/group-buys/${gbId}`), { headers: { "x-admin-secret": secret } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setAllowReshipperCode(d.allowReshipperCode ?? false); })
      .catch(() => {});
  }, [gbId, secret]);

  const toggleAllowReshipperCode = async () => {
    setTogglingReshipperCode(true);
    try {
      const r = await fetch(apiUrl(`/admin/group-buys/${gbId}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ allowReshipperCode: !allowReshipperCode }),
      });
      if (r.ok) setAllowReshipperCode(v => !v);
    } finally { setTogglingReshipperCode(false); }
  };

  useEffect(() => {
    setMessageEdit(initialLeg.message ?? "");
    setCountryNoteEdit(initialLeg.countryNote ?? "");
    setSortOrderEdit(String(initialLeg.sortOrder ?? 0));
    setShippingCost(initialLeg.vendorShippingCost != null ? String(initialLeg.vendorShippingCost) : "");
    setPackageCount(initialLeg.vendorPackageCount != null ? String(initialLeg.vendorPackageCount) : "");
  }, [initialLeg.id]);

  const patchLeg = async (body: object) => {
    setSaving(true);
    try {
      const r = await fetch(apiUrl(`/admin/group-buys/${gbId}/country-legs/${leg.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify(body),
      });
      if (r.ok) {
        const updated = await r.json();
        setLeg((prev) => ({ ...prev, ...updated }));
        onRefresh();
      }
    } finally { setSaving(false); }
  };

  const saveGeneral = async () => {
    setSavingGeneral(true);
    try {
      const r = await fetch(apiUrl(`/admin/group-buys/${gbId}/country-legs/${leg.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ message: messageEdit || null, countryNote: countryNoteEdit || null, sortOrder: parseInt(sortOrderEdit) || 0 }),
      });
      if (r.ok) {
        const updated = await r.json();
        setLeg((prev) => ({ ...prev, ...updated }));
        onRefresh();
        setSavedGeneral(true);
        setTimeout(() => setSavedGeneral(false), 2000);
      }
    } finally { setSavingGeneral(false); }
  };

  const saveVendor = async () => {
    setSavingVendor(true);
    try {
      const r = await fetch(apiUrl(`/admin/group-buys/${gbId}/country-legs/${leg.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({
          vendorShippingCost: shippingCost.trim() ? parseFloat(shippingCost) : null,
          vendorPackageCount: packageCount.trim() ? parseInt(packageCount) : null,
        }),
      });
      if (r.ok) {
        const updated = await r.json();
        setLeg((prev) => ({ ...prev, ...updated }));
        onRefresh();
        setSavedVendor(true);
        setTimeout(() => setSavedVendor(false), 2000);
      }
    } finally { setSavingVendor(false); }
  };

  const regenInvite = async () => {
    setSaving(true);
    try {
      await fetch(apiUrl(`/admin/group-buys/${gbId}/country-legs/${leg.id}/regenerate-invite`), {
        method: "POST", headers: { "x-admin-secret": secret },
      });
      onRefresh();
    } finally { setSaving(false); }
  };

  const deleteLeg = async () => {
    if (!confirm(`Remove ${leg.countryName}?`)) return;
    setSaving(true);
    try {
      await fetch(apiUrl(`/admin/group-buys/${gbId}/country-legs/${leg.id}`), {
        method: "DELETE", headers: { "x-admin-secret": secret },
      });
      onDeleted();
    } finally { setSaving(false); }
  };

  const assignReshipper = async (newUsername: string) => {
    setAssigningReshipper(true);
    try {
      if (leg.reshipper) {
        await fetch(apiUrl(`/admin/group-buys/${gbId}/reshippers/${leg.reshipper.reshipperUsername}`), {
          method: "DELETE", headers: { "x-admin-secret": secret },
        });
      }
      if (newUsername) {
        await fetch(apiUrl(`/admin/group-buys/${gbId}/reshippers`), {
          method: "POST", headers: { "Content-Type": "application/json", "x-admin-secret": secret },
          body: JSON.stringify({ reshipperUsername: newUsername, country: leg.countryCode }),
        });
      }
      onRefresh();
    } finally { setAssigningReshipper(false); }
  };

  const patchReshipper = async (body: Record<string, unknown>) => {
    if (!leg.reshipper) return;
    await fetch(apiUrl(`/admin/group-buys/${gbId}/reshippers/${leg.reshipper.reshipperUsername}`), {
      method: "PATCH", headers: { "Content-Type": "application/json", "x-admin-secret": secret },
      body: JSON.stringify(body),
    });
    onRefresh();
  };

  const statusCls = (s: string) => cn(
    "h-10 rounded-xl text-sm font-semibold border transition-all",
    leg.status === s
      ? s === "active" ? "bg-green-600 text-white border-green-600" : "bg-red-600 text-white border-red-600"
      : "bg-background text-muted-foreground border-border hover:bg-muted"
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-base">{leg.countryName}</h3>
            <span className="text-xs text-muted-foreground font-mono">{leg.countryCode}</span>
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border",
              leg.status === "active" ? "bg-green-50 text-green-700 border-green-200" : "bg-muted text-muted-foreground border-border")}>
              {leg.status === "active" ? "Active" : "Closed"}
            </span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">
              {leg.orderCount} order{leg.orderCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <a
          href={`/leg-kits/${gbId}/${leg.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
          title="Open Kit Count Viewer"
        >
          <BarChart3 className="w-4 h-4 text-blue-500" />
        </a>
        <button onClick={deleteLeg} disabled={saving} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Delete leg">
          <Trash2 className="w-4 h-4 text-red-400" />
        </button>
      </div>

      {/* Status */}
      <Card className="p-4 space-y-3">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Status</p>
        <div className="grid grid-cols-2 gap-2">
          <button disabled={saving} onClick={() => void patchLeg({ status: "active" })} className={statusCls("active")}>Active</button>
          <button disabled={saving} onClick={() => void patchLeg({ status: "closed" })} className={statusCls("closed")}>Closed</button>
        </div>
      </Card>

      {/* General Settings */}
      <Card className="p-4 space-y-3">
        <p className="text-sm font-bold">General Settings</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Country Name</Label>
            <Input value={leg.countryName} readOnly className="mt-1 bg-muted/30" />
          </div>
          <div>
            <Label className="text-xs">Country Code</Label>
            <Input value={leg.countryCode} readOnly className="mt-1 bg-muted/30 font-mono" />
          </div>
        </div>
        <div>
          <Label className="text-xs">Sort Order</Label>
          <Input type="number" value={sortOrderEdit} onChange={e => setSortOrderEdit(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Message</Label>
          <textarea rows={2} value={messageEdit} onChange={e => setMessageEdit(e.target.value)}
            placeholder="Optional message for this country group…"
            className="mt-1 w-full text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
        </div>
        <div>
          <Label className="text-xs">Country Note <span className="font-normal text-muted-foreground">(shown only to members of this country)</span></Label>
          <textarea rows={2} value={countryNoteEdit} onChange={e => setCountryNoteEdit(e.target.value)}
            placeholder="Note shown exclusively to members of this country…"
            className="mt-1 w-full text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
        </div>
        <Button size="sm" onClick={saveGeneral} disabled={savingGeneral} className="gap-1.5">
          {savingGeneral ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : savedGeneral ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          {savingGeneral ? "Saving…" : savedGeneral ? "Saved!" : "Save Settings"}
        </Button>
      </Card>

      {/* Direct Shipping */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold">Direct Home Shipping</p>
            <p className="text-xs text-muted-foreground mt-0.5">Allow members of this leg to request delivery straight to their home address.</p>
          </div>
          <button onClick={() => void patchLeg({ directShippingEnabled: !leg.directShippingEnabled })} disabled={saving}
            className={cn("flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors shrink-0 ml-3",
              leg.directShippingEnabled ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-muted text-muted-foreground border-border")}>
            {leg.directShippingEnabled ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
            {leg.directShippingEnabled ? "Enabled" : "Disabled"}
          </button>
        </div>
        {leg.directShippingEnabled && (
          <div className="pt-1 border-t border-border space-y-1.5">
            <Label className="text-xs">Wholesale Vendor <span className="font-normal text-muted-foreground">(shipping price table used for cost calculation)</span></Label>
            <select
              value={leg.wholesaleVendorId ?? ""}
              onChange={e => {
                const val = e.target.value || null;
                void patchLeg({ wholesaleVendorId: val });
              }}
              disabled={saving}
              className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">— None (no auto-calculation) —</option>
              {wholesaleVendors.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
            {!leg.wholesaleVendorId && (
              <p className="text-[11px] text-amber-600">No vendor selected — direct shipping cost won't be auto-calculated when customers toggle it.</p>
            )}
          </div>
        )}
      </Card>

      {/* Invite Code */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">Invite Code</p>
          <button onClick={() => void patchLeg({ inviteEnabled: !leg.inviteEnabled })} disabled={saving}
            className={cn("flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors",
              leg.inviteEnabled ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-muted text-muted-foreground border-border")}>
            {leg.inviteEnabled ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
            {leg.inviteEnabled ? "Enabled" : "Disabled"}
          </button>
        </div>
        {leg.inviteEnabled && (
          <div className="flex items-center gap-2">
            {leg.inviteCode
              ? <code className="flex-1 rounded-lg bg-muted px-3 py-2 text-sm font-mono font-bold tracking-widest">{leg.inviteCode}</code>
              : <span className="flex-1 text-sm text-muted-foreground italic">No code generated</span>}
            {leg.inviteCode && (
              <button onClick={() => void navigator.clipboard.writeText(leg.inviteCode ?? "")} className="p-2 rounded-lg hover:bg-muted" title="Copy">
                <Copy className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
            <button onClick={regenInvite} disabled={saving} className="p-2 rounded-lg hover:bg-muted" title="Regenerate">
              {saving ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : <RefreshCw className="w-4 h-4 text-muted-foreground" />}
            </button>
          </div>
        )}
      </Card>

      {/* Vendor Shipping */}
      <Card className="p-4 space-y-3">
        <p className="text-sm font-bold flex items-center gap-1.5"><Truck className="w-4 h-4 text-sky-600" />Vendor Shipping</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Shipping Cost</Label>
            <Input type="number" min="0" step="0.01" placeholder="e.g. 120.00" value={shippingCost} onChange={e => setShippingCost(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Packages / Kits</Label>
            <Input type="number" min="0" step="1" placeholder="e.g. 20" value={packageCount} onChange={e => setPackageCount(e.target.value)} className="mt-1" />
          </div>
        </div>
        {shippingCost && packageCount && parseFloat(packageCount) > 0 && (
          <p className="text-[11px] text-sky-700 font-medium">≈ {(parseFloat(shippingCost) / parseFloat(packageCount)).toFixed(2)} per kit</p>
        )}
        <Button size="sm" onClick={saveVendor} disabled={savingVendor} className="gap-1.5">
          {savingVendor ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : savedVendor ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          {savingVendor ? "Saving…" : savedVendor ? "Saved!" : "Save Shipping"}
        </Button>
      </Card>

      {/* Reshipper */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">Reshipper</p>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">Allow code override</span>
            <button
              type="button"
              onClick={() => void toggleAllowReshipperCode()}
              disabled={togglingReshipperCode}
              className={cn(
                "text-[10px] px-2.5 py-1 rounded-lg font-semibold border transition-colors",
                allowReshipperCode ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-muted border-border text-muted-foreground"
              )}
            >
              {allowReshipperCode ? "On" : "Off"}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={leg.reshipper?.reshipperUsername ?? ""} disabled={assigningReshipper}
            onChange={e => void assignReshipper(e.target.value)}
            className="flex-1 rounded-lg border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
            <option value="">— None —</option>
            {approvedReshippers.map(r => (
              <option key={r.telegramUsername} value={r.telegramUsername}>@{r.telegramUsername}</option>
            ))}
          </select>
          {assigningReshipper && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />}
        </div>
        {leg.reshipper && (
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Pay to</p>
              <div className="flex gap-2">
                {(["reshipper", "admin"] as const).map(t => (
                  <button key={t} type="button" onClick={() => void patchReshipper({ paymentTarget: t })}
                    className={cn("flex-1 h-8 rounded-lg text-xs font-semibold border transition-colors capitalize",
                      leg.reshipper?.paymentTarget === t ? "bg-orange-50 border-orange-300 text-orange-700" : "bg-background border-border text-muted-foreground hover:bg-muted")}>{t}</button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Allow payments</span>
              <button type="button" onClick={() => void patchReshipper({ allowPayments: !leg.reshipper?.allowPayments })}
                className={cn("text-[10px] px-2.5 py-1 rounded-lg font-semibold border transition-colors",
                  leg.reshipper?.allowPayments ? "bg-green-50 border-green-200 text-green-700" : "bg-muted border-border text-muted-foreground")}>
                {leg.reshipper?.allowPayments ? "Enabled" : "Disabled"}</button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Vendor shipping split</span>
              <button type="button" onClick={() => void patchReshipper({ allowVendorShippingSplit: !leg.reshipper?.allowVendorShippingSplit })}
                className={cn("text-[10px] px-2.5 py-1 rounded-lg font-semibold border transition-colors",
                  leg.reshipper?.allowVendorShippingSplit ? "bg-green-50 border-green-200 text-green-700" : "bg-muted border-border text-muted-foreground")}>
                {leg.reshipper?.allowVendorShippingSplit ? "Enabled" : "Disabled"}</button>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Payment Methods</p>
              <div className="flex flex-wrap gap-1.5">
                {PAYMENT_METHODS.map(m => {
                  const on = !!(leg.reshipper?.enabledPaymentMethods?.[m.key]);
                  return (
                    <button key={m.key} type="button" onClick={() => void patchReshipper({ enabledPaymentMethods: { ...(leg.reshipper?.enabledPaymentMethods ?? {}), [m.key]: !on } })}
                      className={cn("text-[10px] px-2.5 py-1 rounded-lg font-semibold border transition-colors",
                        on ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-muted border-border text-muted-foreground")}>{m.label}</button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Reshipper Fee</p>
                <button type="button" onClick={() => void patchReshipper({ reshipperFeeEnabled: !leg.reshipper?.reshipperFeeEnabled })}
                  className={cn("text-[10px] px-2.5 py-1 rounded-lg font-semibold border transition-colors",
                    leg.reshipper?.reshipperFeeEnabled ? "bg-purple-50 border-purple-200 text-purple-700" : "bg-muted border-border text-muted-foreground")}>
                  {leg.reshipper?.reshipperFeeEnabled ? "Enabled" : "Disabled"}</button>
              </div>
              {leg.reshipper?.reshipperFeeEnabled && (
                <div className="flex items-center gap-2 flex-wrap">
                  {(["fixed", "custom"] as const).map(t => (
                    <button key={t} type="button" onClick={() => void patchReshipper({ reshipperFeeType: t })}
                      className={cn("text-[10px] px-2.5 py-1 rounded-lg font-semibold border transition-colors capitalize",
                        leg.reshipper?.reshipperFeeType === t ? "bg-purple-50 border-purple-200 text-purple-700" : "bg-muted border-border text-muted-foreground")}>{t}</button>
                  ))}
                  {leg.reshipper.reshipperFeeType === "fixed" && (
                    <input type="number" min="0" step="0.01" defaultValue={leg.reshipper.reshipperFeeAmount ?? ""} placeholder="Amount…"
                      onBlur={e => void patchReshipper({ reshipperFeeAmount: e.target.value || null })}
                      className="w-24 rounded-lg border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* ── Leg Calculations ── */}
      <LegInlineCalcSection gbId={gbId} secret={secret} leg={leg} currency={currency} />
    </div>
  );
}

// ─── Inline leg calc embedded in the leg detail panel ──────────
function LegInlineCalcSection({ gbId, secret, leg, currency }: { gbId: string; secret: string; leg: AdminCLeg; currency: string }) {
  const [orders, setOrders] = useState<GbOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("Submitted");
  const [mode, setMode] = useState<"split" | "direct">("split");

  // Split state
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [totalCost, setTotalCost] = useState(leg.vendorShippingCost != null ? String(leg.vendorShippingCost) : "");
  const [equalPct, setEqualPct] = useState(50);
  const weightPct = 100 - equalPct;
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<{ message: string; breakdown: { orderId: string; username: string; vendorShipping: number }[] } | null>(null);

  // Direct state
  const [directAmounts, setDirectAmounts] = useState<Record<string, string>>({});
  const [directApplying, setDirectApplying] = useState(false);
  const [directResult, setDirectResult] = useState<{ message: string; breakdown: { orderId: string; username: string; vendorShipping: number }[] } | null>(null);

  useEffect(() => {
    fetch(apiUrl(`/admin/group-buys/${gbId}/orders`), { headers: { "x-admin-secret": secret } })
      .then(r => r.ok ? r.json() : [])
      .then((data: GbOrder[]) => { setOrders(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [gbId, secret]);

  // Keep totalCost in sync if leg prop changes
  useEffect(() => {
    setTotalCost(leg.vendorShippingCost != null ? String(leg.vendorShippingCost) : "");
  }, [leg.vendorShippingCost]);

  const legOrders = orders.filter(o => o.countryLegId === leg.id && o.status === statusFilter);

  // Pre-fill direct amounts when order set changes
  useEffect(() => {
    setDirectAmounts(prev => {
      const next: Record<string, string> = {};
      for (const o of legOrders) {
        next[o.id] = prev[o.id] !== undefined ? prev[o.id] : (o.vendorShipping > 0 ? String(o.vendorShipping) : "");
      }
      return next;
    });
    setDirectResult(null);
    setApplyResult(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legOrders.map(o => o.id).join(","), statusFilter]);

  const kitCount = (o: GbOrder) => Math.max(1, o.lineItems.reduce((s, li) => s + li.quantity, 0));
  const includedOrders = legOrders.filter(o => !excludedIds.has(o.id));
  const totalKits = includedOrders.reduce((s, o) => s + kitCount(o), 0);
  const totalCostNum = parseFloat(totalCost) || 0;

  const calcShipping = (o: GbOrder): number => {
    if (excludedIds.has(o.id)) return 0;
    const N = includedOrders.length;
    if (N === 0 || totalCostNum === 0) return 0;
    const equalShare = totalCostNum * (equalPct / 100) / N;
    const myKits = kitCount(o);
    const weightedShare = totalKits > 0 ? totalCostNum * (weightPct / 100) * (myKits / totalKits) : 0;
    return Math.round((equalShare + weightedShare) * 100) / 100;
  };

  const totalCalc = includedOrders.reduce((s, o) => s + calcShipping(o), 0);
  const roundingDiff = Math.abs(totalCalc - totalCostNum);
  const directTotal = legOrders.reduce((s, o) => s + (parseFloat(directAmounts[o.id] || "0") || 0), 0);
  const directOrdersWithAmount = legOrders.filter(o => (parseFloat(directAmounts[o.id] || "0") || 0) > 0).length;

  const applySplit = async () => {
    if (!confirm(`Write split shipping to ${legOrders.length} orders? This overwrites their current vendor shipping.`)) return;
    setApplying(true); setApplyResult(null);
    try {
      const breakdown: { orderId: string; username: string; vendorShipping: number }[] = [];
      for (const order of legOrders) {
        const shipping = calcShipping(order);
        await fetch(apiUrl(`/admin/orders/${order.id}`), {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-admin-secret": secret },
          body: JSON.stringify({ vendorShipping: shipping }),
        });
        breakdown.push({ orderId: order.id, username: order.telegramUsername, vendorShipping: shipping });
      }
      setApplyResult({ message: `Applied to ${legOrders.length} orders`, breakdown });
    } finally { setApplying(false); }
  };

  const applyDirect = async () => {
    if (legOrders.length === 0) return;
    if (!confirm(`Write manual shipping to ${legOrders.length} orders? Orders left blank will be set to $0.00.`)) return;
    setDirectApplying(true); setDirectResult(null);
    try {
      const breakdown: { orderId: string; username: string; vendorShipping: number }[] = [];
      for (const order of legOrders) {
        const shipping = Math.round((parseFloat(directAmounts[order.id] || "0") || 0) * 100) / 100;
        await fetch(apiUrl(`/admin/orders/${order.id}`), {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-admin-secret": secret },
          body: JSON.stringify({ vendorShipping: shipping }),
        });
        breakdown.push({ orderId: order.id, username: order.telegramUsername, vendorShipping: shipping });
      }
      setDirectResult({ message: `Applied to ${legOrders.length} orders`, breakdown });
    } finally { setDirectApplying(false); }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Calculator className="w-4 h-4 text-purple-600" />
        <p className="text-sm font-bold">Leg Calculations</p>
        {leg.reshipper?.reshipperUsername && (
          <span className="text-[11px] text-purple-700 bg-purple-50 rounded-full px-2 py-0.5 font-semibold">
            @{leg.reshipper.reshipperUsername}
          </span>
        )}
        {orders.some(o => o.countryLegId === leg.id && o.vendorShipping > 0) && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Check className="w-2.5 h-2.5" />Shipping added
          </span>
        )}
      </div>

      {/* Mode toggle */}
      <div className="flex rounded-xl border border-input overflow-hidden">
        <button type="button" onClick={() => { setMode("split"); setApplyResult(null); setDirectResult(null); }}
          className={cn("flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors",
            mode === "split" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted/50")}>
          <Calculator className="w-4 h-4" />Vendor Split
        </button>
        <button type="button" onClick={() => { setMode("direct"); setApplyResult(null); setDirectResult(null); }}
          className={cn("flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors border-l border-input",
            mode === "direct" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted/50")}>
          <PenLine className="w-4 h-4" />Direct
        </button>
      </div>

      {/* Status filter */}
      <div>
        <Label className="text-xs font-semibold">Order Status</Label>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-base focus:outline-none focus:ring-1 focus:ring-ring">
          {["Submitted", "Processing", "Shipped", "Completed", "Draft"].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
      ) : legOrders.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">No {statusFilter} orders in this leg.</p>
      ) : (
        <>
          {/* ── SPLIT ── */}
          {mode === "split" && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-semibold">Total Vendor Shipping Cost ({currSym(currency)})</Label>
                <Input type="number" min="0" step="0.01" placeholder="e.g. 150.00"
                  value={totalCost} onChange={e => setTotalCost(e.target.value)}
                  className="mt-1 rounded-xl" />
                {leg.vendorShippingCost && (
                  <p className="text-[11px] text-muted-foreground mt-1">Saved on leg: ${parseFloat(String(leg.vendorShippingCost)).toFixed(2)}</p>
                )}
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold">Equal portion</p>
                  <div className="flex items-center gap-1.5">
                    <input type="number" min="0" max="100" value={equalPct}
                      onChange={e => setEqualPct(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                      className="w-16 h-9 rounded-full border border-input bg-background px-2 text-sm text-center font-semibold focus:outline-none focus:ring-1 focus:ring-ring" />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                </div>
                <input type="range" min="0" max="100" value={equalPct} onChange={e => setEqualPct(parseInt(e.target.value))}
                  className="w-full h-2.5 rounded-full cursor-pointer accent-blue-600" />
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold">Quantity-weighted</p>
                  <div className="flex items-center gap-1.5">
                    <input type="number" readOnly value={weightPct}
                      className="w-16 h-9 rounded-full border border-input bg-muted/40 px-2 text-sm text-center font-semibold focus:outline-none" />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                </div>
                <input type="range" min="0" max="100" value={weightPct} onChange={e => setEqualPct(100 - parseInt(e.target.value))}
                  className="w-full h-2.5 rounded-full cursor-pointer accent-blue-900" />
              </div>

              {/* Order rows */}
              <div className="space-y-1 max-h-72 overflow-y-auto border-t border-border pt-2">
                {legOrders.map(order => {
                  const excluded = excludedIds.has(order.id);
                  const kits = kitCount(order);
                  return (
                    <label key={order.id} className={cn("grid grid-cols-[28px_1fr_auto_auto] gap-x-2 items-center px-1.5 py-2.5 rounded-lg transition-colors cursor-pointer",
                      excluded ? "opacity-40" : "hover:bg-muted/30")}>
                      <input type="checkbox" checked={!excluded}
                        onChange={e => setExcludedIds(prev => { const n = new Set(prev); e.target.checked ? n.delete(order.id) : n.add(order.id); return n; })}
                        className="w-4 h-4 rounded" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-medium truncate">@{order.telegramUsername}</span>
                          {order.vendorShipping > 0 && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 tabular-nums shrink-0">
                              {currSym(currency)}{order.vendorShipping.toFixed(2)} set
                            </span>
                          )}
                        </div>
                        {order.notes && <span className="text-[10px] text-amber-700 bg-amber-50 rounded px-1 mt-0.5 inline-block">{order.notes}</span>}
                      </div>
                      <span className="text-[11px] text-muted-foreground text-right tabular-nums">{kits}k</span>
                      <span className={cn("text-sm font-bold text-right tabular-nums w-16", excluded ? "text-muted-foreground" : "")}>
                        {excluded ? "—" : calcShipping(order).toFixed(2)}
                      </span>
                    </label>
                  );
                })}
              </div>

              <div className="border-t border-border pt-3 space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Included</span><span className="font-semibold text-foreground">{includedOrders.length}/{legOrders.length}</span>
                </div>
                <div className="flex justify-between text-sm font-bold">
                  <span>Calculated total</span>
                  <span className={roundingDiff > 0.03 ? "text-orange-500" : "text-green-600"}>{currSym(currency)}{totalCalc.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Target</span><span className="font-semibold">{currSym(currency)}{totalCostNum.toFixed(2)}</span>
                </div>
                {roundingDiff > 0.03 && (
                  <p className="text-xs text-orange-500">Rounding diff: {(totalCalc - totalCostNum).toFixed(2)}</p>
                )}
              </div>

              <button type="button" onClick={() => void applySplit()} disabled={applying || totalCostNum === 0}
                className="w-full h-12 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
                style={{ background: "rgba(115,108,210,0.9)" }}>
                {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
                {applying ? "Applying…" : "Apply Shipping Split"}
              </button>
            </div>
          )}

          {/* ── DIRECT ── */}
          {mode === "direct" && (
            <div className="space-y-3">
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {legOrders.map(order => {
                  const val = directAmounts[order.id] ?? "";
                  const kits = kitCount(order);
                  return (
                    <div key={order.id} className="grid grid-cols-[1fr_88px] gap-x-2 items-center px-1.5 py-2.5 rounded-lg hover:bg-muted/30">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-medium truncate">@{order.telegramUsername}</span>
                          {order.vendorShipping > 0 && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 tabular-nums shrink-0">
                              {currSym(currency)}{order.vendorShipping.toFixed(2)} set
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground">{kits} kit{kits !== 1 ? "s" : ""}</span>
                        {order.notes && <span className="text-[10px] text-amber-700 bg-amber-50 rounded px-1 mt-0.5 inline-block">{order.notes}</span>}
                      </div>
                      <input type="number" min="0" step="0.01" placeholder="0.00" value={val}
                        onChange={e => setDirectAmounts(prev => ({ ...prev, [order.id]: e.target.value }))}
                        className="w-full h-11 rounded-lg border border-input bg-background px-2 text-sm text-right font-semibold tabular-nums focus:outline-none focus:ring-1 focus:ring-ring" />
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-border pt-3 space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Amounts set</span><span className="font-semibold text-foreground">{directOrdersWithAmount}/{legOrders.length}</span>
                </div>
                <div className="flex justify-between text-sm font-bold">
                  <span>Total</span><span className="text-blue-700">{currSym(currency)}{directTotal.toFixed(2)}</span>
                </div>
              </div>

              <button type="button" onClick={() => void applyDirect()} disabled={directApplying}
                className="w-full h-12 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
                style={{ background: "rgba(115,108,210,0.9)" }}>
                {directApplying ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenLine className="w-4 h-4" />}
                {directApplying ? "Applying…" : `Apply to ${legOrders.length} Orders`}
              </button>
            </div>
          )}

          {/* Result banners */}
          {applyResult && (
            <div className="rounded-xl bg-green-50 border border-green-200 p-3 space-y-1">
              <p className="text-xs font-semibold text-green-700 flex items-center gap-1"><Check className="w-3.5 h-3.5" />{applyResult.message}</p>
              <div className="space-y-0.5 max-h-36 overflow-y-auto">
                {applyResult.breakdown.map(b => (
                  <div key={b.orderId} className="flex justify-between text-[11px] text-green-800">
                    <span>@{b.username}</span><span className="font-semibold">{currSym(currency)}{b.vendorShipping.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {directResult && (
            <div className="rounded-xl bg-green-50 border border-green-200 p-3 space-y-1">
              <p className="text-xs font-semibold text-green-700 flex items-center gap-1"><Check className="w-3.5 h-3.5" />{directResult.message}</p>
              <div className="space-y-0.5 max-h-36 overflow-y-auto">
                {directResult.breakdown.map(b => (
                  <div key={b.orderId} className="flex justify-between text-[11px] text-green-800">
                    <span>@{b.username}</span><span className="font-semibold">{currSym(currency)}{b.vendorShipping.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

function AdminCountryLegsSection({ secret, gbId, currency }: { secret: string; gbId: string; currency: string }) {
  const [legs, setLegs] = useState<AdminCLeg[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [selectedLegId, setSelectedLegId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newInvite, setNewInvite] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [bulkAdding, setBulkAdding] = useState(false);
  const [approvedReshippers, setApprovedReshippers] = useState<{ telegramUsername: string }[]>([]);
  const [applyingLegShipping, setApplyingLegShipping] = useState(false);
  const [legShippingResult, setLegShippingResult] = useState<{ message: string; breakdown: { legId: string; countryName: string; countryCode: string; shippingCost: number; totalKits: number; costPerKit: number | null; ordersUpdated: number }[] } | null>(null);
  const [legShippingStatusFilter, setLegShippingStatusFilter] = useState("Submitted");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [legsRes, reshippersRes] = await Promise.all([
        fetch(apiUrl(`/admin/group-buys/${gbId}/country-legs`), { headers: { "x-admin-secret": secret } }),
        fetch(apiUrl("/admin/approved-reshippers"), { headers: { "x-admin-secret": secret } }),
      ]);
      if (legsRes.ok) setLegs(await legsRes.json());
      if (reshippersRes.ok) setApprovedReshippers(await reshippersRes.json());
    } finally { setLoading(false); }
  }, [gbId, secret]);

  useEffect(() => { void load(); }, [load]);

  const applyLegShipping = async () => {
    setApplyingLegShipping(true);
    setLegShippingResult(null);
    try {
      const r = await fetch(apiUrl(`/admin/group-buys/${gbId}/apply-leg-shipping`), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ statusFilter: legShippingStatusFilter }),
      });
      const data = await r.json();
      setLegShippingResult(data);
    } finally { setApplyingLegShipping(false); }
  };

  const patch = async (legId: string, body: object) => {
    setSaving(legId);
    try {
      const r = await fetch(apiUrl(`/admin/group-buys/${gbId}/country-legs/${legId}`), {
        method: "PATCH", headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify(body),
      });
      if (r.ok) void load();
    } finally { setSaving(null); }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    if (!newCode.trim() || !newName.trim()) { setAddError("Please select a country"); return; }
    setAdding(true);
    try {
      const r = await fetch(apiUrl(`/admin/group-buys/${gbId}/country-legs`), {
        method: "POST", headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ countryCode: newCode.trim().toUpperCase(), countryName: newName.trim(), inviteEnabled: newInvite }),
      });
      if (!r.ok) { const d = await r.json(); setAddError(d.error || "Failed"); return; }
      setNewCode(""); setNewName(""); setNewInvite(false); setAddOpen(false);
      void load();
    } finally { setAdding(false); }
  };

  const handleAddPopular = async () => {
    const existing = new Set(legs.map(l => l.countryCode));
    const toAdd = POPULAR_COUNTRIES.filter(c => !existing.has(c.code));
    if (toAdd.length === 0) return;
    setBulkAdding(true);
    try {
      for (const c of toAdd) {
        await fetch(apiUrl(`/admin/group-buys/${gbId}/country-legs`), {
          method: "POST", headers: { "Content-Type": "application/json", "x-admin-secret": secret },
          body: JSON.stringify({ countryCode: c.code, countryName: c.name, inviteEnabled: false }),
        });
      }
      void load();
    } finally { setBulkAdding(false); }
  };

  const handleAddEu = async () => {
    const existing = new Set(legs.map(l => l.countryCode));
    const toAdd = EU_COUNTRIES.filter(c => !existing.has(c.code));
    if (toAdd.length === 0) return;
    setBulkAdding(true);
    try {
      for (const c of toAdd) {
        await fetch(apiUrl(`/admin/group-buys/${gbId}/country-legs`), {
          method: "POST", headers: { "Content-Type": "application/json", "x-admin-secret": secret },
          body: JSON.stringify({ countryCode: c.code, countryName: c.name, inviteEnabled: false }),
        });
      }
      void load();
    } finally { setBulkAdding(false); }
  };

  if (loading) return <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>;

  const selectedLeg = selectedLegId != null ? (legs.find(l => l.id === selectedLegId) ?? null) : null;

  if (selectedLeg) {
    return (
      <div className="mt-4">
        <CountryLegDetailPanel
          leg={selectedLeg}
          gbId={gbId}
          secret={secret}
          currency={currency}
          approvedReshippers={approvedReshippers}
          onBack={() => setSelectedLegId(null)}
          onDeleted={() => { setSelectedLegId(null); void load(); }}
          onRefresh={() => void load()}
        />
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-2">
      {legs.length === 0 && !addOpen && (
        <p className="text-xs text-muted-foreground italic">No countries added yet.</p>
      )}
      {legs.map(leg => (
        <div key={leg.id} className="rounded-xl border border-border bg-muted/30 overflow-hidden">
          <button
            type="button"
            onClick={() => setSelectedLegId(leg.id)}
            className="w-full flex items-center justify-between gap-2 px-3 py-3 text-left hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-semibold">{leg.countryName} <span className="text-muted-foreground font-normal text-xs">({leg.countryCode})</span></span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">{leg.orderCount} order{leg.orderCount !== 1 ? "s" : ""}</span>
                  {leg.reshipper && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600">@{leg.reshipper.reshipperUsername}</span>
                  )}
                  {leg.vendorShippingCost != null && parseFloat(String(leg.vendorShippingCost)) > 0 && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-600">{parseFloat(String(leg.vendorShippingCost)).toFixed(0)} shipping</span>
                  )}
                </div>
                <p className="text-[10px] mt-0.5" style={{ color: leg.status === "active" ? "#16A34A" : "#9CA3AF" }}>
                  {leg.status === "active" ? "Active" : "Closed"}
                  {leg.inviteEnabled ? " · invite required" : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
              <button type="button" disabled={saving === leg.id}
                onClick={() => patch(leg.id, { status: leg.status === "active" ? "closed" : "active" })}
                className={cn("text-[10px] font-semibold px-2 py-1 rounded-lg border transition-colors",
                  leg.status === "active" ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-green-50 text-green-600 border-green-200")}
              >{leg.status === "active" ? "Close" : "Open"}</button>
              <ChevronRight className="w-4 h-4 text-muted-foreground ml-1" />
            </div>
          </button>
        </div>
      ))}

      {/* ── Apply Leg Shipping panel ── */}
      {legs.some(l => l.vendorShippingCost != null && parseFloat(String(l.vendorShippingCost)) > 0) && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-sky-600" />
            <p className="text-xs font-semibold text-sky-800">Apply Leg Shipping to Orders</p>
          </div>
          <p className="text-[11px] text-sky-700">
            Splits each leg's shipping cost proportionally across orders in that leg by kit quantity.
            Only legs with a shipping cost saved above will be processed.
          </p>
          {/* Summary of saved leg costs */}
          <div className="space-y-1">
            {legs.filter(l => l.vendorShippingCost != null && parseFloat(String(l.vendorShippingCost)) > 0).map(l => (
              <div key={l.id} className="flex items-center justify-between text-[11px]">
                <span className="font-medium text-sky-800">{l.countryName}</span>
                <span className="text-sky-700">
                  {l.vendorPackageCount ? `${l.vendorPackageCount} pkgs · ` : ""}
                  <span className="font-semibold">{parseFloat(String(l.vendorShippingCost)).toFixed(2)}</span>
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={legShippingStatusFilter}
              onChange={e => setLegShippingStatusFilter(e.target.value)}
              className="rounded-lg border border-sky-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-sky-400"
            >
              {["Submitted", "Processing", "Shipped"].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void applyLegShipping()}
              disabled={applyingLegShipping}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-60 transition-colors"
            >
              {applyingLegShipping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Truck className="w-3.5 h-3.5" />}
              Apply All Legs
            </button>
          </div>
          {legShippingResult && (
            <div className="rounded-lg bg-white border border-sky-200 p-2 space-y-1">
              <p className="text-[11px] font-semibold text-sky-800">{legShippingResult.message}</p>
              {legShippingResult.breakdown.filter(b => b.ordersUpdated > 0).map(b => (
                <div key={b.legId ?? b.countryCode} className="text-[11px] text-sky-700 flex items-center justify-between">
                  <span>{b.countryName} ({b.countryCode})</span>
                  <span>
                    {b.ordersUpdated} order{b.ordersUpdated !== 1 ? "s" : ""} · {b.totalKits} kit{b.totalKits !== 1 ? "s" : ""} ·{" "}
                    {b.costPerKit != null ? `${b.costPerKit.toFixed(2)}/kit` : "—"}
                  </span>
                </div>
              ))}
              {legShippingResult.breakdown.filter(b => b.ordersUpdated === 0).length > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  Skipped (no matching orders):{" "}
                  {legShippingResult.breakdown.filter(b => b.ordersUpdated === 0).map(b => b.countryName).join(", ")}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Bill Paid Orders for Vendor Shipping ── */}
      {legs.some(l => l.vendorShippingCost != null && parseFloat(String(l.vendorShippingCost)) > 0) && (
        <BillVendorShippingPanel secret={secret} gbId={gbId} />
      )}

      {/* Add form */}
      {addOpen ? (
        <form onSubmit={handleAdd} className="rounded-xl border border-dashed border-border p-3 space-y-2 bg-muted/20">
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1 block">Country</label>
            <select
              className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm focus:outline-none"
              value={newCode}
              onChange={e => {
                const entry = COUNTRY_LIST.find(c => c.code === e.target.value);
                setNewCode(e.target.value);
                setNewName(entry?.name ?? "");
              }}
            >
              <option value="">Select a country…</option>
              {COUNTRY_LIST.map(c => (
                <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="checkbox" checked={newInvite} onChange={e => setNewInvite(e.target.checked)} className="rounded" />
            Require invite code
          </label>
          {addError && <p className="text-xs text-red-500">{addError}</p>}
          <div className="flex gap-2">
            <Button size="sm" type="submit" disabled={adding} className="gap-1.5">{adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}Add Country</Button>
            <Button size="sm" type="button" variant="ghost" onClick={() => { setAddOpen(false); setAddError(null); }}>Cancel</Button>
          </div>
        </form>
      ) : (
        <div className="flex gap-2 flex-wrap">
          <button type="button" onClick={() => setAddOpen(true)}
            className="flex-1 rounded-xl border border-dashed border-border py-2 text-xs font-semibold text-muted-foreground hover:bg-muted/40 transition-colors flex items-center justify-center gap-1.5">
            <Plus className="w-3.5 h-3.5" />Add Country
          </button>
          <button type="button" onClick={handleAddPopular} disabled={bulkAdding}
            className="flex-1 rounded-xl border border-dashed border-amber-300 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60">
            {bulkAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
            Add US/UK/CA/AU/BR
          </button>
          <button type="button" onClick={handleAddEu} disabled={bulkAdding}
            className="flex-1 rounded-xl border border-dashed border-blue-200 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60">
            {bulkAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
            Add EU Countries
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Details Sub-tab ──────────────────────────────────────────
function DetailsSubTab({ secret, gb, onUpdate }: { secret: string; gb: GroupBuy; onUpdate: (gb: GroupBuy) => void }) {
  const [infoCards, setInfoCards] = useState<InfoCard[]>(gb.infoCards ?? []);
  const [savingCards, setSavingCards] = useState(false);
  const [savedCards, setSavedCards] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [togglingTesting, setTogglingTesting] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>(gb.shippingOptions ?? []);
  const [savingShipping, setSavingShipping] = useState(false);
  const [savedShipping, setSavedShipping] = useState(false);

  // Sync local state when GB changes (switch between GBs) or when
  // server-normalised data updates in-place on the same GB.
  useEffect(() => {
    setInfoCards(gb.infoCards ?? []);
    setShippingOptions(gb.shippingOptions ?? []);
    setVendorShippingMessage(gb.vendorShippingMessage ?? "");
    setVendorShippingAmount(gb.vendorShippingAmount != null ? String(gb.vendorShippingAmount) : "");
    setDirectShippingVendorId(gb.directShippingVendorId ?? "");
  }, [gb.id, gb.infoCards, gb.shippingOptions, gb.vendorShippingMessage, gb.vendorShippingAmount, gb.directShippingVendorId]);

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

  // Payment Country Restrictions
  const [paymentAllowedCountries, setPaymentAllowedCountries] = useState<string[]>(gb.allowedCountries ?? []);
  const [paymentBlockedCountries, setPaymentBlockedCountries] = useState<string[]>(gb.excludedCountries ?? []);
  const [savingPaymentCountries, setSavingPaymentCountries] = useState(false);
  const [savedPaymentCountries, setSavedPaymentCountries] = useState(false);

  useEffect(() => {
    setPaymentAllowedCountries(gb.allowedCountries ?? []);
    setPaymentBlockedCountries(gb.excludedCountries ?? []);
  }, [gb.id, gb.allowedCountries, gb.excludedCountries]);

  const savePaymentCountries = async () => {
    setSavingPaymentCountries(true);
    try {
      const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({
          allowedCountries: paymentAllowedCountries.length > 0 ? paymentAllowedCountries : null,
          excludedCountries: paymentBlockedCountries.length > 0 ? paymentBlockedCountries : null,
        }),
      });
      if (res.ok) {
        onUpdate(await res.json());
        setSavedPaymentCountries(true);
        setTimeout(() => setSavedPaymentCountries(false), 2000);
      }
    } finally { setSavingPaymentCountries(false); }
  };

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

  const saveShippingOptions = async () => {
    setSavingShipping(true);
    try {
      const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ shippingOptions }),
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdate(updated);
        setSavedShipping(true);
        setTimeout(() => setSavedShipping(false), 2000);
      }
    } finally { setSavingShipping(false); }
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
    { id: "general" as const, label: "General" },
    { id: "payments" as const, label: "Payments" },
    { id: "ordering" as const, label: "Ordering" },
    { id: "shipping" as const, label: "Shipping" },
    { id: "access" as const, label: "Access" },
  ];

  return (
    <div className="space-y-4">
      {/* Sub-tab nav */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-xl border border-border/60 w-fit">
        {DETAILS_SUB_TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setDetailsSubTab(tab.id)}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all",
              detailsSubTab === tab.id
                ? "bg-background shadow-sm text-foreground border border-border/60"
                : "text-muted-foreground hover:text-foreground hover:bg-background/60"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── GENERAL ── */}
      {detailsSubTab === "general" && <div className="space-y-6">
      {/* Status */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="font-semibold text-sm">Status</h3>
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
      </Card>

      {/* General Settings */}
      <Card className="p-5">
        <h3 className="font-semibold text-sm mb-4">General Settings</h3>
        <GBForm
          key={`${formKey}-${gb.status}`}
          secret={secret}
          initial={gb}
          hideStatus
          onSave={(updated) => { onUpdate(updated); setFormKey(k => k + 1); }}
          onCancel={() => setFormKey(k => k + 1)}
        />
      </Card>
      </div>}

      {/* ── PAYMENTS ── */}
      {detailsSubTab === "payments" && <div className="space-y-6">
      {/* Payments (combined card) */}
      <Card className="p-5 space-y-5">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-green-500" />
          <h3 className="font-semibold text-sm">Payments</h3>
        </div>

        {/* Accept Payments */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">Accept Payments</p>
            <button
              type="button"
              onClick={togglePayments}
              disabled={togglingPayments}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                gb.paymentsEnabled
                  ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                  : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
              )}
            >
              {togglingPayments ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (gb.paymentsEnabled ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />)}
              {gb.paymentsEnabled ? "Open" : "Closed"}
            </button>
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
                <button
                  type="button"
                  onClick={toggleDirectShippingPayments}
                  disabled={togglingDirectPay}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                    (gb.directShippingPaymentsEnabled ?? true)
                      ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                      : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                  )}
                >
                  {togglingDirectPay ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : ((gb.directShippingPaymentsEnabled ?? true) ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />)}
                  {(gb.directShippingPaymentsEnabled ?? true) ? "Open" : "Closed"}
                </button>
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
            <button
              type="button"
              onClick={togglePaymentMsg}
              disabled={togglingPaymentMsg}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                gb.paymentMessageEnabled
                  ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                  : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
              )}
            >
              {togglingPaymentMsg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (gb.paymentMessageEnabled ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />)}
              {gb.paymentMessageEnabled ? "Enabled" : "Disabled"}
            </button>
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
      </Card>

      {/* Payment Country Restrictions */}
      <Card className="p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-500" />
            <h3 className="font-semibold text-sm">Payment Country Restrictions</h3>
          </div>
          {(paymentAllowedCountries.length > 0 || paymentBlockedCountries.length > 0) && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">Active</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Control which countries can submit payments. Leave both lists empty to accept from all countries.
        </p>

        {/* Accepted countries */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-green-700">Accepted Payment Countries</p>
          <p className="text-[11px] text-muted-foreground">Only these countries can pay (leave empty = all accepted).</p>
          {paymentAllowedCountries.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {paymentAllowedCountries.map(c => (
                <span key={c} className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(34,197,94,0.15)", color: "#16a34a" }}>
                  {c}
                  <button type="button" className="hover:opacity-70 leading-none" onClick={() => setPaymentAllowedCountries(p => p.filter(x => x !== c))}>×</button>
                </span>
              ))}
            </div>
          )}
          <select className="w-full h-9 rounded-xl border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
            value=""
            onChange={e => {
              const val = e.target.value;
              if (!val) return;
              setPaymentAllowedCountries(p => p.includes(val) ? p : [...p, val]);
              e.currentTarget.value = "";
            }}>
            <option value="">— Add an accepted country —</option>
            {COUNTRIES.filter(c => !paymentAllowedCountries.includes(c)).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Blocked countries */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-red-600">Blocked Payment Countries</p>
          <p className="text-[11px] text-muted-foreground">These countries cannot submit payment, even if they are members.</p>
          {paymentBlockedCountries.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {paymentBlockedCountries.map(c => (
                <span key={c} className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(239,68,68,0.15)", color: "#dc2626" }}>
                  {c}
                  <button type="button" className="hover:opacity-70 leading-none" onClick={() => setPaymentBlockedCountries(p => p.filter(x => x !== c))}>×</button>
                </span>
              ))}
            </div>
          )}
          <select className="w-full h-9 rounded-xl border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
            value=""
            onChange={e => {
              const val = e.target.value;
              if (!val) return;
              setPaymentBlockedCountries(p => p.includes(val) ? p : [...p, val]);
              e.currentTarget.value = "";
            }}>
            <option value="">— Block a country —</option>
            {COUNTRIES.filter(c => !paymentBlockedCountries.includes(c)).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <Button size="sm" onClick={() => void savePaymentCountries()} disabled={savingPaymentCountries} className="gap-1.5">
          {savingPaymentCountries ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : savedPaymentCountries ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          {savedPaymentCountries ? "Saved" : "Save Restrictions"}
        </Button>
      </Card>

      {/* Admin Fee */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-purple-500" />
            <h3 className="font-semibold text-sm">Admin Fee</h3>
          </div>
          <button
            type="button"
            onClick={toggleAdminFee}
            disabled={togglingAdminFee}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
              gb.adminFeeEnabled
                ? "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
                : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
            )}
          >
            {togglingAdminFee ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (gb.adminFeeEnabled ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />)}
            {gb.adminFeeEnabled ? "Enabled" : "Disabled"}
          </button>
        </div>
        {gb.adminFeeEnabled ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">A fixed fee added to each order in this group buy.</p>
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
      </Card>
      </div>}

      {/* ── ORDERING ── */}
      {detailsSubTab === "ordering" && <div className="space-y-6">
      {/* Country Sub-groups */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-teal-500" />
            <h3 className="font-semibold text-sm">Country Sub-groups</h3>
          </div>
          <button
            type="button"
            onClick={toggleCountryLegs}
            disabled={togglingCountryLegs}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
              gb.countryLegsEnabled
                ? "bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100"
                : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
            )}
          >
            {togglingCountryLegs ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (gb.countryLegsEnabled ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />)}
            {gb.countryLegsEnabled ? "Enabled" : "Disabled"}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Split this GB into per-country sub-groups with separate invite codes and reshipper assignments.
        </p>
        {gb.countryLegsEnabled && (
          <p className="text-xs text-teal-600 font-medium mt-2">Country Legs are enabled — manage them in the "Country Legs" tab above.</p>
        )}
      </Card>

      {/* 6. Lab Testing (simplified toggle — manage rounds in Testing tab) */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TestTube className="w-4 h-4 text-blue-500" />
            <h3 className="font-semibold text-sm">Lab Testing</h3>
          </div>
          <button
            type="button"
            onClick={toggleTesting}
            disabled={togglingTesting}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
              gb.testingEnabled
                ? "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
            )}
          >
            {togglingTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (gb.testingEnabled ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />)}
            {gb.testingEnabled ? "Enabled" : "Disabled"}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          When enabled, customers can opt in to a lab test contribution when placing an order. Manage rounds, contributions, and votes in the <strong>Testing</strong> tab.
        </p>
      </Card>

      {/* 7. Organiser Order Editing */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-orange-500" />
            <h3 className="font-semibold text-sm">Organiser Order Editing</h3>
          </div>
          <button
            type="button"
            onClick={toggleOrganiserOrderEdit}
            disabled={togglingOrganiserOrderEdit}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
              gb.organiserOrderEditEnabled
                ? "bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
                : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
            )}
          >
            {togglingOrganiserOrderEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (gb.organiserOrderEditEnabled ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />)}
            {gb.organiserOrderEditEnabled ? "Enabled" : "Disabled"}
          </button>
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
            ] as { field: string; label: string; desc: string; val: boolean }[]).map(({ field, label, desc, val }) => (
              <div key={field} className="flex items-center justify-between px-3 py-2.5 gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground">{label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
                </div>
                <button
                  type="button"
                  disabled={togglingOrgField === field}
                  onClick={() => patchOrgEditField(field, val)}
                  className={cn(
                    "shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all",
                    val
                      ? "bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
                      : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100"
                  )}
                >
                  {togglingOrgField === field ? <Loader2 className="w-3 h-3 animate-spin" /> : (val ? <ToggleRight className="w-3 h-3" /> : <ToggleLeft className="w-3 h-3" />)}
                  {val ? "On" : "Off"}
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 7b. Customer order add-ons */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <ShoppingCart className="w-4 h-4 text-blue-500" />
          <h3 className="font-semibold text-sm">Allow members to add to their order</h3>
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
              <button
                type="button"
                disabled={togglingOrgField === field}
                onClick={() => patchOrgEditField(field, val)}
                className={cn(
                  "shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all",
                  val
                    ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                    : "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                )}
              >
                {togglingOrgField === field ? <Loader2 className="w-3 h-3 animate-spin" /> : (val ? <ToggleRight className="w-3 h-3" /> : <ToggleLeft className="w-3 h-3" />)}
                {val ? "Enabled" : "Disabled"}
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* 7c. Customer permissions when GB is closed */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <Lock className="w-4 h-4 text-orange-500" />
          <h3 className="font-semibold text-sm">Customer permissions when GB closed</h3>
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
              <button
                type="button"
                disabled={togglingOrgField === field}
                onClick={() => patchOrgEditField(field, val)}
                className={cn(
                  "shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all",
                  val
                    ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                    : "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                )}
              >
                {togglingOrgField === field ? <Loader2 className="w-3 h-3 animate-spin" /> : (val ? <ToggleRight className="w-3 h-3" /> : <ToggleLeft className="w-3 h-3" />)}
                {val ? "Enabled" : "Disabled"}
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* 8. Info Cards */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-orange-500" />
            <h3 className="font-semibold text-sm">Info Cards</h3>
          </div>
          <Button size="sm" onClick={saveInfoCards} disabled={savingCards} className="gap-1.5">
            {savingCards ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : savedCards ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            {savedCards ? "Saved" : "Save Cards"}
          </Button>
        </div>
        <InfoCardsEditor cards={infoCards} onChange={setInfoCards} />
      </Card>

      {/* 9. Order Page Message */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="w-4 h-4 text-blue-500" />
          <h3 className="font-semibold text-sm">Order Page Message</h3>
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
      </Card>
      </div>}

      {/* Payment Page Banner — Payments tab */}
      {detailsSubTab === "payments" && <div className="space-y-6">
      {/* Payment Page Banner */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <CreditCard className="w-4 h-4 text-orange-500" />
          <h3 className="font-semibold text-sm">Payment Page Banner</h3>
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
      </Card>
      </div>}

      {/* ── SHIPPING ── */}
      {detailsSubTab === "shipping" && <div className="space-y-6">
      {/* Shipping Options */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-indigo-500" />
            <h3 className="font-semibold text-sm">Shipping Options</h3>
          </div>
          <Button size="sm" onClick={saveShippingOptions} disabled={savingShipping} className="gap-1.5">
            {savingShipping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : savedShipping ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            {savedShipping ? "Saved" : "Save Options"}
          </Button>
        </div>
        <ShippingOptionsEditor options={shippingOptions} onChange={setShippingOptions} currencySym={currSym(gb.currency)} />
      </Card>

      {/* 11. Vendor Shipping Notice */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-sky-500" />
            <h3 className="font-semibold text-sm">Vendor Shipping Notice</h3>
          </div>
          <button
            type="button"
            onClick={toggleVendorShipping}
            disabled={togglingVendorShipping}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
              gb.vendorShippingEnabled
                ? "bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100"
                : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
            )}
          >
            {togglingVendorShipping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (gb.vendorShippingEnabled ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />)}
            {gb.vendorShippingEnabled ? "Enabled" : "Disabled"}
          </button>
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
      </Card>

      {/* 12. Direct Shipping to Home */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Home className="w-4 h-4" style={{ color: "#1B3A7A" }} />
            <h3 className="font-semibold text-sm">Direct Shipping to Home</h3>
          </div>
          <button
            type="button"
            onClick={toggleDirectShipping}
            disabled={togglingDirectShipping}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
              gb.directShippingEnabled
                ? "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
            )}
          >
            {togglingDirectShipping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (gb.directShippingEnabled ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />)}
            {gb.directShippingEnabled ? "Enabled" : "Disabled"}
          </button>
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
      </Card>
      </div>}

      {/* ── ACCESS ── */}
      {detailsSubTab === "access" && <div className="space-y-6">
      {/* QR Viewer Access */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <UserCheck className="w-4 h-4" style={{ color: "#1B3A7A" }} />
          <h3 className="font-semibold text-sm">QR Viewer Access</h3>
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
      </Card>

      {/* 12b. Leg Viewer Access */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <Globe className="w-4 h-4" style={{ color: "#1B3A7A" }} />
          <h3 className="font-semibold text-sm">Leg Viewer Access</h3>
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
      </Card>

      {/* 12. QR Code Upload */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4" style={{ color: "#1B3A7A" }} />
            <h3 className="font-semibold text-sm">QR Code Upload</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleQrInpost}
              disabled={togglingQrInpost}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                gb.qrUploadInpostEnabled
                  ? "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                  : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
              )}
            >
              {togglingQrInpost ? <Loader2 className="w-3 h-3 animate-spin" /> : (gb.qrUploadInpostEnabled ? <ToggleRight className="w-3 h-3" /> : <ToggleLeft className="w-3 h-3" />)}
              InPost
            </button>
            <button
              type="button"
              onClick={toggleQrRoyalMail}
              disabled={togglingQrRoyalMail}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                gb.qrUploadRoyalMailEnabled
                  ? "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                  : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
              )}
            >
              {togglingQrRoyalMail ? <Loader2 className="w-3 h-3 animate-spin" /> : (gb.qrUploadRoyalMailEnabled ? <ToggleRight className="w-3 h-3" /> : <ToggleLeft className="w-3 h-3" />)}
              Royal Mail
            </button>
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
      </Card>
      </div>}

      {/* Stock View + Allow Extra Orders — Ordering tab */}
      {detailsSubTab === "ordering" && <div className="space-y-6">
      {/* Stock View */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" style={{ color: "#1B3A7A" }} />
            <div>
              <h3 className="font-semibold text-sm">Stock View</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {(gb.showStockView ?? true)
                  ? "Members can see stock levels on the order form — the fill-level modal, product dropdown indicators, and the bar below each product row."
                  : "Stock view is hidden. Members see no stock indicators on the order form."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleStockView}
            disabled={togglingStockView}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all shrink-0 ml-4",
              (gb.showStockView ?? true)
                ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
            )}
          >
            {togglingStockView
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : ((gb.showStockView ?? true) ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />)}
            {(gb.showStockView ?? true) ? "Visible" : "Hidden"}
          </button>
        </div>
      </Card>

      {/* 14. Allow Extra Orders */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" style={{ color: "#1B3A7A" }} />
            <div>
              <h3 className="font-semibold text-sm">Allow Extra Orders</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {(gb.allowExtraOrders ?? false)
                  ? "All members can place another order on this GB, even if they have already reached their kit limit."
                  : "Kit limits apply normally. Enable to let all paid members re-order without restriction."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleExtraOrders}
            disabled={togglingExtraOrders}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all shrink-0 ml-4",
              (gb.allowExtraOrders ?? false)
                ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
            )}
          >
            {togglingExtraOrders
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : ((gb.allowExtraOrders ?? false) ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />)}
            {(gb.allowExtraOrders ?? false) ? "Enabled" : "Disabled"}
          </button>
        </div>
      </Card>
      </div>}
    </div>
  );
}

// ─── CSV Import Modal ─────────────────────────────────────────
function CsvImportModal({ secret, gb, onDone, onClose }: {
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
const GBP_TO_USD = 1.27;

interface GBProduct { id: string; groupBuyId: string; productId: string; priceOverride: number | null; active: boolean; sortOrder: number | null }
interface DeliveryMethod { id: string; name: string; price: number; active: boolean; sortOrder: number | null }
interface GBDeliveryMethod { id: string; groupBuyId: string; deliveryMethodId: string }
type Member = { telegramUsername: string; email: string | null; accountStatus: string; hasPassword: boolean; hasTelegram: boolean; joinedAt: string; tags: string[]; allowExtraOrder: boolean }

function ProductsSubTab({ secret, gb }: { secret: string; gb: GroupBuy }) {
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
const GB_STATUSES = ["Draft", "Submitted", "Processing", "Shipped", "Completed", "Cancelled"];

function ShippingSplitCard({ secret, gbId }: { secret: string; gbId: string }) {
  const [enabled, setEnabled] = useState(false);
  const [totalShipping, setTotalShipping] = useState("");
  const [equalPct, setEqualPct] = useState(80);
  const [weightedPct, setWeightedPct] = useState(20);
  const [statusFilter, setStatusFilter] = useState("Submitted");
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<{
    message: string;
    updatedCount: number;
    breakdown: { orderId: string; username: string; vendorShipping: number; newGrandTotal: number }[];
  } | null>(null);
  const [error, setError] = useState("");

  const syncSlider = (field: "equal" | "weighted", val: number) => {
    const c = Math.max(0, Math.min(100, val));
    if (field === "equal") { setEqualPct(c); setWeightedPct(100 - c); }
    else { setWeightedPct(c); setEqualPct(100 - c); }
  };

  const handleApply = async () => {
    if (Math.abs(equalPct + weightedPct - 100) > 0.5) { setError("Equal % + Weighted % must sum to 100"); return; }
    const amt = parseFloat(totalShipping);
    if (isNaN(amt) || amt < 0) { setError("Enter a valid shipping amount"); return; }
    setError(""); setApplying(true); setResult(null);
    try {
      const res = await fetch(apiUrl(`/admin/group-buys/${gbId}/apply-shipping`), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ totalShipping: amt, equalPct, weightedPct, statusFilter }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Failed to apply shipping split");
      else setResult(data);
    } catch { setError("Network error"); }
    setApplying(false);
  };

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-purple-500" />
          <h3 className="font-semibold text-sm">Shipping Split</h3>
        </div>
        <button
          type="button"
          onClick={() => { setEnabled(e => !e); setResult(null); setError(""); }}
          className="shrink-0"
        >
          {enabled
            ? <ToggleRight className="w-5 h-5 text-purple-600" />
            : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
        </button>
      </div>

      {!enabled && (
        <p className="text-xs text-muted-foreground">Enable to split vendor shipping cost across orders in this group buy.</p>
      )}

      {enabled && (
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Total Vendor Shipping Cost ($)</Label>
            <Input
              type="number" min="0" step="0.01" placeholder="e.g. 150.00"
              value={totalShipping}
              onChange={e => setTotalShipping(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            {[
              { field: "equal" as const, label: "Equal portion", sub: "Same amount per order", val: equalPct },
              { field: "weighted" as const, label: "Quantity-weighted", sub: "More items = more shipping", val: weightedPct },
            ].map(({ field, label, sub, val }) => (
              <div key={field}>
                <div className="flex justify-between items-center mb-1">
                  <div>
                    <Label className="text-sm">{label}</Label>
                    <p className="text-xs text-muted-foreground">{sub}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number" min="0" max="100"
                      className="w-20 h-9 text-center text-sm"
                      value={val}
                      onChange={e => syncSlider(field, parseFloat(e.target.value) || 0)}
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>
                <input
                  type="range" min="0" max="100" value={val}
                  onChange={e => syncSlider(field, parseInt(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
            ))}
            <div className={cn("text-xs font-medium px-3 py-2 rounded-lg",
              Math.abs(equalPct + weightedPct - 100) < 0.5
                ? "bg-green-50 text-green-700"
                : "bg-destructive/10 text-destructive")}>
              {equalPct}% + {weightedPct}% = {equalPct + weightedPct}%
              {Math.abs(equalPct + weightedPct - 100) < 0.5 ? " ✓" : " (must be 100)"}
            </div>
          </div>

          <div className="space-y-1">
            <Label>Apply to status</Label>
            <select
              className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              {GB_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {error && <p className="text-sm text-destructive font-medium">{error}</p>}

          <Button
            className="w-full"
            onClick={handleApply}
            disabled={applying || !totalShipping || Math.abs(equalPct + weightedPct - 100) > 0.5}
          >
            {applying
              ? <Loader2 className="w-5 h-5 animate-spin" />
              : <><Truck className="w-4 h-4 mr-2" />Apply Shipping Split</>}
          </Button>

          {result && (
            <div className="space-y-2 pt-1">
              <p className="text-sm font-semibold text-green-700">{result.message}</p>
              {result.breakdown.length > 0 && (
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {result.breakdown.map(b => (
                    <div key={b.orderId} className="flex justify-between text-sm">
                      <span className="text-muted-foreground truncate">@{b.username}</span>
                      <span className="font-medium shrink-0 ml-3">
                        ${b.vendorShipping.toFixed(2)} shipping → ${b.newGrandTotal.toFixed(2)} total
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function DeliveryMethodsSubTab({ secret, gb, onUpdate }: { secret: string; gb: GroupBuy; onUpdate?: (gb: GroupBuy) => void }) {
  const [allDms, setAllDms] = useState<DeliveryMethod[]>([]);
  const [gbDms, setGbDms] = useState<GBDeliveryMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState("");

  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>(gb.shippingOptions ?? []);
  const [savingShipping, setSavingShipping] = useState(false);
  const [savedShipping, setSavedShipping] = useState(false);

  useEffect(() => {
    setShippingOptions(gb.shippingOptions ?? []);
  }, [gb.id, gb.shippingOptions]);

  const saveShippingOptions = async () => {
    setSavingShipping(true);
    try {
      const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ shippingOptions }),
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdate?.(updated);
        setSavedShipping(true);
        setTimeout(() => setSavedShipping(false), 2000);
      } else {
        const d = await res.json().catch(() => ({}));
        setActionErr(d.error ?? "Failed to save shipping options");
      }
    } catch { setActionErr("Network error saving shipping options"); }
    setSavingShipping(false);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [allRes, gbRes] = await Promise.all([
        fetch(apiUrl("/admin/delivery-methods"), { headers: { "x-admin-secret": secret } }),
        fetch(apiUrl(`/admin/group-buys/${gb.id}/delivery-methods`), { headers: { "x-admin-secret": secret } }),
      ]);
      if (allRes.ok) setAllDms(await allRes.json());
      if (gbRes.ok) setGbDms(await gbRes.json());
    } catch {
      // Network error — leave lists empty, user can refresh
    } finally {
      setLoading(false);
    }
  }, [secret, gb.id]);

  useEffect(() => { load(); }, [load]);

  const linkedIds = new Set(gbDms.map(d => d.deliveryMethodId));

  const toggle = async (dm: DeliveryMethod) => {
    setToggling(dm.id);
    setActionErr("");
    try {
      if (linkedIds.has(dm.id)) {
        const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}/delivery-methods/${dm.id}`), {
          method: "DELETE", headers: { "x-admin-secret": secret },
        });
        if (!res.ok) { const d = await res.json().catch(() => ({})); setActionErr(d.error ?? "Failed to remove delivery method"); }
        else setGbDms(prev => prev.filter(d => d.deliveryMethodId !== dm.id));
      } else {
        const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}/delivery-methods`), {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-admin-secret": secret },
          body: JSON.stringify({ deliveryMethodId: dm.id }),
        });
        if (!res.ok) { const d = await res.json().catch(() => ({})); setActionErr(d.error ?? "Failed to add delivery method"); }
        else await load();
      }
    } catch { setActionErr("Network error"); }
    setToggling(null);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-indigo-500" />
            <h3 className="font-semibold text-sm">Custom Postage Options</h3>
          </div>
          <Button size="sm" onClick={saveShippingOptions} disabled={savingShipping} className="gap-1.5">
            {savingShipping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : savedShipping ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            {savedShipping ? "Saved" : "Save Options"}
          </Button>
        </div>
        <ShippingOptionsEditor options={shippingOptions} onChange={setShippingOptions} currencySym={currSym(gb.currency)} />
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Package className="w-4 h-4 text-green-500" />
          <h3 className="font-semibold text-sm">Global Delivery Methods</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Toggle global delivery methods for this group buy. Custom postage options above will override these when set.</p>
        <div className="space-y-2">
          {actionErr && <p className="text-xs text-red-500 px-1">{actionErr}</p>}
          {allDms.map(dm => {
            const isOn = linkedIds.has(dm.id);
            return (
              <div key={dm.id} className={cn("flex items-center gap-3 p-3 rounded-xl border transition-colors",
                isOn ? "bg-green-50 border-green-200" : "bg-background border-border hover:bg-muted/30")}>
                <button type="button" onClick={() => toggle(dm)} disabled={toggling === dm.id} className="shrink-0">
                  {toggling === dm.id
                    ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    : isOn
                      ? <ToggleRight className="w-5 h-5 text-green-600" />
                      : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
                </button>
                <div className="flex-1">
                  <p className="text-sm font-medium">{dm.name}</p>
                  <p className="text-xs text-muted-foreground">{gb.currency} {typeof dm.price === "number" ? dm.price.toFixed(2) : dm.price}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <ShippingSplitCard secret={secret} gbId={gb.id} />

      <CouriersManager secret={secret} />
    </div>
  );
}

// ─── Couriers Manager ─────────────────────────────────────────
function CouriersManager({ secret }: { secret: string }) {
  const [couriers, setCouriers] = useState<CustomCourier[]>([]);
  const [loading, setLoading] = useState(true);
  const [addName, setAddName] = useState("");
  const [addUrl, setAddUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(apiUrl("/admin/couriers"), { headers: { "x-admin-secret": secret } });
    if (res.ok) setCouriers(await res.json());
    setLoading(false);
  }, [secret]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    const name = addName.trim();
    if (!name) return;
    setAdding(true); setError("");
    try {
      const res = await fetch(apiUrl("/admin/couriers"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ name, trackingUrlTemplate: addUrl.trim() || null }),
      });
      if (res.ok) {
        const courier = await res.json() as CustomCourier;
        setCouriers(prev => [...prev, courier]);
        setAddName(""); setAddUrl("");
      } else {
        const d = await res.json().catch(() => ({})) as { error?: string };
        setError(d.error ?? "Failed to add courier");
      }
    } catch { setError("Network error"); }
    setAdding(false);
  };

  const startEdit = (c: CustomCourier) => {
    setEditingId(c.id);
    setEditName(c.name);
    setEditUrl(c.trackingUrlTemplate ?? "");
  };

  const handleSave = async (id: string) => {
    const name = editName.trim();
    if (!name) return;
    setSaving(true); setError("");
    try {
      const res = await fetch(apiUrl(`/admin/couriers/${id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ name, trackingUrlTemplate: editUrl.trim() || null }),
      });
      if (res.ok) {
        const updated = await res.json() as CustomCourier;
        setCouriers(prev => prev.map(c => c.id === id ? updated : c));
        setEditingId(null);
      } else {
        const d = await res.json().catch(() => ({})) as { error?: string };
        setError(d.error ?? "Failed to save");
      }
    } catch { setError("Network error"); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id); setError("");
    try {
      const res = await fetch(apiUrl(`/admin/couriers/${id}`), {
        method: "DELETE", headers: { "x-admin-secret": secret },
      });
      if (res.ok || res.status === 204) {
        setCouriers(prev => prev.filter(c => c.id !== id));
      } else {
        const d = await res.json().catch(() => ({})) as { error?: string };
        setError(d.error ?? "Failed to delete");
      }
    } catch { setError("Network error"); }
    setDeletingId(null);
  };

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <Truck className="w-4 h-4 text-violet-500" />
        <h3 className="font-semibold text-sm">Custom Couriers</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Define custom couriers (with optional tracking URL templates) that appear alongside the standard carrier list when creating parcels.
        Use <code className="bg-muted px-1 rounded text-[11px]">&#123;tracking_number&#125;</code> in the URL to auto-fill the tracking number.
      </p>

      {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-2 mb-4">
          {couriers.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-3">No custom couriers yet.</p>
          )}
          {couriers.map(c => (
            <div key={c.id} className="border border-border rounded-xl bg-background">
              {editingId === c.id ? (
                <div className="p-3 space-y-2">
                  <Input
                    placeholder="Courier name"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="text-sm"
                  />
                  <Input
                    placeholder="Tracking URL template (optional)"
                    value={editUrl}
                    onChange={e => setEditUrl(e.target.value)}
                    className="text-sm font-mono"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => setEditingId(null)} disabled={saving}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" onClick={() => handleSave(c.id)} disabled={saving || !editName.trim()} className="gap-1.5">
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{c.name}</p>
                    {c.trackingUrlTemplate && (
                      <p className="text-xs text-muted-foreground font-mono truncate">{c.trackingUrlTemplate}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => startEdit(c)}
                    className="p-1.5 rounded hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(c.id)}
                    disabled={deletingId === c.id}
                    className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    {deletingId === c.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2 pt-3 border-t border-border">
        <p className="text-xs font-semibold text-muted-foreground">Add new courier</p>
        <Input
          placeholder="Courier name *"
          value={addName}
          onChange={e => setAddName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleAdd()}
          className="text-sm"
        />
        <Input
          placeholder="Tracking URL template (optional)"
          value={addUrl}
          onChange={e => setAddUrl(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleAdd()}
          className="text-sm font-mono"
        />
        <Button
          onClick={handleAdd}
          disabled={adding || !addName.trim()}
          size="sm"
          className="gap-1.5 w-full"
        >
          {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Add Courier
        </Button>
      </div>
    </Card>
  );
}

// ─── Members Sub-tab ──────────────────────────────────────────
function MembersSubTab({ secret, gb }: { secret: string; gb: GroupBuy }) {
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

interface Product { id: string; name: string; price: number; category: string | null; mgSize: string | null; stock: number | null; active: boolean; vendor: string | null; halfKitEnabled: boolean }
interface CustomCourier { id: string; name: string; trackingUrlTemplate: string | null; createdAt: string }
type ParamSpec = { key: string; label: string; required: boolean; type: "text" | "date" | "select"; placeholder?: string; options?: { value: string; label: string }[] };

const CARRIER_PARAMS: Record<number, ParamSpec[]> = {
  2061: [{ key: "postal_code", label: "Postal Code", required: false, type: "text", placeholder: "1000" }],
  7041: [{ key: "postal_code", label: "Postal Code", required: false, type: "text", placeholder: "1000 AA" }],
  14041: [
    { key: "destination_country", label: "Destination Country (2-letter ISO)", required: true, type: "text", placeholder: "FR" },
    { key: "postal_code", label: "Postal Code", required: false, type: "text", placeholder: "1000 AA" },
  ],
  21051: [{ key: "mid", label: "MID Number", required: false, type: "text", placeholder: "123456" }],
  100003: [{ key: "ship_date", label: "Ship Date", required: false, type: "date", placeholder: "2024-01-01" }],
  100005: [{ key: "postal_code", label: "Postal Code", required: false, type: "text", placeholder: "Postal code" }],
  100010: [{ key: "postal_code", label: "Postal Code", required: false, type: "text", placeholder: "Postcode" }],
  100017: [{ key: "postal_code", label: "Postal Code", required: false, type: "text", placeholder: "Postal code" }],
  100024: [{ key: "postal_code", label: "Postal Code", required: false, type: "text", placeholder: "Postal code" }],
  100026: [{ key: "postal_code", label: "Postal Code", required: false, type: "text", placeholder: "1000 AA" }],
  100027: [{ key: "postal_code", label: "Postal Code", required: false, type: "text", placeholder: "12345" }],
  100060: [{ key: "number_type", label: "Number Type", required: false, type: "select", placeholder: "1", options: [{ value: "1", label: "AWB" }, { value: "2", label: "Order Id" }, { value: "3", label: "LRN" }] }],
  100074: [{ key: "phone_number_last_4", label: "Phone Number (last 4 digits)", required: true, type: "text", placeholder: "8888" }],
  100078: [{ key: "postal_code", label: "Postal Code", required: false, type: "text", placeholder: "1000" }],
  100086: [{ key: "phone_number_last_4", label: "Phone Number (last 4 digits)", required: true, type: "text", placeholder: "88888" }],
  100155: [{ key: "postal_code", label: "Postal Code", required: false, type: "text", placeholder: "1000" }],
  100167: [{ key: "postal_code", label: "Postal Code", required: true, type: "text", placeholder: "LS27 0BN" }],
  100189: [{ key: "postal_code", label: "Postal Code", required: true, type: "text", placeholder: "123456" }],
  100207: [{ key: "postal_code", label: "Postal Code", required: false, type: "text", placeholder: "Postal code" }],
  100221: [{ key: "number_type", label: "Number Type", required: false, type: "select", placeholder: "1", options: [{ value: "1", label: "PRO Number" }, { value: "2", label: "BOL Number" }, { value: "3", label: "Purchase Order Number" }] }],
  100268: [
    { key: "number_type", label: "Number Type", required: false, type: "select", placeholder: "5", options: [{ value: "5", label: "Track Bar Code" }] },
    { key: "parameter", label: "Parameter", required: false, type: "text", placeholder: "1000000" },
  ],
};

function CarrierSelect({ value, onChange, customCouriers = [] }: {
  value: string;
  onChange: (carrier: string, trackingUrlTemplate?: string | null) => void;
  customCouriers?: CustomCourier[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const standardFiltered = search.trim()
    ? CARRIERS_17TRACK.filter(c => c.label.toLowerCase().includes(search.toLowerCase()))
    : CARRIERS_17TRACK;
  const customFiltered = search.trim()
    ? customCouriers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : customCouriers;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full h-9 px-2.5 text-sm rounded-lg border border-input bg-background flex items-center justify-between gap-1 hover:border-blue-400 transition-colors"
      >
        <span className="truncate">{value || "Auto Detect"}</span>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 w-72 bg-background border border-border rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="flex items-center gap-1.5 h-7 px-2 rounded-lg bg-muted/60">
              <Search className="w-3 h-3 text-muted-foreground shrink-0" />
              <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search carriers..." className="flex-1 text-xs bg-transparent outline-none" />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto text-sm">
            <button type="button" onMouseDown={() => { onChange("Auto Detect", null); setOpen(false); setSearch(""); }} className="w-full text-left px-3 py-2 text-xs hover:bg-muted/50 font-medium">Auto Detect</button>
            {customFiltered.length > 0 && (
              <>
                <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/30">Custom Couriers</p>
                {customFiltered.map(c => (
                  <button key={c.id} type="button" onMouseDown={() => { onChange(c.name, c.trackingUrlTemplate); setOpen(false); setSearch(""); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50">
                    {c.name}
                  </button>
                ))}
              </>
            )}
            {standardFiltered.length > 0 && (
              <>
                <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/30">17track Carriers</p>
                {standardFiltered.map(c => (
                  <button key={c.code} type="button" onMouseDown={() => { onChange(c.label, null); setOpen(false); setSearch(""); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50">
                    {c.label}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Types for Parcels ────────────────────────────────────────
interface ParcelItem { name: string; qty: number; productId?: string }
interface ParcelEvent { date: string; status: string; location: string }
interface GbParcel {
  id: string;
  groupBuyId: string;
  label: string;
  carrier: string;
  trackingNumber: string;
  status: string;
  statusCode: number | null;
  items: ParcelItem[];
  cachedEvents: ParcelEvent[];
  notes: string | null;
  trackingUrl: string | null;
  trackingParams?: Record<string, string>;
  lastChecked: string | null;
  createdAt: string;
}

const PARCEL_STATUS_STYLES: Record<string, { label: string; color: string; bg: string; Icon: React.FC<{className?: string}> }> = {
  pending:          { label: "Pending",          color: "#6B7280", bg: "rgba(107,114,128,0.1)",  Icon: Clock },
  in_transit:       { label: "In Transit",       color: "#0891B2", bg: "rgba(8,145,178,0.1)",   Icon: Navigation },
  out_for_delivery: { label: "Out for Delivery", color: "#D97706", bg: "rgba(217,119,6,0.1)",   Icon: Truck },
  attempted:        { label: "Attempted",        color: "#9333EA", bg: "rgba(147,51,234,0.1)",  Icon: AlertCircle },
  delivered:        { label: "Delivered",        color: "#16A34A", bg: "rgba(22,163,74,0.1)",   Icon: CheckCircle2 },
  exception:        { label: "Exception",        color: "#DC2626", bg: "rgba(220,38,38,0.1)",   Icon: AlertCircle },
  expired:          { label: "Expired",          color: "#6B7280", bg: "rgba(107,114,128,0.1)", Icon: Clock },
};

function ParcelStatusBadge({ status }: { status: string }) {
  const s = PARCEL_STATUS_STYLES[status] ?? PARCEL_STATUS_STYLES.pending;
  const { Icon } = s;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.color }}>
      <Icon className="w-3 h-3" />
      {s.label}
    </span>
  );
}

// ─── Parcel Form (create / edit) ──────────────────────────────
function ParcelForm({ secret, gbId, initial, catalogProducts, onSave, onCancel }: {
  secret: string;
  gbId: string;
  initial?: GbParcel;
  catalogProducts: Product[];
  onSave: (p: GbParcel) => void;
  onCancel: () => void;
}) {
  const isCreate = !initial;
  const [label, setLabel] = useState(initial?.label ?? "");
  const [carrier, setCarrier] = useState(() => {
    const c = initial?.carrier ?? "Auto Detect";
    // Normalise legacy "Auto" value
    return c === "Auto" ? "Auto Detect" : c;
  });
  const [trackingNumber, setTrackingNumber] = useState(initial?.trackingNumber ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [trackingUrl, setTrackingUrl] = useState(initial?.trackingUrl ?? "");
  const [trackingParams, setTrackingParams] = useState<Record<string, string>>(initial?.trackingParams ?? {});
  const [items, setItems] = useState<ParcelItem[]>(initial?.items ?? []);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [customCouriers, setCustomCouriers] = useState<CustomCourier[]>([]);
  // Stores the active custom courier tracking URL template (null if none / standard carrier selected)
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);

  useEffect(() => {
    fetch(apiUrl("/admin/couriers"), { headers: { "x-admin-secret": secret } })
      .then(r => r.ok ? r.json() : [])
      .then((data: CustomCourier[]) => setCustomCouriers(data))
      .catch(() => {});
  }, [secret]);

  // Derive the carrier code + required param specs for the currently selected carrier
  const carrierEntry = CARRIERS_17TRACK.find(c => c.label === carrier);
  const currentParamSpecs: ParamSpec[] = carrierEntry ? (CARRIER_PARAMS[carrierEntry.code] ?? []) : [];

  const setParam = (key: string, value: string) =>
    setTrackingParams(prev => ({ ...prev, [key]: value }));

  // Reactively update tracking URL when tracking number changes and a template is active
  useEffect(() => {
    if (activeTemplate && trackingNumber.trim()) {
      setTrackingUrl(activeTemplate.replace(/\{tracking_number\}/gi, trackingNumber.trim()));
    }
  }, [trackingNumber, activeTemplate]);

  // When carrier changes, clear params that don't apply to the new carrier.
  // If a custom courier with a tracking URL template is selected, store the template
  // and immediately interpolate the current tracking number into the URL.
  const handleCarrierChange = (newCarrier: string, trackingUrlTemplate?: string | null) => {
    setCarrier(newCarrier);
    const newEntry = CARRIERS_17TRACK.find(c => c.label === newCarrier);
    const newSpecs = newEntry ? (CARRIER_PARAMS[newEntry.code] ?? []) : [];
    const validKeys = new Set(newSpecs.map(s => s.key));
    setTrackingParams(prev => {
      const filtered: Record<string, string> = {};
      for (const [k, v] of Object.entries(prev)) {
        if (validKeys.has(k)) filtered[k] = v;
      }
      return filtered;
    });
    if (trackingUrlTemplate !== undefined && trackingUrlTemplate !== null) {
      setActiveTemplate(trackingUrlTemplate);
      const interpolated = trackingNumber.trim()
        ? trackingUrlTemplate.replace(/\{tracking_number\}/gi, trackingNumber.trim())
        : trackingUrlTemplate;
      setTrackingUrl(interpolated);
    } else {
      setActiveTemplate(null);
    }
  };

  // Item entry state
  const [itemMode, setItemMode] = useState<"catalogue" | "custom" | "paste">("catalogue");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [customItemName, setCustomItemName] = useState("");
  const [itemQty, setItemQty] = useState("1");
  const [pasteText, setPasteText] = useState("");

  const addItem = () => {
    const qty = Math.max(1, parseInt(itemQty) || 1);
    if (itemMode === "catalogue") {
      const prod = catalogProducts.find(p => p.id === selectedProductId);
      if (!prod) return;
      setItems(prev => {
        const existing = prev.findIndex(i => i.productId === prod.id);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = { ...updated[existing], qty: updated[existing].qty + qty };
          return updated;
        }
        return [...prev, { name: prod.name, qty, productId: prod.id }];
      });
      setSelectedProductId("");
    } else {
      const name = customItemName.trim();
      if (!name) return;
      setItems(prev => {
        const existing = prev.findIndex(i => !i.productId && i.name.toLowerCase() === name.toLowerCase());
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = { ...updated[existing], qty: updated[existing].qty + qty };
          return updated;
        }
        return [...prev, { name, qty }];
      });
      setCustomItemName("");
    }
    setItemQty("1");
  };

  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));
  const updateItemQty = (idx: number, qty: number) => {
    if (qty < 1) { removeItem(idx); return; }
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, qty } : it));
  };

  const parsePaste = () => {
    const lines = pasteText.split(/\n+/).map(l => l.trim()).filter(Boolean);
    const toAdd: ParcelItem[] = [];
    for (const line of lines) {
      let namePart = line.replace(/^\d+\.\s+/, "").trim();
      let qty = 1;
      const prefixM = namePart.match(/^(\d+)\s*[xX×]\s+(.+)$/);
      const suffixM = namePart.match(/^(.+)\s+[xX×]\s*(\d+)$/);
      if (prefixM) { qty = Math.max(1, parseInt(prefixM[1])); namePart = prefixM[2].trim(); }
      else if (suffixM) { qty = Math.max(1, parseInt(suffixM[2])); namePart = suffixM[1].trim(); }
      if (!namePart) continue;
      const lower = namePart.toLowerCase();
      const matched = catalogProducts.find(p => p.name.toLowerCase() === lower)
        ?? catalogProducts.find(p => p.name.toLowerCase().includes(lower))
        ?? catalogProducts.find(p => lower.includes(p.name.toLowerCase()));
      toAdd.push(matched ? { name: matched.name, qty, productId: matched.id } : { name: namePart, qty });
    }
    setItems(prev => {
      let updated = [...prev];
      for (const item of toAdd) {
        const key = item.productId;
        const existing = key
          ? updated.findIndex(i => i.productId === key)
          : updated.findIndex(i => !i.productId && i.name.toLowerCase() === item.name.toLowerCase());
        if (existing >= 0) updated[existing] = { ...updated[existing], qty: updated[existing].qty + item.qty };
        else updated.push(item);
      }
      return updated;
    });
    setPasteText("");
    setItemMode("catalogue");
  };

  const handleSave = async () => {
    setError("");
    if (!label.trim()) { setError("Label is required"); return; }
    if (!trackingNumber.trim()) { setError("Tracking number is required"); return; }
    // Validate required carrier params
    for (const spec of currentParamSpecs) {
      if (spec.required && !trackingParams[spec.key]?.trim()) {
        setError(`${spec.label} is required for ${carrier}`);
        return;
      }
    }

    // Flush any pending (uncommitted) item selection so it isn't silently dropped
    let finalItems = [...items];
    const pendingQty = Math.max(1, parseInt(itemQty) || 1);
    if (itemMode === "catalogue" && selectedProductId) {
      const prod = catalogProducts.find(p => p.id === selectedProductId);
      if (prod) {
        const idx = finalItems.findIndex(i => i.productId === prod.id);
        if (idx >= 0) {
          finalItems = finalItems.map((it, i) => i === idx ? { ...it, qty: it.qty + pendingQty } : it);
        } else {
          finalItems = [...finalItems, { name: prod.name, qty: pendingQty, productId: prod.id }];
        }
      }
    } else if (itemMode === "custom") {
      const pendingName = customItemName.trim();
      if (pendingName) {
        const idx = finalItems.findIndex(i => !i.productId && i.name.toLowerCase() === pendingName.toLowerCase());
        if (idx >= 0) {
          finalItems = finalItems.map((it, i) => i === idx ? { ...it, qty: it.qty + pendingQty } : it);
        } else {
          finalItems = [...finalItems, { name: pendingName, qty: pendingQty }];
        }
      }
    }

    setSaving(true);
    try {
      const url = isCreate
        ? `/api/admin/group-buys/${gbId}/parcels`
        : `/api/admin/group-buys/${gbId}/parcels/${initial!.id}`;
      const method = isCreate ? "POST" : "PATCH";
      // Only send non-empty params
      const cleanParams: Record<string, string> = {};
      for (const [k, v] of Object.entries(trackingParams)) {
        if (v.trim()) cleanParams[k] = v.trim();
      }
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({
          label: label.trim(),
          carrier: carrier.trim(),
          trackingNumber: trackingNumber.trim(),
          items: finalItems,
          notes: notes.trim() || null,
          trackingUrl: trackingUrl.trim() || null,
          trackingParams: Object.keys(cleanParams).length > 0 ? cleanParams : null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({})) as { error?: string };
        setError(j.error ?? "Failed to save");
        return;
      }
      const parcel = await res.json() as GbParcel;
      onSave(parcel);
    } catch { setError("Network error"); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Label *</Label>
          <Input placeholder="e.g. Batch A — UK members" value={label} onChange={e => setLabel(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Tracking Number *</Label>
          <Input placeholder="GB12345678UK" value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Carrier</Label>
          <CarrierSelect value={carrier} onChange={handleCarrierChange} customCouriers={customCouriers} />
        </div>
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Custom Tracking URL <span className="text-muted-foreground font-normal">(for carriers not on 17track)</span></Label>
          <Input placeholder="https://gly-express.com/track?n=…" value={trackingUrl} onChange={e => setTrackingUrl(e.target.value)} />
        </div>
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Notes (internal only)</Label>
          <Input placeholder="Optional internal notes" value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
      </div>

      {/* Carrier-specific params */}
      {currentParamSpecs.length > 0 && (
        <div className="space-y-2 rounded-lg border border-teal-200 bg-teal-50/50 dark:border-teal-900 dark:bg-teal-950/30 p-3">
          <p className="text-xs font-semibold text-teal-700 dark:text-teal-400">
            {carrier} tracking parameters
          </p>
          <div className="grid grid-cols-2 gap-3">
            {currentParamSpecs.map(spec => (
              <div key={spec.key} className={cn("space-y-1", currentParamSpecs.length === 1 && "col-span-2")}>
                <Label className="text-xs">
                  {spec.label}
                  {spec.required ? <span className="text-red-500 ml-0.5">*</span> : <span className="text-muted-foreground ml-1 font-normal">(optional)</span>}
                </Label>
                {spec.type === "select" && spec.options ? (
                  <select
                    value={trackingParams[spec.key] ?? ""}
                    onChange={e => setParam(spec.key, e.target.value)}
                    className="w-full h-9 px-2 text-sm border border-input rounded-md bg-background"
                  >
                    <option value="">Select…</option>
                    {spec.options.map(o => (
                      <option key={o.value} value={o.value}>{o.value} — {o.label}</option>
                    ))}
                  </select>
                ) : (
                  <Input
                    type={spec.type === "date" ? "date" : "text"}
                    placeholder={spec.placeholder}
                    value={trackingParams[spec.key] ?? ""}
                    onChange={e => setParam(spec.key, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Items */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Items in this parcel</Label>

        {/* Mode toggle */}
        <div className="flex gap-1 border rounded-lg p-0.5 w-fit">
          {(["catalogue", "custom", "paste"] as const).map(mode => (
            <button key={mode}
              onClick={() => setItemMode(mode)}
              className={cn(
                "text-xs px-3 py-1 rounded-md font-medium transition-colors",
                itemMode === mode ? "bg-orange-500 text-white" : "text-muted-foreground hover:text-foreground"
              )}>
              {mode === "catalogue" ? "From Catalogue" : mode === "custom" ? "Custom" : "Paste List"}
            </button>
          ))}
        </div>

        {itemMode === "paste" ? (
          <div className="space-y-2">
            <textarea
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
              rows={5}
              placeholder={"Paste items here, one per line:\nBPC-157 5mg\nSemaglutide 1mg\n2x TB-500 2mg"}
              className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button onClick={parsePaste} disabled={!pasteText.trim()} size="sm" className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Import Items
            </Button>
          </div>
        ) : (
          <div className="flex gap-2 items-end">
            {itemMode === "catalogue" ? (
              <div className="flex-1 space-y-1">
                <select
                  value={selectedProductId}
                  onChange={e => setSelectedProductId(e.target.value)}
                  className="w-full h-9 px-2 text-sm border border-input rounded-md bg-background"
                >
                  <option value="">Select product…</option>
                  {catalogProducts.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex-1 space-y-1">
                <Input placeholder="Item name" value={customItemName} onChange={e => setCustomItemName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addItem()} />
              </div>
            )}
            <div className="w-16">
              <Input type="number" min="1" value={itemQty} onChange={e => setItemQty(e.target.value)} className="text-center" />
            </div>
            <Button variant="outline" size="icon" onClick={addItem}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        )}

        {items.length > 0 ? (
          <div className="space-y-1.5 mt-1">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 text-sm">
                <Box className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="flex-1 font-medium truncate">{item.name}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => updateItemQty(idx, item.qty - 1)}
                    className="w-5 h-5 rounded text-muted-foreground hover:bg-muted flex items-center justify-center text-xs">−</button>
                  <span className="w-6 text-center text-xs font-bold">{item.qty}</span>
                  <button onClick={() => updateItemQty(idx, item.qty + 1)}
                    className="w-5 h-5 rounded text-muted-foreground hover:bg-muted flex items-center justify-center text-xs">+</button>
                </div>
                <button onClick={() => removeItem(idx)} className="text-muted-foreground hover:text-red-500 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground py-2">No items added yet.</p>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button className="flex-1 gap-1.5" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isCreate ? "Add Parcel" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

// ─── Manual status editor ─────────────────────────────────────
const GB_PARCEL_STATUSES_LIST = [
  "pending", "in_transit", "out_for_delivery", "attempted", "delivered", "exception", "expired",
] as const;

function ManualStatusEditor({ secret, gbId, parcel, onSave, onCancel }: {
  secret: string; gbId: string; parcel: GbParcel;
  onSave: (p: GbParcel) => void; onCancel: () => void;
}) {
  const [status, setStatus] = useState(parcel.status);
  const [events, setEvents] = useState<ParcelEvent[]>(parcel.cachedEvents ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // New event form
  const today = new Date();
  const [newDate, setNewDate] = useState(() => `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`);
  const [newStatus, setNewStatus] = useState("");
  const [newLocation, setNewLocation] = useState("");

  function parseDMY(s: string): Date | null {
    const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return null;
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    if (isNaN(d.getTime())) return null;
    return d;
  }

  const addEvent = () => {
    if (!newStatus.trim()) return;
    const parsed = parseDMY(newDate);
    const ev: ParcelEvent = { date: (parsed ?? new Date()).toISOString(), status: newStatus.trim(), location: newLocation.trim() };
    setEvents(prev => [ev, ...prev]);
    setNewStatus(""); setNewLocation("");
  };

  const removeEvent = (i: number) => setEvents(prev => prev.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/admin/group-buys/${gbId}/parcels/${parcel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ status, cachedEvents: events }),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})) as any; setError(j.error ?? "Failed"); return; }
      onSave(await res.json() as GbParcel);
    } catch { setError("Network error"); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="font-semibold text-sm">Set Status — {parcel.label}</h3>
      </div>
      <Card className="p-4 space-y-4">
        {/* Status picker */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Overall Status</label>
          <div className="flex flex-wrap gap-2">
            {GB_PARCEL_STATUSES_LIST.map(s => {
              const st = PARCEL_STATUS_STYLES[s] ?? PARCEL_STATUS_STYLES.pending;
              return (
                <button key={s} type="button"
                  onClick={() => setStatus(s)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-semibold border transition-all",
                    status === s ? "ring-2 ring-offset-1" : "opacity-60 hover:opacity-100"
                  )}
                  style={{ background: status === s ? st.bg : "transparent", color: st.color, borderColor: st.color }}
                >
                  {st.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Add event */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Add Tracking Event</label>
          <div className="grid grid-cols-2 gap-2">
            <input type="text" inputMode="numeric" value={newDate} onChange={e => setNewDate(e.target.value)}
              placeholder="DD/MM/YYYY"
              className="col-span-2 px-3 py-1.5 text-xs border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground" />
            <input placeholder="Status description" value={newStatus} onChange={e => setNewStatus(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addEvent()}
              className="col-span-2 px-3 py-1.5 text-xs border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground" />
            <input placeholder="Location (optional)" value={newLocation} onChange={e => setNewLocation(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addEvent()}
              className="px-3 py-1.5 text-xs border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground" />
            <Button type="button" size="sm" onClick={addEvent} disabled={!newStatus.trim()} className="h-8 text-xs">
              <Plus className="w-3 h-3 mr-1" /> Add Event
            </Button>
          </div>
        </div>

        {/* Event list */}
        {events.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Events ({events.length})</label>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {events.map((ev, i) => (
                <div key={i} className="flex items-start gap-2 text-xs p-2 rounded-md bg-muted/30 border border-border">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{ev.status}</p>
                    <p className="text-muted-foreground">{ev.location && `${ev.location} · `}{new Date(ev.date).toLocaleString()}</p>
                  </div>
                  <button onClick={() => removeEvent(i)} className="text-muted-foreground hover:text-red-500 shrink-0 mt-0.5">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-2 pt-1">
          <Button onClick={handleSave} disabled={saving} className="flex-1 bg-orange-600 hover:bg-orange-700 text-white">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
            Save Status
          </Button>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </Card>
    </div>
  );
}

// ─── Parcels sub-tab ──────────────────────────────────────────
function ParcelsSubTab({ secret, gb }: { secret: string; gb: GroupBuy }) {
  const [parcels, setParcels] = useState<GbParcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [view, setView] = useState<"list" | "create" | { edit: GbParcel } | { manual: GbParcel }>("list");
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});

  const loadParcels = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/group-buys/${gb.id}/parcels`, { headers: { "x-admin-secret": secret } });
      if (res.ok) setParcels(await res.json() as GbParcel[]);
    } finally { setLoading(false); }
  }, [gb.id, secret]);

  const loadCatalog = useCallback(async () => {
    const res = await fetch(`/api/admin/group-buys/${gb.id}/products-catalog`, { headers: { "x-admin-secret": secret } });
    if (res.ok) setCatalogProducts(await res.json() as Product[]);
  }, [gb.id, secret]);

  useEffect(() => { loadParcels(); loadCatalog(); }, [loadParcels, loadCatalog]);

  const handleRefresh = async (parcel: GbParcel) => {
    setRefreshing(parcel.id);
    try {
      const res = await fetch(`/api/admin/group-buys/${gb.id}/parcels/${parcel.id}/refresh`, {
        method: "POST",
        headers: { "x-admin-secret": secret },
      });
      const data = await res.json().catch(() => ({})) as Record<string, unknown>;
      if (res.ok) {
        const { _refreshWarning, ...parcelData } = data;
        setParcels(prev => prev.map(p => p.id === parcel.id ? parcelData as unknown as GbParcel : p));
        if (_refreshWarning) {
          alert(`⚠️ ${_refreshWarning}`);
        }
      } else {
        alert(`Refresh failed (${res.status}): ${data?.error ?? "Unknown error"}`);
      }
    } catch (e: any) {
      alert(`Network error: ${e?.message ?? "Unknown"}`);
    } finally { setRefreshing(null); }
  };

  const handleDelete = async (parcel: GbParcel) => {
    if (!confirm(`Delete parcel "${parcel.label}"?`)) return;
    setDeleting(parcel.id);
    try {
      await fetch(`/api/admin/group-buys/${gb.id}/parcels/${parcel.id}`, {
        method: "DELETE",
        headers: { "x-admin-secret": secret },
      });
      setParcels(prev => prev.filter(p => p.id !== parcel.id));
    } finally { setDeleting(null); }
  };

  const toggleEvents = (id: string) => setExpandedEvents(prev => ({ ...prev, [id]: !prev[id] }));

  if (typeof view === "object" && "manual" in view) {
    return (
      <ManualStatusEditor
        secret={secret}
        gbId={gb.id}
        parcel={view.manual}
        onSave={updated => { setParcels(prev => prev.map(p => p.id === updated.id ? updated : p)); setView("list"); }}
        onCancel={() => setView("list")}
      />
    );
  }

  if (view === "create" || (typeof view === "object" && "edit" in view)) {
    const initial = typeof view === "object" && "edit" in view ? view.edit : undefined;
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setView("list")} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="font-semibold text-sm">{initial ? "Edit Parcel" : "Add Parcel"}</h3>
        </div>
        <Card className="p-4">
          <ParcelForm
            secret={secret}
            gbId={gb.id}
            initial={initial}
            catalogProducts={catalogProducts}
            onSave={parcel => {
              setParcels(prev =>
                initial
                  ? prev.map(p => p.id === parcel.id ? parcel : p)
                  : [...prev, parcel]
              );
              setView("list");
            }}
            onCancel={() => setView("list")}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Parcels</h3>
          <p className="text-xs text-muted-foreground">Tracking numbers and contents, masked for customers</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={loadParcels} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
          <Button className="gap-1.5 text-xs h-8" onClick={() => setView("create")}>
            <Plus className="w-3.5 h-3.5" />
            Add Parcel
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : parcels.length === 0 ? (
        <Card className="p-8 text-center">
          <Package className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-40" />
          <p className="text-sm text-muted-foreground">No parcels yet. Add tracking info for this group buy.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {parcels.map(parcel => {
            const events = parcel.cachedEvents ?? [];
            const showEvents = expandedEvents[parcel.id];
            return (
              <Card key={parcel.id} className="overflow-hidden">
                <div className="p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm truncate">{parcel.label}</span>
                        <ParcelStatusBadge status={parcel.status} />
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-muted-foreground">{parcel.carrier}</span>
                        <span className="font-mono text-xs text-orange-500 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded select-all">
                          {parcel.trackingNumber}
                        </span>
                        <button
                          onClick={() => navigator.clipboard.writeText(parcel.trackingNumber)}
                          className="text-muted-foreground hover:text-orange-500 transition-colors"
                          title="Copy tracking number"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        {parcel.trackingUrl && (
                          <a
                            href={parcel.trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 hover:underline"
                            title="Open carrier tracking page"
                          >
                            <Globe className="w-3 h-3" />
                            Track
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="outline" size="icon" className="h-7 w-7"
                        onClick={() => handleRefresh(parcel)} disabled={refreshing === parcel.id}
                        title="Refresh from 17track">
                        <RefreshCw className={cn("w-3.5 h-3.5", refreshing === parcel.id && "animate-spin")} />
                      </Button>
                      <Button variant="outline" size="icon" className="h-7 w-7 text-teal-600 hover:bg-teal-50"
                        onClick={() => setView({ manual: parcel })}
                        title="Set status manually">
                        <MapPin className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-7 w-7"
                        onClick={() => setView({ edit: parcel })}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50"
                        onClick={() => handleDelete(parcel)} disabled={deleting === parcel.id}>
                        {deleting === parcel.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  </div>

                  {/* Items — show a compact count only to avoid exposing product names on the card */}
                  {parcel.items.length > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 w-fit">
                      <Box className="w-3 h-3" />
                      {parcel.items.reduce((s, it) => s + it.qty, 0)}&nbsp;item{parcel.items.reduce((s, it) => s + it.qty, 0) !== 1 ? "s" : ""}
                    </span>
                  )}

                  {/* Last checked */}
                  {parcel.lastChecked && (
                    <p className="text-[11px] text-muted-foreground">
                      Last checked: {new Date(parcel.lastChecked).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}

                  {/* Events toggle */}
                  {events.length > 0 && (
                    <button
                      onClick={() => toggleEvents(parcel.id)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showEvents ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      {showEvents ? "Hide" : "Show"} {events.length} tracking event{events.length !== 1 ? "s" : ""}
                    </button>
                  )}

                  {showEvents && (
                    <div className="relative ml-2 pl-3 border-l-2 border-muted space-y-2 mt-1">
                      {events.map((ev, i) => (
                        <div key={i} className="relative">
                          <div className="absolute -left-[17px] top-1 w-2 h-2 rounded-full bg-muted-foreground/30" />
                          <p className="text-xs font-medium text-foreground">{ev.status}</p>
                          <div className="flex gap-2 text-[11px] text-muted-foreground">
                            {ev.date && <span>{new Date(ev.date).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>}
                            {ev.location && (
                              <span className="flex items-center gap-0.5">
                                <MapPin className="w-2.5 h-2.5" />{ev.location}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Waitlist Sub-Tab ─────────────────────────────────────────
interface WaitlistEntry { id: string; accountId: string; joinedAt: string; notifiedAt: string | null; hasPassword: boolean }

function WaitlistSubTab({ secret, gb }: { secret: string; gb: GroupBuy }) {
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
interface MemberPayment {
  accountId: string;
  joinedAt: string;
  tags: string[];
  orders: { id: string; code: string; status: string; paymentStatus: string; grandTotal: number; trackingNumber: string | null; refundStatus: string | null }[];
}

function PaymentStatusSubTab({ secret, gb }: { secret: string; gb: GroupBuy }) {
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
interface GbOrder {
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

interface GbOrderEdit {
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

const ORDER_STATUSES = ["Draft", "Submitted", "Processing", "Shipped", "Completed", "Cancelled"];
const PAYMENT_STATUSES = ["unpaid", "test_ready", "test_confirmed", "pending_confirmation", "confirmed", "failed", "rejected"];

const ORDER_STATUS_COLORS: Record<string, string> = {
  Draft: "text-slate-500 bg-slate-50 border-slate-200",
  Submitted: "text-blue-600 bg-blue-50 border-blue-200",
  Processing: "text-amber-600 bg-amber-50 border-amber-200",
  Shipped: "text-violet-600 bg-violet-50 border-violet-200",
  Completed: "text-green-600 bg-green-50 border-green-200",
  Cancelled: "text-red-500 bg-red-50 border-red-200",
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  confirmed: "text-green-600 bg-green-50 border-green-200",
  pending_confirmation: "text-amber-600 bg-amber-50 border-amber-200",
  unpaid: "text-slate-500 bg-slate-50 border-slate-200",
  failed: "text-red-600 bg-red-50 border-red-200",
  rejected: "text-red-600 bg-red-50 border-red-200",
  test_ready: "text-blue-600 bg-blue-50 border-blue-200",
  test_confirmed: "text-blue-600 bg-blue-50 border-blue-200",
};

function exportGbOrdersCsv(orders: GbOrder[], gb: { name: string; currency: string }) {
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
function downloadGbImportTemplate(gbName: string) {
  const header = ["telegramUsername", "status", "shippingAmount", "adminNotes", "items"];
  const example = ["@username", "Submitted", "0.00", "Admin note", "BPC-157 x2 @12.50; TB-500 x1 @25.00"];
  const csv = [header, example].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url;
  a.download = `${gbName.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_import_template.csv`; a.click();
  URL.revokeObjectURL(url);
}
function splitGbCsvRow(row: string): string[] {
  const result: string[] = []; let cur = ""; let inQ = false;
  for (let i = 0; i < row.length; i++) {
    const c = row[i];
    if (c === '"') { if (inQ && row[i + 1] === '"') { cur += '"'; i++; } else { inQ = !inQ; } }
    else if (c === ',' && !inQ) { result.push(cur); cur = ""; }
    else { cur += c; }
  }
  result.push(cur); return result;
}
function parseGbCsvText(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = splitGbCsvRow(lines[0]).map(h => h.trim());
  return lines.slice(1).map(line => {
    const vals = splitGbCsvRow(line);
    return Object.fromEntries(headers.map((h, i) => [h, (vals[i] ?? "").trim()]));
  });
}
function parseGbImportItems(items: string): { productName: string; quantity: number; unitPrice: number; isCustom: boolean }[] {
  if (!items.trim()) return [];
  return items.split(";").map(s => s.trim()).filter(Boolean).flatMap(item => {
    const m = item.match(/^(.+?)\s+x(\d+(?:\.\d+)?)\s*(?:@([\d.]+))?$/i);
    if (!m) return [{ productName: item.trim(), quantity: 1, unitPrice: 0, isCustom: true }];
    return [{ productName: m[1].trim(), quantity: parseFloat(m[2]), unitPrice: parseFloat(m[3] ?? "0"), isCustom: true }];
  });
}

function OrdersSubTab({ secret, gb }: { secret: string; gb: GroupBuy }) {
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

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Input placeholder="Search username, code, TXID, notes…" value={search} onChange={e => setSearch(e.target.value)} className="flex-1 min-w-48" />
        {/* Order date range filter */}
        <div className="flex items-center gap-1.5 rounded-lg border border-input bg-background px-2.5 h-8 text-xs">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">Order</span>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="text-xs bg-transparent focus:outline-none w-28"
            title="Order date from"
          />
          <span className="text-muted-foreground">–</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="text-xs bg-transparent focus:outline-none w-28"
            title="Order date to"
          />
          {(dateFrom || dateTo) && (
            <button type="button" onClick={() => { setDateFrom(""); setDateTo(""); }} className="text-muted-foreground hover:text-foreground">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        {/* Payment date range filter */}
        <div className="flex items-center gap-1.5 rounded-lg border border-input bg-background px-2.5 h-8 text-xs">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">Paid</span>
          <input
            type="date"
            value={payDateFrom}
            onChange={e => setPayDateFrom(e.target.value)}
            className="text-xs bg-transparent focus:outline-none w-28"
            title="Payment date from"
          />
          <span className="text-muted-foreground">–</span>
          <input
            type="date"
            value={payDateTo}
            onChange={e => setPayDateTo(e.target.value)}
            className="text-xs bg-transparent focus:outline-none w-28"
            title="Payment date to"
          />
          {(payDateFrom || payDateTo) && (
            <button type="button" onClick={() => { setPayDateFrom(""); setPayDateTo(""); }} className="text-muted-foreground hover:text-foreground">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        {/* Sort */}
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
        <span className="text-xs text-muted-foreground whitespace-nowrap">{filtered.length} order{filtered.length !== 1 ? "s" : ""}</span>
        {filtered.length > 0 && (
          <button onClick={() => exportGbOrdersCsv(filtered, gb)} className="h-8 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors hover:bg-muted/50" style={{ color: "#475569" }}>
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        )}
        <button onClick={() => downloadGbImportTemplate(gb.name)} className="h-8 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors hover:bg-muted/50" style={{ color: "#475569" }}>
          <FileText className="w-3.5 h-3.5" /> Template
        </button>
        <button onClick={() => importRef.current?.click()} disabled={importing} className="h-8 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors hover:bg-muted/50 disabled:opacity-60" style={{ color: "#475569" }}>
          {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} Import CSV
        </button>
        <input ref={importRef} type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImportCsv(f); e.target.value = ""; }} />
        <button
          onClick={() => { setShowCreateForm(p => !p); setCreateMsg(""); }}
          className="h-8 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors hover:bg-primary/10"
          style={{ color: "#2D6BCC", borderColor: "#2D6BCC55", background: showCreateForm ? "rgba(45,107,204,0.1)" : "transparent" }}
        >
          <Plus className="w-3.5 h-3.5" /> New Order
        </button>
        {gb.countryLegsEnabled && legs.length > 0 && (
          <button
            onClick={async () => {
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
            className="h-8 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors hover:bg-muted/50 disabled:opacity-60"
            style={{ color: "#2D6BCC" }}
          >
            {backfilling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
            Assign Legs
          </button>
        )}
        {gb.adminFeeEnabled && gb.adminFeeAmount != null && Number(gb.adminFeeAmount) > 0 && (
          <button
            onClick={async () => {
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
            className="h-8 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors hover:bg-amber-50 disabled:opacity-60"
            style={{ color: "#B45309", borderColor: "#FCD34D" }}
          >
            {backfilling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span className="text-sm leading-none">💰</span>}
            Backfill Fee
          </button>
        )}
      </div>
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
      <div className="flex gap-1.5 flex-wrap">
        {([
          { value: "all", label: "All Methods" },
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
              style={{
                background: active ? (t.value === "all" ? "#475569" : (t as any).color) : "transparent",
                color: active ? "#fff" : t.value === "all" ? "#64748B" : (t as any).color,
                borderColor: active ? "transparent" : t.value === "all" ? "#E2E8F0" : (t as any).color + "55",
              }}>
              {t.label}
              <span className="text-[10px] font-bold px-1 py-0.5 rounded-full" style={{ background: active ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.07)" }}>{count}</span>
            </button>
          );
        })}
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {([
          { value: "all",          label: "All Statuses",   color: "#475569" },
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
              style={{
                background: active ? t.color : "transparent",
                color: active ? "#fff" : t.color,
                borderColor: active ? "transparent" : t.color + "55",
              }}>
              {t.label}
              <span className="text-[10px] font-bold px-1 py-0.5 rounded-full" style={{ background: active ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.07)" }}>{count}</span>
            </button>
          );
        })}
        {(() => {
          const noVsCount = orders.filter(o => o.vendorShipping === 0 || o.vendorShipping == null).length;
          return (
            <button
              onClick={() => setNoVsFilter(p => !p)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border"
              style={{ background: noVsFilter ? "#0D9488" : "transparent", color: noVsFilter ? "#fff" : "#0D9488", borderColor: noVsFilter ? "transparent" : "#0D948855" }}
            >
              No VS
              <span className="text-[10px] font-bold px-1 py-0.5 rounded-full" style={{ background: noVsFilter ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.07)" }}>{noVsCount}</span>
            </button>
          );
        })()}
        {(() => {
          const owedCount = orders.filter(o => (o.amountDue ?? 0) > 0 && o.balancePaymentStatus !== "confirmed").length;
          const paidCount = orders.filter(o => o.balancePaymentStatus === "confirmed").length;
          return (
            <>
              <button onClick={() => setBalanceFilter(f => f === "owed" ? "all" : "owed")}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border"
                style={{ background: balanceFilter === "owed" ? "#D97706" : "transparent", color: balanceFilter === "owed" ? "#fff" : "#D97706", borderColor: balanceFilter === "owed" ? "transparent" : "#D9770655" }}>
                Balance Owed
                <span className="text-[10px] font-bold px-1 py-0.5 rounded-full" style={{ background: balanceFilter === "owed" ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.07)" }}>{owedCount}</span>
              </button>
              <button onClick={() => setBalanceFilter(f => f === "paid" ? "all" : "paid")}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border"
                style={{ background: balanceFilter === "paid" ? "#16A34A" : "transparent", color: balanceFilter === "paid" ? "#fff" : "#16A34A", borderColor: balanceFilter === "paid" ? "transparent" : "#16A34A55" }}>
                Balance Paid
                <span className="text-[10px] font-bold px-1 py-0.5 rounded-full" style={{ background: balanceFilter === "paid" ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.07)" }}>{paidCount}</span>
              </button>
            </>
          );
        })()}
        {(() => {
          const dsCount = orders.filter(o => o.directShippingRequested).length;
          return (
            <button
              onClick={() => setDirectShippingFilter(p => !p)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border"
              style={{ background: directShippingFilter ? "#4F46E5" : "transparent", color: directShippingFilter ? "#fff" : "#4F46E5", borderColor: directShippingFilter ? "transparent" : "#4F46E555" }}
            >
              🏠 Direct Ship
              <span className="text-[10px] font-bold px-1 py-0.5 rounded-full" style={{ background: directShippingFilter ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.07)" }}>{dsCount}</span>
            </button>
          );
        })()}
        {(() => {
          const wsCount = orders.filter(o => o.isWholesale).length;
          return (
            <button
              onClick={() => setWholesaleFilter(p => !p)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border"
              style={{ background: wholesaleFilter ? "#0D9488" : "transparent", color: wholesaleFilter ? "#fff" : "#0D9488", borderColor: wholesaleFilter ? "transparent" : "#0D948855" }}
            >
              🏪 Wholesale
              <span className="text-[10px] font-bold px-1 py-0.5 rounded-full" style={{ background: wholesaleFilter ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.07)" }}>{wsCount}</span>
            </button>
          );
        })()}
      </div>
      {uniqueCountries.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setCountryFilter(new Set())}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border"
            style={{
              background: countryFilter.size === 0 ? "#475569" : "transparent",
              color: countryFilter.size === 0 ? "#fff" : "#64748B",
              borderColor: countryFilter.size === 0 ? "transparent" : "#E2E8F0",
            }}
          >
            All Countries
            <span className="text-[10px] font-bold px-1 py-0.5 rounded-full" style={{ background: countryFilter.size === 0 ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.07)" }}>{orders.length}</span>
          </button>
          {uniqueCountries.map(c => {
            const isActive = countryFilter.has(c);
            const count = orders.filter(o => (o.shippingCountry ?? "") === c).length;
            return (
              <button
                key={c}
                onClick={() => setCountryFilter(prev => {
                  const next = new Set(prev);
                  next.has(c) ? next.delete(c) : next.add(c);
                  return next;
                })}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border"
                style={{
                  background: isActive ? "#475569" : "transparent",
                  color: isActive ? "#fff" : "#64748B",
                  borderColor: isActive ? "transparent" : "#E2E8F0",
                }}
              >
                {resolveCountry(c)}
                <span className="text-[10px] font-bold px-1 py-0.5 rounded-full" style={{ background: isActive ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.07)" }}>{count}</span>
              </button>
            );
          })}
        </div>
      )}
      {gb.countryLegsEnabled && legs.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setCountryLegFilter("all")}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border"
            style={{
              background: countryLegFilter === "all" ? "#2D6BCC" : "transparent",
              color: countryLegFilter === "all" ? "#fff" : "#2D6BCC",
              borderColor: countryLegFilter === "all" ? "transparent" : "#2D6BCC55",
            }}
          >
            <Globe className="w-3 h-3" /> All Countries
            <span className="text-[10px] font-bold px-1 py-0.5 rounded-full" style={{ background: countryLegFilter === "all" ? "rgba(255,255,255,0.25)" : "rgba(45,107,204,0.12)" }}>{orders.length}</span>
          </button>
          {legs.map(f => {
            const count = orders.filter(o =>
              o.countryLegId === f.id ||
              (!o.countryLegId && o.accountCountry?.toLowerCase() === f.countryName.toLowerCase())
            ).length;
            const active = countryLegFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setCountryLegFilter(f.id)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border"
                style={{
                  background: active ? "#2D6BCC" : "transparent",
                  color: active ? "#fff" : "#2D6BCC",
                  borderColor: active ? "transparent" : "#2D6BCC55",
                }}
              >
                {f.countryName}
                <span className="text-[10px] font-bold px-1 py-0.5 rounded-full" style={{ background: active ? "rgba(255,255,255,0.25)" : "rgba(45,107,204,0.12)" }}>{count}</span>
              </button>
            );
          })}
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
                  <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                    <code className="font-mono text-xs font-semibold">#{o.code}</code>
                    <span className="text-xs text-muted-foreground truncate">{o.telegramUsername}</span>
                    <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{orderDate}</span>
                    <span className={cn("px-1.5 py-0.5 rounded-full border text-[10px] font-medium", ORDER_STATUS_COLORS[o.status] ?? "text-muted-foreground border-border")}>{o.status}</span>
                    <span className={cn("px-1.5 py-0.5 rounded-full border text-[10px] font-medium", PAYMENT_STATUS_COLORS[o.paymentStatus] ?? "text-muted-foreground border-border")}>{o.paymentStatus.replace(/_/g, " ")}</span>
                    {(o.amountDue ?? 0) > 0 && o.balancePaymentStatus !== "confirmed" && (
                      <span className="px-1.5 py-0.5 rounded-full border text-[10px] font-medium text-orange-700 bg-orange-50 border-orange-200">
                        balance owed {gb.currency}{(o.amountDue ?? 0).toFixed(2)}
                      </span>
                    )}
                    {o.paymentMethod && (() => {
                      const label = o.paymentMethod === "revolut" ? "Revolut" : o.paymentMethod === "paypal" ? "PayPal" : o.paymentMethod === "anonpay" ? "AnonPay" : "Crypto";
                      const color = o.paymentMethod === "revolut" ? "#0666EB" : o.paymentMethod === "paypal" ? "#003087" : o.paymentMethod === "anonpay" ? "#F97316" : "#64748B";
                      return <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: color }}>{label}</span>;
                    })()}
                    {o.directShippingRequested && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border text-[10px] font-semibold text-indigo-700 bg-indigo-50 border-indigo-200" title="Direct shipping to address">
                        🏠 DSTA
                      </span>
                    )}
                    {o.isWholesale && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border text-[10px] font-semibold text-teal-700 bg-teal-50 border-teal-200">
                        🏪 Wholesale
                      </span>
                    )}
                    {o.trackingNumber && <span className="font-mono text-[10px] text-blue-600">{o.trackingNumber}</span>}
                    {o.testPaymentTxHash && (
                      <span className="font-mono text-[10px] text-muted-foreground select-all" title={`Test TX: ${o.testPaymentTxHash}`}>
                        test:{o.testPaymentTxHash.length > 10 ? o.testPaymentTxHash.slice(0, 10) + "…" : o.testPaymentTxHash}
                      </span>
                    )}
                    {o.paymentTxHash && (
                      <span className="font-mono text-[10px] text-muted-foreground select-all" title={o.testPaymentTxHash ? `Remaining TX: ${o.paymentTxHash}` : o.paymentTxHash}>
                        {o.testPaymentTxHash ? "rem:" : ""}{o.paymentTxHash.length > 10 ? o.paymentTxHash.slice(0, 10) + "…" : o.paymentTxHash}
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
type GbMember = { telegramUsername: string; hasTelegram: boolean; email?: string | null };

function BroadcastDialog({ secret, gb, onClose }: { secret: string; gb: GroupBuy; onClose: () => void }) {
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

const BALLOT_TEST_OPTIONS = [
  { name: "Endotoxin",    price: "$120" },
  { name: "Mass/Purity",  price: "per peptide" },
  { name: "Sterility",    price: "$350" },
  { name: "Heavy Metals", price: "$200" },
] as const;

interface TestingRound {
  id: string;
  status: string;
  contributionAmount: number;
  anyContribution: boolean;
  lateOptInEnabled: boolean;
  lateOptInPaymentMethods: string[] | null;
  maxCompoundVotes: number;
  maxTestVotes: number;
  voteOptions: string[] | null;
  peptideBatches: Record<string, string>;
  testOptions: string[] | null;
  janoshikPaymentUrl: string | null;
  labShippingCost: number | null;
  resultNotes: string | null;
  resultPdfUrl: string | null;
  fundingNote: string | null;
}

interface GbProductSale { name: string; qtySold: number; }
interface TestingOrganiserPayments {
  paypalHandle?: string | null;
  revolutHandle?: string | null;
  cryptoWalletAddress?: string | null;
  cryptoNetwork?: string | null;
  anonPayEnabled?: boolean | null;
}

interface TestingContributor {
  orderId: string;
  code: string;
  telegramUsername: string;
  contribution: number;
  paymentStatus: string;
  hasVoted: boolean;
  vote: { peptideName: string; vialCount: number; testSelections: string[] } | null;
}

interface TestingAdminData {
  round: TestingRound | null;
  poolTotal: number;
  contributorCount: number;
  milestones?: { label: string; amount: number; type?: string }[];
  gbProductsSortedBySales: GbProductSale[];
  organiserPayments: TestingOrganiserPayments | null;
  contributors: TestingContributor[];
  ballotTestPrices?: Record<string, number | null>;
  allTestOptions?: string[];
}

function TestingSubTab({ secret, gb }: { secret: string; gb: GroupBuy }) {
  const [data, setData] = useState<TestingAdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create round form
  const [creating, setCreating] = useState(false);
  const [createAmount, setCreateAmount] = useState("15");
  const [createAny, setCreateAny] = useState(false);

  // Settings panel
  const [maxCompounds, setMaxCompounds] = useState(1);
  const [maxTests, setMaxTests] = useState(1);
  const [selectedTestOptions, setSelectedTestOptions] = useState<string[]>(["Endotoxin", "Mass/Purity"]);
  const [editAnyContrib, setEditAnyContrib] = useState(false);
  const [editContribAmount, setEditContribAmount] = useState("15");
  const [lateOptIn, setLateOptIn] = useState(false);
  const [latePayMethods, setLatePayMethods] = useState<string[]>([]);
  const [editJanoshikUrl, setEditJanoshikUrl] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Ballot panel
  const [selectedCompounds, setSelectedCompounds] = useState<string[]>([]);
  const [batchNumbers, setBatchNumbers] = useState<Record<string, string>>({});
  const [savingBallot, setSavingBallot] = useState(false);
  const [ballotSaved, setBallotSaved] = useState(false);

  // OCR
  type OcrScanResult = { filename: string; extractedNumber: string; confidence: number };
  const [ocrFiles, setOcrFiles] = useState<File[]>([]);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrResults, setOcrResults] = useState<OcrScanResult[]>([]);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [pendingBatch, setPendingBatch] = useState<string | null>(null);
  const ocrInputRef = useRef<HTMLInputElement>(null);

  // Status / funding / results
  const [savingStatus, setSavingStatus] = useState<string | null>(null);
  const [fundingNote, setFundingNote] = useState("");
  const [savingFunding, setSavingFunding] = useState(false);
  const [fundingSaved, setFundingSaved] = useState(false);
  const [editResultNotes, setEditResultNotes] = useState("");
  const [editResultPdfUrl, setEditResultPdfUrl] = useState("");
  const [savingResults, setSavingResults] = useState(false);
  const [resultsSaved, setResultsSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(apiUrl(`/admin/group-buys/${gb.id}/testing`), { headers: { "x-admin-secret": secret } });
      if (!r.ok) throw new Error("Failed to load");
      const d: TestingAdminData = await r.json();
      setData(d);
      if (d.round) {
        setMaxCompounds(d.round.maxCompoundVotes ?? 1);
        setMaxTests(d.round.maxTestVotes ?? 1);
        setSelectedTestOptions(
          d.round.testOptions && d.round.testOptions.length > 0
            ? d.round.testOptions
            : ["Endotoxin", "Mass/Purity"]
        );
        setEditAnyContrib(d.round.anyContribution ?? false);
        setEditContribAmount(String(d.round.contributionAmount ?? 15));
        setLateOptIn(d.round.lateOptInEnabled ?? false);
        setLatePayMethods(d.round.lateOptInPaymentMethods ?? []);
        setEditJanoshikUrl(d.round.janoshikPaymentUrl ?? "");
        const opts = d.round.voteOptions && d.round.voteOptions.length > 0
          ? d.round.voteOptions
          : (d.gbProductsSortedBySales ?? []).map(p => p.name);
        setSelectedCompounds(opts);
        setBatchNumbers(d.round.peptideBatches ?? {});
        setFundingNote(d.round.fundingNote ?? "");
        setEditResultNotes(d.round.resultNotes ?? "");
        setEditResultPdfUrl(d.round.resultPdfUrl ?? "");
      }
    } catch { setError("Failed to load testing data"); }
    finally { setLoading(false); }
  }, [secret, gb.id]);

  useEffect(() => { load(); }, [load]);

  const availablePaymentMethods = React.useMemo(() => {
    const op = data?.organiserPayments ?? {};
    const methods: { key: string; label: string }[] = [];
    if (op.paypalHandle) methods.push({ key: "paypal", label: "PayPal" });
    if (op.revolutHandle) methods.push({ key: "revolut", label: "Revolut" });
    if (op.cryptoWalletAddress) methods.push({ key: "crypto", label: `${(op as any).cryptoCurrency || "USDT"} ${op.cryptoNetwork || "ERC-20"}` });
    if (op.anonPayEnabled) methods.push({ key: "anonpay", label: "AnonPay" });
    return methods;
  }, [data?.organiserPayments]);

  async function handleCreate() {
    setCreating(true);
    try {
      const r = await fetch(apiUrl(`/admin/group-buys/${gb.id}/testing`), {
        method: "POST",
        headers: { "x-admin-secret": secret, "content-type": "application/json" },
        body: JSON.stringify({ contributionAmount: parseFloat(createAmount) || 15, anyContribution: createAny }),
      });
      if (!r.ok) { const e = await r.json(); alert(e.error ?? "Failed to create round"); return; }
      await load();
    } finally { setCreating(false); }
  }

  async function handleSaveSettings() {
    setSavingSettings(true);
    setSettingsSaved(false);
    try {
      const r = await fetch(apiUrl(`/admin/group-buys/${gb.id}/testing`), {
        method: "PATCH",
        headers: { "x-admin-secret": secret, "content-type": "application/json" },
        body: JSON.stringify({
          maxCompoundVotes: maxCompounds,
          maxTestVotes: maxTests,
          testOptions: selectedTestOptions,
          anyContribution: editAnyContrib,
          ...(editAnyContrib ? {} : { contributionAmount: parseFloat(editContribAmount) || 15 }),
          lateOptInEnabled: lateOptIn,
          lateOptInPaymentMethods: lateOptIn ? latePayMethods : [],
          janoshikPaymentUrl: editJanoshikUrl.trim() || null,
        }),
      });
      if (!r.ok) { const e = await r.json(); alert(e.error ?? "Failed to save settings"); return; }
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
      await load();
    } finally { setSavingSettings(false); }
  }

  async function handleSaveBallot() {
    setSavingBallot(true);
    setBallotSaved(false);
    try {
      const r = await fetch(apiUrl(`/admin/group-buys/${gb.id}/testing`), {
        method: "PATCH",
        headers: { "x-admin-secret": secret, "content-type": "application/json" },
        body: JSON.stringify({ voteOptions: selectedCompounds, peptideBatches: batchNumbers }),
      });
      if (!r.ok) { const e = await r.json(); alert(e.error ?? "Failed to save ballot"); return; }
      setBallotSaved(true);
      setTimeout(() => setBallotSaved(false), 3000);
      await load();
    } finally { setSavingBallot(false); }
  }

  async function handleSetStatus(status: string) {
    setSavingStatus(status);
    try {
      const r = await fetch(apiUrl(`/admin/group-buys/${gb.id}/testing`), {
        method: "PATCH",
        headers: { "x-admin-secret": secret, "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!r.ok) { const e = await r.json(); alert(e.error ?? "Failed to update status"); return; }
      await load();
    } finally { setSavingStatus(null); }
  }

  async function handleSaveFunding() {
    setSavingFunding(true);
    setFundingSaved(false);
    try {
      const r = await fetch(apiUrl(`/admin/group-buys/${gb.id}/testing`), {
        method: "PATCH",
        headers: { "x-admin-secret": secret, "content-type": "application/json" },
        body: JSON.stringify({ fundingNote: fundingNote.trim() || null }),
      });
      if (!r.ok) { const e = await r.json(); alert(e.error ?? "Failed to save note"); return; }
      setFundingSaved(true);
      setTimeout(() => setFundingSaved(false), 3000);
      await load();
    } finally { setSavingFunding(false); }
  }

  async function handleSaveResults() {
    setSavingResults(true);
    setResultsSaved(false);
    try {
      const r = await fetch(apiUrl(`/admin/group-buys/${gb.id}/testing`), {
        method: "PATCH",
        headers: { "x-admin-secret": secret, "content-type": "application/json" },
        body: JSON.stringify({
          resultNotes: editResultNotes.trim() || null,
          resultPdfUrl: editResultPdfUrl.trim() || null,
        }),
      });
      if (!r.ok) { const e = await r.json(); alert(e.error ?? "Failed to save results"); return; }
      setResultsSaved(true);
      setTimeout(() => setResultsSaved(false), 3000);
      await load();
    } finally { setSavingResults(false); }
  }

  async function handleRunOcr() {
    if (ocrFiles.length === 0) return;
    setOcrRunning(true);
    setOcrError(null);
    setOcrResults([]);
    setPendingBatch(null);
    try {
      const formData = new FormData();
      ocrFiles.forEach(f => formData.append("images", f));
      const r = await fetch(apiUrl(`/admin/group-buys/${gb.id}/testing/scan-batches`), {
        method: "POST",
        headers: { "x-admin-secret": secret },
        body: formData,
      });
      if (!r.ok) { const e = await r.json(); setOcrError(e.error ?? "OCR failed"); return; }
      const d = await r.json();
      setOcrResults(d.results ?? []);
    } finally { setOcrRunning(false); }
  }

  function nameSimilarityScore(compoundName: string, batchNumber: string): number {
    const bn = batchNumber.toLowerCase();
    const cn = compoundName.toLowerCase();
    const tokens = cn.split(/[\s\-_()[\]]+/).filter(t => t.length >= 2);
    let best = 0;
    for (const tok of tokens) {
      if (bn.startsWith(tok)) { best = Math.max(best, tok.length * 2); continue; }
      if (bn.includes(tok)) { best = Math.max(best, tok.length); }
    }
    return best;
  }

  function handleClickOcrResult(batchNumber: string) {
    const unassigned = selectedCompounds.filter(c => !batchNumbers[c]);
    if (unassigned.length === 0) return;
    if (unassigned.length === 1) {
      setBatchNumbers(prev => ({ ...prev, [unassigned[0]]: batchNumber }));
      return;
    }
    const scored = unassigned
      .map(c => ({ compound: c, score: nameSimilarityScore(c, batchNumber) }))
      .sort((a, b) => b.score - a.score);
    const top = scored[0];
    const second = scored[1];
    if (top.score > 0 && top.score > second.score * 2) {
      setBatchNumbers(prev => ({ ...prev, [top.compound]: batchNumber }));
    } else {
      setPendingBatch(batchNumber);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const files = [...e.dataTransfer.files].filter(f => f.type.startsWith("image/")).slice(0, 30);
    setOcrFiles(prev => [...prev, ...files].slice(0, 30));
  }

  function toggleCompound(name: string, checked: boolean) {
    setSelectedCompounds(prev => checked ? [...prev, name] : prev.filter(n => n !== name));
    if (!checked) setBatchNumbers(prev => { const next = { ...prev }; delete next[name]; return next; });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return <p className="text-xs text-red-500 py-4">{error}</p>;
  }

  const round = data?.round ?? null;
  const products = data?.gbProductsSortedBySales ?? [];

  return (
    <div className="space-y-5 py-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Testing Pool</p>
          {round ? (
            <p className="text-xs text-muted-foreground mt-0.5">
              Status: <span className="font-medium capitalize">{round.status.replace(/_/g, " ")}</span>
              {" · "}${(data?.poolTotal ?? 0).toFixed(2)} raised
              {" · "}{data?.contributorCount ?? 0} contributor{(data?.contributorCount ?? 0) !== 1 ? "s" : ""}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5">No round set up yet</p>
          )}
        </div>
        <a
          href={`/testing/${gb.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-500 underline flex items-center gap-1"
        >
          <Eye className="w-3 h-3" />
          Public page
        </a>
      </div>

      {/* No round: create form */}
      {!round && (
        <div className="border border-border rounded-lg p-4 space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Create Testing Round</p>
          <div className="space-y-3">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={createAny}
                onChange={e => setCreateAny(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Accept any contribution amount</span>
            </label>
            {!createAny && (
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground shrink-0">Fixed amount (USD):</Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={createAmount}
                  onChange={e => setCreateAmount(e.target.value)}
                  className="w-24 h-8 text-sm"
                />
              </div>
            )}
            <Button size="sm" onClick={handleCreate} disabled={creating} className="w-full">
              {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />}
              Create Round
            </Button>
          </div>
        </div>
      )}

      {/* Round exists: settings + ballot */}
      {round && (
        <>
          {/* Round Status */}
          <div className="border border-border rounded-lg p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Round Status</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSetStatus("active")}
                disabled={savingStatus !== null}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-semibold border transition-colors disabled:opacity-60",
                  round.status === "active"
                    ? "bg-green-600 text-white border-green-600"
                    : "bg-background text-foreground border-border hover:bg-muted"
                )}
              >
                {savingStatus === "active" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                Open
              </button>
              <button
                type="button"
                onClick={() => handleSetStatus("closed")}
                disabled={savingStatus !== null}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-semibold border transition-colors disabled:opacity-60",
                  round.status === "closed"
                    ? "bg-red-600 text-white border-red-600"
                    : "bg-background text-foreground border-border hover:bg-muted"
                )}
              >
                {savingStatus === "closed" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                Closed
              </button>
            </div>
            <div className="flex items-center gap-2">
              {([
                { key: "sent_to_lab", label: "Sent to lab" },
                { key: "results_received", label: "Results in" },
              ] as const).map(s => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => handleSetStatus(s.key)}
                  disabled={savingStatus !== null}
                  className={cn(
                    "flex-1 rounded-md py-1.5 text-xs font-medium border transition-colors disabled:opacity-60",
                    round.status === s.key
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-background text-muted-foreground border-border hover:bg-muted"
                  )}
                >
                  {savingStatus === s.key ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : s.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Open = members can opt in &amp; vote. Closed = locked. Set &ldquo;Results in&rdquo; once you&rsquo;ve added results below to share them with contributors.
            </p>
          </div>

          {/* Funding Reconciliation */}
          <div className="border border-border rounded-lg p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Funding Reconciliation</p>
            {(() => {
              const ms = data?.milestones ?? [];
              const pool = data?.poolTotal ?? 0;
              const funded = ms.filter(m => pool >= m.amount);
              const highestFunded = funded.length > 0 ? Math.max(...funded.map(m => m.amount)) : 0;
              const next = ms.find(m => m.amount > pool) ?? null;
              const surplus = pool - highestFunded;
              const shortfall = next ? next.amount - pool : 0;
              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Raised</span>
                    <span className="font-semibold tabular-nums">${pool.toFixed(2)}</span>
                  </div>
                  {ms.length > 0 && (
                    <div className="space-y-1">
                      {ms.map((m, i) => {
                        const isFunded = pool >= m.amount;
                        return (
                          <div key={i} className="flex items-center justify-between text-xs gap-2">
                            <span className={cn("truncate", isFunded ? "text-foreground" : "text-muted-foreground")}>
                              {isFunded ? "✓" : "○"} {m.label}
                            </span>
                            <span className="tabular-nums text-muted-foreground shrink-0">${m.amount.toFixed(2)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="pt-2 border-t border-border">
                    {next ? (
                      <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                        Short ${shortfall.toFixed(2)} to fund &ldquo;{next.label}&rdquo;.
                        {surplus > 0 && ` (${"$" + surplus.toFixed(2)} over the last funded tier.)`}
                      </p>
                    ) : ms.length > 0 ? (
                      <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                        All tiers funded · ${surplus.toFixed(2)} surplus.
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">No votes yet — milestones appear once members vote.</p>
                    )}
                  </div>
                </div>
              );
            })()}
            <div className="space-y-1.5 pt-1">
              <Label className="text-xs">Member-facing funding note</Label>
              <p className="text-[10px] text-muted-foreground -mt-0.5">
                Shown to contributors on the private results page. Explain how any extra or shortfall was handled. No automatic changes are made to what members see.
              </p>
              <textarea
                value={fundingNote}
                onChange={e => setFundingNote(e.target.value)}
                rows={3}
                placeholder="e.g. We were $12 short on the heavy-metals test, so it was skipped this round."
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-y"
              />
              <Button size="sm" onClick={handleSaveFunding} disabled={savingFunding} className="gap-1.5">
                {savingFunding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : fundingSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                {fundingSaved ? "Saved!" : "Save note"}
              </Button>
            </div>
          </div>

          {/* Lab Results */}
          <div className="border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Lab Results</p>
              <a
                href={`/testing/${gb.id}/results`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-500 underline flex items-center gap-1"
              >
                <Eye className="w-3 h-3" /> Results page
              </a>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Result notes</Label>
              <textarea
                value={editResultNotes}
                onChange={e => setEditResultNotes(e.target.value)}
                rows={4}
                placeholder="Summary of the lab findings…"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-y"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Report PDF link</Label>
              <Input
                type="url"
                value={editResultPdfUrl}
                onChange={e => setEditResultPdfUrl(e.target.value)}
                placeholder="https://…"
                className="h-8 text-sm"
              />
            </div>
            <Button size="sm" onClick={handleSaveResults} disabled={savingResults} className="gap-1.5">
              {savingResults ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : resultsSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              {resultsSaved ? "Saved!" : "Save results"}
            </Button>
            {round.status !== "results_received" && (editResultNotes.trim() || editResultPdfUrl.trim()) ? (
              <p className="text-[10px] text-orange-600 dark:text-orange-400">
                Results are saved but hidden. Set status to &ldquo;Results in&rdquo; above to share them with contributors.
              </p>
            ) : null}
            {(editResultNotes.trim() || editResultPdfUrl.trim() || fundingNote.trim()) ? (
              <div className="rounded-lg border border-dashed border-border p-3 space-y-2 bg-muted/30">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Contributor preview</p>
                {editResultNotes.trim() && <p className="text-sm whitespace-pre-wrap">{editResultNotes}</p>}
                {editResultPdfUrl.trim() && (
                  <a href={editResultPdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600">
                    View PDF Report <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                {fundingNote.trim() && (
                  <p className="text-xs text-muted-foreground border-t border-border pt-2">
                    <span className="font-medium">Funding note:</span> {fundingNote}
                  </p>
                )}
              </div>
            ) : null}
          </div>

          {/* Round Settings */}
          <div className="border border-border rounded-lg p-4 space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Round Settings</p>

            {/* Contribution amount */}
            <div className="space-y-2 pb-3 border-b border-border">
              <Label className="text-xs">Opt-in contribution</Label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editAnyContrib}
                  onChange={e => setEditAnyContrib(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Accept any amount</span>
              </label>
              {!editAnyContrib && (
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground shrink-0">Fixed amount (USD):</Label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={editContribAmount}
                    onChange={e => setEditContribAmount(e.target.value)}
                    className="w-24 h-8 text-sm"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Max compounds per vote</Label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={maxCompounds}
                  onChange={e => setMaxCompounds(Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="h-8 text-sm"
                />
                <p className="text-[10px] text-muted-foreground">How many compounds each voter can pick</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Max test types per vote</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={maxTests}
                  onChange={e => setMaxTests(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="h-8 text-sm"
                />
                <p className="text-[10px] text-muted-foreground">How many test types each voter can pick</p>
              </div>
            </div>

            {/* Test types ballot */}
            <div className="space-y-2 border-t border-border pt-3">
              <p className="text-xs font-medium">Test types on ballot</p>
              <p className="text-[10px] text-muted-foreground -mt-1">Which test types members can vote for</p>
              <div className="grid grid-cols-2 gap-y-1.5 gap-x-3">
                {(data?.allTestOptions ?? BALLOT_TEST_OPTIONS.map(o => o.name)).map(optName => {
                  const catalogPrice = data?.ballotTestPrices?.[optName];
                  const priceLabel = catalogPrice == null
                    ? (optName === "Mass/Purity" ? "per peptide" : "—")
                    : `$${catalogPrice}`;
                  return (
                    <label key={optName} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedTestOptions.includes(optName)}
                        onChange={e =>
                          setSelectedTestOptions(prev =>
                            e.target.checked ? [...prev, optName] : prev.filter(n => n !== optName)
                          )
                        }
                        className="rounded shrink-0"
                      />
                      <span className="text-sm leading-none">{optName}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{priceLabel}</span>
                    </label>
                  );
                })}
              </div>
              {selectedTestOptions.length === 0 && (
                <p className="text-[10px] text-orange-500">Select at least one test type.</p>
              )}
            </div>

            <div className="space-y-3 border-t border-border pt-3">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lateOptIn}
                  onChange={e => setLateOptIn(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm font-medium">Allow late contributions</span>
              </label>

              {lateOptIn && (
                <div className="pl-6 space-y-2">
                  <p className="text-xs text-muted-foreground">Payment methods offered to late contributors:</p>
                  {availablePaymentMethods.length === 0 ? (
                    <p className="text-xs text-orange-500">
                      No payment methods configured on this GB. Add them under the Payments tab first.
                    </p>
                  ) : (
                    availablePaymentMethods.map(m => (
                      <label key={m.key} className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={latePayMethods.includes(m.key)}
                          onChange={e =>
                            setLatePayMethods(prev =>
                              e.target.checked ? [...prev, m.key] : prev.filter(k => k !== m.key)
                            )
                          }
                          className="rounded"
                        />
                        <span className="text-sm">{m.label}</span>
                      </label>
                    ))
                  )}
                  {lateOptIn && latePayMethods.length === 0 && availablePaymentMethods.length > 0 && (
                    <p className="text-xs text-orange-500">Select at least one payment method, or no late contributions will be accepted.</p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1.5 border-t border-border pt-3">
              <label className="text-xs font-semibold text-muted-foreground">Janoshik Payment URL <span className="font-normal">(optional)</span></label>
              <input
                type="url"
                value={editJanoshikUrl}
                onChange={e => setEditJanoshikUrl(e.target.value)}
                placeholder="https://janoshik.com/..."
                className="w-full text-xs px-3 py-2 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <p className="text-[10px] text-muted-foreground">If set, a &ldquo;Pay via Janoshik&rdquo; button will appear in the late contribution form.</p>
            </div>

            <Button size="sm" onClick={handleSaveSettings} disabled={savingSettings} className="w-full">
              {savingSettings
                ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                : settingsSaved
                  ? <Check className="w-3.5 h-3.5 mr-1.5" />
                  : <Save className="w-3.5 h-3.5 mr-1.5" />}
              {settingsSaved ? "Saved!" : "Save Settings"}
            </Button>
          </div>

          {/* Compound Ballot */}
          <div className="border border-border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Compound Ballot</p>
              <span className="text-xs text-muted-foreground">{selectedCompounds.length} on ballot</span>
            </div>

            {products.length === 0 ? (
              <p className="text-xs text-muted-foreground">No products linked to this GB yet. Add products first.</p>
            ) : (
              <>
                {/* Column headers */}
                <div className="grid grid-cols-[auto_1fr_56px_120px] gap-x-2 items-center px-0.5 mb-0.5">
                  <span />
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Compound</span>
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide text-right">Sold</span>
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Batch #</span>
                </div>
                <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                  {products.map(p => {
                    const isChecked = selectedCompounds.includes(p.name);
                    return (
                      <div key={p.name} className="grid grid-cols-[auto_1fr_56px_120px] gap-x-2 items-center py-0.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => toggleCompound(p.name, e.target.checked)}
                          className="rounded shrink-0 mt-px"
                        />
                        <span
                          className="text-sm leading-tight cursor-pointer truncate"
                          onClick={() => toggleCompound(p.name, !isChecked)}
                          title={p.name}
                        >
                          {p.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground text-right tabular-nums">
                          {p.qtySold > 0 ? p.qtySold : "—"}
                        </span>
                        {isChecked ? (
                          <Input
                            placeholder="e.g. BPC-2401"
                            value={batchNumbers[p.name] ?? ""}
                            onChange={e => setBatchNumbers(prev => ({ ...prev, [p.name]: e.target.value }))}
                            className="h-6 text-xs px-2 font-mono"
                          />
                        ) : (
                          <span className="text-[10px] text-muted-foreground/40">—</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* OCR drop zone */}
            <div className="border-t border-border pt-3 space-y-3">
              <p className="text-xs font-medium">Batch OCR — extract from label photos</p>
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => ocrInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg p-5 text-center cursor-pointer hover:border-blue-400 transition-colors"
              >
                <Upload className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  {ocrFiles.length === 0
                    ? "Drop up to 30 label photos or click to select"
                    : `${ocrFiles.length} image${ocrFiles.length !== 1 ? "s" : ""} queued`}
                </p>
              </div>
              <input
                ref={ocrInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => {
                  const files = [...(e.target.files ?? [])].filter(f => f.type.startsWith("image/")).slice(0, 30);
                  setOcrFiles(prev => [...prev, ...files].slice(0, 30));
                  e.target.value = "";
                }}
              />

              {ocrFiles.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={handleRunOcr} disabled={ocrRunning} className="flex-1">
                    {ocrRunning
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      : <TestTube className="w-3.5 h-3.5 mr-1.5" />}
                    {ocrRunning ? "Extracting…" : "Extract Batch Numbers"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="px-2"
                    onClick={() => { setOcrFiles([]); setOcrResults([]); setOcrError(null); setPendingBatch(null); }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}

              {ocrError && <p className="text-xs text-red-500">{ocrError}</p>}

              {ocrResults.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] text-muted-foreground">
                    Click a number to assign — best match auto-selects; picker opens if ambiguous:
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {ocrResults.map((result, i) => {
                      const pct = Math.round(result.confidence * 100);
                      const confColor = result.confidence >= 0.8
                        ? "text-green-600 dark:text-green-400"
                        : result.confidence >= 0.5
                          ? "text-yellow-600 dark:text-yellow-400"
                          : "text-red-500";
                      return (
                        <div key={i} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleClickOcrResult(result.extractedNumber)}
                            className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-md text-xs border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors font-mono"
                          >
                            {result.extractedNumber}
                          </button>
                          <span className={`text-[10px] font-medium tabular-nums ${confColor}`}>{pct}%</span>
                          <span className="text-[10px] text-muted-foreground truncate max-w-[120px]" title={result.filename}>
                            {result.filename}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {pendingBatch && (
                    <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-3 bg-blue-50 dark:bg-blue-950 space-y-2">
                      <p className="text-xs font-medium">
                        Assign <span className="font-mono">{pendingBatch}</span> to:
                      </p>
                      <div className="space-y-1">
                        {selectedCompounds.filter(c => !batchNumbers[c]).map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => {
                              setBatchNumbers(prev => ({ ...prev, [c]: pendingBatch! }));
                              setPendingBatch(null);
                            }}
                            className="block w-full text-left px-2.5 py-1.5 text-xs rounded-md hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setPendingBatch(null)}
                        className="text-[10px] text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button size="sm" onClick={handleSaveBallot} disabled={savingBallot} className="w-full">
              {savingBallot
                ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                : ballotSaved
                  ? <Check className="w-3.5 h-3.5 mr-1.5" />
                  : <Save className="w-3.5 h-3.5 mr-1.5" />}
              {ballotSaved ? "Saved!" : "Save Ballot"}
            </Button>
          </div>

          {/* Contributors */}
          <div className="border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contributors</p>
              <span className="text-xs text-muted-foreground">
                {(data?.contributors ?? []).filter(c => c.hasVoted).length} / {(data?.contributors ?? []).length} voted
              </span>
            </div>

            {(data?.contributors ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">No confirmed contributions yet.</p>
            ) : (
              <div className="space-y-0 divide-y divide-border">
                {(data?.contributors ?? []).map(c => (
                  <div key={c.orderId} className="py-2 flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium truncate">{c.telegramUsername}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">#{c.code}</span>
                      </div>
                      {c.hasVoted && c.vote && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                          Voted: <span className="text-foreground">{c.vote.peptideName}</span>
                          {c.vote.vialCount > 1 && ` · ${c.vote.vialCount} vials`}
                          {c.vote.testSelections.length > 0 && ` · ${c.vote.testSelections.join(", ")}`}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-xs font-medium tabular-nums">${c.contribution.toFixed(2)}</span>
                      {c.hasVoted ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-green-600 dark:text-green-400 font-medium">
                          <Check className="w-3 h-3" />
                          Voted
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">Not voted</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Admin Fee Countries Sub-Tab ──────────────────────────────
type AdminFeeCountryEntry = { country: string; amount: number; enabled: boolean };

function AdminFeeCountriesSubTab({ secret, gb, onUpdate }: { secret: string; gb: GroupBuy; onUpdate: (gb: GroupBuy) => void }) {
  const [entries, setEntries] = useState<AdminFeeCountryEntry[]>(
    (Array.isArray(gb.adminFeeCountries) ? gb.adminFeeCountries : []).map(e => ({ ...e }))
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newCountry, setNewCountry] = useState<string>(COUNTRIES[0] ?? "");
  const [newAmount, setNewAmount] = useState("");

  const addEntry = () => {
    if (!newCountry || newAmount === "" || isNaN(parseFloat(newAmount))) return;
    if (entries.some(e => e.country === newCountry)) {
      setError("That country is already in the list.");
      return;
    }
    setEntries(prev => [...prev, { country: newCountry, amount: parseFloat(newAmount), enabled: true }]);
    setNewAmount("");
    setError(null);
  };

  const addEuEntries = () => {
    const existing = new Set(entries.map(e => e.country));
    const toAdd = EU_COUNTRIES.filter(c => !existing.has(c.name));
    if (toAdd.length === 0) { setError("All EU countries are already in the list."); return; }
    setEntries(prev => [...prev, ...toAdd.map(c => ({ country: c.name, amount: 0, enabled: true }))]);
    setError(null);
  };

  const removeEntry = (country: string) => setEntries(prev => prev.filter(e => e.country !== country));

  const updateEntry = (country: string, field: "amount" | "enabled", val: number | boolean) => {
    setEntries(prev => prev.map(e => e.country === country ? { ...e, [field]: val } : e));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-secret": secret },
      body: JSON.stringify({ adminFeeCountries: entries }),
    });
    if (res.ok) {
      const updated = await res.json();
      onUpdate(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      const d = await res.json().catch(() => ({}));
      setError((d as { error?: string }).error ?? "Failed to save.");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold mb-1">Admin Fee by Country</h3>
        <p className="text-xs text-muted-foreground">
          Override the base admin fee for specific countries. When a customer selects a delivery country matching an enabled entry, that amount is used instead of the default.
        </p>
      </div>

      {entries.length > 0 ? (
        <div className="space-y-2">
          {entries.map(e => (
            <div key={e.country} className="flex items-center gap-2 rounded-xl border border-border p-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{e.country}</div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">{gb.currency}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={e.amount}
                  onChange={ev => updateEntry(e.country, "amount", parseFloat(ev.target.value) || 0)}
                  className="w-20 rounded-lg border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <button
                type="button"
                onClick={() => updateEntry(e.country, "enabled", !e.enabled)}
                title={e.enabled ? "Enabled" : "Disabled"}
                className={cn("p-1 rounded-md transition-colors", e.enabled ? "text-green-600 bg-green-50" : "text-muted-foreground bg-muted")}
              >
                {e.enabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
              </button>
              <button type="button" onClick={() => removeEntry(e.country)} className="p-1 text-muted-foreground hover:text-red-500 rounded-md transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">No country overrides yet.</p>
      )}

      {/* Add new entry */}
      <div className="pt-2 border-t border-border space-y-2">
        <button type="button" onClick={addEuEntries}
          className="w-full rounded-xl border border-dashed border-blue-200 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5">
          <Globe className="w-3.5 h-3.5" />Add All EU Countries (fee = 0)
        </button>
      </div>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Label className="text-[10px] text-muted-foreground mb-1 block">Country</Label>
          <select
            value={newCountry}
            onChange={e => setNewCountry(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground mb-1 block">Amount ({gb.currency})</Label>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={newAmount}
            onChange={e => setNewAmount(e.target.value)}
            className="w-24 rounded-lg border border-input bg-background px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <Button size="sm" variant="outline" onClick={addEntry} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Add
        </Button>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <Button onClick={save} disabled={saving} className="gap-1.5">
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
        {saved ? "Saved!" : "Save Changes"}
      </Button>
    </div>
  );
}

// ─── Open as Organiser Button ─────────────────────────────────
function OpenAsOrganiserButton({ secret, gbId }: { secret: string; gbId: string }) {
  const [loading, setLoading] = useState(false);
  const open = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/admin/group-buys/${gbId}/organiser-session`), {
        method: "POST",
        headers: { "x-admin-secret": secret },
      });
      if (res.ok) {
        const { token } = await res.json();
        const url = `/gborganiser?adminGbId=${encodeURIComponent(gbId)}&adminToken=${encodeURIComponent(token)}`;
        window.open(url, "_blank");
      }
    } finally { setLoading(false); }
  };
  return (
    <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={open} disabled={loading}>
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
      Open as Organiser
    </Button>
  );
}

// ─── P&L Sub-Tab ──────────────────────────────────────────────
function PnlSubTab({ secret, gb }: { secret: string; gb: GroupBuy }) {
  const [data, setData] = useState<{
    orders: { total: number; confirmed: number };
    revenue: { total: number; products: number; delivery: number };
    costs: { materials: number; lab: number; shipping: number; misc: number; platformFee: number; total: number; notes: string | null };
    profit: { gross: number; marginPct: number };
    productBreakdown: { name: string; totalQty: number; totalRevenue: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [costs, setCosts] = useState({ materials: "", lab: "", shipping: "", misc: "", platformFee: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const sym = (n: number) => `${(gb.currency ?? "GBP") === "USD" ? "$" : "£"}${n.toFixed(2)}`;

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}/pnl`), { headers: { "x-admin-secret": secret } });
    if (res.ok) {
      const d = await res.json();
      setData(d);
      setCosts({
        materials: d.costs.materials ? String(d.costs.materials) : "",
        lab: d.costs.lab ? String(d.costs.lab) : "",
        shipping: d.costs.shipping ? String(d.costs.shipping) : "",
        misc: d.costs.misc ? String(d.costs.misc) : "",
        platformFee: d.costs.platformFee ? String(d.costs.platformFee) : "",
        notes: d.costs.notes ?? "",
      });
    }
    setLoading(false);
  }, [secret, gb.id]);

  useEffect(() => { load(); }, [load]);

  const saveCosts = async () => {
    setSaving(true); setSaveMsg("");
    const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}/pnl-costs`), {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-admin-secret": secret },
      body: JSON.stringify({
        materials: costs.materials ? parseFloat(costs.materials) : null,
        lab: costs.lab ? parseFloat(costs.lab) : null,
        shipping: costs.shipping ? parseFloat(costs.shipping) : null,
        misc: costs.misc ? parseFloat(costs.misc) : null,
        platformFee: costs.platformFee ? parseFloat(costs.platformFee) : null,
        notes: costs.notes || null,
      }),
    });
    if (res.ok) { setSaveMsg("Costs saved ✓"); load(); setTimeout(() => setSaveMsg(""), 3000); }
    else { setSaveMsg("Save failed"); }
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!data) return <p className="text-sm text-muted-foreground text-center py-8">Failed to load P&L data</p>;

  const isProfit = data.profit.gross >= 0;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="bg-muted/40 rounded-xl p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Revenue</p>
          <p className="text-lg font-bold mt-1">{sym(data.revenue.total)}</p>
          <p className="text-[10px] text-muted-foreground">{data.orders.confirmed}/{data.orders.total} paid</p>
        </div>
        <div className="bg-muted/40 rounded-xl p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Costs</p>
          <p className="text-lg font-bold mt-1">{sym(data.costs.total)}</p>
          <p className="text-[10px] text-muted-foreground">Inputted costs</p>
        </div>
        <div className={`rounded-xl p-3 ${isProfit ? "bg-green-50" : "bg-red-50"}`}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Gross Profit</p>
          <p className={`text-lg font-bold mt-1 ${isProfit ? "text-green-700" : "text-red-600"}`}>{sym(data.profit.gross)}</p>
          <p className="text-[10px] text-muted-foreground">{data.profit.marginPct}% margin</p>
        </div>
        <div className="bg-muted/40 rounded-xl p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Revenue Breakdown</p>
          <p className="text-xs mt-1 text-muted-foreground">Products: <span className="font-semibold text-foreground">{sym(data.revenue.products)}</span></p>
          <p className="text-xs text-muted-foreground">Delivery: <span className="font-semibold text-foreground">{sym(data.revenue.delivery)}</span></p>
        </div>
      </div>

      {/* Cost inputs */}
      <div className="border border-border rounded-xl p-4 space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Record Costs</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {([
            { key: "materials", label: "Materials / Product Cost" },
            { key: "lab", label: "Lab / Testing" },
            { key: "shipping", label: "Vendor Shipping" },
            { key: "misc", label: "Misc / Other" },
            { key: "platformFee", label: "Platform Fee" },
          ] as const).map(({ key, label }) => (
            <div key={key} className="space-y-1">
              <Label className="text-xs">{label}</Label>
              <Input type="number" min="0" step="0.01" className="h-9 text-sm"
                placeholder="0.00"
                value={costs[key]}
                onChange={e => setCosts(p => ({ ...p, [key]: e.target.value }))} />
            </div>
          ))}
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Notes (optional)</Label>
          <textarea className="w-full rounded-lg border border-input bg-background p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[52px] resize-none"
            placeholder="Any cost notes…"
            value={costs.notes}
            onChange={e => setCosts(p => ({ ...p, notes: e.target.value }))} />
        </div>
        <div className="flex items-center gap-3">
          <Button size="sm" onClick={saveCosts} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? "Saving…" : "Save Costs"}
          </Button>
          {saveMsg && <span className="text-xs font-semibold text-green-600">{saveMsg}</span>}
        </div>
      </div>

      {/* Product breakdown */}
      {data.productBreakdown.length > 0 && (
        <div className="border border-border rounded-xl overflow-hidden">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-4 py-2.5 bg-muted/40">Product Breakdown (confirmed orders)</p>
          <div className="divide-y divide-border">
            {data.productBreakdown.map(p => (
              <div key={p.name} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="flex-1 min-w-0 truncate">{p.name}</span>
                <span className="text-muted-foreground text-xs shrink-0 mx-3">×{p.totalQty}</span>
                <span className="font-semibold shrink-0">{sym(p.totalRevenue)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Admin Reshippers Sub-tab ─────────────────────────────────
type AdminReshipperAssignment = {
  id: string;
  gbId: string;
  reshipperUsername: string;
  country: string;
  paymentTarget: string;
  enabled: boolean;
  enabledPaymentMethods: Record<string, boolean> | null;
  createdAt: string;
};

type ApprovedReshipper = {
  telegramUsername: string;
  reshipperPaymentMethods?: Record<string, boolean> | null;
};

const PAYMENT_METHODS: { key: string; label: string }[] = [
  { key: "usdtEnabled", label: "USDT / USDC" },
  { key: "revolutEnabled", label: "Revolut" },
  { key: "paypalEnabled", label: "PayPal" },
  { key: "cryptoEnabled", label: "Crypto" },
  { key: "anonPayEnabled", label: "AnonPay" },
];

function AdminReshippersSubTab({ secret, gbId }: { secret: string; gbId: string }) {
  const [assignments, setAssignments] = useState<AdminReshipperAssignment[]>([]);
  const [approved, setApproved] = useState<ApprovedReshipper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newCountry, setNewCountry] = useState("");
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
    if (!newCountry) { setAddError("Select a country"); return; }
    setAdding(true);
    try {
      const r = await fetch(apiUrl(`/admin/group-buys/${gbId}/reshippers`), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({
          reshipperUsername: newUsername,
          country: newCountry,
          paymentTarget: newPaymentTarget,
          enabledPaymentMethods: newPaymentMethods,
        }),
      });
      if (!r.ok) { const d = await r.json(); setAddError(d.error || "Failed to add"); return; }
      setNewUsername(""); setNewCountry(""); setNewPaymentTarget("reshipper"); setNewPaymentMethods({}); setAddOpen(false);
      void load();
    } finally { setAdding(false); }
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
    if (!confirm(`Remove @${a.reshipperUsername} from ${a.country}?`)) return;
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
              <div className="flex items-center gap-2 min-w-0">
                <UserCheck className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm font-semibold truncate">@{a.reshipperUsername}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-mono uppercase shrink-0">{a.country}</span>
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
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1 block">Country</label>
            <select
              className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm focus:outline-none"
              value={newCountry}
              onChange={e => setNewCountry(e.target.value)}
            >
              <option value="">Select a country…</option>
              {COUNTRY_LIST.map(c => (
                <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
              ))}
            </select>
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
            <Button size="sm" type="button" variant="ghost" onClick={() => { setAddOpen(false); setAddError(null); setNewPaymentMethods({}); }}>Cancel</Button>
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
function AdminSharedShippingSubTab({ secret, gb, onUpdate }: { secret: string; gb: GroupBuy; onUpdate: (gb: GroupBuy) => void }) {
  const initial = Array.isArray(gb.sharedShippingCountries) ? gb.sharedShippingCountries : [];
  const [countries, setCountries] = useState<string[]>(initial);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [addCountry, setAddCountry] = useState<string>(COUNTRIES[0] ?? "");

  useEffect(() => {
    setCountries(Array.isArray(gb.sharedShippingCountries) ? gb.sharedShippingCountries : []);
  }, [gb.sharedShippingCountries]);

  const save = async (next: string[]) => {
    setSaving(true);
    setSaveError(null);
    const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-secret": secret },
      body: JSON.stringify({ sharedShippingCountries: next }),
    });
    if (res.ok) {
      const updated: GroupBuy = await res.json();
      const parsed = Array.isArray(updated.sharedShippingCountries) ? updated.sharedShippingCountries : [];
      setCountries(parsed);
      onUpdate(updated);
    } else {
      setSaveError("Failed to save — please try again");
    }
    setSaving(false);
  };

  const addOne = () => {
    if (!addCountry || countries.includes(addCountry)) return;
    const next = [...countries, addCountry];
    setCountries(next);
    save(next);
  };

  const remove = (c: string) => {
    const next = countries.filter(x => x !== c);
    setCountries(next);
    save(next);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Countries where shipping cost is shared across group buys for the same customer. When a customer in one of these countries has already paid shipping on another GB, the fee is waived here.
      </p>
      <div className="flex gap-2">
        <select
          value={addCountry}
          onChange={e => setAddCountry(e.target.value)}
          className="flex-1 text-sm rounded-md border border-border bg-background px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {COUNTRIES.filter(c => !countries.includes(c)).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button
          onClick={addOne}
          disabled={saving || !addCountry || countries.includes(addCountry)}
          className="px-4 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Add
        </button>
      </div>
      {saveError && <p className="text-xs text-red-500">{saveError}</p>}
      {countries.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">No shared shipping countries configured.</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {countries.map(c => (
            <span key={c} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-sm font-medium">
              <Globe className="w-3.5 h-3.5 text-muted-foreground" />
              {c}
              <button onClick={() => remove(c)} disabled={saving} className="ml-1 text-muted-foreground hover:text-destructive disabled:opacity-40">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Summary Sub-tab ─────────────────────────────────────────────────────────
function GbCoverageSection({ secret, gbId }: { secret: string; gbId: string }) {
  type CoverageItem = { productName: string; stock: number | null; mappingCount: number; orderedQty: number };
  const [items, setItems] = useState<CoverageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const r = await fetch(apiUrl("/admin/inventory/gb-comparison"), { headers: { "x-admin-secret": secret } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      setItems((d.items ?? []).filter((it: any) => it.gbId === gbId));
    } catch { setErr("Failed to load coverage data"); }
    finally { setLoading(false); }
  }, [secret, gbId]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b border-border">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm font-semibold">Stock Coverage</p>
          <p className="text-xs text-muted-foreground ml-1">Live Qiyunle stock vs. ordered quantities</p>
        </div>
        <button onClick={load} className="p-1.5 rounded hover:bg-muted transition-colors">
          <RefreshCw className={cn("w-3.5 h-3.5 text-muted-foreground", loading && "animate-spin")} />
        </button>
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : err ? (
        <p className="text-xs text-red-500 text-center py-6">{err}</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">No inventory mappings found for this group buy's products.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Product</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Ordered</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Stock</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Remaining</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item, i) => {
              const stock = item.mappingCount > 0 && item.stock !== null ? item.stock : null;
              const ordered = item.orderedQty ?? 0;
              const remaining = stock !== null ? stock - ordered : null;
              return (
                <tr key={i} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-foreground text-xs">{item.productName}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-mono text-xs text-foreground">
                    {ordered > 0 ? ordered.toFixed(ordered % 1 === 0 ? 0 : 2) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-mono text-xs">
                    {stock !== null ? <span className="text-foreground">{stock}</span> : <span className="text-muted-foreground">Unmapped</span>}
                  </td>
                  <td className={cn("px-4 py-2.5 text-right tabular-nums font-mono text-xs font-semibold",
                    remaining === null ? "text-muted-foreground font-normal" : remaining < 0 ? "text-red-600" : remaining === 0 ? "text-amber-600" : "text-green-700"
                  )}>
                    {remaining === null ? "—" : remaining > 0 ? `+${remaining}` : remaining}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function SummarySubTab({ secret, gb }: { secret: string; gb: GroupBuy }) {
  type GRow = { productId: string; productName: string; totalQty: number; unitPrice: number; totalValue: number; orderCount: number };
  type GBreakdown = { orderId: string; orderCode: string; telegramUsername: string; quantity: number; unitPrice: number; lineTotal: number; orderStatus: string; paymentStatus: string; notes: string | null };
  type Leg = { id: string; countryName: string; countryCode: string };

  const [rows, setRows] = useState<GRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("Submitted");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [countryLegFilter, setCountryLegFilter] = useState("all");
  const [accountCountryFilter, setAccountCountryFilter] = useState("all");
  const [reshipperFilter, setReshipperFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<"value_desc" | "az" | "qty_desc">("value_desc");
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<GBreakdown[]>([]);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [legs, setLegs] = useState<Leg[]>([]);
  const [memberCountries, setMemberCountries] = useState<string[]>([]);
  const [reshippers, setReshippers] = useState<string[]>([]);

  const ORDER_STATUSES = ["Submitted", "Confirmed", "Shipped", "Delivered"];

  useEffect(() => {
    if (gb.countryLegsEnabled) {
      fetch(apiUrl(`/admin/group-buys/${gb.id}/country-legs`), { headers: { "x-admin-secret": secret } })
        .then(r => r.ok ? r.json() : [])
        .then(setLegs)
        .catch(() => {});
    }
    fetch(apiUrl(`/admin/group-buys/${gb.id}/member-countries`), { headers: { "x-admin-secret": secret } })
      .then(r => r.ok ? r.json() : [])
      .then(setMemberCountries)
      .catch(() => {});
    fetch(apiUrl(`/admin/group-buys/${gb.id}/reshippers`), { headers: { "x-admin-secret": secret } })
      .then(r => r.ok ? r.json() : [])
      .then((data: { reshipperUsername: string }[]) => setReshippers(data.map(d => d.reshipperUsername)))
      .catch(() => {});
  }, [gb.id, gb.countryLegsEnabled, secret]);

  const buildParams = useCallback((extra: Record<string, string> = {}) => {
    const params = new URLSearchParams({ status: statusFilter });
    if (paymentFilter !== "all") params.set("paymentStatus", paymentFilter);
    if (countryLegFilter !== "all") params.set("countryLegId", countryLegFilter);
    if (accountCountryFilter !== "all") params.set("accountCountry", accountCountryFilter);
    if (reshipperFilter !== "all") params.set("reshipper", reshipperFilter);
    for (const [k, v] of Object.entries(extra)) params.set(k, v);
    return params;
  }, [statusFilter, paymentFilter, countryLegFilter, accountCountryFilter, reshipperFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    setExpandedProduct(null);
    setBreakdown([]);
    const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}/summary?${buildParams()}`), { headers: { "x-admin-secret": secret } });
    setRows(res.ok ? await res.json() : []);
    setLoading(false);
  }, [gb.id, secret, buildParams]);

  useEffect(() => { load(); }, [load]);

  const toggleProduct = useCallback(async (productName: string) => {
    if (expandedProduct === productName) { setExpandedProduct(null); setBreakdown([]); return; }
    setExpandedProduct(productName);
    setBreakdownLoading(true);
    const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}/summary/breakdown?${buildParams({ productName })}`), { headers: { "x-admin-secret": secret } });
    setBreakdown(res.ok ? await res.json() : []);
    setBreakdownLoading(false);
  }, [expandedProduct, gb.id, secret, buildParams]);

  const totalValue = rows.reduce((s, r) => s + Number(r.totalValue), 0);
  const totalQty = rows.reduce((s, r) => s + Number(r.totalQty), 0);

  const displayRows = sortOrder === "az"
    ? [...rows].sort((a, b) => a.productName.localeCompare(b.productName))
    : sortOrder === "qty_desc"
    ? [...rows].sort((a, b) => Number(b.totalQty) - Number(a.totalQty))
    : rows;

  const handleDownload = () => {
    if (rows.length === 0) return;
    const lines = [
      `Order Summary — ${gb.name} — ${statusFilter === "all" ? "All Orders" : statusFilter}`,
      `Generated: ${new Date().toLocaleString("en-GB")}`,
      "─".repeat(50), "",
      ...rows.map(r => `${r.productName} ×${Number(r.totalQty)} = ${gb.currency ?? "GBP"} ${Number(r.totalValue).toFixed(2)}`),
      "", "─".repeat(50),
      `Total: ${Number(totalQty)} units · ${gb.currency ?? "GBP"} ${Number(totalValue).toFixed(2)}`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `summary-${gb.name.replace(/\s+/g, "-").toLowerCase()}-${statusFilter}-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center flex-wrap">
        <select
          className="h-9 rounded-lg border border-border bg-background px-3 text-xs focus:outline-none"
          value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="all">All orders</option>
          {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          className="h-9 rounded-lg border border-border bg-background px-3 text-xs focus:outline-none"
          value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)}
        >
          <option value="all">All payments</option>
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
          <option value="pending_confirmation">Pending confirmation</option>
        </select>
        {gb.countryLegsEnabled && legs.length > 0 && (
          <select
            className="h-9 rounded-lg border border-border bg-background px-3 text-xs focus:outline-none"
            value={countryLegFilter} onChange={e => setCountryLegFilter(e.target.value)}
          >
            <option value="all">All legs</option>
            {legs.map(l => <option key={l.id} value={l.id}>{l.countryName} ({l.countryCode})</option>)}
          </select>
        )}
        {memberCountries.length > 0 && (
          <select
            className="h-9 rounded-lg border border-border bg-background px-3 text-xs focus:outline-none"
            value={accountCountryFilter} onChange={e => setAccountCountryFilter(e.target.value)}
          >
            <option value="all">All countries</option>
            {memberCountries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        {reshippers.length > 0 && (
          <select
            className="h-9 rounded-lg border border-border bg-background px-3 text-xs focus:outline-none"
            value={reshipperFilter} onChange={e => setReshipperFilter(e.target.value)}
          >
            <option value="all">All reshippers</option>
            {reshippers.map(r => <option key={r} value={r}>@{r}</option>)}
          </select>
        )}
        <select
          className="h-9 rounded-lg border border-border bg-background px-3 text-xs focus:outline-none"
          value={sortOrder} onChange={e => setSortOrder(e.target.value as "value_desc" | "az" | "qty_desc")}
        >
          <option value="value_desc">Highest value</option>
          <option value="qty_desc">Highest qty</option>
          <option value="az">A–Z</option>
        </select>
        <button onClick={load} className="h-9 w-9 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
        {rows.length > 0 && (
          <button onClick={handleDownload} className="h-9 flex items-center gap-1.5 px-3 rounded-lg text-xs font-semibold border border-border hover:bg-muted">
            <Download className="w-3.5 h-3.5" />Download .txt
          </button>
        )}
      </div>

      {rows.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Products", value: String(rows.length) },
              { label: "Total Qty", value: String(Number(totalQty)) },
              { label: "Total Value", value: `${gb.currency ?? "GBP"} ${Number(totalValue).toFixed(2)}` },
            ].map(s => (
              <div key={s.label} className="p-3 rounded-xl text-center border border-border bg-muted/30">
                <p className="text-sm font-bold">{s.value}</p>
                <p className="text-[10px] mt-0.5 text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl overflow-hidden border border-border">
            <div className="px-4 py-2.5 bg-muted/40">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Order List — tap a product to see who ordered it</p>
            </div>
            {displayRows.map(r => {
              const isExpanded = expandedProduct === r.productName;
              return (
                <div key={r.productName} className="border-t border-border">
                  <button
                    className="w-full flex items-center justify-between gap-4 px-4 py-3 text-xs text-left transition-colors hover:bg-muted/20"
                    style={{ background: isExpanded ? "hsl(var(--muted)/0.4)" : "transparent" }}
                    onClick={() => toggleProduct(r.productName)}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      {isExpanded
                        ? <ChevronUp className="w-3 h-3 shrink-0 text-orange-500" />
                        : <ChevronDown className="w-3 h-3 shrink-0 text-muted-foreground" />}
                      <span className="font-semibold truncate">{r.productName}</span>
                      <span className="shrink-0 text-muted-foreground">×{Number(r.totalQty)}</span>
                    </span>
                    <span className="font-bold shrink-0 tabular-nums">{gb.currency ?? "GBP"} {Number(r.totalValue).toFixed(2)}</span>
                  </button>
                  {isExpanded && (
                    <div className="px-4 py-3 bg-muted/20">
                      {breakdownLoading ? (
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <Loader2 className="w-3 h-3 animate-spin" />Loading…
                        </div>
                      ) : breakdown.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground">No orders found.</p>
                      ) : (
                        <div className="space-y-2">
                          {breakdown.map((b, i) => {
                            const isPaid = b.paymentStatus === "confirmed" || b.paymentStatus === "test_confirmed";
                            const isPending = b.paymentStatus === "pending_confirmation";
                            return (
                              <div key={i} className="space-y-0.5 text-[11px]">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                    <span className="font-mono shrink-0 text-muted-foreground">#{b.orderCode}</span>
                                    <span className="font-semibold truncate">{b.telegramUsername}</span>
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0" style={{
                                      background: b.orderStatus === "Submitted" ? "rgba(245,158,11,0.1)" : b.orderStatus === "Confirmed" ? "rgba(22,163,74,0.1)" : "rgba(100,116,139,0.1)",
                                      color: b.orderStatus === "Submitted" ? "#D97706" : b.orderStatus === "Confirmed" ? "#16A34A" : "hsl(var(--muted-foreground))",
                                    }}>{b.orderStatus}</span>
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0" style={{
                                      background: isPaid ? "rgba(22,163,74,0.1)" : isPending ? "rgba(59,130,246,0.1)" : "rgba(100,116,139,0.1)",
                                      color: isPaid ? "#16A34A" : isPending ? "#3B82F6" : "hsl(var(--muted-foreground))",
                                    }}>{isPaid ? "Paid" : isPending ? "Pending" : "Unpaid"}</span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0 font-mono">
                                    <span className="text-muted-foreground">×{Number(b.quantity)}</span>
                                    <span className="font-bold">{gb.currency ?? "GBP"} {Number(b.lineTotal).toFixed(2)}</span>
                                  </div>
                                </div>
                                {b.notes && (
                                  <p className="text-[10px] pl-1 italic text-muted-foreground">💬 {b.notes}</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            <div className="px-4 py-3 flex justify-between font-bold text-xs border-t border-border bg-muted/40">
              <span>Total</span>
              <span className="tabular-nums">{gb.currency ?? "GBP"} {totalValue.toFixed(2)}</span>
            </div>
          </div>
        </>
      )}
      {rows.length === 0 && <div className="text-center py-16 text-xs text-muted-foreground">No orders found for this filter.</div>}
      <GbCoverageSection secret={secret} gbId={gb.id} />
    </div>
  );
}

// ─── Broadcast Sub-tab ────────────────────────────────────────────────────────
function BroadcastSubTab({ secret, gb }: { secret: string; gb: GroupBuy }) {
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
function LegShippingCalcSubTab({ secret, gb }: { secret: string; gb: GroupBuy }) {
  const [allOrders, setAllOrders] = useState<GbOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReshipper, setSelectedReshipper] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState("Submitted");

  // ── Split mode state ──────────────────────────────────────────
  const [mode, setMode] = useState<"split" | "direct">("split");
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [totalCost, setTotalCost] = useState("");
  const [equalPct, setEqualPct] = useState(50);
  const weightPct = 100 - equalPct;
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<{ message: string; breakdown: { orderId: string; username: string; vendorShipping: number }[] } | null>(null);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<{ updated: number; message: string } | null>(null);

  // ── Direct mode state ─────────────────────────────────────────
  const [directAmounts, setDirectAmounts] = useState<Record<string, string>>({});
  const [directApplying, setDirectApplying] = useState(false);
  const [directResult, setDirectResult] = useState<{ message: string; breakdown: { orderId: string; username: string; vendorShipping: number }[] } | null>(null);

  // GB-assigned reshippers
  const [gbReshippers, setGbReshippers] = useState<Array<{ reshipperUsername: string }>>([]);

  useEffect(() => {
    fetch(apiUrl(`/admin/group-buys/${gb.id}/orders`), { headers: { "x-admin-secret": secret } })
      .then(r => r.ok ? r.json() : [])
      .then((ordersData: GbOrder[]) => {
        setAllOrders(ordersData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [gb.id, secret]);

  useEffect(() => {
    fetch(apiUrl(`/admin/group-buys/${gb.id}/reshippers`), { headers: { "x-admin-secret": secret } })
      .then(r => r.ok ? r.json() : [])
      .then((data: Array<{ reshipperUsername: string }>) => setGbReshippers(data))
      .catch(() => {});
  }, [gb.id, secret]);

  // Reset exclusions when reshipper filter, status, or loaded orders change;
  // pre-exclude direct-to-home orders so they appear in the list but don't contribute to the split
  useEffect(() => {
    const dthIds = new Set(
      allOrders
        .filter(o =>
          o.directShippingRequested &&
          o.status === statusFilter &&
          (selectedReshipper === "all" || o.reshipperUsername === selectedReshipper)
        )
        .map(o => o.id)
    );
    setExcludedIds(dthIds);
    setApplyResult(null);
    setDirectResult(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedReshipper, statusFilter, allOrders]);

  // Reshippers assigned to this GB
  const availableReshippers = gbReshippers.map(r => r.reshipperUsername).filter(Boolean).sort() as string[];

  const legOrders = allOrders.filter(o =>
    o.status === statusFilter &&
    (selectedReshipper === "all" ? true : o.reshipperUsername === selectedReshipper)
  );

  // Pre-fill direct amounts whenever the order set changes
  useEffect(() => {
    setDirectAmounts(prev => {
      const next: Record<string, string> = {};
      for (const o of legOrders) {
        next[o.id] = prev[o.id] !== undefined ? prev[o.id] : (o.vendorShipping > 0 ? String(o.vendorShipping) : "");
      }
      return next;
    });
    setDirectResult(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legOrders.map(o => o.id).join(","), statusFilter, selectedReshipper]);

  // ── Split mode helpers ────────────────────────────────────────
  const kitCount = (o: GbOrder) => Math.max(1, o.lineItems.reduce((s, li) => s + li.quantity, 0));
  const includedOrders = legOrders.filter(o => !excludedIds.has(o.id));
  const totalKits = includedOrders.reduce((s, o) => s + kitCount(o), 0);
  const totalCostNum = parseFloat(totalCost) || 0;

  const calcShipping = (o: GbOrder): number => {
    if (excludedIds.has(o.id)) return 0;
    const N = includedOrders.length;
    if (N === 0 || totalCostNum === 0) return 0;
    const equalShare = totalCostNum * (equalPct / 100) / N;
    const myKits = kitCount(o);
    const weightedShare = totalKits > 0 ? totalCostNum * (weightPct / 100) * (myKits / totalKits) : 0;
    return Math.round((equalShare + weightedShare) * 100) / 100;
  };

  const totalCalc = includedOrders.reduce((s, o) => s + calcShipping(o), 0);
  const roundingDiff = Math.abs(totalCalc - totalCostNum);

  const applySplit = async () => {
    if (!confirm(`Write split shipping amounts to ${legOrders.length} orders? This overwrites their current vendor shipping values.`)) return;
    setApplying(true);
    setApplyResult(null);
    try {
      const breakdown: { orderId: string; username: string; vendorShipping: number }[] = [];
      for (const order of legOrders) {
        const shipping = calcShipping(order);
        await fetch(apiUrl(`/admin/orders/${order.id}`), {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-admin-secret": secret },
          body: JSON.stringify({ vendorShipping: shipping }),
        });
        breakdown.push({ orderId: order.id, username: order.telegramUsername, vendorShipping: shipping });
      }
      setApplyResult({ message: `Applied to ${legOrders.length} orders`, breakdown });
    } finally { setApplying(false); }
  };

  // ── Direct mode helpers ───────────────────────────────────────
  const directTotal = legOrders.reduce((s, o) => s + (parseFloat(directAmounts[o.id] || "0") || 0), 0);
  const directOrdersWithAmount = legOrders.filter(o => (parseFloat(directAmounts[o.id] || "0") || 0) > 0).length;

  const applyDirect = async () => {
    const toApply = legOrders.filter(o => directAmounts[o.id] !== undefined);
    if (toApply.length === 0) return;
    if (!confirm(`Write manual shipping amounts to ${toApply.length} orders? Orders left blank will be set to $0.00.`)) return;
    setDirectApplying(true);
    setDirectResult(null);
    try {
      const breakdown: { orderId: string; username: string; vendorShipping: number }[] = [];
      for (const order of toApply) {
        const shipping = Math.round((parseFloat(directAmounts[order.id] || "0") || 0) * 100) / 100;
        await fetch(apiUrl(`/admin/orders/${order.id}`), {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-admin-secret": secret },
          body: JSON.stringify({ vendorShipping: shipping }),
        });
        breakdown.push({ orderId: order.id, username: order.telegramUsername, vendorShipping: shipping });
      }
      setDirectResult({ message: `Applied to ${toApply.length} orders`, breakdown });
    } finally { setDirectApplying(false); }
  };

  const runBackfill = async () => {
    const reshipperLabel = selectedReshipper === "all"
      ? "all orders in this GB"
      : `orders reshipped by @${selectedReshipper}`;
    if (!confirm(`This will mark a balance owed (equal to their vendor shipping) on all paid orders in ${reshipperLabel} where vendor shipping was added after payment. Continue?`)) return;
    setBackfilling(true);
    setBackfillResult(null);
    try {
      const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}/backfill-balance-due`), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ reshipperUsername: selectedReshipper === "all" ? undefined : selectedReshipper }),
      });
      const data = await res.json();
      setBackfillResult({ updated: data.updated ?? 0, message: data.message ?? "Done" });
      // Reload orders so balance owed pills appear
      fetch(apiUrl(`/admin/group-buys/${gb.id}/orders`), { headers: { "x-admin-secret": secret } })
        .then(r => r.ok ? r.json() : [])
        .then((d: GbOrder[]) => setAllOrders(d))
        .catch(() => {});
    } finally { setBackfilling(false); }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="mt-4 space-y-4">
      {/* Mode toggle */}
      <div className="flex rounded-xl border border-input overflow-hidden">
        <button
          type="button"
          onClick={() => { setMode("split"); setApplyResult(null); setDirectResult(null); }}
          className={cn(
            "flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition-colors",
            mode === "split" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted/50"
          )}
        >
          <Calculator className="w-4 h-4" />
          Vendor Shipping Split
        </button>
        <button
          type="button"
          onClick={() => { setMode("direct"); setApplyResult(null); setDirectResult(null); }}
          className={cn(
            "flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition-colors border-l border-input",
            mode === "direct" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted/50"
          )}
        >
          <PenLine className="w-4 h-4" />
          Direct Shipping
        </button>
      </div>

      {/* Reshipper + status selectors */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-semibold">Reshipper</Label>
          <select value={selectedReshipper}
            onChange={e => setSelectedReshipper(e.target.value)}
            className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
            <option value="all">All reshippers</option>
            {availableReshippers.map(r => <option key={r} value={r}>@{r}</option>)}
          </select>
          <p className="mt-1.5 text-[11px] text-muted-foreground">Direct-to-home orders excluded automatically</p>
        </div>
        <div>
          <Label className="text-xs font-semibold">Order Status</Label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
            {["Submitted", "confirmed", "test_confirmed", "pending_payment", "Processing", "Shipped"].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── SPLIT MODE ───────────────────────────────────────────── */}
      {mode === "split" && (
        <>
          <Card className="p-5 space-y-5">
            <h3 className="font-semibold text-base">Configure Shipping Split</h3>

            <div>
              <Label className="font-semibold text-sm">Total Vendor Shipping Cost ($)</Label>
              <Input
                type="number" min="0" step="0.01" placeholder="e.g. 150.00"
                value={totalCost} onChange={e => setTotalCost(e.target.value)}
                className="mt-2 rounded-xl h-12 text-base"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-sm">Equal portion</p>
                  <p className="text-xs text-muted-foreground">Same amount per order</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <input type="number" min="0" max="100" value={equalPct}
                    onChange={e => setEqualPct(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="w-16 h-9 rounded-full border border-input bg-background px-2 text-sm text-center font-semibold focus:outline-none focus:ring-1 focus:ring-ring" />
                  <span className="text-sm font-semibold text-muted-foreground">%</span>
                </div>
              </div>
              <input type="range" min="0" max="100" value={equalPct}
                onChange={e => setEqualPct(parseInt(e.target.value))}
                className="w-full h-2 rounded-full cursor-pointer accent-blue-600" />
            </div>

            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-sm">Quantity-weighted</p>
                  <p className="text-xs text-muted-foreground">More items = more shipping</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <input type="number" readOnly value={weightPct}
                    className="w-16 h-9 rounded-full border border-input bg-muted/40 px-2 text-sm text-center font-semibold focus:outline-none" />
                  <span className="text-sm font-semibold text-muted-foreground">%</span>
                </div>
              </div>
              <input type="range" min="0" max="100" value={weightPct}
                onChange={e => setEqualPct(100 - parseInt(e.target.value))}
                className="w-full h-2 rounded-full cursor-pointer accent-blue-900" />
            </div>

            <div className={cn("rounded-xl px-4 py-2 text-sm font-semibold",
              equalPct + weightPct === 100 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600")}>
              {equalPct}% + {weightPct}% = {equalPct + weightPct}% {equalPct + weightPct === 100 ? "✓" : "⚠ must equal 100"}
            </div>
          </Card>

          {legOrders.length > 0 ? (
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold">Orders <span className="text-muted-foreground font-normal">({legOrders.length})</span></p>
                <p className="text-[11px] text-muted-foreground">Uncheck to exclude from split</p>
              </div>

              <div className="grid grid-cols-[20px_1fr_auto_auto] gap-x-3 gap-y-0 text-[10px] font-bold text-muted-foreground uppercase tracking-wide px-1 pb-1 border-b border-border">
                <span></span>
                <span>Member</span>
                <span className="text-right">Kits</span>
                <span className="text-right">Shipping</span>
              </div>

              <div className="space-y-0.5 max-h-72 overflow-y-auto">
                {legOrders.map(order => {
                  const excluded = excludedIds.has(order.id);
                  const kits = kitCount(order);
                  const shipping = calcShipping(order);
                  return (
                    <div key={order.id}
                      className={cn("grid grid-cols-[20px_1fr_auto_auto] gap-x-3 items-start px-1 py-1.5 rounded-lg transition-colors",
                        excluded ? "opacity-40" : "hover:bg-muted/30")}>
                      <input type="checkbox" checked={!excluded}
                        onChange={e => setExcludedIds(prev => {
                          const n = new Set(prev);
                          e.target.checked ? n.delete(order.id) : n.add(order.id);
                          return n;
                        })}
                        className="rounded mt-0.5" />
                      <div className="min-w-0">
                        <span className="text-sm truncate block">@{order.telegramUsername}</span>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {order.directShippingRequested && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 leading-tight">DTH</span>
                          )}
                          {order.paymentStatus === "confirmed" && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 leading-tight">Paid</span>
                          )}
                          {(order.adminFee ?? 0) > 0 && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 leading-tight">
                              {order.adminFeeLabel ?? "Admin Fee"}
                            </span>
                          )}
                          {order.notes && (
                            <span className="text-[9px] text-amber-700 bg-amber-50 rounded-full px-1.5 py-0.5 border border-amber-200 leading-tight">{order.notes}</span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground text-right pt-0.5">{kits}</span>
                      <span className={cn("text-sm font-semibold text-right tabular-nums w-16 pt-0.5",
                        excluded ? "text-muted-foreground" : "")}>
                        {excluded ? "—" : shipping.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-border pt-3 space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Included orders</span>
                  <span className="font-semibold text-foreground">{includedOrders.length} / {legOrders.length}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Total kits (included)</span>
                  <span className="font-semibold text-foreground">{totalKits}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold pt-1">
                  <span>Calculated total</span>
                  <span className={roundingDiff > 0.03 ? "text-orange-500" : "text-green-600"}>{totalCalc.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Target total</span>
                  <span className="font-semibold">{totalCostNum.toFixed(2)}</span>
                </div>
                {roundingDiff > 0.03 && (
                  <p className="text-[11px] text-orange-500">Rounding difference: {(totalCalc - totalCostNum).toFixed(2)} (normal with many orders)</p>
                )}
              </div>

              <button
                type="button"
                onClick={() => void applySplit()}
                disabled={applying || totalCostNum === 0}
                className="w-full h-12 rounded-2xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
                style={{ background: "rgba(115,108,210,0.9)" }}
              >
                {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
                {applying ? "Applying…" : "Apply Shipping Split"}
              </button>
            </Card>
          ) : (
            <Card className="p-6 text-center space-y-2">
              <Calculator className="w-7 h-7 text-muted-foreground mx-auto" />
              <p className="text-sm font-semibold">No orders found</p>
              <p className="text-xs text-muted-foreground">Select a reshipper and order status to see orders for calculation.</p>
            </Card>
          )}

          {applyResult && (
            <Card className="p-4 space-y-2 border-green-200 bg-green-50">
              <p className="text-sm font-semibold text-green-700 flex items-center gap-1.5">
                <Check className="w-4 h-4" />{applyResult.message}
              </p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {applyResult.breakdown.map(b => (
                  <div key={b.orderId} className="flex justify-between text-xs text-green-800">
                    <span>@{b.username}</span>
                    <span className="font-semibold">{b.vendorShipping.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {/* ── DIRECT MODE ──────────────────────────────────────────── */}
      {mode === "direct" && (
        <>
          {legOrders.length > 0 ? (
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold">
                  Orders <span className="text-muted-foreground font-normal">({legOrders.length})</span>
                </p>
                <p className="text-[11px] text-muted-foreground">Enter each order's shipping manually</p>
              </div>

              <div className="grid grid-cols-[1fr_120px] gap-x-3 gap-y-0 text-[10px] font-bold text-muted-foreground uppercase tracking-wide px-1 pb-1 border-b border-border">
                <span>Member</span>
                <span className="text-right">Shipping ($)</span>
              </div>

              <div className="space-y-1 max-h-96 overflow-y-auto pr-0.5">
                {legOrders.map(order => {
                  const val = directAmounts[order.id] ?? "";
                  const kits = kitCount(order);
                  return (
                    <div key={order.id} className="grid grid-cols-[1fr_120px] gap-x-3 items-start px-1 py-1.5 rounded-lg hover:bg-muted/30">
                      <div className="min-w-0">
                        <span className="text-sm truncate block">@{order.telegramUsername}</span>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {order.directShippingRequested && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 leading-tight">DTH</span>
                          )}
                          {order.paymentStatus === "confirmed" && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 leading-tight">Paid</span>
                          )}
                          {(order.adminFee ?? 0) > 0 && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 leading-tight">
                              {order.adminFeeLabel ?? "Admin Fee"}
                            </span>
                          )}
                          <span className="text-[9px] text-muted-foreground leading-tight">{kits} kit{kits !== 1 ? "s" : ""}</span>
                          {order.notes && (
                            <span className="text-[9px] text-amber-700 bg-amber-50 rounded-full px-1.5 py-0.5 border border-amber-200 leading-tight">{order.notes}</span>
                          )}
                        </div>
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={val}
                        onChange={e => setDirectAmounts(prev => ({ ...prev, [order.id]: e.target.value }))}
                        className="w-full h-9 rounded-lg border border-input bg-background px-2 text-sm text-right font-semibold tabular-nums focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-border pt-3 space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Orders with amount set</span>
                  <span className="font-semibold text-foreground">{directOrdersWithAmount} / {legOrders.length}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold pt-0.5">
                  <span>Total shipping</span>
                  <span className="text-blue-700">${directTotal.toFixed(2)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void applyDirect()}
                disabled={directApplying || legOrders.length === 0}
                className="w-full h-12 rounded-2xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
                style={{ background: "rgba(115,108,210,0.9)" }}
              >
                {directApplying ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenLine className="w-4 h-4" />}
                {directApplying ? "Applying…" : `Apply to ${legOrders.length} Orders`}
              </button>
            </Card>
          ) : (
            <Card className="p-6 text-center space-y-2">
              <PenLine className="w-7 h-7 text-muted-foreground mx-auto" />
              <p className="text-sm font-semibold">No orders found</p>
              <p className="text-xs text-muted-foreground">Select a reshipper and order status to see orders.</p>
            </Card>
          )}

          {directResult && (
            <Card className="p-4 space-y-2 border-green-200 bg-green-50">
              <p className="text-sm font-semibold text-green-700 flex items-center gap-1.5">
                <Check className="w-4 h-4" />{directResult.message}
              </p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {directResult.breakdown.map(b => (
                  <div key={b.orderId} className="flex justify-between text-xs text-green-800">
                    <span>@{b.username}</span>
                    <span className="font-semibold">${b.vendorShipping.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {/* ── Fix existing orders that were paid before vendor shipping was set ── */}
      <Card className="p-4 space-y-3 border-orange-200 bg-orange-50">
        <div>
          <p className="text-sm font-semibold text-orange-800">Fix previously paid orders</p>
          <p className="text-xs text-orange-700 mt-0.5">
            If vendor shipping was applied <em>after</em> customers already paid, their orders show as "Paid" but they still owe the shipping amount. This marks the balance owed on affected orders
            {selectedReshipper === "all" ? " across all reshippers" : ` reshipped by @${selectedReshipper}`}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void runBackfill()}
          disabled={backfilling}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 transition-colors"
        >
          {backfilling ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
          {backfilling ? "Running…" : selectedReshipper === "all" ? "Mark balance owed — all reshippers" : `Mark balance owed — @${selectedReshipper}`}
        </button>
        {backfillResult && (
          <p className={cn("text-xs font-medium", backfillResult.updated > 0 ? "text-orange-800" : "text-green-700")}>
            {backfillResult.updated > 0 ? `✓ ${backfillResult.message}` : `✓ ${backfillResult.message}`}
          </p>
        )}
      </Card>
    </div>
  );
}

// ─── GB Detail View ───────────────────────────────────────────
type DetailTab = "details" | "products" | "delivery" | "members" | "waitlist" | "payment" | "parcels" | "orders" | "testing" | "intlshipping" | "adminfeecountry" | "pnl" | "countrylegs" | "reshippers" | "sharedshipping" | "rules" | "summary" | "broadcast" | "shippingcalc" | "fulfilment" | "qrcodes";

function GBDetail({ secret, gb, onBack, onUpdate, onClone }: {
  secret: string;
  gb: GroupBuy;
  onBack: () => void;
  onUpdate: (gb: GroupBuy) => void;
  onClone: (gb: GroupBuy) => void;
}) {
  const [activeTab, setActiveTab] = useState<DetailTab>(() => {
    try {
      const saved = sessionStorage.getItem("adm_gb_state");
      if (saved) {
        const { gbId, tab } = JSON.parse(saved);
        if (gbId === gb.id && tab) return tab as DetailTab;
      }
    } catch {}
    return "details";
  });
  const [currentGb, setCurrentGb] = useState(gb);
  const [cloning, setCloning] = useState(false);
  const [unroutedCount, setUnroutedCount] = useState(0);

  const handleUpdate = (updated: GroupBuy) => {
    setCurrentGb(updated);
    onUpdate(updated);
  };

  const handleClone = async () => {
    setCloning(true);
    const res = await fetch(apiUrl(`/admin/group-buys/${currentGb.id}/clone`), { method: "POST", headers: { "x-admin-secret": secret } });
    if (res.ok) { const data = await res.json(); onClone(data); }
    setCloning(false);
  };

  const TABS: { id: DetailTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: "summary", label: "Summary", icon: BarChart3 },
    { id: "details", label: "Details", icon: Settings },
    { id: "products", label: "Products", icon: Package },
    { id: "orders", label: "Orders", icon: ShoppingCart },
    { id: "members", label: "Members", icon: Users },
    { id: "waitlist", label: "Waitlist", icon: Clock },
    { id: "payment", label: "Payments", icon: CreditCard },
    { id: "parcels", label: "Parcels", icon: Box },
    { id: "delivery", label: "Delivery", icon: Truck },
    { id: "intlshipping", label: "Intl Shipping", icon: Ship },
    { id: "sharedshipping" as DetailTab, label: "Shared Shipping", icon: Navigation },
    { id: "adminfeecountry", label: "Fee by Country", icon: DollarSign },
    { id: "pnl", label: "P&L", icon: TrendingUp },
    { id: "reshippers" as DetailTab, label: "Reshippers", icon: UserCheck },
    { id: "countrylegs" as DetailTab, label: "Country Legs", icon: Globe },
    { id: "shippingcalc" as DetailTab, label: "Leg Calc", icon: Calculator },
    { id: "testing", label: "Testing", icon: TestTube },
    { id: "rules" as DetailTab, label: "Rules", icon: Shield },
    { id: "broadcast", label: "Broadcast", icon: Send },
    { id: "fulfilment" as DetailTab, label: "Fulfilment", icon: Package },
    { id: "qrcodes" as DetailTab, label: "QR Codes", icon: QrCode },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-semibold text-base truncate">{currentGb.name}</h2>
            <StatusBadge status={currentGb.status} />
            {currentGb.organiserId && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(91,141,239,0.12)", color: "#5B8DEF" }}>
                @{currentGb.organiserId}
              </span>
            )}
          </div>
          {currentGb.closeDate && (
            <p className="text-xs text-muted-foreground">
              Closes {new Date(currentGb.closeDate).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
            </p>
          )}
        </div>
        <OpenAsOrganiserButton secret={secret} gbId={currentGb.id} />

        <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={handleClone} disabled={cloning}>
          {cloning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
          Clone
        </Button>
      </div>

      <div className="flex gap-1 border-b border-border pb-0 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); try { sessionStorage.setItem("adm_gb_state", JSON.stringify({ gbId: currentGb.id, tab: tab.id })); } catch {} }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap",
              activeTab === tab.id
                ? "border-orange-200 text-orange-500"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
            {tab.id === "fulfilment" && unroutedCount > 0 && (
              <span className="ml-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                {unroutedCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === "details" && <DetailsSubTab secret={secret} gb={currentGb} onUpdate={handleUpdate} />}
          {activeTab === "products" && <ProductsSubTab secret={secret} gb={currentGb} />}
          {activeTab === "delivery" && <DeliveryMethodsSubTab secret={secret} gb={currentGb} onUpdate={handleUpdate} />}
          {activeTab === "members" && <MembersSubTab secret={secret} gb={currentGb} />}
          {activeTab === "waitlist" && <WaitlistSubTab secret={secret} gb={currentGb} />}
          {activeTab === "payment" && <PaymentStatusSubTab secret={secret} gb={currentGb} />}
          {activeTab === "parcels" && <ParcelsSubTab secret={secret} gb={currentGb} />}
          {activeTab === "orders" && <OrdersSubTab secret={secret} gb={currentGb} />}
          {activeTab === "testing" && <TestingSubTab secret={secret} gb={currentGb} />}
          {activeTab === "intlshipping" && <IntlShippingTab secret={secret} groupBuyId={currentGb.id} readonly={false} />}
          {activeTab === "adminfeecountry" && <AdminFeeCountriesSubTab secret={secret} gb={currentGb} onUpdate={handleUpdate} />}
          {activeTab === "pnl" && <PnlSubTab secret={secret} gb={currentGb} />}
          {activeTab === "countrylegs" && (
            currentGb.countryLegsEnabled
              ? <AdminCountryLegsSection secret={secret} gbId={currentGb.id} currency={currentGb.currency ?? "GBP"} />
              : (
                <Card className="p-6 text-center space-y-2">
                  <Globe className="w-8 h-8 text-muted-foreground mx-auto" />
                  <p className="text-sm font-semibold">Country Legs not enabled</p>
                  <p className="text-xs text-muted-foreground">Enable "Country Sub-groups" in the Details tab to manage per-country legs, invite codes, and reshipper assignments for this group buy.</p>
                </Card>
              )
          )}
          {activeTab === "reshippers" && <AdminReshippersSubTab secret={secret} gbId={currentGb.id} />}
          {activeTab === "sharedshipping" && <AdminSharedShippingSubTab secret={secret} gb={currentGb} onUpdate={handleUpdate} />}
          {activeTab === "rules" && <RulesetEditorPanel secret={secret} />}
          {activeTab === "summary" && <SummarySubTab secret={secret} gb={currentGb} />}
          {activeTab === "broadcast" && <BroadcastSubTab secret={secret} gb={currentGb} />}
          {activeTab === "shippingcalc" && <LegShippingCalcSubTab secret={secret} gb={currentGb} />}
          {activeTab === "fulfilment" && (
            <AdminGbFulfilment
              secret={secret}
              gbId={currentGb.id}
              currency={currentGb.currency ?? "GBP"}
              onUnroutedCount={setUnroutedCount}
            />
          )}
          {activeTab === "qrcodes" && <GbQrCodesPanel gbId={currentGb.id} mode="admin" adminSecret={secret} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────
const GB_STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  active: "bg-green-100 text-green-700",
  closed: "bg-orange-100 text-orange-700",
  archived: "bg-gray-100 text-gray-500",
};

function CopyIdBadge({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    navigator.clipboard?.writeText(id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }).catch(() => {});
  };
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleCopy}
      onKeyDown={e => e.key === "Enter" && handleCopy(e as unknown as React.MouseEvent)}
      title="Copy unique join ID to clipboard"
      className="mt-1 flex items-center gap-1.5 group w-fit cursor-pointer"
    >
      <span className="text-[10px] font-mono text-muted-foreground/60 truncate max-w-[180px]">{id}</span>
      {copied
        ? <Check className="w-3 h-3 text-green-500 shrink-0" />
        : <Copy className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 transition-colors" />
      }
      <span className={`text-[10px] font-medium transition-colors ${copied ? "text-green-500" : "text-muted-foreground/50 group-hover:text-muted-foreground"}`}>
        {copied ? "Copied!" : "Copy ID"}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${GB_STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600"}`}>
      {status}
    </span>
  );
}

// ─── GB Form (create / edit) ───────────────────────────────────
type GBFormData = {
  name: string; description: string; status: string; closeDate: string;
  manufacturer: string; manufacturerCountry: string; invitePin: string;
  pinEnabled: boolean;
  currency: string; memberLimit: string; minMembers: string;
  maxKitsPerCustomer: string; maxKitsTotal: string; hiddenFromList: boolean;
  sortOrder: string; labTestSupplier: string;
  adminFeeEnabled: boolean; adminFeeAmount: string; adminFeeLabel: string;
  allowedCountries: string[];
  excludedCountries: string[];
  blockedAccounts: string[];
};

function GBForm({ secret, initial, hideStatus, onSave, onCancel }: {
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
    adminFeeEnabled: (initial?.adminFeeEnabled ?? false) as boolean,
    adminFeeAmount: initial?.adminFeeAmount != null ? String(initial.adminFeeAmount) : "",
    adminFeeLabel: (initial?.adminFeeLabel ?? "") as string,
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
      adminFeeEnabled: form.adminFeeEnabled,
      adminFeeAmount: form.adminFeeAmount !== "" ? parseFloat(form.adminFeeAmount) : null,
      adminFeeLabel: form.adminFeeLabel.trim() || null,
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

  const toggle = (field: "hiddenFromList" | "adminFeeEnabled") =>
    setForm(p => ({ ...p, [field]: !p[field] }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label className="text-xs">Name *</Label>
        <Input value={form.name} onChange={e => f("name", e.target.value)} placeholder="Group Buy Name" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Description</Label>
        <textarea rows={2} value={form.description} onChange={e => f("description", e.target.value)}
          placeholder="Describe this group buy…"
          className="w-full rounded-xl border border-input bg-background px-4 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none" />
      </div>
      {!hideStatus && (
        <div className="space-y-1">
          <Label className="text-xs">Status</Label>
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
          <Label className="text-xs">Close Date</Label>
          <Input type="datetime-local" value={form.closeDate} onChange={e => f("closeDate", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Currency</Label>
          <select value={form.currency} onChange={e => f("currency", e.target.value)}
            className="w-full h-9 rounded-xl border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary">
            {["GBP", "USD", "EUR"].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Manufacturer</Label>
          <Input value={form.manufacturer} onChange={e => f("manufacturer", e.target.value)} placeholder="e.g. ChemLab Ltd" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Manufacturer Country</Label>
          <select value={form.manufacturerCountry} onChange={e => f("manufacturerCountry", e.target.value)}
            className="w-full h-9 rounded-xl border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="">— None —</option>
            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Invite PIN</Label>
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
          <Label className="text-xs">Sort Order</Label>
          <Input type="number" value={form.sortOrder} onChange={e => f("sortOrder", e.target.value)} placeholder="0" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Member Limit</Label>
          <Input type="number" min={1} value={form.memberLimit} onChange={e => f("memberLimit", e.target.value)} placeholder="Unlimited" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Min Members</Label>
          <Input type="number" min={1} value={form.minMembers} onChange={e => f("minMembers", e.target.value)} placeholder="None" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Max Kits / Customer</Label>
          <Input type="number" min={1} value={form.maxKitsPerCustomer} onChange={e => f("maxKitsPerCustomer", e.target.value)} placeholder="Unlimited" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Max Kits Total</Label>
          <Input type="number" min={1} value={form.maxKitsTotal} onChange={e => f("maxKitsTotal", e.target.value)} placeholder="Unlimited" />
        </div>
      </div>

      {/* Country Restrictions */}
      <div className="rounded-xl border border-border p-3 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Country Restrictions</p>
        <p className="text-[11px] text-muted-foreground">
          <strong>Allowed:</strong> only these countries can order (leave empty = all countries allowed).<br />
          <strong>Excluded:</strong> these countries are blocked from ordering.
        </p>
        {(["allowedCountries", "excludedCountries"] as const).map(field => (
          <div key={field} className="space-y-1.5">
            <Label className="text-xs">{field === "allowedCountries" ? "Allowed Countries" : "Excluded Countries"}</Label>
            {form[field].length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1">
                {form[field].map(c => (
                  <span key={c} className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: field === "allowedCountries" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)", color: field === "allowedCountries" ? "#16a34a" : "#dc2626" }}>
                    {COUNTRY_LIST.find(x => x.code === c.toUpperCase() || x.name === c)?.name ?? c}
                    <button type="button" className="hover:opacity-70"
                      onClick={() => setForm(p => ({ ...p, [field]: p[field].filter(x => x !== c) }))}>×</button>
                  </span>
                ))}
              </div>
            )}
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
              {COUNTRY_LIST.filter(c => !form[field].map(v => v.length === 2 ? v.toUpperCase() : (COUNTRY_LIST.find(x => x.name === v)?.code ?? v)).includes(c.code)).map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </div>
        ))}
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
        <Label className="text-xs">Lab Test Supplier</Label>
        <Input value={form.labTestSupplier} onChange={e => f("labTestSupplier", e.target.value)} placeholder="e.g. Janoshik" />
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => toggle("hiddenFromList")}
          className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${form.hiddenFromList ? "bg-primary" : "bg-muted-foreground/30"}`}>
          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.hiddenFromList ? "translate-x-[22px]" : "translate-x-0.5"}`} />
        </button>
        <label className="text-sm cursor-pointer" onClick={() => toggle("hiddenFromList")}>Hidden from public list</label>
      </div>
      <div className="rounded-xl border border-border p-3 space-y-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => toggle("adminFeeEnabled")}
            className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${form.adminFeeEnabled ? "bg-primary" : "bg-muted-foreground/30"}`}>
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.adminFeeEnabled ? "translate-x-[22px]" : "translate-x-0.5"}`} />
          </button>
          <label className="text-sm cursor-pointer" onClick={() => toggle("adminFeeEnabled")}>Admin Fee</label>
        </div>
        {form.adminFeeEnabled && (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Amount</Label>
              <Input type="number" min={0} step={0.01} value={form.adminFeeAmount} onChange={e => f("adminFeeAmount", e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Label</Label>
              <Input value={form.adminFeeLabel} onChange={e => f("adminFeeLabel", e.target.value)} placeholder="Admin Fee" />
            </div>
          </div>
        )}
      </div>
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
type GbOrderSummary = {
  id: string;
  code: string;
  telegramUsername: string;
  paymentStatus: string;
  grandTotal: number;
  status: string;
  currency: string | null;
};

const GB_ORDER_PAYMENT_COLORS: Record<string, string> = {
  confirmed: "text-green-600 bg-green-50 border-green-200",
  pending_confirmation: "text-amber-600 bg-amber-50 border-amber-200",
  unpaid: "text-slate-500 bg-slate-50 border-slate-200",
  failed: "text-red-600 bg-red-50 border-red-200",
  rejected: "text-red-600 bg-red-50 border-red-200",
  test_ready: "text-blue-600 bg-blue-50 border-blue-200",
  test_confirmed: "text-blue-600 bg-blue-50 border-blue-200",
};

function GBList({ secret, onSelect, onNew }: {
  secret: string;
  onSelect: (gb: GroupBuy) => void;
  onNew: () => void;
}) {
  const [gbs, setGbs] = useState<GroupBuy[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actioning, setActioning] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState<GroupBuy | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [openOrders, setOpenOrders] = useState<Set<string>>(new Set());
  const [ordersCache, setOrdersCache] = useState<Record<string, GbOrderSummary[]>>({});
  const [ordersLoading, setOrdersLoading] = useState<Record<string, boolean>>({});

  const loadGbs = useCallback(() => {
    setLoading(true);
    fetch(apiUrl("/admin/group-buys"), { headers: { "x-admin-secret": secret } })
      .then(r => r.json())
      .then(data => setGbs(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [secret]);

  useEffect(() => { loadGbs(); }, [loadGbs]);

  const filtered = search
    ? gbs.filter(gb => gb.name.toLowerCase().includes(search.toLowerCase()))
    : gbs;

  const toggleOrders = async (gbId: string) => {
    const next = new Set(openOrders);
    if (next.has(gbId)) {
      next.delete(gbId);
      setOpenOrders(next);
      return;
    }
    next.add(gbId);
    setOpenOrders(next);
    if (!ordersCache[gbId]) {
      setOrdersLoading(prev => ({ ...prev, [gbId]: true }));
      try {
        const res = await fetch(apiUrl(`/admin/group-buys/${gbId}/orders-summary`), { headers: { "x-admin-secret": secret } });
        const data: GbOrderSummary[] = await res.json();
        setOrdersCache(prev => ({ ...prev, [gbId]: data }));
      } catch {
        setOrdersCache(prev => ({ ...prev, [gbId]: [] }));
      } finally {
        setOrdersLoading(prev => { const n = { ...prev }; delete n[gbId]; return n; });
      }
    }
  };

  const patchGb = async (id: string, body: Record<string, unknown>, actionKey: string) => {
    setActioning(prev => ({ ...prev, [id]: actionKey }));
    try {
      const res = await fetch(apiUrl(`/admin/group-buys/${id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setActionError((d as any).error ?? "Action failed");
        return;
      }
      const updated = await res.json();
      setGbs(prev => prev.map(g => g.id === id ? { ...g, ...updated } : g));
    } finally {
      setActioning(prev => { const n = { ...prev }; delete n[id]; return n; });
    }
  };

  const deleteGb = async (gb: GroupBuy) => {
    setActioning(prev => ({ ...prev, [gb.id]: "delete" }));
    setConfirmDelete(null);
    try {
      const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}`), {
        method: "DELETE",
        headers: { "x-admin-secret": secret },
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError((d as any).error ?? "Delete failed");
        return;
      }
      setGbs(prev => prev.filter(g => g.id !== gb.id));
    } finally {
      setActioning(prev => { const n = { ...prev }; delete n[gb.id]; return n; });
    }
  };

  return (
    <div className="space-y-4">
      {actionError && (
        <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-900/10 px-4 py-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400 flex-1">{actionError}</p>
          <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {confirmDelete && (
        <div className="rounded-xl border border-red-300 bg-red-50 dark:bg-red-900/10 p-4 space-y-3">
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">
            Permanently delete "{confirmDelete.name}"?
          </p>
          <p className="text-xs text-red-600 dark:text-red-400">
            This cannot be undone. Group buys with orders cannot be deleted — archive them instead.
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="destructive" className="gap-1.5"
              onClick={() => deleteGb(confirmDelete)}
              disabled={!!actioning[confirmDelete.id]}>
              {actioning[confirmDelete.id] === "delete" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Delete
            </Button>
            <Button size="sm" variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search group buys…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button onClick={onNew} className="gap-1.5 shrink-0">
          <Plus className="w-4 h-4" />New
        </Button>
      </div>
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">
          {search ? "No group buys match your search." : "No group buys yet. Click New to create one."}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map(gb => {
            const busy = actioning[gb.id];
            const orderCount = (gb as any).orderCount as number ?? 0;
            const isOpen = openOrders.has(gb.id);
            const orders = ordersCache[gb.id] ?? [];
            const loadingOrders = ordersLoading[gb.id];
            return (
              <div key={gb.id} className={cn(
                "rounded-xl border border-border bg-white dark:bg-card transition-colors",
                gb.hiddenFromList && "opacity-60",
              )}>
                <div className="flex items-center gap-2 pr-2">
                  <button onClick={() => onSelect(gb)}
                    className="flex-1 text-left p-4 flex items-center gap-3 min-w-0 hover:bg-muted/30 rounded-l-xl transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-semibold text-sm truncate">{gb.name}</span>
                        <StatusBadge status={gb.status} />
                        {gb.hiddenFromList && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 px-1.5 py-0.5 rounded-full font-medium">hidden</span>
                        )}
                      </div>
                      {gb.closeDate && (
                        <p className="text-xs text-muted-foreground">
                          Closes {new Date(gb.closeDate as string).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                      )}
                      <CopyIdBadge id={gb.id} />
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </button>

                  <button
                    onClick={() => toggleOrders(gb.id)}
                    title="View orders"
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border shrink-0",
                      isOpen
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "text-muted-foreground border-border hover:bg-muted",
                    )}>
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>{orderCount}</span>
                    {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      title={gb.organiserOrderEditEnabled ? "Organiser order editing: ON — click to disable" : "Organiser order editing: OFF — click to enable"}
                      disabled={!!busy}
                      onClick={() => patchGb(gb.id, { organiserOrderEditEnabled: !gb.organiserOrderEditEnabled }, "orgEdit")}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        gb.organiserOrderEditEnabled
                          ? "text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                          : "text-muted-foreground hover:bg-muted",
                      )}>
                      {busy === "orgEdit"
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Pencil className="w-4 h-4" />}
                    </button>

                    <button
                      title={gb.hiddenFromList ? "Show in list" : "Hide from list"}
                      disabled={!!busy}
                      onClick={() => patchGb(gb.id, { hiddenFromList: !gb.hiddenFromList }, "hide")}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        gb.hiddenFromList
                          ? "text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                          : "text-muted-foreground hover:bg-muted",
                      )}>
                      {busy === "hide"
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : gb.hiddenFromList ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>

                    {gb.status !== "archived" && (
                      <button
                        title="Archive"
                        disabled={!!busy}
                        onClick={() => patchGb(gb.id, { status: "archived" }, "archive")}
                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
                        {busy === "archive"
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Box className="w-4 h-4" />}
                      </button>
                    )}

                    <button
                      title="Delete"
                      disabled={!!busy}
                      onClick={() => setConfirmDelete(confirmDelete?.id === gb.id ? null : gb)}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        confirmDelete?.id === gb.id
                          ? "text-red-600 bg-red-50 dark:bg-red-900/20"
                          : "text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20",
                      )}>
                      {busy === "delete"
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      key="orders"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden border-t border-border">
                      {loadingOrders ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        </div>
                      ) : orders.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">No orders yet.</p>
                      ) : (
                        <div className="divide-y divide-border">
                          <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-3 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            <span>#</span>
                            <span>User</span>
                            <span>Total</span>
                            <span>Payment</span>
                          </div>
                          {orders.map(o => {
                            const sym = currSym(o.currency ?? "GBP");
                            return (
                              <div key={o.id} className="grid grid-cols-[auto_1fr_auto_auto] gap-x-3 px-4 py-2 items-center text-xs">
                                <span className="font-mono text-muted-foreground">{o.code}</span>
                                <span className="font-medium truncate">{o.telegramUsername}</span>
                                <span className="text-right tabular-nums text-muted-foreground">{sym}{Number(o.grandTotal).toFixed(2)}</span>
                                <span className={cn("px-1.5 py-0.5 rounded-full border text-[10px] font-medium whitespace-nowrap", GB_ORDER_PAYMENT_COLORS[o.paymentStatus] ?? "text-muted-foreground border-border")}>
                                  {o.paymentStatus.replace(/_/g, " ")}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Ruleset Editor Panel ─────────────────────────────────────
type RuleFormat = "standard" | "info" | "warning" | "important";
interface Rule { id: string; text: string; enabled: boolean; format: RuleFormat; }

const FORMAT_LABELS: Record<RuleFormat, string> = {
  standard: "Standard",
  info: "Info",
  warning: "Warning",
  important: "Important",
};
const FORMAT_COLORS: Record<RuleFormat, string> = {
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
type View = { kind: "list" } | { kind: "create" } | { kind: "detail"; gb: GroupBuy };

export function AdminGroupBuysTab({ secret }: { secret: string }) {
  const [view, setView] = useState<View>({ kind: "list" });

  const [gbPageMsg, setGbPageMsg] = useState<string>("");
  const [gbPageMsgDraft, setGbPageMsgDraft] = useState<string>("");
  const [savingGbMsg, setSavingGbMsg] = useState(false);
  const [savedGbMsg, setSavedGbMsg] = useState(false);

  useEffect(() => {
    fetch("/api/config")
      .then(r => r.json())
      .then(d => {
        const msg = d.groupBuysPageMessage ?? "";
        setGbPageMsg(msg);
        setGbPageMsgDraft(msg);
      })
      .catch(() => {});
  }, []);

  const saveGbPageMsg = async () => {
    setSavingGbMsg(true);
    await fetch(apiUrl("/admin/group-buys-page-message"), {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-secret": secret },
      body: JSON.stringify({ message: gbPageMsgDraft }),
    });
    setGbPageMsg(gbPageMsgDraft);
    setSavingGbMsg(false);
    setSavedGbMsg(true);
    setTimeout(() => setSavedGbMsg(false), 2000);
  };

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("adm_gb_state");
      if (!saved) return;
      const { gbId } = JSON.parse(saved);
      if (!gbId) return;
      fetch(apiUrl("/admin/group-buys"), { headers: { "x-admin-secret": secret } })
        .then(r => r.json())
        .then((gbs: GroupBuy[]) => {
          const gb = gbs.find((g: GroupBuy) => g.id === gbId);
          if (gb) setView({ kind: "detail", gb });
        })
        .catch(() => {});
    } catch {}
  }, []);

  const handleSelect = (gb: GroupBuy) => {
    setView({ kind: "detail", gb });
    try { sessionStorage.setItem("adm_gb_state", JSON.stringify({ gbId: gb.id })); } catch {}
  };
  const handleNew = () => {
    setView({ kind: "create" });
    try { sessionStorage.removeItem("adm_gb_state"); } catch {}
  };
  const handleBack = () => {
    setView({ kind: "list" });
    try { sessionStorage.removeItem("adm_gb_state"); } catch {}
  };

  const handleCreated = (gb: GroupBuy) => {
    setView({ kind: "detail", gb });
    try { sessionStorage.setItem("adm_gb_state", JSON.stringify({ gbId: gb.id })); } catch {}
  };

  const handleUpdate = (updated: GroupBuy) => {
    if (view.kind === "detail") setView({ kind: "detail", gb: updated });
  };

  const handleClone = (cloned: GroupBuy) => {
    setView({ kind: "detail", gb: cloned });
  };

  return (
    <div>
      <AnimatePresence mode="wait">
        {view.kind === "list" && (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="space-y-4 mb-4">
              <Card className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-500" />
                  <p className="text-sm font-semibold">Group Buys Page Message</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Shown as a banner at the top of the "My Group Buys" page. Leave blank to show no banner.
                </p>
                <textarea
                  rows={3}
                  value={gbPageMsgDraft}
                  onChange={e => setGbPageMsgDraft(e.target.value)}
                  placeholder="e.g. Welcome! New group buys are added regularly. Check back soon."
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={saveGbPageMsg} disabled={savingGbMsg} className="gap-1.5">
                    {savingGbMsg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : savedGbMsg ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                    {savedGbMsg ? "Saved" : "Save Message"}
                  </Button>
                  {gbPageMsgDraft && (
                    <Button size="sm" variant="ghost" className="text-xs text-muted-foreground" onClick={() => setGbPageMsgDraft("")}>
                      Clear
                    </Button>
                  )}
                  {gbPageMsg && <span className="text-xs text-green-600 font-medium">● Live</span>}
                </div>
              </Card>
            </div>
            <GBList secret={secret} onSelect={handleSelect} onNew={handleNew} />
          </motion.div>
        )}

        {view.kind === "create" && (
          <motion.div key="create" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <button onClick={handleBack} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="font-semibold text-base">New Group Buy</h2>
              </div>
              <Card className="p-5">
                <GBForm secret={secret} onSave={handleCreated} onCancel={handleBack} />
              </Card>
            </div>
          </motion.div>
        )}

        {view.kind === "detail" && (
          <motion.div key={`detail-${view.gb.id}`} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
            <GBDetail
              secret={secret}
              gb={view.gb}
              onBack={handleBack}
              onUpdate={handleUpdate}
              onClone={handleClone}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
