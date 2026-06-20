import { useEffect, useRef, useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageLayout } from "@/components/PageLayout";
import { HubBottomNav, HubSection } from "@/components/HubBottomNav";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, TestTube, Copy, CheckCircle2, Lock, Unlock, ExternalLink,
  ChevronLeft, ChevronDown, FlaskConical, RefreshCw, Users, Upload, X, AlertCircle, Info,
  User, UserPlus, LogIn, Eye, EyeOff, Bookmark, Share2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAccount } from "@/hooks/use-account";
import { useTheme } from "@/hooks/use-theme";

type PoolPaymentMethod =
  | { type: "crypto"; currency: string; network: string; address: string }
  | { type: "anonpay"; wallet: string; ticker: string; network: string }
  | { type: "revolut"; handle: string }
  | { type: "paypal"; email: string }
  | { type: "janoshik"; url: string };

type Pool = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  compoundName: string | null;
  manufacturer: string | null;
  batchNumber: string | null;
  capColor: string | null;
  mgSize: string | null;
  manufacturingDate: string | null;
  imageUrl: string | null;
  leaderUsername: string;
  status: string;
  votingMode: "leader_decides" | "vote";
  targetAmountUsd: number;
  payoutWalletAddress: string | null;
  payoutCurrency: string | null;
  payoutNetwork: string | null;
  availableCryptoOptions?: { currency: string; network: string }[];
  paymentMethods: PoolPaymentMethod[];
  contributorNamedReportEnabled: boolean;
  namedReportCap: number | null;
  allowVialContribution: boolean;
  stopOnFunded: boolean;
  fixedOptInFeeUsd: number | null;
  hasResults: boolean;
};

type PoolTest = {
  id: string;
  code: string;
  name: string;
  unitPriceUsd: number;
  quantity: number;
  votes: number;
  selected: boolean;
  contributionStatus: string;
};

type PoolContributor = {
  id: string;
  name: string;
  isPublic: boolean;
};

type PoolDetail = {
  pool: Pool;
  tests: PoolTest[];
  contributorCount: number;
  pendingCount: number;
  raisedUsd: number;
  namedReportCount: number;
  contributors?: PoolContributor[];
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  open: "Collecting",
  funded: "Fully Funded",
  sent_to_lab: "At Lab",
  results_received: "Results Posted",
  closed: "Closed",
  cancelled: "Cancelled",
};

const STATUS_COLOR: Record<string, string> = {
  draft:            "var(--t-muted)",
  open:             "#22c55e",
  funded:           "var(--t-blue)",
  sent_to_lab:      "#8B5CF6",
  results_received: "#E9A020",
  closed:           "var(--t-muted)",
  cancelled:        "#ef4444",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const s = polarToXY(cx, cy, r, startDeg);
  const e = polarToXY(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

function fmtUsd(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ── Vial cost formula ─────────────────────────────────────────────────────────
// Base price covers 1 vial. Each additional vial adds $60 ONCE for the whole
// pool (not per test). testCost() returns just the base price for a single test.
const EXTRA_VIAL_COST = 60;
function testCost(t: { unitPriceUsd: number; quantity: number }): number {
  return t.unitPriceUsd;
}
// Pool-level extra-vial surcharge (applied once, regardless of test count).
function extraVialCost(tests: { quantity: number }[]): number {
  const qty = tests.length > 0 ? (tests[0].quantity || 1) : 1;
  return Math.max(0, qty - 1) * EXTRA_VIAL_COST;
}

// ── Pool Gauge ────────────────────────────────────────────────────────────────

const ARC1 = "#3B82F6";
const ARC2 = "#8B5CF6";
const ARC3 = "#E9A020";
const ARC4 = "#10B981";
const HIT  = "#10B981";
const STEP_COLORS_DEF = [ARC1, ARC2, ARC3, ARC4];

interface GaugeSegment {
  color: string;
  cost: number;
}

interface GaugeProps {
  raisedUsd: number;
  segments: GaugeSegment[];   // one per test step, in order
  contributorCount: number;
}

function PoolGauge({ raisedUsd, segments, contributorCount }: GaugeProps) {
  const SIZE = 280;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const START = 135;
  const END   = 405;
  const TOTAL = END - START;
  const R  = 104;
  const SW = 18;

  const totalGoal = segments.reduce((s, seg) => s + seg.cost, 0);
  const allFunded = totalGoal > 0 && raisedUsd >= totalGoal;

  // Build segment angle bounds — segment colours are always their step colour,
  // never collapsed to a single colour, even when fully funded.
  let cumCost = 0;
  const segs = segments.map(seg => {
    const startFrac = totalGoal > 0 ? cumCost / totalGoal : 0;
    cumCost += seg.cost;
    const endFrac   = totalGoal > 0 ? cumCost / totalGoal : 1;
    return {
      color: seg.color,
      startAngle: START + startFrac * TOTAL,
      endAngle:   START + endFrac   * TOTAL,
      startCost:  cumCost - seg.cost,
      endCost:    cumCost,
    };
  });

  return (
    <div className="flex flex-col items-center w-full">
      <svg width="100%" viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ overflow: "visible", maxWidth: SIZE }}>
        <defs>
          <filter id="gaugeFilled" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#10B981" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* Grey background track — full arc */}
        <path
          d={describeArc(cx, cy, R, START, END)}
          fill="none"
          stroke="var(--t-border)"
          strokeWidth={SW}
          strokeLinecap="butt"
        />

        {/* Coloured filled segments */}
        {segs.map((seg, i) => {
          // How much of this segment is filled?
          const fillEnd = Math.min(
            seg.endAngle,
            Math.max(seg.startAngle, seg.startAngle + (
              raisedUsd <= seg.startCost ? 0 :
              raisedUsd >= seg.endCost   ? (seg.endAngle - seg.startAngle) :
              ((raisedUsd - seg.startCost) / (seg.endCost - seg.startCost)) * (seg.endAngle - seg.startAngle)
            ))
          );
          if (fillEnd <= seg.startAngle + 0.01) return null;
          const isLast = i === segs.length - 1;
          const isFirst = i === 0;
          return (
            <motion.path
              key={i}
              d={describeArc(cx, cy, R, seg.startAngle, fillEnd)}
              fill="none"
              stroke={seg.color}
              strokeWidth={SW}
              strokeLinecap={isFirst && isLast ? "round" : isFirst ? "round" : isLast && fillEnd >= seg.endAngle - 0.5 ? "round" : "butt"}
              filter={allFunded ? "url(#gaugeFilled)" : undefined}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.2, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}
            />
          );
        })}

        {/* Segment dividers — only when multiple tests */}
        {segs.length > 1 && segs.slice(0, -1).map((seg, i) => {
          const angleDeg = seg.endAngle;
          const angleRad = (angleDeg - 90) * (Math.PI / 180);
          const inner = R - SW / 2 - 1;
          const outer = R + SW / 2 + 1;
          return (
            <line
              key={`div-${i}`}
              x1={cx + inner * Math.cos(angleRad)}
              y1={cy + inner * Math.sin(angleRad)}
              x2={cx + outer * Math.cos(angleRad)}
              y2={cy + outer * Math.sin(angleRad)}
              stroke="var(--t-bg)"
              strokeWidth={3}
              strokeLinecap="round"
            />
          );
        })}

        {/* Centre text */}
        <text x={cx} y={cy - 14} textAnchor="middle" fontSize="9" fontWeight="700"
          letterSpacing="0.12em" style={{ fill: "var(--t-muted)", textTransform: "uppercase" }}>
          POOL TOTAL
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontFamily="ui-monospace,SFMono-Regular,monospace"
          fontSize="28" fontWeight="800" letterSpacing="-0.03em" style={{ fill: "var(--t-text)" }}>
          {fmtUsd(raisedUsd)}
        </text>
        <text x={cx} y={cy + 32} textAnchor="middle" fontSize="9.5" fontWeight="600" letterSpacing="0.08em"
          style={{ fill: "var(--t-muted)", textTransform: "uppercase" }}>
          {contributorCount} CONTRIBUTOR{contributorCount !== 1 ? "S" : ""}
        </text>
      </svg>
    </div>
  );
}

// ── Step Card ─────────────────────────────────────────────────────────────────

interface StepCardProps {
  step: number;
  test: PoolTest;
  raisedUsd: number;
  cumulativeCost: number;
  accentColor: string;
}

function StepCard({ step, test, raisedUsd, cumulativeCost, accentColor }: StepCardProps) {
  const cost = testCost(test);
  const hit = raisedUsd >= cumulativeCost;
  const stepNum = String(step).padStart(2, "0");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: step * 0.1, type: "spring", stiffness: 280, damping: 24 }}
      className="flex-1 min-w-[180px] relative overflow-hidden"
      style={{
        borderRadius: 8,
        border: `1.5px solid ${hit ? HIT : "var(--t-border)"}`,
        background: hit ? "rgba(16,185,129,0.05)" : "var(--t-surface)",
        padding: "16px 18px",
        opacity: test.selected ? 1 : 0.5,
      }}
    >
      <div
        className="absolute -bottom-2 -right-1 select-none pointer-events-none font-black"
        style={{
          fontSize: 64,
          color: hit ? "rgba(16,185,129,0.07)" : "rgba(0,0,0,0.04)",
          lineHeight: 1,
          fontFamily: "ui-monospace,SFMono-Regular,monospace",
          letterSpacing: "-0.05em",
        }}
      >
        {stepNum}
      </div>
      <div className="relative">
        <div className="flex items-center gap-1.5 mb-2.5">
          {hit
            ? <Unlock className="w-3.5 h-3.5 shrink-0" style={{ color: HIT }} />
            : <Lock className="w-3.5 h-3.5 shrink-0" style={{ color: accentColor }} />}
          <span className="text-[9px] font-bold tracking-[0.14em] uppercase" style={{ color: hit ? HIT : accentColor }}>
            Step {stepNum} · {hit ? "Unlocked" : "Locked"}
          </span>
        </div>
        <p
          className="font-extrabold leading-none mb-1.5"
          style={{
            fontSize: 22,
            color: hit ? HIT : "var(--t-text)",
            fontFamily: "ui-monospace,SFMono-Regular,monospace",
            letterSpacing: "-0.02em",
          }}
        >
          {fmtUsd(cost)}
        </p>
        <p className="text-[13px] font-semibold leading-tight mb-1" style={{ color: "var(--t-text)" }}>
          {test.name}
        </p>
        <p className="text-[11px]" style={{ color: "var(--t-muted)" }}>
          {test.code} · {test.quantity} vial{test.quantity !== 1 ? "s" : ""}
        </p>
      </div>
    </motion.div>
  );
}

// ── Payment Method Card ────────────────────────────────────────────────────────

const METHOD_META: Record<string, { icon: string; label: string; accentColor: string }> = {
  crypto:   { icon: "💎", label: "Crypto",    accentColor: "#3B82F6" },
  paypal:   { icon: "🅿️", label: "PayPal",   accentColor: "#0070BA" },
  revolut:  { icon: "🔵", label: "Revolut",   accentColor: "#191C1F" },
  anonpay:  { icon: "🕵️", label: "AnonPay",  accentColor: "#6D28D9" },
  janoshik: { icon: "🧪", label: "Janoshik",  accentColor: "#059669" },
};

type ReceiptInfo = {
  method: string;
  methodDetail: string;
  txHash?: string;
  amount: number;
  namedReportOptIn: boolean;
  namedReportName: string;
  paidAt: string;
  participantRef: string;
  participantIdFull?: string;
};

interface PaymentSectionProps {
  pool: Pool;
  amount: string;
  participantId: string;
  namedReportOptIn: boolean;
  namedReportName: string;
  initialMethod?: string | null;
  initialCryptoCurrency?: string | null;
  onDone: (receipt: ReceiptInfo) => void;
}

