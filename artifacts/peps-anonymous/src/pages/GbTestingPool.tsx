import React, { useEffect, useState, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  FlaskConical, Loader2, AlertCircle, TestTube, RefreshCw,
  Lock, Unlock, CheckCircle2, Clock, XCircle, ChevronDown,
  ExternalLink, Users, ChevronLeft, Trophy, ClipboardList, FileText,
} from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { useAccount } from "@/hooks/use-account";
import { HubBottomNav, HubSection } from "@/components/HubBottomNav";
import { ClinicalPoolGauge } from "@/components/testing-pool/ClinicalPoolGauge";
import {
  ClinicalPanel,
  RoundStatusRail,
  ThresholdStepGrid,
  VoteLeaderboard,
} from "@/components/testing-pool/ClinicalTestingPoolUi";
import "@/components/testing-pool/clinical-testing-pool.css";

// ── types ─────────────────────────────────────────────────────────────────────

interface Milestone {
  label: string;
  amount: number;
  type: "test" | "vial";
  vialNum?: number;
}

interface TestingRound {
  id: string;
  status: string;
  contributionAmount: number;
  anyContribution: boolean;
  lateOptInEnabled: boolean;
  lateOptInVoteThreshold: number | null;
  resultNotes: string | null;
  resultPdfUrl: string | null;
  resultPostedAt: string | null;
  fundingNote: string | null;
  testOptions: string[];
  janoshikPaymentUrl: string | null;
  labShippingCost: number | null;
  voteOptions: string[] | null;
  maxCompoundVotes: number;
  maxTestVotes: number;
}

interface VoteSummary {
  peptideName: string;
  totalVotes: number;
  vials: Record<string, number>;
}

interface PendingContribution {
  id: string;
  amount: number;
  paymentMethod: string;
  txHash: string | null;
  status: string;
  rejectionReason: string | null;
}

interface PaymentMethods {
  cryptoWalletAddress: string | null;
  cryptoCurrency: string;
  cryptoNetwork: string;
  revolutHandle: string | null;
  paypalHandle: string | null;
  anonPayEnabled: boolean;
  anonPayWallet: string | null;
  anonPayTicker: string;
  anonPayNetwork: string;
  janoshikPaymentUrl: string | null;
}

interface TestingData {
  round: TestingRound | null;
  resultsAvailable: boolean;
  poolTotal: number;
  contributorCount: number;
  totalVotes: number;
  isOptedIn: boolean;
  isAdminView: boolean;
  hasGbOrder: boolean;
  hasVoted: boolean;
  existingVote: { peptideName: string; vialCount: number; testSelections: string[]; anonymous?: boolean } | null;
  milestones: Milestone[];
  thresholds: { tier1: number; tier2: number | null; leadingPeptide: string; leadingVials: number; testOrder: string[] };
  votes: VoteSummary[];
  publicVotes: { username: string | null; peptideName: string; vialCount: number }[];
  testVotes: Record<string, number>;
  vialVotes: Record<string, number>;
  pendingContribution: PendingContribution | null;
  peptideOptions: string[];
  peptideBatches?: Record<string, string>;
  paymentMethods: PaymentMethods;
  endotoxinPrice: number;
  vialPrice: number;
  maxVials: number;
}

// ── constants ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  active: "Collecting",
  closed: "Pool Closed",
  sent_to_lab: "Sent to Lab",
  results_received: "Results In",
};

