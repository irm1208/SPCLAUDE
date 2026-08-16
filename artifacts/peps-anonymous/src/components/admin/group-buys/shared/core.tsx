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
export const _codeToName: Record<string, string> = Object.fromEntries(COUNTRY_LIST.map(c => [c.code.toLowerCase(), c.name]));
export function resolveCountry(raw: string | null | undefined): string {
  if (!raw) return raw ?? "";
  return _codeToName[raw.toLowerCase()] ?? raw;
}


export function apiUrl(path: string) { return `/api${path}`; }

export type GroupBuy = Record<string, unknown> & {
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
  entryFeeEnabled?: boolean;
  entryFeeAmount?: number | null;
  entryFeeLabel?: string | null;
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
  telegramImageUrl?: string | null;
  countryLegsEnabled?: boolean;
  organiserOrderEditEnabled?: boolean;
  organiserCanEditStatus?: boolean;
  organiserCanEditPaymentStatus?: boolean;
  organiserCanEditTracking?: boolean;
  organiserCanEditNotes?: boolean;
  organiserCanEditTxId?: boolean;
  organiserCanEditQuantities?: boolean;
  organiserCanMarkOos?: boolean;
  organiserCanDeleteOrders?: boolean;
  reshipperOrderEditEnabled?: boolean;
  reshipperCanEditStatus?: boolean;
  reshipperCanEditTracking?: boolean;
  reshipperCanEditAddress?: boolean;
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

export type InfoCard = { id: string; title: string; body: string; icon?: string; type?: string; postedAt?: string };
export const INFO_CARD_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "info", label: "Info" },
  { value: "update", label: "Update" },
  { value: "warning", label: "Warning" },
  { value: "important", label: "Important" },
  { value: "success", label: "Success" },
  { value: "error", label: "Error" },
];
export type ShippingOption = { id: string; label: string; price: number; requiresAddress?: boolean; requiresQrCode?: boolean };
export type EntryFeePayment = {
  id: string;
  groupBuyId: string;
  accountId: string;
  status: "pending" | "submitted" | "confirmed" | "rejected";
  amount: number;
  currency: string;
  amountUsd: number | null;
  paymentTxHash: string | null;
  paymentCryptoCurrency: string | null;
  paymentCryptoNetwork: string | null;
  submittedAt: string | null;
  confirmedAt: string | null;
  confirmedBy: string | null;
  rejectionReason: string | null;
  createdAt: string;
};

