import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2, Check, X, Trash2, Plus, Eye, EyeOff,
  ChevronDown, ChevronUp, Users, FlaskConical, FileText, MessageSquare, ExternalLink,
  Pencil, Save, TestTube, Award, BookOpen, ShieldCheck, UserCog,
  BarChart3, TrendingUp, DollarSign, Vote, AlertCircle, CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Brand tokens ──────────────────────────────────────────────────────────────
const NAVY = "#1B3A7A";
const BRAND_BLUE = "#2D6BCC";
const GRADIENT = "linear-gradient(135deg, #2D6BCC 0%, #1B3A7A 100%)";
const CARD_BORDER = "rgba(27,58,122,0.12)";
const PRIMARY_TEXT = "#0F1F38";
const MUTED = "#6B7280";
const LABEL = "#8A9AAA";

// ─── Types ─────────────────────────────────────────────────────────────────────
type Application = {
  telegramUsername: string;
  email: string | null;
  status: string;
  bio: string | null;
  wallet: string | null;
  walletCurrency: string | null;
  walletNetwork: string | null;
  appliedAt: string | null;
};

type AdminPool = {
  id: string;
  slug: string;
  title: string;
  leaderUsername: string;
  status: string;
  approvalStatus: string;
  hiddenFromList: boolean;
  targetAmountUsd: number;
  raisedUsd: number;
  contributorCount: number;
  pendingCount: number;
};

type PaymentMethod = {
  type: string;
  currency?: string;
  network?: string;
  address?: string;
  email?: string;
  handle?: string;
  wallet?: string;
  ticker?: string;
};

type PoolDetail = AdminPool & {
  description: string | null;
  compoundName: string | null;
  manufacturer: string | null;
  batchNumber: string | null;
  capColor: string | null;
  mgSize: string | null;
  manufacturingDate: string | null;
  imageUrl: string | null;
  resultNotes: string | null;
  resultPdfUrl: string | null;
  resultPostedAt: string | null;
  votingMode: string | null;
  contributorNamedReportEnabled: boolean | null;
  stopOnFunded: boolean | null;
  allowVialContribution: boolean | null;
  namedReportCap: number | null;
  pageMessage: string | null;
  fixedOptInFeeUsd: string | null;
  paymentMethods: PaymentMethod[];
  tests: Array<{
    id: string; code: string; name: string; unitPriceUsd: number; quantity: number; selected: boolean;
    catalogId: string | null; contributionStatus: string;
  }>;
  participants: Array<{
    id: string; accountUsername: string | null; contactEmail: string | null; contactTelegram: string | null;
    displayName: string | null; amountUsd: number; paymentStatus: string; paymentTxHash: string | null;
    paymentCurrency: string | null; paymentNetwork: string | null; notes: string | null;
    paymentMethod: string | null; paymentScreenshotUrl: string | null;
    namedReportOptIn: boolean | null; namedReportName: string | null; canProvideVial: boolean | null;
    paymentSubmittedAt: string | null; paymentVerifiedAt: string | null; createdAt: string;
  }>;
  results: Array<{
    id: number; poolTestId: string; resultText: string | null; resultPdfUrl: string | null; passed: boolean | null;
  }>;
  messages: Array<{
    id: string; leaderUsername: string; message: string; createdAt: string;
  }>;
};

type CatalogEntry = {
  id: string; code: string; name: string; labName: string | null; description: string | null;
  defaultPriceUsd: number; unitLabel: string; sortOrder: number; active: boolean;
  category: string; analysisSection: string | null;
};

type PoolFormState = {
  title: string;
  leaderUsername: string;
  description: string;
  compoundName: string;
  manufacturer: string;
  batchNumber: string;
  capColor: string;
  mgSize: string;
  manufacturingDate: string;
  imageUrl: string;
  status: string;
  approvalStatus: string;
  votingMode: string;
  resultNotes: string;
  resultPdfUrl: string;
  fixedOptInFeeUsd: string;
  contributorNamedReportEnabled: boolean;
  stopOnFunded: boolean;
  allowVialContribution: boolean;
  namedReportCap: string;
  pageMessage: string;
  resultsPassword: string;
  walletAddress: string;
  walletCurrency: string;
  walletNetwork: string;
  anonpayWallet: string;
  anonpayTicker: string;
  anonpayNetwork: string;
  revolutHandle: string;
  paypalEmail: string;
  janoshikUrl: string;
};

const BLANK_FORM: PoolFormState = {
  title: "", leaderUsername: "", description: "", compoundName: "", manufacturer: "", batchNumber: "",
  capColor: "", mgSize: "", manufacturingDate: "", imageUrl: "",
  status: "draft", approvalStatus: "approved", votingMode: "leader_decides",
  resultNotes: "", resultPdfUrl: "", fixedOptInFeeUsd: "",
  contributorNamedReportEnabled: false, stopOnFunded: false,
  allowVialContribution: false, namedReportCap: "", pageMessage: "",
  resultsPassword: "",
  walletAddress: "", walletCurrency: "USDT", walletNetwork: "ERC-20",
  anonpayWallet: "", anonpayTicker: "XMR", anonpayNetwork: "Monero",
  revolutHandle: "", paypalEmail: "", janoshikUrl: "",
};

const CATEGORY_LABELS: Record<string, string> = { analysis: "Analysis", single: "Single Test", addon: "Add-on" };
const SECTION_LABELS: Record<string, string> = { compound: "Compound", extra: "Extra", variance: "Variance" };

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

// ─── Status helpers ─────────────────────────────────────────────────────────────
function StatusPill({ label, color }: { label: string; color: "blue" | "green" | "amber" | "red" | "slate" | "purple" }) {
  const map: Record<string, string> = {
    blue:   "background:rgba(45,107,204,0.12);color:#2D6BCC;",
    green:  "background:rgba(34,197,94,0.12);color:#16a34a;",
    amber:  "background:rgba(233,160,32,0.12);color:#b45309;",
    red:    "background:rgba(239,68,68,0.12);color:#dc2626;",
    slate:  "background:rgba(148,163,184,0.15);color:#64748b;",
    purple: "background:rgba(139,92,246,0.12);color:#7c3aed;",
  };
  const cls = "text-[10px] font-bold px-2 py-0.5 rounded-full capitalize";
  const s = map[color] || map.slate;
  const parsed: Record<string, string> = {};
  s.split(";").filter(Boolean).forEach(part => {
    const [k, v] = part.split(":");
    if (k && v) parsed[k.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v.trim();
  });
  return <span className={cls} style={parsed as any}>{label}</span>;
}

function poolStatusColor(s: string): "blue" | "green" | "amber" | "red" | "slate" | "purple" {
  if (s === "open") return "blue";
  if (s === "results_received" || s === "funded") return "green";
  if (s === "sent_to_lab") return "purple";
  if (s === "cancelled") return "red";
  if (s === "closed") return "slate";
  return "slate";
}

function approvalColor(s: string): "blue" | "green" | "amber" | "red" | "slate" | "purple" {
  if (s === "approved") return "green";
  if (s === "rejected") return "red";
  return "amber";
}

// ─── AnonPay supported coins ────────────────────────────────────────────────────
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

// ─── Shared input styles ────────────────────────────────────────────────────────
const inp = `px-2.5 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#2D6BCC]/30`;
const inpStyle = { borderColor: CARD_BORDER, background: "#F8FAFC", color: PRIMARY_TEXT };
const sel = inp + " bg-[#F8FAFC]";

const I = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props} className={inp + " " + (props.className ?? "")} style={inpStyle} />
);
const T = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...props} className={inp + " resize-none " + (props.className ?? "")} style={inpStyle} />
);
const S = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...props} className={sel + " " + (props.className ?? "")} style={inpStyle} />
);

// ─── FormField ──────────────────────────────────────────────────────────────────
const FormField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="flex flex-col gap-1">
    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: LABEL }}>{label}</span>
    {children}
  </label>
);

// ─── BrandBtn ───────────────────────────────────────────────────────────────────
function BrandBtn({ onClick, disabled, children, variant = "primary", size = "sm" }: {
  onClick?: () => void; disabled?: boolean; children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "xs" | "sm";
}) {
  const pad = size === "xs" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1.5 text-xs";
  const base = `inline-flex items-center gap-1.5 font-semibold rounded-lg transition-all disabled:opacity-50 ${pad}`;
  if (variant === "primary")   return <button onClick={onClick} disabled={disabled} className={base} style={{ background: NAVY, color: "#fff" }}>{children}</button>;
  if (variant === "danger")    return <button onClick={onClick} disabled={disabled} className={base} style={{ background: "#ef4444", color: "#fff" }}>{children}</button>;
  if (variant === "secondary") return <button onClick={onClick} disabled={disabled} className={base} style={{ background: "rgba(45,107,204,0.1)", color: BRAND_BLUE, border: `1px solid rgba(45,107,204,0.2)` }}>{children}</button>;
  return <button onClick={onClick} disabled={disabled} className={base} style={{ background: "transparent", color: MUTED, border: `1px solid ${CARD_BORDER}` }}>{children}</button>;
}

