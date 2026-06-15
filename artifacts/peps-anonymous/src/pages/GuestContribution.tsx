import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { PageLayout } from "@/components/PageLayout";
import { motion } from "framer-motion";
import { Loader2, CheckCircle2, Clock, XCircle, FlaskConical, ExternalLink, ChevronLeft } from "lucide-react";
import { useLocation } from "wouter";

type ParticipantStatus = {
  id: string;
  paymentStatus: string;
  amountUsd: number;
  displayName: string | null;
  isPublic: boolean;
  createdAt: string;
  pool: {
    id: string;
    title: string;
    slug: string;
    status: string;
    goalUsd: number;
    hasResults: boolean;
    resultNotes: string | null;
    resultPdfUrl: string | null;
  };
  poolTotals: {
    raisedUsd: number;
    contributorCount: number;
    pendingCount: number;
  };
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; Icon: React.ElementType }> = {
  pending: {
    label: "Pending Verification",
    color: "#CA8A04",
    bg: "rgba(234,179,8,0.08)",
    border: "rgba(234,179,8,0.3)",
    Icon: Clock,
  },
  verified: {
    label: "Payment Verified",
    color: "#16A34A",
    bg: "rgba(74,222,128,0.08)",
    border: "rgba(74,222,128,0.3)",
    Icon: CheckCircle2,
  },
  rejected: {
    label: "Payment Rejected",
    color: "#DC2626",
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.3)",
    Icon: XCircle,
  },
};

