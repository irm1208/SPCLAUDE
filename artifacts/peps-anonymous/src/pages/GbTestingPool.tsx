import React, { useEffect, useState, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  FlaskConical, Loader2, AlertCircle, TestTube, RefreshCw,
  Lock, Unlock, CheckCircle2, Clock, XCircle, ChevronDown,
  ExternalLink, Users, ChevronLeft,
} from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { useAccount } from "@/hooks/use-account";
import { HubBottomNav, HubSection } from "@/components/HubBottomNav";

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

const ARC1 = "#3B82F6";
const ARC2 = "#8B5CF6";
const ARC3 = "#E9A020";
const ARC4 = "#10B981";
const HIT  = "#10B981";
const STEP_COLORS = [ARC1, ARC2, ARC3, ARC4];

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtUsd(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

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

// ── Pool Gauge ────────────────────────────────────────────────────────────────

interface GaugeSegment { color: string; cost: number; }

function PoolGauge({ raisedUsd, segments, contributorCount }: { raisedUsd: number; segments: GaugeSegment[]; contributorCount: number }) {
  const SIZE = 280;
  const cx = SIZE / 2; const cy = SIZE / 2;
  const START = 135; const END = 405; const TOTAL = END - START;
  const R = 104; const SW = 18;

  const totalGoal = segments.reduce((s, seg) => s + seg.cost, 0);
  const allFunded = totalGoal > 0 && raisedUsd >= totalGoal;

  let cumCost = 0;
  const segs = segments.map(seg => {
    const startFrac = totalGoal > 0 ? cumCost / totalGoal : 0;
    cumCost += seg.cost;
    const endFrac = totalGoal > 0 ? cumCost / totalGoal : 1;
    return {
      color: seg.color,
      startAngle: START + startFrac * TOTAL,
      endAngle: START + endFrac * TOTAL,
      startCost: cumCost - seg.cost,
      endCost: cumCost,
    };
  });

  return (
    <div className="flex flex-col items-center w-full">
      <svg width="100%" viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ overflow: "visible", maxWidth: SIZE }}>
        <defs>
          <filter id="gbGaugeFilled" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#10B981" floodOpacity="0.4" />
          </filter>
        </defs>
        <path d={describeArc(cx, cy, R, START, END)} fill="none" stroke="var(--t-border)" strokeWidth={SW} strokeLinecap="butt" />
        {segs.map((seg, i) => {
          const fillEnd = Math.min(seg.endAngle, Math.max(seg.startAngle, seg.startAngle + (
            raisedUsd <= seg.startCost ? 0 :
            raisedUsd >= seg.endCost ? (seg.endAngle - seg.startAngle) :
            ((raisedUsd - seg.startCost) / (seg.endCost - seg.startCost)) * (seg.endAngle - seg.startAngle)
          )));
          if (fillEnd <= seg.startAngle + 0.01) return null;
          const isLast = i === segs.length - 1;
          const isFirst = i === 0;
          return (
            <motion.path
              key={i}
              d={describeArc(cx, cy, R, seg.startAngle, fillEnd)}
              fill="none" stroke={seg.color} strokeWidth={SW}
              strokeLinecap={isFirst && isLast ? "round" : isFirst ? "round" : isLast && fillEnd >= seg.endAngle - 0.5 ? "round" : "butt"}
              filter={allFunded ? "url(#gbGaugeFilled)" : undefined}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.2, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}
            />
          );
        })}
        {segs.length > 1 && segs.slice(0, -1).map((seg, i) => {
          const angleDeg = seg.endAngle;
          const angleRad = (angleDeg - 90) * (Math.PI / 180);
          const inner = R - SW / 2 - 1;
          const outer = R + SW / 2 + 1;
          return (
            <line key={`div-${i}`}
              x1={cx + inner * Math.cos(angleRad)} y1={cy + inner * Math.sin(angleRad)}
              x2={cx + outer * Math.cos(angleRad)} y2={cy + outer * Math.sin(angleRad)}
              stroke="var(--t-bg)" strokeWidth={3} strokeLinecap="round" />
          );
        })}
        <text x={cx} y={cy - 14} textAnchor="middle" fontSize="9" fontWeight="700"
          letterSpacing="0.12em" style={{ fill: "var(--t-muted)", textTransform: "uppercase" }}>POOL TOTAL</text>
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

// ── Milestone Step Card ───────────────────────────────────────────────────────

