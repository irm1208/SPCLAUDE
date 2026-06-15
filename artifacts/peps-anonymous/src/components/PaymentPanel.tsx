import { useState, useEffect, useRef } from "react";
import { Copy, Check, Loader2, Send, AlertCircle, ShieldCheck, Clock, FlaskConical, Zap, RefreshCw, ChevronRight, Wallet, ExternalLink, ArrowLeft, ImagePlus, X, Upload, CheckCircle2, Info } from "lucide-react";
import QRCode from "react-qr-code";
import { Card, Button, Input } from "@/components/ui";
import { currSym } from "@/lib/currency";

// ── Brand icons ────────────────────────────────────────────────

function RevolutIcon({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="9" fill="#0666EB"/>
      <path fillRule="evenodd" clipRule="evenodd"
        d="M11 8h11.5C26.6 8 29 10.6 29 14c0 2.6-1.5 4.7-3.8 5.5l3.8 6.5H25l-3.2-5.6H15v5.6h-4V8zm4 8.1h7.1c1.45 0 2.35-.85 2.35-2.15 0-1.35-.9-2.2-2.35-2.2H15v4.35z"
        fill="white"/>
    </svg>
  );
}

function PayPalIcon({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="9" fill="#003087"/>
      <path d="M13.5 10h7c2.9 0 4.7 1.7 4.7 4.2 0 3.1-2.3 5.1-5.5 5.1h-2.3l-.9 4.7H13l2.1-14h-1.6zm3.5 2.3L16 17h1.8c1.55 0 2.6-.9 2.6-2.5 0-1.4-.85-2.2-2.25-2.2h-.15z" fill="white"/>
      <path d="M20.5 15h2c2.9 0 4.7 1.7 4.7 4.2 0 3.1-2.3 5.1-5.5 5.1h-2.3l-.9 4.7h-3.5l2.1-14h3.4z" fill="#009CDE" fillOpacity="0.75"/>
    </svg>
  );
}

function CryptoIconBadge({ currency = "USDT", size = 36 }: { currency?: string; size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-[9px] bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shrink-0 shadow-sm"
    >
      <span className="text-white font-black text-[10px] tracking-tight leading-none">{currency.slice(0, 4)}</span>
    </div>
  );
}

// ── Shared small components ────────────────────────────────────

function CopyBtn({ value, accentColor = "#7c3aed" }: { value: string; accentColor?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
      style={{ background: "var(--crypto-glass-bg)", border: "1px solid var(--crypto-glass-border)" }}
    >
      {copied
        ? <Check className="w-3.5 h-3.5" style={{ color: accentColor }} />
        : <Copy className="w-3.5 h-3.5" style={{ color: "var(--crypto-text-muted)" }} />
      }
    </button>
  );
}

function CopyableField({
  label, value, mono = true, accentColor,
}: { label: string; value: string; mono?: boolean; accentColor?: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: "var(--crypto-glass-bg)", border: "1px solid var(--crypto-glass-border)" }}>
      <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--crypto-text-muted)" }}>{label}</p>
      <div className="flex items-center gap-2">
        <p className={`${mono ? "font-mono" : "font-semibold"} text-xs text-foreground break-all flex-1 leading-relaxed`}>
          {value}
        </p>
        <CopyBtn value={value} accentColor={accentColor} />
      </div>
    </div>
  );
}