export default function GuestContribution() {
  const params = useParams<{ slug: string; participantId: string }>();
  const [, setLocation] = useLocation();

  const { data, isLoading, error } = useQuery<ParticipantStatus>({
    queryKey: ["/api/testing-pools/participants", params.participantId, "status"],
    queryFn: async () => {
      const r = await fetch(`/api/testing-pools/participants/${params.participantId}/status`, { credentials: "include" });
      if (!r.ok) throw new Error("Not found");
      return r.json();
    },
    refetchInterval: 30_000,
  });

  const fmtUsd = (n: number) => `$${n.toFixed(2)}`;
  const fmtDate = (iso: string) => {
    try {
      return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  return (
    <PageLayout>
      <div className="flex flex-col min-h-screen" style={{ background: "var(--t-bg)" }}>
        <div className="w-full max-w-lg mx-auto px-4 py-8 space-y-4">

          <button
            onClick={() => data ? setLocation(`/pool/${data.pool.slug}`) : history.back()}
            className="flex items-center gap-1.5 text-[11px] font-semibold transition-opacity hover:opacity-60"
            style={{ color: "var(--t-blue)" }}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Back to pool
          </button>

          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--t-blue)" }} />
            </div>
          )}

          {error && (
            <div className="text-center py-16 space-y-2">
              <XCircle className="w-8 h-8 mx-auto opacity-30" style={{ color: "var(--t-muted)" }} />
              <p className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Contribution not found</p>
              <p className="text-xs" style={{ color: "var(--t-muted)" }}>This link may be invalid or expired.</p>
            </div>
          )}

          {data && (() => {
            const sc = STATUS_CONFIG[data.paymentStatus] ?? STATUS_CONFIG.pending;
            const StatusIcon = sc.Icon;
            const pct = data.pool.goalUsd > 0 ? Math.min(100, (data.poolTotals.raisedUsd / data.pool.goalUsd) * 100) : 0;

            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Pool header */}
                <div
                  className="p-5 space-y-1"
                  style={{ borderRadius: 8, background: "var(--t-surface)", border: "1px solid var(--t-border)" }}
                >
                  <p className="text-[9px] font-bold tracking-[0.14em] uppercase" style={{ color: "var(--t-muted)" }}>Testing Pool</p>
                  <h1 className="text-[18px] font-extrabold leading-tight" style={{ color: "var(--t-text)" }}>{data.pool.title}</h1>
                  <a
                    href={`/pool/${data.pool.slug}`}
                    className="flex items-center gap-1 text-[11px] font-semibold mt-1 transition-opacity hover:opacity-70"
                    style={{ color: "var(--t-blue)" }}
                  >
                    View pool page
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* Payment status */}
                <div
                  className="p-5 space-y-3"
                  style={{ borderRadius: 8, background: sc.bg, border: `1.5px solid ${sc.border}` }}
                >
                  <div className="flex items-center gap-2">
                    <StatusIcon className="w-4 h-4 shrink-0" style={{ color: sc.color }} />
                    <span className="text-[13px] font-bold" style={{ color: sc.color }}>{sc.label}</span>
                  </div>

                  <div className="space-y-2 text-[12px]">
                    <div className="flex justify-between">
                      <span style={{ color: "var(--t-muted)" }}>Amount</span>
                      <span className="font-bold tabular-nums" style={{ color: "var(--t-text)" }}>{fmtUsd(data.amountUsd)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: "var(--t-muted)" }}>Submitted</span>
                      <span className="font-semibold" style={{ color: "var(--t-text)" }}>{fmtDate(data.createdAt)}</span>
                    </div>
                    {data.displayName && (
                      <div className="flex justify-between">
                        <span style={{ color: "var(--t-muted)" }}>Listed as</span>
                        <span className="font-semibold" style={{ color: "var(--t-text)" }}>{data.isPublic ? data.displayName : "Anonymous"}</span>
                      </div>
                    )}
                  </div>

                  {data.paymentStatus === "pending" && (
                    <p className="text-[11px]" style={{ color: "var(--t-muted)" }}>
                      The pool leader will verify your payment manually. This page auto-refreshes every 30 seconds.
                    </p>
                  )}
                </div>

                {/* Live pool progress */}
                <div
                  className="p-4 space-y-3"
                  style={{ borderRadius: 8, background: "var(--t-surface)", border: "1px solid var(--t-border)" }}
                >
                  <p className="text-[9px] font-bold tracking-[0.14em] uppercase" style={{ color: "var(--t-muted)" }}>Pool Progress</p>

                  <div className="flex justify-between text-[12px] font-semibold">
                    <span style={{ color: "var(--t-text)" }}>{fmtUsd(data.poolTotals.raisedUsd)} raised</span>
                    <span style={{ color: "var(--t-muted)" }}>of {fmtUsd(data.pool.goalUsd)}</span>
                  </div>

                  {data.pool.goalUsd > 0 && (
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--t-border)" }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: "linear-gradient(90deg, #E9A020, #EAB308)" }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct.toFixed(1)}%` }}
                        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>
                  )}

                  <p className="text-[11px]" style={{ color: "var(--t-muted)" }}>
                    {data.poolTotals.contributorCount} verified · {data.poolTotals.pendingCount} pending
                  </p>
                </div>

                {/* Results — if published */}
                {data.pool.hasResults && (
                  <div
                    className="p-4 space-y-3"
                    style={{ borderRadius: 8, background: "rgba(74,222,128,0.07)", border: "1.5px solid rgba(74,222,128,0.3)" }}
                  >
                    <div className="flex items-center gap-2">
                      <FlaskConical className="w-4 h-4" style={{ color: "#16A34A" }} />
                      <p className="text-[12px] font-bold" style={{ color: "#16A34A" }}>Results Published</p>
                    </div>
                    {data.pool.resultNotes && (
                      <p className="text-[12px] leading-relaxed whitespace-pre-wrap" style={{ color: "var(--t-text)" }}>{data.pool.resultNotes}</p>
                    )}
                    {data.pool.resultPdfUrl && (
                      <a
                        href={data.pool.resultPdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[12px] font-semibold transition-opacity hover:opacity-70"
                        style={{ color: "var(--t-blue)" }}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Download full report
                      </a>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })()}
        </div>
      </div>
    </PageLayout>
  );
}