const HIT  = "#10B981";

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtUsd(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ── layout wrapper ─────────────────────────────────────────────────────────────

export function GbPoolLayout({ title, children }: { title?: string; children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  return (
    <PageLayout title={title}>
      {children}
      <HubBottomNav
        section={"gb-testing" as HubSection}
        setSection={(s: HubSection) => setLocation(`/account?s=${s}`)}
        hubMoreOpen={false}
        setHubMoreOpen={() => {}}
      />
    </PageLayout>
  );
}

// ── Vote Form ─────────────────────────────────────────────────────────────────

function VoteForm({ gbId, peptideOptions, testOptions, maxVials, maxCompoundVotes, maxTestVotes, onDone }: {
  gbId: string; peptideOptions: string[]; testOptions: string[]; maxVials: number;
  maxCompoundVotes: number; maxTestVotes: number; onDone: () => void;
}) {
  const [compounds, setCompounds] = useState<string[]>([]);
  const [vialCount, setVialCount] = useState(1);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [open, setOpen] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [anonymous, setAnonymous] = useState(false);

  const effectiveMaxCompounds = maxCompoundVotes ?? 1;
  const effectiveMaxTests = maxTestVotes ?? 1;
  const testsAtCap = selectedTests.length >= effectiveMaxTests;

  const toggleCompound = (p: string) => {
    setCompounds(prev => {
      if (prev.includes(p)) return prev.filter(x => x !== p);
      if (prev.length >= effectiveMaxCompounds) return prev;
      return [...prev, p];
    });
  };

  const toggleTest = (t: string) => {
    setSelectedTests(prev => {
      if (prev.includes(t)) return prev.filter(x => x !== t);
      if (prev.length >= effectiveMaxTests) return prev;
      return [...prev, t];
    });
  };

  const submit = async () => {
    if (compounds.length === 0) { setErr("Pick a compound first"); return; }
    if (selectedTests.length === 0) { setErr("Pick at least one test type"); return; }
    setErr(null); setSubmitting(true);
    try {
      const r = await fetch(`/api/group-buys/${gbId}/testing/vote`, {
        method: "POST", headers: { "content-type": "application/json" }, credentials: "include",
        body: JSON.stringify({ peptideNames: compounds, vialCount, testSelections: selectedTests, anonymous }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Failed to submit vote");
      onDone();
    } catch (e: unknown) { setErr((e as Error).message); }
    finally { setSubmitting(false); }
  };

  const inputCls = "w-full px-3 py-2.5 text-sm rounded-lg outline-none transition-colors appearance-none";
  const inputStyle = { border: "1px solid var(--t-border)", color: "var(--t-text)", background: "var(--t-surface)" };

  return (
    <div className="overflow-hidden" style={{ borderRadius: 8, background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 sm:px-5 py-4 text-left transition-colors hover:bg-black/[0.03]">
        <span className="text-[9px] font-bold tracking-[0.14em] uppercase" style={{ color: "var(--t-muted)" }}>
          Cast Your Vote
        </span>
        <ChevronDown className="w-4 h-4 transition-transform duration-200"
          style={{ color: "var(--t-muted)", transform: open ? "rotate(180deg)" : "rotate(0deg)" }} />
      </button>
      <div className="px-4 sm:px-5 pt-4 pb-5 space-y-3" style={{ borderTop: "1px solid var(--t-border)", display: open ? "block" : "none" }}>
        {/* Compound — single select when cap=1, checkboxes when cap>1 */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold" style={{ color: "var(--t-muted)" }}>Which compound?</span>
            {effectiveMaxCompounds > 1 && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ background: compounds.length >= effectiveMaxCompounds ? "rgba(239,68,68,0.12)" : "rgba(59,130,246,0.1)", color: compounds.length >= effectiveMaxCompounds ? "#EF4444" : "var(--t-blue)" }}>
                {compounds.length}/{effectiveMaxCompounds}
              </span>
            )}
          </div>
          {effectiveMaxCompounds === 1 ? (
            <select value={compounds[0] ?? ""} onChange={e => setCompounds(e.target.value ? [e.target.value] : [])} className={inputCls} style={inputStyle}>
              <option value="">— select compound —</option>
              {peptideOptions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {peptideOptions.map(p => {
                const checked = compounds.includes(p);
                const disabled = !checked && compounds.length >= effectiveMaxCompounds;
                return (
                  <label key={p} className={`flex items-center gap-2.5 ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}>
                    <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggleCompound(p)}
                      className="rounded" style={{ accentColor: "var(--t-blue)" }} />
                    <span className="text-[12px] font-medium" style={{ color: "var(--t-text)" }}>{p}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Vials */}
        {maxVials > 1 && (
          <div>
            <span className="text-[11px] font-semibold block mb-1" style={{ color: "var(--t-muted)" }}>Number of vials</span>
            <div className="flex gap-2">
              {Array.from({ length: maxVials }, (_, i) => i + 1).map(v => (
                <button key={v} type="button" onClick={() => setVialCount(v)}
                  className="flex-1 py-2 text-sm font-semibold rounded-lg transition-colors"
                  style={{
                    border: `1px solid ${vialCount === v ? "var(--t-blue)" : "var(--t-border)"}`,
                    background: vialCount === v ? "rgba(59,130,246,0.1)" : "var(--t-surface)",
                    color: vialCount === v ? "var(--t-blue)" : "var(--t-text)",
                  }}>
                  {v}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Test types */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold" style={{ color: "var(--t-muted)" }}>Test types</span>
            {effectiveMaxTests < testOptions.length && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ background: testsAtCap ? "rgba(239,68,68,0.12)" : "rgba(59,130,246,0.1)", color: testsAtCap ? "#EF4444" : "var(--t-blue)" }}>
                {selectedTests.length}/{effectiveMaxTests}
              </span>
            )}
          </div>
          <div className="space-y-2">
            {testOptions.map(t => {
              const checked = selectedTests.includes(t);
              const disabled = !checked && testsAtCap;
              return (
                <label key={t} className={`flex items-center gap-2.5 ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}>
                  <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggleTest(t)}
                    className="rounded" style={{ accentColor: "var(--t-blue)" }} />
                  <span className="text-[12px] font-medium" style={{ color: "var(--t-text)" }}>{t}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Anonymous toggle */}
        <label className="flex items-start gap-2.5 cursor-pointer pt-1">
          <input type="checkbox" checked={anonymous} onChange={e => setAnonymous(e.target.checked)}
            className="rounded mt-0.5" style={{ accentColor: "var(--t-blue)" }} />
          <span className="text-[12px] font-medium" style={{ color: "var(--t-text)" }}>
            Vote anonymously
            <span className="block text-[10px] font-normal mt-0.5" style={{ color: "var(--t-muted)" }}>
              Hide my name from the public vote log
            </span>
          </span>
        </label>

        {err && <p className="text-[12px]" style={{ color: "#EF4444" }}>{err}</p>}

        <button type="button" onClick={submit} disabled={submitting}
          className="w-full px-4 py-3 text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
          style={{ background: "var(--t-blue)", borderRadius: 8 }}>
          {submitting
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <><FlaskConical className="w-4 h-4" />Submit Vote</>}
        </button>
      </div>
    </div>
  );
}

// ── Existing Vote Card ────────────────────────────────────────────────────────

function ExistingVoteCard({ vote }: { vote: { peptideName: string; vialCount: number; testSelections: string[]; anonymous?: boolean } }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}>
      <div className="relative overflow-hidden"
        style={{ borderRadius: 12, background: "var(--t-surface)", border: "2px solid rgba(16,185,129,0.4)", boxShadow: "0 0 0 4px rgba(16,185,129,0.08)" }}>
        <div className="flex items-center gap-3 px-5 py-4"
          style={{ background: "linear-gradient(90deg, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.04) 100%)", borderBottom: "1px solid rgba(16,185,129,0.2)" }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "rgba(16,185,129,0.15)", border: "2px solid rgba(16,185,129,0.35)" }}>
            <CheckCircle2 className="w-5 h-5" style={{ color: HIT }} />
          </div>
          <div>
            <p className="text-sm font-extrabold" style={{ color: HIT }}>Vote submitted</p>
            <p className="text-[11px]" style={{ color: "var(--t-muted)" }}>Your compound vote is locked in{vote.anonymous ? " · hidden from public" : ""}</p>
          </div>
        </div>
        <div className="px-5 py-4 space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-[0.14em] uppercase" style={{ color: "var(--t-muted)" }}>Compound</span>
            <span className="text-sm font-bold" style={{ color: "var(--t-text)" }}>
              {(() => { try { const p = JSON.parse(vote.peptideName); return Array.isArray(p) ? p.join(", ") : vote.peptideName; } catch { return vote.peptideName; } })()}
            </span>
          </div>
          <div className="border-t border-dashed" style={{ borderColor: "var(--t-border)" }} />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-[0.14em] uppercase" style={{ color: "var(--t-muted)" }}>Vials</span>
            <span className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>{vote.vialCount}</span>
          </div>
          {vote.testSelections.length > 0 && (
            <>
              <div className="border-t border-dashed" style={{ borderColor: "var(--t-border)" }} />
              <div className="flex items-start justify-between gap-3">
                <span className="text-[10px] font-bold tracking-[0.14em] uppercase shrink-0 mt-0.5" style={{ color: "var(--t-muted)" }}>Tests</span>
                <div className="flex flex-wrap gap-1.5 justify-end">
                  {vote.testSelections.map(t => (
                    <span key={t} className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(59,130,246,0.1)", color: "var(--t-blue)", border: "1px solid rgba(59,130,246,0.2)" }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Pending Contribution Card ─────────────────────────────────────────────────

function PendingContributionCard({ pc }: { pc: PendingContribution }) {
  const configs: Record<string, { label: string; color: string; bg: string; border: string; Icon: React.ElementType }> = {
    pending:  { label: "Payment Under Review",     color: "#CA8A04", bg: "rgba(234,179,8,0.07)",   border: "rgba(234,179,8,0.3)",   Icon: Clock },
    verified: { label: "Contribution Confirmed",    color: "#16A34A", bg: "rgba(74,222,128,0.07)",  border: "rgba(74,222,128,0.3)",  Icon: CheckCircle2 },
    rejected: { label: "Payment Rejected",          color: "#DC2626", bg: "rgba(239,68,68,0.07)",   border: "rgba(239,68,68,0.3)",   Icon: XCircle },
  };
  const cfg = configs[pc.status] ?? configs.pending;
  const { Icon } = cfg;
  return (
    <div className="p-4 rounded-lg space-y-1.5" style={{ background: cfg.bg, border: `1.5px solid ${cfg.border}` }}>
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 shrink-0" style={{ color: cfg.color }} />
        <p className="text-[12px] font-bold" style={{ color: cfg.color }}>{cfg.label}</p>
      </div>
      <p className="text-[13px]" style={{ color: "var(--t-text)" }}>
        {fmtUsd(pc.amount)} via <span className="font-medium capitalize">{pc.paymentMethod}</span>
      </p>
      {pc.rejectionReason && <p className="text-[12px]" style={{ color: "var(--t-muted)" }}>{pc.rejectionReason}</p>}
    </div>
  );
}

// ── Late Contribution Form ────────────────────────────────────────────────────

type PayMethod = { key: string; label: string; sublabel: string; address: string; trocadorUrl?: string; externalUrl?: string };

function LateContributionForm({ gbId, round, paymentMethods, onDone }: {
  gbId: string;
  round: TestingRound;
  paymentMethods: PaymentMethods;
  onDone: () => void;
}) {
  const methods: PayMethod[] = [];
  if (paymentMethods.cryptoWalletAddress) {
    methods.push({
      key: "crypto",
      label: `${paymentMethods.cryptoCurrency} Crypto`,
      sublabel: `${paymentMethods.cryptoNetwork} · Verified automatically on-chain`,
      address: paymentMethods.cryptoWalletAddress,
    });
  }
  if (paymentMethods.revolutHandle) {
    methods.push({ key: "revolut", label: "Revolut", sublabel: paymentMethods.revolutHandle, address: paymentMethods.revolutHandle });
  }
  if (paymentMethods.paypalHandle) {
    methods.push({ key: "paypal", label: "PayPal", sublabel: `paypal.me/${paymentMethods.paypalHandle}`, address: paymentMethods.paypalHandle });
  }
  if (paymentMethods.anonPayEnabled && paymentMethods.anonPayWallet) {
    const trocadorUrl = `https://trocador.app/anonpay/?ticker_to=${encodeURIComponent(paymentMethods.anonPayTicker)}&network_to=${encodeURIComponent(paymentMethods.anonPayNetwork)}&address=${encodeURIComponent(paymentMethods.anonPayWallet)}&name=Peps%20Anonymous`;
    methods.push({
      key: "anonpay",
      label: "AnonPay (Any Crypto)",
      sublabel: "Pay with BTC, ETH, XMR & 100+ coins — auto-converted, no account needed",
      address: paymentMethods.anonPayWallet,
      trocadorUrl,
    });
  }
  if (round.janoshikPaymentUrl) {
    methods.push({
      key: "janoshik",
      label: "Janoshik",
      sublabel: "Pay via Janoshik — opens their secure payment page",
      address: "",
      externalUrl: round.janoshikPaymentUrl,
    });
  }

  const [open, setOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState(methods[0]?.key ?? "");
  const [txHash, setTxHash] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const selectedDef = methods.find(m => m.key === selectedMethod);
  const fixedAmount = round.anyContribution ? null : round.contributionAmount;

  function copyAddress() {
    if (!selectedDef?.address) return;
    navigator.clipboard.writeText(selectedDef.address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const txHashLabel = selectedMethod === "anonpay"
    ? "Trocador Order ID (from your confirmation page)"
    : selectedMethod === "janoshik"
      ? "Payment reference (optional)"
      : "Transaction ID / reference";
  const txHashPlaceholder = selectedMethod === "anonpay"
    ? "Paste the Trocador order ID"
    : selectedMethod === "janoshik"
      ? "Order ref from Janoshik (optional)"
      : "Paste your tx hash or payment ref";
  const txHashRequired = selectedMethod !== "janoshik";

  async function handleSubmit() {
    if (!selectedMethod) { setErr("Select a payment method"); return; }
    const amount = fixedAmount ?? parseFloat(customAmount);
    if (!amount || amount <= 0) { setErr("Enter a valid amount"); return; }
    if (txHashRequired && !txHash.trim()) { setErr("Enter your transaction ID / reference"); return; }
    let finalTxHash = txHash.trim() || null;
    if (selectedMethod === "anonpay" && finalTxHash && !finalTxHash.startsWith("anonpay:")) {
      finalTxHash = `anonpay:${finalTxHash}`;
    }
    setSubmitting(true);
    setErr(null);
    try {
      const r = await fetch(`/api/group-buys/${gbId}/testing/contribute`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ paymentMethod: selectedMethod, txHash: finalTxHash, amount }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error ?? "Failed to submit"); return; }
      onDone();
    } finally { setSubmitting(false); }
  }

  if (methods.length === 0) return null;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full text-[13px] font-bold px-4 py-2.5 rounded-lg text-left"
        style={{ background: "var(--t-blue)", color: "white" }}>
        {fixedAmount ? `Pay ${fmtUsd(fixedAmount)} to join` : "Submit payment"}
      </button>
    );
  }

  return (
    <div className="space-y-3 pt-3 border-t" style={{ borderColor: "var(--t-border)" }}>
      <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--t-muted)" }}>
        How would you like to pay?
        {fixedAmount && <span className="ml-2 normal-case font-normal">Total: {fmtUsd(fixedAmount)}</span>}
      </p>

      {/* Method cards */}
      <div className="space-y-2">
        {methods.map(m => (
          <button key={m.key} onClick={() => setSelectedMethod(m.key)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 text-left transition-all"
            style={{
              borderColor: selectedMethod === m.key ? "var(--t-blue)" : "var(--t-border)",
              background: selectedMethod === m.key ? "color-mix(in srgb, var(--t-blue) 8%, transparent)" : "var(--t-surface)",
            }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-[9px] font-extrabold leading-tight text-center"
              style={{ background: m.key === "anonpay" ? "#1a1a2e" : "var(--t-blue)", color: "white" }}>
              {m.key === "anonpay" ? "ANON\nPAY" : m.key === "janoshik" ? "JAN" : m.key === "revolut" ? "REV" : m.key === "paypal" ? "PP" : m.label.slice(0, 4).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold" style={{ color: "var(--t-text)" }}>{m.label}</p>
              <p className="text-[11px] leading-snug" style={{ color: "var(--t-muted)" }}>{m.sublabel}</p>
            </div>
            <span style={{ color: "var(--t-muted)" }}>›</span>
          </button>
        ))}
      </div>

      {selectedDef && (
        <>
          {/* AnonPay — Trocador link */}
          {selectedDef.trocadorUrl && (
            <div className="rounded-xl p-3 space-y-2" style={{ background: "var(--t-bg)", border: "1px solid var(--t-border)" }}>
              <p className="text-[11px]" style={{ color: "var(--t-muted)" }}>
                AnonPay is powered by <strong>Trocador.app</strong> — pay with any crypto, auto-converted. No account or KYC required.
              </p>
              <a href={selectedDef.trocadorUrl} target="_blank" rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 text-[13px] font-bold py-2.5 px-4 rounded-lg"
                style={{ background: "#f97316", color: "white" }}>
                <ExternalLink className="w-4 h-4" />
                Open Payment Page on Trocador
              </a>
              <p className="text-[10px] text-center" style={{ color: "var(--t-muted)" }}>Opens securely on trocador.app in a new tab</p>
            </div>
          )}

          {/* Janoshik — external link only */}
          {selectedDef.externalUrl && !selectedDef.trocadorUrl && (
            <div className="rounded-xl p-3 space-y-2" style={{ background: "var(--t-bg)", border: "1px solid var(--t-border)" }}>
              <a href={selectedDef.externalUrl} target="_blank" rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 text-[13px] font-bold py-2.5 px-4 rounded-lg"
                style={{ background: "var(--t-blue)", color: "white" }}>
                <ExternalLink className="w-4 h-4" />
                Open Janoshik Payment Page
              </a>
            </div>
          )}

          {/* Direct wallet / handle — copy address */}
          {!selectedDef.trocadorUrl && !selectedDef.externalUrl && selectedDef.address && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "var(--t-bg)", border: "1px solid var(--t-border)" }}>
              <span className="text-[12px] font-mono truncate flex-1" style={{ color: "var(--t-text)" }}>{selectedDef.address}</span>
              <button onClick={copyAddress} className="text-[11px] font-semibold shrink-0" style={{ color: "var(--t-blue)" }}>
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          )}

          {/* Amount (only if anyContribution) */}
          {!fixedAmount && (
            <div>
              <label className="text-[10px] font-bold tracking-wide uppercase mb-1 block" style={{ color: "var(--t-muted)" }}>Amount (USD)</label>
              <input type="number" min="1" step="1" value={customAmount}
                onChange={e => setCustomAmount(e.target.value)}
                placeholder="e.g. 20"
                className="w-full text-sm px-3 py-2 rounded-lg"
                style={{ background: "var(--t-bg)", border: "1px solid var(--t-border)", color: "var(--t-text)" }} />
            </div>
          )}

          {/* Tx hash / reference */}
          <div>
            <label className="text-[10px] font-bold tracking-wide uppercase mb-1 block" style={{ color: "var(--t-muted)" }}>
              {txHashLabel}
            </label>
            <input type="text" value={txHash} onChange={e => setTxHash(e.target.value)}
              placeholder={txHashPlaceholder}
              className="w-full text-sm px-3 py-2 rounded-lg"
              style={{ background: "var(--t-bg)", border: "1px solid var(--t-border)", color: "var(--t-text)" }} />
            {selectedMethod === "anonpay" && (
              <p className="text-[10px] mt-1" style={{ color: "var(--t-muted)" }}>
                After paying on Trocador, paste the order ID from your confirmation page here.
              </p>
            )}
          </div>

          {err && <p className="text-[12px]" style={{ color: "#EF4444" }}>{err}</p>}

          <button onClick={handleSubmit} disabled={submitting}
            className="w-full text-[13px] font-bold px-4 py-2.5 rounded-lg flex items-center justify-center gap-2"
            style={{ background: "var(--t-blue)", color: "white", opacity: submitting ? 0.7 : 1 }}>
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {selectedMethod === "janoshik" ? "I've paid — notify admin" : "Submit for review"}
          </button>
          <p className="text-[11px] text-center" style={{ color: "var(--t-muted)" }}>
            {selectedMethod === "anonpay"
              ? "AnonPay can take up to 15 minutes to process and confirm."
              : "Your payment will be verified before voting is unlocked."}
          </p>
        </>
      )}
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function GbTestingPool() {
  const reduceMotion = useReducedMotion();
  const [, params] = useRoute("/testing/:gbId");
  const [, setLocation] = useLocation();
  const gbId = params?.gbId ?? "";

  const { isLoggedIn, isLoading: accountLoading } = useAccount();

  const [data, setData] = useState<TestingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gbName, setGbName] = useState<string>("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!accountLoading && !isLoggedIn) {
      setLocation(`/login?next=/testing/${gbId}`);
    }
  }, [accountLoading, isLoggedIn, gbId, setLocation]);

  const load = useCallback(async () => {
    try {
      const adminSecret = (() => { try { return sessionStorage.getItem("_adm_s") ?? ""; } catch { return ""; } })();
      const headers: Record<string, string> = {};
      if (adminSecret) headers["x-admin-secret"] = adminSecret;
      const r = await fetch(`/api/group-buys/${gbId}/testing`, { headers, credentials: "include" });
      if (!r.ok) throw new Error("Failed to load testing data");
      setData(await r.json());
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [gbId]);

  useEffect(() => {
    if (!gbId || !isLoggedIn) return;
    setLoading(true); setError(null);
    load();
    fetch(`/api/group-buys/${gbId}/info`).then(r => r.json()).then(d => {
      if (d?.name) setGbName(d.name);
    }).catch(() => {});
  }, [gbId, load, refreshKey, isLoggedIn]);

  useEffect(() => {
    if (!gbId || !isLoggedIn) return;
    const timer = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(timer);
  }, [gbId, isLoggedIn, load]);

  if (loading) {
    return (
      <GbPoolLayout title="Testing Pool">
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--t-blue)" }} />
        </div>
      </GbPoolLayout>
    );
  }

  if (error) {
    return (
      <GbPoolLayout title="Testing Pool">
        <div className="p-8 text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-3" style={{ color: "#EF4444" }} />
          <p className="text-sm" style={{ color: "var(--t-text)" }}>{error}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setError(null);
              void load();
            }}
            className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold"
            style={{ background: "var(--t-blue)", color: "#FFFFFF" }}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Retry
          </button>
        </div>
      </GbPoolLayout>
    );
  }

  if (!data?.round) {
    return (
      <GbPoolLayout title="Testing Pool">
        <div className="max-w-lg mx-auto px-4 py-12 text-center">
          <TestTube className="w-12 h-12 mx-auto mb-4 opacity-25" style={{ color: "var(--t-muted)" }} />
          <p className="font-bold text-lg mb-2" style={{ color: "var(--t-text)" }}>No Testing Round Yet</p>
          <p className="text-sm" style={{ color: "var(--t-muted)" }}>
            No lab testing pool has been set up for this group buy yet.
          </p>
        </div>
      </GbPoolLayout>
    );
  }

  const {
    round, resultsAvailable, poolTotal, contributorCount, totalVotes, votes, testVotes,
    milestones, isOptedIn, isAdminView, hasGbOrder, hasVoted, existingVote,
    pendingContribution, peptideOptions, publicVotes, paymentMethods, peptideBatches = {},
  } = data;

  const isClosed = round.status === "closed" || round.status === "sent_to_lab" || round.status === "results_received";
  const isResults = round.status === "results_received";
  const hasResults = !!(round.resultNotes || round.resultPdfUrl);

  const topAmount = milestones.length > 0 ? milestones[milestones.length - 1].amount : 0;
  const progressPct = topAmount > 0 ? Math.min(100, (poolTotal / topAmount) * 100) : 0;

  return (
    <GbPoolLayout title={`${gbName ? gbName + " · " : ""}Testing Pool`}>
      <motion.div
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="clinical-testing clinical-testing--member"
      >
        <header className="clinical-testing__member-header">
          <div className="clinical-testing__member-heading">
            <div className="clinical-testing__member-kicker">
              <a
                href="/account?s=lab-pool"
                className="clinical-testing__member-back"
              >
                <ChevronLeft aria-hidden="true" />
                Testing pools
              </a>
              <span className="clinical-testing__member-round">Round {round.id}</span>
            </div>
            <h1>{gbName || "Group Buy"} · Lab Testing Pool</h1>
            <p className="clinical-testing__member-note">
              {round.fundingNote || "Community-funded independent testing for the winning product batch."}
            </p>
          </div>
          <div className="clinical-testing__member-actions">
            <span
              className="clinical-testing__member-status"
              data-active={round.status === "active" || undefined}
            >
              <span aria-hidden="true" />
              {STATUS_LABELS[round.status] ?? round.status}
            </span>
            <button
              type="button"
              onClick={() => setRefreshKey(key => key + 1)}
              className="clinical-testing__member-refresh"
              aria-label="Refresh testing pool"
              title="Refresh testing pool"
            >
              <RefreshCw aria-hidden="true" />
            </button>
          </div>
        </header>

        <RoundStatusRail status={round.status} />

        <div className="clinical-testing__member-grid">
          <div className="clinical-testing__member-primary">
            <ClinicalPanel
              title="Pool progress"
              meta={<span>{progressPct.toFixed(1)}% funded</span>}
            >
              <ClinicalPoolGauge
                raised={poolTotal}
                milestones={milestones}
                contributorCount={contributorCount}
                statusLabel={STATUS_LABELS[round.status] ?? round.status}
                active={round.status === "active"}
              />
              <ThresholdStepGrid milestones={milestones} raised={poolTotal} />
            </ClinicalPanel>
          </div>

          <aside className="clinical-testing__member-aside">
            {pendingContribution ? <PendingContributionCard pc={pendingContribution} /> : null}

            <AnimatePresence>
              {isOptedIn && !isAdminView && !isClosed && !hasVoted ? (
                <motion.div
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <VoteForm
                    gbId={gbId}
                    peptideOptions={peptideOptions}
                    testOptions={round.testOptions}
                    maxVials={data.maxVials}
                    maxCompoundVotes={round.maxCompoundVotes ?? 1}
                    maxTestVotes={round.maxTestVotes ?? 1}
                    onDone={() => { setLoading(true); load(); }}
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>

            {hasVoted && existingVote ? <ExistingVoteCard vote={existingVote} /> : null}

            <ClinicalPanel
              title="Live leaderboard"
              meta={<span>{totalVotes} vote{totalVotes === 1 ? "" : "s"}</span>}
            >
              {votes.length > 0 ? (
                <VoteLeaderboard
                  votes={votes}
                  totalVotes={totalVotes}
                  batches={peptideBatches}
                />
              ) : (
                <p className="clinical-testing__member-empty">No votes have been cast yet.</p>
              )}
            </ClinicalPanel>
          </aside>
        </div>

        {/* ── Lab Results Hero — main feature when results are in ── */}
        {isResults && resultsAvailable && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-4 sm:mb-6 overflow-hidden"
            style={{ borderRadius: 12, border: "1px solid rgba(233,160,32,0.35)", boxShadow: "0 4px 32px rgba(233,160,32,0.10)" }}
          >
            {/* Amber gradient header */}
            <div
              className="px-4 sm:px-6 py-4 sm:py-5"
              style={{ background: "linear-gradient(135deg, #92400e 0%, #b45309 40%, #d97706 100%)" }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}
                  >
                    <FlaskConical className="w-5 h-5" style={{ color: "#fde68a" }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-bold tracking-[0.18em] uppercase" style={{ color: "rgba(253,230,138,0.75)" }}>Lab Results</span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.18)", color: "#fef3c7" }}>
                        <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "#fde68a" }} />
                        Published
                      </span>
                    </div>
                    <p className="font-extrabold text-[17px] sm:text-[19px] leading-tight text-white">
                      {gbName || "Group Buy"} — Results
                    </p>
                    {round.resultPostedAt && (
                      <p className="text-[11px] mt-0.5" style={{ color: "rgba(253,230,138,0.7)" }}>
                        Posted {new Date(round.resultPostedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Results body */}
            <div style={{ background: "var(--t-surface)" }}>
              {isOptedIn ? (
                <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-4">
                  {/* Notes */}
                  {round.resultNotes && (
                    <div
                      className="p-4 rounded-xl"
                      style={{ background: "rgba(233,160,32,0.06)", border: "1px solid rgba(233,160,32,0.18)" }}
                    >
                      <p className="text-[9px] font-bold tracking-[0.15em] uppercase mb-2" style={{ color: "#b45309" }}>Summary</p>
                      <div className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: "var(--t-text)" }}>
                        {round.resultNotes}
                      </div>
                    </div>
                  )}

                  {/* PDF — one click, opens directly */}
                  {round.resultPdfUrl ? (
                    <a
                      href={round.resultPdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl font-bold text-sm transition-opacity hover:opacity-90"
                      style={{ background: "linear-gradient(135deg, #b45309, #d97706)", color: "#fff", boxShadow: "0 2px 12px rgba(180,83,9,0.25)" }}
                    >
                      <FileText className="w-4 h-4" />
                      View Full Lab Report
                      <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                    </a>
                  ) : (
                    /* Notes-only round — link to the results page */
                    <button
                      onClick={() => setLocation(`/testing/${gbId}/results`)}
                      className="inline-flex items-center justify-center gap-1.5 w-full px-4 py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-80"
                      style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-text)" }}
                    >
                      <ClipboardList className="w-3.5 h-3.5" style={{ color: "var(--t-muted)" }} />
                      View Results
                    </button>
                  )}

                  {/* Funding note */}
                  {round.fundingNote && (
                    <div className="px-3 py-2.5 rounded-lg" style={{ background: "var(--t-bg)", border: "1px dashed var(--t-border)" }}>
                      <p className="text-[9px] font-bold tracking-[0.14em] uppercase mb-1" style={{ color: "var(--t-muted)" }}>Funding Note</p>
                      <p className="text-[12px] whitespace-pre-wrap" style={{ color: "var(--t-muted)" }}>{round.fundingNote}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="px-4 sm:px-6 py-5 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: "rgba(148,163,184,0.12)" }}>
                    <Lock className="w-4 h-4" style={{ color: "var(--t-muted)" }} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm mb-1" style={{ color: "var(--t-text)" }}>Results are in — contributors only</p>
                    <p className="text-[12px]" style={{ color: "var(--t-muted)" }}>
                      The lab results for this round are private to people who chipped in. Contribute to unlock access.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Community Vote Result — winning compound (with batch) + test, shown once voting closes ── */}
        {isClosed && (() => {
          const winner = data.thresholds?.leadingPeptide || null;
          const winnerBatch = winner ? (peptideBatches?.[winner] ?? null) : null;
          const rankedTests = Object.entries(testVotes).sort((a, b) => b[1] - a[1]).map(([t]) => t);
          return (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="relative overflow-hidden mb-4 sm:mb-6"
              style={{ borderRadius: 8, background: "var(--t-surface)", border: "1px solid var(--t-border)", boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}
            >
              <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: "linear-gradient(180deg, #f59e0b, #f97316)" }} />
              <div className="px-4 sm:px-6 py-4 sm:py-5">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-3.5 h-3.5 shrink-0" style={{ color: "#f59e0b" }} />
                  <span className="text-[9px] font-bold tracking-[0.2em] uppercase" style={{ color: "var(--t-muted)" }}>Community Vote Result</span>
                </div>
                {winner ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] font-bold tracking-[0.12em] uppercase mb-1" style={{ color: "var(--t-muted)" }}>Winning compound</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xl sm:text-2xl font-extrabold leading-tight break-words min-w-0" style={{ color: "var(--t-text)" }}>{winner}</span>
                        {winnerBatch && (
                          <span className="inline-flex items-center text-[11px] font-bold px-2 py-0.5 tabular-nums shrink-0"
                            style={{ borderRadius: 4, background: "rgba(59,130,246,0.1)", color: "var(--t-blue)", border: "1px solid rgba(59,130,246,0.25)" }}>
                            Batch {winnerBatch}
                          </span>
                        )}
                      </div>
                    </div>
                    {rankedTests.length > 0 && (
                      <div className="pt-3 border-t" style={{ borderColor: "var(--t-border)" }}>
                        <p className="text-[10px] font-bold tracking-[0.12em] uppercase mb-1.5" style={{ color: "var(--t-muted)" }}>
                          Winning test{rankedTests.length > 1 ? "s" : ""}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {rankedTests.map((t, i) => (
                            <span key={t} className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5"
                              style={{ borderRadius: 4, background: i === 0 ? "rgba(16,185,129,0.1)" : "var(--t-bg)", color: i === 0 ? HIT : "var(--t-muted)", border: `1px solid ${i === 0 ? "rgba(16,185,129,0.25)" : "var(--t-border)"}` }}>
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm" style={{ color: "var(--t-muted)" }}>No votes were cast in this round.</p>
                )}
              </div>
            </motion.div>
          );
        })()}

        {/* Tests being done — shown once voting has closed */}
            {isClosed && (() => {
              const testMilestones = milestones.filter(m => m.type === "test");
              if (testMilestones.length === 0) return null;
              const fundedCount = testMilestones.filter(m => poolTotal >= m.amount).length;
              return (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 }}
                  style={{ borderRadius: 12, background: "var(--t-surface)", border: "1px solid var(--t-border)", overflow: "hidden" }}
                >
                  <div className="flex items-center justify-between px-4 sm:px-5 py-3"
                    style={{ borderBottom: "1px solid var(--t-border)", background: "linear-gradient(90deg, rgba(16,185,129,0.06) 0%, transparent 100%)" }}>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center"
                        style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)" }}>
                        <FlaskConical className="w-3.5 h-3.5" style={{ color: HIT }} />
                      </div>
                      <span className="text-[11px] font-bold tracking-[0.06em] uppercase" style={{ color: "var(--t-text)" }}>Tests Being Done</span>
                    </div>
                    <span className="text-[11px] font-semibold tabular-nums" style={{ color: "var(--t-muted)" }}>
                      <span className="font-bold" style={{ color: HIT }}>{fundedCount}</span>/{testMilestones.length}
                    </span>
                  </div>
                  <div className="px-4 sm:px-5 py-3 space-y-2">
                    <p className="text-[11px] mb-1" style={{ color: "var(--t-muted)" }}>
                      Voting has closed. These are the tests funded by the pool:
                    </p>
                    {testMilestones.map((m, i) => {
                      const hit = poolTotal >= m.amount;
                      return (
                        <div key={i} className="flex items-center gap-2.5 py-1.5 px-2.5 rounded-lg"
                          style={{ background: hit ? "rgba(16,185,129,0.06)" : "rgba(0,0,0,0.02)", border: `1px solid ${hit ? "rgba(16,185,129,0.2)" : "var(--t-border)"}` }}>
                          {hit
                            ? <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: HIT }} />
                            : <span className="w-4 h-4 shrink-0 rounded-full" style={{ border: "1.5px solid var(--t-border)" }} />}
                          <span className="text-[12px] font-semibold flex-1 min-w-0 break-words" style={{ color: hit ? "var(--t-text)" : "var(--t-muted)" }}>
                            {m.label}
                          </span>
                          <span className="text-[10px] font-bold tabular-nums shrink-0 px-1.5 py-0.5 rounded-full"
                            style={{ background: hit ? "rgba(16,185,129,0.1)" : "transparent", color: hit ? HIT : "var(--t-muted)" }}>
                            {hit ? "Confirmed" : "Not funded"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })()}

            {/* Late opt-in CTA */}
            {!isOptedIn && !isAdminView && hasGbOrder && round.lateOptInEnabled && !pendingContribution && !isClosed && contributorCount > 0 && (round.lateOptInVoteThreshold == null || totalVotes >= contributorCount * (round.lateOptInVoteThreshold / 100)) && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="p-4 sm:p-5"
                style={{ borderRadius: 8, background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
                <p className="text-[13px] font-semibold mb-1" style={{ color: "var(--t-text)" }}>
                  You have a GB order — join the testing pool
                </p>
                <p className="text-[12px] mb-3" style={{ color: "var(--t-muted)" }}>
                  Contribute {round.anyContribution ? "any amount" : fmtUsd(round.contributionAmount)} to unlock voting.
                </p>
                <LateContributionForm
                  gbId={gbId}
                  round={round}
                  paymentMethods={paymentMethods}
                  onDone={() => { setLoading(true); load(); }}
                />
              </motion.div>
            )}

            {/* Late opt-in locked message — threshold not yet reached */}
            {!isOptedIn && !isAdminView && hasGbOrder && round.lateOptInEnabled && !pendingContribution && !isClosed && contributorCount > 0 && round.lateOptInVoteThreshold != null && totalVotes < contributorCount * (round.lateOptInVoteThreshold / 100) && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 px-4 py-3"
                style={{ borderRadius: 8, background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.25)" }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "rgba(245,158,11,0.15)" }}>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: "#F59E0B" }}>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <div>
                  <p className="text-[12px] font-semibold" style={{ color: "#F59E0B" }}>Opt-in unlocks at {round.lateOptInVoteThreshold}% votes</p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--t-muted)" }}>
                    {totalVotes} of {Math.ceil(contributorCount * (round.lateOptInVoteThreshold / 100))} votes needed to open late opt-in
                  </p>
                </div>
              </motion.div>
            )}

            {/* Current standings */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
              style={{ borderRadius: 12, background: "var(--t-surface)", border: "1px solid var(--t-border)", overflow: "hidden" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 sm:px-5 py-3"
                style={{ borderBottom: "1px solid var(--t-border)", background: "linear-gradient(90deg, rgba(16,185,129,0.04) 0%, transparent 100%)" }}>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center"
                    style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)" }}>
                    <Users className="w-3.5 h-3.5" style={{ color: HIT }} />
                  </div>
                  <span className="text-[11px] font-bold tracking-[0.06em] uppercase" style={{ color: "var(--t-text)" }}>Standings</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-semibold tabular-nums" style={{ color: "var(--t-muted)" }}>
                    <span className="font-bold" style={{ color: HIT }}>{contributorCount}</span> {contributorCount !== 1 ? "contributors" : "contributor"}
                  </span>
                  <span className="text-[11px] font-semibold tabular-nums" style={{ color: "var(--t-muted)" }}>
                    <span className="font-bold" style={{ color: "var(--t-blue)" }}>{totalVotes}</span> {totalVotes !== 1 ? "votes" : "vote"}
                  </span>
                </div>
              </div>

              {contributorCount === 0 ? (
                <div className="text-center py-10 px-4">
                  <TestTube className="w-8 h-8 mx-auto mb-2 opacity-15" style={{ color: "var(--t-muted)" }} />
                  <p className="text-[12px] font-medium" style={{ color: "var(--t-muted)" }}>No contributors yet</p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--t-muted)", opacity: 0.6 }}>Be the first to join the pool</p>
                </div>
              ) : (
                <div className="px-4 sm:px-5 py-4 space-y-4">
                  {/* Pool progress bar */}
                  <div>
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="text-[13px] font-extrabold tabular-nums" style={{ color: "var(--t-text)", fontFamily: "ui-monospace,SFMono-Regular,monospace" }}>{fmtUsd(poolTotal)}</span>
                      {topAmount > 0 && (
                        <span className="text-[11px] font-semibold" style={{ color: "var(--t-muted)" }}>
                          {progressPct.toFixed(0)}% of {fmtUsd(topAmount)}
                        </span>
                      )}
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--t-border)" }}>
                      <motion.div className="h-full rounded-full"
                        style={{ background: `linear-gradient(90deg, var(--t-blue) 0%, ${HIT} 100%)` }}
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPct}%` }}
                        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }} />
                    </div>
                  </div>

                  {/* Public vote list */}
                  {publicVotes && publicVotes.length > 0 && (
                    <div className="border-t pt-3" style={{ borderColor: "var(--t-border)" }}>
                      <p className="text-[9px] font-bold tracking-[0.14em] uppercase mb-2.5" style={{ color: "var(--t-muted)" }}>Vote log</p>
                      <div className="space-y-1">
                        {publicVotes.map((v, i) => (
                          <div key={i} className="flex items-center gap-2 py-1 px-2 rounded-lg"
                            style={{ background: i % 2 === 0 ? "rgba(0,0,0,0.02)" : "transparent" }}>
                            <span className="text-[11px] font-semibold truncate flex-1" style={{ color: "var(--t-muted)" }}>
                              {v.username ?? "anonymous"}
                            </span>
                            <span className="text-[11px] font-semibold shrink-0 truncate max-w-[130px] sm:max-w-[160px]" style={{ color: "var(--t-text)" }}>
                              {v.peptideName}
                            </span>
                            {peptideBatches[v.peptideName] && (
                              <span className="text-[10px] font-bold leading-none px-2 py-0.5 rounded-full shrink-0 tabular-nums truncate max-w-[80px]"
                                style={{ background: "rgba(59,130,246,0.1)", color: "var(--t-blue)", border: "1px solid rgba(59,130,246,0.25)" }}
                                title={`Batch ${peptideBatches[v.peptideName]}`}>
                                {peptideBatches[v.peptideName]}
                              </span>
                            )}
                            <span className="text-[10px] font-bold tabular-nums shrink-0 px-1.5 py-0.5 rounded-full"
                              style={{ background: "rgba(59,130,246,0.08)", color: "var(--t-blue)" }}>
                              {v.vialCount}v
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
      </motion.div>
    </GbPoolLayout>
  );
}
