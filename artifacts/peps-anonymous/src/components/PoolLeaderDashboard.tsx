import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, ExternalLink, Trash2, X, Users, FileCheck, ChevronDown, ChevronUp, MessageSquare, Send, ArrowUp, ArrowDown, FlaskConical, TestTube, CheckCircle2, Circle, ToggleLeft, ToggleRight, AlertCircle, Pencil, Image, Settings, Wallet, DollarSign, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type LeaderStatus = {
  status: string | null;
  bio: string | null;
  wallet: string | null;
  walletCurrency: string | null;
  walletNetwork: string | null;
  anonpayWallet: string | null;
  anonpayTicker: string | null;
  anonpayNetwork: string | null;
  revolutHandle: string | null;
  paypalEmail: string | null;
};

type LeaderPool = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  compoundName: string | null;
  manufacturer: string | null;
  status: string;
  votingMode: string;
  targetAmountUsd: number;
  raisedUsd: number;
  contributorCount: number;
  pendingCount: number;
  paymentMethods: Array<{ type: string; [k: string]: any }>;
  contributorNamedReportEnabled: boolean;
  fixedOptInFeeUsd: number | null;
};

type CatalogEntry = {
  id: string;
  code: string;
  name: string;
  defaultPriceUsd: number;
  unitLabel: string;
  category: string;
  analysisSection: string | null;
};

type PendingTest = { catalogId?: string; code: string; name: string; unitPriceUsd: number; quantity: number };

const POOL_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  open: "Open",
  funded: "Funded",
  sent_to_lab: "At lab",
  results_received: "Results posted",
  closed: "Closed",
  cancelled: "Cancelled",
};