// ─── Section card ───────────────────────────────────────────────────────────────
function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border ${className ?? ""}`} style={{ borderColor: CARD_BORDER }}>
      {children}
    </div>
  );
}

// ─── Participants ───────────────────────────────────────────────────────────────
type Participant = PoolDetail["participants"][number];
type PoolPM = PoolDetail["paymentMethods"][number];

const PAY_STATUS_COLOR: Record<string, string> = {
  pending:   "background:rgba(148,163,184,0.15);color:#64748b;",
  submitted: "background:rgba(233,160,32,0.12);color:#b45309;",
  verified:  "background:rgba(34,197,94,0.12);color:#16a34a;",
  rejected:  "background:rgba(239,68,68,0.12);color:#dc2626;",
  refunded:  "background:rgba(148,163,184,0.15);color:#64748b;",
};

function resolveDestination(method: string | null, pms: PoolPM[]): string | null {
  if (!method) return null;
  const pm = pms.find(m => m.type === method);
  if (!pm) return null;
  if (pm.type === "crypto") return `${pm.currency} · ${pm.network} · ${pm.address}`;
  if (pm.type === "anonpay") return `${pm.ticker ?? "XMR"} · ${pm.network ?? "Monero"} · ${pm.wallet ?? pm.email ?? ""}`;
  if (pm.type === "revolut") return pm.handle ?? null;
  if (pm.type === "janoshik") return (pm as any).url ?? null;
  if (pm.type === "paypal") return pm.email ?? null;
  return null;
}

function ParticipantsPanel({ participants, poolPaymentMethods, poolId, headers }: { participants: Participant[]; poolPaymentMethods: PoolPM[]; poolId: string; headers: HeadersInit }) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const qc = useQueryClient();
  const { toast } = useToast();

  const setPaymentStatus = useMutation({
    mutationFn: async ({ participantId, status }: { participantId: string; status: string }) => {
      const r = await fetch(`/api/admin/testing-pools/participants/${participantId}/payment-status`, {
        method: "PATCH", headers: { ...(headers as Record<string, string>), "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: status }),
      });
      if (!r.ok) throw new Error("Failed");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/testing-pools/detail", poolId] }); toast({ title: "Payment status updated" }); },
    onError: () => toast({ title: "Failed to update status", variant: "destructive" }),
  });

  if (participants.length === 0) return <p className="text-xs italic text-center py-6" style={{ color: LABEL }}>No participants yet.</p>;
  return (
    <>
      {lightboxUrl && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
          <img src={lightboxUrl} alt="Payment screenshot" className="max-w-full max-h-[90vh] rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
          <button className="absolute top-4 right-4 text-white" onClick={() => setLightboxUrl(null)}><X className="w-6 h-6" /></button>
        </div>
      )}
      <div className="space-y-2">
        {participants.map(p => {
          const dest = resolveDestination(p.paymentMethod, poolPaymentMethods);
          const statusStyle: React.CSSProperties = {};
          const sc = PAY_STATUS_COLOR[p.paymentStatus] ?? PAY_STATUS_COLOR.pending;
          sc.split(";").filter(Boolean).forEach(part => {
            const [k, v] = part.split(":");
            if (k && v) (statusStyle as any)[k.trim().replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase())] = v.trim();
          });
          return (
            <div key={p.id} className="rounded-xl border p-3" style={{ borderColor: CARD_BORDER, background: "#F8FAFC" }}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold" style={{ color: PRIMARY_TEXT }}>
                    {p.displayName ?? p.accountUsername ?? p.contactTelegram ?? p.contactEmail ?? "Anonymous"}
                  </p>
                  <p className="text-[11px] font-mono mt-0.5" style={{ color: MUTED }}>
                    {p.contactEmail && <span>{p.contactEmail} · </span>}
                    {p.accountUsername && <span>@{p.accountUsername} · </span>}
                    Joined {fmt(p.createdAt)}
                  </p>
                </div>
                <div className="text-right shrink-0 space-y-1">
                  <p className="text-sm font-bold" style={{ color: NAVY }}>${p.amountUsd.toFixed(2)}</p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={statusStyle}>{p.paymentStatus}</span>
                  {p.paymentMethod && (
                    <span className="block text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(45,107,204,0.1)", color: BRAND_BLUE }}>{p.paymentMethod}</span>
                  )}
                </div>
              </div>
              {dest && <p className="text-[11px] font-mono mt-1.5 break-all" style={{ color: MUTED }}><span style={{ color: LABEL }}>Sent to: </span>{dest}</p>}
              {(p.paymentTxHash || p.paymentCurrency) && (
                <p className="text-[11px] font-mono mt-1 break-all" style={{ color: MUTED }}>
                  {p.paymentCurrency && <span>{p.paymentCurrency}{p.paymentNetwork ? ` (${p.paymentNetwork})` : ""} — </span>}
                  {p.paymentTxHash && <span>{p.paymentTxHash}</span>}
                </p>
              )}
              {p.paymentScreenshotUrl && (
                <button onClick={() => setLightboxUrl(p.paymentScreenshotUrl!)} className="mt-2 block rounded-lg overflow-hidden border hover:border-[#2D6BCC] transition-colors" style={{ borderColor: CARD_BORDER }} title="Click to view full screenshot">
                  <img src={p.paymentScreenshotUrl} alt="Payment screenshot" className="w-full max-h-24 object-cover object-top" />
                </button>
              )}
              {p.namedReportOptIn && <p className="text-[11px] font-semibold mt-1.5" style={{ color: BRAND_BLUE }}>📋 Named report: {p.namedReportName ?? "(no name provided)"}</p>}
              {p.canProvideVial && <p className="text-[11px] font-semibold" style={{ color: "#059669" }}>🧪 Can provide vial</p>}
              {p.paymentSubmittedAt && <p className="text-[10px] mt-0.5" style={{ color: LABEL }}>Submitted: {fmt(p.paymentSubmittedAt)}</p>}
              {p.paymentVerifiedAt && <p className="text-[10px]" style={{ color: LABEL }}>Verified: {fmt(p.paymentVerifiedAt)}</p>}
              {p.notes && <p className="text-xs mt-1.5 whitespace-pre-wrap border-t pt-1.5" style={{ color: MUTED, borderColor: CARD_BORDER }}>{p.notes}</p>}
              <div className="flex items-center gap-1.5 mt-2 pt-2 border-t flex-wrap" style={{ borderColor: CARD_BORDER }}>
                <span className="text-[10px] font-bold uppercase tracking-widest mr-1" style={{ color: LABEL }}>Payment:</span>
                {p.paymentStatus !== "verified" && (
                  <BrandBtn size="xs" variant="secondary" onClick={() => setPaymentStatus.mutate({ participantId: p.id, status: "verified" })} disabled={setPaymentStatus.isPending}>
                    <Check className="w-3 h-3" /> Mark Received
                  </BrandBtn>
                )}
                {p.paymentStatus !== "submitted" && (
                  <BrandBtn size="xs" variant="ghost" onClick={() => setPaymentStatus.mutate({ participantId: p.id, status: "submitted" })} disabled={setPaymentStatus.isPending}>
                    Mark Submitted
                  </BrandBtn>
                )}
                {p.paymentStatus !== "rejected" && (
                  <BrandBtn size="xs" variant="danger" onClick={() => setPaymentStatus.mutate({ participantId: p.id, status: "rejected" })} disabled={setPaymentStatus.isPending}>
                    <X className="w-3 h-3" /> Reject
                  </BrandBtn>
                )}
                {p.paymentStatus !== "pending" && (
                  <BrandBtn size="xs" variant="ghost" onClick={() => setPaymentStatus.mutate({ participantId: p.id, status: "pending" })} disabled={setPaymentStatus.isPending}>
                    Reset
                  </BrandBtn>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── PoolFormModal ──────────────────────────────────────────────────────────────
type ModalTest = { id?: string; code: string; name: string; unitPriceUsd: number; quantity: number; selected: boolean; catalogId: string | null };
type PerTestResult = { poolTestId: string; resultPdfUrl: string | null };

function PoolFormModal({
  title: modalTitle, initialForm, initialTests, initialResults, catalog, onClose, onSubmit, isPending,
}: {
  title: string;
  initialForm: PoolFormState;
  initialTests: ModalTest[];
  initialResults?: PerTestResult[];
  catalog: CatalogEntry[];
  onClose: () => void;
  onSubmit: (form: PoolFormState, tests: ModalTest[], perTestResults: Array<{poolTestId: string; resultPdfUrl: string}>, perTestJanoshikUrls: Record<string, string>) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState<PoolFormState>(initialForm);
  const [tests, setTests] = useState<ModalTest[]>(initialTests);
  const [perTestUrls, setPerTestUrls] = useState<Record<string, string>>({});
  const [perTestJanoshikUrls, setPerTestJanoshikUrls] = useState<Record<string, string>>({});
  const [section, setSection] = useState<"basic" | "compound" | "payment" | "tests" | "settings" | "results">("basic");
  const [catalogSearch, setCatalogSearch] = useState("");
  const F = FormField;

  useEffect(() => {
    setForm(initialForm);
    setTests(initialTests);
    const urlMap: Record<string, string> = {};
    for (const r of initialResults ?? []) {
      if (r.poolTestId && r.resultPdfUrl) urlMap[r.poolTestId] = r.resultPdfUrl;
    }
    setPerTestUrls(urlMap);
    // Initialize per-test janoshik URLs from test data
    const janoMap: Record<string, string> = {};
    for (const t of initialTests) {
      if (t.id && (t as any).janoshikUrl) janoMap[t.id] = (t as any).janoshikUrl;
    }
    setPerTestJanoshikUrls(janoMap);
  }, [initialForm.title]);

  function setF(k: keyof PoolFormState, v: string | boolean) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function addCatalogTest(entry: CatalogEntry) {
    if (tests.some(t => t.code === entry.code)) return;
    setTests(ts => [...ts, { code: entry.code, name: entry.name, unitPriceUsd: entry.defaultPriceUsd, quantity: 1, selected: true, catalogId: entry.id }]);
  }

  const sections: { key: typeof section; label: string }[] = [
    { key: "basic", label: "Basic" },
    { key: "compound", label: "Compound" },
    { key: "payment", label: "Payment" },
    { key: "tests", label: `Tests (${tests.length})` },
    { key: "settings", label: "Settings" },
    { key: "results", label: "Results" },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-auto overflow-hidden">
        {/* Modal header */}
        <div className="px-5 py-4 flex items-center justify-between" style={{ background: GRADIENT }}>
          <div className="flex items-center gap-2.5">
            <TestTube className="w-4 h-4 text-white/80" />
            <p className="font-bold text-white text-sm">{modalTitle}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>

        {/* Section tabs */}
        <div className="flex gap-1 px-4 pt-3 pb-2 overflow-x-auto border-b" style={{ borderColor: CARD_BORDER }}>
          {sections.map(s => (
            <button
              key={s.key}
              onClick={() => setSection(s.key)}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg whitespace-nowrap transition-all"
              style={section === s.key
                ? { background: NAVY, color: "#fff" }
                : { color: MUTED, background: "transparent" }}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="px-5 py-4 space-y-3 max-h-[60vh] overflow-y-auto">

          {section === "basic" && (
            <>
              <F label="Title *">
                <I value={form.title} onChange={e => setF("title", e.target.value)} placeholder="e.g. BPC-157 Community Pool #3" />
              </F>
              <div className="grid grid-cols-2 gap-3">
                <F label="Pool Leader Username">
                  <I value={form.leaderUsername} onChange={e => setF("leaderUsername", e.target.value)} placeholder="e.g. poolleader123" />
                </F>
              </div>
              <F label="Description">
                <T rows={3} value={form.description} onChange={e => setF("description", e.target.value)} placeholder="Public description shown to participants" />
              </F>
              <F label="Page Message (shown at top of pool page)">
                <T rows={2} value={form.pageMessage} onChange={e => setF("pageMessage", e.target.value)} placeholder="Optional message for contributors…" />
              </F>
              <div className="grid grid-cols-2 gap-3">
                <F label="Status">
                  <S value={form.status} onChange={e => setF("status", e.target.value)}>
                    {["draft","open","funded","sent_to_lab","results_received","closed","cancelled"].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </S>
                </F>
                <F label="Approval Status">
                  <S value={form.approvalStatus} onChange={e => setF("approvalStatus", e.target.value)}>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </S>
                </F>
              </div>
            </>
          )}

          {section === "compound" && (
            <div className="grid grid-cols-2 gap-3">
              <F label="Compound Name">
                <I value={form.compoundName} onChange={e => setF("compoundName", e.target.value)} placeholder="e.g. BPC-157" />
              </F>
              <F label="Manufacturer">
                <I value={form.manufacturer} onChange={e => setF("manufacturer", e.target.value)} placeholder="e.g. Peptide Sciences" />
              </F>
              <F label="Batch Number">
                <I value={form.batchNumber} onChange={e => setF("batchNumber", e.target.value)} placeholder="e.g. A4-2024" />
              </F>
              <F label="Cap Color">
                <I value={form.capColor} onChange={e => setF("capColor", e.target.value)} placeholder="e.g. blue" />
              </F>
              <F label="Size / Strength">
                <div className="flex gap-1.5">
                  <I
                    type="number"
                    min="0"
                    step="any"
                    value={form.mgSize.replace(/\s*(mcg|mg\/ml|mg|iu)\s*$/i, "").trim()}
                    onChange={e => {
                      const unit = form.mgSize.match(/\s*(mcg|mg\/ml|mg|iu)\s*$/i)?.[1] ?? "mg";
                      setF("mgSize", e.target.value ? `${e.target.value} ${unit}` : "");
                    }}
                    placeholder="e.g. 5"
                    className="flex-1 min-w-0"
                  />
                  <S
                    value={(form.mgSize.match(/\s*(mcg|mg\/ml|mg|iu)\s*$/i)?.[1] ?? "mg").toLowerCase()}
                    onChange={e => {
                      const num = form.mgSize.replace(/\s*(mcg|mg\/ml|mg|iu)\s*$/i, "").trim();
                      setF("mgSize", num ? `${num} ${e.target.value}` : "");
                    }}
                    className="w-24 shrink-0"
                  >
                    <option value="mg">mg</option>
                    <option value="mcg">mcg</option>
                    <option value="mg/ml">mg/ml</option>
                    <option value="iu">IU</option>
                  </S>
                </div>
              </F>
              <F label="Mfg Date (YYYY-MM-DD)">
                <I value={form.manufacturingDate} onChange={e => setF("manufacturingDate", e.target.value)} placeholder="2024-03-01" />
              </F>
              <F label="Pool Image">
                <div className="flex flex-col gap-2">
                  {form.imageUrl && (
                    <div className="relative w-24 h-24">
                      <img src={form.imageUrl} alt="pool" className="w-24 h-24 rounded-xl object-cover border" style={{ borderColor: "var(--t-border)" }} />
                      <button
                        type="button"
                        onClick={() => setF("imageUrl", "")}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                        style={{ background: "#ef4444" }}
                      >✕</button>
                    </div>
                  )}
                  <label
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                    style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-muted)" }}
                  >
                    📷 {form.imageUrl ? "Replace image" : "Upload image"}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = ev => {
                          const img = new window.Image();
                          img.onload = () => {
                            const MAX = 480;
                            const scale = Math.min(1, MAX / Math.max(img.width, img.height));
                            const canvas = document.createElement("canvas");
                            canvas.width = Math.round(img.width * scale);
                            canvas.height = Math.round(img.height * scale);
                            const ctx = canvas.getContext("2d");
                            if (!ctx) return;
                            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                            setF("imageUrl", canvas.toDataURL("image/jpeg", 0.75));
                          };
                          img.src = ev.target!.result as string;
                        };
                        reader.readAsDataURL(file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </F>
            </div>
          )}

          {section === "payment" && (
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: LABEL }}>Crypto Wallet</p>
                <div className="space-y-2">
                  <F label="Wallet Address">
                    <I value={form.walletAddress} onChange={e => setF("walletAddress", e.target.value)} placeholder="0x..." />
                  </F>
                  <div className="grid grid-cols-2 gap-2">
                    <F label="Currency">
                      <S value={form.walletCurrency} onChange={e => setF("walletCurrency", e.target.value)}>
                        {["USDT","USDC","BTC","ETH","BNB","XMR","SOL","TON"].map(c => <option key={c}>{c}</option>)}
                      </S>
                    </F>
                    <F label="Network">
                      <S value={form.walletNetwork} onChange={e => setF("walletNetwork", e.target.value)}>
                        {["ERC-20","TRC-20","BEP-20","Polygon","Solana","Bitcoin","Monero","TON"].map(n => <option key={n}>{n}</option>)}
                      </S>
                    </F>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: LABEL }}>AnonPay</p>
                <div className="space-y-2">
                  <F label="AnonPay Wallet">
                    <I value={form.anonpayWallet} onChange={e => setF("anonpayWallet", e.target.value)} placeholder="Monero address" />
                  </F>
                  <F label="Coin & Network">
                    <S
                      value={`${form.anonpayTicker}|${form.anonpayNetwork}`}
                      onChange={e => {
                        const [ticker, ...rest] = e.target.value.split("|");
                        const network = rest.join("|");
                        setForm(f => ({ ...f, anonpayTicker: ticker, anonpayNetwork: network }));
                      }}
                    >
                      {ANONPAY_COINS.map(c => (
                        <option key={`${c.ticker}|${c.network}`} value={`${c.ticker}|${c.network}`}>{c.label}</option>
                      ))}
                    </S>
                  </F>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: LABEL }}>Revolut / PayPal</p>
                <div className="grid grid-cols-2 gap-2">
                  <F label="Revolut Handle"><I value={form.revolutHandle} onChange={e => setF("revolutHandle", e.target.value)} placeholder="@handle" /></F>
                  <F label="PayPal Email"><I value={form.paypalEmail} onChange={e => setF("paypalEmail", e.target.value)} placeholder="email@example.com" /></F>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: LABEL }}>Janoshik</p>
                <F label="Janoshik Payment URL">
                  <I value={form.janoshikUrl} onChange={e => setF("janoshikUrl", e.target.value)} placeholder="https://janoshik.com/order/..." />
                </F>
              </div>
            </div>
          )}

          {section === "tests" && (
            <>
              {tests.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  {tests.map(t => (
                    <div key={t.code} className={`flex items-center gap-2 rounded-lg px-2.5 py-2 border transition-all ${t.selected ? "bg-white" : "opacity-50 bg-gray-50"}`} style={{ borderColor: CARD_BORDER }}>
                      <button
                        onClick={() => setTests(ts => ts.map(x => x.code === t.code ? { ...x, selected: !x.selected } : x))}
                        title={t.selected ? "Deselect" : "Select"}
                        className="w-5 h-5 rounded border flex items-center justify-center shrink-0"
                        style={t.selected ? { background: NAVY, borderColor: NAVY } : { borderColor: CARD_BORDER }}
                      >
                        {t.selected && <Check className="w-3 h-3 text-white" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: PRIMARY_TEXT }}>{t.name}</p>
                        <p className="text-[10px] font-mono" style={{ color: MUTED }}>{t.code} · ${t.unitPriceUsd.toFixed(2)}</p>
                      </div>
                      <button onClick={() => setTests(ts => ts.filter(x => x.code !== t.code))} className="shrink-0 text-red-400 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {catalog.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: LABEL }}>Add from Catalog</p>
                  <input
                    type="text"
                    value={catalogSearch}
                    onChange={e => setCatalogSearch(e.target.value)}
                    placeholder="Search tests…"
                    className={inp + " w-full mb-2"}
                    style={inpStyle}
                  />
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {catalog.filter(e => {
                      if (!e.active || tests.some(t => t.code === e.code)) return false;
                      if (!catalogSearch.trim()) return true;
                      const q = catalogSearch.toLowerCase();
                      return e.name.toLowerCase().includes(q) || e.code.toLowerCase().includes(q);
                    }).map(e => (
                      <button
                        key={e.id}
                        onClick={() => addCatalogTest(e)}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left transition-all hover:border-[#2D6BCC]/40"
                        style={{ borderColor: CARD_BORDER }}
                      >
                        <Plus className="w-3.5 h-3.5 shrink-0" style={{ color: BRAND_BLUE }} />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-semibold" style={{ color: PRIMARY_TEXT }}>{e.name}</span>
                          <span className="text-[10px] font-mono ml-1.5" style={{ color: LABEL }}>{e.code}</span>
                        </div>
                        <span className="text-[11px] font-semibold shrink-0" style={{ color: NAVY }}>${e.defaultPriceUsd.toFixed(2)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {tests.length === 0 && catalog.filter(e => e.active).length === 0 && (
                <p className="text-xs italic text-center py-6" style={{ color: LABEL }}>No catalog entries. Add some in the Test Catalog tab first.</p>
              )}
            </>
          )}

          {section === "settings" && (
            <div className="space-y-3">
              <F label="Voting Mode">
                <S value={form.votingMode} onChange={e => setF("votingMode", e.target.value)}>
                  <option value="leader_decides">Leader decides</option>
                  <option value="vote">Community vote</option>
                </S>
              </F>
              <F label="Fixed Opt-in Fee (USD, leave blank for auto)">
                <I value={form.fixedOptInFeeUsd} onChange={e => setF("fixedOptInFeeUsd", e.target.value)} placeholder="e.g. 25.00" type="number" min="0" step="0.01" />
              </F>
              <F label="Results Password (leave blank to keep unchanged)">
                <I type="password" value={form.resultsPassword} onChange={e => setF("resultsPassword", e.target.value)} placeholder="New password (optional)" />
              </F>
              <div className="rounded-xl border p-3 space-y-2.5" style={{ borderColor: CARD_BORDER, background: "#F8FAFC" }}>
                {[
                  { key: "contributorNamedReportEnabled" as const, label: "Enable named report opt-in" },
                  { key: "stopOnFunded" as const, label: "Stop accepting contributions when funded" },
                  { key: "allowVialContribution" as const, label: "Allow vial contribution" },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2.5 cursor-pointer">
                    <div
                      onClick={() => setF(key, !form[key])}
                      className="w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-all cursor-pointer"
                      style={form[key] ? { background: NAVY, borderColor: NAVY } : { borderColor: CARD_BORDER, background: "#fff" }}
                    >
                      {form[key] && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-sm" style={{ color: PRIMARY_TEXT }}>{label}</span>
                  </label>
                ))}
              </div>
              {form.contributorNamedReportEnabled && (
                <F label="Named Report Cap (blank = unlimited)">
                  <I
                    type="number"
                    min="1"
                    step="1"
                    value={form.namedReportCap}
                    onChange={e => setF("namedReportCap", e.target.value)}
                    placeholder="e.g. 10"
                  />
                </F>
              )}
            </div>
          )}

          {section === "results" && (
            <div className="space-y-3">
              <F label="Result Notes">
                <T rows={4} value={form.resultNotes} onChange={e => setF("resultNotes", e.target.value)} placeholder="Summary of results…" />
              </F>
              <F label="Overall Result PDF URL">
                <I value={form.resultPdfUrl} onChange={e => setF("resultPdfUrl", e.target.value)} placeholder="https://…" />
              </F>
              {tests.filter(t => t.id).length > 0 && (
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: LABEL }}>Per-Test PDF URLs</p>
                    <div className="space-y-2">
                      {tests.filter(t => t.id).map(t => (
                        <F key={t.id} label={t.name}>
                          <I
                            value={perTestUrls[t.id!] ?? ""}
                            onChange={e => setPerTestUrls(m => ({ ...m, [t.id!]: e.target.value }))}
                            placeholder="https://…"
                          />
                        </F>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: LABEL }}>🔬 Per-Test Janoshik URLs</p>
                    <div className="space-y-2">
                      {tests.filter(t => t.id).map(t => (
                        <F key={`jano-${t.id}`} label={t.name}>
                          <I
                            value={perTestJanoshikUrls[t.id!] ?? ""}
                            onChange={e => setPerTestJanoshikUrls(m => ({ ...m, [t.id!]: e.target.value }))}
                            placeholder="https://janoshik.com/order/…"
                          />
                        </F>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t" style={{ borderColor: CARD_BORDER }}>
          <BrandBtn variant="ghost" onClick={onClose}>Cancel</BrandBtn>
          <BrandBtn variant="primary" onClick={() => {
            const perTestResults = Object.entries(perTestUrls)
              .filter(([, url]) => url.trim())
              .map(([poolTestId, resultPdfUrl]) => ({ poolTestId, resultPdfUrl }));
            onSubmit(form, tests, perTestResults, perTestJanoshikUrls);
          }} disabled={isPending || !form.title.trim()}>
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {modalTitle.startsWith("Create") ? "Create Pool" : "Save Changes"}
          </BrandBtn>
        </div>
      </div>
    </div>
  );
}

// ─── Main export ────────────────────────────────────────────────────────────────
export default function AdminTestingPools({ secret }: { secret: string }) {
  const [tab, setTab] = useState<"applications" | "pools" | "catalog">("applications");
  const headers = { "x-admin-secret": secret, "Content-Type": "application/json" };

  const tabs = [
    { id: "applications" as const, label: "Leader Applications", icon: UserCog },
    { id: "pools" as const, label: "Pools", icon: FlaskConical },
    { id: "catalog" as const, label: "Test Catalog", icon: BookOpen },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl overflow-hidden" style={{ background: GRADIENT }}>
        <div className="px-5 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.15)" }}>
            <TestTube className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-base">Testing Pool Hub</p>
            <p className="text-xs text-white/70">Manage leader applications, testing pools, and the test catalog</p>
          </div>
        </div>
        {/* Tabs */}
        <div className="flex gap-1 px-4 pb-3">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={tab === t.id
                ? { background: "rgba(255,255,255,0.2)", color: "#fff" }
                : { background: "transparent", color: "rgba(255,255,255,0.65)" }}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "applications" && <ApplicationsPanel headers={headers} />}
      {tab === "pools"        && <PoolsPanel headers={headers} secret={secret} />}
      {tab === "catalog"      && <CatalogPanel headers={headers} />}
    </div>
  );
}

// ─── ApplicationsPanel ─────────────────────────────────────────────────────────
function ApplicationsPanel({ headers }: { headers: HeadersInit }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<"applied" | "approved" | "rejected" | "suspended">("applied");

  const { data: apps = [], isLoading } = useQuery<Application[]>({
    queryKey: ["/api/admin/pool-leader-applications", statusFilter],
    queryFn: async () => {
      const r = await fetch(`/api/admin/pool-leader-applications?status=${statusFilter}`, { headers });
      if (!r.ok) return [];
      return r.json();
    },
  });

  const review = useMutation({
    mutationFn: async ({ username, status }: { username: string; status: string }) => {
      const r = await fetch(`/api/admin/pool-leader-applications/${username}`, {
        method: "PATCH", headers, body: JSON.stringify({ status }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? "Failed");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/pool-leader-applications"] }); toast({ title: "Updated" }); },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const STATUS_FILTERS = ["applied", "approved", "rejected", "suspended"] as const;
  const FILTER_COLORS: Record<string, { bg: string; color: string }> = {
    applied:   { bg: "rgba(233,160,32,0.12)",  color: "#b45309" },
    approved:  { bg: "rgba(34,197,94,0.12)",   color: "#16a34a" },
    rejected:  { bg: "rgba(239,68,68,0.12)",   color: "#dc2626" },
    suspended: { bg: "rgba(148,163,184,0.15)", color: "#64748b" },
  };

  return (
    <Card>
      <div className="px-4 pt-4 pb-3 border-b" style={{ borderColor: CARD_BORDER }}>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: LABEL }}>Filter by Status</p>
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map(s => {
            const isActive = statusFilter === s;
            const c = FILTER_COLORS[s];
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg capitalize transition-all"
                style={isActive ? { background: NAVY, color: "#fff" } : { background: c.bg, color: c.color }}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" style={{ color: BRAND_BLUE }} /></div>
        ) : apps.length === 0 ? (
          <p className="text-sm text-center py-10" style={{ color: LABEL }}>No {statusFilter} applications.</p>
        ) : (
          <div className="space-y-2">
            {apps.map(a => (
              <div key={a.telegramUsername} className="rounded-xl border p-4" style={{ borderColor: CARD_BORDER }}>
                <div className="flex justify-between items-start gap-3 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4" style={{ color: BRAND_BLUE }} />
                      <p className="text-sm font-bold" style={{ color: PRIMARY_TEXT }}>@{a.telegramUsername}</p>
                    </div>
                    {a.email && <p className="text-xs mt-0.5" style={{ color: MUTED }}>{a.email}</p>}
                    {a.appliedAt && <p className="text-[10px] mt-0.5" style={{ color: LABEL }}>Applied {fmt(a.appliedAt)}</p>}
                  </div>
                  <div className="flex gap-1.5 flex-wrap justify-end">
                    {statusFilter !== "approved" && (
                      <BrandBtn variant="secondary" size="xs" onClick={() => review.mutate({ username: a.telegramUsername, status: "approved" })}>
                        <Check className="w-3 h-3" /> Approve
                      </BrandBtn>
                    )}
                    {statusFilter === "applied" && (
                      <BrandBtn variant="danger" size="xs" onClick={() => review.mutate({ username: a.telegramUsername, status: "rejected" })}>
                        <X className="w-3 h-3" /> Reject
                      </BrandBtn>
                    )}
                    {statusFilter === "approved" && (
                      <BrandBtn variant="ghost" size="xs" onClick={() => review.mutate({ username: a.telegramUsername, status: "suspended" })}>Suspend</BrandBtn>
                    )}
                    {statusFilter === "suspended" && (
                      <BrandBtn variant="secondary" size="xs" onClick={() => review.mutate({ username: a.telegramUsername, status: "approved" })}>
                        <ShieldCheck className="w-3 h-3" /> Re-approve
                      </BrandBtn>
                    )}
                  </div>
                </div>
                {a.bio && <p className="text-xs mb-2 whitespace-pre-wrap" style={{ color: MUTED }}>{a.bio}</p>}
                {a.wallet && (
                  <div className="rounded-lg px-3 py-2 text-[11px] font-mono" style={{ background: "#F8FAFC", color: MUTED }}>
                    <span style={{ color: LABEL }}>Wallet:</span> {a.wallet} ({a.walletCurrency} on {a.walletNetwork})
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── PoolFormState helpers ──────────────────────────────────────────────────────
function poolDetailToForm(data: PoolDetail): PoolFormState {
  const crypto  = data.paymentMethods.find(m => m.type === "crypto");
  const anonpay = data.paymentMethods.find(m => m.type === "anonpay");
  const revolut = data.paymentMethods.find(m => m.type === "revolut");
  const paypal  = data.paymentMethods.find(m => m.type === "paypal");
  return {
    title: data.title,
    leaderUsername: data.leaderUsername ?? "",
    description: data.description ?? "",
    compoundName: data.compoundName ?? "",
    manufacturer: data.manufacturer ?? "",
    batchNumber: data.batchNumber ?? "",
    capColor: data.capColor ?? "",
    mgSize: data.mgSize ?? "",
    manufacturingDate: data.manufacturingDate ?? "",
    imageUrl: data.imageUrl ?? "",
    namedReportCap: data.namedReportCap != null ? String(data.namedReportCap) : "",
    status: data.status,
    approvalStatus: data.approvalStatus,
    votingMode: data.votingMode ?? "leader_decides",
    resultNotes: data.resultNotes ?? "",
    resultPdfUrl: data.resultPdfUrl ?? "",
    fixedOptInFeeUsd: data.fixedOptInFeeUsd ?? "",
    contributorNamedReportEnabled: data.contributorNamedReportEnabled ?? false,
    stopOnFunded: data.stopOnFunded ?? false,
    allowVialContribution: data.allowVialContribution ?? false,
    pageMessage: data.pageMessage ?? "",
    resultsPassword: "",
    walletAddress:  (crypto as any)?.address ?? "",
    walletCurrency: (crypto as any)?.currency ?? "USDT",
    walletNetwork:  (crypto as any)?.network ?? "ERC-20",
    anonpayWallet:  (anonpay as any)?.wallet ?? (anonpay as any)?.email ?? "",
    anonpayTicker:  (anonpay as any)?.ticker ?? "XMR",
    anonpayNetwork: (anonpay as any)?.network ?? "Monero",
    revolutHandle:  (revolut as any)?.handle ?? "",
    paypalEmail:    (paypal as any)?.email ?? "",
    janoshikUrl:    (data.paymentMethods.find(m => m.type === "janoshik") as any)?.url ?? "",
  };
}

function buildPMsFromForm(form: PoolFormState): PaymentMethod[] {
  const out: PaymentMethod[] = [];
  if (form.walletAddress.trim())  out.push({ type: "crypto",  currency: form.walletCurrency, network: form.walletNetwork, address: form.walletAddress.trim() });
  if (form.anonpayWallet.trim())  out.push({ type: "anonpay", ticker: form.anonpayTicker, network: form.anonpayNetwork, wallet: form.anonpayWallet.trim() });
  if (form.revolutHandle.trim())  out.push({ type: "revolut", handle: form.revolutHandle.trim() });
  if (form.paypalEmail.trim())    out.push({ type: "paypal",  email: form.paypalEmail.trim() });
  if (form.janoshikUrl.trim())    out.push({ type: "janoshik", url: form.janoshikUrl.trim() } as any);
  return out;
}

// ─── PoolsPanel ────────────────────────────────────────────────────────────────
function PoolsPanel({ headers, secret }: { headers: HeadersInit; secret: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingPool, setEditingPool] = useState<PoolDetail | null>(null);

  const { data: pools = [], isLoading } = useQuery<AdminPool[]>({
    queryKey: ["/api/admin/testing-pools"],
    queryFn: async () => {
      const r = await fetch("/api/admin/testing-pools", { headers });
      if (!r.ok) return [];
      return r.json();
    },
  });

  const { data: catalog = [] } = useQuery<CatalogEntry[]>({
    queryKey: ["/api/admin/test-catalog"],
    queryFn: async () => (await fetch("/api/admin/test-catalog", { headers })).json(),
  });

  const update = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Record<string, unknown> }) => {
      const r = await fetch(`/api/admin/testing-pools/${id}`, { method: "PATCH", headers, body: JSON.stringify(body) });
      if (!r.ok) throw new Error("Failed");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/testing-pools"] }); toast({ title: "Updated" }); },
  });

  const createPool = useMutation({
    mutationFn: async ({ form, tests }: { form: PoolFormState; tests: Array<{ code: string; name: string; unitPriceUsd: number; quantity: number; selected: boolean; catalogId: string | null }> }) => {
      const r = await fetch("/api/admin/testing-pools", {
        method: "POST", headers,
        body: JSON.stringify({ ...form, tests, paymentMethods: undefined, fixedOptInFeeUsd: form.fixedOptInFeeUsd === "" ? null : form.fixedOptInFeeUsd }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? "Failed");
      return r.json();
    },
    onSuccess: (data) => { qc.invalidateQueries({ queryKey: ["/api/admin/testing-pools"] }); setShowCreate(false); toast({ title: "Pool created", description: `Slug: ${data.slug}` }); },
    onError: (e: Error) => toast({ title: "Failed to create", description: e.message, variant: "destructive" }),
  });

  const deletePool = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/admin/testing-pools/${id}`, { method: "DELETE", headers });
      if (!r.ok) throw new Error((await r.json()).error ?? "Failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/testing-pools"] });
      toast({ title: "Pool deleted" });
    },
    onError: (e: Error) => toast({ title: "Failed to delete pool", description: e.message, variant: "destructive" }),
  });

  const editPool = useMutation({
    mutationFn: async ({ id, form, tests, perTestResults, perTestJanoshikUrls }: { id: string; form: PoolFormState; tests: ModalTest[]; perTestResults: Array<{poolTestId: string; resultPdfUrl: string}>; perTestJanoshikUrls: Record<string, string> }) => {
      const patchBody: Record<string, unknown> = {
        title: form.title,
        description: form.description || null,
        compoundName: form.compoundName || null,
        manufacturer: form.manufacturer || null,
        batchNumber: form.batchNumber || null,
        capColor: form.capColor || null,
        mgSize: (() => {
          if (!form.mgSize) return null;
          const trimmed = form.mgSize.trim();
          if (/\s*(mcg|mg\/ml|mg|iu)\s*$/i.test(trimmed)) return trimmed;
          const inferredUnit = trimmed.match(/\s*(mcg|mg\/ml|mg|iu)\s*$/i)?.[1] ?? "mg";
          return `${trimmed} ${inferredUnit}`;
        })(),
        manufacturingDate: form.manufacturingDate || null,
        imageUrl: form.imageUrl || null,
        status: form.status,
        approvalStatus: form.approvalStatus,
        votingMode: form.votingMode,
        resultNotes: form.resultNotes || null,
        resultPdfUrl: form.resultPdfUrl || null,
        fixedOptInFeeUsd: form.fixedOptInFeeUsd === "" ? null : form.fixedOptInFeeUsd,
        contributorNamedReportEnabled: form.contributorNamedReportEnabled,
        namedReportCap: form.namedReportCap ? parseInt(form.namedReportCap, 10) : null,
        stopOnFunded: form.stopOnFunded,
        paymentMethods: buildPMsFromForm(form),
      };
      if (form.leaderUsername.trim()) patchBody.leaderUsername = form.leaderUsername.trim();
      if (form.resultsPassword) patchBody.resultsPassword = form.resultsPassword;

      const r1 = await fetch(`/api/admin/testing-pools/${id}`, { method: "PATCH", headers, body: JSON.stringify(patchBody) });
      if (!r1.ok) throw new Error("Failed to update pool");

      const r2 = await fetch(`/api/admin/testing-pools/${id}/tests`, { method: "PUT", headers, body: JSON.stringify({ tests }) });
      if (!r2.ok) throw new Error("Failed to update tests");

      if (perTestResults.length > 0) {
        const r3 = await fetch(`/api/admin/testing-pools/${id}/results`, { method: "PUT", headers, body: JSON.stringify({ results: perTestResults }) });
        if (!r3.ok) throw new Error("Failed to update per-test result URLs");
      }
      const filteredJanoshik = Object.fromEntries(Object.entries(perTestJanoshikUrls).filter(([, v]) => v !== undefined));
      if (Object.keys(filteredJanoshik).length > 0) {
        await fetch(`/api/admin/testing-pools/${id}/test-janoshik`, { method: "PATCH", headers, body: JSON.stringify({ janoshikUrls: filteredJanoshik }) });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/testing-pools"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/testing-pools/detail"] });
      setEditingPool(null);
      toast({ title: "Pool saved" });
    },
    onError: (e: Error) => toast({ title: "Failed to save", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin" style={{ color: BRAND_BLUE }} /></div>;

  return (
    <>
      {showCreate && (
        <PoolFormModal
          title="Create Testing Pool"
          initialForm={BLANK_FORM}
          initialTests={[]}
          catalog={catalog}
          onClose={() => setShowCreate(false)}
          onSubmit={(form, tests) => createPool.mutate({ form, tests: tests.map(t => ({ code: t.code, name: t.name, unitPriceUsd: t.unitPriceUsd, quantity: t.quantity, selected: t.selected, catalogId: t.catalogId })) }) as any}
          isPending={createPool.isPending}
        />
      )}
      {editingPool && (
        <PoolFormModal
          title={`Edit Pool: ${editingPool.title}`}
          initialForm={poolDetailToForm(editingPool)}
          initialTests={editingPool.tests.map(t => ({ id: t.id, code: t.code, name: t.name, unitPriceUsd: t.unitPriceUsd, quantity: t.quantity, selected: t.selected, catalogId: t.catalogId }))}
          initialResults={editingPool.results}
          catalog={catalog}
          onClose={() => setEditingPool(null)}
          onSubmit={(form, tests, perTestResults, perTestJanoshikUrls) => editPool.mutate({ id: editingPool.id, form, tests, perTestResults, perTestJanoshikUrls })}
          isPending={editPool.isPending}
        />
      )}

      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold" style={{ color: MUTED }}>{pools.length} pool{pools.length !== 1 ? "s" : ""}</p>
        <BrandBtn variant="primary" onClick={() => setShowCreate(true)}>
          <Plus className="w-3.5 h-3.5" /> Create Pool
        </BrandBtn>
      </div>

      {pools.length === 0 ? (
        <Card><p className="text-sm text-center py-12" style={{ color: LABEL }}>No pools yet.</p></Card>
      ) : (
        <div className="space-y-2">
          {pools.map(p => (
            <Card key={p.id} className="overflow-hidden">
              <div className="flex justify-between items-start gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <a
                      href={`/pool/${p.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-bold hover:underline inline-flex items-center gap-1"
                      style={{ color: PRIMARY_TEXT }}
                    >
                      {p.title} <ExternalLink className="w-3 h-3" style={{ color: BRAND_BLUE }} />
                    </a>
                    <StatusPill label={p.status.replace(/_/g, " ")} color={poolStatusColor(p.status)} />
                    <StatusPill label={p.approvalStatus} color={approvalColor(p.approvalStatus)} />
                    {p.hiddenFromList && <StatusPill label="hidden" color="slate" />}
                  </div>
                  <p className="text-[11px]" style={{ color: MUTED }}>
                    <span style={{ color: BRAND_BLUE }}>@{p.leaderUsername}</span>
                    {" · "}${p.raisedUsd.toFixed(2)} / ${p.targetAmountUsd.toFixed(2)}
                    {" · "}<span style={{ color: "#16a34a" }}>{p.contributorCount} verified</span>
                    {p.pendingCount > 0 && <span style={{ color: "#b45309" }}> · {p.pendingCount} pending</span>}
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0 items-center flex-wrap justify-end">
                  {p.approvalStatus !== "approved" && (
                    <BrandBtn size="xs" variant="secondary" onClick={() => update.mutate({ id: p.id, body: { approvalStatus: "approved" } })}>
                      <Check className="w-3 h-3" /> Approve
                    </BrandBtn>
                  )}
                  {p.approvalStatus !== "rejected" && (
                    <BrandBtn size="xs" variant="danger" onClick={() => update.mutate({ id: p.id, body: { approvalStatus: "rejected" } })}>
                      <X className="w-3 h-3" /> Reject
                    </BrandBtn>
                  )}
                  <BrandBtn size="xs" variant="ghost" onClick={() => update.mutate({ id: p.id, body: { hiddenFromList: !p.hiddenFromList } })}>
                    {p.hiddenFromList ? <><Eye className="w-3 h-3" /> Show</> : <><EyeOff className="w-3 h-3" /> Hide</>}
                  </BrandBtn>
                  <EditPoolButton poolId={p.id} headers={headers} onEdit={setEditingPool} />
                  <BrandBtn size="xs" variant="ghost" onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>
                    {expandedId === p.id ? <><ChevronUp className="w-3 h-3" /> Close</> : <><ChevronDown className="w-3 h-3" /> Details</>}
                  </BrandBtn>
                  <BrandBtn
                    size="xs"
                    variant="danger"
                    disabled={deletePool.isPending}
                    onClick={() => {
                      if (confirm(`Permanently delete "${p.title}" and all its data? This cannot be undone.`)) {
                        deletePool.mutate(p.id);
                      }
                    }}
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </BrandBtn>
                </div>
              </div>
              {expandedId === p.id && <PoolDetailPanel poolId={p.id} headers={headers} />}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

// ─── EditPoolButton ─────────────────────────────────────────────────────────────
function EditPoolButton({ poolId, headers, onEdit }: { poolId: string; headers: HeadersInit; onEdit: (d: PoolDetail) => void }) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleClick() {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/testing-pools/${poolId}/detail`, { headers });
      if (!r.ok) throw new Error("Failed");
      onEdit(await r.json());
    } catch {
      toast({ title: "Could not load pool", variant: "destructive" });
    } finally { setLoading(false); }
  }

  return (
    <BrandBtn size="xs" variant="secondary" onClick={handleClick} disabled={loading}>
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Pencil className="w-3 h-3" />} Edit
    </BrandBtn>
  );
}

// ─── PoolDetailPanel ────────────────────────────────────────────────────────────
function PoolDetailPanel({ poolId, headers }: { poolId: string; headers: HeadersInit }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [section, setSection] = useState<"overview" | "participants" | "tests" | "results" | "messages">("overview");

  const { data, isLoading, error } = useQuery<PoolDetail>({
    queryKey: ["/api/admin/testing-pools/detail", poolId],
    queryFn: async () => {
      const r = await fetch(`/api/admin/testing-pools/${poolId}/detail`, { headers });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  const deleteTest = useMutation({
    mutationFn: async (testId: string) => {
      const r = await fetch(`/api/admin/testing-pools/tests/${testId}`, { method: "DELETE", headers });
      if (!r.ok) throw new Error("Failed");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/testing-pools/detail", poolId] }); toast({ title: "Test deleted" }); },
    onError: () => toast({ title: "Failed to delete test", variant: "destructive" }),
  });

  const setTestStatus = useMutation({
    mutationFn: async ({ testId, status }: { testId: string; status: string }) => {
      const r = await fetch(`/api/admin/testing-pools/tests/${testId}/status`, { method: "PATCH", headers, body: JSON.stringify({ status }) });
      if (!r.ok) throw new Error("Failed");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/testing-pools/detail", poolId] }); toast({ title: "Test status updated" }); },
    onError: () => toast({ title: "Failed to update status", variant: "destructive" }),
  });

  if (isLoading) return <div className="border-t px-4 py-6 flex justify-center" style={{ borderColor: CARD_BORDER }}><Loader2 className="w-5 h-5 animate-spin" style={{ color: BRAND_BLUE }} /></div>;
  if (error || !data) return <div className="border-t px-4 py-4 text-xs text-red-500" style={{ borderColor: CARD_BORDER }}>Could not load details.</div>;

  const resultsByTestId = Object.fromEntries(data.results.map(r => [r.poolTestId, r]));

  const CS_COLOR: Record<string, { bg: string; color: string }> = {
    active:           { bg: "rgba(34,197,94,0.12)",   color: "#16a34a" },
    rejected:         { bg: "rgba(239,68,68,0.12)",   color: "#dc2626" },
    closed:           { bg: "rgba(148,163,184,0.15)", color: "#64748b" },
    delete_requested: { bg: "rgba(233,160,32,0.12)",  color: "#b45309" },
  };

  return (
    <div className="border-t" style={{ borderColor: CARD_BORDER }}>
      {/* Summary row */}
      <div className="px-4 py-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]" style={{ background: "#F8FAFC", borderBottom: `1px solid ${CARD_BORDER}` }}>
        {data.compoundName    && <span><span className="font-bold" style={{ color: PRIMARY_TEXT }}>Compound:</span><span style={{ color: MUTED }}> {data.compoundName}</span></span>}
        {data.manufacturer    && <span><span className="font-bold" style={{ color: PRIMARY_TEXT }}>Mfr:</span><span style={{ color: MUTED }}> {data.manufacturer}</span></span>}
        {data.batchNumber     && <span><span className="font-bold" style={{ color: PRIMARY_TEXT }}>Batch:</span><span style={{ color: MUTED }}> {data.batchNumber}</span></span>}
        {data.capColor        && <span><span className="font-bold" style={{ color: PRIMARY_TEXT }}>Cap:</span><span style={{ color: MUTED }}> {data.capColor}</span></span>}
        {data.mgSize          && <span><span className="font-bold" style={{ color: PRIMARY_TEXT }}>Size:</span><span style={{ color: MUTED }}> {data.mgSize}</span></span>}
        {data.manufacturingDate && <span><span className="font-bold" style={{ color: PRIMARY_TEXT }}>Mfg Date:</span><span style={{ color: MUTED }}> {data.manufacturingDate}</span></span>}
        {data.paymentMethods.length > 0 && (
          <span className="w-full pt-1.5 mt-0.5 border-t flex flex-wrap gap-x-3" style={{ borderColor: CARD_BORDER }}>
            {data.paymentMethods.map((m, i) => {
              let detail = m.type;
              if (m.type === "crypto")  detail = `crypto · ${m.currency} · ${m.network} · ${m.address}`;
              if (m.type === "anonpay") detail = `anonpay · ${m.ticker ?? "XMR"} · ${m.network ?? "Monero"} · ${m.wallet ?? m.email ?? ""}`;
              if (m.type === "revolut") detail = `revolut · ${m.handle ?? ""}`;
              if (m.type === "paypal")  detail = `paypal · ${m.email ?? ""}`;
              return <span key={i} className="font-mono break-all" style={{ color: MUTED }}>{detail}</span>;
            })}
          </span>
        )}
      </div>

      {/* Detail tabs */}
      <div className="px-4 pt-3 pb-0 flex gap-1 flex-wrap">
        {([
          { key: "overview",     icon: BarChart3,     label: "Overview" },
          { key: "participants", icon: Users,         label: `Participants (${data.participants.length})` },
          { key: "tests",        icon: FlaskConical,  label: `Tests (${data.tests.length})` },
          { key: "results",      icon: FileText,      label: `Results (${data.results.length})` },
          { key: "messages",     icon: MessageSquare, label: `Messages (${data.messages.length})` },
        ] as const).map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setSection(key)}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg inline-flex items-center gap-1 transition-all"
            style={section === key ? { background: NAVY, color: "#fff" } : { color: MUTED, background: "transparent" }}
          >
            <Icon className="w-3 h-3" /> {label}
          </button>
        ))}
      </div>

      <div className="px-4 py-3">

        {section === "overview" && (() => {
          const participants = data.participants;
          const verified   = participants.filter(p => p.paymentStatus === "verified");
          const pending    = participants.filter(p => p.paymentStatus === "pending");
          const submitted  = participants.filter(p => p.paymentStatus === "submitted");
          const rejected   = participants.filter(p => p.paymentStatus === "rejected");
          const refunded   = participants.filter(p => p.paymentStatus === "refunded");

          const raisedVerified  = verified.reduce((s, p)  => s + p.amountUsd, 0);
          const raisedSubmitted = submitted.reduce((s, p) => s + p.amountUsd, 0);
          const raisedPending   = pending.reduce((s, p)   => s + p.amountUsd, 0);
          const totalRaised     = data.raisedUsd ?? (raisedVerified);
          const target          = data.targetAmountUsd;
          const pct             = target > 0 ? Math.min(100, (totalRaised / target) * 100) : 0;

          const namedReportCount = participants.filter(p => p.namedReportOptIn && !["rejected","refunded"].includes(p.paymentStatus)).length;
          const vialCount        = participants.filter(p => p.canProvideVial && !["rejected","refunded"].includes(p.paymentStatus)).length;

          // payment method breakdown across all participants
          const pmBreakdown: Record<string, { count: number; amount: number }> = {};
          for (const p of participants) {
            if (["rejected","refunded"].includes(p.paymentStatus)) continue;
            const pm = p.paymentMethod ?? "unknown";
            if (!pmBreakdown[pm]) pmBreakdown[pm] = { count: 0, amount: 0 };
            pmBreakdown[pm].count++;
            pmBreakdown[pm].amount += p.amountUsd;
          }

          // test result summary
          const passCount  = data.results.filter(r => r.passed === true).length;
          const failCount  = data.results.filter(r => r.passed === false).length;
          const pendingRes = data.results.filter(r => r.passed === null).length;

          // voting summary
          const votingPool = data.votingMode === "vote";
          const voteCounts: Record<string, number> = {};
          if (votingPool) {
            for (const p of verified) {
              const ids = (p as any).voteTestIds as string[] | null ?? [];
              for (const id of ids) voteCounts[id] = (voteCounts[id] ?? 0) + 1;
            }
          }

          const statCard = (icon: React.ReactNode, label: string, value: React.ReactNode, sub?: string) => (
            <div className="rounded-xl border p-3 flex items-start gap-2.5" style={{ borderColor: CARD_BORDER, background: "#fff" }}>
              <div className="shrink-0 mt-0.5">{icon}</div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: LABEL }}>{label}</p>
                <p className="text-base font-bold leading-tight" style={{ color: PRIMARY_TEXT }}>{value}</p>
                {sub && <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>{sub}</p>}
              </div>
            </div>
          );

          return (
            <div className="space-y-4">
              {/* Funding progress */}
              <div className="rounded-xl border p-3.5 space-y-2" style={{ borderColor: CARD_BORDER, background: "#fff" }}>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1" style={{ color: LABEL }}>
                    <TrendingUp className="w-3 h-3" /> Funding Progress
                  </p>
                  <a href={`/pool/${data.slug}`} target="_blank" rel="noreferrer" className="text-[10px] font-semibold inline-flex items-center gap-0.5 hover:underline" style={{ color: BRAND_BLUE }}>
                    View Pool Page <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <div className="flex items-end justify-between gap-2">
                  <div>
                    <p className="text-xl font-bold tabular-nums" style={{ color: PRIMARY_TEXT }}>${totalRaised.toFixed(2)}</p>
                    <p className="text-[11px]" style={{ color: MUTED }}>of ${target.toFixed(2)} goal · {pct.toFixed(1)}% funded</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-semibold" style={{ color: "#16a34a" }}>{verified.length} verified</p>
                    {submitted.length > 0 && <p className="text-[11px] font-semibold" style={{ color: "#b45309" }}>{submitted.length} submitted</p>}
                    {pending.length > 0  && <p className="text-[11px] font-semibold" style={{ color: MUTED }}>{pending.length} pending</p>}
                  </div>
                </div>
                <div className="w-full rounded-full overflow-hidden" style={{ height: 8, background: "rgba(27,58,122,0.08)" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct >= 100 ? "linear-gradient(90deg,#16a34a,#22c55e)" : "linear-gradient(90deg,#2D6BCC,#1B3A7A)" }} />
                </div>
                {(raisedSubmitted > 0 || raisedPending > 0) && (
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px]" style={{ color: MUTED }}>
                    {raisedVerified  > 0 && <span><span className="font-semibold" style={{ color: "#16a34a" }}>${raisedVerified.toFixed(2)}</span> verified</span>}
                    {raisedSubmitted > 0 && <span><span className="font-semibold" style={{ color: "#b45309" }}>${raisedSubmitted.toFixed(2)}</span> submitted (unverified)</span>}
                    {raisedPending   > 0 && <span><span className="font-semibold" style={{ color: MUTED }}>${raisedPending.toFixed(2)}</span> pledged (no payment yet)</span>}
                  </div>
                )}
              </div>

              {/* Key stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {statCard(<Users className="w-3.5 h-3.5" style={{ color: BRAND_BLUE }} />, "Total Contributors", participants.length, `${verified.length} verified · ${rejected.length + refunded.length} invalid`)}
                {statCard(<DollarSign className="w-3.5 h-3.5" style={{ color: "#16a34a" }} />, "Verified Revenue", `$${raisedVerified.toFixed(2)}`, raisedSubmitted > 0 ? `+$${raisedSubmitted.toFixed(2)} unverified` : undefined)}
                {statCard(<BookOpen className="w-3.5 h-3.5" style={{ color: "#7c3aed" }} />, "Named Reports", namedReportCount, data.namedReportCap ? `${namedReportCount} / ${data.namedReportCap} cap` : "no cap")}
                {statCard(<TestTube className="w-3.5 h-3.5" style={{ color: "#0f766e" }} />, "Vial Providers", vialCount, "opted in")}
              </div>

              {/* Participant status breakdown */}
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: CARD_BORDER }}>
                <div className="px-3 py-2 border-b flex items-center gap-1.5" style={{ borderColor: CARD_BORDER, background: "#F8FAFC" }}>
                  <Users className="w-3 h-3" style={{ color: LABEL }} />
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: LABEL }}>Participant Breakdown</p>
                </div>
                <div className="divide-y" style={{ borderColor: CARD_BORDER }}>
                  {[
                    { label: "Verified", count: verified.length,  amount: raisedVerified,  color: "#16a34a", bg: "rgba(34,197,94,0.07)" },
                    { label: "Submitted", count: submitted.length, amount: raisedSubmitted, color: "#b45309", bg: "rgba(233,160,32,0.07)" },
                    { label: "Pending",  count: pending.length,   amount: raisedPending,   color: MUTED,     bg: "#fff" },
                    { label: "Rejected", count: rejected.length,  amount: rejected.reduce((s,p) => s + p.amountUsd, 0),  color: "#dc2626", bg: "#fff" },
                    { label: "Refunded", count: refunded.length,  amount: refunded.reduce((s,p) => s + p.amountUsd, 0),  color: "#6b7280", bg: "#fff" },
                  ].map(row => row.count > 0 && (
                    <div key={row.label} className="flex items-center justify-between px-3 py-2" style={{ background: row.bg }}>
                      <span className="text-xs font-semibold" style={{ color: row.color }}>{row.label}</span>
                      <div className="flex items-center gap-4 text-xs tabular-nums">
                        <span style={{ color: MUTED }}>{row.count} contributor{row.count !== 1 ? "s" : ""}</span>
                        <span className="font-bold" style={{ color: row.color }}>${row.amount.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment method breakdown */}
              {Object.keys(pmBreakdown).length > 0 && (
                <div className="rounded-xl border overflow-hidden" style={{ borderColor: CARD_BORDER }}>
                  <div className="px-3 py-2 border-b flex items-center gap-1.5" style={{ borderColor: CARD_BORDER, background: "#F8FAFC" }}>
                    <DollarSign className="w-3 h-3" style={{ color: LABEL }} />
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: LABEL }}>Payment Methods</p>
                  </div>
                  <div className="divide-y" style={{ borderColor: CARD_BORDER }}>
                    {Object.entries(pmBreakdown).sort((a, b) => b[1].amount - a[1].amount).map(([pm, { count, amount }]) => (
                      <div key={pm} className="flex items-center justify-between px-3 py-2">
                        <span className="text-xs font-semibold capitalize" style={{ color: PRIMARY_TEXT }}>{pm}</span>
                        <div className="flex items-center gap-4 text-xs tabular-nums">
                          <span style={{ color: MUTED }}>{count} contributor{count !== 1 ? "s" : ""}</span>
                          <span className="font-bold" style={{ color: BRAND_BLUE }}>${amount.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Test results summary */}
              {data.results.length > 0 && (
                <div className="rounded-xl border overflow-hidden" style={{ borderColor: CARD_BORDER }}>
                  <div className="px-3 py-2 border-b flex items-center gap-1.5" style={{ borderColor: CARD_BORDER, background: "#F8FAFC" }}>
                    <FlaskConical className="w-3 h-3" style={{ color: LABEL }} />
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: LABEL }}>Test Results Summary</p>
                  </div>
                  <div className="px-3 py-2.5 flex flex-wrap gap-4">
                    {passCount  > 0 && <span className="flex items-center gap-1.5 text-sm font-bold" style={{ color: "#16a34a" }}><CheckCircle2 className="w-4 h-4" /> {passCount} Pass</span>}
                    {failCount  > 0 && <span className="flex items-center gap-1.5 text-sm font-bold" style={{ color: "#dc2626" }}><AlertCircle className="w-4 h-4" /> {failCount} Fail</span>}
                    {pendingRes > 0 && <span className="flex items-center gap-1.5 text-sm font-bold" style={{ color: MUTED }}><FlaskConical className="w-4 h-4" /> {pendingRes} Pending</span>}
                  </div>
                  <div className="divide-y" style={{ borderColor: CARD_BORDER }}>
                    {data.results.map(r => {
                      const test = data.tests.find(t => t.id === r.poolTestId);
                      return (
                        <div key={r.id} className="flex items-center justify-between px-3 py-2 gap-3">
                          <span className="text-xs flex-1 min-w-0 truncate" style={{ color: PRIMARY_TEXT }}>{test?.name ?? "Unknown Test"}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            {r.resultPdfUrl && (
                              <a href={r.resultPdfUrl} target="_blank" rel="noreferrer" className="text-[10px] hover:underline inline-flex items-center gap-0.5" style={{ color: BRAND_BLUE }}>
                                PDF <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                              style={r.passed === true ? { background: "rgba(34,197,94,0.12)", color: "#16a34a" } : r.passed === false ? { background: "rgba(239,68,68,0.12)", color: "#dc2626" } : { background: "rgba(148,163,184,0.15)", color: "#64748b" }}>
                              {r.passed === true ? "Pass" : r.passed === false ? "Fail" : "Pending"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Voting summary (vote-mode pools) */}
              {votingPool && data.tests.length > 0 && (
                <div className="rounded-xl border overflow-hidden" style={{ borderColor: CARD_BORDER }}>
                  <div className="px-3 py-2 border-b flex items-center gap-1.5" style={{ borderColor: CARD_BORDER, background: "#F8FAFC" }}>
                    <Vote className="w-3 h-3" style={{ color: LABEL }} />
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: LABEL }}>Vote Tally</p>
                    <span className="ml-auto text-[10px]" style={{ color: MUTED }}>{verified.length} eligible voters</span>
                  </div>
                  <div className="divide-y" style={{ borderColor: CARD_BORDER }}>
                    {data.tests.slice().sort((a, b) => (voteCounts[b.id] ?? 0) - (voteCounts[a.id] ?? 0)).map(t => {
                      const votes = voteCounts[t.id] ?? 0;
                      const maxV = Math.max(1, ...Object.values(voteCounts));
                      return (
                        <div key={t.id} className="px-3 py-2 flex items-center gap-3">
                          <span className="text-xs flex-1 min-w-0 truncate" style={{ color: PRIMARY_TEXT }}>{t.name}</span>
                          <div className="w-24 h-1.5 rounded-full overflow-hidden shrink-0" style={{ background: "rgba(45,107,204,0.1)" }}>
                            <div className="h-full rounded-full" style={{ width: `${(votes / maxV) * 100}%`, background: "#2D6BCC" }} />
                          </div>
                          <span className="text-xs font-bold tabular-nums w-6 text-right shrink-0" style={{ color: BRAND_BLUE }}>{votes}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recent messages */}
              {data.messages.length > 0 && (
                <div className="rounded-xl border overflow-hidden" style={{ borderColor: CARD_BORDER }}>
                  <div className="px-3 py-2 border-b flex items-center justify-between" style={{ borderColor: CARD_BORDER, background: "#F8FAFC" }}>
                    <div className="flex items-center gap-1.5">
                      <MessageSquare className="w-3 h-3" style={{ color: LABEL }} />
                      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: LABEL }}>Recent Messages</p>
                    </div>
                    {data.messages.length > 3 && (
                      <button onClick={() => setSection("messages")} className="text-[10px] font-semibold hover:underline" style={{ color: BRAND_BLUE }}>
                        View all {data.messages.length}
                      </button>
                    )}
                  </div>
                  <div className="divide-y" style={{ borderColor: CARD_BORDER }}>
                    {data.messages.slice(0, 3).map(m => (
                      <div key={m.id} className="px-3 py-2.5">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[10px] font-bold" style={{ color: BRAND_BLUE }}>@{m.leaderUsername}</span>
                          <span className="text-[10px]" style={{ color: LABEL }}>{fmt(m.createdAt)}</span>
                        </div>
                        <p className="text-xs line-clamp-2 whitespace-pre-wrap" style={{ color: PRIMARY_TEXT }}>{m.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {section === "participants" && <ParticipantsPanel participants={data.participants} poolPaymentMethods={data.paymentMethods} poolId={poolId} headers={headers} />}

        {section === "tests" && (
          data.tests.length === 0
            ? <p className="text-xs italic text-center py-6" style={{ color: LABEL }}>No tests added.</p>
            : (
              <div className="space-y-1.5">
                {data.tests.map(t => {
                  const result = resultsByTestId[t.id];
                  const cs = t.contributionStatus ?? "active";
                  const csC = CS_COLOR[cs] ?? CS_COLOR.active;
                  return (
                    <div key={t.id} className={`rounded-xl border p-3 ${!t.selected ? "opacity-60" : ""}`} style={{ borderColor: CARD_BORDER, background: t.selected ? "#fff" : "#F8FAFC" }}>
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold" style={{ color: PRIMARY_TEXT }}>{t.name}</p>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={csC}>
                              {cs === "delete_requested" ? "Removal Requested" : cs.charAt(0).toUpperCase() + cs.slice(1)}
                            </span>
                          </div>
                          <p className="text-[11px] font-mono" style={{ color: MUTED }}>{t.code} · ${t.unitPriceUsd.toFixed(2)} × {t.quantity}</p>
                        </div>
                        {result ? (
                          <div className="text-right shrink-0">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full`} style={result.passed === true ? CS_COLOR.active : result.passed === false ? CS_COLOR.rejected : CS_COLOR.closed}>
                              {result.passed === true ? "Pass" : result.passed === false ? "Fail" : "Pending"}
                            </span>
                            {result.resultText && <p className="text-[11px] mt-0.5 max-w-xs text-right" style={{ color: MUTED }}>{result.resultText}</p>}
                            {result.resultPdfUrl && (
                              <a href={result.resultPdfUrl} target="_blank" rel="noreferrer" className="text-[11px] hover:underline inline-flex items-center gap-0.5 mt-0.5" style={{ color: BRAND_BLUE }}>
                                PDF <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] italic shrink-0" style={{ color: LABEL }}>No result</span>
                        )}
                      </div>
                      {/* Admin test controls */}
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap border-t pt-2" style={{ borderColor: CARD_BORDER }}>
                        <p className="text-[10px] font-bold uppercase tracking-widest mr-1" style={{ color: LABEL }}>Status:</p>
                        {cs !== "active"   && <BrandBtn size="xs" variant="secondary" onClick={() => setTestStatus.mutate({ testId: t.id, status: "active" })}>Activate</BrandBtn>}
                        {cs !== "rejected" && <BrandBtn size="xs" variant="danger"    onClick={() => setTestStatus.mutate({ testId: t.id, status: "rejected" })}>Reject</BrandBtn>}
                        {cs !== "closed"   && <BrandBtn size="xs" variant="ghost"     onClick={() => setTestStatus.mutate({ testId: t.id, status: "closed" })}>Close</BrandBtn>}
                        <button
                          onClick={() => { if (confirm(`Delete "${t.name}" permanently?`)) deleteTest.mutate(t.id); }}
                          className="ml-auto text-[10px] px-2 py-0.5 rounded-lg font-semibold inline-flex items-center gap-1 text-white"
                          style={{ background: "#ef4444" }}
                        >
                          <Trash2 className="w-2.5 h-2.5" /> Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
        )}

        {section === "results" && (
          <>
            {data.resultNotes && (
              <div className="mb-3 rounded-xl border p-3" style={{ background: "rgba(45,107,204,0.06)", borderColor: "rgba(45,107,204,0.2)" }}>
                <p className="text-xs font-bold mb-1" style={{ color: NAVY }}>Result Notes</p>
                <p className="text-xs whitespace-pre-wrap" style={{ color: PRIMARY_TEXT }}>{data.resultNotes}</p>
              </div>
            )}
            {data.resultPdfUrl && (
              <div className="mb-3">
                <a href={data.resultPdfUrl} target="_blank" rel="noreferrer" className="text-sm hover:underline inline-flex items-center gap-1" style={{ color: BRAND_BLUE }}>
                  <FileText className="w-4 h-4" /> View Result PDF <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
            {data.results.length === 0 && !data.resultNotes && !data.resultPdfUrl
              ? <p className="text-xs italic text-center py-6" style={{ color: LABEL }}>No results posted yet.</p>
              : data.results.length > 0 && (
                <div className="space-y-1.5">
                  {data.results.map(r => {
                    const test = data.tests.find(t => t.id === r.poolTestId);
                    const passStyle = r.passed === true ? CS_COLOR.active : r.passed === false ? CS_COLOR.rejected : CS_COLOR.closed;
                    return (
                      <div key={r.id} className="rounded-xl border p-2.5 flex items-start gap-3" style={{ borderColor: CARD_BORDER }}>
                        <div className="flex-1">
                          <p className="text-xs font-semibold" style={{ color: PRIMARY_TEXT }}>{test?.name ?? r.poolTestId}</p>
                          {r.resultText && <p className="text-xs mt-0.5 whitespace-pre-wrap" style={{ color: MUTED }}>{r.resultText}</p>}
                          {r.resultPdfUrl && (
                            <a href={r.resultPdfUrl} target="_blank" rel="noreferrer" className="text-xs hover:underline inline-flex items-center gap-0.5 mt-0.5" style={{ color: BRAND_BLUE }}>
                              PDF <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={passStyle}>
                          {r.passed === true ? "Pass" : r.passed === false ? "Fail" : "N/A"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )
            }
          </>
        )}

        {section === "messages" && (
          data.messages.length === 0
            ? <p className="text-xs italic text-center py-6" style={{ color: LABEL }}>No messages sent yet.</p>
            : (
              <div className="space-y-2">
                {data.messages.map(m => (
                  <div key={m.id} className="rounded-xl border p-3" style={{ borderColor: CARD_BORDER, background: "#F8FAFC" }}>
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-[11px] font-bold" style={{ color: BRAND_BLUE }}>@{m.leaderUsername}</p>
                      <p className="text-[10px]" style={{ color: LABEL }}>{fmt(m.createdAt)}</p>
                    </div>
                    <p className="text-xs whitespace-pre-wrap" style={{ color: PRIMARY_TEXT }}>{m.message}</p>
                  </div>
                ))}
              </div>
            )
        )}
      </div>
    </div>
  );
}

// ─── CatalogRow ─────────────────────────────────────────────────────────────────
const CAT_COLORS: Record<string, { bg: string; color: string }> = {
  analysis: { bg: "rgba(45,107,204,0.1)",  color: "#2D6BCC" },
  single:   { bg: "rgba(139,92,246,0.1)", color: "#7c3aed" },
  addon:    { bg: "rgba(233,160,32,0.1)", color: "#b45309" },
};
const SEC_COLORS: Record<string, { bg: string; color: string }> = {
  compound: { bg: "rgba(20,184,166,0.1)",  color: "#0f766e" },
  extra:    { bg: "rgba(14,165,233,0.1)", color: "#0369a1" },
  variance: { bg: "rgba(99,102,241,0.1)", color: "#4f46e5" },
};

function CatalogRow({ r, knownLabs, onUpdate, onToggleActive, onRemove }: {
  r: CatalogEntry;
  knownLabs: string[];
  onUpdate: (id: string, patch: Record<string, unknown>) => void;
  onToggleActive: (r: CatalogEntry) => void;
  onRemove: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [eName, setEName] = useState(r.name);
  const [eCode, setECode] = useState(r.code);
  const [eLabName, setELabName] = useState(r.labName ?? "");
  const [ePrice, setEPrice] = useState(String(r.defaultPriceUsd));
  const [eUnit, setEUnit] = useState(r.unitLabel);
  const [eCat, setECat] = useState(r.category);
  const [eSec, setESec] = useState(r.analysisSection ?? "compound");

  const save = () => {
    onUpdate(r.id, { name: eName, code: eCode, labName: eLabName || null, defaultPriceUsd: parseFloat(ePrice) || 0, unitLabel: eUnit, category: eCat, analysisSection: eCat === "analysis" ? eSec : null });
    setEditing(false);
  };

  const catStyle = CAT_COLORS[r.category] ?? CAT_COLORS.single;
  const secStyle = r.analysisSection ? (SEC_COLORS[r.analysisSection] ?? {}) : {};

  if (editing) {
    return (
      <div className="rounded-xl border p-3 space-y-2" style={{ borderColor: "rgba(45,107,204,0.25)", background: "rgba(45,107,204,0.03)" }}>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Code",      value: eCode,    set: setECode,    mono: true },
            { label: "Name",      value: eName,    set: setEName,    mono: false },
            { label: "Lab",       value: eLabName, set: setELabName, list: "catalog-labs" },
            { label: "Price USD", value: ePrice,   set: setEPrice,   type: "number" },
            { label: "Unit",      value: eUnit,    set: setEUnit },
          ].map(({ label, value, set, mono, list, type }) => (
            <div key={label}>
              <label className="text-[10px] font-bold uppercase tracking-widest block mb-0.5" style={{ color: LABEL }}>{label}</label>
              <input
                value={value} onChange={e => set(e.target.value)}
                type={type ?? "text"}
                list={list}
                className={`w-full border rounded-lg px-2 py-1 text-xs ${mono ? "font-mono" : ""} focus:outline-none`}
                style={{ borderColor: CARD_BORDER, color: PRIMARY_TEXT }}
              />
            </div>
          ))}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest block mb-0.5" style={{ color: LABEL }}>Category</label>
            <select value={eCat} onChange={e => setECat(e.target.value as any)} className="w-full border rounded-lg px-2 py-1 text-xs bg-white focus:outline-none" style={{ borderColor: CARD_BORDER, color: PRIMARY_TEXT }}>
              <option value="analysis">Analysis</option>
              <option value="single">Single</option>
              <option value="addon">Add-on</option>
            </select>
          </div>
          {eCat === "analysis" && (
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest block mb-0.5" style={{ color: LABEL }}>Section</label>
              <select value={eSec} onChange={e => setESec(e.target.value as any)} className="w-full border rounded-lg px-2 py-1 text-xs bg-white focus:outline-none" style={{ borderColor: CARD_BORDER, color: PRIMARY_TEXT }}>
                <option value="compound">Compound</option>
                <option value="extra">Extra</option>
                <option value="variance">Variance</option>
              </select>
            </div>
          )}
        </div>
        <div className="flex gap-2 justify-end pt-1">
          <BrandBtn variant="ghost" size="xs" onClick={() => setEditing(false)}>Cancel</BrandBtn>
          <BrandBtn variant="primary" size="xs" onClick={save}><Save className="w-3 h-3" /> Save</BrandBtn>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border p-3" style={{ borderColor: CARD_BORDER, background: r.active ? "#fff" : "#F8FAFC" }}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
          <p className={`text-sm font-semibold ${!r.active ? "line-through" : ""}`} style={{ color: r.active ? PRIMARY_TEXT : LABEL }}>{r.name}</p>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={catStyle}>{CATEGORY_LABELS[r.category] ?? r.category}</span>
          {r.analysisSection && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={secStyle}>{SECTION_LABELS[r.analysisSection] ?? r.analysisSection}</span>}
          {r.labName && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(139,92,246,0.1)", color: "#7c3aed" }}>{r.labName}</span>}
        </div>
        <p className="text-[11px] font-mono" style={{ color: MUTED }}>{r.code} · ${r.defaultPriceUsd.toFixed(2)} / {r.unitLabel}</p>
      </div>
      <BrandBtn size="xs" variant={r.active ? "secondary" : "ghost"} onClick={() => onToggleActive(r)}>
        {r.active ? "Active" : "Inactive"}
      </BrandBtn>
      <button onClick={() => setEditing(true)} className="p-1 rounded-lg transition-colors hover:bg-blue-50" style={{ color: BRAND_BLUE }}>
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => onRemove(r.id)} className="p-1 rounded-lg hover:bg-red-50 transition-colors text-red-500">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── CatalogPanel ───────────────────────────────────────────────────────────────
function CatalogPanel({ headers }: { headers: HeadersInit }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: rows = [], isLoading } = useQuery<CatalogEntry[]>({
    queryKey: ["/api/admin/test-catalog"],
    queryFn: async () => (await fetch("/api/admin/test-catalog", { headers })).json(),
  });

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [labName, setLabName] = useState("Janoshik");
  const [defaultPriceUsd, setDefaultPriceUsd] = useState("");
  const [unitLabel, setUnitLabel] = useState("test");
  const [category, setCategory] = useState<"analysis" | "single" | "addon">("analysis");
  const [analysisSection, setAnalysisSection] = useState<"compound" | "extra" | "variance">("compound");

  const create = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/admin/test-catalog", {
        method: "POST", headers,
        body: JSON.stringify({ code, name, labName: labName || null, defaultPriceUsd: parseFloat(defaultPriceUsd) || 0, unitLabel, category, analysisSection: category === "analysis" ? analysisSection : null }),
      });
      if (!r.ok) throw new Error("Failed");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/test-catalog"] }); setCode(""); setName(""); setLabName("Janoshik"); setDefaultPriceUsd(""); toast({ title: "Added" }); },
  });

  const remove        = useMutation({ mutationFn: async (id: string) => { const r = await fetch(`/api/admin/test-catalog/${id}`, { method: "DELETE", headers }); if (!r.ok) throw new Error("Failed"); }, onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/test-catalog"] }) });
  const toggleActive  = useMutation({ mutationFn: async (e: CatalogEntry) => { await fetch(`/api/admin/test-catalog/${e.id}`, { method: "PATCH", headers, body: JSON.stringify({ active: !e.active }) }); }, onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/test-catalog"] }) });
  const updateEntry   = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const r = await fetch(`/api/admin/test-catalog/${id}`, { method: "PATCH", headers, body: JSON.stringify(patch) });
      if (!r.ok) throw new Error("Failed");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/test-catalog"] }); toast({ title: "Saved" }); },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  const knownLabs = Array.from(new Set(["Janoshik", ...rows.map(r => r.labName).filter(Boolean)])) as string[];

  const grouped = {
    analysis: {
      compound: rows.filter(r => r.category === "analysis" && r.analysisSection === "compound"),
      extra:    rows.filter(r => r.category === "analysis" && r.analysisSection === "extra"),
      variance: rows.filter(r => r.category === "analysis" && r.analysisSection === "variance"),
    },
    single: rows.filter(r => r.category === "single"),
    addon:  rows.filter(r => r.category === "addon"),
  };

  const FieldInput = ({ value, onChange, placeholder, type, list }: { value: string; onChange: (v: string) => void; placeholder: string; type?: string; list?: string }) => (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} type={type ?? "text"} list={list}
      className={inp} style={{ ...inpStyle, fontSize: "0.8rem" }} />
  );

  return (
    <div className="space-y-4">
      {/* Add form */}
      <Card>
        <div className="px-4 pt-4 pb-3 border-b" style={{ borderColor: CARD_BORDER }}>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: LABEL }}>Add Catalog Entry</p>
        </div>
        <div className="p-4 space-y-3">
          <datalist id="catalog-labs">
            {knownLabs.map(l => <option key={l} value={l} />)}
          </datalist>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <FieldInput value={code} onChange={setCode} placeholder="Code (e.g. mass_purity)" />
            <FieldInput value={name} onChange={setName} placeholder="Test name" />
            <FieldInput value={labName} onChange={setLabName} placeholder="Lab name" list="catalog-labs" />
            <FieldInput value={defaultPriceUsd} onChange={setDefaultPriceUsd} placeholder="Price USD" type="number" />
            <FieldInput value={unitLabel} onChange={setUnitLabel} placeholder="Unit label" />
            <select value={category} onChange={e => setCategory(e.target.value as any)} className={sel} style={{ ...inpStyle, fontSize: "0.8rem" }}>
              <option value="analysis">Analysis</option>
              <option value="single">Single Test</option>
              <option value="addon">Add-on</option>
            </select>
            {category === "analysis" && (
              <select value={analysisSection} onChange={e => setAnalysisSection(e.target.value as any)} className={sel} style={{ ...inpStyle, fontSize: "0.8rem" }}>
                <option value="compound">Compound</option>
                <option value="extra">Extra</option>
                <option value="variance">Variance</option>
              </select>
            )}
            <BrandBtn variant="primary" onClick={() => create.mutate()} disabled={!code || !name || create.isPending}>
              {create.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Add
            </BrandBtn>
          </div>
        </div>
      </Card>

      {/* Catalog list */}
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" style={{ color: BRAND_BLUE }} /></div>
      ) : (
        <div className="space-y-4">
          {(Object.entries(grouped.analysis) as [string, CatalogEntry[]][])
            .filter(([, v]) => v.length > 0)
            .map(([sec, entries]) => (
              <div key={sec}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: LABEL }}>Analysis · {SECTION_LABELS[sec] ?? sec}</p>
                <div className="space-y-1.5">
                  {entries.map(r => (
                    <CatalogRow key={r.id} r={r} knownLabs={knownLabs}
                      onUpdate={(id, patch) => updateEntry.mutate({ id, patch })}
                      onToggleActive={e => toggleActive.mutate(e)}
                      onRemove={id => remove.mutate(id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          {grouped.single.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: LABEL }}>Single Tests</p>
              <div className="space-y-1.5">
                {grouped.single.map(r => <CatalogRow key={r.id} r={r} knownLabs={knownLabs} onUpdate={(id, patch) => updateEntry.mutate({ id, patch })} onToggleActive={e => toggleActive.mutate(e)} onRemove={id => remove.mutate(id)} />)}
              </div>
            </div>
          )}
          {grouped.addon.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: LABEL }}>Add-ons</p>
              <div className="space-y-1.5">
                {grouped.addon.map(r => <CatalogRow key={r.id} r={r} knownLabs={knownLabs} onUpdate={(id, patch) => updateEntry.mutate({ id, patch })} onToggleActive={e => toggleActive.mutate(e)} onRemove={id => remove.mutate(id)} />)}
              </div>
            </div>
          )}
          {rows.length === 0 && <p className="text-sm text-center py-8" style={{ color: LABEL }}>No catalog entries yet.</p>}
        </div>
      )}
    </div>
  );
}