export function InfoCardsEditor({ cards, onChange }: {
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
export function ShippingOptionsEditor({ options, onChange, currencySym = "$" }: {
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
export interface GbPaymentConfig {
  id: string;
  name: string;
  status: string;
  paymentsEnabled: boolean;
  cryptoWalletAddress: string | null;
  cryptoCurrency: string;
  cryptoNetwork: string;
  cryptoOptions?: Array<{ currency: string; network: string; walletAddress: string | null }> | null;
  revolutHandle: string | null;
  paypalHandle: string | null;
  anonPayEnabled: boolean;
  anonPayWallet: string | null;
  anonPayTicker: string;
  anonPayNetwork: string;
}

export const CRYPTO_CURRENCIES = ["USDT", "USDC", "ETH", "BNB", "SOL"];

export const TROCADOR_COINS = [
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
export const CRYPTO_NETWORKS: Record<string, string[]> = {
  USDT: ["ERC-20", "TRC-20", "BEP-20", "Polygon", "Arbitrum", "Optimism", "Solana"],
  USDC: ["ERC-20", "Polygon", "Arbitrum", "Optimism", "Solana"],
  ETH:  ["ERC-20", "Arbitrum", "Optimism", "Polygon"],
  BNB:  ["BEP-20"],
  SOL:  ["Solana"],
};
export const DEFAULT_CRYPTO_NETWORKS: Record<string, string> = {
  USDT: "ERC-20", USDC: "ERC-20", ETH: "ERC-20", BNB: "BEP-20", SOL: "Solana",
};

export function GbPaymentGatewayInlineContent({ secret, gbId }: { secret: string; gbId: string }) {
  const [loading, setLoading] = useState(true);
  const [cryptoOptions, setCryptoOptions] = useState<Array<{ currency: string; network: string; wallet: string }>>([]);
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
          // Load from cryptoOptions array, falling back to legacy single fields
          const opts = found.cryptoOptions && found.cryptoOptions.length > 0
            ? found.cryptoOptions.map(o => ({ currency: o.currency, network: o.network, wallet: o.walletAddress ?? "" }))
            : (found.cryptoWalletAddress ? [{ currency: found.cryptoCurrency || "USDT", network: found.cryptoNetwork || "ERC-20", wallet: found.cryptoWalletAddress }] : []);
          setCryptoOptions(opts);
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

  const addCryptoOption = () => {
    setCryptoOptions(prev => [...prev, { currency: "USDT", network: "ERC-20", wallet: "" }]);
  };

  const removeCryptoOption = (i: number) => {
    setCryptoOptions(prev => prev.filter((_, j) => j !== i));
  };

  const updateCryptoOption = (i: number, field: "currency" | "network" | "wallet", value: string) => {
    setCryptoOptions(prev => prev.map((o, j) => {
      if (j !== i) return o;
      if (field === "currency") {
        const nets = CRYPTO_NETWORKS[value] ?? ["ERC-20"];
        const net = nets.includes(o.network) ? o.network : (DEFAULT_CRYPTO_NETWORKS[value] ?? nets[0]);
        return { ...o, currency: value, network: net };
      }
      return { ...o, [field]: value };
    }));
  };

  const save = async () => {
    setSaving(true); setMsg(""); setErr("");
    try {
      const validOptions = cryptoOptions.filter(o => o.wallet.trim());
      const res = await fetch(apiUrl(`/admin/group-buys/${gbId}/payment-methods`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({
          cryptoOptions: validOptions.map(o => ({ currency: o.currency, network: o.network, walletAddress: o.wallet.trim() })),
          cryptoWalletAddress: validOptions[0]?.wallet.trim() || null,
          cryptoCurrency: validOptions[0]?.currency || "USDT",
          cryptoNetwork: validOptions[0]?.network || "ERC-20",
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-violet-500" />
              <p className="text-sm font-semibold">Crypto</p>
            </div>
            <button
              type="button"
              onClick={addCryptoOption}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Plus className="w-3 h-3" /> Add wallet
            </button>
          </div>
          {cryptoOptions.length === 0 ? (
            <p className="text-xs text-muted-foreground">No crypto wallets configured. Click "Add wallet" to add one.</p>
          ) : (
            <div className="space-y-3">
              {cryptoOptions.map((opt, i) => {
                const availableNetworks = CRYPTO_NETWORKS[opt.currency] ?? ["ERC-20"];
                return (
                  <div key={i} className="p-3 rounded-lg border border-input bg-muted/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Wallet {i + 1}</span>
                      <button type="button" onClick={() => removeCryptoOption(i)} className="text-muted-foreground hover:text-destructive">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Currency</Label>
                        <select
                          value={opt.currency}
                          onChange={e => updateCryptoOption(i, "currency", e.target.value)}
                          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          {CRYPTO_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Network</Label>
                        <select
                          value={opt.network}
                          onChange={e => updateCryptoOption(i, "network", e.target.value)}
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
                        placeholder="0x… or T… or sol…"
                        value={opt.wallet}
                        onChange={e => updateCryptoOption(i, "wallet", e.target.value)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
export const EU_COUNTRIES: { code: string; name: string }[] = [
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

export const POPULAR_COUNTRIES: { code: string; name: string }[] = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "BR", name: "Brazil" },
];

export const GBP_TO_USD = 1.27;

export interface GBProduct { id: string; groupBuyId: string; productId: string; priceOverride: number | null; active: boolean; sortOrder: number | null; maxPerCustomer: number | null }
export interface DeliveryMethod { id: string; name: string; price: number; active: boolean; sortOrder: number | null }
export interface GBDeliveryMethod { id: string; groupBuyId: string; deliveryMethodId: string }
export type Member = { telegramUsername: string; email: string | null; accountStatus: string; hasPassword: boolean; hasTelegram: boolean; joinedAt: string; tags: string[]; allowExtraOrder: boolean }
export interface Product { id: string; name: string; price: number; category: string | null; mgSize: string | null; stock: number | null; active: boolean; vendor: string | null; halfKitEnabled: boolean; sourceGroupBuyId?: string | null }
export interface CustomCourier { id: string; name: string; trackingUrlTemplate: string | null; createdAt: string }
export const GB_STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  active: "bg-green-100 text-green-700",
  closed: "bg-orange-100 text-orange-700",
  archived: "bg-gray-100 text-gray-500",
};

export function CopyIdBadge({ id }: { id: string }) {
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

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${GB_STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600"}`}>
      {status}
    </span>
  );
}

// ─── GB Form (create / edit) ───────────────────────────────────