export function PoolLeaderDashboard() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showApply, setShowApply] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editPool, setEditPool] = useState<LeaderPool | null>(null);

  const { data: status, isLoading: statusLoading } = useQuery<LeaderStatus | null>({
    queryKey: ["/api/account/pool-leader/status"],
    queryFn: async () => {
      const r = await fetch("/api/account/pool-leader/status", { credentials: "include" });
      if (r.status === 401) return null;
      return r.json();
    },
  });

  const { data: pools = [] } = useQuery<LeaderPool[]>({
    queryKey: ["/api/account/pool-leader/pools"],
    enabled: status?.status === "approved",
    queryFn: async () => {
      const r = await fetch("/api/account/pool-leader/pools", { credentials: "include" });
      if (!r.ok) return [];
      return r.json();
    },
  });

  if (statusLoading) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  }

  if (!status || !status.status) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <h3 className="text-sm font-bold mb-2">Become a Pool Leader</h3>
        <p className="text-xs text-slate-600 mb-4">
          Apply to lead standalone testing pools. You'll receive crypto contributions to your wallet and coordinate lab tests for the community.
        </p>
        <button
          onClick={() => setShowApply(true)}
          className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold"
        >
          Apply to be a leader
        </button>
        {showApply && <ApplyModal onClose={() => setShowApply(false)} onSuccess={() => { setShowApply(false); qc.invalidateQueries({ queryKey: ["/api/account/pool-leader/status"] }); }} />}
      </div>
    );
  }

  if (status.status === "applied") {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
        <h3 className="text-sm font-bold mb-1">Application pending</h3>
        <p className="text-xs text-slate-600">Your pool leader application is awaiting admin review.</p>
      </div>
    );
  }

  if (status.status === "rejected") {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-5">
        <h3 className="text-sm font-bold mb-1">Application rejected</h3>
        <p className="text-xs text-slate-600">Contact an admin for details.</p>
      </div>
    );
  }

  if (status.status !== "approved") {
    return <div className="text-sm text-slate-600">Status: {status.status}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl p-4" style={{ background: "rgba(16,185,129,0.06)", border: "1.5px solid rgba(16,185,129,0.25)" }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold" style={{ color: "#065F46" }}>Approved Pool Leader</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {status.wallet
                ? <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(16,185,129,0.12)", color: "#065F46", border: "1px solid rgba(16,185,129,0.25)" }}>💎 {status.walletCurrency} · {status.wallet.slice(0, 10)}…</span>
                : <span className="text-[10px] px-2 py-0.5 rounded-full italic" style={{ color: "var(--t-muted)", border: "1px dashed var(--t-border)" }}>No crypto wallet</span>}
              {status.anonpayWallet && <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(109,40,217,0.08)", color: "#5B21B6", border: "1px solid rgba(109,40,217,0.18)" }}>🕵️ AnonPay ({status.anonpayTicker ?? "XMR"})</span>}
              {status.revolutHandle && <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(25,28,31,0.06)", color: "#111827", border: "1px solid rgba(0,0,0,0.12)" }}>🔵 {status.revolutHandle}</span>}
              {status.paypalEmail && <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(0,112,186,0.08)", color: "#0070BA", border: "1px solid rgba(0,112,186,0.2)" }}>🅿️ PayPal</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowSettings(true)}
              title="Payment settings"
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-opacity hover:opacity-70"
              style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)" }}
            >
              <Settings className="w-4 h-4" style={{ color: "#065F46" }} />
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="px-3 py-1.5 rounded-lg text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-opacity hover:opacity-90"
              style={{ background: "#059669" }}
            >
              <Plus className="w-3.5 h-3.5" /> New pool
            </button>
          </div>
        </div>
      </div>

      {pools.length === 0 ? (
        <div className="text-center py-8 text-sm text-slate-500">No pools yet. Create your first one.</div>
      ) : (
        <div className="space-y-3">
          {pools.map(p => <PoolCard key={p.id} pool={p} onEdit={() => setEditPool(p)} />)}
        </div>
      )}

      {showSettings && (
        <PaymentSettingsModal
          current={status!}
          onClose={() => setShowSettings(false)}
          onSuccess={() => {
            setShowSettings(false);
            qc.invalidateQueries({ queryKey: ["/api/account/pool-leader/status"] });
            toast({ title: "Payment settings updated" });
          }}
        />
      )}

      {showCreate && (
        <CreatePoolModal
          leaderStatus={status!}
          onClose={() => setShowCreate(false)}
          onSuccess={(slug) => {
            setShowCreate(false);
            qc.invalidateQueries({ queryKey: ["/api/account/pool-leader/pools"] });
            qc.invalidateQueries({ queryKey: ["/api/account/pool-leader/status"] });
            toast({ title: "Pool created", description: `Visit /pool/${slug} to share it.` });
          }}
        />
      )}

      {editPool && (
        <EditPoolModal
          pool={editPool}
          leaderStatus={status!}
          onClose={() => setEditPool(null)}
          onSuccess={() => {
            setEditPool(null);
            qc.invalidateQueries({ queryKey: ["/api/account/pool-leader/pools"] });
            toast({ title: "Pool updated" });
          }}
        />
      )}
    </div>
  );
}

function PoolCard({ pool, onEdit }: { pool: LeaderPool; onEdit: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();

  const transitions = useMutation({
    mutationFn: async (status: string) => {
      const r = await fetch(`/api/account/pool-leader/pools/${pool.id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? "Failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/account/pool-leader/pools"] });
      toast({ title: "Updated" });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const nextStatuses: Array<{ s: string; label: string }> = [];
  if (pool.status === "draft") nextStatuses.push({ s: "open", label: "Open for contributions" });
  if (pool.status === "open") nextStatuses.push({ s: "funded", label: "Mark fully funded" }, { s: "cancelled", label: "Cancel" });
  if (pool.status === "funded") nextStatuses.push({ s: "sent_to_lab", label: "Sent to lab" });
  if (pool.status === "sent_to_lab") nextStatuses.push({ s: "results_received", label: "Mark results received" });
  if (pool.status === "results_received") nextStatuses.push({ s: "closed", label: "Close pool" });

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="p-4 flex items-center gap-3">
        <button onClick={() => setExpanded(e => !e)} className="flex-1 min-w-0 text-left">
          <p className="text-sm font-bold truncate">{pool.title}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {POOL_STATUS_LABEL[pool.status] ?? pool.status} · ${pool.raisedUsd.toFixed(2)} / ${pool.targetAmountUsd.toFixed(2)} · {pool.contributorCount} contributors
            {pool.pendingCount > 0 && <span className="text-amber-600"> · {pool.pendingCount} pending</span>}
          </p>
        </button>
        <button onClick={onEdit} className="p-1.5 hover:bg-slate-100 rounded" title="Edit pool details">
          <Pencil className="w-4 h-4 text-slate-400" />
        </button>
        <a href={`/pool/${pool.slug}`} target="_blank" rel="noreferrer" className="p-1.5 hover:bg-slate-100 rounded" title="Public page">
          <ExternalLink className="w-4 h-4 text-slate-400" />
        </a>
        <button onClick={() => setExpanded(e => !e)} className="p-1.5 hover:bg-slate-100 rounded">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>
      {expanded && (
        <div className="border-t border-slate-200 p-4 space-y-4 bg-slate-50">
          {nextStatuses.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {nextStatuses.map(t => (
                <button
                  key={t.s}
                  onClick={() => transitions.mutate(t.s)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded ${t.s === "cancelled" ? "bg-red-600 text-white" : "bg-emerald-600 text-white"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
          <ParticipantsPanel poolId={pool.id} />
          <MessagingPanel poolId={pool.id} />
          {(pool.status === "results_received" || pool.status === "sent_to_lab") && <ResultsPanel poolId={pool.id} slug={pool.slug} />}
        </div>
      )}
    </div>
  );
}

type Participant = {
  id: string;
  contactEmail: string | null;
  contactTelegram: string | null;
  accountUsername: string | null;
  displayName: string | null;
  amountUsd: number;
  paymentStatus: string;
  paymentMethod: string | null;
  paymentTxHash: string | null;
  paymentScreenshotUrl: string | null;
  namedReportOptIn: boolean;
  namedReportName: string | null;
  createdAt: string;
};

const METHOD_ICON: Record<string, string> = {
  crypto: "💎",
  paypal: "🅿️",
  revolut: "🔵",
  anonpay: "🕵️",
};

function ParticipantsPanel({ poolId }: { poolId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [screenshotView, setScreenshotView] = useState<string | null>(null);
  const [loadingScreenshot, setLoadingScreenshot] = useState<string | null>(null);

  const { data: parts = [] } = useQuery<Participant[]>({
    queryKey: ["/api/account/pool-leader/pools", poolId, "participants"],
    queryFn: async () => {
      const r = await fetch(`/api/account/pool-leader/pools/${poolId}/participants`, { credentials: "include" });
      if (!r.ok) return [];
      return r.json();
    },
  });

  const review = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const r = await fetch(`/api/account/pool-leader/participants/${id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: status }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? "Failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/account/pool-leader/pools", poolId, "participants"] });
      qc.invalidateQueries({ queryKey: ["/api/account/pool-leader/pools"] });
      toast({ title: "Updated" });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const viewScreenshot = async (participantId: string) => {
    setLoadingScreenshot(participantId);
    try {
      const r = await fetch(`/api/account/pool-leader/participants/${participantId}/screenshot`, { credentials: "include" });
      if (!r.ok) throw new Error("Not available");
      const j = await r.json();
      setScreenshotView(j.screenshotUrl);
    } catch (e: any) {
      toast({ title: "Could not load screenshot", description: e.message, variant: "destructive" });
    } finally {
      setLoadingScreenshot(null);
    }
  };

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-2 inline-flex items-center gap-1.5">
        <Users className="w-3.5 h-3.5" /> Participants ({parts.length})
      </p>
      {parts.length === 0 ? (
        <p className="text-xs text-slate-500 italic">No contributions yet.</p>
      ) : (
        <div className="space-y-1.5">
          {parts.map(p => (
            <div key={p.id} className="bg-white border border-slate-200 rounded p-2.5 text-xs">
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-semibold truncate">
                      {p.displayName || p.accountUsername || p.contactTelegram || p.contactEmail || "Anonymous"}
                    </p>
                    {p.paymentMethod && (
                      <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                        {METHOD_ICON[p.paymentMethod] ?? "💳"} {p.paymentMethod}
                      </span>
                    )}
                    {p.namedReportOptIn && (
                      <span className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded font-medium">
                        Named report: {p.namedReportName || "—"}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 mt-0.5 truncate">
                    ${p.amountUsd.toFixed(2)} · <span className={
                      p.paymentStatus === "verified" ? "text-emerald-600 font-semibold" :
                      p.paymentStatus === "rejected" ? "text-red-600 font-semibold" :
                      p.paymentStatus === "submitted" ? "text-amber-600 font-semibold" : ""
                    }>{p.paymentStatus}</span>
                    {p.contactEmail && ` · ${p.contactEmail}`}
                    {p.contactTelegram && ` · ${p.contactTelegram}`}
                  </p>
                  {p.paymentTxHash && <p className="font-mono text-[10px] text-slate-500 truncate mt-0.5">tx: {p.paymentTxHash}</p>}
                  {(p.paymentMethod === "revolut" || p.paymentMethod === "paypal") && (
                    <p className="font-mono text-[10px] mt-0.5 font-bold" style={{ color: "#92400e" }}>
                      Ref: POOL-{p.id.slice(0, 4).toUpperCase()}-{p.id.slice(4, 8).toUpperCase()}
                    </p>
                  )}
                  {p.paymentScreenshotUrl === "present" && (
                    <button
                      onClick={() => viewScreenshot(p.id)}
                      className="mt-1 inline-flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-700 font-semibold"
                    >
                      {loadingScreenshot === p.id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Image className="w-3 h-3" />
                      }
                      View payment screenshot
                    </button>
                  )}
                </div>
                <div className="flex gap-1 shrink-0 flex-col items-end">
                  {p.paymentStatus !== "verified" && (
                    <button onClick={() => review.mutate({ id: p.id, status: "verified" })} className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-semibold">Verify</button>
                  )}
                  {p.paymentStatus !== "rejected" && p.paymentStatus !== "refunded" && (
                    <button onClick={() => review.mutate({ id: p.id, status: "rejected" })} className="px-2 py-0.5 bg-red-600 text-white rounded text-[10px] font-semibold">Reject</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Screenshot viewer overlay */}
      {screenshotView && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setScreenshotView(null)}>
          <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setScreenshotView(null)} className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow">
              <X className="w-4 h-4" />
            </button>
            <img src={screenshotView} alt="Payment screenshot" className="w-full rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
}

type PerTestEdit = { poolTestId: string; testName: string; result: string; passed: "" | "true" | "false"; resultPdfUrl: string; janoshikUrl: string };

function ResultsPanel({ poolId, slug }: { poolId: string; slug: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [notes, setNotes] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [perTest, setPerTest] = useState<PerTestEdit[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load tests for this pool to seed per-test editor
  useQuery({
    queryKey: ["/api/testing-pools", slug, "leader-load"],
    queryFn: async () => {
      const r = await fetch(`/api/testing-pools/${slug}`, { credentials: "include" });
      if (!r.ok) return null;
      const j = await r.json();
      if (!loaded) {
        setPerTest((j.tests as Array<{ id: string; name: string; janoshikUrl?: string }>).map(t => ({ poolTestId: t.id, testName: t.name, result: "", passed: "", resultPdfUrl: "", janoshikUrl: t.janoshikUrl ?? "" })));
        setLoaded(true);
      }
      return j;
    },
    enabled: !loaded,
  });

  const updateRow = (i: number, patch: Partial<PerTestEdit>) => {
    const arr = [...perTest]; arr[i] = { ...arr[i], ...patch }; setPerTest(arr);
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      // Step 1: write per-test rows (only those with content)
      const rows = perTest
        .filter(r => r.result.trim() !== "" || r.passed !== "" || r.resultPdfUrl.trim() !== "")
        .map(r => ({
          poolTestId: r.poolTestId,
          result: r.result.trim() || null,
          passed: r.passed === "" ? null : r.passed === "true",
          resultPdfUrl: r.resultPdfUrl.trim() || null,
        }));
      if (rows.length > 0) {
        const r1 = await fetch(`/api/account/pool-leader/pools/${poolId}/results`, {
          method: "PUT", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ results: rows }),
        });
        if (!r1.ok) throw new Error("Per-test results failed");
      }
      // Step 1b: update per-test janoshik URLs
      const janoUrls: Record<string, string> = {};
      for (const r of perTest) { if (r.janoshikUrl.trim()) janoUrls[r.poolTestId] = r.janoshikUrl.trim(); }
      if (Object.keys(janoUrls).length > 0) {
        await fetch(`/api/account/pool-leader/pools/${poolId}/test-janoshik`, {
          method: "PATCH", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ janoshikUrls: janoUrls }),
        });
      }
      // Step 2: update pool-level fields + status
      const r2 = await fetch(`/api/account/pool-leader/pools/${poolId}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resultNotes: notes || undefined,
          resultPdfUrl: pdfUrl || undefined,
          resultsPassword: password || undefined,
          status: "results_received",
        }),
      });
      if (!r2.ok) throw new Error("Pool update failed");
      qc.invalidateQueries({ queryKey: ["/api/account/pool-leader/pools"] });
      toast({ title: "Results published" });
      setPassword("");
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-3 inline-flex items-center gap-1.5">
        <FileCheck className="w-3.5 h-3.5" /> Publish results
      </p>
      <div className="space-y-3">
        {perTest.length > 0 && (
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <p className="text-[10px] uppercase font-bold text-slate-500 bg-slate-50 px-3 py-1.5 border-b border-slate-200">Per-test results</p>
            <div className="divide-y divide-slate-100">
              {perTest.map((r, i) => (
                <div key={r.poolTestId} className="px-3 py-2.5 space-y-2">
                  <p className="text-xs font-semibold text-slate-700 truncate">{r.testName}</p>
                  <div className="grid grid-cols-[auto_1fr] gap-2 items-center">
                    <select value={r.passed} onChange={e => updateRow(i, { passed: e.target.value as PerTestEdit["passed"] })} className="px-1.5 py-1 border border-slate-300 rounded text-xs bg-white">
                      <option value="">—</option>
                      <option value="true">PASS</option>
                      <option value="false">FAIL</option>
                    </select>
                    <input value={r.result} onChange={e => updateRow(i, { result: e.target.value })} placeholder="Result detail" className="px-2 py-1 border border-slate-300 rounded text-xs w-full" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                    <input value={r.resultPdfUrl} onChange={e => updateRow(i, { resultPdfUrl: e.target.value })} placeholder="PDF / result URL for this test (optional)" className="flex-1 px-2 py-1 border border-slate-200 rounded text-[11px] text-slate-600 bg-slate-50" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FlaskConical className="w-3 h-3 text-violet-400 shrink-0" />
                    <input value={r.janoshikUrl} onChange={e => updateRow(i, { janoshikUrl: e.target.value })} placeholder="Janoshik report URL for this test (optional)" className="flex-1 px-2 py-1 border border-slate-200 rounded text-[11px] text-slate-600 bg-slate-50" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="space-y-2">
          <p className="text-[10px] uppercase font-bold text-slate-500">Overall</p>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Overall lab notes / summary" className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs" />
          <div className="flex items-center gap-1.5">
            <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
            <input value={pdfUrl} onChange={e => setPdfUrl(e.target.value)} placeholder="Overall report PDF URL" className="flex-1 px-2 py-1.5 border border-slate-300 rounded text-xs" />
          </div>
          <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Results password (set/update — leave blank to skip)" className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs" />
        </div>
        <button onClick={submit} disabled={submitting} className="w-full px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold disabled:opacity-50">
          {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : "Publish results"}
        </button>
      </div>
    </div>
  );
}

type PoolMsg = { id: string; message: string; createdAt: string };

function MessagingPanel({ poolId }: { poolId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const { data: messages = [] } = useQuery<PoolMsg[]>({
    queryKey: ["/api/account/pool-leader/pools", poolId, "messages"],
    enabled: open,
    queryFn: async () => {
      const r = await fetch(`/api/account/pool-leader/pools/${poolId}/messages`, { credentials: "include" });
      if (!r.ok) return [];
      return r.json();
    },
  });

  const send = async () => {
    if (!draft.trim()) return;
    setSending(true);
    try {
      const r = await fetch(`/api/account/pool-leader/pools/${poolId}/message`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: draft }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? "Failed");
      setDraft("");
      qc.invalidateQueries({ queryKey: ["/api/account/pool-leader/pools", poolId, "messages"] });
      toast({ title: "Message sent" });
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-2 inline-flex items-center gap-1.5"
      >
        <MessageSquare className="w-3.5 h-3.5" /> Messages to group ({messages.length})
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {open && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              rows={3}
              placeholder="Write a message to all participants in this pool…"
              className="flex-1 px-2 py-1.5 border border-slate-300 rounded text-xs resize-none"
            />
            <button
              onClick={send}
              disabled={sending || !draft.trim()}
              className="px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-semibold disabled:opacity-50 inline-flex flex-col items-center gap-1 self-stretch"
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Send</span>
            </button>
          </div>
          {messages.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No messages sent yet.</p>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {messages.map(m => (
                <div key={m.id} className="bg-white border border-slate-200 rounded p-2">
                  <p className="text-xs text-slate-700 whitespace-pre-wrap">{m.message}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{new Date(m.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ApplyModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { toast } = useToast();
  const [bio, setBio] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      const r = await fetch("/api/account/pool-leader/apply", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio }),
      });
      if (!r.ok) {
        const j = await r.json();
        throw new Error(j.error ?? "Failed");
      }
      onSuccess();
    } catch (e: any) {
      toast({ title: "Could not apply", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-md w-full p-6 my-8">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-base font-bold">Pool Leader Application</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Apply to lead standalone testing pools. Once approved you'll set up your payment details when creating your first pool.
          </p>
          <label className="block text-xs">
            <span className="text-slate-700 font-medium">About you (optional)</span>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm" placeholder="Tell the admins a bit about yourself and why you'd like to lead pools..." />
          </label>

          <button onClick={submit} disabled={submitting} className="w-full px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin inline" /> : "Submit application"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Payment Settings Modal ────────────────────────────────────────────────────

const WALLET_CURRENCIES = ["USDT", "USDC", "ETH", "BTC", "XMR", "BNB", "SOL", "LTC", "DOGE", "DASH", "ZEC"] as const;
const WALLET_NETWORKS: Record<string, string[]> = {
  USDT: ["ERC-20", "TRC-20", "BEP-20"],
  USDC: ["ERC-20", "BEP-20"],
  ETH:  ["Mainnet"],
  BTC:  ["Mainnet"],
  XMR:  ["Mainnet"],
  BNB:  ["BEP-20"],
  SOL:  ["Solana"],
  LTC:  ["Mainnet"],
  DOGE: ["Mainnet"],
  DASH: ["Mainnet"],
  ZEC:  ["Mainnet"],
};
const ANONPAY_COINS = [
  { label: "Monero (XMR)",        ticker: "XMR",  network: "Monero"       },
  { label: "Bitcoin (BTC)",       ticker: "BTC",  network: "Bitcoin"      },
  { label: "Ethereum (ETH)",      ticker: "ETH",  network: "Ethereum"     },
  { label: "USDT — ERC-20",       ticker: "USDT", network: "ERC-20"       },
  { label: "USDT — TRC-20",       ticker: "USDT", network: "TRC-20"       },
  { label: "USDT — BEP-20",       ticker: "USDT", network: "BEP-20"       },
  { label: "USDT — Solana",       ticker: "USDT", network: "Solana"       },
  { label: "USDC — ERC-20",       ticker: "USDC", network: "ERC-20"       },
  { label: "USDC — BEP-20",       ticker: "USDC", network: "BEP-20"       },
  { label: "USDC — Solana",       ticker: "USDC", network: "Solana"       },
  { label: "BNB (BEP-20)",        ticker: "BNB",  network: "BEP-20"       },
  { label: "Solana (SOL)",        ticker: "SOL",  network: "Solana"       },
  { label: "TRON (TRX)",          ticker: "TRX",  network: "TRON"         },
  { label: "TON",                 ticker: "TON",  network: "TON"          },
  { label: "Litecoin (LTC)",      ticker: "LTC",  network: "Litecoin"     },
  { label: "Dogecoin (DOGE)",     ticker: "DOGE", network: "Dogecoin"     },
  { label: "Bitcoin Cash (BCH)",  ticker: "BCH",  network: "Bitcoin Cash" },
  { label: "Dash (DASH)",         ticker: "DASH", network: "Dash"         },
  { label: "Zcash (ZEC)",         ticker: "ZEC",  network: "Zcash"        },
] as const;

function PmSection({ icon, label, badge, children }: { icon: string; label: string; badge?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--t-border)" }}>
      <div className="flex items-center justify-between px-4 py-2.5" style={{ background: "var(--t-surface2, var(--t-bg))", borderBottom: "1px solid var(--t-border)" }}>
        <div className="flex items-center gap-2">
          <span className="text-sm">{icon}</span>
          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--t-text)" }}>{label}</span>
        </div>
        {badge && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1" }}>{badge}</span>}
      </div>
      <div className="px-4 py-3 space-y-2.5" style={{ background: "var(--t-surface)" }}>
        {children}
      </div>
    </div>
  );
}

function PmLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] font-semibold block mb-1" style={{ color: "var(--t-muted)" }}>{children}</span>;
}

function PaymentSettingsModal({
  current,
  onClose,
  onSuccess,
}: {
  current: LeaderStatus;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [walletAddress, setWalletAddress] = useState(current.wallet ?? "");
  const [walletCurrency, setWalletCurrency] = useState(current.walletCurrency ?? "USDT");
  const [walletNetwork, setWalletNetwork] = useState(current.walletNetwork ?? "ERC-20");
  const [revolutHandle, setRevolutHandle] = useState(current.revolutHandle ?? "");
  const [paypalEmail, setPaypalEmail] = useState(current.paypalEmail ?? "");

  const initAnonCoin = ANONPAY_COINS.find(
    c => c.ticker === (current.anonpayTicker ?? "XMR").toUpperCase() && c.network === (current.anonpayNetwork ?? "Monero")
  ) ?? ANONPAY_COINS[0];
  const [anonCoinKey, setAnonCoinKey] = useState(`${initAnonCoin.ticker}|${initAnonCoin.network}`);
  const [anonpayWallet, setAnonpayWallet] = useState(current.anonpayWallet ?? "");
  const [submitting, setSubmitting] = useState(false);

  const selectedAnonCoin = ANONPAY_COINS.find(c => `${c.ticker}|${c.network}` === anonCoinKey) ?? ANONPAY_COINS[0];
  const availableNetworks = WALLET_NETWORKS[walletCurrency] ?? ["Mainnet"];

  const handleCurrencyChange = (c: string) => {
    setWalletCurrency(c);
    const nets = WALLET_NETWORKS[c] ?? ["Mainnet"];
    setWalletNetwork(nets[0]);
  };

  const hasAtLeastOne = walletAddress.trim() || anonpayWallet.trim() || revolutHandle.trim() || paypalEmail.trim();

  const fld: React.CSSProperties = {
    border: "1px solid var(--t-border)",
    borderRadius: 8,
    background: "var(--t-surface)",
    color: "var(--t-text)",
  };
  const fldCls = "w-full px-3 py-2.5 text-sm focus:outline-none placeholder:opacity-40 transition-colors rounded-lg";
  const monoFld: React.CSSProperties = { ...fld, fontFamily: "ui-monospace,SFMono-Regular,monospace", fontSize: 12 };

  const submit = async () => {
    if (!hasAtLeastOne) { toast({ title: "At least one payment method required", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      const r = await fetch("/api/account/pool-leader/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: walletAddress.trim() || null,
          walletCurrency,
          walletNetwork,
          anonpayWallet: anonpayWallet.trim() || null,
          anonpayTicker: anonpayWallet.trim() ? selectedAnonCoin.ticker : null,
          anonpayNetwork: anonpayWallet.trim() ? selectedAnonCoin.network : null,
          revolutHandle: revolutHandle.trim() || null,
          paypalEmail: paypalEmail.trim() || null,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Failed");
      onSuccess();
    } catch (e: any) {
      toast({ title: "Could not save", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="rounded-2xl max-w-lg w-full my-8 shadow-2xl overflow-hidden"
        style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--t-border)" }}>
          <div>
            <h3 className="text-base font-bold flex items-center gap-2" style={{ color: "var(--t-text)" }}>
              <Settings className="w-4 h-4" style={{ color: "var(--t-blue)" }} />
              Payment Settings
            </h3>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--t-muted)" }}>Update where contributors send funds</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-opacity hover:opacity-60"
            style={{ background: "var(--t-bg)" }}>
            <X className="w-4 h-4" style={{ color: "var(--t-muted)" }} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[78vh] overflow-y-auto">

          {/* ── Crypto Wallet ── */}
          <PmSection icon="💎" label="Crypto Wallet">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <PmLabel>Currency</PmLabel>
                <select value={walletCurrency} onChange={e => handleCurrencyChange(e.target.value)}
                  className={fldCls + " cursor-pointer"} style={fld}>
                  {WALLET_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <PmLabel>Network</PmLabel>
                <select value={walletNetwork} onChange={e => setWalletNetwork(e.target.value)}
                  className={fldCls + " cursor-pointer"} style={fld}>
                  {availableNetworks.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
            <div>
              <PmLabel>Wallet Address — leave blank to remove</PmLabel>
              <input value={walletAddress} onChange={e => setWalletAddress(e.target.value)}
                placeholder={`${walletCurrency} address (0x… or bc1…)`}
                className={fldCls} style={monoFld} />
            </div>
          </PmSection>

          {/* ── Revolut ── */}
          <PmSection icon="🔵" label="Revolut">
            <div>
              <PmLabel>Username or @handle — leave blank to remove</PmLabel>
              <input value={revolutHandle} onChange={e => setRevolutHandle(e.target.value)}
                placeholder="@yourhandle" className={fldCls} style={fld} />
            </div>
          </PmSection>

          {/* ── PayPal ── */}
          <PmSection icon="🅿️" label="PayPal">
            <div>
              <PmLabel>Email address — leave blank to remove</PmLabel>
              <input value={paypalEmail} onChange={e => setPaypalEmail(e.target.value)}
                placeholder="your@email.com" className={fldCls} style={fld} />
            </div>
          </PmSection>

          {/* ── AnonPay (Trocador) — at the bottom ── */}
          <PmSection icon="🕵️" label="AnonPay" badge="via Trocador">
            <div>
              <PmLabel>Coin &amp; Network</PmLabel>
              <select value={anonCoinKey} onChange={e => setAnonCoinKey(e.target.value)}
                className={fldCls + " cursor-pointer"} style={fld}>
                {ANONPAY_COINS.map(c => (
                  <option key={`${c.ticker}|${c.network}`} value={`${c.ticker}|${c.network}`}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <PmLabel>Receiving wallet address — leave blank to remove</PmLabel>
              <input value={anonpayWallet} onChange={e => setAnonpayWallet(e.target.value)}
                placeholder={`${selectedAnonCoin.ticker} receiving address`}
                className={fldCls} style={monoFld} />
            </div>
          </PmSection>

          {!hasAtLeastOne && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <p className="text-[11px] text-red-600">At least one payment method is required.</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4" style={{ borderTop: "1px solid var(--t-border)", background: "var(--t-bg)" }}>
          <button
            onClick={submit}
            disabled={submitting || !hasAtLeastOne}
            className="w-full h-11 rounded-xl text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
            style={{ background: "var(--t-blue)" }}
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>
              <Check className="w-4 h-4" /> Save Payment Settings
            </>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INPUT_CLS = "w-full px-3 py-2.5 text-sm focus:outline-none placeholder:opacity-40 transition-colors";
const INPUT_STYLE: React.CSSProperties = {
  border: "1px solid var(--t-border)",
  borderRadius: 10,
  background: "var(--t-surface)",
  color: "var(--t-text)",
};
const SECTION_LABEL = "text-[11px] font-bold uppercase tracking-widest mb-2 text-[var(--t-muted)]";

const TROCADOR_COINS: Array<{ ticker: string; network: string; label: string }> = [
  { ticker: "XMR",  network: "Monero",   label: "XMR — Monero" },
  { ticker: "BTC",  network: "Bitcoin",  label: "BTC — Bitcoin" },
  { ticker: "ETH",  network: "Ethereum", label: "ETH — Ethereum" },
  { ticker: "USDT", network: "ERC-20",   label: "USDT — ERC-20" },
  { ticker: "USDT", network: "TRC-20",   label: "USDT — TRC-20" },
  { ticker: "USDC", network: "ERC-20",   label: "USDC — ERC-20" },
  { ticker: "LTC",  network: "Litecoin", label: "LTC — Litecoin" },
  { ticker: "SOL",  network: "Solana",   label: "SOL — Solana" },
];

// ─── Test Search Dropdown ─────────────────────────────────────────────────────

const ADDITIONAL_TEST_KEYWORDS = ["endotoxin", "lcms", "sterility", "heavy metal", "ph measurement", "ph ", "screening"];

function isAdditionalTest(c: CatalogEntry) {
  if (c.category === "single" || c.category === "addon") return true;
  const nameLower = c.name.toLowerCase();
  return ADDITIONAL_TEST_KEYWORDS.some(k => nameLower.includes(k));
}

function TestSearchDropdown({ catalog, tests, onAdd }: {
  catalog: CatalogEntry[];
  tests: PendingTest[];
  onAdd: (c: CatalogEntry) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  if (catalog.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center">
        <p className="text-xs text-slate-400 italic">No tests in catalog yet — admin must add them first.</p>
      </div>
    );
  }

  // Separate into groups, exclude variance/quantity-only tests (those are handled by vial amount)
  const massPurity = catalog.filter(c => c.category === "analysis" && !isAdditionalTest(c) && c.analysisSection !== "variance");
  const additional = catalog.filter(c => isAdditionalTest(c) || c.analysisSection === "extra");

  const q = query.toLowerCase().trim();
  const filterGroup = (arr: CatalogEntry[]) =>
    q ? arr.filter(c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)) : arr;

  const filteredMass = filterGroup(massPurity);
  const filteredAdditional = filterGroup(additional);
  const hasResults = filteredMass.length > 0 || filteredAdditional.length > 0;

  const ResultRow = ({ c }: { c: CatalogEntry }) => {
    const added = tests.some(t => t.catalogId === c.id);
    return (
      <button
        onMouseDown={e => { e.preventDefault(); if (!added) { onAdd(c); setQuery(""); } }}
        className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors ${
          added ? "opacity-50 cursor-default" : "hover:bg-slate-50 cursor-pointer"
        }`}
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{c.name}</p>
          <p className="text-[11px] text-slate-400">{c.unitLabel}</p>
        </div>
        <div className="shrink-0 flex items-center gap-2 ml-3">
          <span className="text-sm font-bold text-slate-700">${c.defaultPriceUsd.toFixed(2)}</span>
          {added
            ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            : <Plus className="w-4 h-4 text-slate-300" />
          }
        </div>
      </button>
    );
  };

  return (
    <div className="relative">
      {/* Search input */}
      <div className="relative">
        <FlaskConical className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search tests to add (e.g. GLP1, Endotoxin…)"
          className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white placeholder:text-slate-400"
        />
        {query && (
          <button
            onMouseDown={e => { e.preventDefault(); setQuery(""); }}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <X className="w-3.5 h-3.5 text-slate-400" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-20 w-full mt-1 bg-white rounded-xl border border-slate-200 shadow-lg max-h-72 overflow-y-auto">
          {!hasResults ? (
            <p className="px-3 py-4 text-xs text-slate-400 italic text-center">No tests match "{query}"</p>
          ) : (
            <>
              {filteredMass.length > 0 && (
                <div>
                  <div className="sticky top-0 px-3 pt-2.5 pb-1 bg-white border-b border-slate-100">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500">Mass / Purity</span>
                  </div>
                  {filteredMass.map(c => (
                    <ResultRow key={c.id} c={c} />
                  ))}
                </div>
              )}
              {filteredAdditional.length > 0 && (
                <div>
                  <div className="sticky top-0 px-3 pt-2.5 pb-1 bg-white border-b border-slate-100">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-violet-500">Additional Tests</span>
                  </div>
                  {filteredAdditional.map(c => (
                    <ResultRow key={c.id} c={c} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Hint chips when not searching */}
      {!open && !query && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {[...massPurity.slice(0, 3), ...additional.slice(0, 2)].filter(c => !tests.some(t => t.catalogId === c.id)).slice(0, 5).map(c => (
            <button
              key={c.id}
              onClick={() => { onAdd(c); }}
              className="text-[11px] px-2.5 py-1 rounded-full border border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
            >
              {c.name}
            </button>
          ))}
          {catalog.filter(c => !tests.some(t => t.catalogId === c.id)).length > 5 && (
            <button
              onClick={() => setOpen(true)}
              className="text-[11px] px-2.5 py-1 rounded-full border border-dashed border-slate-200 text-slate-400 hover:border-slate-300 transition-colors"
            >
              + more
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Payment Method Picker ────────────────────────────────────────────────────

function PaymentMethodPicker({
  leaderStatus,
  selectedTypes,
  onToggle,
  poolMethods,
}: {
  leaderStatus: LeaderStatus;
  selectedTypes: string[];
  onToggle: (type: string) => void;
  poolMethods?: Array<{ type: string; [k: string]: any }>;
}) {
  const available: Array<{ type: string; label: string; detail: string; icon: string }> = [];
  const poolCrypto = poolMethods?.find(m => m.type === "crypto");
  const cryptoWallet = leaderStatus.wallet ?? poolCrypto?.address ?? null;
  const cryptoCurrency = leaderStatus.walletCurrency ?? poolCrypto?.currency ?? "USDT";
  if (cryptoWallet) available.push({ type: "crypto", label: "Crypto", detail: `${cryptoCurrency} · ${cryptoWallet.slice(0, 12)}…`, icon: "💎" });
  const poolAnonpay = poolMethods?.find(m => m.type === "anonpay");
  const anonWallet = leaderStatus.anonpayWallet ?? poolAnonpay?.wallet ?? null;
  const anonTicker = leaderStatus.anonpayTicker ?? poolAnonpay?.ticker ?? "XMR";
  if (anonWallet) available.push({ type: "anonpay", label: "AnonPay", detail: `${anonTicker} · ${anonWallet.slice(0, 12)}…`, icon: "🕵️" });
  const poolRevolut = poolMethods?.find(m => m.type === "revolut");
  const revHandle = leaderStatus.revolutHandle ?? poolRevolut?.handle ?? null;
  if (revHandle) available.push({ type: "revolut", label: "Revolut", detail: revHandle, icon: "🔵" });
  const poolPaypal = poolMethods?.find(m => m.type === "paypal");
  const ppEmail = leaderStatus.paypalEmail ?? poolPaypal?.email ?? null;
  if (ppEmail) available.push({ type: "paypal", label: "PayPal", detail: ppEmail, icon: "🅿️" });

  if (available.length === 0) {
    return <p className="text-xs text-slate-500 italic">No payment methods on your profile yet.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {available.map(m => {
        const active = selectedTypes.includes(m.type);
        return (
          <button
            key={m.type}
            type="button"
            onClick={() => onToggle(m.type)}
            className="flex items-center gap-2.5 p-3 rounded-xl text-left transition-all"
            style={{
              border: `2px solid ${active ? "var(--t-blue)" : "var(--t-border)"}`,
              background: active ? "var(--t-blue-06)" : "var(--t-surface)",
            }}
          >
            <span className="text-base">{m.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold" style={{ color: active ? "var(--t-blue)" : "var(--t-text)" }}>{m.label}</p>
              <p className="text-[10px] truncate" style={{ color: "var(--t-muted)" }}>{m.detail}</p>
            </div>
            <div
              className="w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center"
              style={{ borderColor: active ? "var(--t-blue)" : "var(--t-border)", background: active ? "var(--t-blue)" : "transparent" }}
            >
              {active && <span className="w-2 h-2 block rounded-full bg-white" />}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Create Pool Modal ────────────────────────────────────────────────────────

function CreatePoolModal({ leaderStatus, onClose, onSuccess }: { leaderStatus: LeaderStatus; onClose: () => void; onSuccess: (slug: string) => void }) {
  const { toast } = useToast();
  const { data: catalog = [] } = useQuery<CatalogEntry[]>({
    queryKey: ["/api/test-catalog"],
    queryFn: async () => (await fetch("/api/test-catalog")).json(),
  });

  // Basic info
  const [title, setTitle] = useState("");
  const [compoundName, setCompoundName] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [description, setDescription] = useState("");
  const [doseUnit, setDoseUnit] = useState<"mcg" | "mg" | "iu">("mcg");
  const [doseValue, setDoseValue] = useState<string>("");
  const [resultsPassword, setResultsPassword] = useState("");
  const [votingMode, setVotingMode] = useState<"leader_decides" | "vote">("leader_decides");

  // Tests (ordered array — index = priority)
  const [tests, setTests] = useState<PendingTest[]>([]);

  // Vials
  const [vialAmount, setVialAmount] = useState(1);

  // Overflow / funding behaviour
  const [stopOnFunded, setStopOnFunded] = useState(false);
  const [overflowEnabled, setOverflowEnabled] = useState(false);

  // Contributor add-ons
  const [namedReportEnabled, setNamedReportEnabled] = useState(false);
  const [namedReportCap, setNamedReportCap] = useState("");

  // Payment methods — entered at pool-creation time
  const [walletAddress, setWalletAddress] = useState(leaderStatus.wallet ?? "");
  const [walletCurrency, setWalletCurrency] = useState(leaderStatus.walletCurrency ?? "USDT");
  const [walletNetwork, setWalletNetwork] = useState(leaderStatus.walletNetwork ?? "ERC-20");
  const [anonpayWallet, setAnonpayWallet] = useState(leaderStatus.anonpayWallet ?? "");
  const [anonpayTicker, setAnonpayTicker] = useState(leaderStatus.anonpayTicker ?? "XMR");
  const [anonpayNetwork, setAnonpayNetwork] = useState(leaderStatus.anonpayNetwork ?? "Monero");
  const [revolutHandle, setRevolutHandle] = useState(leaderStatus.revolutHandle ?? "");
  const [paypalEmail, setPaypalEmail] = useState(leaderStatus.paypalEmail ?? "");
  const [janoshikUrl, setJanoshikUrl] = useState((leaderStatus as any).janoshikUrl ?? "");
  const [allowVialContribution, setAllowVialContribution] = useState(false);
  const [pageMessage, setPageMessage] = useState("");

  // Fixed vs any fee
  const [fixedFeeEnabled, setFixedFeeEnabled] = useState(false);
  const [fixedFeeValue, setFixedFeeValue] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [walletAddressError, setWalletAddressError] = useState("");
  const [anonpayWalletError, setAnonpayWalletError] = useState("");

  const addFromCatalog = (entry: CatalogEntry) => {
    if (tests.some(t => t.catalogId === entry.id)) return;
    setTests(prev => [...prev, {
      catalogId: entry.id,
      code: entry.code,
      name: entry.name,
      unitPriceUsd: entry.defaultPriceUsd,
      quantity: vialAmount,
    }]);
  };

  const removeTest = (i: number) => setTests(prev => prev.filter((_, j) => j !== i));

  const moveUp = (i: number) => {
    if (i === 0) return;
    setTests(prev => { const a = [...prev]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; return a; });
  };

  const moveDown = (i: number) => {
    setTests(prev => {
      if (i === prev.length - 1) return prev;
      const a = [...prev]; [a[i], a[i + 1]] = [a[i + 1], a[i]]; return a;
    });
  };

  const setPrice = (i: number, val: number) => setTests(prev => {
    const a = [...prev]; a[i] = { ...a[i], unitPriceUsd: val }; return a;
  });

  const EXTRA_VIAL = 60;
  // testTotal returns just the base price — extra-vial surcharge is charged once for the whole pool.
  const testTotal = (t: PendingTest) => t.unitPriceUsd;
  const extraVialTotal = (vialAmount - 1) * EXTRA_VIAL;
  const target = tests.reduce((s, t) => s + testTotal(t), 0) + extraVialTotal;

  const hasAtLeastOnePayment = walletAddress || anonpayWallet || revolutHandle || paypalEmail || janoshikUrl;

  const submit = async () => {
    if (!title) { toast({ title: "Title required", variant: "destructive" }); return; }
    if (tests.length === 0) { toast({ title: "Add at least one test", variant: "destructive" }); return; }
    if (!hasAtLeastOnePayment) { toast({ title: "Add at least one payment method", variant: "destructive" }); return; }
    if (fixedFeeEnabled && (!fixedFeeValue || isNaN(parseFloat(fixedFeeValue)))) {
      toast({ title: "Enter a valid fixed opt-in fee", variant: "destructive" }); return;
    }

    // Address validation — must be at least 20 characters of valid address chars.
    const addrRe = /^[A-Za-z0-9\-_:.+@]{20,}$/;
    let addrOk = true;
    if (walletAddress) {
      if (!addrRe.test(walletAddress.trim())) {
        setWalletAddressError("Address looks invalid — check it's complete (min 20 chars, no spaces).");
        addrOk = false;
      } else { setWalletAddressError(""); }
    } else { setWalletAddressError(""); }
    if (anonpayWallet) {
      if (!addrRe.test(anonpayWallet.trim())) {
        setAnonpayWalletError("Address looks invalid — check it's complete (min 20 chars, no spaces).");
        addrOk = false;
      } else { setAnonpayWalletError(""); }
    } else { setAnonpayWalletError(""); }
    if (!addrOk) return;

    setSubmitting(true);
    try {
      const r = await fetch("/api/account/pool-leader/pools", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, description, compoundName, manufacturer, batchNumber: batchNumber || undefined, doseUnit,
          doseValue: doseValue ? parseFloat(doseValue) : undefined,
          votingMode,
          resultsPassword: resultsPassword || undefined,
          tests,
          vialAmount,
          overflowEnabled,
          stopOnFunded,
          allowVialContribution,
          pageMessage: pageMessage || undefined,
          contributorNamedReportEnabled: namedReportEnabled,
          namedReportCap: namedReportEnabled && namedReportCap ? parseInt(namedReportCap, 10) : null,
          walletAddress: walletAddress || undefined,
          walletCurrency,
          walletNetwork,
          anonpayWallet: anonpayWallet || undefined,
          anonpayTicker: anonpayWallet ? anonpayTicker : undefined,
          anonpayNetwork: anonpayWallet ? anonpayNetwork : undefined,
          revolutHandle: revolutHandle || undefined,
          paypalEmail: paypalEmail || undefined,
          janoshikUrl: janoshikUrl || undefined,
          fixedOptInFeeUsd: fixedFeeEnabled && fixedFeeValue ? parseFloat(fixedFeeValue) : null,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Failed");

      // Sync payment details back to leader profile so they appear in future pool
      // settings and don't have to be re-entered manually.
      const profileNeedsUpdate =
        (walletAddress && walletAddress !== leaderStatus.wallet) ||
        (anonpayWallet && anonpayWallet !== leaderStatus.anonpayWallet) ||
        (revolutHandle && revolutHandle !== leaderStatus.revolutHandle) ||
        (paypalEmail && paypalEmail !== leaderStatus.paypalEmail);
      if (profileNeedsUpdate) {
        await fetch("/api/account/pool-leader/profile", {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress: walletAddress.trim() || leaderStatus.wallet || null,
            walletCurrency,
            walletNetwork,
            anonpayWallet: anonpayWallet.trim() || leaderStatus.anonpayWallet || null,
            anonpayTicker: anonpayWallet.trim() ? anonpayTicker : (leaderStatus.anonpayTicker ?? null),
            anonpayNetwork: anonpayWallet.trim() ? anonpayNetwork : (leaderStatus.anonpayNetwork ?? null),
            revolutHandle: revolutHandle.trim() || leaderStatus.revolutHandle || null,
            paypalEmail: paypalEmail.trim() || leaderStatus.paypalEmail || null,
          }),
        });
      }

      onSuccess(j.slug);
    } catch (e: any) {
      toast({ title: "Could not create", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="rounded-2xl max-w-xl w-full my-8 shadow-2xl overflow-hidden"
        style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--t-border)" }}>
          <div>
            <h3 className="text-base font-bold" style={{ color: "var(--t-text)" }}>Create Testing Pool</h3>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--t-muted)" }}>Pool starts as draft — open it after review</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center transition-opacity hover:opacity-60"
            style={{ background: "var(--t-bg)" }}>
            <X className="w-4 h-4" style={{ color: "var(--t-muted)" }} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6 max-h-[80vh] overflow-y-auto">

          {/* ── Basic Info ── */}
          <section className="space-y-3">
            <p className={SECTION_LABEL}>Pool Details</p>
            <div>
              <label className="block text-[11px] font-semibold mb-1" style={{ color: "var(--t-muted)" }}>Pool Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Testing pool name (e.g. BPC-157 batch 042)"
                className={INPUT_CLS} style={INPUT_STYLE} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1" style={{ color: "var(--t-muted)" }}>Compound Name</label>
              <input value={compoundName} onChange={e => setCompoundName(e.target.value)}
                placeholder="e.g. BPC-157, Semaglutide, TB-500" className={INPUT_CLS} style={INPUT_STYLE} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1" style={{ color: "var(--t-muted)" }}>Vial Amount</label>
              <div className="flex gap-2 items-center">
                <input
                  value={doseValue}
                  onChange={e => setDoseValue(e.target.value)}
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Amount"
                  className="px-3 py-2 text-sm focus:outline-none w-24 shrink-0 transition-colors"
                  style={{ ...INPUT_STYLE, borderRadius: 10 }}
                />
                <div className="flex rounded-xl overflow-hidden shrink-0" style={{ border: "1px solid var(--t-border)" }}>
                  {(["mcg", "mg", "iu"] as const).map(u => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setDoseUnit(u)}
                      className="px-3 py-2 text-xs font-bold uppercase tracking-wide transition-colors"
                      style={{
                        background: doseUnit === u ? "var(--brand-navy, #1B3A7A)" : "var(--t-surface)",
                        color: doseUnit === u ? "#fff" : "var(--t-muted)",
                      }}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1" style={{ color: "var(--t-muted)" }}>Vendor / Manufacturer</label>
              <input value={manufacturer} onChange={e => setManufacturer(e.target.value)}
                placeholder="Vendor or manufacturer name" className={INPUT_CLS} style={INPUT_STYLE} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1" style={{ color: "var(--t-muted)" }}>Batch Number</label>
              <input value={batchNumber} onChange={e => setBatchNumber(e.target.value)}
                placeholder="Batch or lot number (optional)" className={INPUT_CLS} style={INPUT_STYLE} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1" style={{ color: "var(--t-muted)" }}>Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                rows={2} placeholder="Additional notes (optional)"
                className={INPUT_CLS + " resize-none"} style={INPUT_STYLE} />
            </div>
          </section>

          {/* ── Number of Vials ── */}
          <section>
            <p className={SECTION_LABEL}>Number of Vials</p>
            <div className="flex items-center gap-2 flex-wrap">
              {[1, 2, 3, 4].map(n => (
                <button
                  key={n}
                  onClick={() => { setVialAmount(n); setTests(prev => prev.map(t => ({ ...t, quantity: n }))); }}
                  className="w-8 h-8 rounded-lg text-xs font-bold transition-all"
                  style={{
                    border: `2px solid ${vialAmount === n ? "var(--t-blue)" : "var(--t-border)"}`,
                    background: vialAmount === n ? "var(--t-blue-08)" : "var(--t-surface)",
                    color: vialAmount === n ? "var(--t-blue)" : "var(--t-muted)",
                  }}
                >
                  {n}
                </button>
              ))}
              <span className="text-xs" style={{ color: "var(--t-muted)" }}>
                {vialAmount === 1
                  ? "1 vial included · each extra vial +$60 · max 3 extra"
                  : `${vialAmount} vials · +$${(vialAmount - 1) * 60} for ${vialAmount - 1} extra vial${vialAmount - 1 !== 1 ? "s" : ""}`}
              </span>
            </div>
          </section>

          {/* ── Add from Catalog ── */}
          <section>
            <p className={SECTION_LABEL}>Add from Catalog</p>
            <TestSearchDropdown catalog={catalog} tests={tests} onAdd={addFromCatalog} />
          </section>

          {/* ── Selected Tests (ordered) ── */}
          {tests.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <p className={SECTION_LABEL + " mb-0"}>Payment Order</p>
                <span className="text-[11px]" style={{ color: "var(--t-muted)" }}>First test gets funded first</span>
              </div>
              <div className="space-y-2">
                {tests.map((t, i) => (
                  <div key={t.catalogId ?? i}
                    className="flex items-center gap-2 rounded-xl px-3 py-2.5"
                    style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
                    {/* Priority badge */}
                    <div className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ background: "var(--t-bg)" }}>
                      <span className="text-[10px] font-bold" style={{ color: "var(--t-muted)" }}>{i + 1}</span>
                    </div>

                    {/* Name + price */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: "var(--t-text)" }}>{t.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[11px]" style={{ color: "var(--t-muted)" }}>$</span>
                        <input
                          type="number" min={0} step="0.01" value={t.unitPriceUsd}
                          onChange={e => setPrice(i, parseFloat(e.target.value) || 0)}
                          className="w-20 text-xs font-bold focus:outline-none bg-transparent"
                          style={{ borderBottom: "1px solid var(--t-border)", color: "var(--t-text)" }}
                        />
                        <span className="text-[11px]" style={{ color: "var(--t-muted)" }}>base</span>
                      </div>
                    </div>

                    {/* Up / Down */}
                    <div className="flex flex-col gap-0.5">
                      <button onClick={() => moveUp(i)} disabled={i === 0}
                        className="w-6 h-6 rounded-md flex items-center justify-center disabled:opacity-20 transition-opacity hover:opacity-60">
                        <ArrowUp className="w-3 h-3" style={{ color: "var(--t-muted)" }} />
                      </button>
                      <button onClick={() => moveDown(i)} disabled={i === tests.length - 1}
                        className="w-6 h-6 rounded-md flex items-center justify-center disabled:opacity-20 transition-opacity hover:opacity-60">
                        <ArrowDown className="w-3 h-3" style={{ color: "var(--t-muted)" }} />
                      </button>
                    </div>

                    {/* Remove */}
                    <button onClick={() => removeTest(i)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-opacity hover:opacity-70">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Additional vials line — shown once for the whole pool when qty > 1 */}
              {extraVialTotal > 0 && (
                <div className="flex items-center justify-between px-3 py-2 rounded-xl"
                  style={{ background: "var(--t-blue-06)", border: "1px dashed var(--t-blue)" }}>
                  <span className="text-xs font-medium" style={{ color: "var(--t-blue)" }}>
                    Additional vials ({vialAmount - 1}×) · +${EXTRA_VIAL} each
                  </span>
                  <span className="text-sm font-bold" style={{ color: "var(--t-blue)" }}>+${extraVialTotal.toFixed(0)}</span>
                </div>
              )}

              {/* Total */}
              <div className="mt-1 flex items-center justify-between px-3 py-2.5 rounded-xl"
                style={{ background: "var(--t-bg)", border: "1px solid var(--t-border)" }}>
                <span className="text-xs font-medium" style={{ color: "var(--t-muted)" }}>Total target</span>
                <span className="text-base font-bold" style={{ color: "var(--t-text)" }}>${target.toFixed(2)}</span>
              </div>
            </section>
          )}

          {/* ── Funding behaviour ── */}
          <section>
            <p className={SECTION_LABEL}>When Target is Reached</p>
            <div className="space-y-2">
              {/* Stop on funded */}
              <button
                onClick={() => {
                  const next = !stopOnFunded;
                  setStopOnFunded(next);
                  if (next) setOverflowEnabled(false);
                }}
                className="w-full flex items-center gap-3 p-4 rounded-xl transition-all text-left"
                style={{
                  border: `2px solid ${stopOnFunded ? "var(--t-blue)" : "var(--t-border)"}`,
                  background: stopOnFunded ? "var(--t-blue-06)" : "var(--t-surface)",
                }}
              >
                {stopOnFunded
                  ? <ToggleRight className="w-5 h-5 shrink-0" style={{ color: "var(--t-blue)" }} />
                  : <ToggleLeft className="w-5 h-5 shrink-0" style={{ color: "var(--t-muted)", opacity: 0.5 }} />
                }
                <div>
                  <p className="text-sm font-semibold" style={{ color: stopOnFunded ? "var(--t-blue)" : "var(--t-text)" }}>
                    Stop contributions once funded
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--t-muted)" }}>
                    No new contributions are accepted once the target amount is reached
                  </p>
                </div>
              </button>

              {/* Overflow — disabled when stop-on-funded is on */}
              <button
                disabled={stopOnFunded}
                onClick={() => { if (!stopOnFunded) setOverflowEnabled(o => !o); }}
                className="w-full flex items-center gap-3 p-4 rounded-xl transition-all text-left"
                style={{
                  border: `2px solid ${overflowEnabled ? "var(--t-blue)" : "var(--t-border)"}`,
                  background: overflowEnabled ? "var(--t-blue-06)" : "var(--t-surface)",
                  opacity: stopOnFunded ? 0.4 : 1,
                  cursor: stopOnFunded ? "not-allowed" : "pointer",
                }}
              >
                {overflowEnabled
                  ? <ToggleRight className="w-5 h-5 shrink-0" style={{ color: "var(--t-blue)" }} />
                  : <ToggleLeft className="w-5 h-5 shrink-0" style={{ color: "var(--t-muted)", opacity: 0.5 }} />
                }
                <div>
                  <p className="text-sm font-semibold" style={{ color: overflowEnabled ? "var(--t-blue)" : "var(--t-text)" }}>
                    Allow overflow into additional tests
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--t-muted)" }}>
                    {stopOnFunded
                      ? "Unavailable — disable 'Stop contributions once funded' first"
                      : "When fully funded, contributors can choose to fund more tests in priority order"}
                  </p>
                </div>
              </button>
            </div>
          </section>

          {/* ── Contributor Add-ons ── */}
          <section>
            <p className={SECTION_LABEL}>Contributor Add-ons</p>
            <button
              onClick={() => setNamedReportEnabled(o => !o)}
              className="w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left"
              style={{
                borderColor: namedReportEnabled ? "#8B5CF6" : "var(--t-border)",
                background: namedReportEnabled ? "rgba(139,92,246,0.06)" : "var(--t-surface)",
              }}
            >
              {namedReportEnabled
                ? <ToggleRight className="w-5 h-5 shrink-0" style={{ color: "#8B5CF6" }} />
                : <ToggleLeft className="w-5 h-5 shrink-0" style={{ color: "var(--t-muted)", opacity: 0.5 }} />
              }
              <div>
                <p className="text-sm font-semibold" style={{ color: namedReportEnabled ? "#7C3AED" : "var(--t-text)" }}>
                  Additional named report <span className="font-bold text-emerald-600">+$30.00</span>
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--t-muted)" }}>
                  Enable this so contributors can opt-in at checkout. The $30 is paid separately to Janoshik — not part of the pool total.
                </p>
              </div>
            </button>
            {namedReportEnabled && (
              <div className="mt-2">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--t-muted)" }}>Named Report Cap (blank = unlimited)</p>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={namedReportCap}
                  onChange={e => setNamedReportCap(e.target.value)}
                  placeholder="e.g. 10"
                  className={INPUT_CLS}
                  style={INPUT_STYLE}
                />
              </div>
            )}
          </section>

          {/* ── Payment Methods ── */}
          <section className="space-y-3">
            <div>
              <p className={SECTION_LABEL}>Payment Methods</p>
              <p className="text-[11px]" style={{ color: "var(--t-muted)" }}>At least one required — contributors will pay you directly.</p>
            </div>

            {/* Crypto */}
            <div className="space-y-2 rounded-xl p-3" style={{ border: "1px solid var(--t-border)", background: "var(--t-bg)" }}>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--t-muted)" }}>💎 Crypto</p>
              <input value={walletAddress} onChange={e => { setWalletAddress(e.target.value); setWalletAddressError(""); }}
                placeholder="Wallet address (0x… or bc1…)"
                className={INPUT_CLS + " font-mono"} style={INPUT_STYLE} />
              {walletAddressError && (
                <p className="text-[11px] font-medium" style={{ color: "#ef4444" }}>{walletAddressError}</p>
              )}
              {walletAddress && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] mb-1" style={{ color: "var(--t-muted)" }}>Currency</p>
                    <select value={walletCurrency} onChange={e => setWalletCurrency(e.target.value)}
                      className={INPUT_CLS} style={INPUT_STYLE}>
                      <option>USDT</option><option>ETH</option><option>BTC</option><option>XMR</option>
                    </select>
                  </div>
                  <div>
                    <p className="text-[10px] mb-1" style={{ color: "var(--t-muted)" }}>Network</p>
                    <select value={walletNetwork} onChange={e => setWalletNetwork(e.target.value)}
                      className={INPUT_CLS} style={INPUT_STYLE}>
                      <option>ERC-20</option><option>BEP-20</option><option>Mainnet</option><option>TRC-20</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* AnonPay */}
            <div className="space-y-2 rounded-xl p-3" style={{ border: "1px solid var(--t-border)", background: "var(--t-bg)" }}>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--t-muted)" }}>🕵️ AnonPay (Trocador)</p>
              <input value={anonpayWallet} onChange={e => { setAnonpayWallet(e.target.value); setAnonpayWalletError(""); }}
                placeholder="Receiving wallet address — leave blank to skip"
                className={INPUT_CLS + " font-mono"} style={INPUT_STYLE} />
              {anonpayWalletError && (
                <p className="text-[11px] font-medium" style={{ color: "#ef4444" }}>{anonpayWalletError}</p>
              )}
              {anonpayWallet && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] mb-1" style={{ color: "var(--t-muted)" }}>Ticker</p>
                    <select value={anonpayTicker} onChange={e => setAnonpayTicker(e.target.value)}
                      className={INPUT_CLS} style={INPUT_STYLE}>
                      <option value="XMR">XMR</option><option value="BTC">BTC</option>
                      <option value="ETH">ETH</option><option value="USDT">USDT</option>
                    </select>
                  </div>
                  <div>
                    <p className="text-[10px] mb-1" style={{ color: "var(--t-muted)" }}>Network</p>
                    <select value={anonpayNetwork} onChange={e => setAnonpayNetwork(e.target.value)}
                      className={INPUT_CLS} style={INPUT_STYLE}>
                      <option value="Monero">Monero</option><option value="Bitcoin">Bitcoin</option>
                      <option value="Ethereum">Ethereum</option><option value="ERC-20">ERC-20</option>
                      <option value="TRC-20">TRC-20</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Revolut */}
            <div className="rounded-xl p-3" style={{ border: "1px solid var(--t-border)", background: "var(--t-bg)" }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--t-muted)" }}>🔵 Revolut</p>
              <input value={revolutHandle} onChange={e => setRevolutHandle(e.target.value)}
                placeholder="Revolut username or @handle (optional)"
                className={INPUT_CLS} style={INPUT_STYLE} />
            </div>

            {/* PayPal */}
            <div className="rounded-xl p-3" style={{ border: "1px solid var(--t-border)", background: "var(--t-bg)" }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--t-muted)" }}>🅿️ PayPal</p>
              <input value={paypalEmail} onChange={e => setPaypalEmail(e.target.value)}
                placeholder="PayPal email (optional)"
                className={INPUT_CLS} style={INPUT_STYLE} />
            </div>

            {/* Janoshik */}
            <div className="rounded-xl p-3" style={{ border: "1px solid var(--t-border)", background: "var(--t-bg)" }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--t-muted)" }}>🔬 Janoshik</p>
              <input value={janoshikUrl} onChange={e => setJanoshikUrl(e.target.value)}
                placeholder="Janoshik payment URL (optional)"
                className={INPUT_CLS} style={INPUT_STYLE} />
            </div>
          </section>

          {/* ── Pool Settings ── */}
          <section>
            <p className={SECTION_LABEL}>Additional Settings</p>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 rounded-xl cursor-pointer" style={{ border: "1px solid var(--t-border)", background: "var(--t-bg)" }}>
                <input type="checkbox" checked={allowVialContribution} onChange={e => setAllowVialContribution(e.target.checked)} className="rounded" />
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Allow vial contribution</p>
                  <p className="text-[11px]" style={{ color: "var(--t-muted)" }}>Contributors can donate extra vials for testing</p>
                </div>
              </label>
              <div>
                <label className="block text-[11px] font-semibold mb-1" style={{ color: "var(--t-muted)" }}>Page message (shown at top of pool page)</label>
                <textarea value={pageMessage} onChange={e => setPageMessage(e.target.value)}
                  rows={2} placeholder="Optional message for contributors…"
                  className={INPUT_CLS + " resize-none"} style={INPUT_STYLE} />
              </div>
            </div>
          </section>

          {/* ── Opt-in Fee ── */}
          <section>
            <p className={SECTION_LABEL}>Opt-in Fee</p>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setFixedFeeEnabled(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all"
                style={{
                  border: `2px solid ${!fixedFeeEnabled ? "var(--t-blue)" : "var(--t-border)"}`,
                  background: !fixedFeeEnabled ? "var(--t-blue-06)" : "var(--t-surface)",
                  color: !fixedFeeEnabled ? "var(--t-blue)" : "var(--t-muted)",
                }}
              >
                Any amount
              </button>
              <button
                type="button"
                onClick={() => setFixedFeeEnabled(true)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all"
                style={{
                  border: `2px solid ${fixedFeeEnabled ? "var(--t-blue)" : "var(--t-border)"}`,
                  background: fixedFeeEnabled ? "var(--t-blue-06)" : "var(--t-surface)",
                  color: fixedFeeEnabled ? "var(--t-blue)" : "var(--t-muted)",
                }}
              >
                Fixed fee
              </button>
            </div>
            {fixedFeeEnabled ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold" style={{ color: "var(--t-muted)" }}>$</span>
                <input
                  type="number" min={1} step="0.01"
                  value={fixedFeeValue}
                  onChange={e => setFixedFeeValue(e.target.value)}
                  placeholder="e.g. 25.00"
                  className={INPUT_CLS}
                  style={INPUT_STYLE}
                />
              </div>
            ) : (
              <p className="text-xs" style={{ color: "var(--t-muted)" }}>
                Contributors enter their own amount when opting in.
              </p>
            )}
          </section>

          {/* ── Pool Settings ── */}
          <section>
            <p className={SECTION_LABEL}>Pool Settings</p>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs">
                <span className="font-medium text-[11px] block mb-1.5" style={{ color: "var(--t-muted)" }}>Voting mode</span>
                <select value={votingMode}
                  onChange={e => setVotingMode(e.target.value === "vote" ? "vote" : "leader_decides")}
                  className={INPUT_CLS + " cursor-pointer"} style={INPUT_STYLE}>
                  <option value="leader_decides">Leader decides</option>
                  <option value="vote">Contributor vote</option>
                </select>
              </label>
              <label className="block text-xs">
                <span className="font-medium text-[11px] block mb-1.5" style={{ color: "var(--t-muted)" }}>Results password (optional)</span>
                <input value={resultsPassword} onChange={e => setResultsPassword(e.target.value)}
                  placeholder="Leave blank for public" className={INPUT_CLS} style={INPUT_STYLE} />
              </label>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="px-6 py-4" style={{ borderTop: "1px solid var(--t-border)", background: "var(--t-bg)" }}>
          <button onClick={submit} disabled={submitting}
            className="w-full h-11 rounded-xl text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
            style={{ background: "var(--t-blue)" }}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>
              <Plus className="w-4 h-4" /> Create Pool (as draft)
            </>}
          </button>
        </div>

      </div>
    </div>
  );
}

// ─── Edit Pool Modal ──────────────────────────────────────────────────────────

function EditPoolModal({
  pool,
  leaderStatus,
  onClose,
  onSuccess,
}: {
  pool: LeaderPool;
  leaderStatus: LeaderStatus;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [title, setTitle] = useState(pool.title);
  const [compoundName, setCompoundName] = useState(pool.compoundName ?? "");
  const [manufacturer, setManufacturer] = useState(pool.manufacturer ?? "");
  const [description, setDescription] = useState(pool.description ?? "");
  const [namedReportEnabled, setNamedReportEnabled] = useState(pool.contributorNamedReportEnabled);
  const [allowVialContribution, setAllowVialContribution] = useState((pool as any).allowVialContribution ?? false);
  const [pageMessage, setPageMessage] = useState((pool as any).pageMessage ?? "");
  const existingJanoshik = pool.paymentMethods.find((m: any) => m.type === "janoshik");
  const [janoshikUrl, setJanoshikUrl] = useState<string>((existingJanoshik as any)?.url ?? "");

  const defaultTypes = () => pool.paymentMethods.map(m => m.type);
  const [selectedPaymentTypes, setSelectedPaymentTypes] = useState<string[]>(defaultTypes);
  const togglePaymentType = (type: string) => {
    setSelectedPaymentTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };

  const hasFixed = pool.fixedOptInFeeUsd != null;
  const [fixedFeeEnabled, setFixedFeeEnabled] = useState(hasFixed);
  const [fixedFeeValue, setFixedFeeValue] = useState(pool.fixedOptInFeeUsd != null ? String(pool.fixedOptInFeeUsd) : "");

  // Per-pool AnonPay settings
  const existingAnonpay = pool.paymentMethods.find(m => m.type === "anonpay");
  const [anonpayEnabled, setAnonpayEnabled] = useState(!!existingAnonpay);
  const [anonpayWallet, setAnonpayWallet] = useState<string>(existingAnonpay?.wallet ?? leaderStatus.anonpayWallet ?? "");
  const [anonpayCoin, setAnonpayCoin] = useState<string>(
    `${existingAnonpay?.ticker ?? leaderStatus.anonpayTicker ?? "XMR"}|${existingAnonpay?.network ?? leaderStatus.anonpayNetwork ?? "Monero"}`
  );
  const [anonpaySaving, setAnonpaySaving] = useState(false);

  const saveAnonpay = async () => {
    if (anonpayEnabled && !anonpayWallet.trim()) {
      toast({ title: "Enter a wallet address", variant: "destructive" }); return;
    }
    setAnonpaySaving(true);
    try {
      const withoutAnonpay = pool.paymentMethods.filter(m => m.type !== "anonpay");
      let newMethods = withoutAnonpay;
      if (anonpayEnabled && anonpayWallet.trim()) {
        const [ticker, network] = anonpayCoin.split("|");
        newMethods = [...withoutAnonpay, { type: "anonpay", wallet: anonpayWallet.trim(), ticker, network }];
      }
      const r = await fetch(`/api/account/pool-leader/pools/${pool.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethods: newMethods }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? "Failed");
      qc.invalidateQueries({ queryKey: ["/api/account/pool-leader/pools"] });
      toast({ title: "AnonPay settings saved" });
    } catch (e: any) {
      toast({ title: "Could not save AnonPay", description: e.message, variant: "destructive" });
    } finally {
      setAnonpaySaving(false);
    }
  };

  const [submitting, setSubmitting] = useState(false);

  // Build updated payment methods — leader profile takes priority, falls back to
  // pool's existing methods so addresses set at creation are preserved.
  const buildUpdatedPaymentMethods = () => {
    const all: Array<{ type: string; [k: string]: any }> = [];
    const poolCrypto = pool.paymentMethods.find(m => m.type === "crypto");
    const cryptoAddr = leaderStatus.wallet ?? poolCrypto?.address ?? null;
    if (cryptoAddr) all.push({ type: "crypto", currency: leaderStatus.walletCurrency ?? poolCrypto?.currency ?? "USDT", network: leaderStatus.walletNetwork ?? poolCrypto?.network ?? "ERC-20", address: cryptoAddr });
    const poolAnonpay = pool.paymentMethods.find(m => m.type === "anonpay");
    const anonAddr = leaderStatus.anonpayWallet ?? poolAnonpay?.wallet ?? null;
    if (anonAddr) all.push({ type: "anonpay", wallet: anonAddr, ticker: leaderStatus.anonpayTicker ?? poolAnonpay?.ticker ?? "XMR", network: leaderStatus.anonpayNetwork ?? poolAnonpay?.network ?? "Monero" });
    const poolRevolut = pool.paymentMethods.find(m => m.type === "revolut");
    const revHandle = leaderStatus.revolutHandle ?? poolRevolut?.handle ?? null;
    if (revHandle) all.push({ type: "revolut", handle: revHandle });
    const poolPaypal = pool.paymentMethods.find(m => m.type === "paypal");
    const ppEmail = leaderStatus.paypalEmail ?? poolPaypal?.email ?? null;
    if (ppEmail) all.push({ type: "paypal", email: ppEmail });
    if (janoshikUrl.trim()) all.push({ type: "janoshik", url: janoshikUrl.trim() });
    return all.filter(m => selectedPaymentTypes.includes(m.type) || m.type === "janoshik");
  };

  const submit = async () => {
    if (!title.trim()) { toast({ title: "Title required", variant: "destructive" }); return; }
    if (selectedPaymentTypes.length === 0) { toast({ title: "Select at least one payment method", variant: "destructive" }); return; }
    if (fixedFeeEnabled && (!fixedFeeValue || isNaN(parseFloat(fixedFeeValue)))) {
      toast({ title: "Enter a valid fixed fee", variant: "destructive" }); return;
    }
    setSubmitting(true);
    try {
      const r = await fetch(`/api/account/pool-leader/pools/${pool.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          compoundName: compoundName.trim(),
          manufacturer: manufacturer.trim(),
          contributorNamedReportEnabled: namedReportEnabled,
          namedReportCap: namedReportEnabled && namedReportCap ? parseInt(namedReportCap, 10) : null,
          allowVialContribution,
          pageMessage: pageMessage || null,
          paymentMethods: buildUpdatedPaymentMethods(),
          fixedOptInFeeUsd: fixedFeeEnabled && fixedFeeValue ? parseFloat(fixedFeeValue) : null,
        }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? "Failed");
      qc.invalidateQueries({ queryKey: ["/api/account/pool-leader/pools"] });
      onSuccess();
    } catch (e: any) {
      toast({ title: "Could not save", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="rounded-2xl max-w-xl w-full my-8 shadow-2xl overflow-hidden"
        style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>

        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--t-border)" }}>
          <div>
            <h3 className="text-base font-bold" style={{ color: "var(--t-text)" }}>Edit Pool Details</h3>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--t-muted)" }}>Update pool info, payment methods, and settings</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center transition-opacity hover:opacity-60"
            style={{ background: "var(--t-bg)" }}>
            <X className="w-4 h-4" style={{ color: "var(--t-muted)" }} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[80vh] overflow-y-auto">
          <section className="space-y-3">
            <p className={SECTION_LABEL}>Pool Details</p>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Pool title" className={INPUT_CLS} style={INPUT_STYLE} />
            <input value={compoundName} onChange={e => setCompoundName(e.target.value)}
              placeholder="Compound name" className={INPUT_CLS} style={INPUT_STYLE} />
            <input value={manufacturer} onChange={e => setManufacturer(e.target.value)}
              placeholder="Manufacturer / source" className={INPUT_CLS} style={INPUT_STYLE} />
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              rows={2} placeholder="Description (optional)"
              className={INPUT_CLS + " resize-none"} style={INPUT_STYLE} />
          </section>

          <section>
            <p className={SECTION_LABEL}>Contributor Add-ons</p>
            <button
              onClick={() => setNamedReportEnabled(o => !o)}
              className="w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left"
              style={{
                borderColor: namedReportEnabled ? "#8B5CF6" : "var(--t-border)",
                background: namedReportEnabled ? "rgba(139,92,246,0.06)" : "var(--t-surface)",
              }}
            >
              {namedReportEnabled
                ? <ToggleRight className="w-5 h-5 shrink-0" style={{ color: "#8B5CF6" }} />
                : <ToggleLeft className="w-5 h-5 shrink-0" style={{ color: "var(--t-muted)", opacity: 0.5 }} />
              }
              <div>
                <p className="text-sm font-semibold" style={{ color: namedReportEnabled ? "#7C3AED" : "var(--t-text)" }}>
                  Additional named report <span className="font-bold text-emerald-600">+$30.00</span>
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--t-muted)" }}>
                  Contributors can opt-in and pay $30 extra to have their own name on the report.
                </p>
              </div>
            </button>
          </section>

          <section>
            <p className={SECTION_LABEL}>Payment Methods</p>
            <PaymentMethodPicker
              leaderStatus={leaderStatus}
              selectedTypes={selectedPaymentTypes}
              onToggle={togglePaymentType}
              poolMethods={pool.paymentMethods}
            />
            <div className="rounded-xl p-3 mt-3" style={{ border: "1px solid var(--t-border)", background: "var(--t-bg)" }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--t-muted)" }}>🔬 Janoshik URL</p>
              <input value={janoshikUrl} onChange={e => setJanoshikUrl(e.target.value)}
                placeholder="Janoshik payment URL (leave blank to remove)"
                className={INPUT_CLS} style={INPUT_STYLE} />
            </div>
          </section>

          <section>
            <p className={SECTION_LABEL}>Additional Settings</p>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 rounded-xl cursor-pointer" style={{ border: "1px solid var(--t-border)", background: "var(--t-bg)" }}>
                <input type="checkbox" checked={allowVialContribution} onChange={e => setAllowVialContribution(e.target.checked)} className="rounded" />
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Allow vial contribution</p>
                  <p className="text-[11px]" style={{ color: "var(--t-muted)" }}>Contributors can donate extra vials for testing</p>
                </div>
              </label>
              <div>
                <label className="block text-[11px] font-semibold mb-1" style={{ color: "var(--t-muted)" }}>Page message</label>
                <textarea value={pageMessage} onChange={e => setPageMessage(e.target.value)}
                  rows={2} placeholder="Optional message shown at top of pool page…"
                  className={INPUT_CLS + " resize-none"} style={INPUT_STYLE} />
              </div>
            </div>
          </section>

          {/* Trocador AnonPay per-pool configuration */}
          <section className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--t-border)" }}>
            <div className="px-5 pt-5 pb-4 space-y-4">
              <div>
                <h4 className="text-sm font-bold" style={{ color: "var(--t-text)" }}>Trocador AnonPay</h4>
                <p className="text-[11px] mt-1" style={{ color: "var(--t-muted)" }}>
                  Enable to let members pay anonymously via Trocador's AnonPay (Monero, Bitcoin, etc.).
                </p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Enable AnonPay for this group buy</p>
                <button
                  type="button"
                  onClick={() => setAnonpayEnabled(o => !o)}
                  className="relative w-11 h-6 rounded-full transition-colors shrink-0"
                  style={{ background: anonpayEnabled ? "var(--t-blue)" : "var(--t-border)" }}
                >
                  <span
                    className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                    style={{ transform: anonpayEnabled ? "translateX(20px)" : "translateX(0)" }}
                  />
                </button>
              </div>
              {anonpayEnabled && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold tracking-widest uppercase flex items-center gap-1.5 mb-1.5" style={{ color: "var(--t-muted)" }}>
                      <Wallet className="w-3 h-3" /> Anonpay Wallet Address
                    </label>
                    <input
                      value={anonpayWallet}
                      onChange={e => setAnonpayWallet(e.target.value)}
                      placeholder="e.g. XMR address"
                      className={INPUT_CLS}
                      style={INPUT_STYLE}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold tracking-widest uppercase flex items-center gap-1.5 mb-1.5" style={{ color: "var(--t-muted)" }}>
                      <DollarSign className="w-3 h-3" /> Coin & Network
                    </label>
                    <select
                      value={anonpayCoin}
                      onChange={e => setAnonpayCoin(e.target.value)}
                      className={INPUT_CLS}
                      style={INPUT_STYLE}
                    >
                      {TROCADOR_COINS.map(c => (
                        <option key={c.label} value={`${c.ticker}|${c.network}`}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
            <div className="px-5 pb-5">
              <button
                type="button"
                onClick={saveAnonpay}
                disabled={anonpaySaving}
                className="h-10 px-5 rounded-xl text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50 transition-opacity hover:opacity-90"
                style={{ background: "var(--t-blue)" }}
              >
                {anonpaySaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Save Payment Details
              </button>
            </div>
          </section>

          <section>
            <p className={SECTION_LABEL}>Opt-in Fee</p>
            <div className="flex gap-2 mb-2">
              <button type="button" onClick={() => setFixedFeeEnabled(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all"
                style={{ border: `2px solid ${!fixedFeeEnabled ? "var(--t-blue)" : "var(--t-border)"}`, background: !fixedFeeEnabled ? "var(--t-blue-06)" : "var(--t-surface)", color: !fixedFeeEnabled ? "var(--t-blue)" : "var(--t-muted)" }}>
                Any amount
              </button>
              <button type="button" onClick={() => setFixedFeeEnabled(true)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all"
                style={{ border: `2px solid ${fixedFeeEnabled ? "var(--t-blue)" : "var(--t-border)"}`, background: fixedFeeEnabled ? "var(--t-blue-06)" : "var(--t-surface)", color: fixedFeeEnabled ? "var(--t-blue)" : "var(--t-muted)" }}>
                Fixed fee
              </button>
            </div>
            {fixedFeeEnabled && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold" style={{ color: "var(--t-muted)" }}>$</span>
                <input type="number" min={1} step="0.01" value={fixedFeeValue}
                  onChange={e => setFixedFeeValue(e.target.value)}
                  placeholder="e.g. 25.00" className={INPUT_CLS} style={INPUT_STYLE} />
              </div>
            )}
          </section>
        </div>

        <div className="px-6 py-4" style={{ borderTop: "1px solid var(--t-border)", background: "var(--t-bg)" }}>
          <button onClick={submit} disabled={submitting}
            className="w-full h-11 rounded-xl text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
            style={{ background: "var(--t-blue)" }}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>
              <Pencil className="w-4 h-4" /> Save Changes
            </>}
          </button>
        </div>
      </div>
    </div>
  );
}
