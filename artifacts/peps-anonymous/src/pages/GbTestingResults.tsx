import { useEffect, useState, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  FlaskConical, Loader2, AlertCircle, Lock, ExternalLink, ChevronLeft, ClipboardList,
} from "lucide-react";
import { GbPoolLayout } from "./GbTestingPool";
import { useAccount } from "@/hooks/use-account";

interface ResultsRound {
  id: string;
  status: string;
  resultNotes: string | null;
  resultPdfUrl: string | null;
  resultPostedAt: string | null;
  fundingNote: string | null;
}

interface ResultsData {
  round: ResultsRound | null;
  resultsAvailable: boolean;
  isOptedIn: boolean;
  isAdminView: boolean;
}

export default function GbTestingResults() {
  const [, params] = useRoute("/testing/:gbId/results");
  const [, setLocation] = useLocation();
  const gbId = params?.gbId ?? "";
  const { isLoggedIn } = useAccount();

  const [data, setData] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gbName, setGbName] = useState<string>("");

  const load = useCallback(async () => {
    try {
      const adminSecret = (() => { try { return sessionStorage.getItem("_adm_s") ?? ""; } catch { return ""; } })();
      const headers: Record<string, string> = {};
      if (adminSecret) headers["x-admin-secret"] = adminSecret;
      const r = await fetch(`/api/group-buys/${gbId}/testing`, { headers, credentials: "include" });
      if (!r.ok) throw new Error("Failed to load results");
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
  }, [gbId, load]);

  const title = `${gbName ? gbName + " · " : ""}Lab Results`;

  const backToPool = (
    <button
      onClick={() => setLocation(`/testing/${gbId}`)}
      className="inline-flex items-center gap-1 text-sm font-medium mb-4 hover:opacity-75 transition-opacity"
      style={{ color: "var(--t-blue)" }}
    >
      <ChevronLeft className="w-4 h-4" /> Back to Testing Pool
    </button>
  );

  if (loading) {
    return (
      <GbPoolLayout title={title}>
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--t-blue)" }} />
        </div>
      </GbPoolLayout>
    );
  }

  if (error) {
    return (
      <GbPoolLayout title={title}>
        <div className="max-w-lg mx-auto px-4 py-12 text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-3" style={{ color: "#EF4444" }} />
          <p className="text-sm" style={{ color: "var(--t-text)" }}>{error}</p>
        </div>
      </GbPoolLayout>
    );
  }

  const round = data?.round ?? null;
  const resultsAvailable = !!data?.resultsAvailable;
  const isOptedIn = !!data?.isOptedIn;

  // No round, or results not published yet
  if (!round || !resultsAvailable) {
    return (
      <GbPoolLayout title={title}>
        <div className="max-w-lg mx-auto px-4 py-12">
          {backToPool}
          <div className="text-center">
            <FlaskConical className="w-12 h-12 mx-auto mb-4 opacity-25" style={{ color: "var(--t-muted)" }} />
            <p className="font-bold text-lg mb-2" style={{ color: "var(--t-text)" }}>No Results Yet</p>
            <p className="text-sm" style={{ color: "var(--t-muted)" }}>
              The lab results for this round haven&rsquo;t been published yet. Check back soon.
            </p>
          </div>
        </div>
      </GbPoolLayout>
    );
  }

  // Results exist but viewer is not a contributor — keep them private
  if (!isOptedIn) {
    return (
      <GbPoolLayout title={title}>
        <div className="max-w-lg mx-auto px-4 py-12">
          {backToPool}
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "rgba(148,163,184,0.14)" }}>
              <Lock className="w-6 h-6" style={{ color: "var(--t-muted)" }} />
            </div>
            <p className="font-bold text-lg mb-2" style={{ color: "var(--t-text)" }}>Private Results</p>
            <p className="text-sm mb-5" style={{ color: "var(--t-muted)" }}>
              These lab results are only visible to people who chipped in for this testing round.
            </p>
            {!isLoggedIn && (
              <button
                onClick={() => setLocation("/account")}
                className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg transition-opacity hover:opacity-90"
                style={{ background: "var(--t-blue)", color: "#fff" }}
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </GbPoolLayout>
    );
  }

  // Contributor (or admin) view — show the results
  return (
    <GbPoolLayout title={title}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-2xl mx-auto px-4 py-6"
      >
        {backToPool}

        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(233,160,32,0.12)" }}>
            <FlaskConical className="w-4.5 h-4.5" style={{ color: "#E9A020" }} />
          </div>
          <div>
            <p className="font-bold text-lg leading-tight" style={{ color: "var(--t-text)" }}>Lab Results</p>
            {round.resultPostedAt && (
              <p className="text-xs" style={{ color: "var(--t-muted)" }}>
                Published {new Date(round.resultPostedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {round.resultNotes && (
            <div
              className="p-4 sm:p-5 space-y-3"
              style={{ borderRadius: 8, background: "var(--t-surface)", border: "1px solid var(--t-border)" }}
            >
              <p className="text-[9px] font-bold tracking-[0.14em] uppercase" style={{ color: "var(--t-muted)" }}>Summary</p>
              <div className="text-sm whitespace-pre-wrap" style={{ color: "var(--t-text)" }}>
                {round.resultNotes}
              </div>
            </div>
          )}

          {round.resultPdfUrl && (
            <div
              className="p-4 sm:p-5 flex items-center justify-between gap-3"
              style={{ borderRadius: 8, background: "var(--t-surface)", border: "1px solid var(--t-border)" }}
            >
              <div className="flex items-center gap-2.5">
                <ClipboardList className="w-5 h-5" style={{ color: "var(--t-blue)" }} />
                <p className="text-sm font-medium" style={{ color: "var(--t-text)" }}>Full lab report</p>
              </div>
              <a
                href={round.resultPdfUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold px-3.5 py-2 rounded-lg transition-opacity hover:opacity-90 shrink-0"
                style={{ background: "var(--t-blue)", color: "#fff" }}
              >
                View PDF <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {round.fundingNote && (
            <div
              className="p-4 sm:p-5 space-y-2"
              style={{ borderRadius: 8, background: "var(--t-bg)", border: "1px dashed var(--t-border)" }}
            >
              <p className="text-[9px] font-bold tracking-[0.14em] uppercase" style={{ color: "var(--t-muted)" }}>Funding Note</p>
              <div className="text-sm whitespace-pre-wrap" style={{ color: "var(--t-text)" }}>
                {round.fundingNote}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </GbPoolLayout>
  );
}
