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
export const BALLOT_TEST_OPTIONS = [
  { name: "Endotoxin",    price: "$120" },
  { name: "Mass/Purity",  price: "per peptide" },
  { name: "Sterility",    price: "$350" },
  { name: "Heavy Metals", price: "$200" },
] as const;

export interface TestingRound {
  id: string;
  status: string;
  contributionAmount: number;
  anyContribution: boolean;
  lateOptInEnabled: boolean;
  lateOptInPaymentMethods: string[] | null;
  lateOptInVoteThreshold: number | null;
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

export interface GbProductSale { name: string; qtySold: number; }
export interface TestingOrganiserPayments {
  paypalHandle?: string | null;
  revolutHandle?: string | null;
  cryptoWalletAddress?: string | null;
  cryptoNetwork?: string | null;
  anonPayEnabled?: boolean | null;
}

export interface TestingContributor {
  orderId: string;
  code: string;
  telegramUsername: string;
  contribution: number;
  paymentStatus: string;
  hasVoted: boolean;
  vote: { peptideName: string; vialCount: number; testSelections: string[] } | null;
}

export interface TestingAdminData {
  round: TestingRound | null;
  poolTotal: number;
  contributorCount: number;
  milestones?: { label: string; amount: number; type?: string }[];
  gbProductsSortedBySales: GbProductSale[];
  organiserPayments: TestingOrganiserPayments | null;
  contributors: TestingContributor[];
  ballotTestPrices?: Record<string, number | null>;
  allTestOptions?: string[];
  thresholds?: { leadingPeptide: string | null; leadingVials: number; testOrder: string[]; votedTests: string[] };
}

export function TestingSubTab({ secret, gb }: { secret: string; gb: GroupBuy }) {
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
  const [lateVoteThreshold, setLateVoteThreshold] = useState<string>("");
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

  // Vote reminder
  const [sendingReminder, setSendingReminder] = useState(false);
  const [reminderMsg, setReminderMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Notify participants of the vote result
  const [notifyingResult, setNotifyingResult] = useState(false);
  const [notifyResultMsg, setNotifyResultMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Pending contributions
  type PendingContrib = { id: string; order_id: string; amount: number; payment_method: string; tx_hash: string | null; status: string; rejection_reason: string | null; created_at: string; code: string; telegram_username: string };
  const [pendingContribs, setPendingContribs] = useState<PendingContrib[]>([]);
  const [actingContrib, setActingContrib] = useState<string | null>(null);

  const loadContribs = useCallback(async () => {
    try {
      const r = await fetch(apiUrl(`/admin/group-buys/${gb.id}/testing/contributions`), { headers: { "x-admin-secret": secret } });
      if (r.ok) {
        const d = await r.json();
        setPendingContribs((d.contributions ?? []).filter((c: PendingContrib) => c.status === "pending"));
      }
    } catch { /* silent */ }
  }, [gb.id, secret]);

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
        setLateVoteThreshold(d.round.lateOptInVoteThreshold != null ? String(d.round.lateOptInVoteThreshold) : "");
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

  useEffect(() => { load(); loadContribs(); }, [load, loadContribs]);

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
          lateOptInVoteThreshold: lateVoteThreshold.trim() !== "" ? parseInt(lateVoteThreshold, 10) : null,
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

  async function handleNotifyResult() {
    setNotifyingResult(true);
    setNotifyResultMsg(null);
    try {
      const r = await fetch(apiUrl(`/admin/group-buys/${gb.id}/testing/notify-result`), {
        method: "POST",
        headers: { "x-admin-secret": secret },
      });
      const d = await r.json();
      if (!r.ok) { setNotifyResultMsg({ ok: false, text: d.error ?? "Failed to notify participants" }); return; }
      setNotifyResultMsg({
        ok: true,
        text: `Notified ${d.sent} contributor${d.sent !== 1 ? "s" : ""}`
          + (d.failed ? ` · ${d.failed} failed` : "")
          + (d.skipped ? ` · ${d.skipped} skipped (no Telegram)` : "")
          + ".",
      });
    } catch {
      setNotifyResultMsg({ ok: false, text: "Failed to notify participants" });
    } finally {
      setNotifyingResult(false);
    }
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

          {/* Vote Result — winning compound (with batch), test, and notify button. Shown once voting is closed. */}
          {round.status !== "active" && (() => {
            const winner = data?.thresholds?.leadingPeptide ?? null;
            const batch = winner ? (round.peptideBatches?.[winner] ?? null) : null;
            const votedTests = data?.thresholds?.votedTests ?? [];
            const topTest = votedTests[0] ?? null;
            return (
              <div className="border border-border rounded-lg p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vote Result</p>
                {winner ? (
                  <div className="space-y-3">
                    <div className="rounded-lg bg-muted/40 border border-border p-3 space-y-2">
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Winning compound</p>
                        <p className="text-base font-bold leading-tight">{winner}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Batch:{" "}
                          {batch
                            ? <span className="font-medium text-foreground tabular-nums">{batch}</span>
                            : <span className="text-orange-600 dark:text-orange-400">not set — add it in the Compound Ballot below</span>}
                        </p>
                      </div>
                      <div className="pt-2 border-t border-border">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Winning test{votedTests.length > 1 ? "s" : ""}
                        </p>
                        {topTest ? (
                          <p className="text-sm font-semibold">
                            {topTest}
                            {votedTests.length > 1 && (
                              <span className="font-normal text-muted-foreground"> · {votedTests.slice(1).join(", ")}</span>
                            )}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground">No test votes cast</p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Button size="sm" onClick={handleNotifyResult} disabled={notifyingResult} className="gap-1.5">
                        {notifyingResult ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
                        Notify participants of result
                      </Button>
                      <p className="text-[10px] text-muted-foreground">
                        Sends a Telegram message to every contributor announcing the winning compound and test.
                      </p>
                      {notifyResultMsg && (
                        <p className={cn("text-xs", notifyResultMsg.ok ? "text-green-600 dark:text-green-400" : "text-red-500")}>
                          {notifyResultMsg.text}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No votes were cast in this round, so there&rsquo;s no winning compound to show.
                  </p>
                )}
              </div>
            );
          })()}

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
                <div className="pl-6 space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Vote threshold to unlock late opt-in <span className="font-normal">(% of contributors, optional)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={lateVoteThreshold}
                      onChange={e => setLateVoteThreshold(e.target.value)}
                      placeholder="e.g. 80"
                      className="w-24 text-xs px-3 py-2 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                    {lateVoteThreshold.trim() !== "" && (
                      <button
                        type="button"
                        onClick={() => setLateVoteThreshold("")}
                        className="text-xs text-muted-foreground underline hover:text-foreground"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Leave blank to open late opt-in immediately. Set a number (1–100) to require that percentage of contributors to have voted first.
                  </p>
                </div>
              )}

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

          {/* Pending contributions awaiting payment confirmation */}
          {pendingContribs.length > 0 && (
            <div className="border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-3 bg-amber-50 dark:bg-amber-950">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                Pending contributions ({pendingContribs.length})
              </p>
              <div className="space-y-0 divide-y divide-amber-200 dark:divide-amber-800">
                {pendingContribs.map(c => (
                  <div key={c.id} className="py-3 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-medium">@{c.telegram_username?.replace(/^@/, "")}</span>
                        <span className="text-[10px] text-muted-foreground">#{c.code}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {c.payment_method}{c.tx_hash ? ` · ${c.tx_hash}` : ""}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(c.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold tabular-nums">{gb.currency === "GBP" ? "£" : "€"}{c.amount.toFixed(2)}</span>
                      <Button
                        size="sm"
                        className="h-6 px-2 text-[11px] bg-green-600 hover:bg-green-700 text-white"
                        disabled={actingContrib === c.id}
                        onClick={async () => {
                          setActingContrib(c.id);
                          try {
                            const r = await fetch(apiUrl(`/admin/group-buys/${gb.id}/testing/contributions/${c.id}`), {
                              method: "PATCH",
                              headers: { "x-admin-secret": secret, "Content-Type": "application/json" },
                              body: JSON.stringify({ action: "confirm" }),
                            });
                            if (r.ok) { await load(); await loadContribs(); }
                          } finally { setActingContrib(null); }
                        }}
                      >
                        {actingContrib === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Confirm"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-[11px] text-red-600 border-red-300 hover:bg-red-50"
                        disabled={actingContrib === c.id}
                        onClick={async () => {
                          setActingContrib(c.id);
                          try {
                            const r = await fetch(apiUrl(`/admin/group-buys/${gb.id}/testing/contributions/${c.id}`), {
                              method: "PATCH",
                              headers: { "x-admin-secret": secret, "Content-Type": "application/json" },
                              body: JSON.stringify({ action: "reject" }),
                            });
                            if (r.ok) { await loadContribs(); }
                          } finally { setActingContrib(null); }
                        }}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contributors */}
          <div className="border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contributors</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {(data?.contributors ?? []).filter(c => c.hasVoted).length} / {(data?.contributors ?? []).length} voted
                </span>
                {(data?.contributors ?? []).some(c => !c.hasVoted) && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-[11px] gap-1"
                    disabled={sendingReminder}
                    onClick={async () => {
                      setSendingReminder(true);
                      setReminderMsg(null);
                      try {
                        const r = await fetch(apiUrl(`/admin/group-buys/${gb.id}/testing/send-vote-reminder`), {
                          method: "POST",
                          headers: { "x-admin-secret": secret },
                        });
                        const d = await r.json();
                        if (r.ok) {
                          setReminderMsg({ ok: true, text: `✓ Sent to ${d.sent} member${d.sent !== 1 ? "s" : ""}${d.failed > 0 ? ` · ${d.failed} failed` : ""}` });
                        } else {
                          setReminderMsg({ ok: false, text: d.error ?? "Failed" });
                        }
                      } catch {
                        setReminderMsg({ ok: false, text: "Network error" });
                      } finally {
                        setSendingReminder(false);
                      }
                    }}
                  >
                    {sendingReminder ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    {sendingReminder ? "Sending…" : "Remind unvoted"}
                  </Button>
                )}
              </div>
            </div>
            {reminderMsg && (
              <p className={`text-xs font-medium px-2 py-1 rounded ${reminderMsg.ok ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400" : "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400"}`}>
                {reminderMsg.text}
              </p>
            )}

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