function MilestoneCard({ step, milestone, prevAmount, raisedUsd, accentColor }: {
  step: number; milestone: Milestone; prevAmount: number; raisedUsd: number; accentColor: string;
}) {
  const hit = raisedUsd >= milestone.amount;
  const stepNum = String(step).padStart(2, "0");
  const stepCost = milestone.amount - prevAmount;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: step * 0.1, type: "spring", stiffness: 280, damping: 24 }}
      className="relative overflow-hidden min-w-0"
      style={{
        borderRadius: 8,
        border: `1.5px solid ${hit ? HIT : "var(--t-border)"}`,
        background: hit ? "rgba(16,185,129,0.05)" : "var(--t-surface)",
        padding: "14px 16px",
      }}
    >
      <div className="absolute -bottom-2 -right-1 select-none pointer-events-none font-black"
        style={{ fontSize: 64, color: hit ? "rgba(16,185,129,0.07)" : "rgba(0,0,0,0.04)", lineHeight: 1, fontFamily: "ui-monospace,SFMono-Regular,monospace", letterSpacing: "-0.05em" }}>
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
        <p className="font-extrabold leading-none mb-0.5"
          style={{ fontSize: 22, color: hit ? HIT : "var(--t-text)", fontFamily: "ui-monospace,SFMono-Regular,monospace", letterSpacing: "-0.02em" }}>
          {fmtUsd(milestone.amount)}
        </p>
        {prevAmount > 0 && (
          <p className="text-[10px] mb-1.5" style={{ color: "var(--t-muted)" }}>
            Lab test Cost: {fmtUsd(stepCost)}
          </p>
        )}
        <p className="text-[13px] font-semibold leading-tight mb-1 break-words" style={{ color: "var(--t-text)" }}>
          {milestone.label}
        </p>
        <p className="text-[11px]" style={{ color: "var(--t-muted)" }}>
          {milestone.type === "vial" ? `Vial #${milestone.vialNum ?? step}` : "This step"}
        </p>
      </div>
    </motion.div>
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
  const [, params] = useRoute("/testing/:gbId");
  const [, setLocation] = useLocation();
  const gbId = params?.gbId ?? "";

  const [data, setData] = useState<TestingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gbName, setGbName] = useState<string>("");
  const [refreshKey, setRefreshKey] = useState(0);

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
    if (!gbId) return;
    setLoading(true); setError(null);
    load();
    fetch(`/api/group-buys/${gbId}/info`).then(r => r.json()).then(d => {
      if (d?.name) setGbName(d.name);
    }).catch(() => {});
  }, [gbId, load, refreshKey]);

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

  // Build gauge segments from milestones (incremental costs)
  const gaugeSegments: GaugeSegment[] = milestones.map((m, i) => ({
    color: STEP_COLORS[i % STEP_COLORS.length],
    cost: i === 0 ? m.amount : m.amount - milestones[i - 1].amount,
  }));

  const topAmount = milestones.length > 0 ? milestones[milestones.length - 1].amount : 0;
  const progressPct = topAmount > 0 ? Math.min(100, (poolTotal / topAmount) * 100) : 0;

  // Status pipeline stages
  const STAGES = [
    { key: "active",           label: "Collecting" },
    { key: "closed",           label: "Closed"     },
    { key: "sent_to_lab",      label: "At Lab"     },
    { key: "results_received", label: "Results"    },
  ] as const;
  const stageIdx = STAGES.findIndex(s => s.key === round.status);
  const activeIdx = stageIdx === -1 ? 0 : stageIdx;

  return (
    <GbPoolLayout title={`${gbName ? gbName + " · " : ""}Testing Pool`}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6 overflow-x-hidden"
      >
        {/* ── Branded Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden mb-4 sm:mb-6"
          style={{ borderRadius: 8, background: "linear-gradient(135deg, var(--t-blue-deep, #1B3A7A) 0%, #1e3a8a 100%)" }}
        >
          <div className="absolute inset-0 pointer-events-none"
            style={{ backgroundImage: "radial-gradient(circle at 90% 25%, rgba(255,255,255,0.1) 0%, transparent 55%)" }} />
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
                <h1 className="text-[20px] sm:text-[22px] font-extrabold text-white leading-tight">
                  {gbName || "Group Buy"}
                </h1>
                <div className="flex items-center gap-2 sm:gap-3 mt-2.5 flex-wrap">
                  <span className="text-[11px] font-bold tabular-nums" style={{ color: "rgba(255,255,255,0.7)" }}>
                    {progressPct.toFixed(1)}% funded
                  </span>
                  <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                    {contributorCount} contributor{contributorCount !== 1 ? "s" : ""}
                  </span>
                  <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                    {totalVotes} vote{totalVotes !== 1 ? "s" : ""} cast
                  </span>
                </div>
              </div>
              <button
                onClick={() => setRefreshKey(k => k + 1)}
                className="w-9 h-9 flex items-center justify-center shrink-0 transition-opacity hover:opacity-70"
                style={{ borderRadius: 6, background: "rgba(255,255,255,0.12)" }}
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" style={{ color: "rgba(255,255,255,0.7)" }} />
              </button>
            </div>

            {/* Status Pipeline */}
            <div className="mt-3 sm:mt-4 px-1">
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
                      <div className="flex flex-col items-center shrink-0">
                        <div className="flex items-center justify-center"
                          style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${ringColor}`, background: done ? "#4ade80" : active ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)", boxShadow: active ? "0 0 0 3px rgba(255,255,255,0.12)" : "none", transition: "all 0.3s ease" }}>
                          {done && (
                            <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                          {active && <span className="w-2 h-2 rounded-full block" style={{ background: "#fff" }} />}
                        </div>
                        <span className="text-[9px] font-bold tracking-wider mt-1 text-center leading-tight"
                          style={{ color: textColor, whiteSpace: "nowrap" }}>
                          {stage.label}
                        </span>
                      </div>
                      {i < STAGES.length - 1 && (
                        <div className="flex-1 h-px mx-1.5" style={{ background: lineColor, minWidth: 0, transition: "background 0.3s ease" }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Milestone Step Cards (responsive grid — all visible, no horizontal scroll) ── */}
        {milestones.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-4 sm:mb-6">
            {milestones.map((m, i) => (
              <MilestoneCard
                key={i}
                step={i + 1}
                milestone={m}
                prevAmount={i > 0 ? milestones[i - 1].amount : 0}
                raisedUsd={poolTotal}
                accentColor={STEP_COLORS[i % STEP_COLORS.length]}
              />
            ))}
          </div>
        )}

        {/* ── Two-column layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">

          {/* ── LEFT: Pool gauge + leaderboard ── */}
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="p-4 sm:p-6"
              style={{ borderRadius: 8, background: "var(--t-surface)", border: "1px solid var(--t-border)", boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] font-bold tracking-[0.14em] uppercase" style={{ color: "var(--t-muted)" }}>Pool Progress</span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1"
                  style={{ borderRadius: 4, background: round.status === "active" ? "rgba(16,185,129,0.1)" : "rgba(59,130,246,0.1)", color: round.status === "active" ? HIT : "var(--t-blue)", border: `1px solid ${round.status === "active" ? "rgba(16,185,129,0.25)" : "rgba(59,130,246,0.25)"}` }}>
                  {round.status === "active" && (
                    <motion.span className="w-1.5 h-1.5 inline-block shrink-0"
                      style={{ background: HIT, borderRadius: "50%" }}
                      animate={{ opacity: [1, 0.25, 1] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }} />
                  )}
                  {STATUS_LABELS[round.status] ?? round.status}
                </span>
              </div>

              {/* Gauge */}
              <PoolGauge raisedUsd={poolTotal} segments={gaugeSegments} contributorCount={contributorCount} />

              {/* Milestone legend */}
              <div className="flex flex-col items-stretch gap-1.5 mt-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-x-5 sm:gap-y-1.5">
                {milestones.map((m, i) => {
                  const hit = poolTotal >= m.amount;
                  const color = STEP_COLORS[i % STEP_COLORS.length];
                  return (
                    <div key={i} className="flex items-center gap-1.5 min-w-0 max-w-full">
                      <span className="w-3 h-2 inline-block shrink-0" style={{ background: color, borderRadius: 1 }} />
                      <span className="text-[10px] font-semibold min-w-0 break-words" style={{ color: hit ? "var(--t-text)" : "var(--t-muted)" }}>
                        {m.label} · {fmtUsd(m.amount)}
                      </span>
                      {hit && <CheckCircle2 className="w-3 h-3 shrink-0" style={{ color: HIT }} />}
                    </div>
                  );
                })}
              </div>

              {/* Vote standings */}
              {votes.length > 0 && (
                <div className="mt-3 pt-2.5 border-t" style={{ borderColor: "var(--t-border)" }}>
                  <div className="flex items-center gap-1 mb-1.5">
                    <FlaskConical className="w-2.5 h-2.5" style={{ color: "var(--t-blue)" }} />
                    <span className="text-[8px] font-bold tracking-[0.12em] uppercase" style={{ color: "var(--t-blue)" }}>Compound Votes</span>
                    <span className="text-[8px] font-semibold ml-auto tabular-nums" style={{ color: "var(--t-muted)" }}>{totalVotes} cast</span>
                  </div>
                  <div className="space-y-1">
                    {votes.slice(0, 5).map((v, i) => {
                      const pct = totalVotes > 0 ? (v.totalVotes / totalVotes) * 100 : 0;
                      const barColor = i === 0 ? "rgba(59,130,246,0.7)" : i === 1 ? "rgba(139,92,246,0.55)" : "rgba(148,163,184,0.35)";
                      return (
                        <div key={v.peptideName} className="flex items-center gap-2 mb-[10px]">
                          <div className="flex items-center gap-1 shrink-0 w-40 min-w-0">
                            <span className="text-[10px] truncate min-w-0" style={{ color: "var(--t-muted)" }}>{v.peptideName}</span>
                            {peptideBatches[v.peptideName] && (
                              <span className="text-[8px] font-bold leading-none px-1.5 py-0.5 rounded-full shrink-0 tabular-nums"
                                style={{ background: "rgba(59,130,246,0.1)", color: "var(--t-blue)", border: "1px solid rgba(59,130,246,0.25)" }}
                                title={`Batch ${peptideBatches[v.peptideName]}`}>
                                {peptideBatches[v.peptideName]}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(148,163,184,0.12)" }}>
                            <motion.div className="h-full rounded-full"
                              style={{ background: barColor }}
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.9, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }} />
                          </div>
                          <span className="text-[10px] font-semibold tabular-nums shrink-0" style={{ color: "var(--t-blue)" }}>{v.totalVotes}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Test type chips */}
                  {Object.keys(testVotes).length > 0 && (
                    <div className="pb-4 pt-2.5 border-t" style={{ borderColor: "var(--t-border)" }}>
                      <span className="text-[9px] font-bold tracking-[0.14em] uppercase block mb-2" style={{ color: "var(--t-muted)" }}>Test Selections</span>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(testVotes).sort(([,a],[,b]) => b - a).map(([name, count], i) => {
                          const chipColors = ["rgba(59,130,246,0.1)","rgba(139,92,246,0.1)","rgba(16,185,129,0.1)","rgba(233,160,32,0.1)"];
                          const textColors = ["var(--t-blue)", ARC2, HIT, ARC3];
                          const borderColors = ["rgba(59,130,246,0.25)","rgba(139,92,246,0.25)","rgba(16,185,129,0.25)","rgba(233,160,32,0.25)"];
                          return (
                            <span key={name} className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full"
                              style={{ background: chipColors[i % 4], color: textColors[i % 4], border: `1px solid ${borderColors[i % 4]}` }}>
                              {name}
                              <span className="text-[9px] font-bold opacity-70">{count}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>

          {/* ── RIGHT: Vote form + standings + results ── */}
          <div className="space-y-4">

            {/* Pending contribution (late opt-in payment awaiting review) */}
            {pendingContribution && <PendingContributionCard pc={pendingContribution} />}

            {/* Vote form — only for opted-in, non-closed, non-voted members (not admin view) */}
            <AnimatePresence>
              {isOptedIn && !isAdminView && !isClosed && !hasVoted && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
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
              )}
            </AnimatePresence>

            {/* Existing vote */}
            {hasVoted && existingVote && <ExistingVoteCard vote={existingVote} />}

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
            {!isOptedIn && !isAdminView && hasGbOrder && round.lateOptInEnabled && !pendingContribution && !isClosed && contributorCount > 0 && totalVotes >= contributorCount * 0.80 && (
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
            {!isOptedIn && !isAdminView && hasGbOrder && round.lateOptInEnabled && !pendingContribution && !isClosed && contributorCount > 0 && totalVotes < contributorCount * 0.80 && (
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
                  <p className="text-[12px] font-semibold" style={{ color: "#F59E0B" }}>Opt-in unlocks at 80% votes</p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--t-muted)" }}>
                    {totalVotes} of {Math.ceil(contributorCount * 0.80)} votes needed to open late opt-in
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

            {/* Lab Results — private, on a separate contributors-only page */}
            {isResults && resultsAvailable && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.34 }}
                className="p-4 sm:p-5 space-y-3"
                style={{ borderRadius: 8, background: "var(--t-surface)", border: "1px solid var(--t-border)" }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(233,160,32,0.12)" }}>
                    <FlaskConical className="w-3.5 h-3.5" style={{ color: "#E9A020" }} />
                  </div>
                  <p className="text-[9px] font-bold tracking-[0.14em] uppercase" style={{ color: "var(--t-muted)" }}>Lab Results</p>
                </div>
                {isOptedIn ? (
                  <>
                    <p className="text-sm" style={{ color: "var(--t-muted)" }}>
                      The lab results for this round are ready — private to contributors.
                    </p>
                    <button
                      onClick={() => setLocation(`/testing/${gbId}/results`)}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold px-3.5 py-2 rounded-lg transition-opacity hover:opacity-90"
                      style={{ background: "var(--t-blue)", color: "#fff" }}
                    >
                      View Results <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <div className="flex items-start gap-2 text-sm" style={{ color: "var(--t-muted)" }}>
                    <Lock className="w-4 h-4 mt-0.5 shrink-0" />
                    <p>Results are in, but they&rsquo;re private to people who chipped in for this round.</p>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </GbPoolLayout>
  );
}