function CopyableAmount({ amount, label, suffix = "USDT" }: { amount: number; label?: string; suffix?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(amount.toFixed(2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="w-full flex items-center justify-between rounded-xl px-3 py-2 transition-colors group"
      style={{ background: "var(--crypto-glass-bg)", border: "1px solid var(--crypto-glass-border)" }}
      title="Tap to copy amount"
    >
      <p className="text-xs font-medium" style={{ color: "var(--crypto-text-body)" }}>{label ?? "Amount to send"}</p>
      <div className="flex items-center gap-1.5">
        <p className="text-sm font-bold text-foreground">{amount.toFixed(2)} {suffix}</p>
        {copied
          ? <Check className="w-3 h-3 text-green-600 shrink-0" />
          : <Copy className="w-3 h-3 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        }
      </div>
    </button>
  );
}

// ── Crypto-specific helpers ────────────────────────────────────

const ETH_USDT_CONTRACT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const BSC_USDT_CONTRACT = "0x55d398326f99059ff775485246999027b3197955";

function buildPaymentUri(wallet: string, amount: number, currency: string, network: string): string | null {
  const cur = currency.toUpperCase().trim();
  const net = network.toLowerCase().trim();
  if (cur === "USDT" && /erc.?20|ethereum/.test(net)) {
    const units = Math.round(amount * 1_000_000);
    return `ethereum:${ETH_USDT_CONTRACT}@1/transfer?address=${wallet}&uint256=${units}`;
  }
  if (cur === "USDT" && /bep.?20|bsc|binance/.test(net)) {
    const units = (BigInt(Math.round(amount * 1_000_000)) * 1_000_000_000_000n).toString();
    return `ethereum:${BSC_USDT_CONTRACT}@56/transfer?address=${wallet}&uint256=${units}`;
  }
  if (cur === "ETH" && /mainnet|ethereum|erc.?20/.test(net)) {
    const wei = Math.round(amount * 1e9) * 1_000_000_000;
    return `ethereum:${wallet}@1?value=${wei}`;
  }
  if (cur === "BTC" && /mainnet|bitcoin/.test(net)) {
    return `bitcoin:${wallet}?amount=${amount.toFixed(8)}`;
  }
  return null;
}

function isAutoVerified(currency: string, network: string): boolean {
  const cur = currency.toUpperCase().trim();
  const net = network.toLowerCase().trim();
  return (
    (cur === "USDT" && /erc.?20|ethereum/.test(net)) ||
    (cur === "USDT" && /bep.?20|bsc|binance/.test(net)) ||
    (cur === "ETH" && /mainnet|ethereum|erc.?20/.test(net)) ||
    (cur === "BTC" && /mainnet|bitcoin/.test(net))
  );
}

function getTxExplorerUrl(txHash: string, currency: string, network: string): string {
  const cur = currency.toUpperCase().trim();
  const net = network.toLowerCase().trim();
  if (cur === "BTC" && /mainnet|bitcoin/.test(net)) return `https://blockstream.info/tx/${txHash}`;
  if (cur === "USDT" && /bep.?20|bsc|binance/.test(net)) return `https://bscscan.com/tx/${txHash}`;
  return `https://etherscan.io/tx/${txHash}`;
}

function OpenWalletButton({ wallet, amount, currency, network }: { wallet: string; amount: number; currency: string; network: string }) {
  const uri = buildPaymentUri(wallet, amount, currency, network);
  if (!uri) return null;
  return (
    <a
      href={uri}
      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-emerald-300/60 bg-white/50 hover:bg-white/70 transition-colors text-sm font-semibold text-emerald-800"
    >
      <Wallet className="w-4 h-4" />
      Open in Wallet
      <ExternalLink className="w-3 h-3 opacity-60" />
    </a>
  );
}

function QrBlock({ wallet, amount, currency, network }: { wallet: string; amount: number; currency: string; network: string }) {
  const cur = currency.toUpperCase().trim();
  // For USDT, encode just the wallet address — the full EIP-681 transfer URI causes
  // wallets like Cake Wallet to display the coin as "ETH" rather than USDT ERC-20.
  // Plain address QRs are universally recognised; the amount is shown on screen.
  const uri = cur === "USDT" ? wallet : (buildPaymentUri(wallet, amount, currency, network) ?? wallet);
  const isBtc = cur === "BTC";
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="bg-white p-3 rounded-xl shadow-sm border border-white/60 inline-block">
        <QRCode value={uri} size={152} level="M" />
      </div>
      <p className="text-[10px] text-emerald-800/70 text-center">
        {isBtc ? "Scan with any Bitcoin wallet" : "Scan with MetaMask, Trust Wallet, or any compatible wallet"}
      </p>
    </div>
  );
}

function ConfirmationProgress({ confirmations, isPending }: { confirmations: number | null; isPending: boolean }) {
  if (isPending) {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">Checking blockchain…</p>
          <p className="text-xs text-muted-foreground mt-1">Transaction not yet mined — please wait about a minute</p>
        </div>
      </div>
    );
  }
  if (confirmations !== null) {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">Verifying on blockchain…</p>
          <p className="text-xs text-muted-foreground mt-1">
            {confirmations === 0
              ? "Waiting for first confirmation…"
              : `${confirmations} block confirmation${confirmations !== 1 ? "s" : ""} found`}
          </p>
          <div className="flex gap-1 justify-center mt-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${i < Math.min(confirmations, 6) ? "bg-emerald-500" : "bg-muted"}`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      <div className="text-center">
        <p className="text-sm font-semibold text-foreground">Verifying on blockchain…</p>
        <p className="text-xs text-muted-foreground mt-1">This usually takes a few seconds</p>
      </div>
    </div>
  );
}

function TxInput({ label, value, onChange, onSubmit, submitting, error, retry }: {
  label: string; value: string; onChange: (v: string) => void;
  onSubmit: () => void; submitting: boolean; error: string; retry?: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-foreground">{label}</p>
      <Input
        className="font-mono text-xs h-11"
        style={{ background: "var(--crypto-glass-bg)", borderColor: "var(--crypto-glass-border)" }}
        placeholder="0x..."
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={submitting}
      />
      {error && (
        <div className="flex gap-2 items-start p-2.5 bg-red-50/80 rounded-lg border border-red-100">
          <AlertCircle className="w-3.5 h-3.5 text-destructive mt-0.5 shrink-0" />
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}
      <Button className="w-full" onClick={onSubmit} disabled={submitting || !value.trim()}>
        {submitting
          ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Verifying…</>
          : retry
            ? <><RefreshCw className="w-4 h-4 mr-2" />Try Again</>
            : <><Send className="w-4 h-4 mr-2" />Submit & Verify</>
        }
      </Button>
    </div>
  );
}

// ── Types ──────────────────────────────────────────────────────

type PaymentMethod = "crypto" | "revolut" | "paypal" | "anonpay";
type Step = "loading" | "unavailable" | "method" | "choice" | "test" | "pay" | "revolut" | "paypal" | "anonpay";
type FiatMethod = "revolut" | "paypal";

interface Props {
  orderId: string;
  orderPin?: string;
  grandTotal: number;
  currency?: string | null;
  paymentStatus: string;
  paymentTxHash: string | null;
  paymentTestAmount: number | null;
  testPaymentTxHash: string | null;
  paymentRejectionReason?: string | null;
  onStatusChange?: (status: string, txHash?: string) => void;
  paymentsEnabled?: boolean;
  creditsUsd?: number;
}

// ── Gradient styles ────────────────────────────────────────────

const cryptoStyle = {
  background: "linear-gradient(135deg, color-mix(in srgb, #8B5CF6 18%, var(--t-surface)) 0%, color-mix(in srgb, #7C3AED 15%, var(--t-surface)) 50%, color-mix(in srgb, #3B82F6 13%, var(--t-surface)) 100%)",
  borderColor: "rgba(139, 92, 246, 0.35)",
};
const revStyle = {
  background: "linear-gradient(135deg, color-mix(in srgb, #0666EB 13%, var(--t-surface)) 0%, color-mix(in srgb, #3B82F6 11%, var(--t-surface)) 60%, color-mix(in srgb, #6366F1 11%, var(--t-surface)) 100%)",
  borderColor: "rgba(6, 102, 235, 0.3)",
};
const ppStyle = {
  background: "linear-gradient(135deg, color-mix(in srgb, #003087 13%, var(--t-surface)) 0%, color-mix(in srgb, #0067EB 11%, var(--t-surface)) 60%, color-mix(in srgb, #009CDE 11%, var(--t-surface)) 100%)",
  borderColor: "rgba(0, 48, 135, 0.25)",
};
const anonPayStyle = {
  background: "linear-gradient(135deg, color-mix(in srgb, #4A5568 13%, var(--t-surface)) 0%, color-mix(in srgb, #2D3748 11%, var(--t-surface)) 60%, color-mix(in srgb, #1A202C 11%, var(--t-surface)) 100%)",
  borderColor: "rgba(74, 85, 104, 0.3)",
};

// ── Collected-by banner ────────────────────────────────────────

function CollectedByBanner({ collectedBy }: {
  collectedBy: { type: "admin" | "organiser" | "reshipper"; username?: string } | null;
}) {
  if (!collectedBy || collectedBy.type === "organiser") return null;
  if (collectedBy.type === "reshipper") {
    return (
      <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium"
        style={{ background: "rgba(99,102,241,0.10)", border: "1px solid rgba(99,102,241,0.22)", color: "var(--t-text)" }}>
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full shrink-0 font-bold text-[10px]"
          style={{ background: "rgba(99,102,241,0.20)", color: "rgb(99,102,241)" }}>R</span>
        <span>Payment collected by regional reshipper
          {collectedBy.username ? <> · <span className="font-bold">@{collectedBy.username}</span></> : null}
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium"
      style={{ background: "rgba(100,116,139,0.08)", border: "1px solid rgba(100,116,139,0.18)", color: "var(--t-subtle)" }}>
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full shrink-0 font-bold text-[10px]"
        style={{ background: "rgba(100,116,139,0.15)", color: "rgb(100,116,139)" }}>A</span>
      <span>Payment collected by admin</span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────

export default function PaymentPanel({
  orderId, orderPin, grandTotal, currency,
  paymentStatus: initStatus,
  paymentTxHash: initTxHash,
  paymentTestAmount: initTestAmount,
  paymentRejectionReason,
  onStatusChange,
  paymentsEnabled: paymentsEnabledProp,
  creditsUsd = 0,
}: Props) {
  const [paymentsEnabled, setPaymentsEnabled] = useState<boolean | null>(
    paymentsEnabledProp !== undefined ? paymentsEnabledProp : null
  );
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [revolutHandle, setRevolutHandle] = useState<string | null>(null);
  const [paypalHandle, setPaypalHandle] = useState<string | null>(null);
  const [orderCode, setOrderCode] = useState<string | null>(null);
  const [cryptoCurrency, setCryptoCurrency] = useState<string>("USDT");
  const [cryptoNetwork, setCryptoNetwork] = useState<string>("ERC-20");

  const [collectedBy, setCollectedBy] = useState<{ type: "admin" | "organiser" | "reshipper"; username?: string } | null>(null);

  // AnonPay state
  const [anonPayEnabled, setAnonPayEnabled] = useState(false);
  const [anonPayWallet, setAnonPayWallet] = useState<string | null>(null);
  const [anonPayTicker, setAnonPayTicker] = useState<string | null>(null);
  const [anonPayNetwork, setAnonPayNetwork] = useState<string | null>(null);
  const [anonPayIframeUrl, setAnonPayIframeUrl] = useState<string | null>(null);
  const [anonPayInitializing, setAnonPayInitializing] = useState(false);
  const [anonPayError, setAnonPayError] = useState("");
  // Start in initiated state when this order already has an AnonPay session (identified by
  // the "anonpay:" prefix written exclusively by /init-anonpay). We guard on the prefix
  // to avoid triggering Trocador polling for non-AnonPay orders. We also accept "unpaid"
  // status here because a page refresh before the user clicks "I've Sent Payment" leaves
  // the order in that state — the session is still live and the backend will upgrade it.
  const [anonPayInitiated, setAnonPayInitiated] = useState(
    (initStatus === "pending_confirmation" || initStatus === "unpaid") && (initTxHash?.startsWith("anonpay:") ?? false)
  );
  const [anonPayStatusChecking, setAnonPayStatusChecking] = useState(false);
  const [anonPayStatusMsg, setAnonPayStatusMsg] = useState("");
  const [anonPayRetryCount, setAnonPayRetryCount] = useState(0);
  const [cancellingAnonPay, setCancellingAnonPay] = useState(false);
  const anonPayCalledRef = useRef(false);

  const [status, setStatus] = useState(initStatus);
  const [txHash, setTxHash] = useState(initTxHash ?? "");
  const [testAmount, setTestAmount] = useState<number | null>(initTestAmount);

  // GBP→USD conversion: lock the rate server-side so display and verification always agree.
  const isGbp = (currency ?? "").toUpperCase() === "GBP";
  const [lockedUsdTotal, setLockedUsdTotal] = useState<number | null>(null);
  useEffect(() => {
    if (!isGbp || !orderId) return;
    fetch(`/api/orders/${orderId}/lock-usdt-rate`, { method: "POST" })
      .then(r => r.json())
      .then((d: { usdAmount?: number }) => { if (d.usdAmount) setLockedUsdTotal(d.usdAmount); })
      .catch(() => {});
  }, [isGbp, orderId]);
  const usdTotal = isGbp ? (lockedUsdTotal ?? grandTotal) : grandTotal;
  // Credits are always in USD — deduct from the USD payment side after GBP conversion
  const effectiveUsdTotal = Math.max(0, usdTotal - creditsUsd);
  // For fiat displays (Revolut/PayPal): for GBP keep original, for USD deduct credits
  const effectiveGrandTotal = isGbp ? grandTotal : Math.max(0, grandTotal - creditsUsd);
  const [confirmations, setConfirmations] = useState<number | null>(null);

  const initialStep: Step =
    initStatus === "test_ready" ? "test" :
    initStatus === "test_confirmed" ? "pay" :
    // Restore AnonPay panel after page refresh — covers both "pending_confirmation" (user
    // already clicked "I've Sent Payment") and "unpaid" (refreshed mid-payment before
    // clicking). "confirmed" is handled above so we only reach here for live sessions.
    (initTxHash?.startsWith("anonpay:") ?? false) ? "anonpay" :
    "loading";

  const [step, setStep] = useState<Step>(initialStep);
  const [testTx, setTestTx] = useState("");
  const [fullTx, setFullTx] = useState(initTxHash ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [pendingTx, setPendingTx] = useState(false);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [fiatSubmitting, setFiatSubmitting] = useState(false);
  const [fiatError, setFiatError] = useState("");
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null);
  const [screenshotName, setScreenshotName] = useState<string>("");
  const screenshotInputRef = useRef<HTMLInputElement>(null);

  // Post-payment screenshot upload (for when they forgot before clicking "I've Made Payment")
  const postPayInputRef = useRef<HTMLInputElement>(null);
  const [postPayDataUrl, setPostPayDataUrl] = useState<string | null>(null);
  const [postPayName, setPostPayName] = useState("");
  const [postPayUploading, setPostPayUploading] = useState(false);
  const [postPayErr, setPostPayErr] = useState("");
  const [postPayDone, setPostPayDone] = useState(false);

  useEffect(() => {
    const url = orderId
      ? `/api/payments-info?orderId=${encodeURIComponent(orderId)}`
      : "/api/payments-info";
    fetch(url)
      .then(r => r.json())
      .then(d => {
        const gbOrder: boolean = !!d.isGroupBuyOrder;
        // For GB orders starting a NEW crypto payment, only show crypto when the
        // GB has an explicit cryptoWalletAddress configured (no global fallback).
        // Exception: if a crypto payment is already in-progress (test_ready /
        // test_confirmed), allow the global wallet fallback so the user can
        // complete a payment that was initiated before fiat methods were added.
        const isInProgress = initStatus === "test_ready" || initStatus === "test_confirmed";
        const rawWallet = (gbOrder && !isInProgress)
          ? (d.cryptoWalletAddress || null)
          : (d.cryptoWalletAddress || d.walletAddress || null);
        // Validate address format for the configured currency/network.
        // BTC addresses use base58/bech32 and don't start with 0x.
        const loadedCur = (d.cryptoCurrency ?? "USDT").toUpperCase();
        const loadedNet = (d.cryptoNetwork ?? "ERC-20").toLowerCase();
        const isBtcRail = loadedCur === "BTC" || /bitcoin/.test(loadedNet);
        const isValidCryptoAddr = (a: string | null) => {
          if (!a || !a.trim()) return false;
          if (isBtcRail) return /^[13][1-9A-HJ-NP-Za-km-z]{24,33}$/.test(a) || /^bc1[a-z0-9]{6,87}$/.test(a);
          if (isAutoVerified(loadedCur, loadedNet)) return /^0x[0-9a-fA-F]{40}$/.test(a);
          // Unsupported/manual rails: accept any non-empty address for organiser-manual confirmation
          return a.trim().length > 0;
        };
        const validatedWallet = isValidCryptoAddr(rawWallet) ? rawWallet : null;
        setWalletAddress(validatedWallet);
        setRevolutHandle(d.revolutHandle ?? null);
        setPaypalHandle(d.paypalHandle ?? null);
        setOrderCode(d.orderCode ?? null);
        if (d.cryptoCurrency) setCryptoCurrency(d.cryptoCurrency);
        if (d.cryptoNetwork) setCryptoNetwork(d.cryptoNetwork);
        if (paymentsEnabledProp === undefined) setPaymentsEnabled(d.paymentsEnabled);

        // AnonPay
        const hasAnonPay = !!d.anonPayEnabled && !!d.anonPayWallet && !!d.anonPayTicker && !!d.anonPayNetwork;
        setAnonPayEnabled(hasAnonPay);
        if (d.anonPayWallet)  setAnonPayWallet(d.anonPayWallet);
        if (d.anonPayTicker)  setAnonPayTicker(d.anonPayTicker);
        if (d.anonPayNetwork) setAnonPayNetwork(d.anonPayNetwork);
        if (d.collectedBy) setCollectedBy(d.collectedBy);

        setStep(prev => {
          if (prev !== "loading") return prev;
          const hasCrypto = !!validatedWallet;
          const hasRevolut = !!d.revolutHandle;
          const hasPayPal = !!d.paypalHandle;
          const count = [hasCrypto, hasRevolut, hasPayPal, hasAnonPay].filter(Boolean).length;
          if (count === 0) return "unavailable";
          if (count === 1) {
            if (hasRevolut) return "revolut";
            if (hasPayPal) return "paypal";
            if (hasAnonPay) return "anonpay";
            return "choice";
          }
          return "method";
        });
      })
      .catch(() => {
        if (paymentsEnabledProp === undefined) setPaymentsEnabled(false);
      });
  }, [orderId, paymentsEnabledProp]);

  // Auto-poll Trocador for confirmation once customer has initiated payment.
  // Runs regardless of current UI step so page-refresh pending orders
  // auto-confirm without the user having to re-open the AnonPay step.
  useEffect(() => {
    if (!anonPayInitiated) return;
    const POLL_INTERVAL_MS = 15_000;
    let cancelled = false;
    const poll = async () => {
      if (cancelled) return;
      try {
        const r = await fetch(`/api/orders/${orderId}/anonpay-status`);
        if (!r.ok) return; // e.g. 400 if not a pending AnonPay order — silent
        const d = await r.json();
        if (d.paymentStatus === "confirmed" || d.status === "finished") {
          updateStatus("confirmed");
          setAnonPayStatusMsg("✓ Payment confirmed! Thank you.");
        }
      } catch { /* silent — network failure, no UI disruption */ }
    };
    poll(); // immediate first check
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(id); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anonPayInitiated, orderId]);

  // Auto-initialise AnonPay when the step becomes "anonpay"
  useEffect(() => {
    if (step !== "anonpay") return;
    if (anonPayCalledRef.current) return;
    anonPayCalledRef.current = true;
    setAnonPayInitializing(true);
    setAnonPayError("");
    fetch(`/api/orders/${orderId}/init-anonpay`, { method: "POST" })
      .then(r => r.json())
      .then(d => {
        if (d.iframeUrl) {
          setAnonPayIframeUrl(d.iframeUrl);
          // existing: true means the server found an existing session (page refresh mid-payment).
          // The backend has already upgraded status to pending_confirmation so we activate
          // polling immediately without requiring the user to click "I've Sent Payment" again.
          if (d.existing) {
            setAnonPayInitiated(true);
            setStatus("pending_confirmation");
            onStatusChange?.("pending_confirmation");
          }
        } else {
          setAnonPayError(d.error || "Failed to initialise AnonPay. Please try again.");
        }
      })
      .catch(() => setAnonPayError("Network error. Please try again."))
      .finally(() => setAnonPayInitializing(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, orderId, anonPayRetryCount]);

  if (paymentsEnabled === null) return null;
  if (!paymentsEnabled) return null;
  if (step === "loading") return null;

  const availableMethods: PaymentMethod[] = ([
    walletAddress ? "crypto" : null,
    revolutHandle ? "revolut" : null,
    paypalHandle ? "paypal" : null,
    anonPayEnabled ? "anonpay" : null,
  ] as (PaymentMethod | null)[]).filter((m): m is PaymentMethod => m !== null);


  if (availableMethods.length === 0) {
    return (
      <Card className="p-4" style={{ borderColor: "var(--t-border)", background: "var(--t-surface2)" }}>
        <div className="flex gap-2.5 items-start">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--t-muted)" }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--t-subtle)" }}>Payment not available</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--t-muted)" }}>No payment methods are configured for this order. Please contact the organiser.</p>
          </div>
        </div>
      </Card>
    );
  }

  const multiMethod = availableMethods.length > 1;

  const goToMethodPicker = () => { setStep("method"); setError(""); };

  const cancelAnonPay = async () => {
    setCancellingAnonPay(true);
    try {
      const r = await fetch(`/api/orders/${orderId}/cancel-anonpay`, { method: "POST" });
      if (r.ok) {
        anonPayCalledRef.current = false;
        setAnonPayIframeUrl(null);
        setAnonPayInitiated(false);
        setAnonPayError("");
        setAnonPayStatusMsg("");
        setAnonPayInitializing(false);
        setStatus("unpaid");
        onStatusChange?.("unpaid");
        goToMethodPicker();
      } else {
        const d = await r.json().catch(() => ({}));
        setAnonPayError((d as { error?: string }).error || "Could not cancel. Please contact support.");
      }
    } catch {
      setAnonPayError("Network error. Please try again.");
    }
    setCancellingAnonPay(false);
  };

  const updateStatus = (s: string, tx?: string) => {
    setStatus(s);
    if (tx) setTxHash(tx);
    onStatusChange?.(s, tx);
  };

  // ── Terminal states ──────────────────────────────────────────

  if (status === "confirmed") {
    return (
      <Card className="p-5 border-green-200 bg-green-50">
        <div className="flex gap-3 items-start">
          <ShieldCheck className="w-6 h-6 text-green-600 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="font-bold text-green-800 text-sm">Payment Confirmed</p>
              <span className="px-2 py-0.5 rounded-full bg-green-600 text-white text-[10px] font-bold tracking-wide">PAID</span>
            </div>
            <p className="text-xs text-green-700">Your payment was confirmed. Thank you!</p>
            {txHash && (
              <div className="mt-2">
                <p className="text-[10px] text-green-600 font-semibold mb-0.5">Transaction ID</p>
                <a
                  href={
                    txHash.startsWith("anonpay:")
                      ? `https://trocador.app/anonpay/${encodeURIComponent(txHash.slice("anonpay:".length))}`
                      : getTxExplorerUrl(txHash, cryptoCurrency, cryptoNetwork)
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[10px] text-green-600 break-all hover:underline flex items-center gap-1"
                >
                  {txHash.startsWith("anonpay:") ? txHash.slice("anonpay:".length) : txHash}
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>
            )}
            {confirmations !== null && confirmations > 0 && (
              <p className="text-[10px] text-green-600 mt-1">{confirmations} block confirmation{confirmations !== 1 ? "s" : ""}</p>
            )}
          </div>
        </div>
      </Card>
    );
  }

  if (status === "pending_confirmation" && step !== "anonpay") {
    const isFiatPayment = initTxHash?.startsWith("fiat:");
    return (
      <Card className="p-5 border-blue-200 bg-blue-50 space-y-4">
        <div className="flex gap-3 items-start">
          <Clock className="w-6 h-6 text-blue-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-bold text-blue-800 text-sm mb-0.5">Awaiting Organiser Confirmation</p>
            <p className="text-xs text-blue-700 leading-relaxed">
              Your payment notification has been sent to the organiser. They will confirm once they see the transfer in their account.
            </p>
          </div>
        </div>

        {isFiatPayment && (
          postPayDone ? (
            <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="font-medium">Screenshot uploaded — thank you!</span>
            </div>
          ) : (
            <div className="bg-white/80 rounded-2xl border border-red-200 p-4 space-y-3">
              <div>
                <p className="text-sm font-bold text-red-600">Haven't uploaded your payment screenshot?</p>
                <p className="text-xs text-red-500/80 mt-0.5">Upload it now to help the organiser confirm faster.</p>
              </div>
              <input
                ref={postPayInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,application/pdf"
                className="hidden"
                onChange={e => handlePostPayFile(e.target.files?.[0] ?? null)}
              />
              {postPayDataUrl ? (
                <div className="space-y-2.5">
                  <div className="relative rounded-xl overflow-hidden border border-red-200 bg-white">
                    {postPayDataUrl.startsWith("data:application/pdf") ? (
                      <div className="flex items-center gap-3 px-4 py-5">
                        <svg className="w-8 h-8 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                        <p className="text-sm font-medium text-slate-700 truncate">{postPayName}</p>
                      </div>
                    ) : (
                      <img src={postPayDataUrl} alt="Payment screenshot" className="w-full max-h-52 object-contain" />
                    )}
                    <button
                      onClick={() => { setPostPayDataUrl(null); setPostPayName(""); if (postPayInputRef.current) postPayInputRef.current.value = ""; }}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    {!postPayDataUrl.startsWith("data:application/pdf") && (
                      <p className="text-[10px] text-red-400 px-2 pb-1.5 truncate">{postPayName}</p>
                    )}
                  </div>
                  {postPayErr && <p className="text-xs text-red-600">{postPayErr}</p>}
                  <Button
                    onClick={submitPostPayScreenshot}
                    disabled={postPayUploading}
                    className="w-full gap-2"
                    size="sm"
                    style={{ background: "#dc2626", color: "#fff" }}
                  >
                    {postPayUploading
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Uploading…</>
                      : <><Upload className="w-3.5 h-3.5" />Send Screenshot</>
                    }
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => postPayInputRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-2 py-5 px-4 rounded-xl border-2 border-dashed transition-all hover:opacity-80"
                  style={{ borderColor: "#dc2626", color: "#dc2626", background: "rgba(220,38,38,0.04)" }}
                >
                  <ImagePlus className="w-6 h-6" />
                  <span className="text-sm font-bold">Tap to upload screenshot</span>
                </button>
              )}
              {postPayErr && !postPayDataUrl && <p className="text-xs text-red-600">{postPayErr}</p>}
            </div>
          )
        )}
      </Card>
    );
  }

  if (status === "payment_rejected") {
    return (
      <Card className="p-5 border-red-200 bg-red-50">
        <div className="flex gap-3 items-start">
          <AlertCircle className="w-6 h-6 text-red-500 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-red-800 text-sm mb-0.5">Payment Not Confirmed</p>
            <p className="text-xs text-red-700 leading-relaxed">
              The organiser could not match your payment. Please re-send the correct amount and try again.
            </p>
            {paymentRejectionReason && (
              <div className="mt-2 px-3 py-2 rounded-lg bg-red-100 border border-red-200">
                <p className="text-[10px] font-bold uppercase tracking-wider text-red-500 mb-0.5">Reason</p>
                <p className="text-xs text-red-800">{paymentRejectionReason}</p>
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  }

  // ── Crypto handlers ──────────────────────────────────────────

  const generateTest = async () => {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch(`/api/orders/${orderId}/generate-test`, { method: "POST" });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Failed to generate test amount"); }
      else { setTestAmount(d.paymentTestAmount); updateStatus("test_ready"); setStep("test"); }
    } catch { setError("Network error. Please try again."); }
    setGenerating(false);
  };

  const submitTest = async () => {
    if (!testTx.trim()) { setError("Please enter your transaction hash"); return; }
    setError(""); setPendingTx(false); setConfirmations(null); setSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/submit-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash: testTx.trim() }),
      });
      const d = await res.json();
      if (d.pending) {
        setPendingTx(true);
        setError("Transaction not yet mined — wait ~1 minute then try again.");
      } else if (!d.verified) {
        setError(d.reason || "Test payment not verified. Make sure you sent the exact amount on the correct network.");
      } else {
        if (d.blockConfirmations) setConfirmations(d.blockConfirmations);
        updateStatus("test_confirmed"); setStep("pay"); setError("");
      }
    } catch { setError("Network error. Please try again."); }
    setSubmitting(false); setPendingTx(false);
  };

  const submitFull = async () => {
    if (!fullTx.trim()) { setError("Please enter your transaction hash"); return; }
    setError(""); setPendingTx(false); setConfirmations(null); setSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash: fullTx.trim() }),
      });
      const d = await res.json();
      if (d.pending) {
        setPendingTx(true);
        setError("Transaction not yet mined — wait ~1 minute then try again.");
      } else if (d.underpayment) {
        setError(`⚠️ Underpayment detected — you sent ${d.amountPaid} ${d.currency ?? "USDT"} but ${(d.amountPaid + d.shortfall).toFixed(2)} ${d.currency ?? "USDT"} was expected. You are short by ${d.shortfall} ${d.currency ?? "USDT"}. Please send the remaining ${d.shortfall} ${d.currency ?? "USDT"} to the same wallet and submit that transaction hash, or contact your organiser.`);
      } else if (!d.verified) {
        setError(d.reason || "Payment not verified on blockchain. Please check the amount and network.");
      } else {
        if (d.blockConfirmations) setConfirmations(d.blockConfirmations);
        updateStatus("confirmed", fullTx.trim()); setError("");
      }
    } catch { setError("Network error. Please try again."); }
    setSubmitting(false); setPendingTx(false);
  };

  // ── Fiat payment confirmation handler ────────────────────────

  const handleScreenshotFile = (file: File | null) => {
    if (!file) return;
    if (!["image/jpeg", "image/jpg", "image/png", "application/pdf"].includes(file.type)) {
      setFiatError("Screenshot must be a JPG, PNG, or PDF.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setFiatError("Screenshot must be under 15 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      setScreenshotDataUrl(e.target?.result as string);
      setScreenshotName(file.name);
      setFiatError("");
    };
    reader.readAsDataURL(file);
  };

  const handlePostPayFile = (file: File | null) => {
    if (!file) return;
    if (!["image/jpeg", "image/jpg", "image/png", "application/pdf"].includes(file.type)) {
      setPostPayErr("Screenshot must be a JPG, PNG, or PDF.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setPostPayErr("Screenshot must be under 15 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      setPostPayDataUrl(e.target?.result as string);
      setPostPayName(file.name);
      setPostPayErr("");
    };
    reader.readAsDataURL(file);
  };

  async function submitPostPayScreenshot() {
    if (!postPayDataUrl) return;
    setPostPayUploading(true);
    setPostPayErr("");
    try {
      const res = await fetch(`/api/orders/${orderId}/payment-screenshot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ screenshot: postPayDataUrl }),
      });
      if (res.ok) {
        setPostPayDone(true);
      } else {
        const d = await res.json().catch(() => ({}));
        setPostPayErr((d as { error?: string }).error || "Upload failed. Please try again.");
      }
    } catch {
      setPostPayErr("Network error. Please try again.");
    }
    setPostPayUploading(false);
  }

  const submitFiatPayment = async (method: FiatMethod) => {
    setFiatSubmitting(true);
    setFiatError("");
    try {
      if (screenshotDataUrl) {
        const uploadRes = await fetch(`/api/orders/${orderId}/payment-screenshot`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ screenshot: screenshotDataUrl }),
        });
        if (!uploadRes.ok) {
          const uploadErr = await uploadRes.json().catch(() => ({}));
          setFiatError((uploadErr as { error?: string }).error || "Failed to upload screenshot. Please try again.");
          setFiatSubmitting(false);
          return;
        }
      }
      const res = await fetch(`/api/orders/${orderId}/confirm-fiat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method }),
      });
      const d = await res.json();
      if (!res.ok) {
        setFiatError((d as { error?: string }).error || "Failed to submit. Please try again.");
      } else {
        updateStatus("pending_confirmation");
      }
    } catch {
      setFiatError("Network error. Please try again.");
    }
    setFiatSubmitting(false);
  };

  // ── Method Picker ────────────────────────────────────────────

  if (step === "method") {
    return (
      <Card className="p-5 space-y-4" style={cryptoStyle}>
        <CollectedByBanner collectedBy={collectedBy} />
        <div>
          <p className="font-bold text-base mb-0.5" style={{ color: "var(--t-text)" }}>How would you like to pay?</p>
          <p className="text-xs" style={{ color: "var(--t-subtle)" }}>
            Total: <span className="font-bold">{currSym(currency)}{effectiveGrandTotal.toFixed(2)}</span>{isGbp && creditsUsd > 0 ? <span className="text-emerald-600"> (−${creditsUsd.toFixed(2)} USD credits applied)</span> : ""} — choose your payment method below.
          </p>
        </div>

        <div className="space-y-2.5">
          {availableMethods.includes("crypto") && (
            <button
              onClick={() => { setStep("choice"); setError(""); }}
              className="w-full flex items-center gap-3.5 p-4 rounded-2xl border transition-all text-left group"
              style={{ background: "var(--t-surface)", borderColor: "var(--t-border)" }}
            >
              <CryptoIconBadge currency={cryptoCurrency} size={44} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>{cryptoCurrency} Crypto</p>
                <p className="text-xs" style={{ color: "var(--t-subtle)" }}>{cryptoNetwork} · {isAutoVerified(cryptoCurrency, cryptoNetwork) ? "Verified automatically on-chain" : "Organiser confirms manually"}</p>
              </div>
              <ChevronRight className="w-4 h-4 shrink-0 group-hover:translate-x-0.5 transition-transform" style={{ color: "var(--t-subtle)" }} />
            </button>
          )}

          {availableMethods.includes("revolut") && (
            <button
              onClick={() => { setStep("revolut"); setError(""); }}
              className="w-full flex items-center gap-3.5 p-4 rounded-2xl border transition-all text-left group"
              style={{ background: "var(--t-surface)", borderColor: "var(--t-border)" }}
            >
              <RevolutIcon size={44} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>Revolut</p>
                <p className="text-xs" style={{ color: "var(--t-subtle)" }}>Bank transfer via Revolut</p>
              </div>
              <ChevronRight className="w-4 h-4 shrink-0 group-hover:translate-x-0.5 transition-transform" style={{ color: "var(--t-subtle)" }} />
            </button>
          )}

          {availableMethods.includes("paypal") && (
            <button
              onClick={() => { setStep("paypal"); setError(""); }}
              className="w-full flex items-center gap-3.5 p-4 rounded-2xl border transition-all text-left group"
              style={{ background: "var(--t-surface)", borderColor: "var(--t-border)" }}
            >
              <PayPalIcon size={44} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>PayPal</p>
                <p className="text-xs" style={{ color: "var(--t-subtle)" }}>Send money via PayPal</p>
              </div>
              <ChevronRight className="w-4 h-4 shrink-0 group-hover:translate-x-0.5 transition-transform" style={{ color: "var(--t-subtle)" }} />
            </button>
          )}

          {availableMethods.includes("anonpay") && (
            <button
              onClick={() => { setStep("anonpay"); setAnonPayError(""); }}
              className="w-full flex items-center gap-3.5 p-4 rounded-2xl border transition-all text-left group"
              style={{ background: "var(--t-surface)", borderColor: "var(--t-border)" }}
            >
              <div className="w-11 h-11 rounded-[9px] bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center shrink-0 shadow-sm">
                <span className="text-white font-black text-[9px] tracking-tight leading-none text-center">ANON<br />PAY</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>AnonPay (Any Crypto)</p>
                <p className="text-xs" style={{ color: "var(--t-subtle)" }}>Pay with BTC, ETH, XMR & 100+ coins — auto-converted, no account needed</p>
              </div>
              <ChevronRight className="w-4 h-4 shrink-0 group-hover:translate-x-0.5 transition-transform" style={{ color: "var(--t-subtle)" }} />
            </button>
          )}
        </div>
      </Card>
    );
  }

  // ── Revolut Checkout ─────────────────────────────────────────

  if (step === "revolut" && revolutHandle) {
    const handle = revolutHandle.replace(/^@/, "");
    const revUrl = revolutHandle.startsWith("http") ? revolutHandle : `https://revolut.me/${handle}`;

    return (
      <Card className="p-5 space-y-4" style={revStyle}>
        <CollectedByBanner collectedBy={collectedBy} />
        <div className="flex items-center gap-3">
          {multiMethod && (
            <button
              onClick={goToMethodPicker}
              className="w-8 h-8 rounded-xl bg-white/60 border border-white/50 flex items-center justify-center hover:bg-white/80 transition-colors shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#0666EB]" />
            </button>
          )}
          <RevolutIcon size={30} />
          <p className="font-bold text-[#003080] text-base leading-tight">Pay with Revolut</p>
        </div>

        <div className="bg-white/70 rounded-2xl border border-white/50 p-4 space-y-3.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-[#0666EB]/60">Amount to send</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-black text-[#003080] tracking-tight">
                {currSym(currency)}{effectiveGrandTotal.toFixed(2)}
              </p>
            </div>
          </div>

          {orderCode && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#0666EB]/50">Payment reference</p>
              <div className="flex items-center gap-2 bg-[#0666EB]/10 rounded-xl px-3 py-2.5 border border-[#0666EB]/20">
                <p className="font-mono text-base font-black text-[#003080] flex-1 tracking-wide">{orderCode}</p>
                <CopyBtn value={orderCode} accentColor="#0666EB" />
              </div>
              <p className="text-[10px] text-[#0666EB]/55 leading-snug">
                Copy this code and paste it in the Revolut payment note so we can match your payment.
              </p>
            </div>
          )}
        </div>

        <a
          href={revUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl text-sm font-bold text-white transition-all no-underline active:scale-[0.98]"
          style={{ background: "#0666EB", boxShadow: "0 2px 12px rgba(6,102,235,0.3)" }}
        >
          <RevolutIcon size={22} />
          Open Revolut
          <ExternalLink className="w-3.5 h-3.5 opacity-75" />
        </a>

        <div className="flex gap-2.5 items-start p-3 rounded-xl border" style={{ background: "rgba(6,102,235,0.07)", borderColor: "rgba(6,102,235,0.18)" }}>
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "#0666EB" }} />
          <p className="text-xs text-[#003080]/75 leading-snug">
            Include your order reference code in the payment note so the organiser can match it.
          </p>
        </div>

        {/* Screenshot picker */}
        <div className="rounded-2xl border-2 border-red-200 bg-red-50/40 p-4 space-y-2.5">
          <div>
            <p className="text-sm font-bold text-red-600">Upload payment screenshot</p>
            <p className="text-xs text-red-500/80 mt-0.5">Strongly recommended — speeds up your confirmation.</p>
          </div>
          <input
            ref={screenshotInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,application/pdf"
            className="hidden"
            onChange={e => handleScreenshotFile(e.target.files?.[0] ?? null)}
          />
          {screenshotDataUrl ? (
            <div className="relative rounded-xl overflow-hidden border border-red-200 bg-white">
              {screenshotDataUrl.startsWith("data:application/pdf") ? (
                <div className="flex items-center gap-3 px-4 py-5">
                  <svg className="w-8 h-8 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <p className="text-sm font-medium text-slate-700 truncate">{screenshotName}</p>
                </div>
              ) : (
                <img src={screenshotDataUrl} alt="Payment screenshot" className="w-full max-h-52 object-contain" />
              )}
              <button
                onClick={() => { setScreenshotDataUrl(null); setScreenshotName(""); if (screenshotInputRef.current) screenshotInputRef.current.value = ""; }}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
              {!screenshotDataUrl.startsWith("data:application/pdf") && (
                <p className="text-[10px] text-red-400 px-2 pb-1.5 truncate">{screenshotName}</p>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => screenshotInputRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-2 py-5 px-4 rounded-xl border-2 border-dashed transition-all hover:opacity-80 active:scale-[0.98]"
              style={{ borderColor: "#dc2626", color: "#dc2626", background: "rgba(220,38,38,0.04)" }}
            >
              <ImagePlus className="w-6 h-6" />
              <span className="text-sm font-bold">Tap to upload screenshot</span>
              <span className="text-xs opacity-70">JPG, PNG or PDF</span>
            </button>
          )}
        </div>

        {fiatError && (
          <div className="flex gap-2 items-start p-2.5 bg-red-50/80 rounded-lg border border-red-100">
            <AlertCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
            <p className="text-xs text-red-600">{fiatError}</p>
          </div>
        )}

        <button
          onClick={() => submitFiatPayment("revolut")}
          disabled={fiatSubmitting}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-60"
          style={{ background: "rgba(6,102,235,0.12)", border: "1.5px solid rgba(6,102,235,0.35)", color: "#003080" }}
        >
          {fiatSubmitting
            ? <><Loader2 className="w-4 h-4 animate-spin" />Notifying organiser…</>
            : <><Check className="w-4 h-4" />I've Made Payment</>
          }
        </button>
      </Card>
    );
  }

  // ── PayPal Checkout ──────────────────────────────────────────

  if (step === "paypal" && paypalHandle) {
    const handle = paypalHandle.replace(/^@/, "");
    // Build URL: for paypal.me full URLs without an amount segment, append the amount.
    // For shorthand handles, build the full paypal.me URL with amount pre-filled.
    const ppUrl = (() => {
      const amt = effectiveGrandTotal.toFixed(2);
      if (!paypalHandle.startsWith("http")) return `https://paypal.me/${handle}/${amt}`;
      // Full URL: append amount only if it's a paypal.me URL with no amount segment yet
      const hasAmount = /paypal\.me\/[^/?]+\/[^/?]+/.test(paypalHandle);
      if (!hasAmount && paypalHandle.toLowerCase().includes("paypal.me/")) {
        return `${paypalHandle.replace(/\/$/, "")}/${amt}`;
      }
      return paypalHandle;
    })();

    return (
      <Card className="p-5 space-y-4" style={ppStyle}>
        <CollectedByBanner collectedBy={collectedBy} />
        <div className="flex items-center gap-3">
          {multiMethod && (
            <button
              onClick={goToMethodPicker}
              className="w-8 h-8 rounded-xl bg-white/60 border border-white/50 flex items-center justify-center hover:bg-white/80 transition-colors shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#003087]" />
            </button>
          )}
          <PayPalIcon size={30} />
          <p className="font-bold text-[#003087] text-base leading-tight">Pay with PayPal</p>
        </div>

        <div className="bg-white/70 rounded-2xl border border-white/50 p-4 space-y-3.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-[#003087]/60">Amount to send</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-black text-[#003087] tracking-tight">
                {currSym(currency)}{effectiveGrandTotal.toFixed(2)}
              </p>
            </div>
          </div>

          {orderCode && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#003087]/50">Note to seller</p>
              <div className="flex items-center gap-2 bg-[#003087]/10 rounded-xl px-3 py-2.5 border border-[#003087]/20">
                <p className="font-mono text-base font-black text-[#003087] flex-1 tracking-wide">{orderCode}</p>
                <CopyBtn value={orderCode} accentColor="#003087" />
              </div>
              <p className="text-[10px] text-[#003087]/55 leading-snug">
                Copy this code and add it as the note when sending so we can match your payment.
              </p>
            </div>
          )}
        </div>

        <a
          href={ppUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl text-sm font-bold text-white transition-all no-underline active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, #003087 0%, #009CDE 100%)", boxShadow: "0 2px 12px rgba(0,48,135,0.25)" }}
        >
          <PayPalIcon size={22} />
          Open PayPal
          <ExternalLink className="w-3.5 h-3.5 opacity-75" />
        </a>

        <div className="flex gap-2.5 items-start p-3 rounded-xl border" style={{ background: "rgba(0,48,135,0.07)", borderColor: "rgba(0,48,135,0.18)" }}>
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "#003087" }} />
          <p className="text-xs text-[#003087]/75 leading-snug">
            Include your order reference code in the payment note so the organiser can match it.
          </p>
        </div>

        {/* Screenshot picker */}
        <div className="rounded-2xl border-2 border-red-200 bg-red-50/40 p-4 space-y-2.5">
          <div>
            <p className="text-sm font-bold text-red-600">Upload payment screenshot</p>
            <p className="text-xs text-red-500/80 mt-0.5">Strongly recommended — speeds up your confirmation.</p>
          </div>
          <input
            ref={screenshotInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,application/pdf"
            className="hidden"
            onChange={e => handleScreenshotFile(e.target.files?.[0] ?? null)}
          />
          {screenshotDataUrl ? (
            <div className="relative rounded-xl overflow-hidden border border-red-200 bg-white">
              {screenshotDataUrl.startsWith("data:application/pdf") ? (
                <div className="flex items-center gap-3 px-4 py-5">
                  <svg className="w-8 h-8 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <p className="text-sm font-medium text-slate-700 truncate">{screenshotName}</p>
                </div>
              ) : (
                <img src={screenshotDataUrl} alt="Payment screenshot" className="w-full max-h-52 object-contain" />
              )}
              <button
                onClick={() => { setScreenshotDataUrl(null); setScreenshotName(""); if (screenshotInputRef.current) screenshotInputRef.current.value = ""; }}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
              {!screenshotDataUrl.startsWith("data:application/pdf") && (
                <p className="text-[10px] text-red-400 px-2 pb-1.5 truncate">{screenshotName}</p>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => screenshotInputRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-2 py-5 px-4 rounded-xl border-2 border-dashed transition-all hover:opacity-80 active:scale-[0.98]"
              style={{ borderColor: "#dc2626", color: "#dc2626", background: "rgba(220,38,38,0.04)" }}
            >
              <ImagePlus className="w-6 h-6" />
              <span className="text-sm font-bold">Tap to upload screenshot</span>
              <span className="text-xs opacity-70">JPG, PNG or PDF</span>
            </button>
          )}
        </div>

        {fiatError && (
          <div className="flex gap-2 items-start p-2.5 bg-red-50/80 rounded-lg border border-red-100">
            <AlertCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
            <p className="text-xs text-red-600">{fiatError}</p>
          </div>
        )}

        <button
          onClick={() => submitFiatPayment("paypal")}
          disabled={fiatSubmitting}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-60"
          style={{ background: "rgba(0,48,135,0.1)", border: "1.5px solid rgba(0,48,135,0.3)", color: "#003087" }}
        >
          {fiatSubmitting
            ? <><Loader2 className="w-4 h-4 animate-spin" />Notifying organiser…</>
            : <><Check className="w-4 h-4" />I've Made Payment</>
          }
        </button>
      </Card>
    );
  }

  // ── AnonPay Checkout ─────────────────────────────────────────

  if (step === "anonpay") {
    return (
      <Card className="p-5 space-y-4" style={anonPayStyle}>
        <CollectedByBanner collectedBy={collectedBy} />
        <div className="flex items-center gap-3">
          {multiMethod && (
            <button
              onClick={goToMethodPicker}
              className="w-8 h-8 rounded-xl flex items-center justify-center hover:opacity-80 transition-opacity shrink-0"
              style={{ background: "var(--anon-back-bg)", border: "1px solid var(--anon-back-border)" }}
            >
              <ArrowLeft className="w-3.5 h-3.5" style={{ color: "var(--anon-back-text)" }} />
            </button>
          )}
          <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center shrink-0">
            <span className="text-white font-black text-[8px] tracking-tight leading-none text-center">AP</span>
          </div>
          <div>
            <p className="font-bold text-base leading-tight" style={{ color: "var(--anon-text)" }}>Pay with AnonPay</p>
            <p className="text-[11px]" style={{ color: "var(--anon-text-muted)" }}>{anonPayTicker} via Trocador</p>
          </div>
        </div>

        <div className="flex gap-2 items-start p-3 rounded-xl border" style={{ background: "var(--anon-glass)", borderColor: "var(--anon-glass-border)" }}>
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "var(--anon-text-faint)" }} />
          <p className="text-[11px] leading-relaxed" style={{ color: "var(--anon-text-muted)" }}>
            <span className="font-semibold" style={{ color: "var(--anon-text)" }}>AnonPay</span> is powered by{" "}
            <a href="https://trocador.app" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 opacity-80 hover:opacity-100">Trocador.app</a>
            {" "}— a privacy-focused exchange. You pay with the crypto of your choice and it is automatically converted to the seller's preferred coin. No account or KYC required.
          </p>
        </div>

        {anonPayError ? (
          <div className="space-y-3">
            <div className="flex gap-2 items-start p-3 bg-red-500/10 rounded-xl border border-red-500/30">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-xs text-red-600 dark:text-red-400">{anonPayError}</p>
            </div>
            <button
              onClick={() => {
                anonPayCalledRef.current = false;
                setAnonPayError("");
                setAnonPayIframeUrl(null);
                setAnonPayInitiated(false);
                setAnonPayStatusMsg("");
                setAnonPayRetryCount(c => c + 1);
              }}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-colors"
              style={{ background: "var(--anon-btn-bg)", border: "1px solid var(--anon-btn-border)", color: "var(--anon-btn-text)" }}
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        ) : anonPayInitializing ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--anon-text-faint)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--anon-text-muted)" }}>Setting up AnonPay…</p>
            <p className="text-xs text-center" style={{ color: "var(--anon-text-faint)" }}>Connecting to Trocador — this only takes a moment</p>
          </div>
        ) : anonPayIframeUrl ? (
          <div className="space-y-4">
            {/* Trocador payment link — opens in new tab */}
            {!anonPayInitiated && (
              <div className="rounded-2xl p-5 space-y-4" style={{ background: "var(--anon-glass)", border: "1px solid var(--anon-glass-border)" }}>
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center text-3xl" style={{ background: "var(--anon-icon-bg)", border: "1px solid var(--anon-icon-border)" }}>🔒</div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: "var(--anon-text)" }}>Your payment page is ready</p>
                    <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--anon-text-muted)" }}>
                      Tap the button below to open the secure Trocador payment page, complete your payment there, then return here and press "I've Initiated Payment".
                    </p>
                  </div>
                  <div className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-left w-full" style={{ background: "rgba(251,146,60,0.12)", border: "1px solid rgba(251,146,60,0.3)" }}>
                    <span className="text-base leading-none mt-0.5">⏱️</span>
                    <p className="text-xs leading-snug" style={{ color: "#ea580c" }}>
                      <span className="font-semibold">Please be patient</span> — AnonPay can take up to 15 minutes to process the currency conversion and confirm your payment.
                    </p>
                  </div>
                </div>
                <a
                  href={anonPayIframeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Payment Page on Trocador
                </a>
                <p className="text-[11px] text-center" style={{ color: "var(--anon-text-faint)" }}>Opens securely on trocador.app in a new tab</p>
              </div>
            )}

            {/* "I've Initiated Payment" — shown until user taps it */}
            {!anonPayInitiated && (
              <button
                onClick={async () => {
                  try {
                    const r = await fetch(`/api/orders/${orderId}/confirm-anonpay-initiation`, { method: "POST" });
                    const d = await r.json();
                    if (r.ok) {
                      updateStatus(d.paymentStatus ?? "pending_confirmation");
                      setAnonPayInitiated(true);
                    } else {
                      setAnonPayError(d.error || "Could not confirm initiation. Please try again.");
                    }
                  } catch {
                    setAnonPayError("Network error. Please try again.");
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-colors"
                style={{ background: "var(--anon-btn-bg)", border: "1px solid var(--anon-btn-border)", color: "var(--anon-btn-text)" }}
              >
                I've Initiated Payment
              </button>
            )}

            {/* Cancel before confirming initiation */}
            {!anonPayInitiated && (
              <button
                onClick={cancelAnonPay}
                disabled={cancellingAnonPay}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl text-xs font-medium transition-colors disabled:opacity-50"
                style={{ background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.2)", color: "#dc2626" }}
              >
                {cancellingAnonPay ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                {cancellingAnonPay ? "Cancelling…" : "Cancel — use a different payment method"}
              </button>
            )}

            {/* Status-check panel — shown after initiation confirmed */}
            {anonPayInitiated && (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-2 py-6">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "var(--anon-icon-bg)", border: "1px solid var(--anon-icon-border)" }}>
                    <span className="text-2xl">⏳</span>
                  </div>
                  <p className="text-sm font-bold" style={{ color: "var(--anon-text)" }}>Awaiting Payment Confirmation</p>
                  <p className="text-xs text-center leading-snug" style={{ color: "var(--anon-text-muted)" }}>
                    Your payment is being processed by Trocador. Tap below to check whether it has been received.
                  </p>
                  <div className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-left w-full" style={{ background: "rgba(251,146,60,0.12)", border: "1px solid rgba(251,146,60,0.3)" }}>
                    <span className="text-base leading-none mt-0.5">⏱️</span>
                    <p className="text-xs leading-snug" style={{ color: "#ea580c" }}>
                      <span className="font-semibold">Please be patient</span> — AnonPay can take up to 15 minutes to complete the currency conversion and confirm your payment.
                    </p>
                  </div>
                </div>

                {anonPayStatusMsg && (
                  <div
                    className="flex gap-2 items-start p-3 rounded-xl border text-xs font-medium"
                    style={anonPayStatusMsg.startsWith("✓")
                      ? { background: "rgba(34,197,94,0.1)", borderColor: "rgba(34,197,94,0.3)", color: "#16a34a" }
                      : { background: "var(--anon-glass)", borderColor: "var(--anon-glass-border)", color: "var(--anon-text-muted)" }}
                  >
                    {anonPayStatusMsg}
                  </div>
                )}

                <button
                  onClick={async () => {
                    setAnonPayStatusChecking(true);
                    setAnonPayStatusMsg("");
                    try {
                      const r = await fetch(`/api/orders/${orderId}/anonpay-status`);
                      const d = await r.json();
                      const s: string = (d.status ?? "").toLowerCase();
                      if (d.paymentStatus === "confirmed" || s === "anonpayfinished" || s === "finished" || s === "complete" || s === "completed") {
                        updateStatus("confirmed");
                        setAnonPayStatusMsg("✓ Payment confirmed! Thank you.");
                      } else if (s === "anonpayfound") {
                        setAnonPayStatusMsg("⏳ Payment detected on the blockchain — waiting for confirmations. Please check back in a minute.");
                      } else if (s === "anonpayexpired") {
                        setAnonPayStatusMsg("⚠️ This payment session has expired. Please contact support or start a new order.");
                      } else if (s === "anonpaynew" || !s) {
                        setAnonPayStatusMsg("Payment not yet received. Please wait a few minutes and try again.");
                      } else {
                        setAnonPayStatusMsg(`Status: ${d.status} — not yet confirmed. Please check back shortly.`);
                      }
                    } catch {
                      setAnonPayStatusMsg("Could not reach server. Please try again.");
                    }
                    setAnonPayStatusChecking(false);
                  }}
                  disabled={anonPayStatusChecking}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-colors disabled:opacity-60"
                  style={{ background: "var(--anon-btn-bg)", border: "1px solid var(--anon-btn-border)", color: "var(--anon-btn-text)" }}
                >
                  {anonPayStatusChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  {anonPayStatusChecking ? "Checking…" : "Check Payment Status"}
                </button>

                <button
                  onClick={() => setAnonPayInitiated(false)}
                  className="w-full text-xs transition-colors text-center py-1"
                  style={{ color: "var(--anon-text-faint)" }}
                >
                  ← Back to payment widget
                </button>

                <button
                  onClick={cancelAnonPay}
                  disabled={cancellingAnonPay}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl text-xs font-medium transition-colors disabled:opacity-50"
                  style={{ background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.2)", color: "#dc2626" }}
                >
                  {cancellingAnonPay ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                  {cancellingAnonPay ? "Cancelling…" : "I didn't send payment — cancel and use a different method"}
                </button>
              </div>
            )}

            {!anonPayInitiated && (
              <div className="flex gap-2 items-start p-3 rounded-xl" style={{ background: "var(--anon-glass)", border: "1px solid var(--anon-glass-border)" }}>
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "var(--anon-text-faint)" }} />
                <p className="text-xs leading-snug" style={{ color: "var(--anon-text-faint)" }}>
                  Complete your payment in the widget above, then tap "I've Initiated Payment" to confirm.
                </p>
              </div>
            )}
          </div>
        ) : null}
      </Card>
    );
  }

  // ── Crypto: choice ───────────────────────────────────────────

  if (step === "choice") {
    return (
      <Card className="p-5 space-y-4" style={cryptoStyle}>
        <CollectedByBanner collectedBy={collectedBy} />
        <div className="flex items-center gap-3">
          {multiMethod && (
            <button
              onClick={goToMethodPicker}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors shrink-0"
              style={{ background: "var(--crypto-glass-bg)", border: "1px solid var(--crypto-glass-border)" }}
            >
              <ArrowLeft className="w-3.5 h-3.5" style={{ color: "var(--crypto-text-primary)" }} />
            </button>
          )}
          <CryptoIconBadge currency={cryptoCurrency} size={30} />
          <p className="font-bold text-base" style={{ color: "var(--crypto-text-primary)" }}>Pay with {cryptoCurrency}</p>
        </div>

        <p className="text-xs" style={{ color: "var(--crypto-text-body)" }}>
          Send <span className="font-bold" style={{ color: "var(--crypto-text-primary)" }}>{effectiveUsdTotal.toFixed(2)} {cryptoCurrency}</span> on the {cryptoNetwork} network.{" "}
          {isAutoVerified(cryptoCurrency, cryptoNetwork)
            ? "Your payment will be verified automatically on the blockchain."
            : "Your organiser will confirm your payment manually."}
        </p>
        {isGbp && (
          <p className="text-[10px] mt-1" style={{ color: "var(--crypto-text-muted)" }}>
            ~${effectiveUsdTotal.toFixed(2)} USD (converted from £{grandTotal.toFixed(2)} GBP{creditsUsd > 0 ? `, −$${creditsUsd.toFixed(2)} credits applied` : ""})
          </p>
        )}

        <div className="space-y-2">
          <button
            onClick={generateTest}
            disabled={generating}
            className="w-full flex items-center gap-3 p-3.5 rounded-xl transition-colors text-left"
            style={{ background: "var(--crypto-glass-bg)", border: "1px solid var(--crypto-glass-border)" }}
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--crypto-warn-bg)" }}>
              {generating ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--crypto-text-primary)" }} /> : <FlaskConical className="w-4 h-4" style={{ color: "var(--crypto-text-primary)" }} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Send a test payment first</p>
              <p className="text-xs text-muted-foreground">Recommended — sends $1–$2 to confirm you're on the right network</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>

          <button
            onClick={() => { setStep("pay"); setError(""); }}
            className="w-full flex items-center gap-3 p-3.5 rounded-xl transition-colors text-left"
            style={{ background: "var(--crypto-glass-bg)", border: "1px solid var(--crypto-glass-border)" }}
          >
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Skip to full payment</p>
              <p className="text-xs text-muted-foreground">I'm confident I'm on the right network</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        </div>

        {error && (
          <div className="flex gap-2 items-start p-2.5 bg-red-50/80 rounded-lg border border-red-100">
            <AlertCircle className="w-3.5 h-3.5 text-destructive mt-0.5 shrink-0" />
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}

        <p className="text-[10px] text-center" style={{ color: "var(--crypto-text-muted)" }}>
          Only send {cryptoCurrency} on the <span className="font-semibold">{cryptoNetwork}</span> network. Other chains = lost funds.
        </p>
      </Card>
    );
  }

  // ── Crypto: test payment ─────────────────────────────────────

  if (step === "test") {
    return (
      <Card className="p-5 space-y-5" style={cryptoStyle}>
        <CollectedByBanner collectedBy={collectedBy} />
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setStep("choice"); setError(""); }}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors shrink-0"
            style={{ background: "var(--crypto-glass-bg)", border: "1px solid var(--crypto-glass-border)" }}
          >
            <ArrowLeft className="w-3.5 h-3.5" style={{ color: "var(--crypto-text-primary)" }} />
          </button>
          <FlaskConical className="w-5 h-5 shrink-0" style={{ color: "var(--crypto-text-primary)" }} />
          <div>
            <p className="font-bold text-sm mb-0.5" style={{ color: "var(--crypto-text-primary)" }}>Test Payment</p>
            <p className="text-xs" style={{ color: "var(--crypto-text-body)" }}>
              Send exactly <span className="font-bold">{testAmount?.toFixed(2)} {cryptoCurrency}</span> to the address below. This confirms you're on the correct network.
            </p>
          </div>
        </div>

        {walletAddress && testAmount && <QrBlock wallet={walletAddress} amount={testAmount} currency={cryptoCurrency} network={cryptoNetwork} />}
        {walletAddress && testAmount && <OpenWalletButton wallet={walletAddress} amount={testAmount} currency={cryptoCurrency} network={cryptoNetwork} />}
        {walletAddress && (
          <CopyableField label={`${cryptoCurrency} ${cryptoNetwork} Wallet`} value={walletAddress} accentColor="#7c3aed" />
        )}
        {testAmount && (
          <CopyableAmount amount={testAmount} label="Test amount (tap to copy)" suffix={cryptoCurrency} />
        )}

        {submitting ? (
          <ConfirmationProgress confirmations={null} isPending={pendingTx} />
        ) : (
          <TxInput
            label="Paste your test payment transaction hash"
            value={testTx}
            onChange={v => { setTestTx(v); setError(""); }}
            onSubmit={submitTest}
            submitting={submitting}
            error={error}
          />
        )}

        {!isAutoVerified(cryptoCurrency, cryptoNetwork) && (
          <div className="flex gap-2 items-start p-2.5 bg-amber-50/80 rounded-lg border border-amber-200/60">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800">
              Automated on-chain verification supports USDT (ERC-20 & BEP-20), native ETH, and BTC Mainnet. Your organiser has configured <span className="font-semibold">{cryptoCurrency} ({cryptoNetwork})</span> — they will confirm your payment manually.
            </p>
          </div>
        )}

        <p className="text-[10px] text-center" style={{ color: "var(--crypto-text-muted)" }}>
          Only send {cryptoCurrency} on the <span className="font-semibold">{cryptoNetwork}</span> network.
        </p>
      </Card>
    );
  }

  // ── Crypto: full payment ─────────────────────────────────────

  const remainingAmount = (status === "test_confirmed" && testAmount)
    ? parseFloat((effectiveUsdTotal - testAmount).toFixed(2))
    : effectiveUsdTotal;

  return (
    <Card className="p-5 space-y-5" style={cryptoStyle}>
      <CollectedByBanner collectedBy={collectedBy} />
      <div>
        <div className="flex items-start gap-3 mb-3">
          {status !== "test_confirmed" && (
            <button
              onClick={() => { setStep("choice"); setError(""); }}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors shrink-0 mt-0.5"
              style={{ background: "var(--crypto-glass-bg)", border: "1px solid var(--crypto-glass-border)" }}
            >
              <ArrowLeft className="w-3.5 h-3.5" style={{ color: "var(--crypto-text-primary)" }} />
            </button>
          )}
          <div className="flex-1 min-w-0">
            {status === "test_confirmed" && testAmount && (
              <div className="flex gap-2 items-start mb-3 p-2.5 bg-green-50/80 border border-green-200/60 rounded-xl">
                <ShieldCheck className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-green-700 font-medium">Test payment verified — you're on the right network!</p>
                  <p className="text-xs text-green-600 mt-0.5">
                    {testAmount.toFixed(2)} {cryptoCurrency} test deducted — send <span className="font-bold">{remainingAmount.toFixed(2)} {cryptoCurrency}</span>
                  </p>
                </div>
              </div>
            )}
            <p className="font-bold text-sm mb-0.5" style={{ color: "var(--crypto-text-primary)" }}>Send Full Payment</p>
            <p className="text-xs" style={{ color: "var(--crypto-text-body)" }}>
              Send exactly <span className="font-bold" style={{ color: "var(--crypto-text-primary)" }}>{remainingAmount.toFixed(2)} {cryptoCurrency}</span> to the address below.{" "}
              {isAutoVerified(cryptoCurrency, cryptoNetwork)
                ? "Your payment will be verified automatically."
                : "Your organiser will confirm your payment manually."}
            </p>
          </div>
        </div>
      </div>

      {walletAddress && <QrBlock wallet={walletAddress} amount={remainingAmount} currency={cryptoCurrency} network={cryptoNetwork} />}
      {walletAddress && <OpenWalletButton wallet={walletAddress} amount={remainingAmount} currency={cryptoCurrency} network={cryptoNetwork} />}
      {walletAddress && (
        <CopyableField label={`${cryptoCurrency} ${cryptoNetwork} Wallet`} value={walletAddress} accentColor="#7c3aed" />
      )}
      <CopyableAmount
        amount={remainingAmount}
        label={status === "test_confirmed" && testAmount
          ? `Amount to send (${effectiveUsdTotal.toFixed(2)} − ${testAmount.toFixed(2)} test)`
          : "Amount to send (tap to copy)"}
        suffix={cryptoCurrency}
      />
      {isGbp && (
        <p className="text-[10px] text-center" style={{ color: "var(--crypto-text-muted)" }}>
          ~${effectiveUsdTotal.toFixed(2)} USD (converted from £{grandTotal.toFixed(2)} GBP{creditsUsd > 0 ? `, −$${creditsUsd.toFixed(2)} credits applied` : ""})
        </p>
      )}

      {submitting ? (
        <ConfirmationProgress confirmations={null} isPending={pendingTx} />
      ) : (
        <TxInput
          label="Paste your transaction hash after sending"
          value={fullTx}
          onChange={v => { setFullTx(v); setError(""); }}
          onSubmit={submitFull}
          submitting={submitting}
          error={error}
          retry={!!error}
        />
      )}

      <div className="flex gap-2 items-start p-2.5 rounded-lg" style={{ background: "var(--crypto-warn-bg)", border: "1px solid var(--crypto-warn-border)" }}>
        <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "var(--crypto-warn-text)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2"/></svg>
        <p className="text-[11px]" style={{ color: "var(--crypto-warn-text)" }}>
          It can take <span className="font-semibold">1–5 minutes</span> for your transaction to appear on the blockchain. If verification fails immediately after sending, wait a few minutes and try again.
        </p>
      </div>

      {!isAutoVerified(cryptoCurrency, cryptoNetwork) && (
        <div className="flex gap-2 items-start p-2.5 bg-amber-50/80 rounded-lg border border-amber-200/60">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800">
            Automated on-chain verification supports USDT (ERC-20 & BEP-20), native ETH, and BTC Mainnet. Your organiser has configured <span className="font-semibold">{cryptoCurrency} ({cryptoNetwork})</span> — they will confirm your payment manually.
          </p>
        </div>
      )}

      <p className="text-[10px] text-center" style={{ color: "var(--crypto-text-muted)" }}>
        Only send {cryptoCurrency} on the <span className="font-semibold">{cryptoNetwork}</span> network. Other chains = lost funds.
      </p>
    </Card>
  );
}