function PaymentSection({ pool, amount, participantId, namedReportOptIn, namedReportName, initialMethod, initialCryptoCurrency, onDone }: PaymentSectionProps) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const methods = pool.paymentMethods ?? [];
  const [selectedMethod, setSelectedMethod] = useState<string | null>(
    initialMethod && methods.some(m => m.type === initialMethod)
      ? initialMethod
      : methods.length === 1 ? methods[0].type : null
  );
  const [walletCopied, setWalletCopied] = useState(false);
  const [refCopied, setRefCopied] = useState(false);
  const [janoshikPaymentRef, setJanoshikPaymentRef] = useState("");

  // Re-sync method selection whenever the set of available payment methods changes.
  // The useState initialiser only runs once at mount, so if the pool gains or loses methods
  // while PaymentSection is already mounted (e.g. admin adds Revolut/Crypto after AnonPay
  // was auto-selected), we need to explicitly update the selection here.
  const methodsKey = methods.map(m => m.type).join(",");
  useEffect(() => {
    // Never disrupt an AnonPay session already in progress (iframe shown or payment confirmed)
    if (anonPayIframeUrl || anonPayInitiated) return;
    if (methods.length === 1) {
      setSelectedMethod(methods[0].type);
    } else {
      // Only reset selection if the currently selected method is no longer in the list
      setSelectedMethod(prev => {
        if (prev && methods.some(m => m.type === prev)) return prev;
        return null;
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [methodsKey]);
  // Live pool stats — poll every 10s while user is on the payment screen
  const [liveStats, setLiveStats] = useState<{ raisedUsd: number; contributorCount: number; pendingCount: number; goalUsd: number } | null>(null);
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const r = await fetch(`/api/testing-pools/${pool.slug}`, { credentials: "include" });
        if (!r.ok || cancelled) return;
        const d = await r.json();
        if (!cancelled) setLiveStats({
          raisedUsd: d.raisedUsd ?? 0,
          contributorCount: d.contributorCount ?? 0,
          pendingCount: d.pendingCount ?? 0,
          goalUsd: d.pool?.targetAmountUsd ?? 0,
        });
      } catch {}
    };
    poll();
    const id = setInterval(poll, 10_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [pool.slug]);

  const [txHash, setTxHash] = useState("");
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AnonPay / Trocador state
  const [anonPayIframeUrl, setAnonPayIframeUrl] = useState<string | null>(null);
  const [anonPayInitializing, setAnonPayInitializing] = useState(false);
  const [anonPayError, setAnonPayError] = useState("");
  const [anonPayInitiated, setAnonPayInitiated] = useState(false);
  const [anonPayStatusMsg, setAnonPayStatusMsg] = useState("");
  const [anonPayStatusChecking, setAnonPayStatusChecking] = useState(false);
  const [anonPayRetryCount, setAnonPayRetryCount] = useState(0);
  const anonPayCalledRef = useRef(false);

  useEffect(() => {
    if (!walletCopied) return;
    const t = setTimeout(() => setWalletCopied(false), 1500);
    return () => clearTimeout(t);
  }, [walletCopied]);

  const ANONPAY_MIN_USD = 4.55; // Trocador's actual minimum is ~$4.53

  // Auto-init AnonPay when the anonpay method is selected
  useEffect(() => {
    if (selectedMethod !== "anonpay") return;
    if (parseFloat(amount) < ANONPAY_MIN_USD) return; // below minimum — don't auto-init
    if (anonPayCalledRef.current) return;
    anonPayCalledRef.current = true;
    setAnonPayInitializing(true);
    setAnonPayError("");

    const controller = new AbortController();
    // 25s safety-net: if the server never responds, stop spinning
    const timeout = setTimeout(() => {
      controller.abort();
      setAnonPayError("AnonPay is taking too long to respond. Please try again.");
      setAnonPayInitializing(false);
    }, 25000);

    fetch(`/api/testing-pools/participants/${participantId}/init-anonpay`, { method: "POST", signal: controller.signal })
      .then(async r => {
        const text = await r.text();
        try { return JSON.parse(text) as { iframeUrl?: string; error?: string }; }
        catch { return { error: `Unexpected response: ${text.slice(0, 80)}` } as { iframeUrl?: string; error?: string }; }
      })
      .then((d) => {
        if (d.iframeUrl) setAnonPayIframeUrl(d.iframeUrl);
        else setAnonPayError(d.error || "Failed to initialise AnonPay. Please try again.");
      })
      .catch((e) => {
        if ((e as Error).name !== "AbortError") setAnonPayError("Network error reaching AnonPay. Please try again.");
      })
      .finally(() => { clearTimeout(timeout); setAnonPayInitializing(false); });

    return () => { controller.abort(); clearTimeout(timeout); };
  }, [selectedMethod, participantId, anonPayRetryCount]);

  // Auto-poll Trocador every 15 s once customer has initiated
  useEffect(() => {
    if (!anonPayInitiated) return;
    let cancelled = false;
    const poll = async () => {
      if (cancelled) return;
      try {
        const r = await fetch(`/api/testing-pools/participants/${participantId}/anonpay-status`);
        if (!r.ok) return;
        const d = await r.json() as { status?: string; paymentStatus?: string };
        if (d.paymentStatus === "verified") {
          setAnonPayStatusMsg("✓ Payment confirmed! Thank you.");
          const ap = methods.find((m) => m.type === "anonpay");
          const detail = ap?.type === "anonpay" ? `${ap.ticker} · ${(ap.wallet ?? "").slice(0, 12)}…` : "anonpay";
          onDone({
            method: "anonpay",
            methodDetail: detail,
            amount: parseFloat(amount),
            namedReportOptIn,
            namedReportName,
            paidAt: new Date().toISOString(),
            participantRef: participantId.slice(0, 8).toUpperCase(),
            participantIdFull: participantId,
          });
        }
      } catch { /* silent */ }
    };
    poll();
    const id = setInterval(poll, 15_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [anonPayInitiated, participantId]);

  const chosenMethod = methods.find(m => m.type === selectedMethod) ?? null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Select a JPEG or PNG image", variant: "destructive" });
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast({ title: "Image must be under 15 MB", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setScreenshotDataUrl(ev.target?.result as string ?? null);
    reader.readAsDataURL(file);
  };

  const buildReceipt = (method: string, hash?: string): ReceiptInfo => {
    const m = methods.find(x => x.type === method);
    let detail = method;
    if (m?.type === "crypto") detail = `${m.currency} · ${m.network}`;
    else if (m?.type === "paypal") detail = m.email ?? method;
    else if (m?.type === "revolut") detail = m.handle ?? method;
    else if (m?.type === "anonpay") detail = `${m.ticker} · ${(m.wallet ?? "").slice(0, 12)}…`;
    return {
      method,
      methodDetail: detail,
      txHash: hash,
      amount: parseFloat(amount),
      namedReportOptIn,
      namedReportName,
      paidAt: new Date().toISOString(),
      participantRef: participantId.slice(0, 8).toUpperCase(),
      participantIdFull: participantId,
    };
  };

  const submitCrypto = async () => {
    if (!txHash.trim()) { toast({ title: "Enter your transaction hash", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      const r = await fetch(`/api/testing-pools/participants/${participantId}/submit-tx`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash: txHash.trim() }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Failed");
      qc.invalidateQueries({ queryKey: ["/api/testing-pools"] });
      onDone(buildReceipt("crypto", txHash.trim()));
    } catch (e: any) {
      toast({ title: "Could not submit", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const submitScreenshot = async () => {
    if (selectedMethod === "janoshik" && !janoshikPaymentRef.trim()) {
      toast({ title: "Enter your payment reference", variant: "destructive" }); return;
    }
    if (!screenshotDataUrl) { toast({ title: "Upload a payment screenshot", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      const body: Record<string, string> = { screenshot: screenshotDataUrl };
      if (selectedMethod === "janoshik" && janoshikPaymentRef.trim()) {
        body.paymentRef = janoshikPaymentRef.trim();
      }
      const r = await fetch(`/api/testing-pools/participants/${participantId}/submit-screenshot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Failed");
      qc.invalidateQueries({ queryKey: ["/api/testing-pools"] });
      onDone(buildReceipt(selectedMethod ?? "unknown"));
    } catch (e: any) {
      toast({ title: "Could not submit", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = "w-full px-3 py-2.5 text-sm rounded-lg outline-none transition-colors";
  const inputStyle = { border: "1px solid var(--t-border)", color: "var(--t-text)", background: "var(--t-surface)" };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 p-5"
      style={{ borderRadius: 8, background: "rgba(233,160,32,0.06)", border: "1.5px solid rgba(233,160,32,0.4)" }}
    >
      <p className="text-[9px] font-bold tracking-[0.14em] uppercase" style={{ color: "#E9A020" }}>
        Send Payment —{" "}
        {namedReportOptIn
          ? <>{fmtUsd(parseFloat(amount))} <span style={{ color: "#7C3AED" }}>+ $30.00 (named report)</span></>
          : fmtUsd(parseFloat(amount))
        }
      </p>

      {/* Method selector (show when multiple options) */}
      {methods.length > 1 && (
        <div>
          <p className="text-[11px] font-semibold mb-2" style={{ color: "var(--t-muted)" }}>Choose payment method:</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {methods.map(m => {
              const meta = METHOD_META[m.type] ?? { icon: "💳", label: m.type, accentColor: "#6B7280" };
              const active = selectedMethod === m.type;
              return (
                <button
                  key={m.type}
                  onClick={() => setSelectedMethod(m.type)}
                  className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all text-center"
                  style={{
                    border: `2px solid ${active ? meta.accentColor : "var(--t-border)"}`,
                    background: active ? `${meta.accentColor}12` : "var(--t-surface)",
                  }}
                >
                  <span className="text-lg">{meta.icon}</span>
                  <span className="text-[11px] font-bold" style={{ color: active ? meta.accentColor : "var(--t-muted)" }}>
                    {meta.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Payment instructions per method */}
      {chosenMethod && (
        <div className="space-y-3">
          {chosenMethod.type === "crypto" && (
            <>
              <p className="text-xs" style={{ color: "var(--t-text)" }}>
                Send <span className="font-bold">{fmtUsd(parseFloat(amount))} {initialCryptoCurrency || chosenMethod.currency}</span> on{" "}
                <span className="font-bold">{chosenMethod.network}</span> to:
              </p>
              <div className="flex items-center gap-2 rounded-lg px-3 py-2"
                style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
                <code className="text-xs flex-1 break-all" style={{ color: "var(--t-text)" }}>
                  {chosenMethod.address}
                </code>
                <button
                  onClick={() => { navigator.clipboard.writeText(chosenMethod.address); setWalletCopied(true); }}
                  className="shrink-0 p-1.5 rounded-lg transition-opacity hover:opacity-70"
                >
                  {walletCopied
                    ? <CheckCircle2 className="w-4 h-4" style={{ color: "#22c55e" }} />
                    : <Copy className="w-4 h-4" style={{ color: "var(--t-muted)" }} />}
                </button>
              </div>
              <label className="block">
                <span className="text-[11px] font-semibold block mb-1" style={{ color: "var(--t-muted)" }}>Transaction hash:</span>
                <input value={txHash} onChange={e => setTxHash(e.target.value)}
                  placeholder="0x..." className={inputCls + " font-mono"} style={inputStyle} />
              </label>
              <button
                onClick={submitCrypto}
                disabled={!txHash || submitting}
                className="w-full px-4 py-3 text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                style={{ background: "var(--t-blue)", borderRadius: 8 }}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Transaction"}
              </button>
            </>
          )}

          {(chosenMethod.type === "paypal" || chosenMethod.type === "revolut" || chosenMethod.type === "janoshik") && (
            <>
              {chosenMethod.type === "paypal" && (
                <p className="text-xs" style={{ color: "var(--t-text)" }}>
                  Send <span className="font-bold">{fmtUsd(parseFloat(amount))}</span> via PayPal to:{" "}
                  <button
                    onClick={() => { navigator.clipboard.writeText(chosenMethod.email); setWalletCopied(true); }}
                    className="font-mono font-bold inline-flex items-center gap-1 transition-opacity hover:opacity-70"
                    style={{ color: "#0070BA" }}
                  >
                    {chosenMethod.email}
                    {walletCopied ? <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#22c55e" }} /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </p>
              )}
              {chosenMethod.type === "revolut" && (
                <p className="text-xs" style={{ color: "var(--t-text)" }}>
                  Send <span className="font-bold">{fmtUsd(parseFloat(amount))}</span> via Revolut to:{" "}
                  <button
                    onClick={() => { navigator.clipboard.writeText(chosenMethod.handle); setWalletCopied(true); }}
                    className="font-mono font-bold inline-flex items-center gap-1 transition-opacity hover:opacity-70"
                    style={{ color: "#191C1F" }}
                  >
                    {chosenMethod.handle}
                    {walletCopied ? <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#22c55e" }} /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </p>
              )}

              {chosenMethod.type === "janoshik" && (
                <div className="space-y-2">
                  <p className="text-xs" style={{ color: "var(--t-text)" }}>
                    Complete your payment of <span className="font-bold">{fmtUsd(parseFloat(amount))}</span> via Janoshik.
                  </p>
                  <a
                    href={(chosenMethod as any).url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
                    style={{ background: "#059669", borderRadius: 8 }}
                  >
                    🧪 Pay via Janoshik
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {/* ── Payment reference ── */}
              {chosenMethod.type === "janoshik" ? (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold" style={{ color: "var(--t-muted)" }}>
                    Payment Reference <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={janoshikPaymentRef}
                    onChange={e => setJanoshikPaymentRef(e.target.value)}
                    placeholder="e.g. 69f1bc70-d66b-ae8a-bb0b-bf76ac95ac90"
                    className="w-full h-10 px-3 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-100"
                    style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", color: "var(--t-text)" }}
                  />
                  <p className="text-[10px]" style={{ color: "var(--t-subtle)" }}>
                    Enter the reference from your Janoshik contribution history.
                  </p>
                </div>
              ) : (
                (() => {
                  const ref = `POOL-${participantId.slice(0, 4).toUpperCase()}-${participantId.slice(4, 8).toUpperCase()}`;
                  return (
                    <div className="rounded-xl p-3 space-y-2" style={{ background: "rgba(245,158,11,0.08)", border: "1.5px solid rgba(245,158,11,0.4)" }}>
                      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#92400e" }}>
                        ⚠️ Required: Include this reference in your payment note
                      </p>
                      <div className="flex items-center gap-2 rounded-lg px-3 py-2.5" style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(245,158,11,0.3)" }}>
                        <code className="flex-1 text-sm font-bold tracking-widest" style={{ color: "#92400e" }}>{ref}</code>
                        <button
                          onClick={() => { navigator.clipboard.writeText(ref); setRefCopied(true); setTimeout(() => setRefCopied(false), 2000); }}
                          className="shrink-0 p-1.5 rounded-lg transition-opacity hover:opacity-70"
                        >
                          {refCopied
                            ? <CheckCircle2 className="w-4 h-4" style={{ color: "#22c55e" }} />
                            : <Copy className="w-4 h-4" style={{ color: "#92400e" }} />}
                        </button>
                      </div>
                      <p className="text-[11px]" style={{ color: "#92400e" }}>
                        Without this reference the pool leader cannot match your payment.
                      </p>
                    </div>
                  );
                })()
              )}

              <div>
                <p className="text-[11px] font-semibold mb-2" style={{ color: "var(--t-muted)" }}>Upload payment screenshot:</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {screenshotDataUrl ? (
                  <div className="relative">
                    <img src={screenshotDataUrl} alt="Payment screenshot" className="w-full rounded-lg max-h-48 object-contain"
                      style={{ border: "1px solid var(--t-border)" }} />
                    <button
                      onClick={() => { setScreenshotDataUrl(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex flex-col items-center gap-2 py-6 rounded-lg transition-colors"
                    style={{ border: "2px dashed var(--t-border)", background: "var(--t-surface)" }}
                  >
                    <Upload className="w-6 h-6" style={{ color: "var(--t-muted)" }} />
                    <span className="text-xs" style={{ color: "var(--t-muted)" }}>Click to upload screenshot (JPEG or PNG)</span>
                  </button>
                )}
              </div>

              <button
                onClick={submitScreenshot}
                disabled={!screenshotDataUrl || submitting || (chosenMethod.type === "janoshik" && !janoshikPaymentRef.trim())}
                className="w-full px-4 py-3 text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                style={{ background: "var(--t-blue)", borderRadius: 8 }}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Payment Screenshot"}
              </button>
            </>
          )}

          {chosenMethod.type === "anonpay" && (
            <div className="space-y-3">
              <div className="flex gap-2 items-start p-3 rounded-xl" style={{ background: "rgba(109,40,217,0.07)", border: "1px solid rgba(109,40,217,0.2)" }}>
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "#7c3aed" }} />
                <p className="text-[11px] leading-relaxed" style={{ color: "var(--t-text)" }}>
                  <span className="font-semibold">AnonPay</span> is powered by{" "}
                  <a href="https://trocador.app" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2" style={{ color: "#7c3aed" }}>Trocador.app</a>
                  {" "}— a privacy-focused exchange. Pay with the crypto of your choice and it's automatically converted to the seller's preferred coin. No account or KYC required.
                </p>
              </div>
              {parseFloat(amount) < ANONPAY_MIN_USD ? (
                <div className="space-y-2">
                  <div className="p-4 rounded-xl space-y-2" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.28)" }}>
                    <div className="flex gap-2 items-center">
                      <Info className="w-4 h-4 shrink-0" style={{ color: "#d97706" }} />
                      <p className="text-sm font-semibold" style={{ color: "#92400e" }}>Minimum ${ANONPAY_MIN_USD.toFixed(2)} required for AnonPay</p>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--t-text)" }}>
                      AnonPay (via Trocador) requires a minimum of <strong>${ANONPAY_MIN_USD.toFixed(2)}</strong>. Your contribution is <strong>${parseFloat(amount).toFixed(2)}</strong>.
                    </p>
                  </div>
                  {methods.length > 1 && (
                    <button
                      onClick={() => setSelectedMethod(null)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold transition-opacity hover:opacity-80"
                      style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", color: "var(--t-text)" }}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Use a different payment method
                    </button>
                  )}
                </div>
              ) : anonPayError ? (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl space-y-2" style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.22)" }}>
                    <div className="flex gap-2 items-center">
                      <AlertCircle className="w-4 h-4 shrink-0" style={{ color: "#dc2626" }} />
                      <p className="text-sm font-semibold" style={{ color: "#b91c1c" }}>Payment setup failed</p>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--t-text)" }}>{anonPayError}</p>
                    {anonPayError.toLowerCase().includes("pool leader") && (
                      <p className="text-xs" style={{ color: "var(--t-muted)" }}>
                        You can continue browsing and return once the pool leader has fixed the configuration.
                      </p>
                    )}
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
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold transition-opacity hover:opacity-80"
                    style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", color: "var(--t-text)" }}
                  >
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                  </button>
                </div>
              ) : anonPayInitializing ? (
                <div className="flex flex-col items-center gap-3 py-8">
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--t-muted)" }} />
                  <p className="text-sm font-medium" style={{ color: "var(--t-muted)" }}>Setting up AnonPay…</p>
                  <p className="text-xs text-center" style={{ color: "var(--t-muted)" }}>Connecting to Trocador — this only takes a moment</p>
                </div>
              ) : anonPayIframeUrl ? (
                <>
                  {!anonPayInitiated && (
                    <div className="rounded-xl p-4 space-y-3 text-center" style={{ background: "rgba(109,40,217,0.06)", border: "1px solid rgba(109,40,217,0.18)" }}>
                      <p className="text-[11px] font-bold" style={{ color: "#5B21B6" }}>
                        🕵️ AnonPay via Trocador — {chosenMethod.ticker} · {chosenMethod.network}
                      </p>
                      <p className="text-xs" style={{ color: "var(--t-text)" }}>
                        Your secure payment page is ready. Tap below to open it on Trocador, complete your payment, then return here and press <strong>I've Initiated Payment</strong>.
                      </p>
                      <a
                        href={anonPayIframeUrl.replace("?embed=1", "")}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
                        style={{ background: "linear-gradient(135deg, #7C3AED, #6D28D9)", display: "flex" }}
                      >
                        <ExternalLink className="w-4 h-4" />
                        Open Payment Page on Trocador
                      </a>
                      <p className="text-[10px]" style={{ color: "var(--t-muted)" }}>Opens securely on trocador.app in a new tab</p>
                    </div>
                  )}

                  {!anonPayInitiated && (
                    <button
                      onClick={async () => {
                        try {
                          const r = await fetch(`/api/testing-pools/participants/${participantId}/confirm-anonpay-initiation`, { method: "POST" });
                          const d = await r.json() as { ok?: boolean; paymentStatus?: string; error?: string };
                          if (r.ok) {
                            setAnonPayInitiated(true);
                          } else {
                            setAnonPayError(d.error || "Could not confirm initiation. Please try again.");
                          }
                        } catch {
                          setAnonPayError("Network error. Please try again.");
                        }
                      }}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-opacity hover:opacity-80"
                      style={{ background: "var(--t-surface)", border: "1.5px solid var(--t-border)", color: "var(--t-text)" }}
                    >
                      I've Initiated Payment
                    </button>
                  )}

                  {anonPayInitiated && (
                    <div className="space-y-3">
                      <div className="flex flex-col items-center gap-2 py-6 rounded-xl" style={{ background: "rgba(109,40,217,0.05)", border: "1px solid rgba(109,40,217,0.15)" }}>
                        <span className="text-3xl">⏳</span>
                        <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>Awaiting Payment Confirmation</p>
                        <p className="text-xs text-center" style={{ color: "var(--t-muted)" }}>
                          Your payment is being processed by Trocador. Tap below to check whether it has been received.
                        </p>
                      </div>

                      {anonPayStatusMsg && (
                        <div
                          className="flex gap-2 items-start p-3 rounded-xl border text-xs font-medium"
                          style={
                            anonPayStatusMsg.startsWith("✓")
                              ? { background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.3)", color: "#065f46" }
                              : { background: "var(--t-surface)", border: "1px solid var(--t-border)", color: "var(--t-text)" }
                          }
                        >
                          {anonPayStatusMsg}
                        </div>
                      )}

                      <button
                        onClick={async () => {
                          setAnonPayStatusChecking(true);
                          setAnonPayStatusMsg("");
                          try {
                            const r = await fetch(`/api/testing-pools/participants/${participantId}/anonpay-status`);
                            const d = await r.json() as { status?: string; paymentStatus?: string };
                            const s = (d.status ?? "").toLowerCase();
                            if (d.paymentStatus === "verified" || s === "anonpayfinished" || s === "finished" || s === "complete" || s === "completed") {
                              setAnonPayStatusMsg("✓ Payment confirmed! Thank you.");
                              const ap = methods.find((m) => m.type === "anonpay");
                              const detail = ap?.type === "anonpay" ? `${ap.ticker} · ${(ap.wallet ?? "").slice(0, 12)}…` : "anonpay";
                              onDone({ method: "anonpay", methodDetail: detail, amount: parseFloat(amount), namedReportOptIn, namedReportName, paidAt: new Date().toISOString(), participantRef: participantId.slice(0, 8).toUpperCase(), participantIdFull: participantId });
                            } else if (s === "anonpayfound") {
                              setAnonPayStatusMsg("⏳ Payment detected — waiting for confirmations. Check back in a minute.");
                            } else if (s === "anonpayexpired") {
                              setAnonPayStatusMsg("⚠️ This payment session has expired. Please contact the pool leader.");
                            } else {
                              setAnonPayStatusMsg("Payment not yet received. Please wait a few minutes and try again.");
                            }
                          } catch {
                            setAnonPayStatusMsg("Could not reach server. Please try again.");
                          }
                          setAnonPayStatusChecking(false);
                        }}
                        disabled={anonPayStatusChecking}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-opacity hover:opacity-80 disabled:opacity-60"
                        style={{ background: "var(--t-surface)", border: "1.5px solid var(--t-border)", color: "var(--t-text)" }}
                      >
                        {anonPayStatusChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        {anonPayStatusChecking ? "Checking…" : "Check Payment Status"}
                      </button>

                      <button
                        onClick={() => setAnonPayInitiated(false)}
                        className="w-full text-xs text-center py-1 transition-opacity hover:opacity-70"
                        style={{ color: "var(--t-muted)" }}
                      >
                        ← Back to payment page
                      </button>
                    </div>
                  )}

                  {!anonPayInitiated && (
                    <div className="flex gap-2 items-start p-3 rounded-xl" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
                      <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "var(--t-muted)" }} />
                      <p className="text-xs" style={{ color: "var(--t-muted)" }}>
                        Complete your payment on Trocador, then tap "I've Initiated Payment" to confirm.
                      </p>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          )}
        </div>
      )}

      {!chosenMethod && methods.length > 1 && (
        <p className="text-xs text-center py-3" style={{ color: "var(--t-muted)" }}>Select a payment method above to continue.</p>
      )}

      {/* Live pool progress gauge strip */}
      {liveStats && (
        <div className="mt-2 pt-3 border-t" style={{ borderColor: "rgba(233,160,32,0.25)" }}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] font-bold tracking-[0.14em] uppercase flex items-center gap-1" style={{ color: "#E9A020" }}>
              <span className="w-1.5 h-1.5 rounded-full inline-block animate-pulse" style={{ background: "#4ADE80" }} />
              Live Pool Progress
            </span>
            <span className="text-[10px] font-bold tabular-nums" style={{ color: "var(--t-text)" }}>
              ${liveStats.raisedUsd.toFixed(0)} / ${liveStats.goalUsd.toFixed(0)}
            </span>
          </div>
          {liveStats.goalUsd > 0 && (
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(233,160,32,0.15)" }}>
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${Math.min(100, (liveStats.raisedUsd / liveStats.goalUsd) * 100).toFixed(1)}%`,
                  background: "linear-gradient(90deg, #E9A020, #EAB308)",
                }}
              />
            </div>
          )}
          <p className="text-[9px] mt-1" style={{ color: "var(--t-muted)" }}>
            {liveStats.contributorCount} confirmed · {liveStats.pendingCount} pending · updates every 10s
          </p>
        </div>
      )}
    </motion.div>
  );
}

// ── Payment Receipt ───────────────────────────────────────────────────────────

function PaymentReceipt({ pool, receipt }: { pool: Pool; receipt: ReceiptInfo }) {
  const meta = METHOD_META[receipt.method] ?? { icon: "💳", label: receipt.method, accentColor: "#6B7280" };

  // Live pool stats — poll every 10s on the receipt/waiting screen
  const [liveStats, setLiveStats] = useState<{ raisedUsd: number; contributorCount: number; pendingCount: number; goalUsd: number } | null>(null);
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const r = await fetch(`/api/testing-pools/${pool.slug}`, { credentials: "include" });
        if (!r.ok || cancelled) return;
        const d = await r.json();
        if (!cancelled) setLiveStats({
          raisedUsd: d.raisedUsd ?? 0,
          contributorCount: d.contributorCount ?? 0,
          pendingCount: d.pendingCount ?? 0,
          goalUsd: d.pool?.targetAmountUsd ?? 0,
        });
      } catch {}
    };
    poll();
    const id = setInterval(poll, 10_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [pool.slug]);

  const fmtDate = (iso: string) => {
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
    >
      {/* Outer glow wrapper */}
      <div
        className="relative overflow-hidden"
        style={{
          borderRadius: 12,
          background: "var(--t-surface)",
          border: "2px solid rgba(16,185,129,0.4)",
          boxShadow: "0 0 0 4px rgba(16,185,129,0.08)",
        }}
      >
        {/* Top banner */}
        <div
          className="flex items-center gap-3 px-5 py-4"
          style={{ background: "linear-gradient(90deg, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.04) 100%)", borderBottom: "1px solid rgba(16,185,129,0.2)" }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "rgba(16,185,129,0.15)", border: "2px solid rgba(16,185,129,0.35)" }}
          >
            <CheckCircle2 className="w-5 h-5" style={{ color: HIT }} />
          </div>
          <div>
            <p className="text-sm font-extrabold" style={{ color: HIT }}>Payment submitted</p>
            <p className="text-[11px]" style={{ color: "var(--t-muted)" }}>
              Awaiting verification by the pool leader
            </p>
          </div>
        </div>

        {/* Receipt body — dashed border to mimic a printed receipt */}
        <div className="px-5 py-4 space-y-3.5">

          {/* Reference number */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-[0.14em] uppercase" style={{ color: "var(--t-muted)" }}>Reference</span>
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded"
              style={{ background: "var(--t-bg)", border: "1px solid var(--t-border)", color: "var(--t-text)" }}>
              #{receipt.participantRef}
            </span>
          </div>

          <div className="border-t border-dashed" style={{ borderColor: "var(--t-border)" }} />

          {/* Pool */}
          <div className="flex items-start justify-between gap-3">
            <span className="text-[10px] font-bold tracking-[0.14em] uppercase shrink-0" style={{ color: "var(--t-muted)" }}>Pool</span>
            <span className="text-xs font-semibold text-right" style={{ color: "var(--t-text)" }}>{pool.title}</span>
          </div>

          {/* Date */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-[0.14em] uppercase" style={{ color: "var(--t-muted)" }}>Date</span>
            <span className="text-xs" style={{ color: "var(--t-text)" }}>{fmtDate(receipt.paidAt)}</span>
          </div>

          <div className="border-t border-dashed" style={{ borderColor: "var(--t-border)" }} />

          {/* Method */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-[0.14em] uppercase" style={{ color: "var(--t-muted)" }}>Method</span>
            <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "var(--t-text)" }}>
              <span>{meta.icon}</span>
              <span>{meta.label}</span>
              <span className="text-[10px]" style={{ color: "var(--t-muted)" }}>· {receipt.methodDetail}</span>
            </span>
          </div>

          {/* TX hash (crypto only) */}
          {receipt.txHash && (
            <div className="flex items-start justify-between gap-3">
              <span className="text-[10px] font-bold tracking-[0.14em] uppercase shrink-0 mt-0.5" style={{ color: "var(--t-muted)" }}>TX Hash</span>
              <code className="text-[10px] break-all font-mono text-right" style={{ color: "var(--t-text)" }}>{receipt.txHash}</code>
            </div>
          )}

          {/* Named report */}
          {receipt.namedReportOptIn && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-[0.14em] uppercase" style={{ color: "var(--t-muted)" }}>Named Report</span>
              <span className="text-xs font-semibold" style={{ color: "#7C3AED" }}>
                ✓ {receipt.namedReportName || "Opted in"}
              </span>
            </div>
          )}

          <div className="border-t border-dashed" style={{ borderColor: "var(--t-border)" }} />

          {/* Amount — large */}
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] font-bold tracking-[0.14em] uppercase" style={{ color: "var(--t-muted)" }}>Total Paid</span>
            <span
              className="font-extrabold tabular-nums"
              style={{ fontSize: 22, color: HIT, fontFamily: "ui-monospace,SFMono-Regular,monospace", letterSpacing: "-0.02em" }}
            >
              {fmtUsd(receipt.amount)}
            </span>
          </div>

          {/* Status pill */}
          <div className="flex items-center justify-center gap-1.5 py-2 rounded-lg"
            style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.3)" }}>
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "#EAB308" }} />
            <span className="text-[11px] font-bold" style={{ color: "#CA8A04" }}>Pending verification</span>
          </div>

          <p className="text-[11px] text-center leading-relaxed" style={{ color: "var(--t-muted)" }}>
            The pool leader will review your payment and mark it as verified. You'll be counted as a confirmed contributor once verified.
          </p>

          {/* Live pool progress gauge — receipt / waiting screen */}
          {liveStats && (
            <div className="pt-3 border-t space-y-2" style={{ borderColor: "rgba(234,179,8,0.25)" }}>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold tracking-[0.14em] uppercase flex items-center gap-1" style={{ color: "#E9A020" }}>
                  <span className="w-1.5 h-1.5 rounded-full inline-block animate-pulse" style={{ background: "#4ADE80" }} />
                  Live Pool Progress
                </span>
                <span className="text-[10px] font-bold tabular-nums" style={{ color: "var(--t-text)" }}>
                  ${liveStats.raisedUsd.toFixed(0)} / ${liveStats.goalUsd.toFixed(0)}
                </span>
              </div>
              {liveStats.goalUsd > 0 && (
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(233,160,32,0.15)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(100, (liveStats.raisedUsd / liveStats.goalUsd) * 100).toFixed(1)}%`, background: "linear-gradient(90deg, #E9A020, #EAB308)" }}
                  />
                </div>
              )}
              <p className="text-[9px]" style={{ color: "var(--t-muted)" }}>
                {liveStats.contributorCount} confirmed · {liveStats.pendingCount} pending · auto-updates every 10s
              </p>
            </div>
          )}

          {/* Guest share / status link */}
          {receipt.participantIdFull && (
            <GuestShareLink pool={pool} participantId={receipt.participantIdFull} />
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Guest Share Link ──────────────────────────────────────────────────────────

function GuestShareLink({ pool, participantId }: { pool: Pool; participantId: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/pool/${pool.slug}/contribution/${participantId}`;

  const copy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.25)" }}>
      <div className="flex items-center gap-2">
        <Bookmark className="w-3.5 h-3.5 shrink-0" style={{ color: "#7C3AED" }} />
        <span className="text-[11px] font-bold" style={{ color: "#7C3AED" }}>Save your contribution link</span>
      </div>
      <p className="text-[10px] leading-relaxed" style={{ color: "var(--t-muted)" }}>
        Bookmark this link to check your payment status and see the test results when they're published. It's the only way to find your contribution without an account.
      </p>
      <div className="flex items-center gap-2">
        <code className="text-[9px] font-mono truncate flex-1 px-2 py-1.5 rounded" style={{ background: "rgba(124,58,237,0.1)", color: "var(--t-text)" }}>
          {url}
        </code>
        <button
          onClick={copy}
          className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
          style={{ background: copied ? "rgba(74,222,128,0.15)" : "rgba(124,58,237,0.15)", color: copied ? "#4ADE80" : "#7C3AED", border: `1px solid ${copied ? "rgba(74,222,128,0.3)" : "rgba(124,58,237,0.3)"}` }}
        >
          {copied ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-[10px] font-semibold transition-opacity hover:opacity-80"
        style={{ color: "#7C3AED" }}
      >
        <Share2 className="w-3 h-3" />
        Open my contribution page
      </a>
    </div>
  );
}

// ── Layout wrapper (Profile Hub bottom nav) ──────────────────────────────────

function PoolLayout({ title, children }: { title?: string; children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  return (
    <PageLayout title={title}>
      {children}
      <HubBottomNav
        section={"lab-pool" as HubSection}
        setSection={(s: HubSection) => setLocation(`/account?s=${s}`)}
        hubMoreOpen={false}
        setHubMoreOpen={() => {}}
      />
    </PageLayout>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function TestingPool() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, setLocation] = useLocation();

  const { account, isLoading: accountLoading } = useAccount();

  const [contributeOpen, setContributeOpen] = useState(false);
  const [closedTestsOpen, setClosedTestsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [deletingTestId, setDeletingTestId] = useState<string | null>(null);
  const [amount, setAmount] = useState<string>("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactTelegram, setContactTelegram] = useState("");
  const [displayName, setDisplayName] = useState("");
  const { isDark } = useTheme();
  const [isPublic, setIsPublic] = useState(true);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReceiptInfo | null>(null);
  const [imageLightbox, setImageLightbox] = useState(false);
  const [resultsPassword, setResultsPassword] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [shareCopied, setShareCopied] = useState(false);
  const [resultsData, setResultsData] = useState<{
    resultNotes: string | null;
    resultPdfUrl: string | null;
    perTest: Array<{ poolTestId: string; testCode: string; testName: string; passed: boolean | null; result: string | null; notes: string | null }>;
  } | null>(null);
  const [voteIds, setVoteIds] = useState<string[]>([]);

  // Identity gate — shown to non-signed-in visitors before the contribution form
  const [identityChoice, setIdentityChoice] = useState<"pending" | "sign-in" | "sign-up" | "guest">("pending");

  // Named report opt-in
  const [namedReportOptIn, setNamedReportOptIn] = useState(false);
  const [namedReportName, setNamedReportName] = useState("");

  // Vial contribution offer
  const [canProvideVial, setCanProvideVial] = useState(false);

  // Selected payment method (for pre-opt-in)
  const [selectedMethodType, setSelectedMethodType] = useState<string | null>(null);
  // Chosen crypto token (USDT/USDC) when the pool's wallet is an ERC-20 rail.
  // null = pool default (first option). Persisted at opt-in so verification matches.
  const [selectedCryptoCurrency, setSelectedCryptoCurrency] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<PoolDetail>({
    queryKey: ["/api/testing-pools", slug, refreshKey],
    queryFn: async () => {
      const r = await fetch(`/api/testing-pools/${slug}`, { credentials: "include" });
      if (!r.ok) throw new Error("Pool not found");
      return r.json();
    },
  });

  // Pool leader participant management
  const { data: leaderParticipants, refetch: refetchLeaderParticipants } = useQuery<Array<{
    id: string; displayName: string | null; accountUsername: string | null; contactEmail: string | null; contactTelegram: string | null;
    amountUsd: number; paymentStatus: string; paymentMethod: string | null; paymentScreenshotUrl: string | null; paymentTxHash: string | null;
    namedReportOptIn: boolean; namedReportName: string | null; createdAt: string;
  }>>({
    queryKey: ["/api/account/pool-leader/participants", slug],
    queryFn: async () => {
      if (!data?.pool?.id) return [];
      const r = await fetch(`/api/account/pool-leader/pools/${data.pool.id}/participants`, { credentials: "include" });
      if (!r.ok) return [];
      return r.json();
    },
    enabled: !!account && !!data?.pool && account.telegramUsername === data.pool.leaderUsername,
  });

  const reviewParticipant = useMutation({
    mutationFn: async ({ participantId, status }: { participantId: string; status: string }) => {
      const r = await fetch(`/api/account/pool-leader/participants/${participantId}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: status }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? "Failed");
    },
    onSuccess: () => { refetchLeaderParticipants(); toast({ title: "Payment status updated" }); },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  // Auto-fill Telegram from account when signed in
  useEffect(() => {
    if (account?.telegramUsername && !contactTelegram) {
      setContactTelegram(`@${account.telegramUsername}`);
    }
  }, [account?.telegramUsername]);

  // Restore participant state from sessionStorage on mount
  useEffect(() => {
    if (!slug) return;
    const key = `pool-contrib-${slug}`;
    const stored = sessionStorage.getItem(key);
    if (!stored) return;
    try {
      const s = JSON.parse(stored) as { participantId: string; amount: string; namedReportOptIn: boolean; namedReportName: string; paymentCurrency?: string | null; receipt?: ReceiptInfo };
      if (!s.participantId) return;
      // Check current status from server
      fetch(`/api/testing-pools/participants/${s.participantId}/status`)
        .then(r => r.ok ? r.json() : null)
        .then((d: { paymentStatus?: string } | null) => {
          if (!d) { sessionStorage.removeItem(key); return; }
          setParticipantId(s.participantId);
          setAmount(s.amount);
          setNamedReportOptIn(s.namedReportOptIn);
          setNamedReportName(s.namedReportName);
          if (s.paymentCurrency) setSelectedCryptoCurrency(s.paymentCurrency);
          if (s.receipt && (d.paymentStatus === "submitted" || d.paymentStatus === "verified")) {
            setReceipt(s.receipt);
          }
        })
        .catch(() => {});
    } catch { sessionStorage.removeItem(`pool-contrib-${slug}`); }
  }, [slug]);

  const optInMutation = useMutation({
    mutationFn: async () => {
      const pool = data!.pool;
      const finalAmount = pool.fixedOptInFeeUsd != null ? String(pool.fixedOptInFeeUsd) : amount;
      const poolMethods = pool.paymentMethods ?? [];
      const cryptoChosen = selectedMethodType === "crypto" || (poolMethods.length === 1 && poolMethods[0]?.type === "crypto");
      const r = await fetch(`/api/testing-pools/${slug}/opt-in`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactEmail: contactEmail || undefined,
          contactTelegram: contactTelegram || undefined,
          displayName: displayName || undefined,
          isPublic: isPublic || undefined,
          amountUsd: parseFloat(finalAmount),
          voteTestIds: voteIds.length > 0 ? voteIds : undefined,
          paymentMethod: selectedMethodType || undefined,
          // Only meaningful for the crypto rail; the server validates + persists it.
          cryptoCurrency: cryptoChosen ? (selectedCryptoCurrency || undefined) : undefined,
          namedReportOptIn: namedReportOptIn || undefined,
          namedReportName: namedReportOptIn && namedReportName ? namedReportName : undefined,
          canProvideVial: canProvideVial || undefined,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Failed to opt in");
      return j as { participantId: string; amount: number };
    },
    onSuccess: (j) => {
      setParticipantId(j.participantId);
      const newAmount = String(j.amount);
      setAmount(newAmount);
      sessionStorage.setItem(`pool-contrib-${slug}`, JSON.stringify({
        participantId: j.participantId,
        amount: newAmount,
        namedReportOptIn,
        namedReportName,
        paymentCurrency: selectedCryptoCurrency,
      }));
      toast({ title: "You're in!", description: "Complete your payment below." });
    },
    onError: (e: Error) => toast({ title: "Could not opt in", description: e.message, variant: "destructive" }),
  });

  const unlockResultsMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/testing-pools/${slug}/results-unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resultsPassword }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Failed");
      return j as { resultNotes: string | null; resultPdfUrl: string | null };
    },
    onSuccess: (j: any) => setResultsData({ resultNotes: j.resultNotes, resultPdfUrl: j.resultPdfUrl, perTest: Array.isArray(j.perTest) ? j.perTest : [] }),
    onError: (e: Error) => toast({ title: "Cannot unlock", description: e.message, variant: "destructive" }),
  });

  const requestDeleteMutation = useMutation({
    mutationFn: async (testId: string) => {
      setDeletingTestId(testId);
      const r = await fetch(`/api/testing-pools/${slug}/tests/${testId}/request-delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(account ? { Authorization: `Bearer ${localStorage.getItem("account_token")}` } : {}) },
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/testing-pools/${slug}`] });
      toast({ title: "Removal requested", description: "Admin will review and remove the test." });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
    onSettled: () => setDeletingTestId(null),
  });

  // ── Loading / error states ───────────────────────────────────────────────────

  const spinnerEl = (
    <PoolLayout title="Testing Pool">
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--t-blue)" }} />
      </div>
    </PoolLayout>
  );

  if (isLoading) return spinnerEl;
  if (error || !data) {
    return (
      <PoolLayout title="Testing Pool">
        <div className="p-8 text-center text-sm" style={{ color: "var(--t-muted)" }}>Pool not found.</div>
      </PoolLayout>
    );
  }

  const pool = data.pool;
  const isLeader = !!account && account.telegramUsername === pool.leaderUsername;
  // Rejected tests are hidden from everyone (backend already filters for non-owners, but guard here too)
  const visibleTests = data.tests.filter(t => (t.contributionStatus ?? "active") !== "rejected");
  const activeTests = visibleTests.filter(t => (t.contributionStatus ?? "active") !== "closed");
  const closedTests = visibleTests.filter(t => t.contributionStatus === "closed");
  const selectedTests = activeTests.filter(t => t.selected);
  const allTests = activeTests;
  const acceptingContributions = ["open", "funded"].includes(pool.status) && !(pool.stopOnFunded && pool.status === "funded");
  const statusColor = STATUS_COLOR[pool.status] ?? "var(--t-muted)";
  // Use the correct vial-cost formula: sum of base prices + pool-level extra-vial surcharge.
  // pool.targetAmountUsd (DB-stored) may be stale if saved with the old unitPrice×qty formula.
  const poolExtraVial = extraVialCost(selectedTests);
  const computedGoal = (selectedTests.reduce((s, t) => s + testCost(t), 0) + poolExtraVial) || pool.targetAmountUsd;
  const progressPct = computedGoal > 0 ? Math.min(100, (data.raisedUsd / computedGoal) * 100) : 0;

  let cumulative = 0;
  const testsWithCumulative = allTests.map(t => {
    const cost = testCost(t);
    cumulative += cost;
    return { test: t, cumulativeCost: cumulative };
  });

  const STEP_COLORS = STEP_COLORS_DEF;

  // Gauge and goal are based on SELECTED tests only — these are the tests the pool
  // leader has committed to running. Non-selected tests are shown at 50% opacity
  // as optional/pending choices and should not inflate the funding goal.
  // The extra-vial surcharge is appended as a final neutral segment when qty > 1.
  const gaugeSegments: GaugeSegment[] = selectedTests.map((t, i) => ({
    cost: testCost(t),
    color: STEP_COLORS[i] ?? ARC1,
  }));
  if (poolExtraVial > 0) {
    gaugeSegments.push({ cost: poolExtraVial, color: "#94A3B8" });
  }

  const inputCls = "w-full px-3 py-2.5 text-sm rounded-lg outline-none transition-colors";
  const inputStyle = {
    border: "1px solid var(--t-border)",
    color: "var(--t-text)",
    background: "var(--t-surface)",
  };

  const methods = pool.paymentMethods ?? [];
  const displayAmount = pool.fixedOptInFeeUsd != null ? String(pool.fixedOptInFeeUsd) : amount;
  const namedReportTotal = pool.fixedOptInFeeUsd != null
    ? pool.fixedOptInFeeUsd
    : null;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <PoolLayout title={pool.title}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6"
      >
        {/* ── Branded Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden mb-4 sm:mb-6"
          style={{
            borderRadius: 8,
            background: "linear-gradient(135deg, var(--t-blue-deep, #1B3A7A) 0%, #1e3a8a 100%)",
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ backgroundImage: "radial-gradient(circle at 90% 25%, rgba(255,255,255,0.1) 0%, transparent 55%)" }}
          />
          <div className="relative px-4 sm:px-6 py-4 sm:py-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <button
                    onClick={() => setLocation("/account?s=lab-pool")}
                    className="flex items-center gap-1 text-[10px] font-bold tracking-[0.12em] uppercase transition-opacity hover:opacity-60"
                    style={{ color: "rgba(255,255,255,0.5)" }}
                  >
                    <ChevronLeft className="w-3 h-3" />
                    Testing Pools
                  </button>
                  <span className="w-px h-3 shrink-0" style={{ background: "rgba(255,255,255,0.2)" }} />
                  <FlaskConical className="w-3.5 h-3.5 shrink-0" style={{ color: "rgba(255,255,255,0.45)" }} />
                  <span className="text-[9px] font-bold tracking-[0.2em] uppercase" style={{ color: "rgba(255,255,255,0.45)" }}>
                    Lab Testing Pool
                  </span>
                </div>
                <h1 className="text-[20px] sm:text-[22px] font-extrabold text-white leading-tight">{pool.title}</h1>
                {(pool.compoundName || pool.manufacturer) && (
                  <p className="text-[12px] mt-0.5" style={{ color: "rgba(255,255,255,0.6)" }}>
                    {[pool.compoundName, pool.manufacturer].filter(Boolean).join(" · ")}
                  </p>
                )}
                {(pool.batchNumber || pool.capColor || pool.mgSize || pool.manufacturingDate) && (
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                    {pool.batchNumber && (
                      <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                        Batch: <span className="font-semibold" style={{ color: "rgba(255,255,255,0.75)" }}>{pool.batchNumber}</span>
                      </span>
                    )}
                    {pool.capColor && (
                      <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                        Cap: <span className="font-semibold" style={{ color: "rgba(255,255,255,0.75)" }}>{pool.capColor}</span>
                      </span>
                    )}
                    {pool.mgSize && (
                      <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                        Size: <span className="font-semibold" style={{ color: "rgba(255,255,255,0.75)" }}>{pool.mgSize}</span>
                      </span>
                    )}
                    {pool.manufacturingDate && (
                      <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                        Mfg: <span className="font-semibold" style={{ color: "rgba(255,255,255,0.75)" }}>{pool.manufacturingDate}</span>
                      </span>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-2 sm:gap-3 mt-2.5 flex-wrap">
                  <span
                    className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                    style={{ background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.85)", border: "1px solid rgba(255,255,255,0.2)" }}
                  >
                    Led by @{pool.leaderUsername}
                  </span>
                  <span className="text-[11px] font-bold tabular-nums" style={{ color: "rgba(255,255,255,0.7)" }}>
                    {progressPct.toFixed(1)}% funded
                  </span>
                  {pool.fixedOptInFeeUsd != null && (
                    <span className="text-[11px] font-bold" style={{ color: "rgba(255,255,255,0.8)", background: "rgba(255,255,255,0.12)", padding: "1px 8px", borderRadius: 4 }}>
                      ${pool.fixedOptInFeeUsd} fixed fee
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                {/* Share + Refresh buttons row — always on top */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/pool/${pool.slug}`);
                      setShareCopied(true);
                      setTimeout(() => setShareCopied(false), 2000);
                    }}
                    className="w-9 h-9 flex items-center justify-center transition-opacity hover:opacity-70"
                    style={{ borderRadius: 6, background: "rgba(255,255,255,0.12)" }}
                    title="Copy pool link"
                  >
                    {shareCopied
                      ? <CheckCircle2 className="w-4 h-4" style={{ color: "#4ade80" }} />
                      : <Share2 className="w-4 h-4" style={{ color: "rgba(255,255,255,0.7)" }} />}
                  </button>
                  <button
                    onClick={() => setRefreshKey(k => k + 1)}
                    className="w-9 h-9 flex items-center justify-center shrink-0 transition-opacity hover:opacity-70"
                    style={{ borderRadius: 6, background: "rgba(255,255,255,0.12)" }}
                    title="Refresh"
                  >
                    <RefreshCw className="w-4 h-4" style={{ color: "rgba(255,255,255,0.7)" }} />
                  </button>
                </div>
                {/* Product image — below the buttons */}
                {pool.imageUrl && (
                  <button
                    onClick={() => setImageLightbox(true)}
                    className="block rounded-lg overflow-hidden transition-opacity hover:opacity-80"
                    style={{ width: 96, height: 96, border: "2px solid rgba(255,255,255,0.25)" }}
                    title="Click to enlarge"
                  >
                    <img src={pool.imageUrl} alt={pool.title} className="w-full h-full object-cover" />
                  </button>
                )}
              </div>
            </div>
            {/* ── Status Pipeline ── */}
            {(() => {
              const STAGES = [
                { key: "open",             label: "Collecting" },
                { key: "funded",           label: "Funded"     },
                { key: "sent_to_lab",      label: "At Lab"     },
                { key: "results_received", label: "Results"    },
              ] as const;
              const idx = STAGES.findIndex(s => s.key === pool.status);
              const activeIdx = idx === -1 ? 0 : idx;
              return (
                <div className="mt-3 sm:mt-4 px-1">
                  {/* Progress track + nodes */}
                  <div className="flex items-center w-full gap-0">
                    {STAGES.map((stage, i) => {
                      const done = i < activeIdx;
                      const active = i === activeIdx;
                      const nodeColor = done ? "#4ade80" : active ? "#ffffff" : "rgba(255,255,255,0.25)";
                      const ringColor = done ? "#4ade80" : active ? "#ffffff" : "rgba(255,255,255,0.2)";
                      const textColor = done ? "#4ade80" : active ? "#ffffff" : "rgba(255,255,255,0.35)";
                      const lineColor = done ? "#4ade80" : "rgba(255,255,255,0.15)";
                      return (
                        <div key={stage.key} className="flex items-center" style={{ flex: i < STAGES.length - 1 ? "1 1 0%" : "0 0 auto" }}>
                          {/* Node + label */}
                          <div className="flex flex-col items-center shrink-0">
                            <div
                              className="flex items-center justify-center"
                              style={{
                                width: 20, height: 20, borderRadius: "50%",
                                border: `2px solid ${ringColor}`,
                                background: done ? "#4ade80" : active ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)",
                                boxShadow: active ? "0 0 0 3px rgba(255,255,255,0.12)" : "none",
                                transition: "all 0.3s ease",
                              }}
                            >
                              {done && (
                                <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none">
                                  <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                              {active && <span className="w-2 h-2 rounded-full block" style={{ background: "#fff" }} />}
                            </div>
                            <span
                              className="text-[9px] font-bold tracking-wider mt-1 text-center leading-tight"
                              style={{ color: textColor, whiteSpace: "nowrap" }}
                            >
                              {stage.label}
                            </span>
                          </div>
                          {/* Connector line */}
                          {i < STAGES.length - 1 && (
                            <div
                              className="flex-1 h-px mx-1.5"
                              style={{
                                background: lineColor,
                                minWidth: 0,
                                transition: "background 0.3s ease",
                              }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </motion.div>

        {/* ── About this pool ── */}
        {pool.description && (
          <div
            className="mb-4 sm:mb-6"
            style={{ borderRadius: 8, background: "var(--t-surface2,var(--t-surface))", border: "1px solid var(--t-border)" }}
          >
            <button
              type="button"
              onClick={() => setAboutOpen(o => !o)}
              className="w-full flex items-center justify-between px-4 sm:px-5 py-3.5 text-left transition-colors hover:bg-black/[0.03]"
              style={{ borderRadius: aboutOpen ? "8px 8px 0 0" : 8 }}
            >
              <span className="text-[9px] font-bold tracking-[0.14em] uppercase" style={{ color: "var(--t-muted)" }}>About this pool</span>
              <ChevronDown
                className="w-4 h-4 transition-transform shrink-0"
                style={{ color: "var(--t-muted)", transform: aboutOpen ? "rotate(180deg)" : "rotate(0deg)" }}
              />
            </button>
            {aboutOpen && (
              <div className="px-4 sm:px-5 pb-4 pt-1" style={{ borderTop: "1px solid var(--t-border)" }}>
                <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: "var(--t-text)" }}>{pool.description}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Step Cards ── */}
        {allTests.length > 0 && (
          <div className="flex gap-3 mb-4 sm:mb-6 overflow-x-auto pb-1">
            {testsWithCumulative.map(({ test, cumulativeCost }, i) => (
              <StepCard
                key={test.id}
                step={i + 1}
                test={test}
                raisedUsd={data.raisedUsd}
                cumulativeCost={cumulativeCost}
                accentColor={STEP_COLORS[i] ?? ARC1}
              />
            ))}
          </div>
        )}


        {/* ── Closed Tests Dropdown ── */}
        {closedTests.length > 0 && (
          <div className="mb-4 sm:mb-5" style={{ borderRadius: 8, background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
            <button
              type="button"
              onClick={() => setClosedTestsOpen(o => !o)}
              className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-black/[0.03]"
              style={{ borderRadius: closedTestsOpen ? "8px 8px 0 0" : 8 }}
            >
              <span className="flex items-center gap-2">
                <span className="text-[9px] font-bold tracking-[0.14em] uppercase" style={{ color: "var(--t-muted)" }}>
                  Closed Tests
                </span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(100,116,139,0.12)", color: "var(--t-muted)" }}>
                  {closedTests.length}
                </span>
              </span>
              <ChevronDown
                className="w-4 h-4 transition-transform"
                style={{ color: "var(--t-muted)", transform: closedTestsOpen ? "rotate(180deg)" : "rotate(0deg)" }}
              />
            </button>
            {closedTestsOpen && (
              <div className="px-4 pb-3 space-y-1.5" style={{ borderTop: "1px solid var(--t-border)" }}>
                <p className="text-[10px] mt-2 mb-2" style={{ color: "var(--t-muted)" }}>
                  These tests are no longer accepting contributions.
                </p>
                {closedTests.map(t => (
                  <div key={t.id} className="flex items-center gap-2 px-3 py-2 rounded" style={{ background: "var(--t-bg)", border: "1px solid var(--t-border)" }}>
                    <span className="text-[11px] font-semibold flex-1" style={{ color: "var(--t-muted)" }}>{t.name}</span>
                    <span className="text-[10px] font-mono" style={{ color: "var(--t-muted)" }}>{t.code}</span>
                    <span className="text-[10px] font-semibold" style={{ color: "var(--t-muted)" }}>{fmtUsd(testCost(t))}</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(100,116,139,0.12)", color: "var(--t-muted)" }}>
                      Closed
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Two-column layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">

          {/* ── LEFT: Pool Progress Gauge + Opt-in form ── */}
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="p-4 sm:p-6"
              style={{
                borderRadius: 8,
                background: "var(--t-surface)",
                border: "1px solid var(--t-border)",
                boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] font-bold tracking-[0.14em] uppercase" style={{ color: "var(--t-muted)" }}>
                  Pool Progress
                </span>
                <span
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1"
                  style={{
                    borderRadius: 4,
                    background: `${statusColor}18`,
                    color: statusColor,
                    border: `1px solid ${statusColor}35`,
                  }}
                >
                  <span className="w-1.5 h-1.5 inline-block" style={{ background: statusColor, borderRadius: "50%" }} />
                  {STATUS_LABEL[pool.status] ?? pool.status}
                </span>
              </div>

              <PoolGauge
                raisedUsd={data.raisedUsd}
                segments={gaugeSegments}
                contributorCount={data.contributorCount}
              />

              <div className="flex items-center justify-center gap-5 mt-2 flex-wrap">
                {allTests.map((t, i) => (
                  <div key={t.id} className="flex items-center gap-1.5 group">
                    <span className="w-3 h-2 inline-block shrink-0" style={{ background: STEP_COLORS[i] ?? ARC1, borderRadius: 1 }} />
                    <span className="text-[10px] font-semibold" style={{ color: "var(--t-muted)" }}>
                      {t.name} · {fmtUsd(testCost(t))}
                      {t.contributionStatus === "delete_requested" && (
                        <span className="ml-1 text-[9px] font-bold px-1 py-0.5 rounded" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
                          Removal requested
                        </span>
                      )}
                    </span>
                    {isLeader && acceptingContributions && t.contributionStatus === "active" && (
                      <button
                        onClick={() => requestDeleteMutation.mutate(t.id)}
                        disabled={deletingTestId === t.id}
                        title="Request test removal"
                        className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-[9px] px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}
                      >
                        {deletingTestId === t.id ? "..." : "Request removal"}
                      </button>
                    )}
                  </div>
                ))}
                {poolExtraVial > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-2 inline-block" style={{ background: "#94A3B8", borderRadius: 1 }} />
                    <span className="text-[10px] font-semibold" style={{ color: "var(--t-muted)" }}>
                      Additional vials ({selectedTests.length > 0 ? (selectedTests[0].quantity || 1) - 1 : 0}×) · +{fmtUsd(poolExtraVial)}
                    </span>
                  </div>
                )}
              </div>

              {/* ── Community Vote Tally (compact) ── */}
              {pool.votingMode === "vote" && allTests.length > 0 && (
                <div className="mt-3 pt-2.5 border-t" style={{ borderColor: "var(--t-border)" }}>
                  <div className="flex items-center gap-1 mb-1.5">
                    <FlaskConical className="w-2.5 h-2.5" style={{ color: "var(--t-blue)" }} />
                    <span className="text-[8px] font-bold tracking-[0.12em] uppercase" style={{ color: "var(--t-blue)" }}>Votes</span>
                  </div>
                  <div className="space-y-1">
                    {(() => {
                      const maxVotes = Math.max(1, ...allTests.map(x => x.votes));
                      return allTests.map(t => {
                        const pct = (t.votes / maxVotes) * 100;
                        const abbrev = t.name.length > 18 ? t.name.slice(0, 16).trimEnd() + "…" : t.name;
                        return (
                          <div key={t.id} className="flex items-center gap-2">
                            <span className="text-[10px] shrink-0 w-28 truncate" style={{ color: "var(--t-muted)" }}>{abbrev}</span>
                            <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(45,107,204,0.12)" }}>
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "rgba(45,107,204,0.5)" }} />
                            </div>
                            <span className="text-[10px] font-semibold tabular-nums shrink-0" style={{ color: "var(--t-blue)" }}>{t.votes}</span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
            </motion.div>

          </div>

          {/* ── RIGHT: Contribute form + Contributors + Description + Results ── */}
          <div className="space-y-4">

            {/* Opt-in form — sits above Current Standings */}
            <AnimatePresence>
              {acceptingContributions && !participantId && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="overflow-hidden"
                  style={{
                    borderRadius: 8,
                    background: "var(--t-surface)",
                    border: "1px solid var(--t-border)",
                  }}
                >
                  {/* Dropdown header */}
                  <button
                    type="button"
                    onClick={() => setContributeOpen(o => !o)}
                    className="w-full flex items-center justify-between px-4 sm:px-5 py-4 text-left transition-colors hover:bg-black/[0.03]"
                  >
                    <span className="text-[9px] font-bold tracking-[0.14em] uppercase" style={{ color: "var(--t-muted)" }}>
                      Contribute to This Pool
                    </span>
                    <ChevronDown
                      className="w-4 h-4 transition-transform duration-200"
                      style={{ color: "var(--t-muted)", transform: contributeOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                    />
                  </button>

                  {/* Collapsible body */}
                  <div
                    className="px-4 sm:px-5 pt-4 pb-4 sm:pb-5 space-y-3"
                    style={{ borderTop: "1px solid var(--t-border)", display: contributeOpen ? "block" : "none" }}
                  >

                  {/* Identity gate — shown only when not signed in and no choice made yet */}
                  {!accountLoading && !account && identityChoice === "pending" && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-3"
                    >
                      <p className="text-[11px] leading-relaxed" style={{ color: "var(--t-muted)" }}>
                        Sign in to link this contribution to your account, or continue as a guest and save your link manually.
                      </p>
                      <div className="grid grid-cols-1 gap-2">
                        <button
                          type="button"
                          onClick={() => setLocation(`/login?next=${encodeURIComponent(`/pool/${slug}`)}`)}
                          className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl font-semibold text-[12px] transition-all"
                          style={{ background: "var(--t-bg)", border: "1.5px solid var(--t-border)", color: "var(--t-text)" }}
                        >
                          <LogIn className="w-4 h-4" style={{ color: "#E9A020" }} />
                          Sign In to my account
                        </button>
                        <button
                          type="button"
                          onClick={() => setLocation(`/login?tab=signup&next=${encodeURIComponent(`/pool/${slug}`)}`)}
                          className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl font-semibold text-[12px] transition-all"
                          style={{ background: "var(--t-bg)", border: "1.5px solid var(--t-border)", color: "var(--t-text)" }}
                        >
                          <UserPlus className="w-4 h-4" style={{ color: "#7C3AED" }} />
                          Create an account
                        </button>
                        <button
                          type="button"
                          onClick={() => setIdentityChoice("guest")}
                          className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl font-semibold text-[12px] transition-all"
                          style={{ background: "rgba(107,114,128,0.08)", border: "1.5px dashed var(--t-border)", color: "var(--t-muted)" }}
                        >
                          <User className="w-4 h-4" />
                          Continue as guest
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Show the rest of the form only when signed in OR guest choice confirmed */}
                  {(account || identityChoice === "guest") && (

                  <>{pool.votingMode === "vote" && (
                    <div
                      className="rounded-xl p-3.5 space-y-2.5"
                      style={{
                        border: "2px solid rgba(45,107,204,0.22)",
                        background: "rgba(45,107,204,0.04)",
                      }}
                    >
                      <p className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "var(--t-blue)" }}>
                        <FlaskConical className="w-3 h-3" />
                        Vote for tests
                      </p>
                      {allTests.map(t => (
                        <label key={t.id} className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={voteIds.includes(t.id)}
                            onChange={(e) => setVoteIds(prev => e.target.checked ? [...prev, t.id] : prev.filter(x => x !== t.id))}
                            className="rounded"
                            style={{ accentColor: "var(--t-blue)" }}
                          />
                          <span className="text-[12px] font-medium" style={{ color: "var(--t-text)" }}>{t.name}</span>
                          <span className="text-[11px] ml-auto shrink-0" style={{ color: "var(--t-muted)" }}>{t.votes} vote{t.votes !== 1 ? "s" : ""}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <label className="block">
                      <span className="text-[11px] font-semibold block mb-1" style={{ color: "var(--t-muted)" }}>Email (optional)</span>
                      <input value={contactEmail} onChange={e => setContactEmail(e.target.value)}
                        type="email" placeholder="you@example.com"
                        className={inputCls} style={inputStyle} />
                    </label>
                    <label className="block">
                      <span className="text-[11px] font-semibold flex items-center justify-between mb-1" style={{ color: "var(--t-muted)" }}>
                        <span>
                          Telegram / Discord
                          {!account && <span style={{ color: "var(--t-blue)", marginLeft: 2 }}>*</span>}
                        </span>
                        {account && contactTelegram === `@${account.telegramUsername}` && (
                          <span className="text-[10px] font-normal" style={{ color: "var(--t-blue)" }}>from your account</span>
                        )}
                      </span>
                      <input value={contactTelegram} onChange={e => setContactTelegram(e.target.value)}
                        placeholder="@yourhandle"
                        className={inputCls} style={inputStyle} />
                    </label>
                  </div>
                  {/* Public/anonymous picker */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold tracking-[0.1em] uppercase" style={{ color: "var(--t-muted)" }}>Visibility</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setIsPublic(true)}
                        className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all text-center"
                        style={{
                          border: `2px solid ${isPublic ? (isDark ? "rgba(74,222,128,0.5)" : "rgba(34,197,94,0.6)") : "var(--t-border)"}`,
                          background: isPublic ? (isDark ? "rgba(74,222,128,0.08)" : "rgba(34,197,94,0.08)") : "var(--t-surface)",
                        }}
                      >
                        <Eye className="w-4 h-4" style={{ color: isPublic ? "#16A34A" : "var(--t-muted)" }} />
                        <span className="text-[11px] font-bold leading-tight" style={{ color: isPublic ? "#16A34A" : "var(--t-muted)" }}>
                          Show my name
                        </span>
                        <span className="text-[10px] leading-tight" style={{ color: "var(--t-muted)" }}>publicly listed</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsPublic(false)}
                        className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all text-center"
                        style={{
                          border: `2px solid ${!isPublic ? (isDark ? "rgba(148,163,184,0.45)" : "rgba(100,116,139,0.45)") : "var(--t-border)"}`,
                          background: !isPublic ? (isDark ? "rgba(107,114,128,0.12)" : "rgba(100,116,139,0.08)") : "var(--t-surface)",
                        }}
                      >
                        <EyeOff className="w-4 h-4" style={{ color: !isPublic ? "var(--t-text)" : "var(--t-muted)" }} />
                        <span className="text-[11px] font-bold leading-tight" style={{ color: !isPublic ? "var(--t-text)" : "var(--t-muted)" }}>
                          Stay anonymous
                        </span>
                        <span className="text-[10px] leading-tight" style={{ color: "var(--t-muted)" }}>hidden from list</span>
                      </button>
                    </div>
                    {isPublic && (
                      <input
                        value={displayName}
                        onChange={e => setDisplayName(e.target.value)}
                        placeholder="Your display name…"
                        className={inputCls}
                        style={inputStyle}
                      />
                    )}
                  </div>

                  {/* Contribution amount — hidden if fixed fee */}
                  {pool.fixedOptInFeeUsd != null ? (
                    <div className="flex items-center justify-between px-3 py-2.5 rounded-lg"
                      style={{ background: "var(--t-bg)", border: "1px solid var(--t-border)" }}>
                      <span className="text-xs" style={{ color: "var(--t-muted)" }}>Fixed opt-in fee</span>
                      <span className="text-sm font-bold" style={{ color: "var(--t-text)" }}>
                        ${pool.fixedOptInFeeUsd.toFixed(2)}
                      </span>
                    </div>
                  ) : (
                    <label className="block">
                      <span className="text-[11px] font-semibold block mb-1" style={{ color: "var(--t-muted)" }}>Contribution amount (USD)</span>
                      <input value={amount} onChange={e => setAmount(e.target.value)}
                        type="number" min="1" step="0.01" placeholder="e.g. 25.00"
                        className={inputCls} style={inputStyle} />
                    </label>
                  )}

                  {/* Named report opt-in */}
                  {pool.contributorNamedReportEnabled && (() => {
                    const cap = pool.namedReportCap;
                    const taken = data?.namedReportCount ?? 0;
                    const full = cap != null && taken >= cap;
                    return (
                      <div
                        className="rounded-xl p-3 space-y-2"
                        style={{
                          border: `2px solid ${full ? "var(--t-border)" : namedReportOptIn ? "#8B5CF6" : "var(--t-border)"}`,
                          background: namedReportOptIn && !full ? "rgba(139,92,246,0.06)" : "var(--t-surface)",
                          opacity: full ? 0.6 : 1,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => !full && setNamedReportOptIn(o => !o)}
                          disabled={full}
                          className="w-full flex items-center gap-3 text-left disabled:cursor-not-allowed"
                        >
                          <div
                            className="w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all"
                            style={{
                              borderColor: namedReportOptIn && !full ? "#8B5CF6" : "var(--t-border)",
                              background: namedReportOptIn && !full ? "#8B5CF6" : "transparent",
                            }}
                          >
                            {namedReportOptIn && !full && <span className="w-2 h-2 block rounded-full bg-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold flex items-center gap-2 flex-wrap" style={{ color: namedReportOptIn && !full ? "#7C3AED" : "var(--t-text)" }}>
                              {full ? "Named report slots full" : "Get a named Janoshik report"}
                              {!full && <span className="text-emerald-600 font-semibold">+$30 (separate)</span>}
                              {cap != null && (
                                <span className="text-[10px] font-normal px-1.5 py-0.5 rounded" style={{ background: full ? "rgba(239,68,68,0.1)" : "rgba(139,92,246,0.1)", color: full ? "#ef4444" : "#7C3AED" }}>
                                  {taken}/{cap} slots
                                </span>
                              )}
                            </p>
                            <p className="text-[11px]" style={{ color: "var(--t-muted)" }}>
                              {full
                                ? "All named report spots have been claimed"
                                : "Your name appears on an individual Janoshik test report — $30 paid separately, not part of the pool"}
                            </p>
                          </div>
                        </button>
                        {namedReportOptIn && !full && (
                          <input
                            value={namedReportName}
                            onChange={e => setNamedReportName(e.target.value)}
                            placeholder="Name (As it's shown on the client name)"
                            className={inputCls}
                            style={inputStyle}
                          />
                        )}
                      </div>
                    );
                  })()}

                  {/* Vial contribution offer */}
                  {pool.allowVialContribution && (
                    <div
                      className="rounded-xl p-3"
                      style={{
                        border: `2px solid ${canProvideVial ? "rgba(14,165,233,0.5)" : "var(--t-border)"}`,
                        background: canProvideVial ? "rgba(14,165,233,0.05)" : "var(--t-surface)",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setCanProvideVial(v => !v)}
                        className="w-full flex items-center gap-3 text-left"
                      >
                        <div
                          className="w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all"
                          style={{
                            borderColor: canProvideVial ? "#0ea5e9" : "var(--t-border)",
                            background: canProvideVial ? "#0ea5e9" : "transparent",
                          }}
                        >
                          {canProvideVial && <span className="w-2 h-2 block rounded-full bg-white" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold" style={{ color: canProvideVial ? "#0284c7" : "var(--t-text)" }}>
                            I can contribute a vial 🧪
                          </p>
                          <p className="text-[11px]" style={{ color: "var(--t-muted)" }}>
                            Let the pool leader know you can provide a physical vial for testing
                          </p>
                        </div>
                      </button>
                    </div>
                  )}

                  {/* Payment method pre-selection (when multiple available) */}
                  {methods.length > 1 && (
                    <div>
                      <p className="text-[11px] font-semibold mb-2" style={{ color: "var(--t-muted)" }}>Payment method:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {methods.map(m => {
                          const meta = METHOD_META[m.type] ?? { icon: "💳", label: m.type, accentColor: "#6B7280" };
                          const active = selectedMethodType === m.type;
                          return (
                            <button key={m.type} type="button"
                              onClick={() => setSelectedMethodType(m.type)}
                              className="flex items-center gap-2 p-2.5 rounded-xl transition-all"
                              style={{
                                border: `2px solid ${active ? meta.accentColor : "var(--t-border)"}`,
                                background: active ? `${meta.accentColor}12` : "var(--t-surface)",
                              }}
                            >
                              <span>{meta.icon}</span>
                              <span className="text-xs font-semibold" style={{ color: active ? meta.accentColor : "var(--t-muted)" }}>
                                {meta.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Token choice (USDT/USDC) when the pool's wallet is an ERC-20 rail */}
                  {(() => {
                    const cryptoIsChosen = selectedMethodType === "crypto" || (methods.length === 1 && methods[0]?.type === "crypto");
                    const cryptoOptions = pool.availableCryptoOptions ?? [];
                    if (!cryptoIsChosen || cryptoOptions.length <= 1) return null;
                    const activeCur = (selectedCryptoCurrency ?? cryptoOptions[0].currency).toUpperCase();
                    return (
                      <div>
                        <p className="text-[11px] font-semibold mb-2" style={{ color: "var(--t-muted)" }}>Pay with:</p>
                        <div className="grid grid-cols-2 gap-2">
                          {cryptoOptions.map(opt => {
                            const active = activeCur === opt.currency.toUpperCase();
                            return (
                              <button key={opt.currency} type="button"
                                onClick={() => setSelectedCryptoCurrency(opt.currency)}
                                className="flex items-center justify-center p-2.5 rounded-xl transition-all"
                                style={{
                                  border: `2px solid ${active ? "var(--t-blue)" : "var(--t-border)"}`,
                                  background: active ? "var(--t-blue)" : "var(--t-surface)",
                                }}
                              >
                                <span className="text-xs font-bold" style={{ color: active ? "#fff" : "var(--t-muted)" }}>{opt.currency}</span>
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-[10px] mt-1.5" style={{ color: "var(--t-muted)" }}>
                          Both go to the same wallet on {cryptoOptions[0].network}.
                        </p>
                      </div>
                    );
                  })()}

                  <button
                    onClick={() => optInMutation.mutate()}
                    disabled={
                      (pool.fixedOptInFeeUsd == null && (!amount || parseFloat(amount) < 1)) ||
                      optInMutation.isPending ||
                      (namedReportOptIn && !namedReportName.trim()) ||
                      (!account && !contactTelegram.trim())
                    }
                    className="w-full px-4 py-3 text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                    style={{ background: "var(--t-blue)", borderRadius: 8 }}
                  >
                    {optInMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                      <>
                        <FlaskConical className="w-4 h-4" />
                        {(() => {
                          const base = namedReportTotal != null ? namedReportTotal : (amount ? parseFloat(amount) : null);
                          if (base == null) return "Opt In";
                          if (namedReportOptIn) return `Opt In — $${base.toFixed(2)} + $30.00`;
                          return `Opt In — $${base.toFixed(2)}`;
                        })()}
                      </>
                    )}
                  </button>
                  </>)}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Payment section — shown after opting in */}
            <AnimatePresence>
              {participantId && !receipt && methods.length > 0 && (
                <PaymentSection
                  pool={pool}
                  amount={displayAmount}
                  participantId={participantId}
                  namedReportOptIn={namedReportOptIn}
                  namedReportName={namedReportName}
                  initialMethod={selectedMethodType}
                  initialCryptoCurrency={selectedCryptoCurrency}
                  onDone={(r) => {
                    setReceipt(r);
                    const key = `pool-contrib-${slug}`;
                    const stored = sessionStorage.getItem(key);
                    if (stored) {
                      try {
                        const s = JSON.parse(stored);
                        sessionStorage.setItem(key, JSON.stringify({ ...s, receipt: r }));
                      } catch { /* ignore */ }
                    }
                  }}
                />
              )}
            </AnimatePresence>

            {/* Receipt */}
            {receipt && (
              <PaymentReceipt
                pool={pool}
                receipt={receipt}
              />
            )}

            {/* Current Standings */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
              className="p-4 sm:p-5"
              style={{ borderRadius: 8, background: "var(--t-surface)", border: "1px solid var(--t-border)" }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[13px] font-bold" style={{ color: "var(--t-text)" }}>Current Standings</p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--t-muted)" }}>
                    {data.contributorCount} contributor{data.contributorCount !== 1 ? "s" : ""} · {data.pendingCount} pending
                  </p>
                </div>
                <Users className="w-5 h-5 opacity-30" style={{ color: "var(--t-muted)" }} />
              </div>

              {data.contributorCount === 0 ? (
                <div className="text-center py-8">
                  <TestTube className="w-8 h-8 mx-auto mb-2 opacity-20" style={{ color: "var(--t-muted)" }} />
                  <p className="text-[12px]" style={{ color: "var(--t-muted)" }}>No contributors yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-baseline mb-1.5">
                      <span className="text-[12px] font-bold" style={{ color: "var(--t-text)" }}>{fmtUsd(data.raisedUsd)} raised</span>
                      <span className="text-[11px]" style={{ color: "var(--t-muted)" }}>of {fmtUsd(computedGoal)}</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--t-border)" }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: "var(--t-blue)" }}
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPct}%` }}
                        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>
                  </div>

                  {/* Contributors list */}
                  {data.contributors && data.contributors.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold tracking-[0.12em] uppercase mb-2" style={{ color: "var(--t-muted)" }}>Contributors</p>
                      <div className="flex flex-wrap gap-2">
                        {data.contributors.map((c) => (
                          <span
                            key={c.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold"
                            style={{ background: c.isPublic ? "rgba(74,222,128,0.1)" : "rgba(107,114,128,0.1)", color: c.isPublic ? "#16A34A" : "var(--t-muted)", border: `1px solid ${c.isPublic ? "rgba(74,222,128,0.25)" : "var(--t-border)"}` }}
                          >
                            {c.isPublic ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                            {c.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>

            {/* Pool Leader: Participant Payment Management */}
            {isLeader && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.26 }}
                className="p-4 sm:p-5"
                style={{ borderRadius: 8, background: "var(--t-surface)", border: "1px solid var(--t-border)" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[11px] font-bold tracking-[0.12em] uppercase" style={{ color: "var(--t-muted)" }}>Leader — Manage Payments</p>
                    <p className="text-[10px] mt-0.5" style={{ color: "var(--t-muted)" }}>Verify or reject participant payments</p>
                  </div>
                  <UserPlus className="w-4 h-4 opacity-30" style={{ color: "var(--t-muted)" }} />
                </div>
                {!leaderParticipants || leaderParticipants.length === 0 ? (
                  <p className="text-[12px] py-3 text-center" style={{ color: "var(--t-muted)" }}>No participants yet.</p>
                ) : (
                  <div className="space-y-2">
                    {leaderParticipants.map(p => {
                      const name = p.displayName ?? p.accountUsername ?? p.contactTelegram ?? p.contactEmail ?? "Anonymous";
                      const statusColor =
                        p.paymentStatus === "verified" ? "#16a34a" :
                        p.paymentStatus === "rejected" ? "#dc2626" :
                        p.paymentStatus === "submitted" ? "#b45309" : "var(--t-muted)";
                      return (
                        <div key={p.id} className="rounded-lg border p-3" style={{ background: "var(--t-bg)", border: "1px solid var(--t-border)" }}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-[12px] font-semibold truncate" style={{ color: "var(--t-text)" }}>{name}</p>
                              <p className="text-[10px] mt-0.5" style={{ color: statusColor }}>
                                ${p.amountUsd.toFixed(2)} · <span className="font-semibold">{p.paymentStatus}</span>
                                {p.paymentMethod && <span style={{ color: "var(--t-muted)" }}> · {p.paymentMethod}</span>}
                              </p>
                              {p.namedReportOptIn && (
                                <p className="text-[10px] mt-0.5 font-semibold" style={{ color: "#6d28d9" }}>
                                  Named report: {p.namedReportName ?? "—"}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-1.5 shrink-0 items-center">
                              {p.paymentStatus !== "verified" && (
                                <button
                                  onClick={() => reviewParticipant.mutate({ participantId: p.id, status: "verified" })}
                                  disabled={reviewParticipant.isPending}
                                  className="px-2 py-1 rounded text-[10px] font-bold transition-opacity disabled:opacity-50 hover:opacity-80"
                                  style={{ background: "#16a34a", color: "#fff" }}
                                >
                                  Verify
                                </button>
                              )}
                              {p.paymentStatus !== "rejected" && (
                                <button
                                  onClick={() => reviewParticipant.mutate({ participantId: p.id, status: "rejected" })}
                                  disabled={reviewParticipant.isPending}
                                  className="px-2 py-1 rounded text-[10px] font-bold transition-opacity disabled:opacity-50 hover:opacity-80"
                                  style={{ background: "#dc2626", color: "#fff" }}
                                >
                                  Reject
                                </button>
                              )}
                              {p.paymentStatus === "verified" && (
                                <button
                                  onClick={() => reviewParticipant.mutate({ participantId: p.id, status: "pending" })}
                                  disabled={reviewParticipant.isPending}
                                  className="px-2 py-1 rounded text-[10px] font-bold transition-opacity disabled:opacity-50 hover:opacity-80"
                                  style={{ background: "var(--t-border)", color: "var(--t-muted)" }}
                                >
                                  Undo
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* Lab Results */}
            {pool.hasResults && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.34 }}
                className="p-4 sm:p-5 space-y-3"
                style={{ borderRadius: 8, background: "var(--t-surface)", border: "1px solid var(--t-border)" }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: "var(--t-blue-10)" }}
                  >
                    <Lock className="w-3.5 h-3.5" style={{ color: "var(--t-blue)" }} />
                  </div>
                  <p className="text-[9px] font-bold tracking-[0.14em] uppercase" style={{ color: "var(--t-muted)" }}>Lab Results</p>
                </div>

                {!resultsData ? (
                  <div className="space-y-3">
                    <p className="text-xs" style={{ color: "var(--t-muted)" }}>
                      Enter the password the leader shared with contributors:
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="password" value={resultsPassword} onChange={e => setResultsPassword(e.target.value)}
                        placeholder="Password"
                        className={inputCls + " flex-1"} style={inputStyle}
                      />
                      <button
                        onClick={() => unlockResultsMutation.mutate()}
                        disabled={unlockResultsMutation.isPending}
                        className="px-4 py-2 text-sm font-bold text-white disabled:opacity-50 transition-opacity hover:opacity-90 shrink-0"
                        style={{ background: "var(--t-blue)", borderRadius: 8 }}
                      >
                        {unlockResultsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Unlock"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {resultsData.perTest.length > 0 && (
                      <div className="space-y-2">
                        {resultsData.perTest.map(r => (
                          <div
                            key={r.poolTestId}
                            className="rounded-lg px-4 py-3"
                            style={{ background: "var(--t-surface2,var(--t-surface))", border: "1px solid var(--t-border)" }}
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-bold" style={{ color: "var(--t-text)" }}>{r.testName}</span>
                              {r.passed != null && (
                                <span
                                  className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                                  style={r.passed
                                    ? { background: "rgba(34,197,94,0.12)", color: "#16A34A" }
                                    : { background: "rgba(239,68,68,0.12)", color: "#DC2626" }}
                                >
                                  {r.passed ? "PASS" : "FAIL"}
                                </span>
                              )}
                            </div>
                            {r.result && <p className="text-xs mt-1" style={{ color: "var(--t-text)" }}>{r.result}</p>}
                            {r.notes && <p className="text-[11px] mt-1 italic" style={{ color: "var(--t-muted)" }}>{r.notes}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                    {resultsData.resultNotes && (
                      <div
                        className="text-sm whitespace-pre-wrap rounded-lg p-4"
                        style={{ background: "var(--t-surface2,var(--t-surface))", color: "var(--t-text)", border: "1px solid var(--t-border)" }}
                      >
                        {resultsData.resultNotes}
                      </div>
                    )}
                    {resultsData.resultPdfUrl && (
                      <a
                        href={resultsData.resultPdfUrl} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-semibold hover:opacity-75 transition-opacity"
                        style={{ color: "var(--t-blue)" }}
                      >
                        View PDF Report <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Pool image lightbox */}
      {imageLightbox && pool.imageUrl && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.82)" }}
          onClick={() => setImageLightbox(false)}
        >
          <img
            src={pool.imageUrl}
            alt={pool.title}
            className="max-w-full max-h-[90vh] rounded-xl shadow-2xl object-contain"
            onClick={e => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full"
            style={{ background: "rgba(255,255,255,0.15)" }}
            onClick={() => setImageLightbox(false)}
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      )}
    </PoolLayout>
  );
}
